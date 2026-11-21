// Pure mathematical functions for 3D Euclidean distance, tower tier scaling (Lv.1-4),
// armor reduction, gentle 15-wave HP curve, Quantum Data Farm scaling, and turret yaw.
// Preserves Yusuf's CombatMath core while expanding to 4 upgrade tiers & farming economy.

import {
  DIFFICULTY_PRESETS,
  DifficultyId,
  MAX_TOWER_LEVEL,
  OVERCLOCK_FIRERATE_MULT,
  OVERCLOCK_RANGE_MULT,
  RANGE_GDD_TO_METERS,
  SPEED_GDD_TO_MPS,
} from './constants';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Euclidean Distance: d = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)
 */
export function distance3D(a: Vec3Like, b: Vec3Like): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Horizontal XZ Euclidean distance for tactical ground range & placement checks.
 */
export function distanceXZ(a: Vec3Like, b: Vec3Like): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * True if enemyPos lies within rangeMeters (inclusive boundary).
 */
export function isInRange3D(towerPos: Vec3Like, enemyPos: Vec3Like, rangeMeters: number): boolean {
  return distance3D(towerPos, enemyPos) <= Math.max(0, rangeMeters);
}

/**
 * Tower purchase cost adjusted by selected difficulty (rounded to clean multiples of 5G).
 */
export function getDifficultyTowerCost(baseCost: number, difficulty: DifficultyId = 'normal'): number {
  const mult = DIFFICULTY_PRESETS[difficulty].towerCostMult;
  return Math.max(5, Math.round((Math.max(0, baseCost) * mult) / 5) * 5);
}

/**
 * Enemy kill reward Gold adjusted by selected difficulty.
 */
export function getDifficultyRewardGold(baseReward: number, difficulty: DifficultyId = 'normal'): number {
  const mult = DIFFICULTY_PRESETS[difficulty].goldRewardMult;
  return Math.max(1, Math.round(Math.max(1, baseReward) * mult));
}

/**
 * Tower damage scaling per level (Lv.1..4):
 * Lv.1 = 1.0x, Lv.2 = 1.35x, Lv.3 = 1.80x, Lv.4 APEX = 2.45x
 */
export function getScaledDamage(baseDamage: number, level: number): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 1.35, 1.8, 2.45];
  return Number((baseDamage * mults[clamped - 1]).toFixed(1));
}

/**
 * Tower fire rate scaling per level (faster at higher tiers) + optional Overclock Pad bonus.
 */
export function getScaledFireRate(baseFireRateSec: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 0.92, 0.84, 0.74];
  const rate = baseFireRateSec * mults[clamped - 1] * (overclocked ? OVERCLOCK_FIRERATE_MULT : 1.0);
  return Math.max(0.12, Number(rate.toFixed(2)));
}

/**
 * Tower range in GDD units per level: +8% per level + optional +12% Overclock Pad synergy.
 */
export function getScaledRangeGdd(baseRangeGdd: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  return Math.max(0, baseRangeGdd) * (1 + 0.08 * (clamped - 1)) * (overclocked ? OVERCLOCK_RANGE_MULT : 1.0);
}

/**
 * Tower range in 3D World meters calibrated to Nur's expanded 40m x 24m Cyber Arena.
 */
export function getScaledRangeMeters(baseRangeGdd: number, level: number, overclocked = false): number {
  return getScaledRangeGdd(baseRangeGdd, level, overclocked) * RANGE_GDD_TO_METERS;
}

/**
 * Quantum Data Farm Gold packet scaling per level (rebalanced so farming requires real trade-offs).
 */
export function getScaledFarmPacket(baseIncome: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 1.45, 2.1, 3.0];
  return Math.round(baseIncome * mults[clamped - 1] * (overclocked ? 1.12 : 1.0));
}

/**
 * Quantum Data Farm end-of-wave dividend scaling per level.
 */
export function getScaledFarmDividend(baseDividend: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 1.4, 2.0, 2.8];
  return Math.round(baseDividend * mults[clamped - 1] * (overclocked ? 1.12 : 1.0));
}

