// Cyber Defense 3D — Core WebGL2 / Three.js Engine
// Integrates:
// - Nur's 3D Map, Cubic Bezier Path, BaseMusuh, BaseUtama, and 9 Road-Snapped Slots
// - Yusuf's CombatMath, TargetSelector, Procedural BufferGeometry, and 3 Custom GLSL Shaders
// - Abiyu's Wave & Core Game State Machine
// - Zulfan's Economy, Upgrade/Sell, Audio, and Local Persistence
// Fully offline, zero external assets, software-WebGL safe (afterDraw pacing + RoomEnvironment).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AOE_GDD_TO_METERS,
  CameraPreset,
  ENEMY_PRESETS,
  EnemyType,
  GamePhase,
  getWaveComposition,
  MAX_TOWER_LEVEL,
  STARTING_CORE_HP,
  STARTING_GOLD,
  TargetingMode,
  TOTAL_WAVES,
  TOWER_PRESETS,
  TowerType,
} from '../game/constants';
import {
  calculateEnemyWaveHp,
  calculateFinalDamage,
  calculateSellRefund,
  calculateUpgradeCost,
  computeTurretYaw,
  distanceXZ,
  getEnemySpeedMps,
  getScaledDamage,
  getScaledRangeGdd,
  getScaledRangeMeters,
  getWaveClearBonus,
} from '../game/combatMath';
import { NUR_BAKED_PATH, NUR_TOWER_SLOTS } from '../game/nurMapData';
import { selectTarget } from '../game/targetSelector';
import { audioSynth } from '../game/audioSynth';
import {
  buildAoeShockwaveGeometry,
  buildEnemyRig,
  buildRangeRingGeometry,
  buildTowerRig,
  EnemyRig,
  TowerRig,
} from './proceduralMeshes';
import {
  createContactShadowTexture,
  createLaserBeamMaterial,
  createLaserPulseTexture,
  createRangeRingMaterial,
} from './shaders';
import { buildNurArena, NurArenaHandles } from './nurArenaBuilder';

export interface SelectedTowerSnapshot {
  id: number;
  slotId: number;
  slotName: string;
  type: TowerType;
  displayName: string;
  level: number;
  damage: number;
  rangeGdd: number;
  rangeMeters: number;
  fireRateSec: number;
  targetingMode: TargetingMode;
  totalInvested: number;
  upgradeCost: number;
  sellRefund: number;
  kills: number;
  accentHex: string;
}

export interface GraphicsLabState {
  projection: 'perspective' | 'orthographic';
  wireframe: boolean;
  shadowsEnabled: boolean;
  showAllRangeRings: boolean;
  cameraPreset: CameraPreset;
  triangles: number;
  drawCalls: number;
  isSoftwareGl: boolean;
}

export interface FloatingTextEvent {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  gold: number;
  coreHp: number;
  maxCoreHp: number;
  wave: number;
  totalWaves: number;
  waveActive: boolean;
  enemiesRemaining: number;
  enemiesDefeated: number;
  score: number;
  timeScale: 1 | 2;
  activeBuildType: TowerType;
  selectedSlotId: number | null;
  selectedTower: SelectedTowerSnapshot | null;
  bossStatus: { name: string; hp: number; maxHp: number } | null;
  bannerMessage: string | null;
  graphics: GraphicsLabState;
}

interface TowerEntity {
  id: number;
  slotId: number;
  type: TowerType;
  level: number;
  totalInvested: number;
  targetingMode: TargetingMode;
  cooldown: number;
  recoil: number;
  kills: number;
  position: THREE.Vector3;
  rig: TowerRig;
  rangeRingMesh: THREE.Mesh;
  rangeRingMat: THREE.ShaderMaterial;
  laserBeamMesh?: THREE.Mesh;
  laserBeamMat?: THREE.ShaderMaterial;
  laserActiveTimer: number;
}

interface EnemyEntity {
  id: number;
  type: EnemyType;
  alive: boolean;
  dying: boolean;
  deathTimer: number;
  currentHp: number;
  maxHp: number;
  armor: number;
  baseSpeed: number;
  rewardGold: number;
  leakDamage: number;
  isBoss: boolean;
  isFlying: boolean;
  distanceTraveled: number;
  pathProgress: number;
  slowTimer: number;
  slowRatio: number;
  hitFlashTimer: number;
  position: THREE.Vector3;
  rig: EnemyRig;
}

interface ProjectileEntity {
  mesh: THREE.Mesh;
  type: TowerType;
  startPos: THREE.Vector3;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetEnemyId: number;
  progress: number;
  duration: number;
  arcHeight: number;
  damage: number;
  aoeRadiusMeters: number;
  slowRatio: number;
  slowDuration: number;
  ignoresArmor: boolean;
  sourceTowerId: number;
}

interface ShockwaveVfx {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  age: number;
  duration: number;
  maxScale: number;
}

interface RailTrailVfx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  color: THREE.Color;
}

