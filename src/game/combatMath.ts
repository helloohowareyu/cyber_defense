// Pure mathematical functions for 3D Euclidean distance, tower tier scaling (Lv.1-4),
// armor reduction, gentle 15-wave HP curve, Quantum Data Farm scaling, and turret yaw.
// Preserves Yusuf's CombatMath core while expanding to 4 upgrade tiers & farming economy.

import {
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
 * Tower range in GDD units per level: +10% per level + optional +15% Overclock Pad synergy.
 */
export function getScaledRangeGdd(baseRangeGdd: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  return Math.max(0, baseRangeGdd) * (1 + 0.1 * (clamped - 1)) * (overclocked ? OVERCLOCK_RANGE_MULT : 1.0);
}

/**
 * Tower range in 3D World meters calibrated to Nur's expanded 40m x 24m Cyber Arena.
 */
export function getScaledRangeMeters(baseRangeGdd: number, level: number, overclocked = false): number {
  return getScaledRangeGdd(baseRangeGdd, level, overclocked) * RANGE_GDD_TO_METERS;
}

/**
 * Quantum Data Farm Gold packet scaling per level (BTD6 Banana Farm progression).
 */
export function getScaledFarmPacket(baseIncome: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 1.65, 2.75, 4.4];
  return Math.round(baseIncome * mults[clamped - 1] * (overclocked ? 1.15 : 1.0));
}

/**
 * Quantum Data Farm end-of-wave dividend scaling per level.
 */
export function getScaledFarmDividend(baseDividend: number, level: number, overclocked = false): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  const mults = [1.0, 1.6, 2.5, 4.0];
  return Math.round(baseDividend * mults[clamped - 1] * (overclocked ? 1.15 : 1.0));
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
 * Enemy movement speed in 3D World meters/sec.
 */
export function getEnemySpeedMps(speedGdd: number): number {
  return Math.max(0.35, speedGdd * SPEED_GDD_TO_MPS);
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
 * Smooth 15-wave HP curve so early waves feel fun & accessible while late waves reward farming & Lv.4 Ultimates.
 * Bosses use a calibrated gentler multiplier so Wave 10 & Wave 15 feel challenging yet fair.
 */
export function calculateEnemyWaveHp(baseHp: number, waveNumber: number, isBoss = false): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  if (isBoss) {
    // Boss baseHp is already tuned for its stage (Wave 10 / 13 / 15)
    const bossScale = safeWave >= 15 ? 1.0 : safeWave >= 13 ? 1.18 : 1.0;
    return Math.ceil(Math.max(1, baseHp) * bossScale);
  }
  // Gentle 1.105^(N-1) growth across 15 waves (Wave 1=1.0x, Wave 5=1.49x, Wave 10=2.45x, Wave 15=4.04x)
  const multiplier = Math.pow(1.105, safeWave - 1);
  return Math.ceil(Math.max(1, baseHp) * multiplier);
}

/**
 * Upgrade cost for Lv.1->2, Lv.2->3, Lv.3->4 (returns 0 at MAX level 4).
 */
export function calculateUpgradeCost(baseCost: number, currentLevel: number): number {
  if (currentLevel >= MAX_TOWER_LEVEL) return 0;
  const safeLevel = Math.max(1, Math.floor(currentLevel));
  const mults = [0.95, 1.55, 2.45]; // Affordable early Mk.II, meaningful Apex Ultimate investment
  return Math.round(Math.max(0, baseCost) * mults[safeLevel - 1]);
}

/**
 * Sell refund: floor(totalInvested * 0.75) (generous BTD6-style tactical pivoting).
 */
export function calculateSellRefund(totalInvested: number): number {
  return Math.floor(Math.max(0, totalInvested) * 0.75);
}

/**
 * Wave completion bonus Gold: 75 + wave * 18.
 */
export function getWaveClearBonus(waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  return 75 + safeWave * 18;
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
