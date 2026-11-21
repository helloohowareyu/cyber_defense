// Expanded 3D Cyber Arena faithful to Nur's original design (`src/nur/`)
// Preserves Nur's signature cyber deck, cyan/magenta circuit grid, 2-layer Bezier road,
// BaseMusuh crimson portal fortress, BaseUtama cyan defense bunker, and 9 Overclock Pads,
// while adding tidy cyber accessories (neon gate arches, 4 rotating corner radar pylons,
// perimeter server rack arrays, curve bollards) and an open ground raycast plane for Free Placement.

import * as THREE from 'three';
import {
  NUR_ARENA_LENGTH,
  NUR_ARENA_WIDTH,
  NUR_BAKED_PATH,
  NUR_BASE_MUSUH_POS,
  NUR_BASE_UTAMA_POS,
  NUR_NEON_HALF_WIDTH,
  NUR_ROAD_HALF_WIDTH,
  NUR_TOWER_SLOTS,
} from '../game/nurMapData';
import { createCircuitDeckTextures, createRoadChevronMaterial } from './shaders';

export interface NurSlotVisual {
  slotId: number;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  plusMat: THREE.MeshStandardMaterial;
  frameMat: THREE.MeshStandardMaterial;
  padMat: THREE.MeshStandardMaterial;
}

export interface NurArenaHandles {
  root: THREE.Group;
  slots: NurSlotVisual[];
  floorHitMesh: THREE.Mesh;
  roadChevronMat: THREE.ShaderMaterial;
  update: (dt: number, elapsed: number, coreHpRatio: number) => void;
  setWireframe: (enabled: boolean) => void;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  mat: THREE.Material,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  parent.add(mesh);
  return mesh;
}

/**
 * Extrudes a flat ribbon strip along Nur's baked Cubic Bezier curve at height [yBottom, yTop].
 */
