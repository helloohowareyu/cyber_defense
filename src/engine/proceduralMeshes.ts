// Procedural BufferGeometry (VAO/VBO) + Composite 3D Models for:
// - 6 Cyber Defense Towers (Laser, Cannon, Freeze, Railgun, Tesla Arc Relay, Quantum Data Farm) with Lv.1-4 tier evolution
// - 6 100% Cyber-Themed Enemies (Bit-Crawler, Zero-Day Worm, Packet Phantom, Trojan Juggernaut, Firewall Breaker, OMEGA-0 Rootkit Boss)
// Tower base, Laser, Cannon, Cryo, Railgun, Bit-Crawler, Worm, Trojan and OMEGA-0 follow the team's concept art.

import * as THREE from 'three';
import { ENEMY_PRESETS, EnemyType, TOWER_PRESETS, TowerType } from '../game/constants';
import { createBlinnPhongCrystalMaterial } from './shaders';

/**
 * Port of ProceduralMeshBuilder.build_range_ring_mesh()
 * Builds an Annulus on the XZ plane with explicit VBO buffers (position, normal, uv, RGBA color)
 * and triangulated index buffer (2 triangles per segment).
 */
export function buildRangeRingGeometry(
  innerRadius: number,
  outerRadius: number,
  segments = 56,
  innerColor: [number, number, number, number] = [0.13, 0.83, 0.93, 0.08],
  outerColor: [number, number, number, number] = [0.13, 0.83, 0.93, 0.58]
): THREE.BufferGeometry {
  const count = Math.max(8, segments);
  const vertCount = (count + 1) * 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 4);
  const indices: number[] = [];

  for (let i = 0; i <= count; i++) {
    const ratio = i / count;
    const angle = ratio * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const v0 = i * 2;
    const v1 = i * 2 + 1;

    positions[v0 * 3] = cosA * innerRadius;
    positions[v0 * 3 + 1] = 0.04;
    positions[v0 * 3 + 2] = sinA * innerRadius;
    normals[v0 * 3 + 1] = 1;
    uvs[v0 * 2] = ratio;
    uvs[v0 * 2 + 1] = 0;
    colors.set(innerColor, v0 * 4);

    positions[v1 * 3] = cosA * outerRadius;
    positions[v1 * 3 + 1] = 0.04;
    positions[v1 * 3 + 2] = sinA * outerRadius;
    normals[v1 * 3 + 1] = 1;
    uvs[v1 * 2] = ratio;
    uvs[v1 * 2 + 1] = 1;
    colors.set(outerColor, v1 * 4);
  }

  for (let i = 0; i < count; i++) {
    const b = i * 2;
    indices.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geo.setIndex(indices);
  return geo;
}

/**
 * Port of ProceduralMeshBuilder.build_aoe_shockwave_disc()
 * Triangle fan disc on XZ plane with barycentric RGBA color interpolation for Plasma/EMP blasts.
 */
export function buildAoeShockwaveGeometry(
  radius: number,
  segments = 36,
  centerColor: [number, number, number, number] = [1.0, 0.72, 0.25, 0.85],
  edgeColor: [number, number, number, number] = [1.0, 0.25, 0.05, 0.0]
): THREE.BufferGeometry {
  const count = Math.max(8, segments);
  const vertCount = count + 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 4);
  const indices: number[] = [];

  positions[1] = 0.16;
  normals[1] = 1;
  uvs[0] = 0.5;
  uvs[1] = 0.5;
  colors.set(centerColor, 0);

  for (let i = 0; i <= count; i++) {
    const ratio = i / count;
    const angle = ratio * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const v = i + 1;

    positions[v * 3] = cosA * radius;
    positions[v * 3 + 1] = 0.16;
    positions[v * 3 + 2] = sinA * radius;
    normals[v * 3 + 1] = 1;
    uvs[v * 2] = 0.5 + cosA * 0.5;
    uvs[v * 2 + 1] = 0.5 + sinA * 0.5;
    colors.set(edgeColor, v * 4);
  }

  for (let i = 0; i < count; i++) {
    indices.push(0, i + 1, i + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geo.setIndex(indices);
  return geo;
}

export interface TowerRig {
  root: THREE.Group;
  turretHead: THREE.Group;
  recoilGroup: THREE.Group;
  muzzleLocal: THREE.Vector3;
  spinNode?: THREE.Object3D;
  apexRing: THREE.Mesh; // Lv.4 APEX Ultimate floating halo
  phongMaterials: THREE.ShaderMaterial[];
  upgradeNodes: THREE.Object3D[]; // [Lv2, Lv3, Lv4]
  hitMesh: THREE.Mesh;
}

// Towers and enemies are drawn larger than their gameplay footprint so they stay readable
// from the tactical camera. Gameplay distances (range, path, placement) are unaffected.
export const TOWER_VISUAL_SCALE = 1.2;
const ENEMY_VISUAL_SCALE = 1.45;
const BOSS_VISUAL_SCALE = 1.25;
const FINAL_BOSS_VISUAL_SCALE = 1.12;

// Objects on this layer get the bloom glow (see CyberDefenseEngine.renderBloomFrame)
export const BLOOM_LAYER = 1;

// Every strongly emissive mesh in a rig (neon strips, lenses, eyes, padlock...) joins the bloom layer
function tagBloomParts(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (mat instanceof THREE.MeshStandardMaterial && mat.emissiveIntensity >= 1.5 && mat.emissive.getHex() !== 0) {
      obj.layers.enable(BLOOM_LAYER);
    }
  });
}

