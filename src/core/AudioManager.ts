import { combatDuckAmount, combatDuckDuration, stageAudioMixProfile, type CombatAudioCue } from './AudioMixProfiles.js';
import { SampledSfxBank, type ProducedSfx } from './SampledSfxBank.js';

const DUCK_ATTACK_SECONDS = .012;
const FRONTEND_MIX = { music: .82, ambience: .72, sfx: 1 };
interface DuckRange { from: number; target: number }
interface ActiveCombatDuck {
  start: number;
  end: number;
  music: DuckRange;
  ambience: DuckRange;
}

function duckLevelAt(duck: ActiveCombatDuck | null, bus: 'music' | 'ambience', time: number): number {
  if (!duck || time >= duck.end) return 1;
  const { from, target } = duck[bus];
  const attackEnd = duck.start + DUCK_ATTACK_SECONDS;
  if (time < attackEnd) return from + (target - from) * ((time - duck.start) / DUCK_ATTACK_SECONDS);
  return target + (1 - target) * ((time - attackEnd) / (duck.end - attackEnd));
}

export class AudioManager {
  private gestureResumePending = false;
  private sampledSfx: SampledSfxBank | null = null;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicDuckBus: GainNode | null = null;
  private ambienceDuckBus: GainNode | null = null;
  private combatDuck: ActiveCombatDuck | null = null;
  private enabled = true;
  private backgrounded = false;
  private paused = false;
  private audioStateChange: Promise<void> | null = null;
  private ambienceGain: GainNode | null = null;
  private bossLayerGain: GainNode | null = null;
  private bossLayerSource: OscillatorNode | null = null;
  private bossAirSource: OscillatorNode | null = null;
  private ambienceSources: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private menuSources: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private currentStageId = 1;
  private menuGain: GainNode | null = null;
  private musicLoopSource: AudioBufferSourceNode | null = null;
  private musicLoopGain: GainNode | null = null;
  private musicLoopKey: string | null = null;
  private desiredMusicLoopKey: string | null = null;
  private musicRequest = 0;
  private readonly pendingMusicBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly musicBufferCache = new Map<string, AudioBuffer>();