function buildPathRibbonGeometry(
  halfWidth: number,
  yBottom: number,
  yTop: number,
  segments = 260
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const leftTop: THREE.Vector3[] = [];
  const rightTop: THREE.Vector3[] = [];
  const leftBot: THREE.Vector3[] = [];
  const rightBot: THREE.Vector3[] = [];
  const dists: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const dist = (i / segments) * NUR_BAKED_PATH.totalLength;
    const sample = NUR_BAKED_PATH.sampleAtDistance(dist);
    const rx = -sample.tangent.z;
    const rz = sample.tangent.x;

    leftTop.push(new THREE.Vector3(sample.pos.x - rx * halfWidth, yTop, sample.pos.z - rz * halfWidth));
    rightTop.push(new THREE.Vector3(sample.pos.x + rx * halfWidth, yTop, sample.pos.z + rz * halfWidth));
    leftBot.push(new THREE.Vector3(sample.pos.x - rx * halfWidth, yBottom, sample.pos.z - rz * halfWidth));
    rightBot.push(new THREE.Vector3(sample.pos.x + rx * halfWidth, yBottom, sample.pos.z + rz * halfWidth));
    dists.push(dist);
  }

  const pushQuad = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    n: THREE.Vector3,
    u0: number,
    u1: number
  ) => {
    const base = positions.length / 3;
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
    for (let k = 0; k < 4; k++) normals.push(n.x, n.y, n.z);
    uvs.push(u0, 0, u0, 1, u1, 0, u1, 1);
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  };

  const up = new THREE.Vector3(0, 1, 0);
  const sideN = new THREE.Vector3();

  for (let i = 0; i < segments; i++) {
    pushQuad(leftTop[i], rightTop[i], leftTop[i + 1], rightTop[i + 1], up, dists[i], dists[i + 1]);
    sideN.subVectors(leftTop[i], rightTop[i]).normalize();
    pushQuad(leftBot[i], leftTop[i], leftBot[i + 1], leftTop[i + 1], sideN, dists[i], dists[i + 1]);
    sideN.negate();
    pushQuad(rightTop[i], rightBot[i], rightTop[i + 1], rightBot[i + 1], sideN, dists[i], dists[i + 1]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Builds flat UV-mapped strip right above the road top for animated directional chevrons.
 */
function buildPathChevronGeometry(halfWidth: number, y: number, segments = 240): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const dist = (i / segments) * NUR_BAKED_PATH.totalLength;
    const sample = NUR_BAKED_PATH.sampleAtDistance(dist);
    const rx = -sample.tangent.z;
    const rz = sample.tangent.x;

    positions.push(
      sample.pos.x - rx * halfWidth,
      y,
      sample.pos.z - rz * halfWidth,
      sample.pos.x + rx * halfWidth,
      y,
      sample.pos.z + rz * halfWidth
    );
    uvs.push(dist, 0, dist, 1);
  }

  for (let i = 0; i < segments; i++) {
    const b = i * 2;
    indices.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function buildNurArena(maxAnisotropy: number): NurArenaHandles {
  const root = new THREE.Group();
  const deckTextures = createCircuitDeckTextures(maxAnisotropy);
  const wireframeTargets: THREE.MeshStandardMaterial[] = [];
  const rotatingRadars: THREE.Object3D[] = [];
  const blinkingLedMats: THREE.MeshStandardMaterial[] = [];

  // 1. Grounded Outer Cyber-Citadel Subdeck & Layered Skyline
  const matOuterDeck = new THREE.MeshStandardMaterial({
    color: 0x050b18,
    metalness: 0.58,
    roughness: 0.7,
  });
  wireframeTargets.push(matOuterDeck);
  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(210, 160), matOuterDeck);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.45;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  const matPylonDark = new THREE.MeshStandardMaterial({
    color: 0x081326,
    metalness: 0.78,
    roughness: 0.36,
  });
  const matPylonMid = new THREE.MeshStandardMaterial({
    color: 0x0f2140,
    metalness: 0.82,
    roughness: 0.3,
  });
  const matPylonTrim = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x00a8e8,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  const matPylonMagenta = new THREE.MeshStandardMaterial({
    color: 0xc026d3,
    emissive: 0xa21caf,
    emissiveIntensity: 0.68,
    roughness: 0.25,
  });

  // Distant back-horizon stepped cyber-citadel skyline (clean foreground)
  const horizonTowers: [number, number, number, number][] = [
    [-26, -21.5, 3.6, 5.2],
    [-16.5, -22.5, 3.0, 3.8],
    [-6.5, -23.5, 4.0, 6.0],
    [4.5, -23.0, 3.4, 4.8],
    [15.0, -22.0, 3.2, 4.2],
    [25.5, -20.5, 3.8, 5.4],
  ];
  horizonTowers.forEach(([sx, sz, sw, sh], idx) => {
    const trim = idx % 2 === 0 ? matPylonTrim : matPylonMagenta;
    addBox(root, [sw, sh * 0.65, sw * 0.85], [sx, -0.45 + sh * 0.325, sz], matPylonDark, false, false);
    addBox(root, [sw * 0.68, sh * 0.45, sw * 0.62], [sx, -0.45 + sh * 0.78, sz], matPylonMid, false, false);
    addBox(root, [sw * 0.72, 0.08, sw * 0.66], [sx, -0.45 + sh * 0.94, sz], trim, false, false);
    addBox(root, [sw * 1.02, 0.07, sw * 0.88], [sx, -0.45 + sh * 0.56, sz], trim, false, false);
  });

  // Subtle glowing outer deck power conduits anchoring the arena
  for (const cx of [-14, 0, 14]) {
    addBox(root, [0.12, 0.02, 18], [cx, -0.43, -NUR_ARENA_LENGTH * 0.5 - 9.2], matPylonTrim, false, false);
    addBox(root, [0.12, 0.02, 16], [cx, -0.43, NUR_ARENA_LENGTH * 0.5 + 8.2], matPylonTrim, false, false);
  }

  // 2. Expanded Nur Cyber Arena Floor (40m x 24m)
  const matArenaFloor = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: deckTextures.map,
    bumpMap: deckTextures.bumpMap,
    bumpScale: 0.04,
    roughnessMap: deckTextures.roughnessMap,
    metalness: 0.65,
    roughness: 0.42,
  });
  wireframeTargets.push(matArenaFloor);
  const arenaBoard = new THREE.Mesh(
    new THREE.BoxGeometry(NUR_ARENA_WIDTH, 0.42, NUR_ARENA_LENGTH),
    matArenaFloor
  );
  arenaBoard.position.set(0, -0.21, 0);
  arenaBoard.receiveShadow = true;
  root.add(arenaBoard);

  // Invisible top plane at y = 0 for exact BTD6-style Free Placement raycasting across the arena
  const floorHitMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(NUR_ARENA_WIDTH + 6, NUR_ARENA_LENGTH + 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  floorHitMesh.rotation.x = -Math.PI / 2;
  floorHitMesh.position.y = 0.02;
  root.add(floorHitMesh);

  // Arena outer chamfered border rails + neon edge rails
  const matBorderRail = new THREE.MeshStandardMaterial({
    color: 0x102341,
    metalness: 0.85,
    roughness: 0.25,
  });
  const matBorderNeon = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x00b8e6,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });
  const hx = NUR_ARENA_WIDTH * 0.5;
  const hz = NUR_ARENA_LENGTH * 0.5;
  addBox(root, [NUR_ARENA_WIDTH + 0.8, 0.36, 0.42], [0, -0.04, -hz - 0.21], matBorderRail, false, true);
  addBox(root, [NUR_ARENA_WIDTH + 0.8, 0.36, 0.42], [0, -0.04, hz + 0.21], matBorderRail, false, true);
  addBox(root, [0.42, 0.36, NUR_ARENA_LENGTH + 0.8], [-hx - 0.21, -0.04, 0], matBorderRail, false, true);
  addBox(root, [0.42, 0.36, NUR_ARENA_LENGTH + 0.8], [hx + 0.21, -0.04, 0], matBorderRail, false, true);
  addBox(root, [NUR_ARENA_WIDTH + 0.2, 0.045, 0.08], [0, 0.14, -hz], matBorderNeon, false, false);
  addBox(root, [NUR_ARENA_WIDTH + 0.2, 0.045, 0.08], [0, 0.14, hz], matBorderNeon, false, false);
  addBox(root, [0.08, 0.045, NUR_ARENA_LENGTH + 0.2], [-hx, 0.14, 0], matBorderNeon, false, false);
  addBox(root, [0.08, 0.045, NUR_ARENA_LENGTH + 0.2], [hx, 0.14, 0], matBorderNeon, false, false);

  // 3. Nur's Signature Cyan & Magenta Circuit Grid Lines (scaled cleanly to 40x24 -> 9x6 grid)
  const matGridCyan = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x00c8ff,
    emissiveIntensity: 0.88,
    roughness: 0.25,
  });
  const matGridMagenta = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xc026d3,
    emissiveIntensity: 0.82,
    roughness: 0.25,
  });
  for (let i = 0; i < 9; i++) {
    const px = -hx + 2.4 + ((NUR_ARENA_WIDTH - 4.8) * i) / 8;
    addBox(root, [0.042, 0.014, NUR_ARENA_LENGTH - 2.2], [px, 0.008, 0], i % 3 === 1 ? matGridMagenta : matGridCyan, false, false);
  }
  for (let j = 0; j < 6; j++) {
    const pz = -hz + 2.0 + ((NUR_ARENA_LENGTH - 4.0) * j) / 5;
    addBox(root, [NUR_ARENA_WIDTH - 2.4, 0.014, 0.042], [0, 0.008, pz], j % 2 === 1 ? matGridMagenta : matGridCyan, false, false);
  }

  // =========================================================================
  // 3B. TIDY CYBER MAP ACCESSORIES (Mounted cleanly on outer border / non-blocking!)
  // =========================================================================
  const matRackBody = new THREE.MeshStandardMaterial({ color: 0x0b162a, metalness: 0.82, roughness: 0.3 });
  const matRackSteel = new THREE.MeshStandardMaterial({ color: 0x1e3a6b, metalness: 0.88, roughness: 0.22 });
  const matLedCyan = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const matLedAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  blinkingLedMats.push(matLedCyan, matLedAmber);

  // (a) 4 Corner Telemetry Radar Pylons (mounted cleanly outside the 4 arena corners)
  const cornerCoords: [number, number][] = [
    [-hx - 0.55, -hz - 0.55],
    [hx + 0.55, -hz - 0.55],
    [-hx - 0.55, hz + 0.55],
    [hx + 0.55, hz + 0.55],
  ];
  cornerCoords.forEach(([cx, cz]) => {
    const pylon = new THREE.Group();
    pylon.position.set(cx, 0, cz);
    root.add(pylon);

    addBox(pylon, [1.25, 0.45, 1.25], [0, 0.12, 0], matRackBody, false, true);
    addBox(pylon, [0.76, 1.35, 0.76], [0, 0.95, 0], matRackSteel, true, false);
    addBox(pylon, [0.82, 0.08, 0.82], [0, 1.48, 0], matBorderNeon, false, false);

    // Rotating Cyber Radar Dish Head
    const dishHead = new THREE.Group();
    dishHead.position.y = 1.78;
    addBox(dishHead, [0.24, 0.28, 0.24], [0, 0, 0], matRackBody, false, false);
    addBox(dishHead, [0.95, 0.34, 0.08], [0, 0.14, 0.22], matRackSteel, false, false);
    addBox(dishHead, [0.76, 0.06, 0.1], [0, 0.14, 0.26], matLedCyan, false, false);
    pylon.add(dishHead);
    rotatingRadars.push(dishHead);
  });

  // (b) Perimeter Server Rack Arrays flush outside North & South border walls
  const rackXs = [-12.5, -5.0, 5.0, 12.5];
  for (const rx of rackXs) {
    for (const side of [-1, 1]) {
      const rz = side * (hz + 0.95);
      const rack = new THREE.Group();
      rack.position.set(rx, 0, rz);
      root.add(rack);
      addBox(rack, [3.2, 0.72, 0.9], [0, 0.22, 0], matRackBody, true, true);
      addBox(rack, [2.9, 0.12, 0.96], [0, 0.62, 0], matRackSteel, false, false);
      // Tiny cyber status LED strips facing the arena
      const faceZ = -side * 0.47;
      addBox(rack, [0.85, 0.06, 0.04], [-0.85, 0.36, faceZ], matLedCyan, false, false);
      addBox(rack, [0.65, 0.06, 0.04], [0.05, 0.36, faceZ], matPylonMagenta, false, false);
      addBox(rack, [0.75, 0.06, 0.04], [0.92, 0.36, faceZ], matLedAmber, false, false);
    }
  }

  // (c) Twin Holographic Neon Gate Arches framing Spawn Exit & Core Entrance
  const buildGateArch = (xPos: number, neonMat: THREE.Material) => {
    const arch = new THREE.Group();
    arch.position.set(xPos, 0, 0);
    root.add(arch);
    for (const sz of [-1.45, 1.45]) {
      addBox(arch, [0.42, 2.35, 0.42], [0, 1.18, sz], matRackBody, true, false);
      addBox(arch, [0.48, 0.14, 0.48], [0, 1.95, sz], neonMat, false, false);
    }
    addBox(arch, [0.46, 0.3, 3.35], [0, 2.38, 0], matRackSteel, true, false);
    addBox(arch, [0.16, 0.08, 2.75], [0, 2.2, 0], neonMat, false, false);
  };

  // 4. Nur's Extended 2-Layer Extruded Cubic Bezier Road (`SistemJalur`)
  const matRoadNeon = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x00c2ff,
    emissiveIntensity: 0.92,
    roughness: 0.24,
  });
  const matRoadDeck = new THREE.MeshStandardMaterial({
    color: 0x0b2542,
    metalness: 0.55,
    roughness: 0.38,
    emissive: 0x061a30,
    emissiveIntensity: 0.35,
  });
  wireframeTargets.push(matRoadDeck);

  const neonRibbonMesh = new THREE.Mesh(buildPathRibbonGeometry(NUR_NEON_HALF_WIDTH, 0.012, 0.062, 260), matRoadNeon);
  neonRibbonMesh.receiveShadow = true;
  root.add(neonRibbonMesh);

  const roadDeckMesh = new THREE.Mesh(buildPathRibbonGeometry(NUR_ROAD_HALF_WIDTH, 0.062, 0.122, 260), matRoadDeck);
  roadDeckMesh.receiveShadow = true;
  root.add(roadDeckMesh);

  const roadChevronMat = createRoadChevronMaterial();
  const chevronMesh = new THREE.Mesh(buildPathChevronGeometry(NUR_ROAD_HALF_WIDTH * 0.8, 0.135, 240), roadChevronMat);
  root.add(chevronMesh);

  // Subtle low-profile roadside guide bollards tucked right outside curve apices
  const bollardCoords: [number, number][] = [
    [-10.2, -9.25],
    [-3.2, 9.45],
    [4.0, -9.25],
    [11.0, 8.05],
  ];
  for (const [bx, bz] of bollardCoords) {
    addBox(root, [0.28, 0.42, 0.28], [bx, 0.21, bz], matRackBody, false, false);
    addBox(root, [0.32, 0.08, 0.32], [bx, 0.42, bz], matBorderNeon, false, false);
  }

  // =========================================================================
  // 5. BASE MUSUH (Crimson Enemy Portal Fortress at x = -18.0, z = 0)
  // Faithful port of Nur's `src/nur/base_musuh_static_body_3d.gd`
  // =========================================================================
  const baseMusuh = new THREE.Group();
  baseMusuh.position.set(NUR_BASE_MUSUH_POS.x, 0, NUR_BASE_MUSUH_POS.z);
  root.add(baseMusuh);

  const matEnemyArmorDark = new THREE.MeshStandardMaterial({ color: 0x081226, metalness: 0.85, roughness: 0.28 });
  const matEnemyArmorMid = new THREE.MeshStandardMaterial({ color: 0x132547, metalness: 0.82, roughness: 0.22 });
  const matEnemyDeck = new THREE.MeshStandardMaterial({ color: 0x050b18, metalness: 0.78, roughness: 0.35 });
  const matEnemySteel = new THREE.MeshStandardMaterial({ color: 0x1e3a6b, metalness: 0.9, roughness: 0.2 });
  const matEnemyNeon = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    emissive: 0xff1138,
    emissiveIntensity: 1.05,
    roughness: 0.22,
  });
  const matEnemyPortalInner = new THREE.MeshStandardMaterial({
    color: 0x24030b,
    emissive: 0xff1138,
    emissiveIntensity: 1.35,
    roughness: 0.18,
  });
  const matEnemyPortalOuter = new THREE.MeshStandardMaterial({
    color: 0x59071a,
    emissive: 0xe11d48,
    emissiveIntensity: 0.92,
    roughness: 0.24,
  });
  wireframeTargets.push(matEnemyArmorMid);

  // Build Spawn Gate Arch right in front of BaseMusuh
  buildGateArch(NUR_BASE_MUSUH_POS.x + 2.9, matEnemyNeon);

  addBox(baseMusuh, [2.8, 0.24, 3.6], [-0.2, 0.12, 0], matEnemyArmorDark);
  addBox(baseMusuh, [2.42, 0.11, 3.2], [-0.24, 0.285, 0], matEnemyArmorMid);
  addBox(baseMusuh, [0.18, 0.34, 3.4], [-1.54, 0.17, 0], matEnemySteel);
  addBox(baseMusuh, [1.55, 0.14, 2.15], [1.42, 0.07, 0], matEnemyDeck);
  addBox(baseMusuh, [0.32, 0.18, 1.95], [0.76, 0.09, 0], matEnemyArmorMid);
  for (let i = 0; i < 4; i++) {
    addBox(baseMusuh, [0.15, 0.03, 0.76], [0.84 + i * 0.34, 0.15, 0], matEnemyNeon, false, false);
  }
  addBox(baseMusuh, [0.06, 0.07, 2.5], [-1.64, 0.24, 0], matEnemyNeon, false, false);
  addBox(baseMusuh, [2.45, 0.065, 0.075], [-0.24, 0.17, -1.82], matEnemyNeon, false, false);
  addBox(baseMusuh, [2.45, 0.065, 0.075], [-0.24, 0.17, 1.82], matEnemyNeon, false, false);

  addBox(baseMusuh, [1.02, 1.42, 2.28], [-0.25, 0.98, 0], matEnemyArmorDark);
  addBox(baseMusuh, [1.32, 0.36, 1.78], [0.12, 1.52, 0], matEnemyArmorMid);
  addBox(baseMusuh, [0.68, 0.22, 0.42], [0.22, 1.44, -1.05], matEnemySteel);
  addBox(baseMusuh, [0.68, 0.22, 0.42], [0.22, 1.44, 1.05], matEnemySteel);
  addBox(baseMusuh, [0.62, 0.52, 1.04], [0.42, 1.86, 0], matEnemyArmorMid);
  addBox(baseMusuh, [0.14, 0.28, 0.56], [0.74, 1.86, 0], matEnemyNeon, false, false);
  addBox(baseMusuh, [0.2, 0.94, 1.26], [0.22, 0.78, 0], matEnemyPortalOuter, false, false);
  addBox(baseMusuh, [0.18, 0.78, 0.98], [0.36, 0.76, 0], matEnemyPortalInner, false, false);
  addBox(baseMusuh, [0.22, 0.84, 0.08], [0.41, 0.76, 0], matEnemyNeon, false, false);
  addBox(baseMusuh, [0.46, 0.085, 1.48], [0.42, 1.29, 0], matEnemyNeon, false, false);
  addBox(baseMusuh, [0.46, 1.04, 0.085], [0.42, 0.78, -0.71], matEnemyNeon, false, false);
  addBox(baseMusuh, [0.46, 1.04, 0.085], [0.42, 0.78, 0.71], matEnemyNeon, false, false);

  for (const sideZ of [-1.25, 1.25]) {
    addBox(baseMusuh, [0.98, 0.8, 0.82], [-0.35, 0.68, sideZ], matEnemyArmorDark);
    addBox(baseMusuh, [0.82, 0.6, 0.68], [-0.35, 1.32, sideZ], matEnemyArmorMid);
    addBox(baseMusuh, [0.11, 0.88, 0.15], [0.07, 0.95, sideZ], matEnemyNeon, false, false);
    addBox(baseMusuh, [0.6, 0.15, 0.5], [-0.35, 1.67, sideZ], matEnemyNeon, false, false);
    addBox(baseMusuh, [0.065, 0.62, 0.065], [-0.42, 2.02, sideZ], matEnemySteel);
    addBox(baseMusuh, [0.16, 0.16, 0.16], [-0.42, 2.36, sideZ], matEnemyNeon, false, false);
    addBox(baseMusuh, [0.86, 0.5, 0.76], [0.78, 0.5, sideZ], matEnemyArmorMid);
    addBox(baseMusuh, [0.36, 0.075, 0.38], [0.92, 0.77, sideZ], matEnemyNeon, false, false);
  }

  const enemyFloatCore = new THREE.Group();
  enemyFloatCore.scale.setScalar(1.32);
  addBox(enemyFloatCore, [0.52, 0.88, 0.52], [0, 0, 0], matEnemyNeon, false, false);
  addBox(enemyFloatCore, [0.96, 0.08, 0.08], [0, 0, 0], matEnemySteel, false, false);
  addBox(enemyFloatCore, [0.08, 0.08, 0.96], [0, 0, 0], matEnemySteel, false, false);
  addBox(enemyFloatCore, [0.14, 0.28, 0.14], [0, 0.58, 0], matEnemyArmorMid, false, false);
  addBox(enemyFloatCore, [0.14, 0.28, 0.14], [0, -0.58, 0], matEnemyArmorMid, false, false);
  baseMusuh.add(enemyFloatCore);

  const enemyFloatRing = new THREE.Group();
  enemyFloatRing.scale.setScalar(1.32);
  addBox(enemyFloatRing, [0.12, 0.08, 1.25], [0, 0.62, 0], matEnemyNeon, false, false);
  addBox(enemyFloatRing, [0.12, 0.08, 1.25], [0, -0.62, 0], matEnemyNeon, false, false);
  addBox(enemyFloatRing, [0.12, 1.25, 0.08], [0, 0, -0.62], matEnemySteel, false, false);
  addBox(enemyFloatRing, [0.12, 1.25, 0.08], [0, 0, 0.62], matEnemySteel, false, false);
  baseMusuh.add(enemyFloatRing);

  const satL = new THREE.Group();
  const satR = new THREE.Group();
  [satL, satR].forEach((sat, idx) => {
    sat.scale.setScalar(1.25);
    addBox(sat, [0.36, 0.26, 0.36], [0, 0, 0], matEnemyArmorMid, false, false);
    addBox(sat, [0.42, 0.1, 0.18], [0, 0, 0], matEnemyNeon, false, false);
    const zOff = idx === 0 ? -0.14 : 0.14;
    addBox(sat, [0.14, 0.42, 0.06], [0, 0.28, zOff], matEnemySteel, false, false);
    addBox(sat, [0.14, 0.42, 0.06], [0, -0.28, zOff], matEnemySteel, false, false);
    baseMusuh.add(sat);
  });

  // =========================================================================
  // 6. BASE UTAMA / ENERGY CORE (Cyan Defense Bunker at x = +17.8, z = 0)
  // Faithful port of Nur's `src/nur/base_utama_static_body_3d.gd`
  // =========================================================================
  const baseUtama = new THREE.Group();
  baseUtama.position.set(NUR_BASE_UTAMA_POS.x, 0, NUR_BASE_UTAMA_POS.z);
  root.add(baseUtama);

  const matCoreDark = new THREE.MeshStandardMaterial({ color: 0x071428, metalness: 0.88, roughness: 0.25 });
  const matCoreMid = new THREE.MeshStandardMaterial({ color: 0x15305c, metalness: 0.85, roughness: 0.2 });
  const matCoreDeck = new THREE.MeshStandardMaterial({ color: 0x050d1c, metalness: 0.82, roughness: 0.32 });
  const matCoreFrame = new THREE.MeshStandardMaterial({ color: 0x245196, metalness: 0.92, roughness: 0.18 });
  const matCoreNeon = new THREE.MeshStandardMaterial({
    color: 0x00d8ff,
    emissive: 0x00c8ff,
    emissiveIntensity: 1.05,
    roughness: 0.22,
  });
  const matReactorInner = new THREE.MeshStandardMaterial({
    color: 0x032b3e,
    emissive: 0x00d8ff,
    emissiveIntensity: 1.4,
    roughness: 0.16,
  });
  const matReactorOuter = new THREE.MeshStandardMaterial({
    color: 0x095273,
    emissive: 0x00b8e6,
    emissiveIntensity: 0.9,
    roughness: 0.22,
  });
  wireframeTargets.push(matCoreMid);

  // Build Defense Core Arch right in front of BaseUtama
  buildGateArch(NUR_BASE_UTAMA_POS.x - 3.05, matCoreNeon);

  addBox(baseUtama, [3.1, 0.28, 3.9], [0.3, 0.14, 0], matCoreDark);
  addBox(baseUtama, [2.65, 0.24, 3.35], [0.42, 0.4, 0], matCoreMid);
  addBox(baseUtama, [0.22, 0.42, 3.5], [1.74, 0.21, 0], matCoreFrame);
  addBox(baseUtama, [1.35, 0.14, 2.5], [-1.82, 0.07, 0], matCoreDeck);
  addBox(baseUtama, [1.22, 0.04, 0.1], [-1.78, 0.15, -0.62], matCoreNeon, false, false);
  addBox(baseUtama, [1.22, 0.04, 0.1], [-1.78, 0.15, 0.62], matCoreNeon, false, false);
  addBox(baseUtama, [0.5, 0.28, 0.54], [-2.15, 0.26, 0], matCoreMid);
  addBox(baseUtama, [0.52, 0.14, 0.18], [-2.48, 0.34, 0], matCoreFrame);
  addBox(baseUtama, [0.12, 0.12, 0.16], [-2.75, 0.34, 0], matCoreNeon, false, false);

  for (const sz of [-2.12, 2.12]) {
    addBox(baseUtama, [1.45, 0.24, 0.46], [0.25, 0.28, sz], matCoreFrame);
    addBox(baseUtama, [0.3, 0.48, 0.1], [0.75, 0.52, sz], matCoreMid);
    addBox(baseUtama, [1.32, 0.065, 0.085], [0.25, 0.42, sz + (sz < 0 ? -0.23 : 0.23)], matCoreNeon, false, false);
  }
  addBox(baseUtama, [2.9, 0.07, 0.085], [0.35, 0.27, -1.97], matCoreNeon, false, false);
  addBox(baseUtama, [2.9, 0.07, 0.085], [0.35, 0.27, 1.97], matCoreNeon, false, false);
  addBox(baseUtama, [0.085, 0.07, 3.7], [1.81, 0.27, 0], matCoreNeon, false, false);

  addBox(baseUtama, [1.72, 0.36, 2.02], [0.2, 0.68, 0], matCoreDark);
  addBox(baseUtama, [1.32, 0.44, 1.58], [0.2, 1.02, 0], matCoreMid);
  addBox(baseUtama, [0.88, 0.28, 1.08], [0.2, 1.34, 0], matCoreFrame);
  addBox(baseUtama, [1.62, 0.1, 1.88], [0.2, 0.88, 0], matCoreNeon, false, false);
  addBox(baseUtama, [0.66, 0.09, 0.82], [0.2, 1.5, 0], matCoreNeon, false, false);
  for (const px of [-0.62, 1.02]) {
    for (const pz of [-0.92, 0.92]) {
      addBox(baseUtama, [0.24, 0.72, 0.24], [px, 0.88, pz], matCoreFrame);
      addBox(baseUtama, [0.08, 0.46, 0.08], [px - 0.13, 0.92, pz], matCoreNeon, false, false);
    }
  }

  for (const sideZ of [-1.42, 1.42]) {
    addBox(baseUtama, [0.92, 0.46, 0.86], [0.38, 0.74, sideZ], matCoreDark);
    addBox(baseUtama, [0.7, 0.36, 0.7], [0.3, 1.13, sideZ], matCoreMid);
    addBox(baseUtama, [0.13, 0.18, 0.46], [-0.07, 1.13, sideZ], matCoreNeon, false, false);
    addBox(baseUtama, [0.065, 0.52, 0.065], [0.42, 1.54, sideZ], matCoreFrame);
    addBox(baseUtama, [0.095, 0.34, 0.62], [0.32, 1.82, sideZ], matCoreNeon, false, false);
  }

  const reactorCore = new THREE.Group();
  reactorCore.scale.setScalar(1.25);
  addBox(reactorCore, [0.54, 0.54, 0.54], [0, 0, 0], matReactorOuter, false, false);
  addBox(reactorCore, [0.34, 0.34, 0.34], [0, 0, 0], matCoreNeon, false, false);
  addBox(reactorCore, [1.04, 0.085, 0.13], [0, 0, 0], matCoreFrame, false, false);
  addBox(reactorCore, [0.13, 0.085, 1.04], [0, 0, 0], matCoreFrame, false, false);
  baseUtama.add(reactorCore);

  const gyroOuter = new THREE.Group();
  gyroOuter.scale.setScalar(1.25);
  addBox(gyroOuter, [0.1, 0.15, 1.36], [-0.68, 0, 0], matCoreNeon, false, false);
  addBox(gyroOuter, [0.1, 0.15, 1.36], [0.68, 0, 0], matCoreNeon, false, false);
  addBox(gyroOuter, [1.36, 0.15, 0.1], [0, 0, -0.68], matCoreFrame, false, false);
  addBox(gyroOuter, [1.36, 0.15, 0.1], [0, 0, 0.68], matCoreFrame, false, false);
  baseUtama.add(gyroOuter);

  const gyroInner = new THREE.Group();
  gyroInner.scale.setScalar(1.25);
  addBox(gyroInner, [1.0, 0.09, 0.09], [0, 0.5, 0], matCoreNeon, false, false);
  addBox(gyroInner, [1.0, 0.09, 0.09], [0, -0.5, 0], matCoreNeon, false, false);
  addBox(gyroInner, [0.09, 1.0, 0.09], [0, 0, -0.5], matCoreMid, false, false);
  addBox(gyroInner, [0.09, 1.0, 0.09], [0, 0, 0.5], matCoreMid, false, false);
  baseUtama.add(gyroInner);

  const droneL = new THREE.Group();
  const droneR = new THREE.Group();
  [droneL, droneR].forEach((drone, idx) => {
    drone.scale.setScalar(1.2);
    addBox(drone, [0.36, 0.32, 0.36], [0, 0, 0], matCoreMid, false, false);
    addBox(drone, [0.44, 0.11, 0.18], [0, 0, 0], matCoreNeon, false, false);
    addBox(drone, [0.14, 0.48, 0.08], [0, 0, idx === 0 ? -0.24 : 0.24], matCoreFrame, false, false);
    baseUtama.add(drone);
  });

  // =========================================================================
  // 7. NUR'S 9 CYBER OVERCLOCK BONUS PADS (`slot_menara_3d.gd`)
  // Free placement works ANYWHERE; placing on these glowing pads grants +15% Range & +12% Fire Rate!
  // =========================================================================
  const slots: NurSlotVisual[] = [];

  for (const s of NUR_TOWER_SLOTS) {
    const group = new THREE.Group();
    group.position.set(s.position.x, 0, s.position.z);
    group.rotation.y = s.yaw;
    root.add(group);

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0e172a,
      metalness: 0.78,
      roughness: 0.36,
    });
    const plusMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Locked state by default — turns glowing amber-gold once purchased!
      emissive: 0x334155,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      emissive: 0x1e293b,
      emissiveIntensity: 0.3,
      roughness: 0.35,
    });

    addBox(group, [s.padSize, 0.09, s.padSize], [0, 0.045, 0], padMat, false, true);

    const edge = s.padSize * 0.5 - 0.04;
    addBox(group, [s.padSize, 0.025, 0.055], [0, 0.092, -edge], frameMat, false, false);
    addBox(group, [s.padSize, 0.025, 0.055], [0, 0.092, edge], frameMat, false, false);
    addBox(group, [0.055, 0.025, s.padSize], [-edge, 0.092, 0], frameMat, false, false);
    addBox(group, [0.055, 0.025, s.padSize], [edge, 0.092, 0], frameMat, false, false);

    // Nur's signature '+' marker in the center of each Overclock Pad
    addBox(group, [0.42, 0.036, 0.08], [0, 0.1, 0], plusMat, false, false);
    addBox(group, [0.08, 0.036, 0.42], [0, 0.1, 0], plusMat, false, false);

    // Invisible click collider for selecting/purchasing locked Overclock Pads
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(s.padSize * 1.15, 0.36, s.padSize * 1.15),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(0, 0.18, 0);
    hitMesh.userData = { padId: s.id };
    group.add(hitMesh);

    slots.push({
      slotId: s.id,
      group,
      hitMesh,
      plusMat,
      frameMat,
      padMat,
    });
  }

  const _cyanCol = new THREE.Color(0x00d8ff);
  const _warnCol = new THREE.Color(0xff2a4a);
  const _blendCol = new THREE.Color();

  const update = (dt: number, elapsed: number, coreHpRatio: number) => {
    roadChevronMat.uniforms.uTime.value = elapsed;

    // Rotate 4 corner radar dishes smoothly
    rotatingRadars.forEach((dish, idx) => {
      dish.rotation.y = elapsed * (idx % 2 === 0 ? 0.65 : -0.65) + idx * 1.4;
    });
    // Subtle server LED pulse
    matLedCyan.emissiveIntensity = 0.78 + 0.28 * Math.sin(elapsed * 2.4);
    matLedAmber.emissiveIntensity = 0.72 + 0.32 * Math.cos(elapsed * 3.1);

    // BaseMusuh floating animation
    const enemyBob = Math.sin(elapsed * 2.6) * 0.16;
    enemyFloatCore.position.set(0.45, 3.05 + enemyBob, 0);
    enemyFloatCore.rotation.y += dt * 1.1;

    enemyFloatRing.position.set(0.45, 3.05 + enemyBob, 0);
    enemyFloatRing.rotation.x = THREE.MathUtils.degToRad(28) + Math.sin(elapsed * 1.8) * 0.15;
    enemyFloatRing.rotation.z -= dt * 1.25;

    const satBob = Math.cos(elapsed * 2.6) * 0.14;
    satL.position.set(0.3, 2.93 + satBob, -1.65);
    satL.rotation.x += dt * 0.85;
    satR.position.set(0.3, 2.93 + satBob, 1.65);
    satR.rotation.x -= dt * 0.85;

    matEnemyNeon.emissiveIntensity = 0.98 + 0.22 * Math.sin(elapsed * 3.0);

    // BaseUtama floating animation
    const coreBob = Math.sin(elapsed * 2.5) * 0.16;
    reactorCore.position.set(-0.15, 3.2 + coreBob, 0);
    reactorCore.rotation.y -= dt * 1.2;
    reactorCore.rotation.x = Math.sin(elapsed * 1.25) * 0.15;

    gyroOuter.position.set(-0.15, 3.2 + coreBob, 0);
    gyroOuter.rotation.x = THREE.MathUtils.degToRad(25);
    gyroOuter.rotation.y += dt * 1.65;

    gyroInner.position.set(-0.15, 3.2 + coreBob, 0);
    gyroInner.rotation.z = THREE.MathUtils.degToRad(-22);
    gyroInner.rotation.x -= dt * 1.9;

    const droneBob = Math.cos(elapsed * 2.5) * 0.15;
    droneL.position.set(-0.15, 3.1 + droneBob, -1.78);
    droneL.rotation.y += dt * 0.95;
    droneR.position.set(-0.15, 3.1 + droneBob, 1.78);
    droneR.rotation.y -= dt * 0.95;

    const danger = THREE.MathUtils.clamp((0.45 - coreHpRatio) / 0.45, 0, 1);
    _blendCol.copy(_cyanCol).lerp(_warnCol, danger);
    matCoreNeon.color.copy(_blendCol);
    matCoreNeon.emissive.copy(_blendCol);
    matReactorInner.emissive.copy(_blendCol);
    matCoreNeon.emissiveIntensity = 0.96 + 0.24 * Math.sin(elapsed * (danger > 0.3 ? 6.5 : 2.8));
  };

  const setWireframe = (enabled: boolean) => {
    for (const mat of wireframeTargets) {
      mat.wireframe = enabled;
    }
  };

  return {
    root,
    slots,
    floorHitMesh,
    roadChevronMat,
    update,
    setWireframe,
  };
}
