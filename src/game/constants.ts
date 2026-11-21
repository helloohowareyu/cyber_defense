// Cyber Defense 3D — Core Game Constants, 6 Towers (with Lv.4 Ultimates),
// 6 Cyber-Themed Enemies, and 15-Wave 3-Stage + Final Boss Campaign.

export type TowerType = 'laser' | 'cannon' | 'freeze' | 'armor_pen' | 'tesla' | 'farm';
export type EnemyType =
  | 'bit_crawler'
  | 'packet_wisp'
  | 'worm_swarm'
  | 'trojan_brute'
  | 'aegis_dreadnought'
  | 'omega_overlord';

// BTD6-style 4 targeting modes
export type TargetingMode = 'FIRST' | 'STRONG' | 'LAST' | 'CLOSE';
export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';
export type CameraPreset = 'tactical' | 'action' | 'topdown' | 'core';
export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyPreset {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  tagline: string;
  startingGold: number;
  startingCoreHp: number;
  overclockUnlockCost: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  goldRewardMult: number;
  towerCostMult: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyId, DifficultyPreset> = {
  easy: {
    id: 'easy',
    label: 'Mudah',
    shortLabel: 'Mudah',
    tagline: 'Modal lebih longgar & musuh lebih lunak untuk eksplorasi strategi.',
    startingGold: 320,
    startingCoreHp: 50,
    overclockUnlockCost: 90,
    enemyHpMult: 0.8,
    enemySpeedMult: 0.92,
    goldRewardMult: 1.15,
    towerCostMult: 0.9,
  },
  normal: {
    id: 'normal',
    label: 'Sedang',
    shortLabel: 'Sedang',
    tagline: 'Keseimbangan taktis standar dengan ekonomi ketat & boss menantang.',
    startingGold: 240,
    startingCoreHp: 35,
    overclockUnlockCost: 120,
    enemyHpMult: 1.0,
    enemySpeedMult: 1.0,
    goldRewardMult: 1.0,
    towerCostMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Sulit',
    shortLabel: 'Sulit',
    tagline: 'Gold terbatas, musuh lebih cepat & kuat — ujian pertahanan maksimal.',
    startingGold: 190,
    startingCoreHp: 20,
    overclockUnlockCost: 150,
    enemyHpMult: 1.28,
    enemySpeedMult: 1.1,
    goldRewardMult: 0.9,
    towerCostMult: 1.12,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard'];

export interface TowerUltimateSpec {
  id: string;
  name: string;
  hotkey: string;
  description: string;
  cooldownSec: number;
  durationSec: number;
}

export interface TowerPreset {
  id: TowerType;
  keyHint: string;
  displayName: string;
  shortName: string;
  role: string;
  description: string;
  baseDamage: number;
  baseRangeGdd: number;
  fireRateSec: number;
  baseCost: number;
  aoeRadiusGdd: number;
  slowRatio: number;
  slowDurationSec: number;
  ignoresArmor: boolean;
  chainCount: number; // Tesla arc jumps
  incomePerCycle: number; // Quantum Data Farm Gold packet per cycle
  incomeCycleSec: number;
  waveDividend: number; // Extra Gold granted by Farm on wave clear
  accentHex: string;
  accentColor: number;
  tierNames: [string, string, string, string];
  ultimate: TowerUltimateSpec;
}

export interface EnemyPreset {
  id: EnemyType;
  displayName: string;
  role: string;
  baseHp: number;
  speedGdd: number;
  armor: number;
  rewardGold: number;
  leakDamage: number;
  isBoss: boolean;
  isFinalBoss: boolean;
  isFlying: boolean;
  primaryColor: number;
  accentColor: number;
  scale: number;
}

export interface WaveEntry {
  enemyId: EnemyType;
  count: number;
  spawnInterval: number;
  startDelay?: number;
}

export interface WaveDefinition {
  wave: number;
  stage: 1 | 2 | 3 | 4;
  stageLabel: string;
  title: string;
  subtitle: string;
  isBossWave: boolean;
  isFinalStage: boolean;
  entries: WaveEntry[];
}

export const STARTING_GOLD = DIFFICULTY_PRESETS.normal.startingGold;
export const STARTING_CORE_HP = DIFFICULTY_PRESETS.normal.startingCoreHp;
export const TOTAL_WAVES = 15;
export const MAX_TOWER_LEVEL = 4; // Lv.4 APEX unlocks Active Ultimate!

// Overclock Pads must be purchased (unlocked) with Gold before placing towers on them!
export const OVERCLOCK_PAD_UNLOCK_COST = DIFFICULTY_PRESETS.normal.overclockUnlockCost;
export const OVERCLOCK_RANGE_MULT = 1.12;
export const OVERCLOCK_FIRERATE_MULT = 0.88; // 12% faster cooldown

// Compact tactical range calibrated so each tower guards ~1 curve rather than half the map
export const RANGE_GDD_TO_METERS = 0.032; // 150 -> 4.8m, 130 -> 4.16m, 168 -> 5.38m
export const AOE_GDD_TO_METERS = 0.075; // 38 -> 2.85m blast radius
export const SPEED_GDD_TO_MPS = 0.036; // Balanced movement across the ~78m multi-switchback track

export const TOWER_PRESETS: Record<TowerType, TowerPreset> = {
  laser: {
    id: 'laser',
    keyHint: '1',
    displayName: 'Laser Prism',
    shortName: 'Laser',
    role: 'Rapid Beam',
    description: 'Sinar laser frekuensi tinggi dengan jangkauan luas untuk membersihkan malware secara stabil.',
    baseDamage: 16,
    baseRangeGdd: 150,
    fireRateSec: 0.44,
    baseCost: 100,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    chainCount: 0,
    incomePerCycle: 0,
    incomeCycleSec: 0,
    waveDividend: 0,
    accentHex: '#22D3EE',
    accentColor: 0x22d3ee,
    tierNames: ['Mk.I Emitter', 'Dual Lens', 'Hyper Focus', 'Apex Prism'],
    ultimate: {
      id: 'prism_overdrive',
      name: 'Prism Overdrive',
      hotkey: 'Q',
      description: 'Meningkatkan kecepatan tembak 2.6× dan tembakan ganda selama 7 detik.',
      cooldownSec: 22,
      durationSec: 7,
    },
  },
  cannon: {
    id: 'cannon',
    keyHint: '2',
    displayName: 'Plasma Cannon',
    shortName: 'Cannon',
    role: 'AoE Splash',
    description: 'Artileri plasma berat yang meledak dalam radius luas untuk menghancurkan gerombolan musuh.',
    baseDamage: 38,
    baseRangeGdd: 125,
    fireRateSec: 1.32,
    baseCost: 140,
    aoeRadiusGdd: 38,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    chainCount: 0,
    incomePerCycle: 0,
    incomeCycleSec: 0,
    waveDividend: 0,
    accentHex: '#FB923C',
    accentColor: 0xfb923c,
    tierNames: ['Mk.I Mortar', 'Cluster Shell', 'Thermobaric', 'Orbital Howitzer'],
    ultimate: {
      id: 'emp_barrage',
      name: 'Orbital EMP Barrage',
      hotkey: 'E',
      description: 'Menjatuhkan 5 ledakan plasma EMP di jalur musuh (240 AoE DMG + stun singkat).',
      cooldownSec: 26,
      durationSec: 2,
    },
  },
  freeze: {
    id: 'freeze',
    keyHint: '3',
    displayName: 'Cryo Emitter',
    shortName: 'Cryo',
    role: 'Slow & Control',
    description: 'Kristal Blinn-Phong yang memperlambat musuh (-42% speed) & memicu pulsa es area di Lv.3+.',
    baseDamage: 8,
    baseRangeGdd: 132,
    fireRateSec: 0.92,
    baseCost: 120,
    aoeRadiusGdd: 26,
    slowRatio: 0.42,
    slowDurationSec: 2.8,
    ignoresArmor: false,
    chainCount: 0,
    incomePerCycle: 0,
    incomeCycleSec: 0,
    waveDividend: 0,
    accentHex: '#7DD3FC',
    accentColor: 0x7dd3fc,
    tierNames: ['Frost Core', 'Cryo Pulse', 'Permafrost', 'Zero-Kelvin Node'],
    ultimate: {
      id: 'absolute_zero',
      name: 'Absolute Zero',
      hotkey: 'R',
      description: 'Membekukan SELURUH musuh di arena (-80% speed selama 5 detik) + meluruhkan armor.',
      cooldownSec: 28,
      durationSec: 5,
    },
  },
  armor_pen: {
    id: 'armor_pen',
    keyHint: '4',
    displayName: 'Railgun Sniper',
    shortName: 'Railgun',
    role: '100% Pierce',
    description: 'Senapan elektromagnetik jarak jauh yang menembus 100% armor Trojan, Dreadnought, & Boss.',
    baseDamage: 32,
    baseRangeGdd: 168,
    fireRateSec: 1.05,
    baseCost: 175,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: true,
    chainCount: 0,
    incomePerCycle: 0,
    incomeCycleSec: 0,
    waveDividend: 0,
    accentHex: '#8B5CF6',
    accentColor: 0x8b5cf6,
    tierNames: ['Gauss Rifle', 'Twin Rail', 'Mag-Accelerator', 'Hyper Annihilator'],
    ultimate: {
      id: 'hyper_rail',
      name: 'Hyper-Rail Lance',
      hotkey: 'T',
      description: 'Menembakkan sinar railgun orbital ke musuh terkuat / Boss (520 True Damage).',
      cooldownSec: 24,
      durationSec: 1,
    },
  },
  tesla: {
    id: 'tesla',
    keyHint: '5',
    displayName: 'Tesla Arc Relay',
    shortName: 'Tesla',
    role: 'Chain Lightning',
    description: 'Menara tegangan tinggi yang menyambar hingga 3–6 musuh sekaligus secara berantai.',
    baseDamage: 18,
    baseRangeGdd: 130,
    fireRateSec: 0.78,
    baseCost: 150,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    chainCount: 3,
    incomePerCycle: 0,
    incomeCycleSec: 0,
    waveDividend: 0,
    accentHex: '#F472B6',
    accentColor: 0xf472b6,
    tierNames: ['Arc Coil', 'Surge Relay', 'Storm Spire', 'Ion Conduit'],
    ultimate: {
      id: 'ion_storm',
      name: 'Ion Overload Storm',
      hotkey: 'Y',
      description: 'Menyambar hingga 10 musuh aktif di arena dengan petir cyber bertegangan tinggi.',
      cooldownSec: 25,
      durationSec: 1.5,
    },
  },
  farm: {
    id: 'farm',
    keyHint: '6',
    displayName: 'Quantum Farm',
    shortName: 'Data Farm',
    role: 'Gold Farming',
    description: 'Menambang paket Gold bertahap selama wave berjalan + dividen akhir wave. Butuh investasi awal besar.',
    baseDamage: 0,
    baseRangeGdd: 68,
    fireRateSec: 5.8,
    baseCost: 240,
    aoeRadiusGdd: 0,
    slowRatio: 0,
    slowDurationSec: 0,
    ignoresArmor: false,
    chainCount: 0,
    incomePerCycle: 15,
    incomeCycleSec: 5.8,
    waveDividend: 22,
    accentHex: '#34D399',
    accentColor: 0x34d399,
    tierNames: ['Data Miner', 'Crypto Cluster', 'Quantum Vault', 'Central Bank Node'],
    ultimate: {
      id: 'quantum_surge',
      name: 'Quantum Jackpot',
      hotkey: 'F',
      description: 'Mencairkan cadangan data instan sebesar +140 Gold ke kas pertahanan.',
      cooldownSec: 42,
      durationSec: 1,
    },
  },
};

export const TOWER_ORDER: TowerType[] = ['laser', 'cannon', 'freeze', 'armor_pen', 'tesla', 'farm'];

// 100% Cyber-Defense themed enemies (zero fantasy monsters!)
export const ENEMY_PRESETS: Record<EnemyType, EnemyPreset> = {
  bit_crawler: {
    id: 'bit_crawler',
    displayName: 'Bit-Crawler',
    role: 'Malware Drone',
    baseHp: 68,
    speedGdd: 80,
    armor: 0,
    rewardGold: 11,
    leakDamage: 2,
    isBoss: false,
    isFinalBoss: false,
    isFlying: false,
    primaryColor: 0x2a2b31,
    accentColor: 0xff1e42,
    scale: 0.95,
  },
  worm_swarm: {
    id: 'worm_swarm',
    displayName: 'Zero-Day Worm',
    role: 'Micro-Swarm Cepat',
    baseHp: 45,
    speedGdd: 110,
    armor: 0,
    rewardGold: 7,
    leakDamage: 1,
    isBoss: false,
    isFinalBoss: false,
    isFlying: false,
    primaryColor: 0x23242a,
    accentColor: 0xff2d4a,
    scale: 0.78,
  },
  packet_wisp: {
    id: 'packet_wisp',
    displayName: 'Packet Phantom',
    role: 'Hover Interceptor',
    baseHp: 88,
    speedGdd: 124,
    armor: 2,
    rewardGold: 15,
    leakDamage: 2,
    isBoss: false,
    isFinalBoss: false,
    isFlying: true,
    primaryColor: 0x9333ea,
    accentColor: 0xe879f9,
    scale: 1.0,
  },
  trojan_brute: {
    id: 'trojan_brute',
    displayName: 'Trojan Juggernaut',
    role: 'Armored Breach Mech',
    baseHp: 240,
    speedGdd: 50,
    armor: 8,
    rewardGold: 25,
    leakDamage: 4,
    isBoss: false,
    isFinalBoss: false,
    isFlying: false,
    primaryColor: 0x3b3f47,
    accentColor: 0xff1e42,
    scale: 1.24,
  },
  aegis_dreadnought: {
    id: 'aegis_dreadnought',
    displayName: 'Firewall Breaker',
    role: 'Mid-Boss Dreadnought',
    baseHp: 1450,
    speedGdd: 37,
    armor: 14,
    rewardGold: 110,
    leakDamage: 12,
    isBoss: true,
    isFinalBoss: false,
    isFlying: false,
    primaryColor: 0x312e81,
    accentColor: 0xf59e0b,
    scale: 1.62,
  },
  omega_overlord: {
    id: 'omega_overlord',
    displayName: 'OMEGA-0 Rootkit',
    role: 'FINAL STAGE BOSS',
    baseHp: 4200,
    speedGdd: 31,
    armor: 18,
    rewardGold: 400,
    leakDamage: 35,
    isBoss: true,
    isFinalBoss: true,
    isFlying: false,
    primaryColor: 0x241c20,
    accentColor: 0xff1e42,
    scale: 2.05,
  },
};

export const WAVE_DEFINITIONS: Record<number, WaveDefinition> = {
  // STAGE 1: PERIMETER SCAN (Friendly onboarding + farming window)
  1: {
    wave: 1,
    stage: 1,
    stageLabel: 'Stage 1 · Perimeter Scan',
    title: 'Wave 1 — Paket Intrusi Awal',
    subtitle: '6 Bit-Crawler',
    isBossWave: false,
    isFinalStage: false,
    entries: [{ enemyId: 'bit_crawler', count: 6, spawnInterval: 1.25 }],
  },
  2: {
    wave: 2,
    stage: 1,
    stageLabel: 'Stage 1 · Perimeter Scan',
    title: 'Wave 2 — Gelombang Malware',
    subtitle: '8 Bit-Crawler · 4 Zero-Day Worm',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'bit_crawler', count: 8, spawnInterval: 1.05 },
      { enemyId: 'worm_swarm', count: 4, spawnInterval: 0.65 },
    ],
  },
  3: {
    wave: 3,
    stage: 1,
    stageLabel: 'Stage 1 · Perimeter Scan',
    title: 'Wave 3 — Serbuan Drone Cepat',
    subtitle: '6 Bit-Crawler · 5 Packet Phantom',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'bit_crawler', count: 6, spawnInterval: 0.95 },
      { enemyId: 'packet_wisp', count: 5, spawnInterval: 1.0 },
    ],
  },
  4: {
    wave: 4,
    stage: 1,
    stageLabel: 'Stage 1 · Perimeter Scan',
    title: 'Wave 4 — Kawanan Zero-Day',
    subtitle: '14 Zero-Day Worm · 4 Bit-Crawler',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'worm_swarm', count: 14, spawnInterval: 0.48 },
      { enemyId: 'bit_crawler', count: 4, spawnInterval: 0.9 },
    ],
  },
  5: {
    wave: 5,
    stage: 1,
    stageLabel: 'Stage 1 · Perimeter Scan',
    title: 'Wave 5 — Pelopor Trojan Lapis Baja',
    subtitle: '3 Trojan Juggernaut · 6 Bit-Crawler',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'bit_crawler', count: 6, spawnInterval: 0.85 },
      { enemyId: 'trojan_brute', count: 3, spawnInterval: 1.75 },
    ],
  },

  // STAGE 2: FIREWALL BREACH (Armored pushes + Wave 10 Mid-Boss)
  6: {
    wave: 6,
    stage: 2,
    stageLabel: 'Stage 2 · Firewall Breach',
    title: 'Wave 6 — Serangan Terkoordinasi',
    subtitle: '8 Packet Phantom · 4 Trojan Juggernaut',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'packet_wisp', count: 8, spawnInterval: 0.78 },
      { enemyId: 'trojan_brute', count: 4, spawnInterval: 1.55 },
    ],
  },
  7: {
    wave: 7,
    stage: 2,
    stageLabel: 'Stage 2 · Firewall Breach',
    title: 'Wave 7 — Banjir DDoS Swarm',
    subtitle: '20 Zero-Day Worm · 6 Packet Phantom',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'worm_swarm', count: 20, spawnInterval: 0.36 },
      { enemyId: 'packet_wisp', count: 6, spawnInterval: 0.82 },
    ],
  },
  8: {
    wave: 8,
    stage: 2,
    stageLabel: 'Stage 2 · Firewall Breach',
    title: 'Wave 8 — Konvoi Lapis Baja',
    subtitle: '6 Trojan Juggernaut · 10 Bit-Crawler',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'trojan_brute', count: 3, spawnInterval: 1.45 },
      { enemyId: 'bit_crawler', count: 10, spawnInterval: 0.65 },
      { enemyId: 'trojan_brute', count: 3, spawnInterval: 1.45 },
    ],
  },
  9: {
    wave: 9,
    stage: 2,
    stageLabel: 'Stage 2 · Firewall Breach',
    title: 'Wave 9 — Penetrasi Cepat',
    subtitle: '12 Packet Phantom · 5 Trojan · 12 Worm',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'worm_swarm', count: 12, spawnInterval: 0.35 },
      { enemyId: 'trojan_brute', count: 5, spawnInterval: 1.35 },
      { enemyId: 'packet_wisp', count: 12, spawnInterval: 0.65 },
    ],
  },
  10: {
    wave: 10,
    stage: 2,
    stageLabel: 'Stage 2 · Mid-Boss',
    title: 'Wave 10 — MID-BOSS: Firewall Breaker',
    subtitle: '1 Firewall Breaker + 5 Trojan + 8 Phantom',
    isBossWave: true,
    isFinalStage: false,
    entries: [
      { enemyId: 'trojan_brute', count: 2, spawnInterval: 1.2 },
      { enemyId: 'aegis_dreadnought', count: 1, spawnInterval: 2.0 },
      { enemyId: 'packet_wisp', count: 8, spawnInterval: 0.65 },
      { enemyId: 'trojan_brute', count: 3, spawnInterval: 1.25 },
    ],
  },

  // STAGE 3: KERNEL OVERLOAD (High economy & Max-Level Ultimate showcase)
  11: {
    wave: 11,
    stage: 3,
    stageLabel: 'Stage 3 · Kernel Overload',
    title: 'Wave 11 — Gelombang Siber Massal',
    subtitle: '24 Zero-Day Worm · 6 Trojan Juggernaut',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'worm_swarm', count: 24, spawnInterval: 0.28 },
      { enemyId: 'trojan_brute', count: 6, spawnInterval: 1.15 },
    ],
  },
  12: {
    wave: 12,
    stage: 3,
    stageLabel: 'Stage 3 · Kernel Overload',
    title: 'Wave 12 — Skuadron Phantom & Crawler',
    subtitle: '14 Packet Phantom · 14 Bit-Crawler · 5 Trojan',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'packet_wisp', count: 14, spawnInterval: 0.52 },
      { enemyId: 'trojan_brute', count: 5, spawnInterval: 1.15 },
      { enemyId: 'bit_crawler', count: 14, spawnInterval: 0.45 },
    ],
  },
  13: {
    wave: 13,
    stage: 3,
    stageLabel: 'Stage 3 · Kernel Overload',
    title: 'Wave 13 — Dobel Dreadnought',
    subtitle: '2 Firewall Breaker · 12 Zero-Day Worm',
    isBossWave: true,
    isFinalStage: false,
    entries: [
      { enemyId: 'worm_swarm', count: 12, spawnInterval: 0.32 },
      { enemyId: 'aegis_dreadnought', count: 1, spawnInterval: 2.5 },
      { enemyId: 'trojan_brute', count: 4, spawnInterval: 1.1 },
      { enemyId: 'aegis_dreadnought', count: 1, spawnInterval: 2.0 },
    ],
  },
  14: {
    wave: 14,
    stage: 3,
    stageLabel: 'Stage 3 · Kernel Overload',
    title: 'Wave 14 — Pengawal Rootkit',
    subtitle: '10 Trojan · 16 Packet Phantom · 20 Worm',
    isBossWave: false,
    isFinalStage: false,
    entries: [
      { enemyId: 'trojan_brute', count: 5, spawnInterval: 0.95 },
      { enemyId: 'worm_swarm', count: 20, spawnInterval: 0.24 },
      { enemyId: 'packet_wisp', count: 16, spawnInterval: 0.48 },
      { enemyId: 'trojan_brute', count: 5, spawnInterval: 0.95 },
    ],
  },

  // FINAL STAGE (WAVE 15): OMEGA-0 ROOTKIT + FULL CYBER ESCORT
  15: {
    wave: 15,
    stage: 4,
    stageLabel: 'FINAL STAGE · OMEGA INVASION',
    title: 'FINAL STAGE — OMEGA-0 ROOTKIT OVERLORD',
    subtitle: '1 FINAL BOSS OMEGA-0 + Pasukan Pengawal Siber Penuh',
    isBossWave: true,
    isFinalStage: true,
    entries: [
      { enemyId: 'trojan_brute', count: 4, spawnInterval: 0.95 },
      { enemyId: 'worm_swarm', count: 14, spawnInterval: 0.25 },
      { enemyId: 'omega_overlord', count: 1, spawnInterval: 2.6 },
      { enemyId: 'packet_wisp', count: 12, spawnInterval: 0.5 },
      { enemyId: 'aegis_dreadnought', count: 1, spawnInterval: 2.2 },
      { enemyId: 'trojan_brute', count: 4, spawnInterval: 1.0 },
      { enemyId: 'worm_swarm', count: 14, spawnInterval: 0.28 },
    ],
  },
};

export function getWaveDefinition(waveNumber: number): WaveDefinition | undefined {
  return WAVE_DEFINITIONS[waveNumber];
}

export function getWaveComposition(waveNumber: number): WaveEntry[] {
  return WAVE_DEFINITIONS[waveNumber]?.entries ?? [];
}
