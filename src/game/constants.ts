// Port & calibration of res://src/combat/game_3d/core/game_constants_3d.gd
// & res://src/combat/resources/presets/*.tres (GDD Sections 5, 6, 7, 8)

export type TowerType = 'laser' | 'cannon' | 'freeze' | 'armor_pen';
export type EnemyType = 'goblin' | 'orc' | 'harpy' | 'demon_king';
export type TargetingMode = 'FRONT_MOST' | 'LOWEST_HP' | 'CLOSEST';
export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';
export type CameraPreset = 'tactical' | 'action' | 'topdown' | 'core';

export interface TowerPreset {
  id: TowerType;
  keyHint: string;
  displayName: string;
  shortName: string;
  role: string;
  description: string;
  baseDamage: number;
  baseRangeGdd: number; // GDD px unit (120..150)
  fireRateSec: number;
  baseCost: number;
  aoeRadiusGdd: number;
  slowRatio: number; // 0..1 reduction
  slowDurationSec: number;
  ignoresArmor: boolean;
  accentHex: string;
  accentColor: number;
}

export interface EnemyPreset {
  id: EnemyType;
  displayName: string;
  role: string;
  baseHp: number;
  speedGdd: number; // GDD speed units (35..130)
  armor: number;
  rewardGold: number;
  leakDamage: number;
  isBoss: boolean;
  isFlying: boolean;
  primaryColor: number;
  accentColor: number;
  scale: number;
}

export interface WaveEntry {
  enemyId: EnemyType;
  count: number;
  spawnInterval: number;
}

export const STARTING_GOLD = 300;
export const STARTING_CORE_HP = 20;
export const REGULAR_LEAK_DAMAGE = 2;
export const BOSS_LEAK_DAMAGE = 5;
export const TOTAL_WAVES = 5;
export const MAX_TOWER_LEVEL = 3;

// Scale calibrated for Nur's 32m x 18m 3D arena (path length ~44m)
// Preserves exact GDD ratios across towers & enemies while ensuring tactical lane coverage.
export const RANGE_GDD_TO_METERS = 0.048; // 150px -> 7.2m, 140px -> 6.72m, 130px -> 6.24m, 120px -> 5.76m
export const AOE_GDD_TO_METERS = 0.085; // 35px -> 2.975m blast radius
export const SPEED_GDD_TO_MPS = 0.032; // Goblin 80 -> 2.56m/s, Harpy 130 -> 4.16m/s, Orc 45 -> 1.44m/s, Boss 35 -> 1.12m/s

export const TOWER_PRESETS: Record<TowerType, TowerPreset> = {
  laser: {
    id: 'laser',
    keyHint: '1',
    displayName: 'Laser Tower',
    shortName: 'Laser',
    role: 'Rapid Single-Target',
    description: 'Sinar plasma kontinyu dengan frekuensi tembak tinggi dan jangkauan terluas.',
    baseDamage: 15,
    baseRangeGdd: 150,
    fireRateSec: 0.5,
    baseCost: 100,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    accentHex: '#22D3EE',
    accentColor: 0x22d3ee,
  },
  cannon: {
    id: 'cannon',
    keyHint: '2',
    displayName: 'Cannon Tower',
    shortName: 'Cannon',
    role: 'Area Splash (AoE)',
    description: 'Proyektil artileri berat yang meledak dan menghasilkan shockwave AoE.',
    baseDamage: 40,
    baseRangeGdd: 120,
    fireRateSec: 1.5,
    baseCost: 150,
    aoeRadiusGdd: 35,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    accentHex: '#FB923C',
    accentColor: 0xfb923c,
  },
  freeze: {
    id: 'freeze',
    keyHint: '3',
    displayName: 'Freeze Tower',
    shortName: 'Freeze',
    role: 'Cryo Slow Control',
    description: 'Kristal Blinn-Phong yang membekukan musuh (-40% speed selama 2.5 detik).',
    baseDamage: 5,
    baseRangeGdd: 130,
    fireRateSec: 1.0,
    baseCost: 125,
    aoeRadiusGdd: 0,
    slowRatio: 0.4,
    slowDurationSec: 2.5,
    ignoresArmor: false,
    accentHex: '#7DD3FC',
    accentColor: 0x7dd3fc,
  },
  armor_pen: {
    id: 'armor_pen',
    keyHint: '4',
    displayName: 'Armor Pen Tower',
    shortName: 'Railgun',
    role: '100% Armor Pierce',
    description: 'Railgun elektromagnetik yang menembus 100% armor Orc & Boss Demon King.',
    baseDamage: 25,
    baseRangeGdd: 140,
    fireRateSec: 1.0,
    baseCost: 175,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: true,
    accentHex: '#F43F5E',
    accentColor: 0xf43f5e,
  },
};