// Pale colors (ice blue) are far brighter than saturated ones (red, violet) at the same intensity.
// Scaling by luminance gives every neon color a similar glow instead of some blowing out to white.
export function neonBoost(colorHex: number, targetLuminance: number, min: number, max: number): number {
  const c = new THREE.Color(colorHex);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return Math.min(max, Math.max(min, targetLuminance / Math.max(lum, 0.01)));
}

// Soft round glow used by additive sprites (muzzle flashes, hit flares, trails)
export function createGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Small helper: create a mesh, place it, and attach it to a parent in one go.
function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  castShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = castShadow;
  parent.add(mesh);
  return mesh;
}

// Cylinder lying along +Z (forward), used for barrels and housings.
function zCylinder(radiusFront: number, radiusBack: number, length: number, sides: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radiusFront, radiusBack, length, sides);
  geo.rotateX(Math.PI / 2);
  return geo;
}

// Helix along +Z, used for the railgun's glowing coils.
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radius: number,
    private readonly length: number,
    private readonly turns: number
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius, (t - 0.5) * this.length);
  }
}

/**
 * Builds the 3D tower rigs. All six towers share one hexagonal base (dark gunmetal,
 * chrome bevels, cyan light slits and a floating halo ring). Laser, Cannon, Cryo and
 * Railgun heads follow the team's concept art; Tesla and Farm keep their original heads.
 * Every head faces +Z, which is the direction computeTurretYaw() rotates toward.
 */
