// Port of Yusuf's res://src/combat/math/combat_math.gd
// Pure mathematical functions for 3D Euclidean distance, tower scaling, armor reduction,
// wave HP scaling, upgrade/sell economy, and wave clear bonus (GDD 4.2, 4.5, 5, 6, 7, 8).

import { MAX_TOWER_LEVEL, RANGE_GDD_TO_METERS, SPEED_GDD_TO_MPS } from './constants';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Euclidean Distance: d = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)
 * Referensi: GDD Bagian 4.2 & 10.6; Sumanta Guha Bab 2 (World Coordinates).
 */
export function distance3D(a: Vec3Like, b: Vec3Like): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Horizontal XZ Euclidean distance for tactical ground range checks.
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
 * Tower damage scaling per level: base * (1 + 0.25 * (L - 1)), L clamped to 1..3.
 * GDD Bagian 5.
 */
export function getScaledDamage(baseDamage: number, level: number): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  return baseDamage * (1 + 0.25 * (clamped - 1));
}

/**
 * Tower range in GDD pixels per level: baseGdd * (1 + 0.10 * (L - 1)).
 */
export function getScaledRangeGdd(baseRangeGdd: number, level: number): number {
  const clamped = Math.max(1, Math.min(MAX_TOWER_LEVEL, Math.floor(level)));
  return Math.max(0, baseRangeGdd) * (1 + 0.1 * (clamped - 1));
}

/**
 * Tower range in 3D World meters calibrated to Nur's 32m x 18m map.
 */
export function getScaledRangeMeters(baseRangeGdd: number, level: number): number {
  return getScaledRangeGdd(baseRangeGdd, level) * RANGE_GDD_TO_METERS;
}

/**
 * Enemy movement speed in 3D World meters/sec.
 */
export function getEnemySpeedMps(speedGdd: number): number {
  return Math.max(0.2, speedGdd * SPEED_GDD_TO_MPS);
}

/**
 * Flat armor reduction: max(1, rawDamage - effectiveArmor).
 * Armor Pen Tower ignores 100% of target armor.
 * GDD Bagian 4.4, 5, 6.
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
 * Wave HP scaling: ceil(baseHp * 1.25^(N - 1)), N >= 1.
 * GDD Bagian 6.
 */
export function calculateEnemyWaveHp(baseHp: number, waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  const multiplier = Math.pow(1.25, safeWave - 1);
  return Math.ceil(Math.max(1, baseHp) * multiplier);
}

/**
 * Upgrade cost: ceil(baseCost * 1.5^level), returns 0 if already at max level (3).
 * GDD Bagian 4.5.
 */
export function calculateUpgradeCost(baseCost: number, currentLevel: number): number {
  if (currentLevel >= MAX_TOWER_LEVEL) return 0;
  const safeLevel = Math.max(1, Math.floor(currentLevel));
  return Math.ceil(Math.max(0, baseCost) * Math.pow(1.5, safeLevel));
}

/**
 * Sell refund: floor(totalInvested * 0.7), never negative.
 * GDD Bagian 4.5 & 8.
 */
export function calculateSellRefund(totalInvested: number): number {
  return Math.floor(Math.max(0, totalInvested) * 0.7);
}

/**
 * Wave completion bonus Gold: 50 + floor(0.8 * N * 10).
 * GDD Bagian 7.
 */
export function getWaveClearBonus(waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber));
  return 50 + Math.floor(0.8 * safeWave * 10);
}

/**
 * Compute turret yaw angle (radians) around +Y axis so local -Z faces target on XZ plane.
 * Equivalent to Yusuf's compute_turret_look_basis() in combat_math.gd.
 */
export function computeTurretYaw(turretPos: Vec3Like, targetPos: Vec3Like): number {
  const dx = targetPos.x - turretPos.x;
  const dz = targetPos.z - turretPos.z;
  if (dx * dx + dz * dz < 1e-6) return 0;
  return Math.atan2(dx, dz);
}
