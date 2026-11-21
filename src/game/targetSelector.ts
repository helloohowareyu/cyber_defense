// Port of Yusuf's res://src/combat/components/target_selector.gd
// Pure target selection supporting GDD Section 4.4 modes: FRONT_MOST, LOWEST_HP, CLOSEST.

import { TargetingMode } from './constants';
import { distance3D, isInRange3D, Vec3Like } from './combatMath';

export interface TargetCandidate {
  id: number;
  alive: boolean;
  position: Vec3Like;
  currentHp: number;
  pathProgress: number;
}

export function selectTarget<T extends TargetCandidate>(
  towerPos: Vec3Like,
  rangeMeters: number,
  candidates: readonly T[],
  mode: TargetingMode
): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (!c.alive || c.currentHp <= 0) continue;
    if (!isInRange3D(towerPos, c.position, rangeMeters)) continue;

    let score: number;
    if (mode === 'FRONT_MOST') {
      score = c.pathProgress;
    } else if (mode === 'LOWEST_HP') {
      score = -c.currentHp;
    } else {
      score = -distance3D(towerPos, c.position);
    }

    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  return best;
}