/**
 * Tesla Arc Relay chain target count scaling (Lv.1=3, Lv.2=4, Lv.3=5, Lv.4=6).
 */
export function getScaledChainCount(baseChains: number, level: number): number {
  if (baseChains <= 0) return 0;
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  return baseChains + (clamped - 1);
}

/**
 * Enemy movement speed in 3D World meters/sec (scaled by difficulty).
 */
export function getEnemySpeedMps(speedGdd: number, difficulty: DifficultyId = 'normal'): number {
  const mult = DIFFICULTY_PRESETS[difficulty].enemySpeedMult;
  return Math.max(0.35, speedGdd * SPEED_GDD_TO_MPS * mult);
}

/**
 * Flat armor reduction: max(1, rawDamage - effectiveArmor).
 * Armor Pen Tower (and Hyper-Rail / Absolute Zero shatter) bypasses armor.
 */
export function calculateFinalDamage(
  rawDamage: number,
  targetArmor: number,
  ignoreArmor: boolean
): number {
  const effectiveArmor = ignoreArmor ? 0 : Math.max(0, targetArmor);
  return Math.max(1, rawDamage - effectiveArmor);
}

/**
 * Smooth 15-wave HP curve scaled by selected difficulty (Mudah / Sedang / Sulit).
 */
export function calculateEnemyWaveHp(
  baseHp: number,
  waveNumber: number,
  isBoss = false,
  difficulty: DifficultyId = 'normal'
): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  const diffMult = DIFFICULTY_PRESETS[difficulty].enemyHpMult;
  if (isBoss) {
    // Boss baseHp is already tuned for its stage (Wave 10 / 13 / 15)
    const bossScale = safeWave >= 15 ? 1.0 : safeWave >= 13 ? 1.18 : 1.0;
    return Math.ceil(Math.max(1, baseHp) * bossScale * diffMult);
  }
  // Gentle 1.105^(N-1) growth across 15 waves (Wave 1=1.0x, Wave 5=1.49x, Wave 10=2.45x, Wave 15=4.04x)
  const multiplier = Math.pow(1.105, safeWave - 1);
  return Math.ceil(Math.max(1, baseHp) * multiplier * diffMult);
}

/**
 * Upgrade cost for Lv.1->2, Lv.2->3, Lv.3->4 (returns 0 at MAX level 4), scaled by difficulty.
 */
export function calculateUpgradeCost(
  baseCost: number,
  currentLevel: number,
  difficulty: DifficultyId = 'normal'
): number {
  if (currentLevel >= MAX_TOWER_LEVEL) return 0;
  const safeLevel = Math.max(1, Math.floor(currentLevel));
  const mults = [1.05, 1.7, 2.7]; // Meaningful progression to Apex Ultimate
  const diffMult = DIFFICULTY_PRESETS[difficulty].towerCostMult;
  return Math.round((Math.max(0, baseCost) * mults[safeLevel - 1] * diffMult) / 5) * 5;
}

/**
 * Sell refund: floor(totalInvested * 0.70) (BTD6 standard).
 */
export function calculateSellRefund(totalInvested: number): number {
  return Math.floor(Math.max(0, totalInvested) * 0.7);
}

/**
 * Wave completion bonus Gold: (42 + wave * 12) * difficulty reward multiplier.
 */
export function getWaveClearBonus(waveNumber: number, difficulty: DifficultyId = 'normal'): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  const mult = DIFFICULTY_PRESETS[difficulty].goldRewardMult;
  return Math.round((42 + safeWave * 12) * mult);
}

/**
 * Compute turret yaw angle (radians) around +Y axis so local +Z faces target on XZ plane.
 */
export function computeTurretYaw(turretPos: Vec3Like, targetPos: Vec3Like): number {
  const dx = targetPos.x - turretPos.x;
  const dz = targetPos.z - turretPos.z;
  if (dx * dx + dz * dz < 1e-6) return 0;
  return Math.atan2(dx, dz);
}
