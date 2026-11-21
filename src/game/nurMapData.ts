// Faithful TypeScript port of Nur's original 3D map system:
// - src/nur/node_3d.tscn (32x18 Cyber Arena + 7x5 Cyan/Magenta Circuit Grid)
// - src/nur/base_musuh_static_body_3d.gd (BaseMusuh at x = -14.4, z = 0)
// - src/nur/base_utama_static_body_3d.gd (BaseUtama at x = +14.14, z = 0)
// - src/nur/sistem_jalur_node_3d.gd (8-point Cubic Bezier Curve3D path)
// - src/nur/slot_menara_3d.gd (9 strategic tower slots snapped 0.5m from road edge)

import { Vec3Like } from './combatMath';

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

// Nur's exact arena constants (src/nur/node_3d.tscn)
export const NUR_ARENA_WIDTH = 32.0; // lebar_kotak
export const NUR_ARENA_LENGTH = 18.0; // panjang_kotak
export const NUR_ROAD_HALF_WIDTH = 1.05; // lebar_jalur
export const NUR_NEON_HALF_WIDTH = 1.25; // lebar_jalur + 0.2
export const NUR_SLOT_PAD_SIZE = 1.3; // ukuran_pad
export const NUR_SLOT_CLEARANCE = 0.5; // jarak_dari_jalan

// Nur's exact base coordinates
export const NUR_BASE_MUSUH_POS: Vec3Like = { x: -14.4, y: 0, z: 0 };
export const NUR_BASE_UTAMA_POS: Vec3Like = { x: 14.14, y: 0, z: 0 };

// Nur's exact 8 Cubic Bezier control points (src/nur/sistem_jalur_node_3d.gd lines 138-155)
export const NUR_PATH_CONTROL_POINTS: BezierControlPoint[] = [
  {
    pos: { x: -12.4, y: 0, z: 0 }, // start_pos = BaseMusuh.x + 2.0
    inHandle: { x: 0, y: 0, z: 0 },
    outHandle: { x: 1.4, y: 0, z: 0 },
  },
  {
    pos: { x: -10.2, y: 0, z: 0 }, // p_keluar_lurus = start_pos.x + 2.2
    inHandle: { x: -1.2, y: 0, z: 0 },
    outHandle: { x: 1.8, y: 0, z: -1.6 },
  },
  {
    pos: { x: -6.2, y: 0, z: -5.8 },
    inHandle: { x: -3.2, y: 0, z: 0 },
    outHandle: { x: 3.4, y: 0, z: 0 },
  },
  {
    pos: { x: -2.6, y: 0, z: -0.4 },
    inHandle: { x: 0.4, y: 0, z: -3.2 },
    outHandle: { x: -0.4, y: 0, z: 3.2 },
  },
  {
    pos: { x: 0.4, y: 0, z: 5.4 },
    inHandle: { x: -3.2, y: 0, z: 0 },
    outHandle: { x: 3.2, y: 0, z: 0 },
  },
  {
    pos: { x: 4.9, y: 0, z: 1.5 },
    inHandle: { x: -1.2, y: 0, z: 1.9 },
    outHandle: { x: 0.95, y: 0, z: -1.5 },
  },
  {
    pos: { x: 7.44, y: 0, z: 0 }, // p_masuk_lurus = end_pos.x - 4.5
    inHandle: { x: -1.5, y: 0, z: 0 },
    outHandle: { x: 2.2, y: 0, z: 0 },
  },
  {
    pos: { x: 11.94, y: 0, z: 0 }, // end_pos = BaseUtama.x - 2.2
    inHandle: { x: -2.2, y: 0, z: 0 },
    outHandle: { x: 0, y: 0, z: 0 },
  },
];

// Nur's exact 9 target slot positions (src/nur/slot_menara_3d.gd lines 4-14)
export const NUR_RAW_SLOT_TARGETS: Vec3Like[] = [
  { x: -9.8, y: 0, z: 2.85 }, // slot1: sisi bawah pangkal keluar BaseMusuh
  { x: -9.8, y: 0, z: -3.55 }, // slot2: sisi atas/kiri tanjakan lengkungan pertama
  { x: -6.4, y: 0, z: -2.55 }, // slot3: sisi bawah/dalam lengkungan atas
  { x: -2.6, y: 0, z: -5.85 }, // slot4: sisi atas puncak lengkungan besar
  { x: -4.6, y: 0, z: 2.55 }, // slot5: sisi kiri/dalam jalur turun ke bawah
  { x: -0.6, y: 0, z: -2.35 }, // slot6: sisi kanan/luar jalur turun ke bawah
  { x: 5.8, y: 0, z: 3.25 }, // slot7: area bawah jalur kanan
  { x: 1.2, y: 0, z: 3.15 }, // slot8: area tikungan bawah
  { x: 7.6, y: 0, z: -2.35 }, // slot9: sisi atas jalur lurus menjelang BaseUtama
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

  constructor(controlPoints: BezierControlPoint[] = NUR_PATH_CONTROL_POINTS, stepsPerSegment = 48) {
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

  /**
   * Uniform arc-length sampling at distance `dist` along the path.
   */
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

    // Binary search for segment
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
}

/**
 * Exact TypeScript port of Nur's `_posisikan_tepat_0_5_dari_jalan()` in `src/nur/slot_menara_3d.gd`.
 * Snaps each slot pad center to exact distance (halfNeonWidth + halfPad + clearance = 2.40m)
 * from the nearest point on the baked Bezier path, and orients the pad to face the road.
 */
export function buildNurTowerSlots(path: NurBakedPath): NurSlotData[] {
  const halfPad = NUR_SLOT_PAD_SIZE * 0.5;
  const exactCenterDist = NUR_NEON_HALF_WIDTH + halfPad + NUR_SLOT_CLEARANCE;
  const steps = 240;

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
      name: `slot${idx + 1}`,
      position: snappedPos,
      lookTarget: nearestPoint,
      yaw,
      padSize: NUR_SLOT_PAD_SIZE,
    };
  });
}

// Singleton pre-baked Nur path and slots for deterministic sharing across logic & renderer
export const NUR_BAKED_PATH = new NurBakedPath(NUR_PATH_CONTROL_POINTS, 48);
export const NUR_TOWER_SLOTS = buildNurTowerSlots(NUR_BAKED_PATH);
