// Expanded 3D Cyber Arena faithful to Nur's original design (`src/nur/`):
// - Extended 40m x 24m Cyber Circuit Deck (preserving Nur's cyan/magenta grid & 2-layer Bezier road)
// - Much longer 3-loop multi-switchback Cubic Bezier path (~78m) for rich BTD6-style tower coverage
// - Nur's 9 Overclock Bonus Pads computed via `_posisikan_tepat_0_5_dari_jalan()` algorithm
// - Free Tower Placement validation anywhere on the arena deck with road/base/tower collision clearance!

import { distanceXZ, Vec3Like } from './combatMath';

export interface BezierControlPoint {
  pos: Vec3Like;
  inHandle: Vec3Like;
  outHandle: Vec3Like;
}

export interface BakedPathSample {
  pos: Vec3Like;
  tangent: Vec3Like;
  distance: number;
}

export interface NurSlotData {
  id: number;
  name: string;
  position: Vec3Like;
  lookTarget: Vec3Like;
  yaw: number;
  padSize: number;
}

export interface PlacementValidation {
  valid: boolean;
  reason: 'ok' | 'out_of_bounds' | 'on_road' | 'near_base' | 'tower_overlap';
  snappedPosition: Vec3Like;
  overclockPadId: number | null;
}

// Expanded Cyber Arena constants preserving Nur's proportions & visual language
export const NUR_ARENA_WIDTH = 40.0; // expanded from 32m -> 40m
export const NUR_ARENA_LENGTH = 24.0; // expanded from 18m -> 24m
export const NUR_ROAD_HALF_WIDTH = 0.96; // clean cyber lane
export const NUR_NEON_HALF_WIDTH = 1.14; // cyan neon border rail
export const NUR_SLOT_PAD_SIZE = 1.34; // Nur's Overclock Pad footprint
export const NUR_SLOT_CLEARANCE = 0.5; // Nur's exact 0.5m clearance from neon edge
export const TOWER_FOOTPRINT_RADIUS = 0.72; // Free-placement tower radius

// Base coordinates on the expanded 40m x 24m arena
export const NUR_BASE_MUSUH_POS: Vec3Like = { x: -18.0, y: 0, z: 0 };
export const NUR_BASE_UTAMA_POS: Vec3Like = { x: 17.8, y: 0, z: 0 };

// Extended 10-point G1-continuous Cubic Bezier multi-switchback path (~78m long!)
// Every control point has strictly smooth/collinear tangents so the 2-layer extruded road has zero pinch.
export const NUR_PATH_CONTROL_POINTS: BezierControlPoint[] = [
  {
    pos: { x: -15.8, y: 0, z: 0 }, // Straight exit from BaseMusuh
    inHandle: { x: 0, y: 0, z: 0 },
    outHandle: { x: 1.4, y: 0, z: 0 },
  },
  {
    pos: { x: -13.6, y: 0, z: 0 },
    inHandle: { x: -1.4, y: 0, z: 0 },
    outHandle: { x: 1.8, y: 0, z: 0 },
  },
  {
    pos: { x: -10.2, y: 0, z: -7.6 }, // Loop 1 North Apex
    inHandle: { x: -3.0, y: 0, z: 0 },
    outHandle: { x: 3.0, y: 0, z: 0 },
  },
  {
    pos: { x: -6.8, y: 0, z: 0.2 }, // West descending straight inflection
    inHandle: { x: -0.2, y: 0, z: -3.2 },
    outHandle: { x: 0.2, y: 0, z: 3.2 },
  },
  {
    pos: { x: -3.2, y: 0, z: 7.8 }, // Loop 1 South Apex
    inHandle: { x: -3.0, y: 0, z: 0 },
    outHandle: { x: 3.0, y: 0, z: 0 },
  },
  {
    pos: { x: 0.4, y: 0, z: -0.2 }, // Center ascending inflection
    inHandle: { x: -0.2, y: 0, z: 3.2 },
    outHandle: { x: 0.2, y: 0, z: -3.2 },
  },
  {
    pos: { x: 4.0, y: 0, z: -7.6 }, // Loop 2 North Apex
    inHandle: { x: -3.0, y: 0, z: 0 },
    outHandle: { x: 3.0, y: 0, z: 0 },
  },
  {
    pos: { x: 7.6, y: 0, z: 1.6 }, // East descending inflection
    inHandle: { x: -0.3, y: 0, z: -3.4 },
    outHandle: { x: 0.3, y: 0, z: 3.4 },
  },
  {
    pos: { x: 11.0, y: 0, z: 6.4 }, // East Southern Loop before final approach
    inHandle: { x: -2.4, y: 0, z: 0 },
    outHandle: { x: 2.2, y: 0, z: 0 },
  },
  {
    pos: { x: 13.6, y: 0, z: 0 }, // Smooth entry onto final corridor
    inHandle: { x: -1.4, y: 0, z: 2.2 },
    outHandle: { x: 1.2, y: 0, z: 0 },
  },
  {
    pos: { x: 15.5, y: 0, z: 0 }, // Straight approach into BaseUtama Energy Core
    inHandle: { x: -1.0, y: 0, z: 0 },
    outHandle: { x: 0, y: 0, z: 0 },
  },
];

