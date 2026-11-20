export type ProducedSfx = 'hit-light' | 'hit-heavy' | 'block' | 'parry' | 'whoosh' | 'super-start' | 'super-impact' | 'ko' | 'ui' | 'victory';
const CLIPS: Record<ProducedSfx, readonly string[]> = {
  'hit-light': ['hit-light-0','hit-light-1','hit-light-2'],
  'hit-heavy': ['hit-heavy-0','hit-heavy-1','hit-heavy-2'],
  block: ['block-0','block-1'], parry: ['parry-0','parry-1'],
  whoosh: ['whoosh'], 'super-start': ['super-start'], 'super-impact': ['super-impact'], ko: ['ko'], ui: ['ui'], victory: ['victory'],
};

export const PRODUCED_SFX_ASSETS = Object.values(CLIPS).flat().map(key => '/audio/sfx-v2/' + key + '.ogg');

// Fetch/decode belongs to unlock, never to a combat event. A missing sample is
// skipped immediately rather than replaying an old hit after a slow request.
export class SampledSfxBank {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Set<AudioBufferSourceNode>();
  private readonly turns = new Map<ProducedSfx, number>();
  private loading: Promise<void> | null = null;
  constructor(private readonly context: AudioContext, private readonly output: AudioNode) {}
  get activeVoiceCount(): number { return this.voices.size; }
  preload(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = Promise.all(Object.values(CLIPS).flat().filter(key => !this.buffers.has(key)).map(async key => {
      try {
        const response = await fetch('/audio/sfx-v2/' + key + '.ogg', { cache: 'force-cache' });
        if (!response.ok) return;
        const data = await response.arrayBuffer();
        this.buffers.set(key, await this.context.decodeAudioData(data));
      } catch { /* The synchronous physical-noise fallback remains available. */ }
    })).then(() => undefined).finally(() => { this.loading = null; });
    return this.loading;
  }
  play(kind: ProducedSfx, volume = .8, rate = 1): boolean {
    const turn = this.turns.get(kind) ?? 0;
    const ready = CLIPS[kind].map(key => this.buffers.get(key)).filter((buffer): buffer is AudioBuffer => !!buffer);
    const buffer = ready[turn % ready.length];
    if (!buffer || this.context.state !== 'running') return false;
    this.turns.set(kind, turn + 1);
    if (this.voices.size >= 8) {
      const oldest = this.voices.values().next().value;
      if (oldest) { this.voices.delete(oldest); try { oldest.stop(); } catch {} }
    }
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate * ([.98,1.025,1][turn % 3]!);
    gain.gain.value = Math.max(0, Math.min(1, volume));
    source.connect(gain); gain.connect(this.output);
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
    this.voices.add(source); source.start();
    return true;
  }
}
