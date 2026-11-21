// 100% Offline Procedural Web Audio API Sound Engine:
// - Adaptive Cyber-Synthwave Background Music Sequencer (Ambient Prep / Active Wave / Boss Intensity)
// - Tactical SFX for all 6 Towers, Data Farm packets, Ultimates, Kills, Waves, and Victory/Defeat.
// Zero external audio files or internet required.

export type MusicMood = 'idle' | 'combat' | 'boss';

// MIDI note to Hz helper
function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class CyberAudioSynth {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private volume = 0.7;
  private sfxMuted = false;
  private musicMuted = false;

  // Sequencer state
  private musicTimer: number | null = null;
  private musicRunning = false;
  private musicStep = 0;
  private musicMood: MusicMood = 'idle';

  // Rate limiters to prevent audio clipping during dense swarms
  private lastLaserAt = 0;
  private lastTeslaAt = 0;
  private lastHitAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
      if (ua && !ua.hasBeenActive) return null;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxMuted ? 0 : this.volume;
      this.sfxGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : this.volume * 0.32;
      this.musicGain.connect(this.ctx.destination);

      // Generate short white-noise buffer once for hi-hat / explosion transients
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.12);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
      }
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configure(volume: number, sfxMuted: boolean, musicMuted = this.musicMuted): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sfxMuted = sfxMuted;
    this.musicMuted = musicMuted;
    if (this.ctx) {
      if (this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(this.sfxMuted ? 0 : this.volume, this.ctx.currentTime, 0.03);
      }
      if (this.musicGain) {
        this.musicGain.gain.setTargetAtTime(
          this.musicMuted ? 0 : this.volume * 0.32,
          this.ctx.currentTime,
          0.05
        );
      }
    }
  }

  public setMusicMood(mood: MusicMood): void {
    this.musicMood = mood;
  }

  public startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicRunning) return;
    this.musicRunning = true;
    this.scheduleStep();
  }

  public stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleStep(): void {
    if (!this.musicRunning) return;
    const stepMs = this.musicMood === 'boss' ? 115 : this.musicMood === 'combat' ? 128 : 155;
    if (!this.musicMuted && this.ctx && this.ctx.state === 'running' && this.musicGain) {
      this.playMusicStep(this.ctx, this.musicStep, stepMs / 1000);
    }
    this.musicStep = (this.musicStep + 1) % 32;
    this.musicTimer = window.setTimeout(() => this.scheduleStep(), stepMs);
  }

  private playMusicStep(ctx: AudioContext, step: number, stepSec: number): void {
    if (!this.musicGain) return;
    const t = ctx.currentTime + 0.01;
    const bar = Math.floor(step / 8); // 4 bars of 8 eighth-notes (32 steps)
    const beatInBar = step % 8;

    // Dark Cyber-Synthwave chord roots: Am -> F -> C -> G (boss shifts to tense Am -> Bb -> Gm -> E)
    const bassRoots =
      this.musicMood === 'boss' ? [33, 34, 31, 28] : [33, 29, 36, 31];
    const arpChords =
      this.musicMood === 'boss'
        ? [
            [57, 60, 64, 69], // Am
            [58, 62, 65, 70], // Bb
            [55, 58, 62, 67], // Gm
            [52, 56, 59, 64], // E
          ]
        : [
            [57, 60, 64, 67], // Am7
            [53, 57, 60, 64], // Fmaj7
            [55, 60, 64, 67], // C
            [55, 59, 62, 67], // G
          ];

    const rootMidi = bassRoots[bar];
    const chord = arpChords[bar];

    // 1. Driving Filtered Synth Bass (plays every even step in idle, pumping 8ths in combat/boss)
    if (this.musicMood !== 'idle' || beatInBar % 2 === 0) {
      const bassOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      bassOsc.type = 'sawtooth';
      const octaveJump = beatInBar === 6 || beatInBar === 7 ? 12 : 0;
      bassOsc.frequency.setValueAtTime(midiToHz(rootMidi + octaveJump), t);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.musicMood === 'boss' ? 760 : 520, t);
      filter.frequency.exponentialRampToValueAtTime(170, t + stepSec * 0.9);
      const bassVol = this.musicMood === 'idle' ? 0.16 : 0.24;
      g.gain.setValueAtTime(bassVol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepSec * 0.92);
      bassOsc.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      bassOsc.start(t);
      bassOsc.stop(t + stepSec * 0.95);
    }

    // 2. Shimmering Cyber Arpeggio Synth
    const arpPattern = [0, 1, 2, 3, 2, 1, 3, 2];
    const playArp = this.musicMood !== 'idle' || beatInBar % 2 === 0;
    if (playArp) {
      const noteMidi = chord[arpPattern[beatInBar]] + (this.musicMood === 'boss' && step % 4 === 0 ? 12 : 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = this.musicMood === 'boss' ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(midiToHz(noteMidi), t);
      const vol = this.musicMood === 'boss' ? 0.085 : 0.1;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepSec * 0.85);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + stepSec * 0.9);
    }

    // 3. Soft Atmospheric Pad Swell on bar start
    if (beatInBar === 0) {
      const padOsc = ctx.createOscillator();
      const g = ctx.createGain();
      padOsc.type = 'sine';
      padOsc.frequency.setValueAtTime(midiToHz(chord[0] - 12), t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + stepSec * 1.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepSec * 7.6);
      padOsc.connect(g);
      g.connect(this.musicGain);
      padOsc.start(t);
      padOsc.stop(t + stepSec * 7.8);
    }

    // 4. Electronic Pulse Kick & Hi-Hat (active during combat & boss waves!)
    if (this.musicMood !== 'idle') {
      if (beatInBar === 0 || beatInBar === 4 || (this.musicMood === 'boss' && beatInBar === 6)) {
        const kick = ctx.createOscillator();
        const kg = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(118, t);
        kick.frequency.exponentialRampToValueAtTime(38, t + 0.11);
        kg.gain.setValueAtTime(0.26, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        kick.connect(kg);
        kg.connect(this.musicGain);
        kick.start(t);
        kick.stop(t + 0.14);
      }

      if (this.noiseBuffer && beatInBar % 2 === 1) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hg = ctx.createGain();
        hg.gain.setValueAtTime(0.075, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        src.connect(hp);
        hp.connect(hg);
        hg.connect(this.musicGain);
        src.start(t);
        src.stop(t + 0.06);
      }
    }
  }

  private pitchJitter(base: number, pct = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.045);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playBuild(overclocked = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const notes = overclocked ? [392, 523.25, 659.25, 1046.5] : [330, 495, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = overclocked ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.042);
      g.gain.setValueAtTime(0.11, t + i * 0.042);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.042 + 0.14);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.042);
      osc.stop(t + i * 0.042 + 0.15);
    });
  }

  public playUpgrade(unlockedUltimate = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const notes = unlockedUltimate ? [440, 554.37, 659.25, 880, 1108.73] : [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      g.gain.setValueAtTime(0.12, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.2);
    });
  }

  public playSell(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
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
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.13);
    });
  }

  public playFarmIncome(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      g.gain.setValueAtTime(0.08, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.16);
    });
  }

  public playUltimate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    // Dramatic synth sweep + sub bass drop
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(220, t);
    sub.frequency.exponentialRampToValueAtTime(48, t + 0.42);
    sg.gain.setValueAtTime(0.22, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    sub.connect(sg);
    sg.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.48);

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.045);
      g.gain.setValueAtTime(0.11, t + i * 0.045);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.045 + 0.34);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.045);
      osc.stop(t + i * 0.045 + 0.36);
    });
  }

  public playLaser(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const now = performance.now();
    if (now - this.lastLaserAt < 85) return;
    this.lastLaserAt = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.pitchJitter(980), t);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.085);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playTesla(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const now = performance.now();
    if (now - this.lastTeslaAt < 95) return;
    this.lastTeslaAt = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(this.pitchJitter(1320), t);
    osc.frequency.linearRampToValueAtTime(420, t + 0.05);
    osc.frequency.linearRampToValueAtTime(1640, t + 0.1);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playCannon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(150), t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.24);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.27);
  }

  public playFreeze(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(1420), t);
    osc.frequency.exponentialRampToValueAtTime(2100, t + 0.12);
    g.gain.setValueAtTime(0.055, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playArmorPen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(this.pitchJitter(640), t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playEnemyKill(isBoss = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const now = performance.now();
    if (!isBoss && now - this.lastHitAt < 50) return;
    this.lastHitAt = now;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = isBoss ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isBoss ? 180 : this.pitchJitter(520), t);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 40 : 860, t + (isBoss ? 0.5 : 0.1));
    g.gain.setValueAtTime(isBoss ? 0.24 : 0.075, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isBoss ? 0.55 : 0.12));
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + (isBoss ? 0.58 : 0.13));
  }

  public playWaveStart(isBossWave = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const chord = isBossWave ? [130.81, 155.56, 196.0, 261.63] : [261.63, 329.63, 392.0];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isBossWave ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      g.gain.setValueAtTime(0.09, t + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + (isBossWave ? 0.55 : 0.32));
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + (isBossWave ? 0.58 : 0.35));
    });
  }

  public playCoreHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.28);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
    const t = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.11);
      g.gain.setValueAtTime(0.14, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.42);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.11);
      osc.stop(t + i * 0.11 + 0.45);
    });
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.sfxMuted) return;
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
      g.connect(this.sfxGain!);
      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.36);
    });
  }
}

export const audioSynth = new CyberAudioSynth();
