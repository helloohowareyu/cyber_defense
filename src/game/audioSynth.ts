// 100% Offline procedural Web Audio API sound effects synthesizer (GDD Section 11)
// Zero external .mp3/.wav files required.

class CyberAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;
  private muted = false;
  private lastLaserAt = 0;
  private lastHitAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configure(volume: number, muted: boolean): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  private pitchJitter(base: number, pct = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.045);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playBuild(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [330, 495, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.045);
      g.gain.setValueAtTime(0.11, t + i * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.045 + 0.14);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.045);
      osc.stop(t + i * 0.045 + 0.15);
    });
  }

  public playUpgrade(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      g.gain.setValueAtTime(0.11, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.16);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.18);
    });
  }

  public playSell(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [720, 540];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.055);
      g.gain.setValueAtTime(0.09, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.12);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.13);
    });
  }

  public playLaser(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = performance.now();
    if (now - this.lastLaserAt < 90) return;
    this.lastLaserAt = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.pitchJitter(980), t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.09);
    g.gain.setValueAtTime(0.055, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  public playCannon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(150), t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.24);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.27);
  }

  public playFreeze(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(1420), t);
    osc.frequency.exponentialRampToValueAtTime(2100, t + 0.12);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playArmorPen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(this.pitchJitter(620), t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playEnemyKill(isBoss = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = performance.now();
    if (!isBoss && now - this.lastHitAt < 50) return;
    this.lastHitAt = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = isBoss ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isBoss ? 180 : this.pitchJitter(520), t);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 42 : 840, t + (isBoss ? 0.45 : 0.1));
    g.gain.setValueAtTime(isBoss ? 0.24 : 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isBoss ? 0.48 : 0.12));
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (isBoss ? 0.5 : 0.13));
  }

  public playWaveStart(isBossWave = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const chord = isBossWave ? [130.81, 155.56, 196.0, 261.63] : [261.63, 329.63, 392.0];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isBossWave ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      g.gain.setValueAtTime(0.09, t + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + (isBossWave ? 0.55 : 0.35));
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + (isBossWave ? 0.58 : 0.38));
    });
  }

  public playCoreHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.28);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.11);
      g.gain.setValueAtTime(0.13, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.36);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.11);
      osc.stop(t + i * 0.11 + 0.4);
    });
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const t = ctx.currentTime;
    const notes = [329.63, 293.66, 246.94, 196.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.14);
      g.gain.setValueAtTime(0.1, t + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.32);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.36);
    });
  }
}

export const audioSynth = new CyberAudioSynth();
