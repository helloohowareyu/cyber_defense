// Pure target selection supporting BTD6-style 4 targeting modes:
// FIRST (front-most), STRONG (highest HP / Boss priority), LAST (back-most), CLOSE (closest).

import { TargetingMode } from './constants';
import { distance3D, isInRange3D, Vec3Like } from './combatMath';

export interface TargetCandidate {
  id: number;
  alive: boolean;
  position: Vec3Like;
  currentHp: number;
  pathProgress: number;
  isBoss?: boolean;
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
    if (mode === 'FIRST') {
      score = c.pathProgress;
    } else if (mode === 'STRONG') {
      // Highest HP with tie-breaker favoring further progress + slight boss bonus
      score = c.currentHp + (c.isBoss ? 5000 : 0) + c.pathProgress;
    } else if (mode === 'LAST') {
      score = -c.pathProgress;
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
