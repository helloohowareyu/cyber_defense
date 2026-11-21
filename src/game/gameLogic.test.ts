import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distance3D,
  isInRange3D,
  getScaledDamage,
  getScaledRangeGdd,
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
} from './nurMapData';
import { selectTarget } from './targetSelector';
import { getWaveComposition, TOWER_PRESETS, ENEMY_PRESETS } from './constants';

test('GDD 4.2 & 10.6: 3D Euclidean distance and range check', () => {
  assert.equal(distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
  assert.equal(isInRange3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, 5), true);
  assert.equal(isInRange3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, 4.99), false);
});

test('GDD 5: Tower damage (+25%/lv) and range (+10%/lv) scaling up to Level 3', () => {
  assert.equal(getScaledDamage(15, 1), 15);
  assert.equal(getScaledDamage(15, 2), 18.75);
  assert.equal(getScaledDamage(15, 3), 22.5);
  assert.equal(getScaledDamage(15, 5), 22.5); // clamped at Lv 3

  assert.equal(getScaledRangeGdd(150, 1), 150);
  assert.ok(Math.abs(getScaledRangeGdd(150, 2) - 165) < 1e-6);
  assert.ok(Math.abs(getScaledRangeGdd(150, 3) - 180) < 1e-6);
});

test('GDD 4.4, 5, 6: Armor reduction & Armor Pen 100% ignore', () => {
  // Laser (15 dmg) vs Orc (10 armor) => 5 dmg
  assert.equal(calculateFinalDamage(15, 10, false), 5);
  // Freeze (5 dmg) vs Demon King (20 armor) => min 1 dmg
  assert.equal(calculateFinalDamage(5, 20, false), 1);
  // Armor Pen (25 dmg) vs Demon King (20 armor) => 25 dmg
  assert.equal(calculateFinalDamage(25, 20, true), 25);
});

test('GDD 6: Wave HP scaling ceil(BaseHP * 1.25^(N-1))', () => {
  assert.equal(calculateEnemyWaveHp(100, 1), 100);
  assert.equal(calculateEnemyWaveHp(100, 2), 125);
  assert.equal(calculateEnemyWaveHp(100, 3), 157); // ceil(156.25)
  assert.equal(calculateEnemyWaveHp(1500, 5), Math.ceil(1500 * Math.pow(1.25, 4)));
});

test('GDD 4.5 & 8: Upgrade cost ceil(Base * 1.5^Level) and 70% sell refund', () => {
  // Laser base 100
  assert.equal(calculateUpgradeCost(100, 1), 150);
  assert.equal(calculateUpgradeCost(100, 2), 225);
  assert.equal(calculateUpgradeCost(100, 3), 0);

  // Armor Pen base 175 -> Lv1->2: ceil(175*1.5) = 263
  assert.equal(calculateUpgradeCost(175, 1), 263);

  // Total invested 100 + 150 = 250 => floor(250 * 0.7) = 175
  assert.equal(calculateSellRefund(250), 175);
  assert.equal(calculateSellRefund(-50), 0);
});

test('GDD 7: Wave clear bonus 50 + floor(0.8 * N * 10) and Wave 1-5 compositions', () => {
  assert.equal(getWaveClearBonus(1), 58);
  assert.equal(getWaveClearBonus(2), 66);
  assert.equal(getWaveClearBonus(3), 74);
  assert.equal(getWaveClearBonus(4), 82);
  assert.equal(getWaveClearBonus(5), 90);

  const w1 = getWaveComposition(1);
  assert.equal(w1.reduce((acc, e) => acc + e.count, 0), 5);
  const w5 = getWaveComposition(5);
  assert.equal(w5.reduce((acc, e) => acc + e.count, 0), 9); // 1 Boss + 4 Orc + 4 Harpy
  assert.ok(w5.some((e) => e.enemyId === 'demon_king' && e.count === 1));
  assert.equal(TOWER_PRESETS.laser.baseCost, 100);
  assert.equal(ENEMY_PRESETS.demon_king.rewardGold, 150);
});

test('Nur Map: Baked Cubic Bezier path connects BaseMusuh to BaseUtama cleanly', () => {
  assert.ok(NUR_BAKED_PATH.totalLength > 30 && NUR_BAKED_PATH.totalLength < 60);
  const start = NUR_BAKED_PATH.sampleAtDistance(0);
  const end = NUR_BAKED_PATH.sampleAtDistance(NUR_BAKED_PATH.totalLength);
  assert.ok(Math.abs(start.pos.x - -12.4) < 0.05);
  assert.ok(Math.abs(end.pos.x - 11.94) < 0.05);
});

test('Nur Map: All 9 tower slots snap exactly 0.5m clear of the neon road edge', () => {
  assert.equal(NUR_TOWER_SLOTS.length, 9);
  const expectedDist = NUR_NEON_HALF_WIDTH + NUR_SLOT_PAD_SIZE * 0.5 + NUR_SLOT_CLEARANCE;
  for (const slot of NUR_TOWER_SLOTS) {
    const d = distance3D(slot.position, slot.lookTarget);
    assert.ok(
      Math.abs(d - expectedDist) < 0.02,
      `${slot.name} distance ${d} expected ${expectedDist}`
    );
  }
  // Ensure no two slots overlap each other
  for (let i = 0; i < NUR_TOWER_SLOTS.length; i++) {
    for (let j = i + 1; j < NUR_TOWER_SLOTS.length; j++) {
      const pairDist = distance3D(NUR_TOWER_SLOTS[i].position, NUR_TOWER_SLOTS[j].position);
      assert.ok(pairDist > NUR_SLOT_PAD_SIZE, `Slots ${i + 1} and ${j + 1} overlap (${pairDist}m)`);
    }
  }
});

test('TargetSelector: FRONT_MOST, LOWEST_HP, and CLOSEST select exact candidates', () => {
  const towerPos = { x: 0, y: 0, z: 0 };
  const candidates = [
    { id: 1, alive: true, position: { x: 2, y: 0, z: 0 }, currentHp: 100, pathProgress: 0.2 },
    { id: 2, alive: true, position: { x: 4, y: 0, z: 0 }, currentHp: 40, pathProgress: 0.5 },
    { id: 3, alive: true, position: { x: 5, y: 0, z: 0 }, currentHp: 200, pathProgress: 0.8 },
    { id: 4, alive: true, position: { x: 20, y: 0, z: 0 }, currentHp: 5, pathProgress: 0.95 }, // out of range
  ];

  assert.equal(selectTarget(towerPos, 6, candidates, 'FRONT_MOST')?.id, 3);
  assert.equal(selectTarget(towerPos, 6, candidates, 'LOWEST_HP')?.id, 2);
  assert.equal(selectTarget(towerPos, 6, candidates, 'CLOSEST')?.id, 1);
});
