import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distance3D,
  isInRange3D,
  getScaledDamage,
  getScaledFireRate,
  getScaledRangeGdd,
  getScaledRangeMeters,
  getScaledFarmPacket,
  getScaledFarmDividend,
  getScaledChainCount,
  calculateFinalDamage,
  calculateEnemyWaveHp,
  calculateUpgradeCost,
  calculateSellRefund,
  getWaveClearBonus,
} from './combatMath';
import {
  NUR_BAKED_PATH,
  NUR_TOWER_SLOTS,
  NUR_NEON_HALF_WIDTH,
  NUR_SLOT_PAD_SIZE,
  NUR_SLOT_CLEARANCE,
  validateTowerPlacement,
} from './nurMapData';
import { selectTarget } from './targetSelector';
import {
  ENEMY_PRESETS,
  getWaveComposition,
  getWaveDefinition,
  MAX_TOWER_LEVEL,
  OVERCLOCK_PAD_UNLOCK_COST,
  STARTING_GOLD,
  TOTAL_WAVES,
  TOWER_ORDER,
  TOWER_PRESETS,
} from './constants';

test('3D Euclidean distance and range check', () => {
  assert.equal(distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
  assert.equal(isInRange3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, 5), true);
  assert.equal(isInRange3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, 4.99), false);
});

test('Tighter 4-Tier tower scaling + compact tactical range + Overclock Pad synergy (+12% RNG, -12% CD)', () => {
  assert.equal(MAX_TOWER_LEVEL, 4);
  assert.equal(getScaledDamage(16, 1), 16);
  assert.equal(getScaledDamage(16, 4), 39.2);
  assert.equal(getScaledDamage(16, 9), 39.2); // clamped at Lv.4

  const baseRange = getScaledRangeGdd(150, 1, false);
  const overclockRange = getScaledRangeGdd(150, 1, true);
  assert.ok(Math.abs(overclockRange - baseRange * 1.12) < 1e-6);

  // Compact tactical range check: Lv.1 Laser should cover ~4.8m, not half the map!
  const laserMeters = getScaledRangeMeters(150, 1, false);
  assert.ok(laserMeters >= 4.2 && laserMeters <= 5.2, `Expected compact laser range ~4.8m, got ${laserMeters}`);

  const normalRate = getScaledFireRate(1.0, 1, false);
  const ocRate = getScaledFireRate(1.0, 1, true);
  assert.ok(ocRate < normalRate);
});

test('Rebalanced Quantum Data Farm & Tesla Arc Relay scaling formulas', () => {
  assert.equal(TOWER_PRESETS.farm.baseCost, 240);
  assert.equal(getScaledFarmPacket(15, 1, false), 15);
  assert.equal(getScaledFarmPacket(15, 4, false), 45);
  assert.ok(getScaledFarmPacket(15, 4, true) > getScaledFarmPacket(15, 4, false));
  assert.equal(getScaledFarmDividend(22, 1, false), 22);
  assert.ok(getScaledFarmDividend(22, 4, false) <= 70, 'Farm Lv.4 dividend must stay balanced');

  assert.equal(getScaledChainCount(3, 1), 3);
  assert.equal(getScaledChainCount(3, 4), 6);
});

test('Armor reduction & Railgun 100% Armor Pierce against Cyber Bosses', () => {
  assert.equal(calculateFinalDamage(16, 8, false), 8);
  assert.equal(calculateFinalDamage(8, 18, false), 1); // minimum 1 damage
  assert.equal(calculateFinalDamage(32, 18, true), 32); // 100% pierce
});

test('Balanced tighter economy: starting gold, 15-Wave HP curve, Upgrade costs, and 70% Sell refund', () => {
  assert.equal(STARTING_GOLD, 240);
  assert.equal(OVERCLOCK_PAD_UNLOCK_COST, 120);
  assert.equal(calculateEnemyWaveHp(68, 1), 68);
  assert.ok(calculateEnemyWaveHp(68, 5) > 95 && calculateEnemyWaveHp(68, 5) < 120);
  assert.equal(calculateEnemyWaveHp(4200, 15, true), 4200);

  assert.equal(calculateUpgradeCost(100, 1), 105);
  assert.equal(calculateUpgradeCost(100, 3), 270);
  assert.equal(calculateUpgradeCost(100, 4), 0);

  assert.equal(calculateSellRefund(200), 140);
  assert.equal(calculateSellRefund(-10), 0);
  assert.equal(getWaveClearBonus(1), 54);
});

