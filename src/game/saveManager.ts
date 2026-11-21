// Offline local persistence matching GDD Section 12 (SaveManager3D)

export interface SaveData {
  highScore: number;
  highestWave: number;
  totalEnemiesDefeated: number;
  wins: number;
  volume: number; // 0..1
  muted: boolean;
}

const STORAGE_KEY = 'cyber_defense_3d_save_v1';

const DEFAULT_SAVE: SaveData = {
  highScore: 0,
  highestWave: 0,
  totalEnemiesDefeated: 0,
  wins: 0,
  volume: 0.7,
  muted: false,
};

export function loadSaveData(): SaveData {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SAVE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      highScore: typeof parsed.highScore === 'number' ? Math.max(0, Math.floor(parsed.highScore)) : 0,
      highestWave: typeof parsed.highestWave === 'number' ? Math.max(0, Math.floor(parsed.highestWave)) : 0,
      totalEnemiesDefeated:
        typeof parsed.totalEnemiesDefeated === 'number'
          ? Math.max(0, Math.floor(parsed.totalEnemiesDefeated))
          : 0,
      wins: typeof parsed.wins === 'number' ? Math.max(0, Math.floor(parsed.wins)) : 0,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.7,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function persistSaveData(data: SaveData): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function recordMatchResult(
  prev: SaveData,
  result: { score: number; waveReached: number; defeatedThisMatch: number; won: boolean }
): SaveData {
  const next: SaveData = {
    ...prev,
    highScore: Math.max(prev.highScore, Math.floor(result.score)),
    highestWave: Math.max(prev.highestWave, Math.floor(result.waveReached)),
    totalEnemiesDefeated: prev.totalEnemiesDefeated + Math.max(0, Math.floor(result.defeatedThisMatch)),
    wins: prev.wins + (result.won ? 1 : 0),
  };
  persistSaveData(next);
  return next;
}
