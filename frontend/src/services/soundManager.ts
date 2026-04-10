type SoundEvent = 'cardSelect' | 'cardPlay' | 'stoneShift' | 'topple' | 'scoreUp' | 'eliminated';

class SoundManager {
  private enabled = true;
  private context: AudioContext | null = null;
  private ambientTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const persisted = window.localStorage.getItem('sound-enabled');
      this.enabled = persisted !== 'false';
    }
  }

  private getContext() {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(next: boolean) {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sound-enabled', String(next));
    }
    if (!next) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }

  private async ensureRunning() {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }

  private async blip(opts: { freq: number; toFreq?: number; duration: number; gain: number; type?: OscillatorType }) {
    if (!this.enabled) return;
    try {
      const ctx = await this.ensureRunning();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(opts.freq, ctx.currentTime);
      if (opts.toFreq) {
        osc.frequency.exponentialRampToValueAtTime(opts.toFreq, ctx.currentTime + opts.duration);
      }
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(opts.gain, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + opts.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + opts.duration + 0.02);
    } catch {
      // Ignore audio failures in restricted environments.
    }
  }

  play(event: SoundEvent) {
    switch (event) {
      case 'cardSelect':
        this.blip({ freq: 520, toFreq: 430, duration: 0.08, gain: 0.035, type: 'triangle' });
        break;
      case 'cardPlay':
        this.blip({ freq: 190, toFreq: 120, duration: 0.15, gain: 0.055, type: 'sawtooth' });
        break;
      case 'stoneShift':
        this.blip({ freq: 270, toFreq: 220, duration: 0.12, gain: 0.04, type: 'square' });
        break;
      case 'topple':
        this.blip({ freq: 160, toFreq: 85, duration: 0.2, gain: 0.06, type: 'sawtooth' });
        break;
      case 'scoreUp':
        this.blip({ freq: 700, toFreq: 980, duration: 0.12, gain: 0.035, type: 'triangle' });
        break;
      case 'eliminated':
        this.blip({ freq: 140, toFreq: 95, duration: 0.2, gain: 0.05, type: 'square' });
        break;
      default:
        break;
    }
  }

  startAmbient() {
    if (!this.enabled || this.ambientTimer !== null || typeof window === 'undefined') return;
    this.ambientTimer = window.setInterval(() => {
      const r = Math.random();
      if (r > 0.85) {
        this.blip({ freq: 220 + Math.random() * 80, toFreq: 180, duration: 0.1, gain: 0.01, type: 'sine' });
      }
    }, 1300);
  }

  stopAmbient() {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
