// Procedural BufferGeometry (VAO/VBO) + Composite 3-12 Part Tower & Enemy Models
// Port of Yusuf's res://src/combat/graphics/procedural_mesh_builder.gd
// plus high-craft multi-part 3D silhouettes for all 4 Towers and 4 Enemies.

import * as THREE from 'three';
import { EnemyType, TowerType, TOWER_PRESETS, ENEMY_PRESETS } from '../game/constants';
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

    // Inner vertex
    positions[v0 * 3] = cosA * innerRadius;
    positions[v0 * 3 + 1] = 0.04;
    positions[v0 * 3 + 2] = sinA * innerRadius;
    normals[v0 * 3 + 1] = 1;
    uvs[v0 * 2] = ratio;
    uvs[v0 * 2 + 1] = 0;
    colors[v0 * 4] = innerColor[0];
    colors[v0 * 4 + 1] = innerColor[1];
    colors[v0 * 4 + 2] = innerColor[2];
    colors[v0 * 4 + 3] = innerColor[3];

    // Outer vertex
    positions[v1 * 3] = cosA * outerRadius;
    positions[v1 * 3 + 1] = 0.04;
    positions[v1 * 3 + 2] = sinA * outerRadius;
    normals[v1 * 3 + 1] = 1;
    uvs[v1 * 2] = ratio;
    uvs[v1 * 2 + 1] = 1;
    colors[v1 * 4] = outerColor[0];
    colors[v1 * 4 + 1] = outerColor[1];
    colors[v1 * 4 + 2] = outerColor[2];
    colors[v1 * 4 + 3] = outerColor[3];
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
 * Triangle fan disc on XZ plane with barycentric RGBA color interpolation for Cannon AoE blasts.
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

  // Center vertex
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
  phongMaterials: THREE.ShaderMaterial[];
  upgradeNodes: THREE.Object3D[];
}

/**
 * Builds a composite 6-10 part 3D Tower model (bottom-center pivoted at y = 0.08 on top of Nur's pad).
 * Uses varied PBR roughness/metalness + custom Blinn-Phong shader accents.
 */