test('15-Wave 3-Stage + Final Stage Boss Campaign and 6 Cyber Towers with Ultimates', () => {
  assert.equal(TOTAL_WAVES, 15);
  assert.equal(TOWER_ORDER.length, 6);
  for (const id of TOWER_ORDER) {
    assert.ok(TOWER_PRESETS[id].ultimate.name.length > 0);
    assert.equal(TOWER_PRESETS[id].tierNames.length, 4);
  }
  const wave10 = getWaveDefinition(10);
  assert.equal(wave10?.isBossWave, true);
  assert.ok(getWaveComposition(10).some((e) => e.enemyId === 'aegis_dreadnought'));

  const finalStage = getWaveDefinition(15);
  assert.equal(finalStage?.isFinalStage, true);
  assert.equal(finalStage?.isBossWave, true);
  const w15 = getWaveComposition(15);
  assert.ok(w15.some((e) => e.enemyId === 'omega_overlord' && e.count === 1));
  assert.ok(w15.length >= 5, 'Final stage boss must be escorted by multiple cyber squads');
  assert.equal(ENEMY_PRESETS.omega_overlord.isFinalBoss, true);
});

test('Expanded Nur Map: Longer 3-loop Bezier path (~70-95m) connects BaseMusuh to BaseUtama cleanly', () => {
  assert.ok(
    NUR_BAKED_PATH.totalLength > 68 && NUR_BAKED_PATH.totalLength < 96,
    `Expected longer path 68-96m, got ${NUR_BAKED_PATH.totalLength.toFixed(1)}m`
  );
  const start = NUR_BAKED_PATH.sampleAtDistance(0);
  const end = NUR_BAKED_PATH.sampleAtDistance(NUR_BAKED_PATH.totalLength);
  assert.ok(Math.abs(start.pos.x - -15.8) < 0.05);
  assert.ok(Math.abs(end.pos.x - 15.5) < 0.05);
});

test('Purchasable Overclock Pads block placement while locked, and allow snapping once bought', () => {
  assert.equal(NUR_TOWER_SLOTS.length, 9);
  const expectedDist = NUR_NEON_HALF_WIDTH + NUR_SLOT_PAD_SIZE * 0.5 + NUR_SLOT_CLEARANCE;
  for (const slot of NUR_TOWER_SLOTS) {
    const d = distance3D(slot.position, slot.lookTarget);
    assert.ok(
      Math.abs(d - expectedDist) < 0.03,
      `${slot.name} distance ${d} expected ${expectedDist}`
    );
  }

  // Free placement right on the road centerline must be rejected
  const roadSample = NUR_BAKED_PATH.sampleAtDistance(NUR_BAKED_PATH.totalLength * 0.5).pos;
  const onRoad = validateTowerPlacement(roadSample, [], new Set());
  assert.equal(onRoad.valid, false);
  assert.equal(onRoad.reason, 'on_road');

  // Free placement on open deck away from road must be valid even with 0 unlocked pads
  const openSpot = { x: -14.0, y: 0, z: -8.0 };
  const freeOk = validateTowerPlacement(openSpot, [], new Set());
  assert.equal(freeOk.valid, true);
  assert.equal(freeOk.overclockPadId, null);

  // Placing another tower on top of an existing tower must be rejected
  const overlap = validateTowerPlacement({ x: -13.6, y: 0, z: -8.0 }, [openSpot], new Set());
  assert.equal(overlap.valid, false);
  assert.equal(overlap.reason, 'tower_overlap');

  // Placing on Overclock Pad 0 BEFORE purchasing must be REJECTED as locked_overclock_pad!
  const nearPad = { x: NUR_TOWER_SLOTS[0].position.x + 0.2, y: 0, z: NUR_TOWER_SLOTS[0].position.z - 0.1 };
  const lockedRes = validateTowerPlacement(nearPad, [], new Set());
  assert.equal(lockedRes.valid, false);
  assert.equal(lockedRes.reason, 'locked_overclock_pad');
  assert.equal(lockedRes.overclockPadId, 0);

  // Once Pad 0 is purchased/unlocked, placement snaps cleanly and activates overclockPadId = 0!
  const unlockedRes = validateTowerPlacement(nearPad, [], new Set([0]));
  assert.equal(unlockedRes.valid, true);
  assert.equal(unlockedRes.overclockPadId, 0);
});