export function buildTowerRig(type: TowerType): TowerRig {
  const preset = TOWER_PRESETS[type];
  const root = new THREE.Group();
  const turretHead = new THREE.Group();
  const recoilGroup = new THREE.Group();
  const phongMaterials: THREE.ShaderMaterial[] = [];
  const upgradeNodes: THREE.Object3D[] = [];

  const matHullDark = new THREE.MeshStandardMaterial({
    color: 0x252a33,
    metalness: 0.82,
    roughness: 0.38,
  });
  const matHullMid = new THREE.MeshStandardMaterial({
    color: 0x353c48,
    metalness: 0.74,
    roughness: 0.32,
  });
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xa3acba,
    metalness: 0.95,
    roughness: 0.16,
  });
  const matMatteGrip = new THREE.MeshStandardMaterial({
    color: 0x15181e,
    metalness: 0.3,
    roughness: 0.72,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.accentColor,
    emissiveIntensity: neonBoost(preset.accentColor, 0.85, 1.5, 3.0),
    metalness: 0.3,
    roughness: 0.22,
  });
  // Base slits stay below the bloom cut-off (1.5) so six towers in a row don't turn into a haze;
  // only the halo ring above the mount glows
  const matBaseGlow = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.3,
    metalness: 0.2,
    roughness: 0.2,
  });
  const matApexGold = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.15,
    metalness: 0.6,
    roughness: 0.2,
  });
  const matPhong = createBlinnPhongCrystalMaterial({
    baseColor: preset.accentColor,
    rimColor: 0xe0f7ff,
    shininess: 64,
    specularStrength: 1.45,
  });
  phongMaterials.push(matPhong);

  // ---- Shared hexagonal base (concept art: "Base Tower") ----
  part(root, new THREE.CylinderGeometry(0.62, 0.68, 0.08, 6), matChrome, 0, 0.04, 0);
  const body = part(root, new THREE.CylinderGeometry(0.54, 0.6, 0.36, 6), matHullDark, 0, 0.26, 0);
  body.receiveShadow = true;
  part(root, new THREE.CylinderGeometry(0.47, 0.54, 0.06, 6), matChrome, 0, 0.47, 0);
  part(root, new THREE.TorusGeometry(0.34, 0.03, 8, 24), matHullMid, 0, 0.505, 0, Math.PI / 2);

  // One light slit, a cyan status light and a white status light on each of the six faces
  const faceApothem = 0.57 * Math.cos(Math.PI / 6);
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI) / 3;
    const sx = Math.sin(angle);
    const sz = Math.cos(angle);
    part(root, new THREE.BoxGeometry(0.06, 0.2, 0.025), matBaseGlow, sx * faceApothem, 0.28, sz * faceApothem, 0, angle, 0, false);
    const side = 0.12;
    const ox = Math.cos(angle) * side;
    const oz = -Math.sin(angle) * side;
    part(root, new THREE.SphereGeometry(0.022, 8, 6), matBaseGlow, sx * faceApothem + ox, 0.2, sz * faceApothem + oz, 0, 0, 0, false);
    part(root, new THREE.SphereGeometry(0.026, 8, 6), matChrome, sx * faceApothem + ox, 0.14, sz * faceApothem + oz, 0, 0, 0, false);
  }

  // Floating halo ring above the mounting plate, held by thin light beams.
  // The Farm's wide server vault would swallow it, so the Farm goes without.
  if (type !== 'farm') {
    const matHalo = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.55 });
    part(root, new THREE.TorusGeometry(0.46, 0.012, 8, 40), matHalo, 0, 0.66, 0, Math.PI / 2, 0, 0, false);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      part(root, new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4), matBaseGlow, Math.sin(angle) * 0.46, 0.585, Math.cos(angle) * 0.46, 0, 0, 0, false);
    }
  }

  // Lv.2: glowing ring around the foot
  const lv2Crown = part(root, new THREE.TorusGeometry(0.7, 0.03, 8, 6), matAccent, 0, 0.1, 0, Math.PI / 2, 0, 0, false);
  lv2Crown.visible = false;
  upgradeNodes.push(lv2Crown);

  // Lv.3: four stabilizer fins on the base corners
  const lv3Halo = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    part(lv3Halo, new THREE.BoxGeometry(0.1, 0.42, 0.18), matHullMid, Math.sin(angle) * 0.62, 0.3, Math.cos(angle) * 0.62, 0, angle, 0);
    part(lv3Halo, new THREE.BoxGeometry(0.065, 0.14, 0.14), matAccent, Math.sin(angle) * 0.65, 0.5, Math.cos(angle) * 0.65, 0, angle, 0, false);
  }
  lv3Halo.visible = false;
  root.add(lv3Halo);
  upgradeNodes.push(lv3Halo);

  // Lv.4 APEX: floating gold halo
  const apexRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 8, 28), matApexGold);
  apexRing.rotation.x = Math.PI / 2;
  apexRing.position.y = 1.48;
  apexRing.visible = false;
  root.add(apexRing);
  upgradeNodes.push(apexRing);

  turretHead.position.y = 0.52;
  root.add(turretHead);
  turretHead.add(recoilGroup);

  let muzzleLocal = new THREE.Vector3(0, 0.72, 0.85);
  let spinNode: THREE.Object3D | undefined;

  if (type === 'laser') {
    // Sleek hexagonal housing, thin barrel, round emitter with a glowing lens
    part(recoilGroup, zCylinder(0.16, 0.2, 0.62, 6), matHullMid, 0, 0.2, -0.12);
    part(recoilGroup, new THREE.BoxGeometry(0.3, 0.16, 0.12), matHullDark, 0, 0.2, -0.47);
    part(recoilGroup, new THREE.BoxGeometry(0.08, 0.05, 0.16), matHullDark, 0, 0.36, -0.3);
    for (const sx of [-1, 1]) {
      part(recoilGroup, new THREE.BoxGeometry(0.012, 0.025, 0.5), matAccent, sx * 0.158, 0.22, -0.1, 0, 0, 0, false);
    }
    part(recoilGroup, zCylinder(0.085, 0.085, 0.07, 10), matChrome, 0, 0.2, 0.21);
    part(recoilGroup, zCylinder(0.045, 0.05, 0.42, 10), matMatteGrip, 0, 0.2, 0.43);
    part(recoilGroup, zCylinder(0.1, 0.13, 0.16, 8), matHullDark, 0, 0.2, 0.7);
    part(recoilGroup, new THREE.BoxGeometry(0.012, 0.02, 0.12), matAccent, 0.115, 0.22, 0.7, 0, 0, 0, false);
    part(recoilGroup, zCylinder(0.075, 0.075, 0.02, 16), matAccent, 0, 0.2, 0.785, 0, 0, 0, false);
    part(recoilGroup, new THREE.TorusGeometry(0.09, 0.012, 6, 20), matAccent, 0, 0.2, 0.782, 0, 0, 0, false);
    muzzleLocal = new THREE.Vector3(0, 0.2, 0.8);
  } else if (type === 'cannon') {
    // Bulky armored housing, orange heat vents, cyan trim and a heavy segmented barrel
    const matTrim = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 2.0 });
    part(recoilGroup, new THREE.BoxGeometry(0.74, 0.06, 0.66), matHullDark, 0, 0.03, -0.1);
    part(recoilGroup, new THREE.BoxGeometry(0.66, 0.38, 0.6), matHullMid, 0, 0.25, -0.1);
    part(recoilGroup, new THREE.BoxGeometry(0.52, 0.07, 0.46), matHullDark, 0, 0.47, -0.12);
    part(recoilGroup, new THREE.BoxGeometry(0.2, 0.06, 0.16), matHullMid, 0.1, 0.53, -0.18);
    for (const sx of [-1, 1]) {
      part(recoilGroup, new THREE.BoxGeometry(0.06, 0.3, 0.52), matHullDark, sx * 0.36, 0.25, -0.1);
      for (let i = 0; i < 6; i++) {
        part(recoilGroup, new THREE.BoxGeometry(0.015, 0.028, 0.05), matAccent, sx * 0.395, 0.32, -0.3 + i * 0.075, 0, 0, sx * 0.4, false);
      }
      for (let i = 0; i < 4; i++) {
        part(recoilGroup, new THREE.BoxGeometry(0.015, 0.028, 0.05), matAccent, sx * 0.395, 0.17, -0.24 + i * 0.075, 0, 0, sx * 0.4, false);
      }
      part(recoilGroup, new THREE.BoxGeometry(0.012, 0.012, 0.58), matTrim, sx * 0.33, 0.45, -0.1, 0, 0, 0, false);
      part(recoilGroup, new THREE.BoxGeometry(0.012, 0.3, 0.012), matTrim, sx * 0.3, 0.27, 0.205, 0, 0, 0, false);
    }
    part(recoilGroup, zCylinder(0.21, 0.21, 0.14, 8), matHullDark, 0, 0.25, 0.27);
    part(recoilGroup, zCylinder(0.13, 0.13, 0.46, 12), matMatteGrip, 0, 0.25, 0.5);
    part(recoilGroup, zCylinder(0.16, 0.16, 0.05, 12), matChrome, 0, 0.25, 0.42);
    part(recoilGroup, zCylinder(0.16, 0.16, 0.05, 12), matChrome, 0, 0.25, 0.6);
    part(recoilGroup, zCylinder(0.19, 0.18, 0.12, 8), matHullDark, 0, 0.25, 0.78);
    part(recoilGroup, new THREE.TorusGeometry(0.13, 0.025, 8, 24), matAccent, 0, 0.25, 0.845, 0, 0, 0, false);
    part(recoilGroup, zCylinder(0.11, 0.11, 0.01, 16), matAccent, 0, 0.25, 0.8, 0, 0, 0, false);
    muzzleLocal = new THREE.Vector3(0, 0.25, 0.88);
  } else if (type === 'freeze') {
    // Cryo cannon: frosted cylinder with radial fins, an ice crystal in the emitter and icicles underneath
    const matCryoHull = new THREE.MeshStandardMaterial({ color: 0x3b4a60, metalness: 0.7, roughness: 0.34 });
    const matIce = new THREE.MeshStandardMaterial({
      color: 0xc9ecff,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.45,
      metalness: 0.1,
      roughness: 0.12,
      transparent: true,
      opacity: 0.85,
    });
    part(recoilGroup, zCylinder(0.27, 0.3, 0.6, 10), matCryoHull, 0, 0.3, -0.05);
    part(recoilGroup, zCylinder(0.3, 0.2, 0.12, 10), matHullDark, 0, 0.3, -0.41);
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10;
      const fin = part(recoilGroup, new THREE.BoxGeometry(0.06, 0.035, 0.16), matHullMid, Math.cos(angle) * 0.31, 0.3 + Math.sin(angle) * 0.31, 0.05);
      fin.rotation.z = angle;
      part(recoilGroup, new THREE.BoxGeometry(0.02, 0.02, 0.1), matAccent, Math.cos(angle) * 0.345, 0.3 + Math.sin(angle) * 0.345, 0.05, 0, 0, angle, false);
    }
    part(recoilGroup, new THREE.TorusGeometry(0.27, 0.05, 10, 24), matHullDark, 0, 0.3, 0.27);
    part(recoilGroup, new THREE.TorusGeometry(0.225, 0.018, 8, 24), matAccent, 0, 0.3, 0.295, 0, 0, 0, false);
    part(recoilGroup, zCylinder(0.24, 0.24, 0.02, 16), matMatteGrip, 0, 0.3, 0.22, 0, 0, 0, false);
    const crystal = part(recoilGroup, new THREE.OctahedronGeometry(0.13, 0), matPhong, 0, 0.3, 0.27);
    crystal.scale.set(1, 1, 0.8);
    // Side vent with icy slits
    part(recoilGroup, new THREE.BoxGeometry(0.05, 0.14, 0.2), matHullDark, 0.3, 0.3, -0.18);
    for (let i = 0; i < 4; i++) {
      part(recoilGroup, new THREE.BoxGeometry(0.01, 0.09, 0.012), matAccent, 0.328, 0.3, -0.24 + i * 0.04, 0, 0, 0, false);
    }
    // Frost crystals on top and icicles underneath
    for (const [x, z, s] of [[-0.12, -0.2, 1], [0.1, 0.02, 0.8], [-0.05, 0.16, 0.9]]) {
      const shard = part(recoilGroup, new THREE.OctahedronGeometry(0.05 * s, 0), matIce, x, 0.6, z, 0.3, 0, 0.2, false);
      shard.scale.set(0.7, 1.6, 0.7);
    }
    [-0.3, -0.16, -0.02, 0.12, 0.24].forEach((z, i) => {
      part(recoilGroup, new THREE.ConeGeometry(0.022, 0.14, 5), matIce, i % 2 === 0 ? -0.06 : 0.06, 0.04, z, Math.PI, 0, 0, false);
    });
    muzzleLocal = new THREE.Vector3(0, 0.3, 0.32);
  } else if (type === 'armor_pen') {
    // Railgun: armored rear block, twin barrels wrapped in glowing helix coils, drill-like tips
    part(recoilGroup, new THREE.BoxGeometry(0.5, 0.34, 0.5), matHullDark, 0, 0.22, -0.2);
    part(recoilGroup, new THREE.BoxGeometry(0.4, 0.07, 0.38), matHullMid, 0, 0.42, -0.22);
    part(recoilGroup, new THREE.BoxGeometry(0.14, 0.04, 0.06), matMatteGrip, 0.05, 0.47, -0.1);
    for (const sx of [-1, 1]) {
      part(recoilGroup, new THREE.BoxGeometry(0.012, 0.012, 0.42), matAccent, sx * 0.252, 0.3, -0.2, 0, 0, 0, false);
      part(recoilGroup, new THREE.BoxGeometry(0.012, 0.16, 0.012), matAccent, sx * 0.252, 0.2, -0.02, 0, 0, 0, false);
      const bx = sx * 0.1;
      part(recoilGroup, zCylinder(0.085, 0.085, 0.12, 10), matChrome, bx, 0.22, 0.1);
      part(recoilGroup, zCylinder(0.045, 0.045, 0.78, 10), matMatteGrip, bx, 0.22, 0.55);
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(0.07, 0.66, 9), 160, 0.011, 5, false), matAccent);
      coil.position.set(bx, 0.22, 0.52);
      recoilGroup.add(coil);
      part(recoilGroup, zCylinder(0.0, 0.065, 0.2, 6), matHullMid, bx, 0.22, 1.03);
    }
    muzzleLocal = new THREE.Vector3(0, 0.22, 1.12);
  } else if (type === 'tesla') {
    // Tesla Arc Relay: Central high-voltage spire + 3 stacked induction torus coils + glowing arc sphere
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, 0.92, 10), matHullMid);
    spire.position.y = 0.46;
    spire.castShadow = true;
    turretHead.add(spire);

    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.34 - i * 0.05, 0.045, 8, 20), matAccent);
      coil.rotation.x = Math.PI / 2;
      coil.position.y = 0.24 + i * 0.24;
      turretHead.add(coil);
    }

    const orbGroup = new THREE.Group();
    orbGroup.position.y = 1.04;
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), matPhong);
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 20), matAccent);
    orbitRing.rotation.x = Math.PI / 4;
    orbGroup.add(orb, orbitRing);
    turretHead.add(orbGroup);
    spinNode = orbGroup;

    muzzleLocal = new THREE.Vector3(0, 1.46, 0);
  } else {
    // Quantum Data Farm: Hexagonal server vault + floating spinning emerald data prism & orbiting cubes
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.44, 6), matHullMid);
    vault.position.y = 0.22;
    vault.castShadow = true;
    turretHead.add(vault);

    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.22), matHullDark);
      blade.position.set(Math.cos(ang) * 0.44, 0.34, Math.sin(ang) * 0.44);
      blade.rotation.y = -ang;
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.06), matAccent);
      led.position.set(Math.cos(ang) * 0.48, 0.36, Math.sin(ang) * 0.48);
      led.rotation.y = -ang;
      turretHead.add(blade, led);
    }

    const dataCore = new THREE.Group();
    dataCore.position.y = 0.86;
    const holoCube = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), matPhong);
    dataCore.add(holoCube);
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const packet = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), matAccent);
      packet.position.set(Math.cos(ang) * 0.44, 0.05, Math.sin(ang) * 0.44);
      dataCore.add(packet);
    }
    turretHead.add(dataCore);
    spinNode = dataCore;

    muzzleLocal = new THREE.Vector3(0, 1.28, 0);
  }

  // Click hit proxy for selecting any freely placed tower cleanly
  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.78, 1.55, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.y = 0.78;
  root.add(hitMesh);

  root.scale.setScalar(TOWER_VISUAL_SCALE);
  tagBloomParts(root);

  return {
    root,
    turretHead,
    recoilGroup,
    muzzleLocal,
    spinNode,
    apexRing,
    phongMaterials,
    upgradeNodes,
    hitMesh,
  };
}