export function buildTowerRig(type: TowerType): TowerRig {
  const preset = TOWER_PRESETS[type];
  const root = new THREE.Group();
  const turretHead = new THREE.Group();
  const recoilGroup = new THREE.Group();
  const phongMaterials: THREE.ShaderMaterial[] = [];
  const upgradeNodes: THREE.Object3D[] = [];

  const matHullDark = new THREE.MeshStandardMaterial({
    color: 0x0e1a30,
    metalness: 0.82,
    roughness: 0.34,
  });
  const matHullMid = new THREE.MeshStandardMaterial({
    color: 0x1e3557,
    metalness: 0.72,
    roughness: 0.28,
  });
  const matMatteGrip = new THREE.MeshStandardMaterial({
    color: 0x162033,
    metalness: 0.25,
    roughness: 0.76,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.accentColor,
    emissiveIntensity: 1.4,
    metalness: 0.3,
    roughness: 0.2,
  });
  const matPhong = createBlinnPhongCrystalMaterial({
    baseColor: preset.accentColor,
    rimColor: 0xe0f7ff,
    shininess: 64,
    specularStrength: 1.5,
  });
  phongMaterials.push(matPhong);

  // Common octagonal armored plinth
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.62, 0.24, 8), matHullDark);
  basePlinth.position.y = 0.12;
  basePlinth.castShadow = true;
  basePlinth.receiveShadow = true;
  root.add(basePlinth);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 8), matHullMid);
  collar.position.y = 0.31;
  collar.castShadow = true;
  root.add(collar);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 8, 24), matAccent);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.23;
  root.add(baseRing);

  // Level 2 & Level 3 visual upgrade ornaments (toggled as tower upgrades)
  const lv2Crown = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.03, 8, 8), matAccent);
  lv2Crown.rotation.x = Math.PI / 2;
  lv2Crown.position.y = 0.38;
  lv2Crown.visible = false;
  root.add(lv2Crown);
  upgradeNodes.push(lv2Crown);

  const lv3Halo = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.18), matHullMid);
    fin.position.set(Math.cos(angle) * 0.52, 0.36, Math.sin(angle) * 0.52);
    fin.rotation.y = -angle;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.14), matAccent);
    tip.position.set(Math.cos(angle) * 0.55, 0.56, Math.sin(angle) * 0.55);
    tip.rotation.y = -angle;
    lv3Halo.add(fin, tip);
  }
  lv3Halo.visible = false;
  root.add(lv3Halo);
  upgradeNodes.push(lv3Halo);

  turretHead.position.y = 0.42;
  root.add(turretHead);
  turretHead.add(recoilGroup);

  let muzzleLocal = new THREE.Vector3(0, 0.72, 0.85);
  let spinNode: THREE.Object3D | undefined;

  if (type === 'laser') {
    // Laser Tower: Rotating prism cradle + Blinn-Phong core lens + twin emitter prongs
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.26, 0.52), matHullMid);
    yoke.position.y = 0.18;
    yoke.castShadow = true;
    recoilGroup.add(yoke);

    const lensHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 12), matMatteGrip);
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(0, 0.32, 0.12);
    lensHousing.castShadow = true;
    recoilGroup.add(lensHousing);

    const prismCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), matPhong);
    prismCore.position.set(0, 0.32, 0.42);
    recoilGroup.add(prismCore);
    spinNode = prismCore;

    for (const sx of [-0.24, 0.24]) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.72), matHullDark);
      prong.position.set(sx, 0.32, 0.32);
      prong.castShadow = true;
      const coil = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.48), matAccent);
      coil.position.set(sx, 0.38, 0.38);
      recoilGroup.add(prong, coil);
    }
    muzzleLocal = new THREE.Vector3(0, 0.74, 0.72);
  } else if (type === 'cannon') {
    // Cannon Tower: Armored artillery turret + twin-band heavy barrel + ammo drum
    const breach = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.4, 0.66), matHullMid);
    breach.position.set(0, 0.24, -0.06);
    breach.castShadow = true;
    recoilGroup.add(breach);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.52, 12), matMatteGrip);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 0.38, -0.26);
    drum.castShadow = true;
    recoilGroup.add(drum);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.88, 12), matHullDark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.28, 0.48);
    barrel.castShadow = true;
    recoilGroup.add(barrel);

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.18, 10), matAccent);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.28, 0.92);
    recoilGroup.add(muzzleBrake);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.24), matPhong);
    optic.position.set(0.26, 0.46, 0.12);
    recoilGroup.add(optic);

    muzzleLocal = new THREE.Vector3(0, 0.72, 1.0);
  } else if (type === 'freeze') {
    // Freeze Tower: 3 cryo stabilizer prongs + levitating spinning Blinn-Phong frost crystal
    const cryoCore = new THREE.Group();
    cryoCore.position.y = 0.68;

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matPhong);
    crystal.scale.set(0.85, 1.38, 0.85);
    crystal.castShadow = true;
    cryoCore.add(crystal);

    const frostRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 24), matAccent);
    frostRing.rotation.x = Math.PI / 3;
    cryoCore.add(frostRing);

    turretHead.add(cryoCore);
    spinNode = cryoCore;

    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.16), matHullMid);
      pylon.position.set(Math.cos(ang) * 0.38, 0.34, Math.sin(ang) * 0.38);
      pylon.rotation.y = -ang;
      pylon.rotation.z = -0.22;
      pylon.castShadow = true;
      const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), matAccent);
      emitter.position.set(Math.cos(ang) * 0.32, 0.64, Math.sin(ang) * 0.32);
      turretHead.add(pylon, emitter);
    }

    muzzleLocal = new THREE.Vector3(0, 1.1, 0);
  } else {
    // Armor Pen Tower: Sleek electromagnetic twin-rail sniper cannon
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.76), matHullDark);
    chassis.position.set(0, 0.22, -0.05);
    chassis.castShadow = true;
    recoilGroup.add(chassis);

    const coreCap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.56), matPhong);
    coreCap.position.set(0, 0.34, 0.12);
    recoilGroup.add(coreCap);

    for (const sx of [-0.14, 0.14]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 1.15), matHullMid);
      rail.position.set(sx, 0.32, 0.52);
      rail.castShadow = true;
      recoilGroup.add(rail);
    }

    for (let i = 0; i < 3; i++) {
      const magRing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), matAccent);
      magRing.position.set(0, 0.32, 0.35 + i * 0.26);
      recoilGroup.add(magRing);
    }

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 10), matMatteGrip);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.5, 0.08);
    recoilGroup.add(scope);

    muzzleLocal = new THREE.Vector3(0, 0.74, 1.14);
  }

  return {
    root,
    turretHead,
    recoilGroup,
    muzzleLocal,
    spinNode,
    phongMaterials,
    upgradeNodes,
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
}