test('TargetSelector: BTD6 modes FIRST, STRONG, LAST, and CLOSE select exact candidates', () => {
  const towerPos = { x: 0, y: 0, z: 0 };
  const candidates = [
    { id: 1, alive: true, position: { x: 1.5, y: 0, z: 0 }, currentHp: 100, pathProgress: 0.15 },
    { id: 2, alive: true, position: { x: 4.0, y: 0, z: 0 }, currentHp: 450, pathProgress: 0.5 },
    { id: 3, alive: true, position: { x: 5.2, y: 0, z: 0 }, currentHp: 80, pathProgress: 0.85 },
    { id: 4, alive: true, position: { x: 25, y: 0, z: 0 }, currentHp: 9999, pathProgress: 0.99 },
  ];

  assert.equal(selectTarget(towerPos, 6, candidates, 'FIRST')?.id, 3);
  assert.equal(selectTarget(towerPos, 6, candidates, 'STRONG')?.id, 2);
  assert.equal(selectTarget(towerPos, 6, candidates, 'LAST')?.id, 1);
  assert.equal(selectTarget(towerPos, 6, candidates, 'CLOSE')?.id, 1);
});

test('3 Difficulty modes (Mudah, Sedang, Sulit) scale HP, speed, costs, rewards, and Overclock cleanly', async () => {
  const { DIFFICULTY_PRESETS, DIFFICULTY_ORDER } = await import('./constants');
  const { getDifficultyTowerCost, getDifficultyRewardGold, getEnemySpeedMps } = await import('./combatMath');

  assert.deepEqual(DIFFICULTY_ORDER, ['easy', 'normal', 'hard']);
  const easy = DIFFICULTY_PRESETS.easy;
  const normal = DIFFICULTY_PRESETS.normal;
  const hard = DIFFICULTY_PRESETS.hard;

  // Starting resources descend Easy -> Normal -> Hard
  assert.ok(easy.startingGold > normal.startingGold && normal.startingGold > hard.startingGold);
  assert.ok(easy.startingCoreHp > normal.startingCoreHp && normal.startingCoreHp > hard.startingCoreHp);
  assert.ok(easy.overclockUnlockCost < normal.overclockUnlockCost && normal.overclockUnlockCost < hard.overclockUnlockCost);

  // Enemy HP & Speed ascend Easy -> Normal -> Hard
  assert.ok(
    calculateEnemyWaveHp(100, 5, false, 'easy') < calculateEnemyWaveHp(100, 5, false, 'normal') &&
      calculateEnemyWaveHp(100, 5, false, 'normal') < calculateEnemyWaveHp(100, 5, false, 'hard')
  );
  assert.ok(
    getEnemySpeedMps(80, 'easy') < getEnemySpeedMps(80, 'normal') &&
      getEnemySpeedMps(80, 'normal') < getEnemySpeedMps(80, 'hard')
  );

  // Tower purchase & upgrade costs ascend Easy -> Normal -> Hard; rewards descend
  assert.ok(
    getDifficultyTowerCost(100, 'easy') < getDifficultyTowerCost(100, 'normal') &&
      getDifficultyTowerCost(100, 'normal') < getDifficultyTowerCost(100, 'hard')
  );
  assert.ok(
    calculateUpgradeCost(100, 2, 'easy') < calculateUpgradeCost(100, 2, 'normal') &&
      calculateUpgradeCost(100, 2, 'normal') < calculateUpgradeCost(100, 2, 'hard')
  );
  assert.ok(
    getDifficultyRewardGold(20, 'easy') > getDifficultyRewardGold(20, 'normal') &&
      getDifficultyRewardGold(20, 'normal') > getDifficultyRewardGold(20, 'hard')
  );
});
