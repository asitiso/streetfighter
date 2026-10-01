export type MemoryStability = 'unknown' | 'good' | 'watch' | 'poor';
export type SustainedStability = 'warming-up' | 'good' | 'watch' | 'poor';

export interface RuntimeTelemetrySnapshot {
  sampleCount: number;
  sessionSeconds: number;
  averageFps: number;
  lowFps: number;
  maxFrameMs: number;
  longFrameRate: number;
  heapUsedMb: number | null;
  heapPeakMb: number | null;
  heapGrowthMb: number | null;
  heapTrendMbPerMin: number | null;
  memoryStability: MemoryStability;
  qualityChanges: number;
  stability: 'warming-up' | 'good' | 'watch' | 'poor';
  baselineFps: number | null;
  recentFps: number | null;
  sustainedDegradationPct: number | null;
  sustainedStability: SustainedStability;
}

type PerformanceWithMemory = Performance & { memory?: { usedJSHeapSize?: number } };
interface HeapSample { second: number; mb: number; }
interface FpsWindowSample { second: number; fps: number; longFrameRate: number; }

function average(values: readonly number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class RuntimeTelemetry {
  private frameSamples: number[] = [];
  private totalFrames = 0;
  private totalSeconds = 0;
  private longFrames = 0;
  private maxFrameMs = 0;
  private heapUsedMb: number | null = null;
  private heapPeakMb: number | null = null;
  private heapSamples: HeapSample[] = [];
  private qualityChanges = 0;
  private heapSampleCooldown = 0;
  private fpsTimeline: FpsWindowSample[] = [];
  private fpsWindowSeconds = 0;
  private fpsWindowFrames = 0;
  private fpsWindowLongFrames = 0;

  sampleFrame(dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || dtSeconds > .5) return;
    this.totalFrames += 1;
    this.totalSeconds += dtSeconds;
    const ms = dtSeconds * 1000;
    this.maxFrameMs = Math.max(this.maxFrameMs, ms);
    if (ms > 25) this.longFrames += 1;
    this.frameSamples.push(dtSeconds);
    if (this.frameSamples.length > 600) this.frameSamples.shift();

    this.fpsWindowSeconds += dtSeconds;
    this.fpsWindowFrames += 1;
    if (ms > 25) this.fpsWindowLongFrames += 1;
    if (this.fpsWindowSeconds >= 1) {
      const fps = this.fpsWindowFrames / this.fpsWindowSeconds;
      const longFrameRate = this.fpsWindowFrames ? this.fpsWindowLongFrames / this.fpsWindowFrames : 0;
      this.fpsTimeline.push({ second: this.totalSeconds, fps, longFrameRate });
      const cutoff = this.totalSeconds - 900;
      while (this.fpsTimeline.length > 2 && this.fpsTimeline[0]!.second < cutoff) this.fpsTimeline.shift();
      this.fpsWindowSeconds = 0;
      this.fpsWindowFrames = 0;
      this.fpsWindowLongFrames = 0;
    }

    this.heapSampleCooldown -= dtSeconds;
    if (this.heapSampleCooldown <= 0) {
      this.heapSampleCooldown = 2;
      const perf = typeof performance === 'undefined' ? undefined : performance as PerformanceWithMemory;
      const bytes = perf?.memory?.usedJSHeapSize;
      if (typeof bytes === 'number' && Number.isFinite(bytes)) this.noteHeapSample(bytes / 1024 / 1024);
    }
  }

  noteHeapSample(mb: number): void {
    if (!Number.isFinite(mb) || mb < 0) return;
    this.heapUsedMb = mb;
    this.heapPeakMb = Math.max(this.heapPeakMb ?? 0, mb);
    this.heapSamples.push({ second: this.totalSeconds, mb });
    const cutoff = this.totalSeconds - 120;
    while (this.heapSamples.length > 2 && this.heapSamples[0]!.second < cutoff) this.heapSamples.shift();
  }

  noteQualityChange(): void { this.qualityChanges += 1; }

  snapshot(): RuntimeTelemetrySnapshot {
    const samples = [...this.frameSamples].sort((a, b) => a - b);
    const avgDt = this.frameSamples.length ? this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length : 0;
    const averageFps = avgDt > 0 ? 1 / avgDt : 0;
    const slowIndex = samples.length ? Math.min(samples.length - 1, Math.floor(samples.length * .95)) : 0;
    const slowDt = samples.length ? samples[slowIndex]! : 0;
    const lowFps = slowDt > 0 ? 1 / slowDt : 0;
    const longFrameRate = this.totalFrames ? this.longFrames / this.totalFrames : 0;
    let stability: RuntimeTelemetrySnapshot['stability'] = 'warming-up';
    if (this.frameSamples.length >= 120) {
      if (averageFps >= 55 && lowFps >= 45 && longFrameRate < .04) stability = 'good';
      else if (averageFps >= 48 && lowFps >= 35 && longFrameRate < .12) stability = 'watch';
      else stability = 'poor';
    }

    const firstHeap = this.heapSamples[0];
    const lastHeap = this.heapSamples[this.heapSamples.length - 1];
    const heapSpan = firstHeap && lastHeap ? Math.max(0, lastHeap.second - firstHeap.second) : 0;
    const heapGrowthMb = firstHeap && lastHeap ? lastHeap.mb - firstHeap.mb : null;
    const heapTrendMbPerMin = heapGrowthMb != null && heapSpan >= 1 ? heapGrowthMb / heapSpan * 60 : null;
    let memoryStability: MemoryStability = 'unknown';
    if (this.heapSamples.length >= 4 && heapSpan >= 10 && heapGrowthMb != null && heapTrendMbPerMin != null) {
      if (heapSpan >= 20 && heapGrowthMb > 64 && heapTrendMbPerMin > 45) memoryStability = 'poor';
      else if (heapGrowthMb > 32 && heapTrendMbPerMin > 20) memoryStability = 'watch';
      else memoryStability = 'good';
    }

    const baselineSamples = this.fpsTimeline.filter((sample) => sample.second >= 60 && sample.second <= 180).map((sample) => sample.fps);
    const recentCutoff = Math.max(0, this.totalSeconds - 120);
    const recentSamples = this.fpsTimeline.filter((sample) => sample.second >= recentCutoff).map((sample) => sample.fps);
    const baselineFps = baselineSamples.length >= 30 ? average(baselineSamples) : null;
    const recentFps = this.totalSeconds >= 180 && recentSamples.length >= 30 ? average(recentSamples) : null;
    const sustainedDegradationPct = baselineFps != null && recentFps != null && baselineFps > 0
      ? Math.max(-50, Math.min(100, (baselineFps - recentFps) / baselineFps * 100))
      : null;
    let sustainedStability: SustainedStability = 'warming-up';
    if (this.totalSeconds >= 600 && baselineFps != null && recentFps != null && sustainedDegradationPct != null) {
      if (recentFps >= 50 && sustainedDegradationPct <= 12) sustainedStability = 'good';
      else if (recentFps >= 43 && sustainedDegradationPct <= 25) sustainedStability = 'watch';
      else sustainedStability = 'poor';
    }

    return {
      sampleCount: this.totalFrames,
      sessionSeconds: this.totalSeconds,
      averageFps,
      lowFps,
      maxFrameMs: this.maxFrameMs,
      longFrameRate,
      heapUsedMb: this.heapUsedMb,
      heapPeakMb: this.heapPeakMb,
      heapGrowthMb,
      heapTrendMbPerMin,
      memoryStability,
      qualityChanges: this.qualityChanges,
      stability,
      baselineFps: baselineFps == null ? null : Math.round(baselineFps * 10) / 10,
      recentFps: recentFps == null ? null : Math.round(recentFps * 10) / 10,
      sustainedDegradationPct: sustainedDegradationPct == null ? null : Math.round(sustainedDegradationPct * 10) / 10,
      sustainedStability,
    };
  }
}
