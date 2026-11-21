// Procedural BufferGeometry (VAO/VBO) + Composite 3D Models for:
// - 6 Cyber Defense Towers (Laser, Cannon, Freeze, Railgun, Tesla Arc Relay, Quantum Data Farm) with Lv.1-4 tier evolution
// - 6 100% Cyber-Themed Enemies (Bit-Crawler, Zero-Day Worm, Packet Phantom, Trojan Juggernaut, Firewall Breaker, OMEGA-0 Rootkit Boss)

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

/**
 * Builds composite 3D Tower rigs for all 6 Cyber Defense towers with Lv.1-4 tier evolution.
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
    emissiveIntensity: 1.1,
    metalness: 0.3,
    roughness: 0.22,
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

  // Common octagonal armored plinth
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.64, 0.24, 8), matHullDark);
  basePlinth.position.y = 0.12;
  basePlinth.castShadow = true;
  basePlinth.receiveShadow = true;
  root.add(basePlinth);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 8), matHullMid);
  collar.position.y = 0.31;
  collar.castShadow = true;
  root.add(collar);

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 24), matAccent);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.23;
  root.add(baseRing);

  // Lv.2 Upgrade Ring
  const lv2Crown = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.032, 8, 8), matAccent);
  lv2Crown.rotation.x = Math.PI / 2;
  lv2Crown.position.y = 0.38;
  lv2Crown.visible = false;
  root.add(lv2Crown);
  upgradeNodes.push(lv2Crown);

  // Lv.3 Upgrade Stabilizer Fins
  const lv3Halo = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.18), matHullMid);
    fin.position.set(Math.cos(angle) * 0.54, 0.38, Math.sin(angle) * 0.54);
    fin.rotation.y = -angle;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.14, 0.14), matAccent);
    tip.position.set(Math.cos(angle) * 0.57, 0.58, Math.sin(angle) * 0.57);
    tip.rotation.y = -angle;
    lv3Halo.add(fin, tip);
  }
  lv3Halo.visible = false;
  root.add(lv3Halo);
  upgradeNodes.push(lv3Halo);

  // Lv.4 APEX Ultimate Floating Gold/Accent Halo
  const apexRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 8, 28), matApexGold);
  apexRing.rotation.x = Math.PI / 2;
  apexRing.position.y = 1.48;
  apexRing.visible = false;
  root.add(apexRing);
  upgradeNodes.push(apexRing);

  turretHead.position.y = 0.42;
  root.add(turretHead);
  turretHead.add(recoilGroup);

  let muzzleLocal = new THREE.Vector3(0, 0.72, 0.85);
  let spinNode: THREE.Object3D | undefined;

  if (type === 'laser') {
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
  } else if (type === 'armor_pen') {
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
 * - Bit-Crawler (Hexagonal Malware Spider Drone)
 * - Zero-Day Worm (Fast Crystalline Micro-Virus)
 * - Packet Phantom (Swept-Wing Hover Interceptor)
 * - Trojan Juggernaut (Heavy Armored Security-Breach Mech)
 * - Firewall Breaker (Stage 2 Mid-Boss Hover Dreadnought)
 * - OMEGA-0 Rootkit (Final Stage Boss Cyber-Citadel Monolith)
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
    emissiveIntensity: 1.15,
    metalness: 0.25,
    roughness: 0.2,
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
    // Hexagonal Cyber Arachnid Malware Drone
    const carapace = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.22, 6), matDark);
    carapace.position.set(0, 0.36, 0);
    carapace.castShadow = true;
    bodyGroup.add(carapace);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), matPrimary);
    core.position.set(0, 0.5, 0);
    bodyGroup.add(core);

    const eyeVisor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.12), matAccent);
    eyeVisor.position.set(0, 0.4, 0.32);
    bodyGroup.add(eyeVisor);

    // 4 articulated cyber spider legs
    for (const sx of [-1, 1]) {
      for (const sz of [-0.22, 0.22]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.08), matPrimary);
        leg.position.set(sx * 0.36, 0.2, sz);
        leg.rotation.z = sx * -0.55;
        leg.castShadow = true;
        bodyGroup.add(leg);
      }
    }
    hpBarY = 1.15;
  } else if (type === 'worm_swarm') {
    // Zero-Day Worm: Sleek darting micro-virus diamond cluster
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.64, 4), matPrimary);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.38, 0.08);
    nose.castShadow = true;
    bodyGroup.add(nose);

    const tail = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), matAccent);
    tail.position.set(0, 0.38, -0.32);
    bodyGroup.add(tail);

    const finRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 4), matDark);
    finRing.position.set(0, 0.38, -0.05);
    bodyGroup.add(finRing);
    crownOrWings = finRing;
    hpBarY = 1.0;
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
    // Trojan Juggernaut: Heavy Armored Cyber Breach Walker with Front Riot Shield Plates
    for (const sx of [-0.26, 0.26]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.28), matDark);
      leg.position.set(sx, 0.23, 0);
      leg.castShadow = true;
      bodyGroup.add(leg);
    }
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.64, 6), matPrimary);
    hull.position.set(0, 0.72, 0);
    hull.castShadow = true;
    bodyGroup.add(hull);

    // Armored hexagonal shield pauldrons (clear cue for Armor!)
    for (const sx of [-0.48, 0.48]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.54), matDark);
      plate.position.set(sx, 0.8, 0.06);
      plate.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.44), matAccent);
      trim.position.set(sx, 0.96, 0.08);
      bodyGroup.add(plate, trim);
    }
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.12), matAccent);
    visor.position.set(0, 0.9, 0.42);
    bodyGroup.add(visor);
    hpBarY = 1.62;
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
    // FINAL STAGE BOSS: OMEGA-0 ROOTKIT OVERLORD
    // Towering Obsidian & Crimson Cyber-Citadel Core with Dual Counter-Rotating Glitch Rings!
    const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(0.86, 0), matPrimary);
    monolith.scale.set(1.0, 1.48, 0.92);
    monolith.position.set(0, 1.42, 0);
    monolith.castShadow = true;
    bodyGroup.add(monolith);

    const armorShell = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.62, 1.15, 6), matDark);
    armorShell.position.set(0, 1.25, 0);
    armorShell.castShadow = true;
    bodyGroup.add(armorShell);

    // Swept Crimson Wing Blades
    for (const sx of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.22, 0.22), matDark);
      blade.position.set(sx * 1.15, 1.5, -0.15);
      blade.rotation.z = sx * -0.28;
      blade.castShadow = true;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.26), matAccent);
      glow.position.set(sx * 1.46, 1.56, -0.15);
      glow.rotation.z = sx * -0.28;
      bodyGroup.add(blade, glow);
    }

    // Glowing Rootkit Optic Eye
    const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matAccent);
    eye.position.set(0, 1.48, 0.72);
    bodyGroup.add(eye);

    // Counter-rotating Outer & Inner Firewall Glitch Rings
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.065, 8, 28), matAccent);
    outerRing.rotation.x = Math.PI / 2.6;
    outerRing.position.set(0, 1.55, 0);
    bodyGroup.add(outerRing);
    crownOrWings = outerRing;

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.055, 8, 6), matDark);
    innerRing.rotation.x = -Math.PI / 3;
    innerRing.position.set(0, 1.55, 0);
    bodyGroup.add(innerRing);
    secondaryRing = innerRing;

    hpBarY = 3.05;
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