// Nur's 9 Strategic Cyber Overclock Pads (placed in prime tactical pockets along the switchbacks!)
// Players can place towers ANYWHERE freely, OR snap onto these 9 Overclock Pads for +15% Range & +12% Speed!
export const NUR_RAW_SLOT_TARGETS: Vec3Like[] = [
  { x: -13.2, y: 0, z: 3.2 }, // Overclock Pad 1: Southern spawn gate flank
  { x: -10.2, y: 0, z: -4.2 }, // Overclock Pad 2: Inside Loop 1 North bend (double lane coverage!)
  { x: -6.8, y: 0, z: -4.2 }, // Overclock Pad 3: West switchback inner pocket
  { x: -3.2, y: 0, z: 4.2 }, // Overclock Pad 4: Inside Loop 1 South bend (prime choke!)
  { x: -2.6, y: 0, z: -3.2 }, // Overclock Pad 5: Center-West crossroad
  { x: 4.0, y: 0, z: -4.2 }, // Overclock Pad 6: Inside Loop 2 North bend (prime choke!)
  { x: 3.8, y: 0, z: 4.4 }, // Overclock Pad 7: Center-East tactical crossroad
  { x: 10.8, y: 0, z: 2.8 }, // Overclock Pad 8: Inside East South bend
  { x: 13.8, y: 0, z: -3.6 }, // Overclock Pad 9: Final Core Defense Guard
];

function evalCubicBezier(p0: Vec3Like, c1: Vec3Like, c2: Vec3Like, p3: Vec3Like, t: number): Vec3Like {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * p3.y,
    z: uuu * p0.z + 3 * uu * t * c1.z + 3 * u * tt * c2.z + ttt * p3.z,
  };
}

/**
 * Baked arc-length parameterized path matching Godot's Curve3D.sample_baked().
 */
export class NurBakedPath {
  public readonly samples: BakedPathSample[];
  public readonly totalLength: number;

  constructor(controlPoints: BezierControlPoint[] = NUR_PATH_CONTROL_POINTS, stepsPerSegment = 44) {
    const rawPoints: Vec3Like[] = [];
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const a = controlPoints[i];
      const b = controlPoints[i + 1];
      const c1: Vec3Like = {
        x: a.pos.x + a.outHandle.x,
        y: a.pos.y + a.outHandle.y,
        z: a.pos.z + a.outHandle.z,
      };
      const c2: Vec3Like = {
        x: b.pos.x + b.inHandle.x,
        y: b.pos.y + b.inHandle.y,
        z: b.pos.z + b.inHandle.z,
      };
      const startStep = i === 0 ? 0 : 1;
      for (let s = startStep; s <= stepsPerSegment; s++) {
        rawPoints.push(evalCubicBezier(a.pos, c1, c2, b.pos, s / stepsPerSegment));
      }
    }