  async unlock(): Promise<void> {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.78;
      this.musicBus = this.context.createGain();
      this.ambienceBus = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.musicBus.gain.value = FRONTEND_MIX.music;
      this.ambienceBus.gain.value = FRONTEND_MIX.ambience;
      this.sfxBus.gain.value = FRONTEND_MIX.sfx;
      this.musicDuckBus = this.context.createGain();
      this.ambienceDuckBus = this.context.createGain();
      this.musicDuckBus.gain.value = 1;
      this.ambienceDuckBus.gain.value = 1;
      this.musicBus.connect(this.musicDuckBus);
      this.ambienceBus.connect(this.ambienceDuckBus);
      this.musicDuckBus.connect(this.master);
      this.ambienceDuckBus.connect(this.master);
      this.sfxBus.connect(this.master);
      // Post-compressor trim preserves transient headroom under overlapping hits.
      const output = this.context.createGain(); output.gain.value = .65;
      output.connect(this.context.destination);
      if (typeof this.context.createDynamicsCompressor === 'function') {
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -3; limiter.knee.value = 2; limiter.ratio.value = 16;
        limiter.attack.value = .003; limiter.release.value = .1;
        this.master.connect(limiter); limiter.connect(output);
      } else this.master.connect(output);
      this.sampledSfx = new SampledSfxBank(this.context, this.sfxBus);

    }
    void this.sampledSfx?.preload();
    await this.syncSuspension();
  }


  async resumeFromGesture(): Promise<void> {
    const context = this.context;
    if (context?.state !== 'suspended' || !this.enabled || this.backgrounded || this.paused || this.gestureResumePending) return;
    this.gestureResumePending = true;
    try {
      // A resume made before user activation can stay pending until a resume inside the gesture.
      if (this.audioStateChange) await context.resume();
      await this.syncSuspension();
    } finally {
      this.gestureResumePending = false;
    }
  }

  startFrontendTheme(mode: 'title' | 'select' | 'ending'): void {
    if (!this.context || !this.master || !this.enabled) return;
    const key = mode === 'title' ? 'title-theme' : mode === 'select' ? 'select-theme' : 'ending-theme';
    this.stopSoundscape();
    if (this.desiredMusicLoopKey !== key) this.stopFrontendTheme();
    this.applyBaseMix(FRONTEND_MIX);
    void this.playMusicAssetLoop(key, '/audio/score-v2/' + key + '.ogg', .8);
  }

  stopFrontendTheme(): void {
    this.stopMusicAssetLoop(.42, key => key === 'title-theme' || key === 'select-theme' || key === 'ending-theme');
    for (const source of this.menuSources) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    this.menuSources = [];
    if (this.menuGain) {
      try { this.menuGain.disconnect(); } catch {}
      this.menuGain = null;
    }
  }

  setBackgrounded(backgrounded: boolean): void {
    this.backgrounded = backgrounded;
    void this.syncSuspension().catch(() => undefined);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    void this.syncSuspension().catch(() => undefined);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.78 : 0;
    if (enabled) void this.syncSuspension().catch(() => undefined);
  }

  isRunning(): boolean {
    return this.enabled && !this.backgrounded && !this.paused && this.context?.state === 'running';
  }

  private syncSuspension(): Promise<void> {
    if (this.audioStateChange) return this.audioStateChange;
    const context = this.context;
    if (!context) return Promise.resolve();
    const shouldSuspend = this.backgrounded || this.paused;
    if (shouldSuspend ? context.state !== 'running' : !this.enabled || context.state !== 'suspended') return Promise.resolve();
    let change: Promise<void>;
    try { change = shouldSuspend ? context.suspend() : context.resume(); }
    catch (error) { return Promise.reject(error); }
    // Browser audio control is asynchronous. A newer intent may arrive before it settles.
    const pending = change.then(() => {
      this.audioStateChange = null;
      return this.syncSuspension();
    }, (error) => {
      this.audioStateChange = null;
      throw error;
    });
    this.audioStateChange = pending;
    return pending;
  }

  playUiConfirm(): void { this.effect('ui', .55, 1.12); }
  playMenuMove(): void { this.effect('ui', .32, .92); }
  playStagePulse(): void { this.effect('super-start', .52); }
  playStageIntro(_stageId: number): void { this.effect('whoosh', .4); }
  playDuelTransition(finalBoss = false): void { this.duckCombat('boss'); this.effect(finalBoss ? 'super-impact' : 'super-start', .7); }
  playStageClear(_finalStage = false): void { this.duckCombat('ko'); this.effect('victory', .65); }
  playFinalKo(): void { this.duckCombat('ko'); this.effect('ko', .95, .8); }
  playEndingTransition(): void {
    if (!this.context || !this.enabled) return;
    void this.playMusicAssetLoop('ending-theme', '/audio/score-v2/ending-theme.ogg', .8);
    this.effect('victory', .6);
  }

  startStageSoundscape(stageId: number): void {
    if (!this.context || !this.master || !this.enabled) return;
    this.stopFrontendTheme(); this.stopSoundscape(); this.currentStageId = stageId;
    this.applyBaseMix(stageAudioMixProfile(stageId));
    // Keep the existing intensity/fade lifecycle, without a continuous synth drone.
    this.ambienceGain = this.context.createGain(); this.ambienceGain.gain.value = 0;
    this.ambienceGain.connect(this.ambienceBus ?? this.master);
    void this.playMusicAssetLoop('stage' + stageId + '-theme', '/audio/score-v2/stage' + stageId + '-theme.ogg', .8);
  }

  private applyBaseMix(mix: typeof FRONTEND_MIX): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [bus, level] of [[this.musicBus, mix.music], [this.ambienceBus, mix.ambience], [this.sfxBus, mix.sfx]] as const) {
      if (!bus) continue;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(level, now);
    }
  }

  playStageBeat(_stageId: number, _beat: number, _level: 'belt' | 'duel' | 'final' = 'belt'): void {
    // The rendered acoustic drum arrangement owns the beat, independently of FPS.
  }

  setStageIntensity(level: 'belt' | 'duel' | 'final'): void {
    if (!this.context || !this.ambienceGain) return;
    const mix = stageAudioMixProfile(this.currentStageId);
    if (this.currentStageId === 5 && level === 'final') void this.playMusicAssetLoop('final-boss-theme', '/audio/score-v2/final-boss-theme.ogg', .8);
    else if (this.currentStageId === 5 && (this.musicLoopKey === 'final-boss-theme' || this.desiredMusicLoopKey === 'final-boss-theme')) void this.playMusicAssetLoop('stage5-theme', '/audio/score-v2/stage5-theme.ogg', .8);
    const ambienceTarget = level === 'final' ? .044 : level === 'duel' ? .034 : .024;
    const musicTarget = mix.music * (level === 'final' ? 1.08 : level === 'duel' ? 1.025 : 1);
    const sfxTarget = mix.sfx * (level === 'final' ? 1.08 : level === 'duel' ? 1.03 : 1);
    const bossLayerTarget = level === 'final' ? (this.currentStageId === 5 ? .034 : .022) : level === 'duel' ? .012 : .0001;
    const t = this.context.currentTime;
    this.ambienceGain.gain.cancelScheduledValues(t);
    this.ambienceGain.gain.linearRampToValueAtTime(ambienceTarget, t + (level === 'belt' ? .45 : .32));
    if (this.musicBus) { this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.linearRampToValueAtTime(musicTarget, t + .42); }
    if (this.sfxBus) { this.sfxBus.gain.cancelScheduledValues(t); this.sfxBus.gain.linearRampToValueAtTime(sfxTarget, t + .18); }
    if (this.bossLayerGain) { this.bossLayerGain.gain.cancelScheduledValues(t); this.bossLayerGain.gain.linearRampToValueAtTime(bossLayerTarget, t + (level === 'final' ? .55 : .38)); }
  }

  stopSoundscape(): void {
    this.resetCombatDuck();
    this.stopMusicAssetLoop(.5, key => key.startsWith('stage') || key === 'final-boss-theme');
    if (this.bossLayerSource) { try { this.bossLayerSource.stop(); } catch {} try { this.bossLayerSource.disconnect(); } catch {} this.bossLayerSource = null; }
    if (this.bossAirSource) { try { this.bossAirSource.stop(); } catch {} try { this.bossAirSource.disconnect(); } catch {} this.bossAirSource = null; }
    if (this.bossLayerGain) { try { this.bossLayerGain.disconnect(); } catch {} this.bossLayerGain = null; }
    for (const source of this.ambienceSources) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    this.ambienceSources = [];
    if (this.ambienceGain) {
      try { this.ambienceGain.disconnect(); } catch {}
      this.ambienceGain = null;
    }
  }

  playParry(red: boolean): void { this.duckCombat(red ? 'red-parry' : 'parry'); this.effect('parry', .78, red ? .88 : 1.08); }
  playBlock(_power = 60): void { this.effect('block', .68); }
  playThrowEscape(): void { this.effect('whoosh', .65, 1.15); }
  playHit(power: number): void { this.duckCombat(power >= 85 ? 'heavy-hit' : 'light-hit'); this.effect(power >= 85 ? 'hit-heavy' : 'hit-light', power >= 85 ? .86 : .72); }
  playAirHit(power: number): void { this.playHit(power); this.effect('whoosh', .24, 1.16); }
  playCommandHit(power: number): void { this.playHit(power + 14); }
  playTargetHit(power: number): void { this.playHit(power); }
  playSuperStart(): void { this.duckCombat('super'); this.effect('super-start', .85); }
  playSuperImpact(_power: number, hitIndex = 1, hitTotal = 1): void {
    if (hitIndex < hitTotal) {
      const progress = (hitIndex - 1) / (hitTotal - 1);
      this.duckCombat('heavy-hit');
      this.effect('hit-heavy', .54 + progress * .18, 1.04 + progress * .1);
      return;
    }
    this.duckCombat('super');
    this.effect('super-impact', .89, .94);
  }
  playBossCue(burst: boolean): void { this.duckCombat('boss'); this.effect(burst ? 'super-impact' : 'super-start', .68, .88); }
  playDizzy(): void { this.effect('whoosh', .62, .58); this.effect('ui', .42, 1.7); }
  playQuickRise(): void { this.effect('whoosh', .42, 1.28); }
  playKo(): void { this.duckCombat('ko'); this.effect('ko', .9); }
  private effect(kind: ProducedSfx, volume: number, rate = 1): void {
    if (!this.isRunning()) return;
    if (!this.sampledSfx?.play(kind, volume, rate)) this.noiseBurst(.035, .018, 2600, 90);
  }

  private duckCombat(cue: CombatAudioCue): void {
    if (!this.context || !this.musicDuckBus || !this.ambienceDuckBus || !this.isRunning()) return;
    const t = this.context.currentTime;
    const amount = combatDuckAmount(cue);
    const previous = this.combatDuck;
    // Keep a stronger cue's release, and combine duplicate cues from the same moment.
    if (previous && t < previous.end && (amount > previous.music.target
      || (amount === previous.music.target && t === previous.start))) return;

    const next: ActiveCombatDuck = {
      start: t,
      end: t + combatDuckDuration(cue),
      music: { from: duckLevelAt(previous, 'music', t), target: amount },
      ambience: { from: duckLevelAt(previous, 'ambience', t), target: Math.min(.78, amount + .12) },
    };
    this.combatDuck = next;
    for (const [gain, range] of [[this.musicDuckBus.gain, next.music], [this.ambienceDuckBus.gain, next.ambience]] as const) {
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(range.from, t);
      gain.linearRampToValueAtTime(range.target, t + DUCK_ATTACK_SECONDS);
      gain.linearRampToValueAtTime(1, next.end);
    }
  }

  private resetCombatDuck(): void {
    if (!this.context || !this.combatDuck) return;
    this.combatDuck = null;
    const t = this.context.currentTime;
    for (const bus of [this.musicDuckBus, this.ambienceDuckBus]) {
      bus?.gain.cancelScheduledValues(t);
      bus?.gain.setValueAtTime(1, t);
    }
  }

  private async playMusicAssetLoop(key: string, url: string, volume: number): Promise<void> {
    if (!this.context || !this.enabled) return;
    const request = ++this.musicRequest;
    this.desiredMusicLoopKey = key;
    if (this.musicLoopKey === key && this.musicLoopSource) {
      if (this.musicLoopGain) this.musicLoopGain.gain.setTargetAtTime(volume, this.context.currentTime, .18);
      return;
    }
    const stillWanted = () => this.enabled && request === this.musicRequest && this.desiredMusicLoopKey === key;
    let buffer = await this.musicBufferFor(key, url);
    if (!buffer && stillWanted()) buffer = await this.musicBufferFor(key, url);
    if (!buffer || !this.context || !stillWanted()) return;
    const t = this.context.currentTime;
    const oldSource = this.musicLoopSource;
    const oldGain = this.musicLoopGain;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.linearRampToValueAtTime(volume, t + .72);
    source.connect(gain);
    gain.connect(this.musicBus ?? this.master!);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(t);
    this.musicLoopSource = source;
    this.musicLoopGain = gain;
    this.musicLoopKey = key;
    if (oldGain) {
      oldGain.gain.cancelScheduledValues(t);
      oldGain.gain.setValueAtTime(Math.max(.0001, oldGain.gain.value), t);
      oldGain.gain.linearRampToValueAtTime(.0001, t + .7);
    }
    if (oldSource) {
      try { oldSource.stop(t + .78); } catch {}
    }
  }

  private musicBufferFor(key: string, url: string): Promise<AudioBuffer | null> {
    const cached = this.musicBufferCache.get(key);
    if (cached) return Promise.resolve(cached);
    const existing = this.pendingMusicBuffers.get(key);
    if (existing) return existing;
    const context = this.context;
    if (!context) return Promise.resolve(null);
    // Share fetch/decode across quick exits and reentries; only playback has an owner.
    const pending = Promise.resolve().then(async () => {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        this.musicBufferCache.set(key, buffer);
        while (this.musicBufferCache.size > 3) this.musicBufferCache.delete(this.musicBufferCache.keys().next().value!);
        return buffer;
      } catch { return null; }
    }).finally(() => { this.pendingMusicBuffers.delete(key); });
    this.pendingMusicBuffers.set(key, pending);
    return pending;
  }

  private stopMusicAssetLoop(fadeSeconds: number, owns: (key: string) => boolean): void {
    if (this.desiredMusicLoopKey && owns(this.desiredMusicLoopKey)) {
      this.desiredMusicLoopKey = null;
      this.musicRequest += 1;
    }
    // An old screen cannot cancel the next screen's pending music.
    if (!this.musicLoopKey || !owns(this.musicLoopKey)) return;
    if (!this.context || !this.musicLoopSource || !this.musicLoopGain) {
      this.musicLoopSource = null;
      this.musicLoopGain = null;
      this.musicLoopKey = null;
      return;
    }
    const source = this.musicLoopSource;
    const gain = this.musicLoopGain;
    const t = this.context.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(.0001, gain.gain.value), t);
    gain.gain.linearRampToValueAtTime(.0001, t + fadeSeconds);
    try { source.stop(t + fadeSeconds + .08); } catch {}
    this.musicLoopSource = null;
    this.musicLoopGain = null;
    this.musicLoopKey = null;
  }

  private noiseBurst(duration: number, volume: number, lowpass: number, highpass = 0, bus?: GainNode | null): void {
    if (!this.context || !this.master || !this.enabled) return;
    const sampleRate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const low = this.context.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = lowpass;
    source.buffer = buffer;
    source.connect(low);
    let tail: AudioNode = low;
    if (highpass > 0) {
      const high = this.context.createBiquadFilter();
      high.type = 'highpass'; high.frequency.value = Math.min(highpass, sampleRate * .45);
      tail.connect(high); tail = high;
    }
    tail.connect(gain); gain.connect(bus ?? this.sfxBus ?? this.master);
    const t = this.context.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.start(t); source.stop(t + duration);
  }
}