/**
 * Builds composite 4-9 part procedural Enemy 3D meshes (Goblin, Orc, Harpy, Demon King Boss)
 * with contact shadow grounding, frozen Blinn-Phong crystal shell, and overhead 3D HP bar.
 */
export function buildEnemyRig(type: EnemyType, shadowTex: THREE.Texture): EnemyRig {
  const preset = ENEMY_PRESETS[type];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const matPrimary = new THREE.MeshStandardMaterial({
    color: preset.primaryColor,
    metalness: 0.42,
    roughness: 0.45,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.75,
    roughness: 0.32,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: preset.accentColor,
    emissive: preset.accentColor,
    emissiveIntensity: 1.6,
    metalness: 0.25,
    roughness: 0.2,
  });
  const flashMaterials = [matPrimary, matDark];

  // Ground contact shadow disc (sits at road surface y = 0.135)
  const shadowSize = preset.isBoss ? 1.85 : type === 'orc' ? 1.25 : 0.95;
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
  let hpBarY = 1.35;

  if (type === 'goblin') {
    // Agile cyber-scout bot
    for (const sx of [-0.14, 0.14]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.14), matDark);
      leg.position.set(sx, 0.17, 0);
      leg.castShadow = true;
      bodyGroup.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.34), matPrimary);
    torso.position.set(0, 0.5, 0.04);
    torso.rotation.x = 0.18;
    torso.castShadow = true;
    bodyGroup.add(torso);

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), matDark);
    head.position.set(0, 0.76, 0.14);
    head.castShadow = true;
    bodyGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.12), matAccent);
    visor.position.set(0, 0.77, 0.27);
    bodyGroup.add(visor);

    const spineFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.26), matAccent);
    spineFin.position.set(0, 0.66, -0.14);
    bodyGroup.add(spineFin);
    hpBarY = 1.22;
  } else if (type === 'orc') {
    // Heavy Armored Juggernaut Mech
    for (const sx of [-0.24, 0.24]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.26), matDark);
      leg.position.set(sx, 0.22, 0);
      leg.castShadow = true;
      bodyGroup.add(leg);
    }
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.58), matPrimary);
    hull.position.set(0, 0.7, 0);
    hull.castShadow = true;
    bodyGroup.add(hull);

    // Heavy armored shoulder shields (visual cue for 10 Armor!)
    for (const sx of [-0.46, 0.46]) {
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.44, 0.52), matDark);
      pauldron.position.set(sx, 0.84, 0.02);
      pauldron.castShadow = true;
      bodyGroup.add(pauldron);
    }
    const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.12), matAccent);
    chestCore.position.set(0, 0.72, 0.28);
    bodyGroup.add(chestCore);

    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.34), matDark);
    helm.position.set(0, 1.12, 0.06);
    helm.castShadow = true;
    bodyGroup.add(helm);

    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.08), matAccent);
    eyeSlit.position.set(0, 1.13, 0.22);
    bodyGroup.add(eyeSlit);
    hpBarY = 1.56;
  } else if (type === 'harpy') {
    // Fast Hover Striker Drone (flies at y = 0.95)
    bodyGroup.position.y = 0.88;
    const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.82, 6), matPrimary);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    bodyGroup.add(fuselage);

    const wings = new THREE.Group();
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.32), matDark);
    wingL.position.set(-0.42, 0.04, -0.06);
    wingL.rotation.z = 0.22;
    wingL.rotation.y = 0.32;
    wingL.castShadow = true;

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.32), matDark);
    wingR.position.set(0.42, 0.04, -0.06);
    wingR.rotation.z = -0.22;
    wingR.rotation.y = -0.32;
    wingR.castShadow = true;

    const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.06), matAccent);
    stripL.position.set(-0.42, 0.06, 0.04);
    stripL.rotation.z = 0.22;
    stripL.rotation.y = 0.32;

    const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.06), matAccent);
    stripR.position.set(0.42, 0.06, 0.04);
    stripR.rotation.z = -0.22;
    stripR.rotation.y = -0.32;

    wings.add(wingL, wingR, stripL, stripR);
    bodyGroup.add(wings);
    crownOrWings = wings;

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), matAccent);
    eye.position.set(0, 0.02, 0.34);
    bodyGroup.add(eye);
    hpBarY = 1.65;
  } else {
    // DEMON KING BOSS: Towering Cyber-Titan with floating crimson crown halo
    for (const sx of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.68, 0.36), matDark);
      leg.position.set(sx, 0.34, 0);
      leg.castShadow = true;
      bodyGroup.add(leg);
    }
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.88, 0.76), matPrimary);
    torso.position.set(0, 1.05, 0);
    torso.castShadow = true;
    bodyGroup.add(torso);

    const furnace = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), matAccent);
    furnace.position.set(0, 1.06, 0.36);
    bodyGroup.add(furnace);

    for (const sx of [-0.68, 0.68]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.64), matDark);
      shoulder.position.set(sx, 1.32, 0);
      shoulder.castShadow = true;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 6), matAccent);
      horn.position.set(sx * 1.04, 1.72, 0);
      horn.rotation.z = sx < 0 ? 0.35 : -0.35;
      bodyGroup.add(shoulder, horn);
    }

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.46), matDark);
    head.position.set(0, 1.68, 0.08);
    head.castShadow = true;
    bodyGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.1), matAccent);
    visor.position.set(0, 1.7, 0.3);
    bodyGroup.add(visor);

    const bossHalo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.055, 8, 24), matAccent);
    bossHalo.rotation.x = Math.PI / 2;
    bossHalo.position.set(0, 2.08, 0);
    bodyGroup.add(bossHalo);
    crownOrWings = bossHalo;

    hpBarY = 2.55;
  }

  // Translucent Blinn-Phong Ice Crystal shell shown when enemy is slowed by Freeze Tower
  const frozenMat = createBlinnPhongCrystalMaterial({
    baseColor: 0x7dd3fc,
    rimColor: 0xe0f2fe,
    shininess: 80,
    specularStrength: 1.8,
    opacity: 0.48,
    transparent: true,
  });
  const frozenRadius = preset.isBoss ? 1.15 : type === 'orc' ? 0.72 : 0.52;
  const frozenOverlay = new THREE.Mesh(new THREE.OctahedronGeometry(frozenRadius, 0), frozenMat);
  frozenOverlay.position.y = preset.isFlying ? 0.9 : frozenRadius * 0.95;
  frozenOverlay.visible = false;
  root.add(frozenOverlay);

  // Clean overhead 3D Health Bar (billboarded toward camera each frame)
  const barW = preset.isBoss ? 1.6 : 0.85;
  const barH = preset.isBoss ? 0.13 : 0.09;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW + 0.06, barH + 0.05),
    new THREE.MeshBasicMaterial({ color: 0x050b18, side: THREE.DoubleSide })
  );
  hpBarBg.position.set(0, hpBarY, 0);
  root.add(hpBarBg);

  const fillGeo = new THREE.PlaneGeometry(barW, barH);
  fillGeo.translate(barW * 0.5, 0, 0); // anchor left edge so scale.x shrinks cleanly!
  const hpBarFill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: preset.isBoss ? 0xff1e42 : 0x22c55e,
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(-barW * 0.5, 0, 0.01);
  hpBarBg.add(hpBarFill);

  return {
    root,
    bodyGroup,
    frozenOverlay,
    hpBarBg,
    hpBarFill,
    flashMaterials,
    shadowDisc,
    crownOrWings,
  };
}