    const samples: BakedPathSample[] = [];
    let accum = 0;
    for (let i = 0; i < rawPoints.length; i++) {
      if (i > 0) {
        const dx = rawPoints[i].x - rawPoints[i - 1].x;
        const dy = rawPoints[i].y - rawPoints[i - 1].y;
        const dz = rawPoints[i].z - rawPoints[i - 1].z;
        accum += Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      const prev = rawPoints[Math.max(0, i - 1)];
      const next = rawPoints[Math.min(rawPoints.length - 1, i + 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const tz = next.z - prev.z;
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
      samples.push({
        pos: rawPoints[i],
        tangent: { x: tx / len, y: ty / len, z: tz / len },
        distance: accum,
      });
    }

    this.samples = samples;
    this.totalLength = accum;
  }

  public sampleAtDistance(dist: number): { pos: Vec3Like; tangent: Vec3Like; progress: number } {
    const clamped = Math.max(0, Math.min(this.totalLength, dist));
    const samples = this.samples;
    if (samples.length === 0) {
      return { pos: { x: 0, y: 0, z: 0 }, tangent: { x: 1, y: 0, z: 0 }, progress: 0 };
    }
    if (clamped <= 0) {
      return { pos: { ...samples[0].pos }, tangent: { ...samples[0].tangent }, progress: 0 };
    }
    if (clamped >= this.totalLength) {
      const last = samples[samples.length - 1];
      return { pos: { ...last.pos }, tangent: { ...last.tangent }, progress: 1 };
    }

    let lo = 0;
    let hi = samples.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].distance <= clamped) lo = mid;
      else hi = mid;
    }

    const s0 = samples[lo];
    const s1 = samples[hi];
    const segLen = Math.max(1e-6, s1.distance - s0.distance);
    const alpha = (clamped - s0.distance) / segLen;

    const tx = s0.tangent.x + (s1.tangent.x - s0.tangent.x) * alpha;
    const ty = s0.tangent.y + (s1.tangent.y - s0.tangent.y) * alpha;
    const tz = s0.tangent.z + (s1.tangent.z - s0.tangent.z) * alpha;
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;

    return {
      pos: {
        x: s0.pos.x + (s1.pos.x - s0.pos.x) * alpha,
        y: s0.pos.y + (s1.pos.y - s0.pos.y) * alpha,
        z: s0.pos.z + (s1.pos.z - s0.pos.z) * alpha,
      },
      tangent: { x: tx / tLen, y: ty / tLen, z: tz / tLen },
      progress: clamped / this.totalLength,
    };
  }

  /**
   * Computes minimum horizontal distance from a world XZ coordinate to the baked road centerline.
   */
  public distanceToRoadCenter(pos: Vec3Like): number {
    let minSq = Infinity;
    for (let i = 0; i < this.samples.length; i += 2) {
      const s = this.samples[i].pos;
      const dx = pos.x - s.x;
      const dz = pos.z - s.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minSq) minSq = dSq;
    }
    return Math.sqrt(minSq);
  }
}

/**
 * Exact TypeScript port of Nur's `_posisikan_tepat_0_5_dari_jalan()` from `src/nur/slot_menara_3d.gd`.
 * Computes the 9 Overclock Bonus Pads snapped cleanly 0.5m from the road neon edge.
 */
export function buildNurTowerSlots(path: NurBakedPath): NurSlotData[] {
  const halfPad = NUR_SLOT_PAD_SIZE * 0.5;
  const exactCenterDist = NUR_NEON_HALF_WIDTH + halfPad + NUR_SLOT_CLEARANCE;
  const steps = 360;

  return NUR_RAW_SLOT_TARGETS.map((raw, idx) => {
    let minDist = Infinity;
    let nearestOffset = 0;
    let nearestPoint: Vec3Like = { x: 0, y: 0, z: 0 };

    for (let s = 0; s <= steps; s++) {
      const d = (s / steps) * path.totalLength;
      const sample = path.sampleAtDistance(d);
      const dx = raw.x - sample.pos.x;
      const dz = raw.z - sample.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearestOffset = d;
        nearestPoint = { x: sample.pos.x, y: 0, z: sample.pos.z };
      }
    }

    let outX = raw.x - nearestPoint.x;
    let outZ = raw.z - nearestPoint.z;
    const outLenSq = outX * outX + outZ * outZ;
    if (outLenSq < 1e-4) {
      const p1 = path.sampleAtDistance(Math.max(0, nearestOffset - 0.2)).pos;
      const p2 = path.sampleAtDistance(Math.min(path.totalLength, nearestOffset + 0.2)).pos;
      const tx = p2.x - p1.x;
      const tz = p2.z - p1.z;
      const tLen = Math.sqrt(tx * tx + tz * tz) || 1;
      outX = -tz / tLen;
      outZ = tx / tLen;
    } else {
      const outLen = Math.sqrt(outLenSq);
      outX /= outLen;
      outZ /= outLen;
    }

    const snappedPos: Vec3Like = {
      x: nearestPoint.x + outX * exactCenterDist,
      y: 0,
      z: nearestPoint.z + outZ * exactCenterDist,
    };

    const yaw = Math.atan2(nearestPoint.x - snappedPos.x, nearestPoint.z - snappedPos.z);

    return {
      id: idx,
      name: `Node ${idx + 1}`,
      position: snappedPos,
      lookTarget: nearestPoint,
      yaw,
      padSize: NUR_SLOT_PAD_SIZE,
    };
  });
}