const PARTICLE_POOL_SIZE = 180;

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class CyberDefenseEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onFloatText: (evt: FloatingTextEvent) => void;
  private onMatchEnd: (result: {
    won: boolean;
    score: number;
    waveReached: number;
    defeated: number;
  }) => void;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private perspCamera: THREE.PerspectiveCamera;
  private orthoCamera: THREE.OrthographicCamera;
  private activeProjection: 'perspective' | 'orthographic' = 'perspective';

  private keyLight: THREE.DirectionalLight;
  private arena: NurArenaHandles;
  private laserPulseTex: THREE.CanvasTexture;
  private contactShadowTex: THREE.CanvasTexture;

  // Dynamic entity containers
  private entityRoot = new THREE.Group();
  private towers: TowerEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private shockwaves: ShockwaveVfx[] = [];
  private railTrails: RailTrailVfx[] = [];

  // Pooled particles (zero GC in render loop)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;

  // Hover build preview ring
  private previewRingMesh: THREE.Mesh;
  private previewRingMat: THREE.ShaderMaterial;
  private hoveredSlotId: number | null = null;

  // Simulation State
  private phase: GamePhase = 'title';
  private gold = STARTING_GOLD;
  private coreHp = STARTING_CORE_HP;
  private wave = 0;
  private waveActive = false;
  private spawnQueue: { enemyId: EnemyType; delay: number }[] = [];
  private spawnTimer = 0;
  private enemiesDefeated = 0;
  private score = 0;
  private timeScale: 1 | 2 = 1;
  private activeBuildType: TowerType = 'laser';
  private selectedSlotId: number | null = null;
  private bannerMessage: string | null = null;
  private bannerTimer = 0;

  private nextTowerId = 1;
  private nextEnemyId = 1;
  private nextFloatId = 1;

  // Graphics Lab state
  private wireframeEnabled = false;
  private shadowsEnabled = true;
  private showAllRangeRings = false;
  private cameraPreset: CameraPreset = 'tactical';

  // Camera rig (damped spherical orbit + pan target)
  private camTarget = new THREE.Vector3(0, 0.4, 0.2);
  private camTargetGoal = new THREE.Vector3(0, 0.4, 0.2);
  private camYaw = 0;
  private camYawGoal = 0;
  private camPitch = 0.86;
  private camPitchGoal = 0.86;
  private camDist = 27.5;
  private camDistGoal = 27.5;
  private trauma = 0;
  private hitstopTimer = 0;
  private defeatDelayTimer = 0;
  private pendingOutcome: 'victory' | 'gameover' | null = null;

  // Input state
  private keysPressed = new Set<string>();
  private isRightDragging = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private lastPointerMoveRaycast = 0;

  // Loop & throttling
  private disposed = false;
  private frameId = 0;
  private lastTimeMs = 0;
  private elapsed = 0;
  private hudSyncAccum = 0;
  private resizeObserver: ResizeObserver;

  // Scratch vectors/matrices (zero GC inside tick)
  private readonly _v1 = new THREE.Vector3();
  private readonly _v2 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _mat4 = new THREE.Matrix4();
  private readonly _quat = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);

  constructor(
    container: HTMLElement,
    callbacks: {
      onHudUpdate: (snapshot: HudSnapshot) => void;
      onFloatText: (evt: FloatingTextEvent) => void;
      onMatchEnd: (result: { won: boolean; score: number; waveReached: number; defeated: number }) => void;
    }
  ) {
    this.container = container;
    this.onHudUpdate = callbacks.onHudUpdate;
    this.onFloatText = callbacks.onFloatText;
    this.onMatchEnd = callbacks.onMatchEnd;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.shadowsEnabled = !this.isSoftwareGl;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const aspect = width / height;

    // Renderer configured per Three.js studio PBR + Software WebGL spec
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = this.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    // Scene & Horizon-matched Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b18);
    this.scene.fog = new THREE.FogExp2(0x050b18, 0.0115);

    // Mandatory Procedural Studio IBL Environment Map (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Cameras (Perspective + Orthographic for CPMK Bahan Kajian 5)
    this.perspCamera = new THREE.PerspectiveCamera(44, aspect, 0.5, 160);
    const orthoHalfH = 12.5;
    this.orthoCamera = new THREE.OrthographicCamera(
      -orthoHalfH * aspect,
      orthoHalfH * aspect,
      orthoHalfH,
      -orthoHalfH,
      0.5,
      160
    );

    // Balanced 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x8fd4ff, 0x0b152a, 0.95);
    this.scene.add(hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff0d8, 1.85);
    this.keyLight.position.set(14, 24, 15);
    this.keyLight.castShadow = this.shadowsEnabled;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 65;
    this.keyLight.shadow.camera.left = -22;
    this.keyLight.shadow.camera.right = 22;
    this.keyLight.shadow.camera.top = 15;
    this.keyLight.shadow.camera.bottom = -15;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-16, 12, -14);
    this.scene.add(rimLight);

    // Subtle Base accent point lights (2 total, well under budget)
    const enemyBaseLight = new THREE.PointLight(0xff1e42, 4.5, 12, 1.6);
    enemyBaseLight.position.set(-14.0, 3.2, 0);
    this.scene.add(enemyBaseLight);

    const coreBaseLight = new THREE.PointLight(0x00f0ff, 5.0, 13, 1.6);
    coreBaseLight.position.set(13.8, 3.4, 0);
    this.scene.add(coreBaseLight);

    // Build Nur's Faithful 3D Arena
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.arena = buildNurArena(maxAniso);
    this.scene.add(this.arena.root);
    this.scene.add(this.entityRoot);

    // Shared procedural textures
    this.laserPulseTex = createLaserPulseTexture();
    this.contactShadowTex = createContactShadowTexture();

    // Pooled InstancedMesh Particles (zero GC)
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_POOL_SIZE);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 0.5,
        scale: 0,
        color: new THREE.Color(0xffffff),
      });
      this._mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, this._mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    // Hover build preview range ring
    this.previewRingMat = createRangeRingMaterial({ pulseSpeed: 1.5, pulseStrength: 0.28, fade: 0.9 });
    this.previewRingMesh = new THREE.Mesh(
      buildRangeRingGeometry(0.6, getScaledRangeMeters(TOWER_PRESETS.laser.baseRangeGdd, 1), 48),
      this.previewRingMat
    );
    this.previewRingMesh.visible = false;
    this.scene.add(this.previewRingMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.perspCamera);
    }

    // Bind events
    this.bindEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.updateCameraTransform(1);
    this.emitHudSnapshot();

    this.lastTimeMs = performance.now();
    this.scheduleNextTick();
  }

  private get activeCamera(): THREE.Camera {
    return this.activeProjection === 'perspective' ? this.perspCamera : this.orthoCamera;
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: false });
    dom.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('wheel', this.handleWheel);
    dom.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.clearEntities();
    this.laserPulseTex.dispose();
    this.contactShadowTex.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const orthoHalfH = this.camDist * 0.44;
    this.orthoCamera.left = -orthoHalfH * aspect;
    this.orthoCamera.right = orthoHalfH * aspect;
    this.orthoCamera.top = orthoHalfH;
    this.orthoCamera.bottom = -orthoHalfH;
    this.orthoCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleBlur = () => {
    this.keysPressed.clear();
    this.isRightDragging = false;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.keysPressed.clear();
      this.isRightDragging = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keysPressed.add(key);

    if (this.phase !== 'playing') return;

    if (key === '1') this.setActiveBuildType('laser');
    else if (key === '2') this.setActiveBuildType('cannon');
    else if (key === '3') this.setActiveBuildType('freeze');
    else if (key === '4') this.setActiveBuildType('armor_pen');
    else if (key === ' ') {
      e.preventDefault();
      if (!this.waveActive && this.wave < TOTAL_WAVES) this.startNextWave();
    } else if (key === 'u') {
      this.upgradeSelectedTower();
    } else if (key === 'x' || key === 'delete') {
      this.sellSelectedTower();
    } else if (key === 'o') {
      this.setProjection(this.activeProjection === 'perspective' ? 'orthographic' : 'perspective');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.key.toLowerCase());
  };

  private updatePointerNdc(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerMove = (e: PointerEvent) => {
    if (this.isRightDragging && this.phase === 'playing') {
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.camYawGoal -= dx * 0.0055;
      this.camPitchGoal = THREE.MathUtils.clamp(this.camPitchGoal + dy * 0.0045, 0.42, 1.38);
      return;
    }

    if (this.phase !== 'playing') return;
    const now = performance.now();
    if (now - this.lastPointerMoveRaycast < 35) return;
    this.lastPointerMoveRaycast = now;

    this.updatePointerNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.activeCamera);
    const hits = this.raycaster.intersectObjects(this.arena.slotHitMeshes, false);

    if (hits.length > 0) {
      const slotId = hits[0].object.userData.slotId as number;
      this.hoveredSlotId = slotId;
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.hoveredSlotId = null;
      this.renderer.domElement.style.cursor = 'default';
    }
    this.refreshPreviewAndSlots();
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    if (e.button === 2 || e.button === 1) {
      this.isRightDragging = true;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      return;
    }
    if (e.button !== 0) return;

    this.updatePointerNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.activeCamera);
    const hits = this.raycaster.intersectObjects(this.arena.slotHitMeshes, false);

    if (hits.length > 0) {
      const slotId = hits[0].object.userData.slotId as number;
      this.handleSlotClick(slotId);
    } else {
      if (this.selectedSlotId !== null) {
        this.selectedSlotId = null;
        this.refreshPreviewAndSlots();
        this.emitHudSnapshot();
      }
    }
  };

  private handlePointerUp = () => {
    this.isRightDragging = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.phase !== 'playing') return;
    e.preventDefault();
    this.camDistGoal = THREE.MathUtils.clamp(this.camDistGoal + e.deltaY * 0.014, 15, 38);
  };

  // =========================================================================
  // PUBLIC API FOR REACT HUD & CONTROLS
  // =========================================================================

  public startNewGame(): void {
    this.clearEntities();
    this.gold = STARTING_GOLD;
    this.coreHp = STARTING_CORE_HP;
    this.wave = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.enemiesDefeated = 0;
    this.score = 0;
    this.timeScale = 1;
    this.activeBuildType = 'laser';
    this.selectedSlotId = null;
    this.hoveredSlotId = null;
    this.pendingOutcome = null;
    this.defeatDelayTimer = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.keysPressed.clear();
    this.phase = 'playing';
    this.setCameraPreset('tactical');
    this.showBanner('Bangun menara di slot bercahaya, lalu tekan Start Wave');
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  public returnToTitle(): void {
    this.clearEntities();
    this.phase = 'title';
    this.selectedSlotId = null;
    this.hoveredSlotId = null;
    this.previewRingMesh.visible = false;
    this.keysPressed.clear();
    this.emitHudSnapshot();
  }

  public setPaused(paused: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = paused ? 'paused' : 'playing';
    this.keysPressed.clear();
    this.emitHudSnapshot();
  }

  public setTimeScale(scale: 1 | 2): void {
    this.timeScale = scale;
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setActiveBuildType(type: TowerType): void {
    this.activeBuildType = type;
    audioSynth.playUiClick();
    this.rebuildPreviewRingGeometry();
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  public startNextWave(): void {
    if (this.phase !== 'playing' || this.waveActive || this.wave >= TOTAL_WAVES) return;
    this.wave += 1;
    this.waveActive = true;
    const comp = getWaveComposition(this.wave);
    this.spawnQueue = [];
    for (const entry of comp) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({
          enemyId: entry.enemyId,
          delay: i === 0 && this.spawnQueue.length === 0 ? 0.25 : entry.spawnInterval,
        });
      }
    }
    this.spawnTimer = 0.2;
    const isBossWave = this.wave === TOTAL_WAVES;
    audioSynth.playWaveStart(isBossWave);
    if (isBossWave) {
      this.trauma = Math.min(1, this.trauma + 0.45);
      this.showBanner('PERINGATAN: Boss Demon King memasuki sektor!');
    } else {
      this.showBanner(`Wave ${this.wave} dimulai!`);
    }
    this.emitHudSnapshot();
  }

  public buildTowerOnSlot(slotId: number, type: TowerType): boolean {
    if (this.phase !== 'playing') return false;
    const slot = NUR_TOWER_SLOTS[slotId];
    if (!slot) return false;
    if (this.towers.some((t) => t.slotId === slotId)) return false;

    const preset = TOWER_PRESETS[type];
    if (this.gold < preset.baseCost) {
      this.showBanner(`Gold tidak cukup! Butuh ${preset.baseCost}G untuk ${preset.displayName}`);
      return false;
    }

    this.gold -= preset.baseCost;
    const rig = buildTowerRig(type);
    rig.root.position.set(slot.position.x, 0.08, slot.position.z);
    rig.turretHead.rotation.y = slot.yaw;
    this.entityRoot.add(rig.root);

    const rangeMeters = getScaledRangeMeters(preset.baseRangeGdd, 1);
    const rgb = new THREE.Color(preset.accentColor);
    const ringGeo = buildRangeRingGeometry(
      Math.max(0.65, rangeMeters - 0.35),
      rangeMeters,
      56,
      [rgb.r, rgb.g, rgb.b, 0.14],
      [rgb.r, rgb.g, rgb.b, 0.72]
    );
    const ringMat = createRangeRingMaterial({ pulseSpeed: 0.9, pulseStrength: 0.22, fade: 1.0 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(slot.position.x, 0.02, slot.position.z);
    ringMesh.visible = this.showAllRangeRings;
    this.entityRoot.add(ringMesh);

    let laserBeamMesh: THREE.Mesh | undefined;
    let laserBeamMat: THREE.ShaderMaterial | undefined;
    if (type === 'laser') {
      laserBeamMat = createLaserBeamMaterial(this.laserPulseTex, preset.accentColor);
      // Crossed two-plane ribbon so beam looks volumetric from all angles
      const beamGeo = new THREE.PlaneGeometry(1, 0.22);
      beamGeo.translate(0.5, 0, 0);
      laserBeamMesh = new THREE.Mesh(beamGeo, laserBeamMat);
      const crossPlane = new THREE.Mesh(beamGeo, laserBeamMat);
      crossPlane.rotation.x = Math.PI / 2;
      laserBeamMesh.add(crossPlane);
      laserBeamMesh.visible = false;
      this.entityRoot.add(laserBeamMesh);
    }

    const tower: TowerEntity = {
      id: this.nextTowerId++,
      slotId,
      type,
      level: 1,
      totalInvested: preset.baseCost,
      targetingMode: 'FRONT_MOST',
      cooldown: 0.15,
      recoil: 0,
      kills: 0,
      position: new THREE.Vector3(slot.position.x, 0.08, slot.position.z),
      rig,
      rangeRingMesh: ringMesh,
      rangeRingMat: ringMat,
      laserBeamMesh,
      laserBeamMat,
      laserActiveTimer: 0,
    };

    this.towers.push(tower);
    this.selectedSlotId = slotId;
    audioSynth.playBuild();
    this.spawnParticles(tower.position, 14, preset.accentColor, 3.2, 0.45);
    this.pushFloatText(`-${preset.baseCost}G`, tower.position, '#fbbf24');
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
    return true;
  }

  public upgradeSelectedTower(): boolean {
    if (this.phase !== 'playing' || this.selectedSlotId === null) return false;
    const tower = this.towers.find((t) => t.slotId === this.selectedSlotId);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return false;

    const preset = TOWER_PRESETS[tower.type];
    const cost = calculateUpgradeCost(preset.baseCost, tower.level);
    if (this.gold < cost) {
      this.showBanner(`Gold tidak cukup untuk Upgrade (${cost}G)`);
      return false;
    }

    this.gold -= cost;
    tower.totalInvested += cost;
    tower.level += 1;

    // Reveal level visual ornaments & slightly scale up stature
    if (tower.level >= 2 && tower.rig.upgradeNodes[0]) tower.rig.upgradeNodes[0].visible = true;
    if (tower.level >= 3 && tower.rig.upgradeNodes[1]) tower.rig.upgradeNodes[1].visible = true;
    const scaleBoost = 1 + (tower.level - 1) * 0.06;
    tower.rig.root.scale.setScalar(scaleBoost);

    // Rebuild procedural range ring mesh for new +10% range
    const newRange = getScaledRangeMeters(preset.baseRangeGdd, tower.level);
    const rgb = new THREE.Color(preset.accentColor);
    tower.rangeRingMesh.geometry.dispose();
    tower.rangeRingMesh.geometry = buildRangeRingGeometry(
      Math.max(0.65, newRange - 0.35),
      newRange,
      56,
      [rgb.r, rgb.g, rgb.b, 0.14],
      [rgb.r, rgb.g, rgb.b, 0.78]
    );

    audioSynth.playUpgrade();
    this.spawnParticles(tower.position, 18, 0xfbbf24, 4.0, 0.55);
    this.pushFloatText(`LV.${tower.level}`, tower.position, '#38bdf8');
    this.emitHudSnapshot();
    return true;
  }

  public sellSelectedTower(): boolean {
    if (this.phase !== 'playing' || this.selectedSlotId === null) return false;
    const idx = this.towers.findIndex((t) => t.slotId === this.selectedSlotId);
    if (idx < 0) return false;

    const tower = this.towers[idx];
    const refund = calculateSellRefund(tower.totalInvested);
    this.gold += refund;

    this.entityRoot.remove(tower.rig.root);
    this.entityRoot.remove(tower.rangeRingMesh);
    tower.rangeRingMesh.geometry.dispose();
    if (tower.laserBeamMesh) this.entityRoot.remove(tower.laserBeamMesh);

    this.towers.splice(idx, 1);
    this.selectedSlotId = null;

    audioSynth.playSell();
    this.spawnParticles(tower.position, 12, 0xfbbf24, 2.8, 0.4);
    this.pushFloatText(`+${refund}G`, tower.position, '#4ade80');
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
    return true;
  }

  public setSelectedTowerTargeting(mode: TargetingMode): void {
    if (this.selectedSlotId === null) return;
    const tower = this.towers.find((t) => t.slotId === this.selectedSlotId);
    if (!tower) return;
    tower.targetingMode = mode;
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public selectSlot(slotId: number | null): void {
    this.selectedSlotId = slotId;
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  // Graphics Lab Controls (CPMK-1 & CPMK-2 interactive demonstrations)
  public setProjection(proj: 'perspective' | 'orthographic'): void {
    this.activeProjection = proj;
    this.handleResize();
    this.updateCameraTransform(1);
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setWireframe(enabled: boolean): void {
    this.wireframeEnabled = enabled;
    this.arena.setWireframe(enabled);
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setShadowsEnabled(enabled: boolean): void {
    this.shadowsEnabled = enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.keyLight.castShadow = enabled;
    this.renderer.shadowMap.needsUpdate = true;
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setShowAllRangeRings(enabled: boolean): void {
    this.showAllRangeRings = enabled;
    this.refreshPreviewAndSlots();
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
    if (preset === 'tactical') {
      this.camTargetGoal.set(0, 0.4, 0.2);
      this.camYawGoal = 0;
      this.camPitchGoal = 0.86;
      this.camDistGoal = 27.5;
    } else if (preset === 'action') {
      this.camTargetGoal.set(-2.0, 0.6, 0.5);
      this.camYawGoal = -0.32;
      this.camPitchGoal = 0.52;
      this.camDistGoal = 20.5;
    } else if (preset === 'topdown') {
      this.camTargetGoal.set(0, 0, 0);
      this.camYawGoal = 0;
      this.camPitchGoal = 1.48;
      this.camDistGoal = 30.0;
    } else if (preset === 'core') {
      this.camTargetGoal.set(11.5, 1.2, 0);
      this.camYawGoal = -0.68;
      this.camPitchGoal = 0.54;
      this.camDistGoal = 14.5;
    }
    this.emitHudSnapshot();
  }

  // =========================================================================
  // INTERNAL GAMEPLAY HELPERS
  // =========================================================================

  private handleSlotClick(slotId: number): void {
    const existing = this.towers.find((t) => t.slotId === slotId);
    if (existing) {
      this.selectedSlotId = this.selectedSlotId === slotId ? null : slotId;
      audioSynth.playUiClick();
      this.refreshPreviewAndSlots();
      this.emitHudSnapshot();
      return;
    }

    // Empty slot: immediately build the active selected tower type!
    this.buildTowerOnSlot(slotId, this.activeBuildType);
  }

  private rebuildPreviewRingGeometry(): void {
    const preset = TOWER_PRESETS[this.activeBuildType];
    const rangeM = getScaledRangeMeters(preset.baseRangeGdd, 1);
    const affordable = this.gold >= preset.baseCost;
    const rgb = affordable ? new THREE.Color(preset.accentColor) : new THREE.Color(0xff2a4a);
    this.previewRingMesh.geometry.dispose();
    this.previewRingMesh.geometry = buildRangeRingGeometry(
      Math.max(0.65, rangeM - 0.35),
      rangeM,
      48,
      [rgb.r, rgb.g, rgb.b, 0.12],
      [rgb.r, rgb.g, rgb.b, 0.68]
    );
  }

  private refreshPreviewAndSlots(): void {
    const occupiedSet = new Set(this.towers.map((t) => t.slotId));

    for (const s of this.arena.slots) {
      const occupied = occupiedSet.has(s.slotId);
      const isSelected = this.selectedSlotId === s.slotId;
      const isHovered = this.hoveredSlotId === s.slotId;

      if (occupied) {
        s.plusMat.emissiveIntensity = 0.25;
        s.frameMat.color.setHex(isSelected ? 0xfbbf24 : 0x1e3a5f);
        s.frameMat.emissive.setHex(isSelected ? 0xfbbf24 : 0x0c2440);
        s.frameMat.emissiveIntensity = isSelected ? 2.1 : 0.4;
      } else {
        const canAfford = this.gold >= TOWER_PRESETS[this.activeBuildType].baseCost;
        const hiColor = isHovered ? (canAfford ? 0x22d3ee : 0xff2a4a) : 0x00f0ff;
        s.plusMat.color.setHex(hiColor);
        s.plusMat.emissive.setHex(hiColor);
        s.plusMat.emissiveIntensity = isHovered ? 3.2 : 1.7;
        s.frameMat.color.setHex(isHovered ? hiColor : 0x38bdf8);
        s.frameMat.emissive.setHex(isHovered ? hiColor : 0x0284c7);
        s.frameMat.emissiveIntensity = isHovered ? 2.2 : 0.8;
      }
    }

    for (const tower of this.towers) {
      tower.rangeRingMesh.visible = this.showAllRangeRings || tower.slotId === this.selectedSlotId;
    }

    if (
      this.phase === 'playing' &&
      this.hoveredSlotId !== null &&
      !occupiedSet.has(this.hoveredSlotId)
    ) {
      const slot = NUR_TOWER_SLOTS[this.hoveredSlotId];
      this.rebuildPreviewRingGeometry();
      this.previewRingMesh.position.set(slot.position.x, 0.03, slot.position.z);
      this.previewRingMesh.visible = true;
    } else {
      this.previewRingMesh.visible = false;
    }
  }

  private showBanner(msg: string): void {
    this.bannerMessage = msg;
    this.bannerTimer = 3.2;
  }

  private clearEntities(): void {
    for (const t of this.towers) {
      this.entityRoot.remove(t.rig.root);
      this.entityRoot.remove(t.rangeRingMesh);
      t.rangeRingMesh.geometry.dispose();
      if (t.laserBeamMesh) this.entityRoot.remove(t.laserBeamMesh);
    }
    this.towers = [];

    for (const e of this.enemies) {
      this.entityRoot.remove(e.rig.root);
    }
    this.enemies = [];

    for (const p of this.projectiles) {
      this.entityRoot.remove(p.mesh);
    }
    this.projectiles = [];

    for (const s of this.shockwaves) {
      this.entityRoot.remove(s.mesh);
      s.mesh.geometry.dispose();
    }
    this.shockwaves = [];

    for (const r of this.railTrails) {
      this.entityRoot.remove(r.mesh);
      r.mesh.geometry.dispose();
    }
    this.railTrails = [];

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this._mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, this._mat4);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private spawnEnemy(type: EnemyType): void {
    const preset = ENEMY_PRESETS[type];
    const maxHp = calculateEnemyWaveHp(preset.baseHp, this.wave);
    const rig = buildEnemyRig(type, this.contactShadowTex);
    const startSample = NUR_BAKED_PATH.sampleAtDistance(0);
    rig.root.position.set(startSample.pos.x, 0.12, startSample.pos.z);
    rig.root.rotation.y = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    this.entityRoot.add(rig.root);

    const enemy: EnemyEntity = {
      id: this.nextEnemyId++,
      type,
      alive: true,
      dying: false,
      deathTimer: 0,
      currentHp: maxHp,
      maxHp,
      armor: preset.armor,
      baseSpeed: getEnemySpeedMps(preset.speedGdd),
      rewardGold: preset.rewardGold,
      leakDamage: preset.leakDamage,
      isBoss: preset.isBoss,
      isFlying: preset.isFlying,
      distanceTraveled: 0,
      pathProgress: 0,
      slowTimer: 0,
      slowRatio: 0,
      hitFlashTimer: 0,
      position: rig.root.position.clone(),
      rig,
    };

    this.enemies.push(enemy);
    this.spawnParticles(enemy.position, preset.isBoss ? 22 : 8, 0xff1e42, 3.0, 0.45);
  }

  private damageEnemy(
    enemy: EnemyEntity,
    rawDamage: number,
    ignoresArmor: boolean,
    sourceTowerId: number,
    slowRatio = 0,
    slowDuration = 0
  ): void {
    if (!enemy.alive || enemy.dying) return;
    const finalDmg = calculateFinalDamage(rawDamage, enemy.armor, ignoresArmor);
    enemy.currentHp = Math.max(0, enemy.currentHp - finalDmg);
    enemy.hitFlashTimer = 0.065;

    if (slowRatio > 0 && slowDuration > 0) {
      enemy.slowRatio = Math.max(enemy.slowRatio, slowRatio);
      enemy.slowTimer = Math.max(enemy.slowTimer, slowDuration);
    }

    const color = ignoresArmor ? '#fb7185' : slowRatio > 0 ? '#7dd3fc' : '#f8fafc';
    this.pushFloatText(`${Math.round(finalDmg)}`, enemy.position, color);

    if (enemy.currentHp <= 0) {
      enemy.alive = false;
      enemy.dying = true;
      enemy.deathTimer = 0.34;
      this.gold += enemy.rewardGold;
      this.enemiesDefeated += 1;
      this.score += enemy.rewardGold * 10 + (enemy.isBoss ? 500 : 0);

      const tower = this.towers.find((t) => t.id === sourceTowerId);
      if (tower) tower.kills += 1;

      audioSynth.playEnemyKill(enemy.isBoss);
      this.spawnParticles(
        enemy.position,
        enemy.isBoss ? 32 : 14,
        ENEMY_PRESETS[enemy.type].accentColor,
        enemy.isBoss ? 5.8 : 3.6,
        enemy.isBoss ? 0.75 : 0.48
      );
      this.pushFloatText(`+${enemy.rewardGold}G`, enemy.position, '#4ade80');

      if (enemy.isBoss) {
        this.hitstopTimer = 0.065;
        this.trauma = Math.min(1, this.trauma + 0.55);
      }
      this.refreshPreviewAndSlots();
      this.emitHudSnapshot();
    }
  }

  private spawnProjectile(tower: TowerEntity, target: EnemyEntity, damage: number): void {
    const preset = TOWER_PRESETS[tower.type];
    const muzzleWorld = tower.rig.muzzleLocal.clone().applyMatrix4(tower.rig.turretHead.matrixWorld);
    const targetWorld = target.position.clone().add(new THREE.Vector3(0, target.isFlying ? 0.95 : 0.55, 0));

    if (tower.type === 'laser') {
      // Instant scrolling UV Laser Beam + hit sparks
      this.damageEnemy(target, damage, false, tower.id);
      audioSynth.playLaser();
      this.spawnParticles(targetWorld, 5, preset.accentColor, 2.2, 0.25);

      if (tower.laserBeamMesh) {
        const dist = muzzleWorld.distanceTo(targetWorld);
        tower.laserBeamMesh.position.copy(muzzleWorld);
        // Orient local +X axis from muzzle to target
        const dir = this._v1.subVectors(targetWorld, muzzleWorld).normalize();
        const quat = this._quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
        tower.laserBeamMesh.quaternion.copy(quat);
        tower.laserBeamMesh.scale.set(dist, 1, 1);
        tower.laserBeamMesh.visible = true;
        tower.laserActiveTimer = 0.22;
      }
      return;
    }

    if (tower.type === 'armor_pen') {
      // Instant high-velocity electromagnetic railgun beam + slug flash
      this.damageEnemy(target, damage, true, tower.id);
      audioSynth.playArmorPen();
      this.spawnParticles(targetWorld, 12, preset.accentColor, 4.4, 0.35);

      const dist = muzzleWorld.distanceTo(targetWorld);
      const geo = new THREE.CylinderGeometry(0.055, 0.055, dist, 6);
      geo.rotateZ(Math.PI / 2);
      geo.translate(dist * 0.5, 0, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff3b5c,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(muzzleWorld);
      const dir = this._v1.subVectors(targetWorld, muzzleWorld).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      this.entityRoot.add(mesh);
      this.railTrails.push({ mesh, mat, age: 0, duration: 0.22 });
      return;
    }

    // Physical projectile for Cannon (arcing shell) & Freeze (frost shard)
    const isCannon = tower.type === 'cannon';
    const geo = isCannon ? new THREE.SphereGeometry(0.18, 10, 10) : new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: preset.accentColor,
      emissive: preset.accentColor,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(muzzleWorld);
    this.entityRoot.add(mesh);

    const dist = muzzleWorld.distanceTo(targetWorld);
    const speed = isCannon ? 15.5 : 19.0;
    const duration = Math.max(0.12, dist / speed);

    if (isCannon) audioSynth.playCannon();
    else audioSynth.playFreeze();

    this.projectiles.push({
      mesh,
      type: tower.type,
      startPos: muzzleWorld.clone(),
      pos: muzzleWorld.clone(),
      targetPos: targetWorld.clone(),
      targetEnemyId: target.id,
      progress: 0,
      duration,
      arcHeight: isCannon ? Math.min(2.6, 0.9 + dist * 0.16) : 0.35,
      damage,
      aoeRadiusMeters: preset.aoeRadiusGdd * AOE_GDD_TO_METERS,
      slowRatio: preset.slowRatio,
      slowDuration: preset.slowDurationSec,
      ignoresArmor: preset.ignoresArmor,
      sourceTowerId: tower.id,
    });
  }

  private spawnShockwave(pos: THREE.Vector3, radius: number): void {
    const geo = buildAoeShockwaveGeometry(radius, 36);
    const mat = createRangeRingMaterial({ pulseSpeed: 0, pulseStrength: 0, fade: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.04, pos.z);
    mesh.scale.setScalar(0.12);
    this.entityRoot.add(mesh);
    this.shockwaves.push({ mesh, mat, age: 0, duration: 0.38, maxScale: 1.0 });
  }

  private spawnParticles(
    origin: THREE.Vector3,
    count: number,
    colorHex: number,
    speed: number,
    life: number
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      p.active = true;
      p.pos.set(origin.x, origin.y + 0.45, origin.z);
      const theta = Math.random() * Math.PI * 2;
      const elev = 0.25 + Math.random() * 0.95;
      const spd = speed * (0.45 + Math.random() * 0.75);
      p.vel.set(Math.cos(theta) * spd, elev * spd, Math.sin(theta) * spd);
      p.age = 0;
      p.life = life * (0.75 + Math.random() * 0.5);
      p.scale = 0.7 + Math.random() * 0.75;
      p.color.setHex(colorHex);
      this.particleMesh.setColorAt(this.particleCursor === 0 ? PARTICLE_POOL_SIZE - 1 : this.particleCursor - 1, p.color);
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private pushFloatText(text: string, worldPos: THREE.Vector3, color: string): void {
    this._v3.set(worldPos.x, worldPos.y + 1.25, worldPos.z);
    this._v3.project(this.activeCamera);
    // Guard world-to-screen projections per game_title_and_hud.md
    if (this._v3.z < -1 || this._v3.z > 1) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = (this._v3.x * 0.5 + 0.5) * rect.width;
    const y = (-this._v3.y * 0.5 + 0.5) * rect.height;
    this.onFloatText({
      id: this.nextFloatId++,
      text,
      x,
      y,
      color,
    });
  }

  // =========================================================================
  // MAIN SIMULATION & RENDER LOOP (with Software WebGL afterDraw pacing)
  // =========================================================================

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 85);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsed += dt;

    // Real-time visual effects (trauma decay, banner timer, arena animations)
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerMessage = null;
        this.emitHudSnapshot();
      }
    }

    if (this.phase === 'title') {
      // Live World Camera Flyover over Nur's 3D Arena
      this.arena.update(dt, this.elapsed, 1.0);
      this.updateTitleCamera(dt);
    } else if (this.phase === 'playing') {
      this.arena.update(dt, this.elapsed, this.coreHp / STARTING_CORE_HP);
      this.updatePlayerCameraControls(dt);
      this.updateCameraTransform(dt);

      if (this.pendingOutcome) {
        this.defeatDelayTimer -= dt;
        this.updateParticles(dt);
        if (this.defeatDelayTimer <= 0) {
          const won = this.pendingOutcome === 'victory';
          this.phase = won ? 'victory' : 'gameover';
          this.pendingOutcome = null;
          if (won) audioSynth.playVictory();
          else audioSynth.playGameOver();
          this.onMatchEnd({
            won,
            score: this.score,
            waveReached: this.wave,
            defeated: this.enemiesDefeated,
          });
          this.emitHudSnapshot();
        }
      } else if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
        this.updateParticles(dt);
      } else {
        const simDt = dt * this.timeScale;
        this.stepSimulation(simDt, dt);
      }
    } else {
      // Paused / Victory / Game Over: keep smooth camera settle, freeze combat
      this.updateCameraTransform(dt);
    }

    // Update shader uniforms
    this.previewRingMat.uniforms.uTime.value = this.elapsed;
    for (const t of this.towers) {
      t.rangeRingMat.uniforms.uTime.value = this.elapsed;
      if (t.laserBeamMat) t.laserBeamMat.uniforms.uTime.value = this.elapsed;
      for (const pm of t.rig.phongMaterials) pm.uniforms.uTime.value = this.elapsed;
    }

    this.renderer.render(this.scene, this.activeCamera);

    // Throttled HUD sync (<= 8Hz during active wave for live counters & Boss HP)
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.14 && this.phase === 'playing') {
      this.hudSyncAccum = 0;
      this.emitHudSnapshot();
    }

    this.scheduleNextTick();
  }

  private updateTitleCamera(dt: number): void {
    const angle = this.elapsed * 0.16;
    const radius = 26.5;
    const camX = Math.sin(angle) * radius * 0.88;
    const camZ = Math.cos(angle) * radius * 0.72 + 4.5;
    const camY = 12.8 + Math.sin(this.elapsed * 0.35) * 1.4;
    this.perspCamera.position.set(camX, camY, camZ);
    this.perspCamera.lookAt(0, 0.6, 0);
    // Keep ortho synced
    this.orthoCamera.position.copy(this.perspCamera.position);
    this.orthoCamera.lookAt(0, 0.6, 0);
    void dt;
  }

  private updatePlayerCameraControls(dt: number): void {
    const panSpeed = 14.0 * dt;
    let panX = 0;
    let panZ = 0;
    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) panZ -= 1;
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) panZ += 1;
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) panX -= 1;
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) panX += 1;
    if (this.keysPressed.has('q')) this.camYawGoal -= 1.3 * dt;
    if (this.keysPressed.has('e')) this.camYawGoal += 1.3 * dt;

    if (panX !== 0 || panZ !== 0) {
      const cosY = Math.cos(this.camYaw);
      const sinY = Math.sin(this.camYaw);
      const worldDx = panX * cosY + panZ * sinY;
      const worldDz = -panX * sinY + panZ * cosY;
      this.camTargetGoal.x = THREE.MathUtils.clamp(this.camTargetGoal.x + worldDx * panSpeed, -14, 14);
      this.camTargetGoal.z = THREE.MathUtils.clamp(this.camTargetGoal.z + worldDz * panSpeed, -8.5, 8.5);
    }
  }

  private updateCameraTransform(dt: number): void {
    const damp = 1 - Math.exp(-8.5 * dt);
    this.camTarget.lerp(this.camTargetGoal, damp);
    this.camYaw = THREE.MathUtils.lerp(this.camYaw, this.camYawGoal, damp);
    this.camPitch = THREE.MathUtils.lerp(this.camPitch, this.camPitchGoal, damp);
    this.camDist = THREE.MathUtils.lerp(this.camDist, this.camDistGoal, damp);

    const horiz = Math.cos(this.camPitch) * this.camDist;
    const vert = Math.sin(this.camPitch) * this.camDist;

    // Decaying trauma^2 camera shake
    const shake = this.trauma * this.trauma * 0.55;
    const sx = shake > 0.001 ? Math.sin(this.elapsed * 47.0) * shake : 0;
    const sy = shake > 0.001 ? Math.cos(this.elapsed * 53.0) * shake : 0;

    const px = this.camTarget.x + Math.sin(this.camYaw) * horiz + sx;
    const py = this.camTarget.y + vert + sy;
    const pz = this.camTarget.z + Math.cos(this.camYaw) * horiz;

    this.perspCamera.position.set(px, py, pz);
    this.perspCamera.lookAt(this.camTarget);

    this.orthoCamera.position.set(px, py, pz);
    this.orthoCamera.lookAt(this.camTarget);
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const orthoHalfH = this.camDist * 0.44;
    this.orthoCamera.left = -orthoHalfH * aspect;
    this.orthoCamera.right = orthoHalfH * aspect;
    this.orthoCamera.top = orthoHalfH;
    this.orthoCamera.bottom = -orthoHalfH;
    this.orthoCamera.updateProjectionMatrix();
  }

  private stepSimulation(simDt: number, realDt: number): void {
    // 1. Wave Spawner
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer -= simDt;
      if (this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift()!;
        this.spawnEnemy(next.enemyId);
        this.spawnTimer = this.spawnQueue.length > 0 ? this.spawnQueue[0].delay : 0;
      }
    }

    // 2. Update Enemies along Nur's Cubic Bezier Path
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.dying) {
        e.deathTimer -= realDt;
        const frac = Math.max(0, e.deathTimer / 0.34);
        e.rig.bodyGroup.scale.set(1 + (1 - frac) * 0.35, frac, 1 + (1 - frac) * 0.35);
        e.rig.bodyGroup.rotation.z = (1 - frac) * 0.6;
        e.rig.hpBarBg.visible = false;
        e.rig.frozenOverlay.visible = false;
        if (e.deathTimer <= 0) {
          this.entityRoot.remove(e.rig.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Slow timer
      if (e.slowTimer > 0) {
        e.slowTimer -= simDt;
        e.rig.frozenOverlay.visible = true;
        e.rig.frozenOverlay.rotation.y += realDt * 1.4;
        if (e.slowTimer <= 0) {
          e.slowRatio = 0;
          e.rig.frozenOverlay.visible = false;
        }
      }

      // Hit flash feedback
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= realDt;
        const flashIntensity = e.hitFlashTimer > 0 ? 1.5 : 0;
        for (const mat of e.rig.flashMaterials) {
          mat.emissive.setHex(flashIntensity > 0 ? 0xffffff : 0x000000);
          mat.emissiveIntensity = flashIntensity;
        }
      }

      const effSpeed = e.baseSpeed * (1 - e.slowRatio);
      e.distanceTraveled += effSpeed * simDt;

      if (e.distanceTraveled >= NUR_BAKED_PATH.totalLength) {
        // Reached Energy Core!
        e.alive = false;
        this.coreHp = Math.max(0, this.coreHp - e.leakDamage);
        this.trauma = Math.min(1, this.trauma + (e.isBoss ? 0.85 : 0.42));
        audioSynth.playCoreHit();
        this.spawnParticles(e.position, 20, 0xff1e42, 4.5, 0.55);
        this.pushFloatText(`-${e.leakDamage} CORE HP`, e.position, '#ff1e42');

        this.entityRoot.remove(e.rig.root);
        this.enemies.splice(i, 1);

        if (this.coreHp <= 0 && !this.pendingOutcome) {
          this.pendingOutcome = 'gameover';
          this.defeatDelayTimer = 0.55;
        }
        this.emitHudSnapshot();
        continue;
      }

      const sample = NUR_BAKED_PATH.sampleAtDistance(e.distanceTraveled);
      e.pathProgress = sample.progress;
      e.position.set(sample.pos.x, 0.12, sample.pos.z);
      e.rig.root.position.copy(e.position);

      // Smoothly face path tangent
      const targetYaw = Math.atan2(sample.tangent.x, sample.tangent.z);
      e.rig.root.rotation.y = targetYaw;

      // Distance-synced gait bob or hover motion
      if (e.isFlying) {
        e.rig.bodyGroup.position.y = 0.88 + Math.sin(this.elapsed * 5.2 + e.id) * 0.14;
        if (e.rig.crownOrWings) {
          e.rig.crownOrWings.rotation.z = Math.sin(this.elapsed * 9.0 + e.id) * 0.12;
        }
      } else {
        const stride = e.distanceTraveled * (e.isBoss ? 2.4 : 4.6);
        e.rig.bodyGroup.position.y = Math.abs(Math.sin(stride)) * (e.isBoss ? 0.1 : 0.08);
        e.rig.bodyGroup.rotation.z = Math.sin(stride) * 0.06;
        if (e.rig.crownOrWings) {
          e.rig.crownOrWings.rotation.z += realDt * 1.6;
        }
      }

      // Billboard overhead HP bar toward active camera
      e.rig.hpBarBg.quaternion.copy(this.activeCamera.quaternion);
      const hpRatio = Math.max(0.001, e.currentHp / e.maxHp);
      e.rig.hpBarFill.scale.x = hpRatio;
      const barMat = e.rig.hpBarFill.material as THREE.MeshBasicMaterial;
      if (!e.isBoss) {
        barMat.color.setHex(hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xf59e0b : 0xef4444);
      }
    }

    // 3. Update Towers (Target Selection + Orthonormal Turret Aim + Attack)
    for (const tower of this.towers) {
      const preset = TOWER_PRESETS[tower.type];
      const rangeMeters = getScaledRangeMeters(preset.baseRangeGdd, tower.level);
      const dmg = getScaledDamage(preset.baseDamage, tower.level);

      // Spin idle elements (Freeze crystal / Laser prism)
      if (tower.rig.spinNode) {
        tower.rig.spinNode.rotation.y += realDt * (tower.type === 'freeze' ? 1.8 : 2.5);
        if (tower.type === 'freeze') {
          tower.rig.spinNode.position.y = 0.68 + Math.sin(this.elapsed * 3.0 + tower.id) * 0.06;
        }
      }

      // Recover recoil
      if (tower.recoil > 0) {
        tower.recoil = Math.max(0, tower.recoil - realDt * 4.5);
        tower.rig.recoilGroup.position.z = -tower.recoil * 0.22;
      }

      // Laser beam visibility timer
      if (tower.laserActiveTimer > 0) {
        tower.laserActiveTimer -= realDt;
        if (tower.laserActiveTimer <= 0 && tower.laserBeamMesh) {
          tower.laserBeamMesh.visible = false;
        }
      }

      tower.cooldown = Math.max(0, tower.cooldown - simDt);

      const target = selectTarget(tower.position, rangeMeters, this.enemies, tower.targetingMode);
      if (target) {
        const desiredYaw = computeTurretYaw(tower.position, target.position);
        // Shortest-angle yaw damping
        let diff = desiredYaw - tower.rig.turretHead.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        tower.rig.turretHead.rotation.y += diff * (1 - Math.exp(-14 * simDt));

        if (tower.cooldown <= 0) {
          tower.rig.turretHead.updateMatrixWorld(true);
          this.spawnProjectile(tower, target, dmg);
          tower.cooldown = preset.fireRateSec;
          tower.recoil = 1.0;
        }
      }
    }

    // 4. Update Physical Projectiles (Cannon & Freeze)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += simDt / p.duration;

      const liveTarget = this.enemies.find((e) => e.id === p.targetEnemyId && e.alive);
      if (liveTarget) {
        p.targetPos.set(
          liveTarget.position.x,
          liveTarget.position.y + (liveTarget.isFlying ? 0.9 : 0.45),
          liveTarget.position.z
        );
      }

      const t = Math.min(1, p.progress);
      p.pos.lerpVectors(p.startPos, p.targetPos, t);
      p.pos.y += Math.sin(t * Math.PI) * p.arcHeight;
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += realDt * 8;
      p.mesh.rotation.y += realDt * 6;

      if (p.progress >= 1) {
        // Impact!
        if (p.aoeRadiusMeters > 0) {
          // Cannon AoE Splash + Triangulated Shockwave Disc
          this.spawnShockwave(p.targetPos, p.aoeRadiusMeters);
          this.spawnParticles(p.targetPos, 20, 0xfb923c, 5.0, 0.55);
          this.trauma = Math.min(1, this.trauma + 0.18);
          for (const e of this.enemies) {
            if (!e.alive) continue;
            if (distanceXZ(p.targetPos, e.position) <= p.aoeRadiusMeters) {
              this.damageEnemy(e, p.damage, p.ignoresArmor, p.sourceTowerId);
            }
          }
        } else {
          // Single-target impact (Freeze bolt)
          if (liveTarget) {
            this.damageEnemy(
              liveTarget,
              p.damage,
              p.ignoresArmor,
              p.sourceTowerId,
              p.slowRatio,
              p.slowDuration
            );
          }
          this.spawnParticles(p.targetPos, 10, 0x7dd3fc, 2.8, 0.42);
        }

        this.entityRoot.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Update Shockwave Discs & Railgun Trails
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.age += realDt;
      const frac = Math.min(1, s.age / s.duration);
      const eased = 1 - Math.pow(1 - frac, 3);
      s.mesh.scale.setScalar(0.15 + eased * 0.85 * s.maxScale);
      s.mat.uniforms.uFade.value = (1 - frac) * 0.9;
      if (s.age >= s.duration) {
        this.entityRoot.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.railTrails.length - 1; i >= 0; i--) {
      const r = this.railTrails[i];
      r.age += realDt;
      const frac = Math.min(1, r.age / r.duration);
      r.mat.opacity = (1 - frac) * 0.9;
      if (r.age >= r.duration) {
        this.entityRoot.remove(r.mesh);
        r.mesh.geometry.dispose();
        this.railTrails.splice(i, 1);
      }
    }

    // 6. Update Pooled 3D Particles
    this.updateParticles(realDt);

    // 7. Check Wave Clear / Victory Condition
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    if (this.waveActive && this.spawnQueue.length === 0 && aliveCount === 0 && !this.pendingOutcome) {
      this.waveActive = false;
      const bonus = getWaveClearBonus(this.wave);
      this.gold += bonus;
      this.score += bonus * 5 + this.wave * 150;
      this.showBanner(`Wave ${this.wave} selesai! Bonus +${bonus} Gold`);

      if (this.wave >= TOTAL_WAVES) {
        this.pendingOutcome = 'victory';
        this.defeatDelayTimer = 0.65;
      } else {
        audioSynth.playUpgrade();
      }
      this.refreshPreviewAndSlots();
      this.emitHudSnapshot();
    }
  }

  private updateParticles(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        this._mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, this._mat4);
        continue;
      }
      p.vel.y -= 9.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.08) {
        p.pos.y = 0.08;
        p.vel.y *= -0.35;
      }
      const s = p.scale * (1 - p.age / p.life);
      this._scale.set(s, s, s);
      this._quat.setFromAxisAngle(this._up, p.age * 6.0);
      this._mat4.compose(p.pos, this._quat, this._scale);
      this.particleMesh.setMatrixAt(i, this._mat4);
    }
    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private emitHudSnapshot(): void {
    const selectedTowerEntity =
      this.selectedSlotId !== null
        ? this.towers.find((t) => t.slotId === this.selectedSlotId) ?? null
        : null;

    let selectedTower: SelectedTowerSnapshot | null = null;
    if (selectedTowerEntity) {
      const preset = TOWER_PRESETS[selectedTowerEntity.type];
      selectedTower = {
        id: selectedTowerEntity.id,
        slotId: selectedTowerEntity.slotId,
        slotName: `Slot ${selectedTowerEntity.slotId + 1}`,
        type: selectedTowerEntity.type,
        displayName: preset.displayName,
        level: selectedTowerEntity.level,
        damage: getScaledDamage(preset.baseDamage, selectedTowerEntity.level),
        rangeGdd: Math.round(getScaledRangeGdd(preset.baseRangeGdd, selectedTowerEntity.level)),
        rangeMeters: Number(getScaledRangeMeters(preset.baseRangeGdd, selectedTowerEntity.level).toFixed(1)),
        fireRateSec: preset.fireRateSec,
        targetingMode: selectedTowerEntity.targetingMode,
        totalInvested: selectedTowerEntity.totalInvested,
        upgradeCost: calculateUpgradeCost(preset.baseCost, selectedTowerEntity.level),
        sellRefund: calculateSellRefund(selectedTowerEntity.totalInvested),
        kills: selectedTowerEntity.kills,
        accentHex: preset.accentHex,
      };
    }

    const activeBoss = this.enemies.find((e) => e.isBoss && e.alive);
    const bossStatus = activeBoss
      ? {
          name: ENEMY_PRESETS.demon_king.displayName,
          hp: Math.ceil(activeBoss.currentHp),
          maxHp: activeBoss.maxHp,
        }
      : null;

    const aliveEnemies = this.enemies.filter((e) => e.alive).length + this.spawnQueue.length;

    this.onHudUpdate({
      phase: this.phase,
      gold: this.gold,
      coreHp: this.coreHp,
      maxCoreHp: STARTING_CORE_HP,
      wave: this.wave,
      totalWaves: TOTAL_WAVES,
      waveActive: this.waveActive,
      enemiesRemaining: aliveEnemies,
      enemiesDefeated: this.enemiesDefeated,
      score: this.score,
      timeScale: this.timeScale,
      activeBuildType: this.activeBuildType,
      selectedSlotId: this.selectedSlotId,
      selectedTower,
      bossStatus,
      bannerMessage: this.bannerMessage,
      graphics: {
        projection: this.activeProjection,
        wireframe: this.wireframeEnabled,
        shadowsEnabled: this.shadowsEnabled,
        showAllRangeRings: this.showAllRangeRings,
        cameraPreset: this.cameraPreset,
        triangles: this.renderer.info.render.triangles,
        drawCalls: this.renderer.info.render.calls,
        isSoftwareGl: this.isSoftwareGl,
      },
    });
  }
}