export interface EnemyRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  frozenOverlay: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  flashMaterials: THREE.MeshStandardMaterial[];
  shadowDisc: THREE.Mesh;
  crownOrWings?: THREE.Object3D;
  secondaryRing?: THREE.Object3D;
}

/**
 * Builds composite procedural 3D Cyber-Defense Enemy meshes:
 * - Bit-Crawler (spiked virus sphere with one red eye)
 * - Zero-Day Worm (segmented armored worm)
 * - Packet Phantom (Swept-Wing Hover Interceptor)
 * - Trojan Juggernaut (armored hover war-horse with an open cargo hatch)
 * - Firewall Breaker (Stage 2 Mid-Boss Hover Dreadnought)
 * - OMEGA-0 Rootkit (floating titan with a padlock and chains)
 * Every enemy faces +Z; the engine turns the root along the path tangent.
 */
export function buildEnemyRig(type: EnemyType, shadowTex: THREE.Texture): EnemyRig {
  const preset = ENEMY_PRESETS[type];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const matPrimary = new THREE.MeshStandardMaterial({
    color: preset.primaryColor,
    metalness: 0.58,
    roughness: 0.36,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x0b1324,
    metalness: 0.82,
    roughness: 0.28,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.accentColor,
    emissiveIntensity: 2.8,
    metalness: 0.25,
    roughness: 0.2,
  });
  const matMatteBlack = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    metalness: 0.2,
    roughness: 0.8,
  });
  const flashMaterials = [matPrimary, matDark];

  const shadowSize = preset.isFinalBoss ? 2.5 : preset.isBoss ? 1.85 : type === 'trojan_brute' ? 1.3 : 0.92;
  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowSize, shadowSize),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  let crownOrWings: THREE.Object3D | undefined;
  let secondaryRing: THREE.Object3D | undefined;
  let hpBarY = 1.35;

  if (type === 'bit_crawler') {
    // Bit-Crawler (concept art: "Virus"): spiked dark sphere with red seams and one red eye
    const coreY = 0.55;
    const shell = new THREE.Group();
    shell.position.set(0, coreY, 0);
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), matPrimary);
    sphere.castShadow = true;
    shell.add(sphere);
    for (const [rx, ry] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]]) {
      part(shell, new THREE.TorusGeometry(0.302, 0.008, 6, 32), matAccent, 0, 0, 0, rx, ry, 0, false);
    }
    // Spikes spread evenly over the sphere (Fibonacci lattice), leaving the front clear for the eye
    const up = new THREE.Vector3(0, 1, 0);
    const spikeCount = 22;
    for (let i = 0; i < spikeCount; i++) {
      const y = 1 - (2 * (i + 0.5)) / spikeCount;
      const ring = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      const dir = new THREE.Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
      if (dir.z > 0.82) continue;
      const spike = new THREE.Group();
      spike.quaternion.setFromUnitVectors(up, dir);
      spike.position.copy(dir).multiplyScalar(0.28);
      part(spike, new THREE.CylinderGeometry(0.022, 0.055, 0.15, 6), matDark, 0, 0.075, 0);
      part(spike, new THREE.CylinderGeometry(0.024, 0.024, 0.035, 6), matAccent, 0, 0.165, 0, 0, 0, 0, false);
      shell.add(spike);
    }
    bodyGroup.add(shell);
    crownOrWings = shell;

    part(bodyGroup, new THREE.TorusGeometry(0.1, 0.03, 8, 20), matDark, 0, coreY, 0.285, 0, 0, 0, false);
    const iris = part(bodyGroup, new THREE.SphereGeometry(0.075, 14, 10), matAccent, 0, coreY, 0.29, 0, 0, 0, false);
    iris.scale.set(1, 1, 0.55);
    part(bodyGroup, new THREE.SphereGeometry(0.03, 10, 8), matDark, 0, coreY, 0.328, 0, 0, 0, false);
    hpBarY = 1.15;
  } else if (type === 'worm_swarm') {
    // Zero-Day Worm (concept art: "Worm"): segmented armored body, red stripe, orange side lines
    const matOrange = new THREE.MeshStandardMaterial({ color: 0xff8a1e, emissive: 0xff8a1e, emissiveIntensity: 2.4 });
    const bodyY = 0.3;
    part(bodyGroup, zCylinder(0.1, 0.15, 0.24, 6), matPrimary, 0, bodyY, 0.36);
    part(bodyGroup, new THREE.BoxGeometry(0.1, 0.03, 0.02), matDark, 0, bodyY - 0.03, 0.485, 0, 0, 0, false);
    for (const sx of [-1, 1]) {
      const eye = part(bodyGroup, new THREE.SphereGeometry(0.035, 10, 8), matAccent, sx * 0.1, bodyY + 0.03, 0.4, 0, 0, 0, false);
      eye.scale.set(0.8, 0.7, 1.2);
      part(bodyGroup, new THREE.BoxGeometry(0.01, 0.012, 0.2), matOrange, sx * 0.118, bodyY - 0.06, 0.34, 0, 0, 0, false);
    }
    part(bodyGroup, new THREE.BoxGeometry(0.03, 0.014, 0.2), matAccent, 0, bodyY + 0.13, 0.33, 0, 0, 0, false);

    let z = 0.2;
    const segments = 7;
    for (let i = 0; i < segments; i++) {
      const r = 0.14 - i * 0.013;
      const len = 0.13 - i * 0.006;
      z -= len * 0.5;
      part(bodyGroup, zCylinder(r * 0.94, r, len * 0.88, 6), matPrimary, 0, bodyY, z);
      part(bodyGroup, zCylinder(r * 1.05, r * 1.05, 0.022, 6), matAccent, 0, bodyY, z + len * 0.42, 0, 0, 0, false);
      part(bodyGroup, new THREE.BoxGeometry(0.026, 0.012, len * 0.8), matAccent, 0, bodyY + r * 0.98, z, 0, 0, 0, false);
      for (const sx of [-1, 1]) {
        part(bodyGroup, new THREE.BoxGeometry(0.01, 0.012, len * 0.7), matOrange, sx * r * 0.86, bodyY - r * 0.4, z, 0, 0, 0, false);
      }
      z -= len * 0.5;
    }
    part(bodyGroup, zCylinder(0.05, 0.0, 0.12, 6), matOrange, 0, bodyY, z - 0.05, 0, 0, 0, false);
    hpBarY = 0.95;
  } else if (type === 'packet_wisp') {
    // Packet Phantom: Fast Hovering Delta-Wing Cyber Interceptor
    bodyGroup.position.y = 0.85;
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.84, 6), matPrimary);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    bodyGroup.add(fuselage);

    const wings = new THREE.Group();
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.34), matDark);
      wing.position.set(sx * 0.42, 0.04, -0.06);
      wing.rotation.z = sx * -0.22;
      wing.rotation.y = sx * -0.34;
      wing.castShadow = true;

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.06), matAccent);
      strip.position.set(sx * 0.42, 0.06, 0.04);
      strip.rotation.z = sx * -0.22;
      strip.rotation.y = sx * -0.34;
      wings.add(wing, strip);
    }
    bodyGroup.add(wings);
    crownOrWings = wings;

    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matAccent);
    thruster.position.set(0, 0.02, -0.38);
    bodyGroup.add(thruster);
    hpBarY = 1.6;
  } else if (type === 'trojan_brute') {
    // Trojan Juggernaut (concept art: "Trojan"): armored hover war-horse with an open glowing cargo hatch
    const matCore = new THREE.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff1e42, emissiveIntensity: 3.4 });

    // Four hover thrusters instead of legs
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = sx * 0.21;
        const pz = sz * 0.3 - 0.08;
        part(bodyGroup, new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), matDark, px, 0.24, pz);
        part(bodyGroup, new THREE.CylinderGeometry(0.11, 0.08, 0.035, 12), matAccent, px, 0.155, pz, 0, 0, 0, false);
      }
    }

    // Long armored torso with plates and red seams between them
    part(bodyGroup, new THREE.BoxGeometry(0.5, 0.4, 0.86), matPrimary, 0, 0.52, -0.08);
    part(bodyGroup, new THREE.BoxGeometry(0.44, 0.06, 0.8), matDark, 0, 0.75, -0.08);
    for (const sx of [-1, 1]) {
      for (const pz of [-0.36, -0.1, 0.16]) {
        part(bodyGroup, new THREE.BoxGeometry(0.04, 0.3, 0.22), matDark, sx * 0.265, 0.53, pz);
      }
      for (const pz of [-0.23, 0.03, 0.28]) {
        part(bodyGroup, new THREE.BoxGeometry(0.02, 0.3, 0.012), matAccent, sx * 0.262, 0.53, pz, 0, 0, 0, false);
      }
      part(bodyGroup, new THREE.BoxGeometry(0.02, 0.012, 0.76), matAccent, sx * 0.262, 0.7, -0.08, 0, 0, 0, false);
    }

    // Half-open cargo hatch on the right flank, the hidden malware core glowing inside
    part(bodyGroup, new THREE.BoxGeometry(0.03, 0.2, 0.28), matMatteBlack, 0.27, 0.46, -0.24, 0, 0, 0, false);
    part(bodyGroup, new THREE.BoxGeometry(0.02, 0.13, 0.2), matCore, 0.28, 0.46, -0.24, 0, 0, 0, false);
    part(bodyGroup, new THREE.BoxGeometry(0.03, 0.06, 0.3), matDark, 0.34, 0.58, -0.24, 0, 0, -0.9);

    // Chest, neck and head leaning forward
    part(bodyGroup, new THREE.BoxGeometry(0.46, 0.38, 0.22), matPrimary, 0, 0.6, 0.42, -0.25, 0, 0);
    part(bodyGroup, new THREE.BoxGeometry(0.02, 0.3, 0.012), matAccent, 0.18, 0.62, 0.54, -0.25, 0, 0, false);
    part(bodyGroup, new THREE.BoxGeometry(0.26, 0.48, 0.26), matPrimary, 0, 0.86, 0.48, 0.5, 0, 0);
    part(bodyGroup, new THREE.BoxGeometry(0.02, 0.4, 0.012), matAccent, 0, 0.79, 0.615, 0.5, 0, 0, false);
    part(bodyGroup, new THREE.BoxGeometry(0.25, 0.24, 0.42), matPrimary, 0, 1.06, 0.68, 0.35, 0, 0);
    part(bodyGroup, new THREE.BoxGeometry(0.21, 0.17, 0.18), matDark, 0, 0.98, 0.88, 0.35, 0, 0);
    for (const sx of [-1, 1]) {
      part(bodyGroup, new THREE.BoxGeometry(0.03, 0.03, 0.02), matMatteBlack, sx * 0.05, 0.93, 0.97, 0.35, 0, 0, false);
      const eye = part(bodyGroup, new THREE.SphereGeometry(0.035, 10, 8), matAccent, sx * 0.127, 1.1, 0.7, 0, 0, 0, false);
      eye.scale.set(0.6, 1, 1.2);
      part(bodyGroup, new THREE.ConeGeometry(0.04, 0.13, 4), matDark, sx * 0.08, 1.25, 0.56, -0.2, 0, 0);
    }
    // Armored mane along the back of the neck
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      part(bodyGroup, new THREE.BoxGeometry(0.16, 0.08, 0.06), matDark, 0, 0.73 + t * 0.42, 0.225 + t * 0.23, 0.5, 0, 0);
    }
    hpBarY = 1.6;
  } else if (type === 'aegis_dreadnought') {
    // STAGE 2 MID-BOSS: Firewall Breaker Hover Dreadnought
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.68, 1.38), matPrimary);
    chassis.position.set(0, 0.76, 0);
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const upperDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 0.42, 6), matDark);
    upperDeck.position.set(0, 1.24, -0.08);
    upperDeck.castShadow = true;
    bodyGroup.add(upperDeck);

    // Twin front energy cores
    for (const sx of [-0.3, 0.3]) {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.14), matAccent);
      core.position.set(sx, 0.78, 0.7);
      bodyGroup.add(core);
    }

    // Orbiting Aegis Shield Ring
    const shieldRing = new THREE.Group();
    shieldRing.position.set(0, 1.05, 0);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.52), matDark);
      panel.position.set(Math.cos(ang) * 0.95, 0, Math.sin(ang) * 0.95);
      panel.rotation.y = -ang;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.48), matAccent);
      edge.position.set(Math.cos(ang) * 0.97, 0.2, Math.sin(ang) * 0.97);
      edge.rotation.y = -ang;
      shieldRing.add(panel, edge);
    }
    bodyGroup.add(shieldRing);
    crownOrWings = shieldRing;
    hpBarY = 2.2;
  } else {
    // OMEGA-0 Rootkit (concept art: "Boss"): floating armored titan with a glowing padlock,
    // chains across the chest, horned red shoulders and hanging clawed arms
    const matRedPlate = new THREE.MeshStandardMaterial({ color: 0x8e1b24, metalness: 0.6, roughness: 0.35 });
    const matChain = new THREE.MeshStandardMaterial({ color: 0x8c8f96, metalness: 0.95, roughness: 0.25 });
    flashMaterials.push(matRedPlate);

    // Torso, abdomen and the V-shaped lower plating that ends in a point
    part(bodyGroup, new THREE.BoxGeometry(0.96, 0.9, 0.6), matPrimary, 0, 1.78, 0);
    part(bodyGroup, new THREE.BoxGeometry(0.62, 0.5, 0.08), matRedPlate, 0, 1.84, 0.31);
    part(bodyGroup, new THREE.BoxGeometry(0.76, 0.42, 0.52), matDark, 0, 1.18, 0);
    const lowerV = part(bodyGroup, new THREE.ConeGeometry(0.4, 0.9, 4), matPrimary, 0, 0.6, 0, Math.PI, Math.PI / 4, 0);
    lowerV.scale.set(1, 1, 0.65);
    for (const sx of [-1, 1]) {
      part(bodyGroup, new THREE.BoxGeometry(0.02, 0.8, 0.02), matAccent, sx * 0.16, 0.66, 0.11, 0.2, 0, sx * -0.38, false);
      part(bodyGroup, new THREE.BoxGeometry(0.02, 0.5, 0.012), matAccent, sx * 0.49, 1.78, 0.2, 0, 0, 0, false);
    }

    // Shoulders with big horns
    for (const sx of [-1, 1]) {
      part(bodyGroup, new THREE.BoxGeometry(0.46, 0.3, 0.56), matDark, sx * 0.7, 2.0, 0);
      part(bodyGroup, new THREE.BoxGeometry(0.5, 0.2, 0.6), matRedPlate, sx * 0.72, 2.2, 0, 0, 0, sx * -0.18);
      part(bodyGroup, new THREE.BoxGeometry(0.42, 0.02, 0.02), matAccent, sx * 0.72, 2.12, 0.31, 0, 0, sx * -0.18, false);
      part(bodyGroup, new THREE.ConeGeometry(0.11, 0.72, 6), matDark, sx * 0.98, 2.62, -0.05, 0, 0, sx * -0.42);
    }

    // Head: helmet, red visor eyes, crown spikes
    part(bodyGroup, new THREE.BoxGeometry(0.34, 0.36, 0.34), matDark, 0, 2.45, 0.02);
    part(bodyGroup, new THREE.BoxGeometry(0.36, 0.12, 0.3), matRedPlate, 0, 2.66, 0);
    part(bodyGroup, new THREE.BoxGeometry(0.26, 0.06, 0.02), matAccent, 0, 2.45, 0.195, 0, 0, 0, false);
    for (const sx of [-1, 1]) {
      part(bodyGroup, new THREE.ConeGeometry(0.06, 0.4, 4), matRedPlate, sx * 0.11, 2.9, 0, 0, Math.PI / 4, sx * -0.1);
    }

    // Arms hanging down, red forearm armor, clawed hands
    for (const sx of [-1, 1]) {
      part(bodyGroup, new THREE.BoxGeometry(0.22, 0.5, 0.24), matDark, sx * 0.76, 1.6, 0);
      part(bodyGroup, new THREE.BoxGeometry(0.27, 0.5, 0.3), matRedPlate, sx * 0.8, 1.1, 0.02);
      part(bodyGroup, new THREE.BoxGeometry(0.02, 0.36, 0.012), matAccent, sx * 0.8, 1.1, 0.18, 0, 0, 0, false);
      part(bodyGroup, new THREE.BoxGeometry(0.22, 0.17, 0.2), matDark, sx * 0.82, 0.76, 0.02);
      for (let f = 0; f < 3; f++) {
        part(bodyGroup, new THREE.BoxGeometry(0.05, 0.16, 0.05), matDark, sx * 0.82 + (f - 1) * 0.065, 0.62, 0.08, 0.35, 0, 0);
      }
    }

    // Two chains crossing the chest
    for (const sx of [-1, 1]) {
      const from = new THREE.Vector3(sx * -0.42, 2.12, 0.34);
      const to = new THREE.Vector3(sx * 0.36, 1.32, 0.34);
      const links = 11;
      const dir = to.clone().sub(from);
      const roll = Math.atan2(dir.x, -dir.y);
      for (let i = 0; i <= links; i++) {
        const p = from.clone().lerp(to, i / links);
        const link = part(bodyGroup, new THREE.TorusGeometry(0.045, 0.014, 6, 12), matChain, p.x, p.y, p.z, 0, i % 2 === 0 ? 0 : Math.PI / 2, roll, false);
        link.rotation.order = 'ZYX';
        link.scale.set(0.75, 1.25, 0.75);
      }
    }

    // Glowing padlock in the middle of the chest
    part(bodyGroup, new THREE.BoxGeometry(0.28, 0.24, 0.1), matAccent, 0, 1.62, 0.39);
    part(bodyGroup, new THREE.TorusGeometry(0.085, 0.024, 8, 16, Math.PI), matAccent, 0, 1.74, 0.39, 0, 0, 0, false);
    part(bodyGroup, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), matMatteBlack, 0, 1.65, 0.442, Math.PI / 2, 0, 0, false);
    part(bodyGroup, new THREE.BoxGeometry(0.022, 0.06, 0.02), matMatteBlack, 0, 1.61, 0.442, 0, 0, 0, false);

    hpBarY = 3.25;
  }

  // Translucent Blinn-Phong Ice Crystal shell shown when slowed/frozen
  const frozenMat = createBlinnPhongCrystalMaterial({
    baseColor: 0x7dd3fc,
    rimColor: 0xe0f2fe,
    shininess: 80,
    specularStrength: 1.7,
    opacity: 0.46,
    transparent: true,
  });
  const frozenRadius = preset.isFinalBoss ? 1.45 : preset.isBoss ? 1.1 : type === 'trojan_brute' ? 0.74 : 0.5;
  const frozenOverlay = new THREE.Mesh(new THREE.OctahedronGeometry(frozenRadius, 0), frozenMat);
  frozenOverlay.position.y = preset.isFlying ? 0.88 : frozenRadius * 0.92;
  frozenOverlay.visible = false;
  root.add(frozenOverlay);

  // Clean overhead 3D Health Bar
  const barW = preset.isFinalBoss ? 2.2 : preset.isBoss ? 1.65 : 0.86;
  const barH = preset.isFinalBoss ? 0.16 : preset.isBoss ? 0.13 : 0.09;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.06, barH + 0.05),
    new THREE.MeshBasicMaterial({ color: 0x050b18, side: THREE.DoubleSide })
  );
  hpBarBg.position.set(0, hpBarY, 0);
  root.add(hpBarBg);

  const fillGeo = new THREE.PlaneGeometry(barW, barH);
  fillGeo.translate(barW * 0.5, 0, 0);
  const hpBarFill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: preset.isFinalBoss ? 0xff1744 : preset.isBoss ? 0xf59e0b : 0x22c55e,
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(-barW * 0.5, 0, 0.01);
  hpBarBg.add(hpBarFill);

  root.scale.setScalar(preset.isFinalBoss ? FINAL_BOSS_VISUAL_SCALE : preset.isBoss ? BOSS_VISUAL_SCALE : ENEMY_VISUAL_SCALE);
  tagBloomParts(root);

  return {
    root,
    bodyGroup,
    frozenOverlay,
    hpBarBg,
    hpBarFill,
    flashMaterials,
    shadowDisc,
    crownOrWings,
    secondaryRing,
  };
}
