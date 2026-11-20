import { combatDuckAmount, combatDuckDuration, stageAudioMixProfile, type CombatAudioCue } from './AudioMixProfiles.js';
import { SampledSfxBank, type ProducedSfx } from './SampledSfxBank.js';
export class AudioManager {
  private sampledSfx: SampledSfxBank | null = null;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBase = .82;
  private ambienceBase = .72;
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
      this.musicBus.gain.value = .82;
      this.ambienceBus.gain.value = .72;
      this.sfxBus.gain.value = 1;
      this.musicBus.connect(this.master);
      this.ambienceBus.connect(this.master);
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


  startFrontendTheme(mode: 'title' | 'select' | 'ending'): void {
    if (!this.context || !this.master || !this.enabled) return;
    this.stopSoundscape(); this.stopFrontendTheme();
    const key = mode === 'title' ? 'title-theme' : mode === 'select' ? 'select-theme' : 'ending-theme';
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
    const mix = stageAudioMixProfile(stageId);
    this.musicBase = mix.music; this.ambienceBase = mix.ambience;
    this.musicBus?.gain.setValueAtTime(this.musicBase, this.context.currentTime);
    this.ambienceBus?.gain.setValueAtTime(this.ambienceBase, this.context.currentTime);
    this.sfxBus?.gain.setValueAtTime(mix.sfx, this.context.currentTime);
    // Keep the existing intensity/fade lifecycle, without a continuous synth drone.
    this.ambienceGain = this.context.createGain(); this.ambienceGain.gain.value = 0;
    this.ambienceGain.connect(this.ambienceBus ?? this.master);
    void this.playMusicAssetLoop('stage' + stageId + '-theme', '/audio/score-v2/stage' + stageId + '-theme.ogg', .8);
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
    this.musicBase = musicTarget; this.ambienceBase = mix.ambience;
    this.ambienceGain.gain.cancelScheduledValues(t);
    this.ambienceGain.gain.linearRampToValueAtTime(ambienceTarget, t + (level === 'belt' ? .45 : .32));
    if (this.musicBus) { this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.linearRampToValueAtTime(musicTarget, t + .42); }
    if (this.sfxBus) { this.sfxBus.gain.cancelScheduledValues(t); this.sfxBus.gain.linearRampToValueAtTime(sfxTarget, t + .18); }
    if (this.bossLayerGain) { this.bossLayerGain.gain.cancelScheduledValues(t); this.bossLayerGain.gain.linearRampToValueAtTime(bossLayerTarget, t + (level === 'final' ? .55 : .38)); }
  }

  stopSoundscape(): void {
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
  playSuperImpact(_power: number): void { this.effect('super-impact', .86); }
  playBossCue(burst: boolean): void { this.duckCombat('boss'); this.effect(burst ? 'super-impact' : 'super-start', .68, .88); }
  playKo(): void { this.duckCombat('ko'); this.effect('ko', .9); }
  private effect(kind: ProducedSfx, volume: number, rate = 1): void {
    if (!this.isRunning()) return;
    if (!this.sampledSfx?.play(kind, volume, rate)) this.noiseBurst(.035, .018, 2600, 90);
  }

  private duckCombat(cue: CombatAudioCue): void {
    if (!this.context || !this.musicBus || !this.ambienceBus || !this.isRunning()) return;
    const t = this.context.currentTime;
    const amount = combatDuckAmount(cue);
    const duration = combatDuckDuration(cue);
    const musicBase = this.musicBase;
    const ambienceBase = this.ambienceBase;
    this.musicBus.gain.cancelScheduledValues(t);
    this.ambienceBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(musicBase, t);
    this.ambienceBus.gain.setValueAtTime(ambienceBase, t);
    this.musicBus.gain.linearRampToValueAtTime(musicBase * amount, t + .012);
    this.ambienceBus.gain.linearRampToValueAtTime(ambienceBase * Math.min(.78, amount + .12), t + .012);
    this.musicBus.gain.linearRampToValueAtTime(musicBase, t + duration);
    this.ambienceBus.gain.linearRampToValueAtTime(ambienceBase, t + duration);
  }

  private async playMusicAssetLoop(key: string, url: string, volume: number): Promise<void> {
    if (!this.context || !this.enabled) return;
    const request = ++this.musicRequest;
    this.desiredMusicLoopKey = key;
    if (this.musicLoopKey === key && this.musicLoopSource) {
      if (this.musicLoopGain) this.musicLoopGain.gain.setTargetAtTime(volume, this.context.currentTime, .18);
      return;
    }
    const buffer = await this.musicBufferFor(key, url);
    if (!buffer || !this.context || !this.enabled || request !== this.musicRequest || this.desiredMusicLoopKey !== key) return;
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
