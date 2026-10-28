import { SimulationPhase } from '../simulation/shorelineEngine';

/**
 * Pure Web Audio API coastal surf & sand-carving synthesizer.
 * Zero external audio files required; responds dynamically to wave surge and stick carving speed.
 */
export class CoastalAudioEngine {
  private ctx: AudioContext | null = null;
  private surfGain: GainNode | null = null;
  private surfFilter: BiquadFilterNode | null = null;
  private scratchGain: GainNode | null = null;
  private scratchFilter: BiquadFilterNode | null = null;
  private isMuted: boolean = true;
  private isInitialized: boolean = false;

  public toggleMute(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    this.isMuted = !this.isMuted;
    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
    if (this.surfGain && this.ctx) {
      this.surfGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.08,
        this.ctx.currentTime,
        0.15
      );
    }
    if (this.scratchGain && this.ctx && this.isMuted) {
      this.scratchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Create 4-second looping pink/brown noise buffer for ocean surf and sand grit
      const sampleRate = ctx.sampleRate;
      const bufferSize = sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      // 1. Ocean Surf Node
      const surfSource = ctx.createBufferSource();
      surfSource.buffer = noiseBuffer;
      surfSource.loop = true;

      const surfFilter = ctx.createBiquadFilter();
      surfFilter.type = 'lowpass';
      surfFilter.frequency.value = 320;
      surfFilter.Q.value = 0.7;

      const surfGain = ctx.createGain();
      surfGain.gain.value = 0;

      surfSource.connect(surfFilter);
      surfFilter.connect(surfGain);
      surfGain.connect(ctx.destination);
      surfSource.start(0);

      this.surfFilter = surfFilter;
      this.surfGain = surfGain;

      // 2. Sand Carving Grit Node
      const scratchSource = ctx.createBufferSource();
      scratchSource.buffer = noiseBuffer;
      scratchSource.loop = true;

      const scratchFilter = ctx.createBiquadFilter();
      scratchFilter.type = 'bandpass';
      scratchFilter.frequency.value = 1350;
      scratchFilter.Q.value = 2.4;

      const scratchGain = ctx.createGain();
      scratchGain.gain.value = 0;

      scratchSource.connect(scratchFilter);
      scratchFilter.connect(scratchGain);
      scratchGain.connect(ctx.destination);
      scratchSource.start(0);

      this.scratchFilter = scratchFilter;
      this.scratchGain = scratchGain;
      this.isInitialized = true;
    } catch {
      // Ignore audio initialization failures in headless browsers
    }
  }

  public updateFrame(
    phase: SimulationPhase,
    phaseProgress: number,
    isCarving: boolean,
    carveSpeed: number
  ): void {
    if (!this.isInitialized || this.isMuted || !this.ctx || !this.surfGain || !this.surfFilter || !this.scratchGain || !this.scratchFilter) {
      return;
    }

    const now = this.ctx.currentTime;

    // Modulate ocean wave roar & foam hiss based on wave phase
    let targetSurfVol = 0.06;
    let targetSurfFreq = 260;

    if (phase === 'wave-washing') {
      const surgeBell = Math.sin(phaseProgress * Math.PI);
      targetSurfVol = 0.08 + 0.18 * surgeBell;
      targetSurfFreq = 320 + 620 * surgeBell;
    } else if (phase === 'wave-receding') {
      const recedeFade = 1 - phaseProgress;
      targetSurfVol = 0.06 + 0.11 * recedeFade;
      targetSurfFreq = 260 + 380 * recedeFade;
    }

    this.surfGain.gain.setTargetAtTime(targetSurfVol, now, 0.08);
    this.surfFilter.frequency.setTargetAtTime(targetSurfFreq, now, 0.08);

    // Modulate sand-carving grit when stick is actively engraving letters
    if (isCarving && carveSpeed > 0.2) {
      const clampedSpeed = Math.min(1, carveSpeed / 10);
      this.scratchGain.gain.setTargetAtTime(0.045 * clampedSpeed, now, 0.03);
      this.scratchFilter.frequency.setTargetAtTime(1100 + 600 * clampedSpeed, now, 0.03);
    } else {
      this.scratchGain.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