export const TOWER_ORDER: TowerType[] = ['laser', 'cannon', 'freeze', 'armor_pen'];

export const ENEMY_PRESETS: Record<EnemyType, EnemyPreset> = {
  goblin: {
    id: 'goblin',
    displayName: 'Goblin Scout',
    role: 'Unit Serbu Dasar',
    baseHp: 100,
    speedGdd: 80,
    armor: 0,
    rewardGold: 15,
    leakDamage: REGULAR_LEAK_DAMAGE,
    isBoss: false,
    isFlying: false,
    primaryColor: 0x16a34a,
    accentColor: 0x4ade80,
    scale: 1.0,
  },
  orc: {
    id: 'orc',
    displayName: 'Orc Juggernaut',
    role: 'Tank Berarmor (10 Armor)',
    baseHp: 250,
    speedGdd: 45,
    armor: 10,
    rewardGold: 25,
    leakDamage: REGULAR_LEAK_DAMAGE,
    isBoss: false,
    isFlying: false,
    primaryColor: 0xd97706,
    accentColor: 0xfbbf24,
    scale: 1.25,
  },
  harpy: {
    id: 'harpy',
    displayName: 'Harpy Striker',
    role: 'Drone Cepat Udara',
    baseHp: 80,
    speedGdd: 130,
    armor: 0,
    rewardGold: 20,
    leakDamage: REGULAR_LEAK_DAMAGE,
    isBoss: false,
    isFlying: true,
    primaryColor: 0xa855f7,
    accentColor: 0xe879f9,
    scale: 1.0,
  },
  demon_king: {
    id: 'demon_king',
    displayName: 'Demon King',
    role: 'Boss Akhir (20 Armor)',
    baseHp: 1500,
    speedGdd: 35,
    armor: 20,
    rewardGold: 150,
    leakDamage: BOSS_LEAK_DAMAGE,
    isBoss: true,
    isFlying: false,
    primaryColor: 0x991b1b,
    accentColor: 0xff1e42,
    scale: 1.75,
  },
};

export const WAVE_INFO: Record<number, { title: string; subtitle: string; entries: WaveEntry[] }> = {
  1: {
    title: 'Wave 1 — Pengintaian',
    subtitle: '5 Goblin Scout',
    entries: [{ enemyId: 'goblin', count: 5, spawnInterval: 1.25 }],
  },
  2: {
    title: 'Wave 2 — Serbuan Cepat',
    subtitle: '6 Goblin, 2 Harpy',
    entries: [
      { enemyId: 'goblin', count: 6, spawnInterval: 1.05 },
      { enemyId: 'harpy', count: 2, spawnInterval: 1.1 },
    ],
  },
  3: {
    title: 'Wave 3 — Barisan Lapis Baja',
    subtitle: '5 Goblin, 3 Orc Berarmor',
    entries: [
      { enemyId: 'goblin', count: 5, spawnInterval: 0.95 },
      { enemyId: 'orc', count: 3, spawnInterval: 1.7 },
    ],
  },
  4: {
    title: 'Wave 4 — Serangan Terpadu',
    subtitle: '4 Goblin, 3 Orc, 3 Harpy',
    entries: [
      { enemyId: 'goblin', count: 4, spawnInterval: 0.85 },
      { enemyId: 'orc', count: 3, spawnInterval: 1.55 },
      { enemyId: 'harpy', count: 3, spawnInterval: 1.0 },
    ],
  },
  5: {
    title: 'Wave 5 — Invasi Demon King',
    subtitle: '1 Boss Demon King, 4 Orc, 4 Harpy',
    entries: [
      { enemyId: 'orc', count: 2, spawnInterval: 1.4 },
      { enemyId: 'demon_king', count: 1, spawnInterval: 2.2 },
      { enemyId: 'harpy', count: 4, spawnInterval: 0.95 },
      { enemyId: 'orc', count: 2, spawnInterval: 1.5 },
    ],
  },
};

export function getWaveComposition(waveNumber: number): WaveEntry[] {
  return WAVE_INFO[waveNumber]?.entries ?? [];
}