// Pre-baked path and Overclock Pads shared across logic, tests, and renderer
export const NUR_BAKED_PATH = new NurBakedPath(NUR_PATH_CONTROL_POINTS, 44);
export const NUR_TOWER_SLOTS = buildNurTowerSlots(NUR_BAKED_PATH);

/**
 * BTD6-style Free Tower Placement validator:
 * Allows placing towers ANYWHERE on Nur's 40m x 24m Cyber Arena deck outside road, bases, and other towers.
 * Gently magnetic-snaps onto any free Overclock Bonus Pad within 0.95m for tactical synergy!
 */
export function validateTowerPlacement(
  worldPos: Vec3Like,
  existingTowerPositions: readonly Vec3Like[],
  path: NurBakedPath = NUR_BAKED_PATH,
  overclockPads: readonly NurSlotData[] = NUR_TOWER_SLOTS
): PlacementValidation {
  let candidate: Vec3Like = { x: worldPos.x, y: 0, z: worldPos.z };
  let overclockPadId: number | null = null;

  // Magnetic snap to nearby unoccupied Overclock Pad (grants +15% Range & +12% Fire Rate!)
  for (const pad of overclockPads) {
    if (distanceXZ(candidate, pad.position) <= 0.98) {
      const padOccupied = existingTowerPositions.some((tp) => distanceXZ(tp, pad.position) < 1.15);
      if (!padOccupied) {
        candidate = { x: pad.position.x, y: 0, z: pad.position.z };
        overclockPadId = pad.id;
      }
      break;
    }
  }

  // 1. Arena deck bounds check (margin inside border rails)
  const maxX = NUR_ARENA_WIDTH * 0.5 - 1.35;
  const maxZ = NUR_ARENA_LENGTH * 0.5 - 1.25;
  if (Math.abs(candidate.x) > maxX || Math.abs(candidate.z) > maxZ) {
    return { valid: false, reason: 'out_of_bounds', snappedPosition: candidate, overclockPadId: null };
  }

  // 2. BaseMusuh & BaseUtama exclusion zones
  if (
    (Math.abs(candidate.x - NUR_BASE_MUSUH_POS.x) < 3.4 && Math.abs(candidate.z) < 3.0) ||
    (Math.abs(candidate.x - NUR_BASE_UTAMA_POS.x) < 3.6 && Math.abs(candidate.z) < 3.3)
  ) {
    return { valid: false, reason: 'near_base', snappedPosition: candidate, overclockPadId: null };
  }

  // 3. Road clearance check (must not overlap extruded neon road ribbon)
  const minRoadDist = NUR_NEON_HALF_WIDTH + TOWER_FOOTPRINT_RADIUS + 0.06;
  if (path.distanceToRoadCenter(candidate) < minRoadDist) {
    return { valid: false, reason: 'on_road', snappedPosition: candidate, overclockPadId: null };
  }

  // 4. Existing tower footprint collision check
  const minTowerDist = TOWER_FOOTPRINT_RADIUS * 2 + 0.14;
  for (const tp of existingTowerPositions) {
    if (distanceXZ(candidate, tp) < minTowerDist) {
      return { valid: false, reason: 'tower_overlap', snappedPosition: candidate, overclockPadId: null };
    }
  }

  return {
    valid: true,
    reason: 'ok',
    snappedPosition: candidate,
    overclockPadId,
  };
}
