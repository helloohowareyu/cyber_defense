// Audio game:
// - Musik latar dari file lagu: "Calculated Ascent" di menu utama, "Override Pulse" saat bermain.
//   Di sela wave lagu wave tetap jalan tapi lebih pelan, lalu naik penuh begitu wave dimulai.
// - SFX prosedural (Web Audio API) untuk menara, farm, ultimate, kill, wave, menang/kalah.

import menuTrackUrl from '../audio/calculated-ascent.mp3';
import waveTrackUrl from '../audio/override-pulse.mp3';

// menu: layar judul, idle: di arena tapi wave belum jalan, combat/boss: wave berjalan, off: hening
export type MusicMood = 'menu' | 'idle' | 'combat' | 'boss' | 'off';

type TrackId = 'menu' | 'wave';

// Seberapa keras tiap lagu untuk setiap mood (0..1, dikali volume master)
const MOOD_MIX: Record<MusicMood, Record<TrackId, number>> = {
  menu: { menu: 1, wave: 0 },
  idle: { menu: 0, wave: 0.4 },
  combat: { menu: 0, wave: 1 },
  boss: { menu: 0, wave: 1 },
  off: { menu: 0, wave: 0 },
};

const MUSIC_LEVEL = 0.55;
const FADE_STEP_MS = 50;
// Lama crossfade antar lagu (detik), dihitung dari waktu nyata supaya tetap pas walau frame drop
const FADE_SECONDS = 1.2;

// MIDI note to Hz helper
function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class CyberAudioSynth {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private volume = 0.7;
  private sfxMuted = false;
  private musicMuted = false;

  // Pemutar lagu
  private tracks: Record<TrackId, HTMLAudioElement> | null = null;
  private trackLevel: Record<TrackId, number> = { menu: 0, wave: 0 };
  private musicMood: MusicMood = 'menu';
  private musicRunning = false;
  private fadeTimer: number | null = null;
  private unlockArmed = false;

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
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.sfxMuted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    this.applyTrackVolumes();
    if (this.musicRunning) {
      this.syncTrackPlayback();
      this.startFade();
    }
  }

  // ---------------------------------------------------------------------------
  // Musik latar
  // ---------------------------------------------------------------------------

  private ensureTracks(): Record<TrackId, HTMLAudioElement> | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.tracks) {
      const make = (src: string) => {
        const el = new Audio(src);
        el.loop = true;
        el.preload = 'auto';
        el.volume = 0;
        return el;
      };
      this.tracks = { menu: make(menuTrackUrl), wave: make(waveTrackUrl) };
    }
    return this.tracks;
  }

  public setMusicMood(mood: MusicMood): void {
    if (this.musicMood === mood) return;
    // Lagu wave mulai dari awal setiap kali masuk arena dari menu
    if (this.musicMood === 'menu' && mood !== 'menu' && this.tracks) {
      this.tracks.wave.currentTime = 0;
    }
    if (mood === 'menu' && this.musicMood !== 'menu' && this.tracks) {
      this.tracks.menu.currentTime = 0;
    }
    this.musicMood = mood;
    if (this.musicRunning) {
      this.syncTrackPlayback();
      this.startFade();
    }
  }

  public startMusic(): void {
    this.ensureContext();
    if (!this.ensureTracks()) return;
    this.musicRunning = true;
    this.syncTrackPlayback();
    this.startFade();
  }

  public stopMusic(): void {
    this.musicRunning = false;
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.tracks) {
      this.tracks.menu.pause();
      this.tracks.wave.pause();
    }
  }

  private targetLevel(id: TrackId): number {
    return this.musicMuted ? 0 : MOOD_MIX[this.musicMood][id];
  }

  // Putar lagu yang perlu terdengar; browser menolak autoplay sebelum ada klik/tombol,
  // jadi kalau ditolak kita coba lagi pada interaksi pertama.
  private syncTrackPlayback(): void {
    const tracks = this.tracks;
    if (!tracks) return;
    (Object.keys(tracks) as TrackId[]).forEach((id) => {
      const el = tracks[id];
      const wanted = this.targetLevel(id) > 0 || this.trackLevel[id] > 0.001;
      if (wanted && el.paused) {
        el.play().catch(() => this.armUnlock());
      }
    });
  }

  private armUnlock(): void {
    if (this.unlockArmed || typeof window === 'undefined') return;
    this.unlockArmed = true;
    const retry = () => {
      window.removeEventListener('pointerdown', retry, true);
      window.removeEventListener('keydown', retry, true);
      this.unlockArmed = false;
      if (this.musicRunning) this.startMusic();
    };
    window.addEventListener('pointerdown', retry, true);
    window.addEventListener('keydown', retry, true);
  }

  private applyTrackVolumes(): void {
    if (!this.tracks) return;
    (Object.keys(this.tracks) as TrackId[]).forEach((id) => {
      this.tracks![id].volume = Math.max(0, Math.min(1, this.trackLevel[id] * this.volume * MUSIC_LEVEL));
    });
  }

  private startFade(): void {
    if (this.fadeTimer !== null || typeof window === 'undefined') return;
    let last = performance.now();
    this.fadeTimer = window.setInterval(() => {
      const now = performance.now();
      const maxStep = Math.min(1, (now - last) / 1000 / FADE_SECONDS);
      last = now;
      let settled = true;
      (['menu', 'wave'] as TrackId[]).forEach((id) => {
        const target = this.targetLevel(id);
        const cur = this.trackLevel[id];
        if (Math.abs(target - cur) > 0.001) {
          settled = false;
          this.trackLevel[id] = cur + Math.sign(target - cur) * Math.min(maxStep, Math.abs(target - cur));
        }
      });
      this.applyTrackVolumes();
      if (settled) {
        if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        // Hentikan lagu yang sudah benar-benar senyap supaya tidak makan CPU
        if (this.tracks) {
          (['menu', 'wave'] as TrackId[]).forEach((id) => {
            if (this.trackLevel[id] <= 0.001 && !this.tracks![id].paused) this.tracks![id].pause();
          });
        }
      }
    }, FADE_STEP_MS);
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
