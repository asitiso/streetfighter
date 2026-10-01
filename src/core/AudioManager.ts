import { combatDuckAmount, combatDuckDuration, stageAudioMixProfile, type CombatAudioCue } from './AudioMixProfiles.js';
export class AudioManager {
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
      this.master.connect(this.context.destination);
    }
    if (this.backgrounded || this.paused) {
      this.syncSuspension();
      return;
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }


  startFrontendTheme(mode: 'title' | 'select' | 'ending'): void {
    if (!this.context || !this.master || !this.enabled) return;
    this.stopSoundscape();
    this.stopFrontendTheme();
    const profiles = {
      title: { root: 164.81, color: .72, drift: .24, noise: 1100, gain: .18 },
      select: { root: 184.99, color: .84, drift: .4, noise: 1450, gain: .15 },
      ending: { root: 220.0, color: .66, drift: .18, noise: 780, gain: .16 },
    } as const;
    const profile = profiles[mode];
    const assetKey = mode === 'title' ? 'title-theme' : mode === 'select' ? 'select-theme' : 'ending-theme';
    void this.playMusicAssetLoop(assetKey, `/audio/${assetKey}.ogg`, mode === 'ending' ? .28 : .24);
    const bus = this.context.createGain();
    bus.gain.value = profile.gain;
    bus.connect(this.musicBus ?? this.master);
    this.menuGain = bus;

    const pad = this.context.createOscillator();
    const padGain = this.context.createGain();
    pad.type = mode === 'ending' ? 'sine' : 'triangle';
    pad.frequency.value = profile.root;
    padGain.gain.value = .22;
    pad.connect(padGain); padGain.connect(bus); pad.start();

    const harmony = this.context.createOscillator();
    const harmonyGain = this.context.createGain();
    harmony.type = mode === 'select' ? 'square' : 'triangle';
    harmony.frequency.value = profile.root * (mode === 'ending' ? 1.5 : 2);
    harmonyGain.gain.value = mode === 'select' ? .06 : .045;
    harmony.connect(harmonyGain); harmonyGain.connect(bus); harmony.start();

    const shimmer = this.context.createOscillator();
    const shimmerGain = this.context.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = profile.root * 3.01;
    shimmerGain.gain.value = .018 * profile.color;
    shimmer.connect(shimmerGain); shimmerGain.connect(bus); shimmer.start();

    const pulse = this.context.createOscillator();
    const pulseGain = this.context.createGain();
    pulse.type = 'sine';
    pulse.frequency.value = profile.drift;
    pulseGain.gain.value = .028;
    pulse.connect(pulseGain); pulseGain.connect(bus.gain); pulse.start();

    const sampleRate = this.context.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * 1.2));
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) * .45;
    const air = this.context.createBufferSource();
    air.buffer = buffer; air.loop = true;
    const airFilter = this.context.createBiquadFilter();
    airFilter.type = 'bandpass'; airFilter.frequency.value = profile.noise; airFilter.Q.value = .3;
    const airGain = this.context.createGain();
    airGain.gain.value = mode === 'title' ? .012 : mode === 'select' ? .009 : .007;
    air.connect(airFilter); airFilter.connect(airGain); airGain.connect(bus); air.start();

    this.menuSources.push(pad, harmony, shimmer, pulse, air);
  }

  stopFrontendTheme(): void {
    if (this.musicLoopKey === 'title-theme' || this.musicLoopKey === 'select-theme' || this.musicLoopKey === 'ending-theme') this.stopMusicAssetLoop(.42);
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
    this.syncSuspension();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.syncSuspension();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.78 : 0;
    if (enabled) this.syncSuspension();
  }

  isRunning(): boolean {
    return this.enabled && !this.backgrounded && !this.paused && this.context?.state === 'running';
  }

  private syncSuspension(): void {
    if (!this.context) return;
    const shouldSuspend = this.backgrounded || this.paused;
    if (shouldSuspend) {
      if (this.context.state === 'running') void this.context.suspend().catch(() => undefined);
      return;
    }
    if (this.enabled && this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  playUiConfirm(): void { this.chirp(220, 460, .08, .045, 'square'); }
  playMenuMove(): void { this.chirp(330, 410, .045, .018, 'triangle'); }
  playStagePulse(): void {
    this.tone(88, 118, .24, .035, 'sawtooth');
    this.tone(176, 236, .18, .018, 'triangle', .035);
  }

  playStageIntro(stageId: number): void {
    const roots = [196, 220, 174, 147, 131];
    const root = roots[Math.max(0, Math.min(roots.length - 1, stageId - 1))]!;
    this.chirp(root * .72, root, .13, .025, 'triangle', this.musicBus);
    this.chirp(root, root * 1.5, .16, .021, stageId === 5 ? 'sawtooth' : 'square', this.musicBus);
    this.tone(root * .5, root * .42, .2, .024, 'sine', .045, this.musicBus);
  }

  playDuelTransition(finalBoss = false): void {
    if (!this.context || !this.enabled) return;
    this.duckCombat('boss');
    const root = finalBoss ? 55 : 73;
    this.tone(root, root * .5, finalBoss ? .38 : .26, finalBoss ? .055 : .04, 'sawtooth', 0, this.musicBus);
    this.chirp(finalBoss ? 260 : 320, finalBoss ? 820 : 620, finalBoss ? .24 : .16, finalBoss ? .036 : .024, 'square', this.sfxBus);
    this.noiseBurst(finalBoss ? .18 : .11, finalBoss ? .028 : .017, finalBoss ? 900 : 1600, 120, this.sfxBus);
  }

  playStageClear(finalStage = false): void {
    if (!this.context || !this.enabled) return;
    this.duckCombat('ko');
    const t = this.context.currentTime;
    if (this.ambienceBus) { this.ambienceBus.gain.cancelScheduledValues(t); this.ambienceBus.gain.linearRampToValueAtTime(this.ambienceBase * (finalStage ? .16 : .3), t + .72); }
    if (this.musicBus) { this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.linearRampToValueAtTime(this.musicBase * (finalStage ? .34 : .55), t + .58); }
    if (this.bossLayerGain) { this.bossLayerGain.gain.cancelScheduledValues(t); this.bossLayerGain.gain.linearRampToValueAtTime(finalStage ? .006 : .0001, t + .48); }
    const root = finalStage ? 146.83 : 174.61;
    const notes = finalStage ? [1, 1.25, 1.5, 2, 2.5] : [1, 1.25, 1.5, 2];
    notes.forEach((ratio, i) => this.tone(root * ratio, root * ratio * 1.01, .18 + i * .025, finalStage ? .032 : .025, i === notes.length - 1 ? 'triangle' : 'square', i * .075, this.musicBus));
    if (finalStage) this.chirp(420, 1180, .3, .032, 'triangle', this.sfxBus);
  }

  playFinalKo(): void {
    this.duckCombat('ko');
    this.tone(74, 24, .52, .08, 'sawtooth', 0, this.sfxBus);
    this.noiseBurst(.32, .052, 650, 55, this.sfxBus);
    this.chirp(310, 72, .38, .035, 'square', this.sfxBus);
  }

  playEndingTransition(): void {
    if (!this.context || !this.enabled) return;
    void this.playMusicAssetLoop('ending-theme', '/audio/ending-theme.ogg', .28);
    const t = this.context.currentTime;
    this.musicBase = .68;
    this.ambienceBase = .42;
    if (this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.linearRampToValueAtTime(.28, t + .42);
      this.musicBus.gain.linearRampToValueAtTime(.68, t + 1.28);
    }
    if (this.ambienceBus) {
      this.ambienceBus.gain.cancelScheduledValues(t);
      this.ambienceBus.gain.linearRampToValueAtTime(.12, t + .62);
      this.ambienceBus.gain.linearRampToValueAtTime(.42, t + 1.55);
    }
    if (this.bossLayerGain) { this.bossLayerGain.gain.cancelScheduledValues(t); this.bossLayerGain.gain.linearRampToValueAtTime(.0001, t + .6); }
    [220, 277.18, 329.63, 440].forEach((note, i) => this.tone(note, note * 1.005, .5, .018, 'triangle', .16 + i * .18, this.musicBus));
    this.tone(110, 82, .92, .012, 'sine', .08, this.musicBus);
  }

  startStageSoundscape(stageId: number): void {
    if (!this.context || !this.master || !this.enabled) return;
    this.stopFrontendTheme();
    this.stopSoundscape();
    this.currentStageId = stageId;
    void this.playMusicAssetLoop(`stage${stageId}-theme`, `/audio/stage${stageId}-theme.ogg`, stageId === 5 ? .26 : .22);
    const profiles = [
      { root: 58, fifth: 87, noise: 720, volume: .022 },
      { root: 52, fifth: 78, noise: 1500, volume: .025 },
      { root: 62, fifth: 93, noise: 980, volume: .021 },
      { root: 49, fifth: 74, noise: 620, volume: .024 },
      { root: 44, fifth: 66, noise: 420, volume: .028 },
    ];
    const profile = profiles[Math.max(0, Math.min(profiles.length - 1, stageId - 1))]!;
    const mix = stageAudioMixProfile(stageId);
    this.musicBase = mix.music;
    this.ambienceBase = mix.ambience;
    if (this.musicBus) this.musicBus.gain.setValueAtTime(this.musicBase, this.context.currentTime);
    if (this.ambienceBus) this.ambienceBus.gain.setValueAtTime(this.ambienceBase, this.context.currentTime);
    if (this.sfxBus) this.sfxBus.gain.setValueAtTime(mix.sfx, this.context.currentTime);
    const gain = this.context.createGain();
    gain.gain.value = profile.volume * (.82 + mix.lowEnd * .18);
    gain.connect(this.ambienceBus ?? this.master);
    this.ambienceGain = gain;

    // A muted harmonic layer is always ready, then crossfaded in for DUEL/FINAL.
    // This avoids abrupt oscillator starts at the exact moment combat mode changes.
    const bossLayerGain = this.context.createGain();
    bossLayerGain.gain.value = .0001;
    bossLayerGain.connect(this.musicBus ?? this.master);
    this.bossLayerGain = bossLayerGain;
    const bossLayer = this.context.createOscillator();
    bossLayer.type = stageId === 5 ? 'sawtooth' : 'triangle';
    bossLayer.frequency.value = profile.root * (stageId === 5 ? .75 : 1.5);
    bossLayer.connect(bossLayerGain); bossLayer.start();
    this.bossLayerSource = bossLayer;
    const bossAir = this.context.createOscillator();
    const bossAirGain = this.context.createGain();
    bossAir.type = 'sine'; bossAir.frequency.value = profile.fifth * 2.01; bossAirGain.gain.value = .14;
    bossAir.connect(bossAirGain); bossAirGain.connect(bossLayerGain); bossAir.start();
    this.bossAirSource = bossAir;

    const low = this.context.createOscillator();
    low.type = stageId === 2 ? 'triangle' : stageId === 5 ? 'sawtooth' : 'sine';
    low.frequency.value = profile.root;
    low.connect(gain);
    low.start();

    const high = this.context.createOscillator();
    high.type = stageId === 4 ? 'square' : 'triangle';
    high.frequency.value = profile.fifth;
    const highGain = this.context.createGain();
    highGain.gain.value = .18 + mix.brightness * .055;
    high.connect(highGain); highGain.connect(gain);
    high.start();

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = stageId === 2 ? 1.8 : stageId === 4 ? .72 : .42;
    lfoGain.gain.value = .006;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    lfo.start();

    const length = Math.max(1, Math.floor(this.context.sampleRate * 1.5));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = stageId * 811 + 97;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = ((seed / 4294967295) * 2 - 1) * .52;
    }
    const noise = this.context.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = stageId === 2 ? 'bandpass' : 'lowpass';
    filter.frequency.value = profile.noise * mix.brightness;
    filter.Q.value = stageId === 2 ? .9 : .45;
    const noiseGain = this.context.createGain();
    noiseGain.gain.value = stageId === 4 ? .12 : stageId === 5 ? .1 : .075;
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(gain);
    noise.start();

    this.ambienceSources.push(low, high, lfo, noise);
  }

  playStageBeat(stageId: number, beat: number, level: 'belt' | 'duel' | 'final' = 'belt'): void {
    if (!this.context || !this.master || !this.enabled) return;
    const roots = [58.27, 65.41, 73.42, 55, 46.25];
    const root = roots[Math.max(0, Math.min(roots.length - 1, stageId - 1))]!;
    const patterns = [
      [1, 1.5, 2, 1.5, 1.125, 1.5, 2.25, 1.5],
      [1, 1.5, 1.875, 2.25, 1.5, 2.5, 1.875, 3],
      [1, 1.333, 1.5, 2, 1.5, 1.333, 1.125, 1.5],
      [1, 1, 1.5, 1, 2, 1.5, 1, 1.25],
      [1, 1.414, 1.5, 1.189, 2, 1.414, 2.378, 1.5],
    ];
    const pattern = patterns[Math.max(0, Math.min(patterns.length - 1, stageId - 1))]!;
    const ratio = pattern[beat % pattern.length]!;
    const accent = beat % 4 === 0;
    const intensity = level === 'final' ? 1.55 : level === 'duel' ? 1.24 : 1;
    const bossShift = stageId === 5 && level === 'final';
    this.tone(root * ratio, root * ratio * .992, accent ? .16 : .105, (accent ? .018 : .01) * intensity, stageId === 2 ? 'triangle' : stageId === 4 ? 'square' : 'sine', 0, this.musicBus);
    if (accent) this.tone(root * .5, root * .46, .12, .022 * intensity, 'sine', .008, this.musicBus);
    if (stageId === 2 && beat % 2 === 1) this.chirp(root * 3, root * 4, .045, .0065 * intensity, 'triangle', this.musicBus);
    if (stageId === 5 && beat % 4 === 2) this.tone(root * 2.02, root * 1.98, .18, .006 * intensity, 'sawtooth', 0, this.musicBus);
    if (level === 'duel' && accent) this.chirp(root * 2.5, root * 1.7, .07, .0085, 'triangle', this.musicBus);
    if (bossShift) {
      if (beat % 2 === 0) this.tone(root * .5, root * .42, .18, .028, 'sawtooth', 0, this.musicBus);
      if (beat % 4 === 3) this.chirp(root * 5.5, root * 2.2, .11, .009, 'square', this.musicBus);
    }
  }

  setStageIntensity(level: 'belt' | 'duel' | 'final'): void {
    if (!this.context || !this.ambienceGain) return;
    const mix = stageAudioMixProfile(this.currentStageId);
    if (this.currentStageId === 5 && level === 'final') void this.playMusicAssetLoop('final-boss-theme', '/audio/final-boss-theme.ogg', .31);
    else if (this.currentStageId === 5 && this.musicLoopKey === 'final-boss-theme') void this.playMusicAssetLoop('stage5-theme', '/audio/stage5-theme.ogg', .26);
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
    if (this.musicLoopKey?.startsWith('stage') || this.musicLoopKey === 'final-boss-theme') this.stopMusicAssetLoop(.5);
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

  playParry(red: boolean): void {
    this.duckCombat(red ? 'red-parry' : 'parry');
    this.chirp(red ? 240 : 540, red ? 920 : 1420, .105, .052, 'square');
    this.tone(red ? 96 : 132, red ? 62 : 88, .09, .045, 'triangle');
    this.noiseBurst(.055, red ? .038 : .028, 2400, red ? 6200 : 8600);
  }

  playBlock(power = 60): void {
    this.tone(Math.max(72, 138 - power * .25), 58, .055, .035, 'square');
    this.noiseBurst(.042, .018, 480, 1550);
  }

  playThrowEscape(): void {
    this.chirp(410, 820, .075, .035, 'triangle');
    this.chirp(790, 420, .07, .022, 'square');
  }

  playHit(power: number): void {
    this.duckCombat(power >= 85 ? 'heavy-hit' : 'light-hit');
    if (!this.context || !this.master || !this.enabled) return;
    const heavy = power >= 85;
    this.tone(Math.max(48, 168 - power * .5), heavy ? 34 : 46, heavy ? .09 : .065, Math.min(.095, .025 + power / 2200), 'sawtooth');
    this.noiseBurst(heavy ? .085 : .052, heavy ? .048 : .026, heavy ? 120 : 240, heavy ? 1800 : 2600);
    if (heavy) this.tone(62, 38, .11, .04, 'sine', .008);
  }

  playAirHit(power: number): void {
    this.playHit(power);
    this.chirp(360, 720, .055, .018, 'triangle');
  }

  playCommandHit(power: number): void {
    this.playHit(power + 14);
    this.tone(118, 72, .08, .025, 'square', .004);
  }

  playTargetHit(power: number): void {
    this.playHit(power);
    this.chirp(520, 760, .05, .018, 'square');
  }

  playSuperStart(): void {
    this.duckCombat('super');
    this.tone(82, 46, .18, .07, 'sine');
    this.chirp(330, 990, .14, .045, 'sawtooth');
    this.tone(660, 1320, .11, .025, 'triangle', .018);
    this.noiseBurst(.11, .022, 1400, 7200);
  }

  playSuperImpact(power: number): void {
    this.tone(74, 28, .18, .085, 'sawtooth');
    this.tone(148, 52, .12, .045, 'square', .008);
    this.noiseBurst(.15, Math.min(.075, .04 + power / 9000), 70, 2600);
    this.chirp(480, 120, .09, .026, 'triangle');
  }

  playBossCue(burst: boolean): void {
    this.duckCombat('boss');
    if (burst) {
      this.tone(66, 32, .24, .065, 'sawtooth');
      this.noiseBurst(.13, .035, 120, 1800);
    } else {
      this.chirp(180, 520, .16, .03, 'square');
    }
  }

  playKo(): void {
    this.duckCombat('ko');
    this.tone(92, 28, .34, .075, 'sawtooth');
    this.noiseBurst(.21, .04, 80, 1200);
  }

  private duckCombat(cue: CombatAudioCue): void {
    if (!this.context || !this.musicBus || !this.ambienceBus) return;
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
    this.desiredMusicLoopKey = key;
    if (this.musicLoopKey === key && this.musicLoopSource) {
      if (this.musicLoopGain) this.musicLoopGain.gain.setTargetAtTime(volume, this.context.currentTime, .18);
      return;
    }
    let buffer = this.musicBufferCache.get(key);
    if (!buffer) {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        buffer = await this.context.decodeAudioData(bytes.slice(0));
        this.musicBufferCache.set(key, buffer);
      } catch {
        return;
      }
    }
    if (!this.context || !this.enabled || this.desiredMusicLoopKey !== key) return;
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

  private stopMusicAssetLoop(fadeSeconds = .35): void {
    this.desiredMusicLoopKey = null;
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

  private chirp(from: number, to: number, duration: number, volume: number, type: OscillatorType, bus?: GainNode | null): void {
    this.tone(from, to, duration, volume, type, 0, bus);
  }

  private tone(from: number, to: number, duration: number, volume: number, type: OscillatorType, delay = 0, bus?: GainNode | null): void {
    if (!this.context || !this.master || !this.enabled) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const t = this.context.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, from), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration * .82);
    gain.gain.setValueAtTime(Math.max(.0001, volume), t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain); gain.connect(bus ?? this.sfxBus ?? this.master);
    osc.start(t); osc.stop(t + duration + .01);
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
