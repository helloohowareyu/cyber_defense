// Cyber Defense 3D — Upgraded BTD6-Inspired WebGL2 / Three.js Engine
// Features:
// - Free Tower Placement anywhere on Nur's expanded 40x24 Cyber Arena + 9 Overclock Bonus Pads (+15% RNG / +12% SPD)
// - 6 Cyber Towers (Laser, Cannon, Cryo, Railgun, Tesla Chain-Lightning, Quantum Data Farm) with Lv.1-4 Evolution
// - Max-Level (Lv.4 APEX) Active Ultimates with Cooldowns, Hotkeys [Q/W/E/R/T/Y], and 3D VFX
// - 6 Cyber-Themed Enemies across 15 Waves (3 Stages + Final Stage Boss OMEGA-0 Rootkit with Escort)
// - 1x / 2x / 3x Speed, Auto-Start Wave, Adaptive Offline Synthwave Music, and CIF65116 Lab Grafika Controls

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  AOE_GDD_TO_METERS,
  CameraPreset,
  DIFFICULTY_PRESETS,
  DifficultyId,
  ENEMY_PRESETS,
  EnemyType,
  GamePhase,
  getWaveComposition,
  getWaveDefinition,
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
  getDifficultyRewardGold,
  getDifficultyTowerCost,
  getEnemySpeedMps,
  getScaledChainCount,
  getScaledDamage,
  getScaledFarmDividend,
  getScaledFarmPacket,
  getScaledFireRate,
  getScaledRangeGdd,
  getScaledRangeMeters,
  getWaveClearBonus,
} from '../game/combatMath';
import {
  NUR_BAKED_PATH,
  NUR_BASE_MUSUH_POS,
  NUR_BASE_UTAMA_POS,
  NUR_TOWER_SLOTS,
  TOWER_FOOTPRINT_RADIUS,
  validateTowerPlacement,
} from '../game/nurMapData';
import { selectTarget } from '../game/targetSelector';
import { audioSynth } from '../game/audioSynth';
import {
  buildAoeShockwaveGeometry,
  buildEnemyRig,
  buildRangeRingGeometry,
  buildTowerRig,
  BLOOM_LAYER,
  createGlowTexture,
  neonBoost,
  TOWER_VISUAL_SCALE,
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

export interface ActiveAbilitySnapshot {
  towerId: number;
  towerType: TowerType;
  abilityName: string;
  hotkey: string;
  description: string;
  cooldownRemaining: number;
  cooldownTotal: number;
  activeRemaining: number;
  ready: boolean;
  accentHex: string;
}

export interface LockedPadSnapshot {
  padId: number;
  name: string;
  unlockCost: number;
  canAfford: boolean;
}

export interface SelectedTowerSnapshot {
  id: number;
  isPinned: boolean;
  overclocked: boolean;
  locationLabel: string;
  type: TowerType;
  displayName: string;
  role: string;
  description: string;
  tierName: string;
  nextTierName: string | null;
  level: number;
  damage: number;
  rangeGdd: number;
  rangeMeters: number;
  fireRateSec: number;
  farmPacketGold: number;
  farmWaveDividend: number;
  chainCount: number;
  targetingMode: TargetingMode;
  totalInvested: number;
  upgradeCost: number;
  sellRefund: number;
  kills: number;
  goldEarned: number;
  accentHex: string;
  ultimate: ActiveAbilitySnapshot | null;
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
  difficulty: DifficultyId;
  overclockUnlockCost: number;
  gold: number;
  coreHp: number;
  maxCoreHp: number;
  wave: number;
  totalWaves: number;
  stageLabel: string;
  waveActive: boolean;
  autoStartWave: boolean;
  enemiesRemaining: number;
  enemiesDefeated: number;
  score: number;
  timeScale: 1 | 2 | 3;
  activeBuildType: TowerType | null;
  selectedTowerId: number | null;
  selectedTower: SelectedTowerSnapshot | null;
  selectedLockedPad: LockedPadSnapshot | null;
  unlockedOverclockCount: number;
  abilities: ActiveAbilitySnapshot[];
  bossStatus: { name: string; role: string; hp: number; maxHp: number; isFinalBoss: boolean } | null;
  bannerMessage: string | null;
  graphics: GraphicsLabState;
}

interface TowerEntity {
  id: number;
  overclockPadId: number | null;
  type: TowerType;
  level: number;
  totalInvested: number;
  targetingMode: TargetingMode;
  cooldown: number;
  farmTimer: number;
  recoil: number;
  kills: number;
  goldEarned: number;
  ultimateCooldown: number;
  ultimateActiveTimer: number;
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
  isFinalBoss: boolean;
  isFlying: boolean;
  distanceTraveled: number;
  pathProgress: number;
  slowTimer: number;
  slowRatio: number;
  frostAge: number;
  frostMistTimer: number;
  stunTimer: number;
  hitFlashTimer: number;
  position: THREE.Vector3;
  rig: EnemyRig;
}

interface ProjectileEntity {
  trailAccum: number;
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

interface BeamTrailVfx {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
}

// Short-lived additive glow sprite: muzzle flashes, hit flares, projectile trails, death bursts
interface FlashVfx {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  age: number;
  duration: number;
  startSize: number;
  endSize: number;
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

const PARTICLE_POOL_SIZE = 240;

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
  private beamTrails: BeamTrailVfx[] = [];
  private flashes: FlashVfx[] = [];
  private readonly _iceTint = new THREE.Color(0x9fd8ff);
  private glowTex: THREE.Texture;

  // Selective bloom: only objects on BLOOM_LAYER (neon parts, beams, flashes, particles) glow;
  // the arena itself is composited untouched on top of it
  private bloomComposer: EffectComposer;
  private bloomRenderPass: RenderPass;
  private composer: EffectComposer;
  private renderPass: RenderPass;

  // Pooled InstancedMesh particles (zero GC in render loop)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;

  // Free-Placement Live Ghost & Range Preview
  private previewRingMesh: THREE.Mesh;
  private previewRingMat: THREE.ShaderMaterial;
  private ghostFootprintMesh: THREE.Mesh;
  private ghostFootprintMat: THREE.MeshBasicMaterial;
  private hoverWorldPos: THREE.Vector3 | null = null;
  private hoverValid = false;
  private hoverOverclockPadId: number | null = null;

  // Simulation State
  private phase: GamePhase = 'title';
  private difficulty: DifficultyId = 'normal';
  private shopOpen = true;
  private gold = STARTING_GOLD;
  private coreHp = STARTING_CORE_HP;
  private maxCoreHp = STARTING_CORE_HP;
  private wave = 0;
  private waveActive = false;
  private autoStartWave = false;
  private autoStartTimer = 0;
  private spawnQueue: { enemyId: EnemyType; delay: number }[] = [];
  private spawnTimer = 0;
  private enemiesDefeated = 0;
  private score = 0;
  private timeScale: 1 | 2 | 3 = 1;
  private activeBuildType: TowerType | null = null;
  private selectedTowerId: number | null = null;
  private hoveredTowerId: number | null = null;
  private selectedLockedPadId: number | null = null;
  private unlockedOverclockPads = new Set<number>();
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

  // Camera rig (calibrated for 40x24 expanded arena so both BaseMusuh & Energy Core clear the Right Tower Shop)
  private camTarget = new THREE.Vector3(5.4, 0.3, 0.2);
  private camTargetGoal = new THREE.Vector3(5.4, 0.3, 0.2);
  private camYaw = 0;
  private camYawGoal = 0;
  private camPitch = 0.88;
  private camPitchGoal = 0.88;
  private camDist = 39.0;
  private camDistGoal = 39.0;
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

  // Scratch math objects
  private readonly _v1 = new THREE.Vector3();
  private readonly _v3 = new THREE.Vector3();
  private readonly _mat4 = new THREE.Matrix4();
  private readonly _quat = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _xAxis = new THREE.Vector3(1, 0, 0);

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

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = this.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b18);
    this.scene.fog = new THREE.FogExp2(0x050b18, 0.0095);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.perspCamera = new THREE.PerspectiveCamera(44, aspect, 0.5, 190);
    const orthoHalfH = 15.2;
    this.orthoCamera = new THREE.OrthographicCamera(
      -orthoHalfH * aspect,
      orthoHalfH * aspect,
      orthoHalfH,
      -orthoHalfH,
      0.5,
      190
    );

    const bloomScale = this.isSoftwareGl ? 0.5 : 1;
    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.setPixelRatio(this.renderer.getPixelRatio() * bloomScale);
    this.bloomComposer.setSize(width, height);
    this.bloomRenderPass = new RenderPass(this.scene, this.perspCamera);
    this.bloomComposer.addPass(this.bloomRenderPass);
    this.bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.35, 0.0));

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.renderPass = new RenderPass(this.scene, this.perspCamera);
    this.composer.addPass(this.renderPass);
    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(tDiffuse, vUv) + texture2D(bloomTexture, vUv);
          }
        `,
      }),
      'tDiffuse'
    );
    this.composer.addPass(mixPass);
    this.composer.addPass(new OutputPass());

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x8fd4ff, 0x0b152a, 0.95);
    this.scene.add(hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff0d8, 1.85);
    this.keyLight.position.set(16, 28, 18);
    this.keyLight.castShadow = this.shadowsEnabled;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 80;
    this.keyLight.shadow.camera.left = -26;
    this.keyLight.shadow.camera.right = 26;
    this.keyLight.shadow.camera.top = 18;
    this.keyLight.shadow.camera.bottom = -18;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-18, 14, -16);
    this.scene.add(rimLight);

    // Base accent lights positioned for expanded 40x24 arena
    const enemyBaseLight = new THREE.PointLight(0xff1744, 4.2, 14, 1.6);
    enemyBaseLight.position.set(NUR_BASE_MUSUH_POS.x + 0.5, 3.2, 0);
    this.scene.add(enemyBaseLight);

    const coreBaseLight = new THREE.PointLight(0x00d8ff, 4.6, 15, 1.6);
    coreBaseLight.position.set(NUR_BASE_UTAMA_POS.x - 0.5, 3.4, 0);
    this.scene.add(coreBaseLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.arena = buildNurArena(maxAniso);
    this.scene.add(this.arena.root);
    this.scene.add(this.entityRoot);

    this.laserPulseTex = createLaserPulseTexture();
    this.glowTex = createGlowTexture();
    this.contactShadowTex = createContactShadowTexture();

    // Pooled InstancedMesh Particles
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_POOL_SIZE);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.layers.enable(BLOOM_LAYER);
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

    // Live Free-Placement Range Ring + Footprint Hologram Disc
    this.previewRingMat = createRangeRingMaterial({ pulseSpeed: 1.5, pulseStrength: 0.28, fade: 0.9 });
    this.previewRingMesh = new THREE.Mesh(
      buildRangeRingGeometry(0.6, getScaledRangeMeters(TOWER_PRESETS.laser.baseRangeGdd, 1), 48),
      this.previewRingMat
    );
    this.previewRingMesh.visible = false;
    this.scene.add(this.previewRingMesh);

    this.ghostFootprintMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.ghostFootprintMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(TOWER_FOOTPRINT_RADIUS, TOWER_FOOTPRINT_RADIUS, 0.24, 16),
      this.ghostFootprintMat
    );
    this.ghostFootprintMesh.visible = false;
    this.scene.add(this.ghostFootprintMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.perspCamera);
    }

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
    audioSynth.stopMusic();

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
    this.bloomComposer.dispose();
    this.composer.dispose();
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
    this.bloomComposer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  // Pass 1 renders only BLOOM_LAYER objects on black and blurs them; pass 2 renders the full
  // scene and adds that glow on top before tone mapping.
  private renderBloomFrame(): void {
    const camera = this.activeCamera;
    const background = this.scene.background;
    const fog = this.scene.fog;
    const savedMask = camera.layers.mask;

    this.scene.background = null;
    this.scene.fog = null;
    camera.layers.set(BLOOM_LAYER);
    this.bloomRenderPass.camera = camera;
    this.bloomComposer.render();

    camera.layers.mask = savedMask;
    this.scene.background = background;
    this.scene.fog = fog;
    this.renderPass.camera = camera;
    this.composer.render();
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
    else if (key === '5') this.setActiveBuildType('tesla');
    else if (key === '6') this.setActiveBuildType('farm');
    else if (key === ' ') {
      e.preventDefault();
      if (!this.waveActive && this.wave < TOTAL_WAVES) this.startNextWave();
    } else if (key === 'u') {
      this.upgradeSelectedTower();
    } else if (key === 'x' || key === 'delete') {
      this.sellSelectedTower();
    } else if (key === 'o') {
      this.setProjection(this.activeProjection === 'perspective' ? 'orthographic' : 'perspective');
    } else if (['q', 'e', 'r', 't', 'y', 'f'].includes(key)) {
      // Trigger matching ready Ultimate ability if any Lv.4 tower owns that hotkey!
      const match = this.towers.find(
        (t) =>
          t.level >= MAX_TOWER_LEVEL &&
          t.ultimateCooldown <= 0 &&
          TOWER_PRESETS[t.type].ultimate.hotkey.toLowerCase() === key
      );
      if (match) {
        this.triggerTowerUltimate(match.id);
      }
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
      this.camPitchGoal = THREE.MathUtils.clamp(this.camPitchGoal + dy * 0.0045, 0.44, 1.4);
      return;
    }

    if (this.phase !== 'playing') return;
    const now = performance.now();
    if (now - this.lastPointerMoveRaycast < 30) return;
    this.lastPointerMoveRaycast = now;

    this.updatePointerNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.activeCamera);

    // 1. Check if hovering over an existing tower -> highlight its range ring & show left inspector!
    const prevHoveredTowerId = this.hoveredTowerId;
    const towerHitMeshes = this.towers.map((t) => t.rig.hitMesh);
    if (towerHitMeshes.length > 0) {
      const tHits = this.raycaster.intersectObjects(towerHitMeshes, false);
      if (tHits.length > 0) {
        const hitTowerId = tHits[0].object.userData.towerId as number;
        this.hoveredTowerId = hitTowerId;
        this.hoverWorldPos = null;
        this.hoverValid = false;
        this.hoverOverclockPadId = null;
        this.renderer.domElement.style.cursor = 'pointer';
        this.refreshPreviewAndSlots();
        if (prevHoveredTowerId !== hitTowerId && this.selectedTowerId === null) {
          this.emitHudSnapshot();
        }
        return;
      }
    }
    this.hoveredTowerId = null;
    if (prevHoveredTowerId !== null && this.selectedTowerId === null) {
      this.emitHudSnapshot();
    }

    // 2. If in build placement mode, raycast Nur's open 40x24 floor plane for Free Placement!
    if (this.activeBuildType) {
      const fHits = this.raycaster.intersectObject(this.arena.floorHitMesh, false);
      if (fHits.length > 0) {
        const pt = fHits[0].point;
        const val = validateTowerPlacement(
          { x: pt.x, y: 0, z: pt.z },
          this.towers.map((t) => t.position),
          this.unlockedOverclockPads
        );
        this.hoverWorldPos = new THREE.Vector3(val.snappedPosition.x, 0, val.snappedPosition.z);
        this.hoverValid = val.valid && this.gold >= this.getTowerCost(this.activeBuildType);
        this.hoverOverclockPadId = val.overclockPadId;
        this.renderer.domElement.style.cursor =
          val.reason === 'locked_overclock_pad'
            ? 'pointer'
            : this.hoverValid
            ? 'crosshair'
            : 'not-allowed';
      } else {
        this.hoverWorldPos = null;
        this.hoverValid = false;
        this.hoverOverclockPadId = null;
        this.renderer.domElement.style.cursor = 'default';
      }
    } else {
      // Check if hovering over a locked Overclock Pad so cursor shows clickable pointer
      const padHitMeshes = this.arena.slots
        .filter((s) => !this.unlockedOverclockPads.has(s.slotId))
        .map((s) => s.hitMesh);
      const pHits = padHitMeshes.length > 0 ? this.raycaster.intersectObjects(padHitMeshes, false) : [];
      this.hoverOverclockPadId = pHits.length > 0 ? (pHits[0].object.userData.padId as number) : null;
      this.hoverWorldPos = null;
      this.hoverValid = false;
      this.renderer.domElement.style.cursor = pHits.length > 0 ? 'pointer' : 'default';
    }

    this.refreshPreviewAndSlots();
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.phase !== 'playing') return;
    audioSynth.startMusic();

    if (e.button === 2 || e.button === 1) {
      this.isRightDragging = true;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      return;
    }
    if (e.button !== 0) return;

    this.updatePointerNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(this.pointerNdc, this.activeCamera);

    // 1. Click existing tower to pin/unpin inspector on the Left Sidebar
    const towerHitMeshes = this.towers.map((t) => t.rig.hitMesh);
    if (towerHitMeshes.length > 0) {
      const tHits = this.raycaster.intersectObjects(towerHitMeshes, false);
      if (tHits.length > 0) {
        const clickedTowerId = tHits[0].object.userData.towerId as number;
        this.selectedLockedPadId = null;
        this.selectedTowerId = this.selectedTowerId === clickedTowerId ? null : clickedTowerId;
        this.activeBuildType = null;
        audioSynth.playUiClick();
        this.refreshPreviewAndSlots();
        this.emitHudSnapshot();
        return;
      }
    }

    // 2. If a tower type is selected for building, freely place it on the floor!
    if (this.activeBuildType) {
      const fHits = this.raycaster.intersectObject(this.arena.floorHitMesh, false);
      if (fHits.length > 0) {
        const pt = fHits[0].point;
        const placed = this.buildTowerAtWorldPos(pt.x, pt.z, this.activeBuildType);
        if (placed) return;
      }
    } else {
      // 3. Clicking a locked Overclock Pad opens its Purchase Inspector on the Left Sidebar!
      const lockedPadMeshes = this.arena.slots
        .filter((s) => !this.unlockedOverclockPads.has(s.slotId))
        .map((s) => s.hitMesh);
      if (lockedPadMeshes.length > 0) {
        const pHits = this.raycaster.intersectObjects(lockedPadMeshes, false);
        if (pHits.length > 0) {
          const padId = pHits[0].object.userData.padId as number;
          this.selectedTowerId = null;
          this.selectedLockedPadId = this.selectedLockedPadId === padId ? null : padId;
          audioSynth.playUiClick();
          this.refreshPreviewAndSlots();
          this.emitHudSnapshot();
          return;
        }
      }
    }

    // 4. Clicking empty area deselects currently pinned tower or locked pad
    if (this.selectedTowerId !== null || this.selectedLockedPadId !== null) {
      this.selectedTowerId = null;
      this.selectedLockedPadId = null;
      this.refreshPreviewAndSlots();
      this.emitHudSnapshot();
    }
  };

  private handlePointerUp = () => {
    this.isRightDragging = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.phase !== 'playing') return;
    e.preventDefault();
    this.camDistGoal = THREE.MathUtils.clamp(this.camDistGoal + e.deltaY * 0.016, 17, 46);
  };

  // =========================================================================
  // PUBLIC API FOR REACT HUD & CONTROLS
  // =========================================================================

  private getTowerCost(type: TowerType): number {
    return getDifficultyTowerCost(TOWER_PRESETS[type].baseCost, this.difficulty);
  }

  private getOverclockCost(): number {
    return DIFFICULTY_PRESETS[this.difficulty].overclockUnlockCost;
  }

  public setDifficulty(diff: DifficultyId): void {
    this.difficulty = diff;
    const preset = DIFFICULTY_PRESETS[diff];
    if (this.phase === 'title') {
      this.gold = preset.startingGold;
      this.maxCoreHp = preset.startingCoreHp;
      this.coreHp = preset.startingCoreHp;
    }
    this.emitHudSnapshot();
  }

  public setShopOpen(open: boolean): void {
    if (this.shopOpen === open) return;
    this.shopOpen = open;
    if (this.phase === 'playing' && (this.cameraPreset === 'tactical' || this.cameraPreset === 'topdown')) {
      this.setCameraPreset(this.cameraPreset);
    }
  }

  public startNewGame(difficulty?: DifficultyId): void {
    if (difficulty) {
      this.difficulty = difficulty;
    }
    const diffPreset = DIFFICULTY_PRESETS[this.difficulty];
    this.clearEntities();
    this.gold = diffPreset.startingGold;
    this.maxCoreHp = diffPreset.startingCoreHp;
    this.coreHp = diffPreset.startingCoreHp;
    this.wave = 0;
    this.waveActive = false;
    this.autoStartTimer = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.enemiesDefeated = 0;
    this.score = 0;
    this.timeScale = 1;
    this.activeBuildType = null;
    this.selectedTowerId = null;
    this.hoveredTowerId = null;
    this.selectedLockedPadId = null;
    this.unlockedOverclockPads.clear();
    this.hoverWorldPos = null;
    this.hoverValid = false;
    this.hoverOverclockPadId = null;
    this.pendingOutcome = null;
    this.defeatDelayTimer = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.keysPressed.clear();
    this.phase = 'playing';
    this.setCameraPreset('tactical');
    audioSynth.startMusic();
    audioSynth.setMusicMood('idle');
    this.showBanner(
      `Mode ${diffPreset.label} · Pilih menara di panel kanan · Klik Node (+) untuk Overclock (${diffPreset.overclockUnlockCost}G)`
    );
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  public returnToTitle(): void {
    this.clearEntities();
    this.phase = 'title';
    this.activeBuildType = null;
    this.selectedTowerId = null;
    this.hoveredTowerId = null;
    this.selectedLockedPadId = null;
    this.hoverWorldPos = null;
    this.previewRingMesh.visible = false;
    this.ghostFootprintMesh.visible = false;
    this.keysPressed.clear();
    audioSynth.setMusicMood('menu');
    this.emitHudSnapshot();
  }

  public setPaused(paused: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = paused ? 'paused' : 'playing';
    this.keysPressed.clear();
    if (paused) audioSynth.setMusicMood('idle');
    else this.syncMusicMood();
    this.emitHudSnapshot();
  }

  public setTimeScale(scale: 1 | 2 | 3): void {
    this.timeScale = scale;
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public setAutoStartWave(enabled: boolean): void {
    this.autoStartWave = enabled;
    audioSynth.playUiClick();
    if (enabled && !this.waveActive && this.wave > 0 && this.wave < TOTAL_WAVES) {
      this.autoStartTimer = 1.4;
    }
    this.emitHudSnapshot();
  }

  public setActiveBuildType(type: TowerType | null): void {
    this.activeBuildType = type;
    if (type !== null) {
      this.selectedTowerId = null;
      this.selectedLockedPadId = null;
    }
    audioSynth.playUiClick();
    this.rebuildPreviewRingGeometry(false);
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  public selectLockedPad(padId: number | null): void {
    this.selectedLockedPadId = padId;
    if (padId !== null) {
      this.selectedTowerId = null;
      this.activeBuildType = null;
    }
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  public unlockOverclockPad(padId: number): boolean {
    if (this.phase !== 'playing') return false;
    if (this.unlockedOverclockPads.has(padId)) return false;
    const slot = NUR_TOWER_SLOTS[padId];
    if (!slot) return false;
    const unlockCost = this.getOverclockCost();
    if (this.gold < unlockCost) {
      this.showBanner(`Gold tidak cukup! Butuh ${unlockCost}G untuk mengaktifkan Overclock Node ${padId + 1}`);
      return false;
    }

    this.gold -= unlockCost;
    this.unlockedOverclockPads.add(padId);
    this.selectedLockedPadId = null;

    const pos = new THREE.Vector3(slot.position.x, 0.15, slot.position.z);
    audioSynth.playBuild(true);
    this.spawnParticles(pos, 22, 0xfbbf24, 3.8, 0.55);
    this.spawnShockwave(pos, 2.2, [0.98, 0.75, 0.15, 0.85], [0.98, 0.75, 0.15, 0.0]);
    this.pushFloatText(`-${unlockCost}G OVERCLOCK AKTIF`, pos, '#fde047');
    this.showBanner(`Overclock Node ${padId + 1} aktif! Menara di sini mendapat +12% Jangkauan & +12% Kecepatan.`);
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
    return true;
  }

  public startNextWave(): void {
    if (this.phase !== 'playing' || this.waveActive || this.wave >= TOTAL_WAVES) return;
    audioSynth.startMusic();
    this.wave += 1;
    this.waveActive = true;
    this.autoStartTimer = 0;

    const def = getWaveDefinition(this.wave);
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

    const isBossWave = Boolean(def?.isBossWave);
    audioSynth.playWaveStart(isBossWave);
    this.syncMusicMood();

    if (def?.isFinalStage) {
      this.trauma = Math.min(1, this.trauma + 0.55);
      this.showBanner('FINAL STAGE: OMEGA-0 Rootkit & Pasukan Pengawal Siber memasuki arena!');
    } else if (isBossWave) {
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.showBanner(`PERINGATAN BOSS: ${def?.title ?? `Wave ${this.wave}`}!`);
    } else {
      this.showBanner(`${def?.title ?? `Wave ${this.wave}`} dimulai!`);
    }
    this.emitHudSnapshot();
  }

  public buildTowerAtWorldPos(worldX: number, worldZ: number, type: TowerType): boolean {
    if (this.phase !== 'playing') return false;
    const preset = TOWER_PRESETS[type];
    const buildCost = this.getTowerCost(type);
    if (this.gold < buildCost) {
      this.showBanner(`Gold tidak cukup! Butuh ${buildCost}G untuk ${preset.displayName}`);
      return false;
    }

    const val = validateTowerPlacement(
      { x: worldX, y: 0, z: worldZ },
      this.towers.map((t) => t.position),
      this.unlockedOverclockPads
    );
    if (!val.valid) {
      if (val.reason === 'locked_overclock_pad' && val.overclockPadId !== null) {
        this.selectedLockedPadId = val.overclockPadId;
        this.selectedTowerId = null;
        this.activeBuildType = null;
        this.showBanner(
          `Overclock Node ${val.overclockPadId + 1} terkunci! Beli di panel kiri (${this.getOverclockCost()}G) terlebih dahulu.`
        );
        this.refreshPreviewAndSlots();
        this.emitHudSnapshot();
        return false;
      }
      const msg =
        val.reason === 'on_road'
          ? 'Tidak bisa membangun di atas jalur musuh!'
          : val.reason === 'tower_overlap'
          ? 'Terlalu dekat dengan menara lain!'
          : val.reason === 'near_base'
          ? 'Terlalu dekat dengan Base Musuh / Energy Core!'
          : 'Pilih lokasi di dalam area arena cyber!';
      this.showBanner(msg);
      return false;
    }

    const pos = val.snappedPosition;
    const overclocked = val.overclockPadId !== null;
    this.gold -= buildCost;

    const rig = buildTowerRig(type);
    const towerId = this.nextTowerId++;
    rig.hitMesh.userData = { towerId };
    rig.root.position.set(pos.x, overclocked ? 0.09 : 0.02, pos.z);

    if (overclocked && val.overclockPadId !== null) {
      rig.turretHead.rotation.y = NUR_TOWER_SLOTS[val.overclockPadId].yaw;
    }
    this.entityRoot.add(rig.root);

    const rangeMeters = getScaledRangeMeters(preset.baseRangeGdd, 1, overclocked);
    const rgb = new THREE.Color(overclocked ? 0xfbbf24 : preset.accentColor);
    const ringGeo = buildRangeRingGeometry(
      Math.max(0.5, rangeMeters - 0.28),
      rangeMeters,
      56,
      [rgb.r, rgb.g, rgb.b, 0.14],
      [rgb.r, rgb.g, rgb.b, 0.72]
    );
    const ringMat = createRangeRingMaterial({ pulseSpeed: 0.9, pulseStrength: 0.2, fade: 1.0 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(pos.x, 0.03, pos.z);
    ringMesh.visible = this.showAllRangeRings;
    this.entityRoot.add(ringMesh);

    let laserBeamMesh: THREE.Mesh | undefined;
    let laserBeamMat: THREE.ShaderMaterial | undefined;
    if (type === 'laser') {
      laserBeamMat = createLaserBeamMaterial(this.laserPulseTex, preset.accentColor);
      const beamGeo = new THREE.PlaneGeometry(1, 0.3);
      beamGeo.translate(0.5, 0, 0);
      laserBeamMesh = new THREE.Mesh(beamGeo, laserBeamMat);
      laserBeamMesh.layers.enable(BLOOM_LAYER);
      const crossPlane = new THREE.Mesh(beamGeo, laserBeamMat);
      crossPlane.layers.enable(BLOOM_LAYER);
      crossPlane.rotation.x = Math.PI / 2;
      laserBeamMesh.add(crossPlane);
      laserBeamMesh.visible = false;
      this.entityRoot.add(laserBeamMesh);
    }

    const tower: TowerEntity = {
      id: towerId,
      overclockPadId: val.overclockPadId,
      type,
      level: 1,
      totalInvested: buildCost,
      targetingMode: type === 'armor_pen' ? 'STRONG' : 'FIRST',
      cooldown: 0.12,
      farmTimer: preset.incomeCycleSec * 0.75,
      recoil: 0,
      kills: 0,
      goldEarned: 0,
      ultimateCooldown: 0,
      ultimateActiveTimer: 0,
      position: new THREE.Vector3(pos.x, overclocked ? 0.09 : 0.02, pos.z),
      rig,
      rangeRingMesh: ringMesh,
      rangeRingMat: ringMat,
      laserBeamMesh,
      laserBeamMat,
      laserActiveTimer: 0,
    };

    this.towers.push(tower);
    // Do NOT leave range ring or build mode stuck active after placement!
    this.selectedTowerId = null;
    this.selectedLockedPadId = null;
    this.activeBuildType = null;
    this.hoverWorldPos = null;
    audioSynth.playBuild(overclocked);
    this.spawnParticles(tower.position, overclocked ? 20 : 14, overclocked ? 0xfbbf24 : preset.accentColor, 3.4, 0.48);
    this.pushFloatText(
      overclocked ? `-${buildCost}G OVERCLOCK!` : `-${buildCost}G`,
      tower.position,
      overclocked ? '#fde047' : '#fbbf24'
    );
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
    return true;
  }

  public upgradeSelectedTower(): boolean {
    if (this.phase !== 'playing' || this.selectedTowerId === null) return false;
    const tower = this.towers.find((t) => t.id === this.selectedTowerId);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return false;

    const preset = TOWER_PRESETS[tower.type];
    const cost = calculateUpgradeCost(preset.baseCost, tower.level, this.difficulty);
    if (this.gold < cost) {
      this.showBanner(`Gold tidak cukup untuk Upgrade (${cost}G)`);
      return false;
    }

    this.gold -= cost;
    tower.totalInvested += cost;
    tower.level += 1;

    if (tower.level >= 2 && tower.rig.upgradeNodes[0]) tower.rig.upgradeNodes[0].visible = true;
    if (tower.level >= 3 && tower.rig.upgradeNodes[1]) tower.rig.upgradeNodes[1].visible = true;
    if (tower.level >= 4 && tower.rig.upgradeNodes[2]) tower.rig.upgradeNodes[2].visible = true;
    const scaleBoost = 1 + (tower.level - 1) * 0.055;
    tower.rig.root.scale.setScalar(scaleBoost * TOWER_VISUAL_SCALE);

    const overclocked = tower.overclockPadId !== null;
    const newRange = getScaledRangeMeters(preset.baseRangeGdd, tower.level, overclocked);
    const rgb = new THREE.Color(tower.level >= MAX_TOWER_LEVEL ? 0xfbbf24 : preset.accentColor);
    tower.rangeRingMesh.geometry.dispose();
    tower.rangeRingMesh.geometry = buildRangeRingGeometry(
      Math.max(0.6, newRange - 0.35),
      newRange,
      56,
      [rgb.r, rgb.g, rgb.b, 0.14],
      [rgb.r, rgb.g, rgb.b, 0.8]
    );

    const unlockedUlt = tower.level === MAX_TOWER_LEVEL;
    audioSynth.playUpgrade(unlockedUlt);
    this.spawnParticles(tower.position, unlockedUlt ? 28 : 18, 0xfbbf24, 4.4, 0.6);
    this.pushFloatText(
      unlockedUlt ? `APEX LV.4 · ULTIMATE!` : `LV.${tower.level}`,
      tower.position,
      unlockedUlt ? '#fde047' : '#38bdf8'
    );
    if (unlockedUlt) {
      this.showBanner(`ULTIMATE TERBUKA: [${preset.ultimate.hotkey}] ${preset.ultimate.name}!`);
    }
    this.emitHudSnapshot();
    return true;
  }

  public sellSelectedTower(): boolean {
    if (this.phase !== 'playing' || this.selectedTowerId === null) return false;
    const idx = this.towers.findIndex((t) => t.id === this.selectedTowerId);
    if (idx < 0) return false;

    const tower = this.towers[idx];
    const refund = calculateSellRefund(tower.totalInvested);
    this.gold += refund;

    this.entityRoot.remove(tower.rig.root);
    this.entityRoot.remove(tower.rangeRingMesh);
    tower.rangeRingMesh.geometry.dispose();
    if (tower.laserBeamMesh) this.entityRoot.remove(tower.laserBeamMesh);

    this.towers.splice(idx, 1);
    this.selectedTowerId = null;

    audioSynth.playSell();
    this.spawnParticles(tower.position, 14, 0xfbbf24, 3.0, 0.42);
    this.pushFloatText(`+${refund}G`, tower.position, '#4ade80');
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
    return true;
  }

  public setSelectedTowerTargeting(mode: TargetingMode): void {
    if (this.selectedTowerId === null) return;
    const tower = this.towers.find((t) => t.id === this.selectedTowerId);
    if (!tower) return;
    tower.targetingMode = mode;
    audioSynth.playUiClick();
    this.emitHudSnapshot();
  }

  public selectTower(towerId: number | null): void {
    this.selectedTowerId = towerId;
    this.refreshPreviewAndSlots();
    this.emitHudSnapshot();
  }

  /**
   * Triggers a Max-Level (Lv.4 APEX) Tower's Active Ultimate Ability!
   */
  public triggerTowerUltimate(towerId: number): boolean {
    if (this.phase !== 'playing') return false;
    const tower = this.towers.find((t) => t.id === towerId);
    if (!tower || tower.level < MAX_TOWER_LEVEL || tower.ultimateCooldown > 0) return false;

    const preset = TOWER_PRESETS[tower.type];
    tower.ultimateCooldown = preset.ultimate.cooldownSec;
    tower.ultimateActiveTimer = preset.ultimate.durationSec;

    audioSynth.playUltimate();
    this.trauma = Math.min(1, this.trauma + 0.32);
    this.spawnParticles(tower.position, 28, preset.accentColor, 5.2, 0.65);

    const aliveEnemies = this.enemies.filter((e) => e.alive);

    if (tower.type === 'laser') {
      // PRISM OVERDRIVE: 2.6x fire rate + dual beam burst for 7s
      this.showBanner(`ULTIMATE: ${preset.ultimate.name} aktif (7 detik)!`);
      this.pushFloatText('PRISM OVERDRIVE!', tower.position, '#22d3ee');
    } else if (tower.type === 'cannon') {
      // ORBITAL EMP BARRAGE: 5 heavy EMP blasts along active enemies or road chokes
      this.showBanner(`ULTIMATE: ${preset.ultimate.name} menghantam jalur!`);
      const targets = aliveEnemies.slice(0, 5);
      for (let i = 0; i < 5; i++) {
        const blastPos =
          targets[i]?.position.clone() ??
          (() => {
            const sample = NUR_BAKED_PATH.sampleAtDistance(((i + 1) / 6) * NUR_BAKED_PATH.totalLength).pos;
            return new THREE.Vector3(sample.x, 0.15, sample.z);
          })();
        this.spawnShockwave(blastPos, 4.2, [1.0, 0.58, 0.18, 0.9], [1.0, 0.15, 0.05, 0.0]);
        this.spawnParticles(blastPos, 22, 0xfb923c, 5.8, 0.62);
        for (const e of aliveEnemies) {
          if (e.alive && distanceXZ(blastPos, e.position) <= 4.2) {
            e.stunTimer = Math.max(e.stunTimer, e.isBoss ? 0.6 : 1.4);
            this.damageEnemy(e, 240, false, tower.id);
          }
        }
      }
    } else if (tower.type === 'freeze') {
      // ABSOLUTE ZERO: Global 80% freeze for 5s + 50% armor shred!
      this.showBanner(`ULTIMATE: ${preset.ultimate.name} — seluruh musuh membeku!`);
      this.spawnShockwave(tower.position, 22.0, [0.49, 0.83, 0.99, 0.72], [0.22, 0.74, 0.97, 0.0]);
      for (const e of aliveEnemies) {
        e.slowRatio = Math.max(e.slowRatio, 0.8);
        e.slowTimer = Math.max(e.slowTimer, 5.0);
        e.armor = Math.floor(e.armor * 0.5);
        this.damageEnemy(e, 65, true, tower.id, 0.8, 5.0);
        this.spawnParticles(e.position, 10, 0x7dd3fc, 3.0, 0.5);
      }
    } else if (tower.type === 'armor_pen') {
      // HYPER-RAIL LANCE: Locks onto strongest enemy / Boss for 520 True Damage!
      const strongest = [...aliveEnemies].sort(
        (a, b) => (b.isFinalBoss ? 1e6 : 0) + b.currentHp - ((a.isFinalBoss ? 1e6 : 0) + a.currentHp)
      )[0];
      if (strongest) {
        const skyOrigin = new THREE.Vector3(strongest.position.x, 16, strongest.position.z);
        this.spawnEnergyBeam(skyOrigin, strongest.position, preset.accentColor, 0.22, 0.45);
        this.spawnFlash(strongest.position.clone().setY(1.0), preset.accentColor, 3.5, 0.45);
        this.spawnShockwave(strongest.position, 3.4, [0.6, 0.4, 1.0, 0.95], [0.4, 0.2, 1.0, 0.0]);
        this.spawnParticles(strongest.position, 30, preset.accentColor, 6.2, 0.65);
        this.damageEnemy(strongest, 520, true, tower.id);
        this.showBanner(`ULTIMATE: Hyper-Rail menghantam ${ENEMY_PRESETS[strongest.type].displayName} (520 True DMG)!`);
      } else {
        this.showBanner('Hyper-Rail Lance ditembakkan — tidak ada target aktif.');
      }
    } else if (tower.type === 'tesla') {
      // ION OVERLOAD STORM: Electrocutes up to 10 enemies across the map!
      const struck = aliveEnemies.slice(0, 10);
      let prevPos = tower.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      for (const e of struck) {
        const targetPos = e.position.clone().add(new THREE.Vector3(0, 0.7, 0));
        this.spawnBeamSegment(prevPos, targetPos, 0xf472b6, 0.11, 0.36);
        this.spawnParticles(targetPos, 10, 0xf472b6, 4.0, 0.4);
        this.damageEnemy(e, 185, false, tower.id);
        prevPos = targetPos;
      }
      this.showBanner(`ULTIMATE: ${preset.ultimate.name} menyambar ${struck.length} target!`);
    } else if (tower.type === 'farm') {
      // QUANTUM JACKPOT: Rebalanced instant +140 Gold surge
      const bonus = 140;
      this.gold += bonus;
      tower.goldEarned += bonus;
      audioSynth.playFarmIncome();
      this.spawnShockwave(tower.position, 4.0, [0.2, 0.85, 0.6, 0.85], [0.06, 0.72, 0.5, 0.0]);
      this.spawnParticles(tower.position, 24, 0x34d399, 5.0, 0.6);
      this.pushFloatText(`+${bonus}G JACKPOT!`, tower.position, '#34d399');
      this.showBanner(`ULTIMATE: Quantum Jackpot mencairkan +${bonus} Gold!`);
    }

    this.emitHudSnapshot();
    return true;
  }

  // Graphics Lab Controls (CPMK-1 & CPMK-2)
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
      this.camTargetGoal.set(this.shopOpen ? 5.4 : 0.0, 0.3, 0.2);
      this.camYawGoal = 0;
      this.camPitchGoal = 0.88;
      this.camDistGoal = this.shopOpen ? 39.0 : 35.6;
    } else if (preset === 'action') {
      this.camTargetGoal.set(-2.5, 0.6, 0.5);
      this.camYawGoal = -0.3;
      this.camPitchGoal = 0.52;
      this.camDistGoal = 24.0;
    } else if (preset === 'topdown') {
      this.camTargetGoal.set(this.shopOpen ? 4.6 : 0.0, 0, 0);
      this.camYawGoal = 0;
      this.camPitchGoal = 1.48;
      this.camDistGoal = this.shopOpen ? 39.5 : 36.2;
    } else if (preset === 'core') {
      this.camTargetGoal.set(14.5, 1.2, 0);
      this.camYawGoal = -0.68;
      this.camPitchGoal = 0.54;
      this.camDistGoal = 16.5;
    }
    this.emitHudSnapshot();
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  private syncMusicMood(): void {
    if (this.phase === 'title') {
      audioSynth.setMusicMood('menu');
      return;
    }
    if (this.phase === 'victory' || this.phase === 'gameover') {
      audioSynth.setMusicMood('off');
      return;
    }
    if (this.phase !== 'playing') {
      audioSynth.setMusicMood('idle');
      return;
    }
    if (!this.waveActive) {
      audioSynth.setMusicMood('idle');
      return;
    }
    const def = getWaveDefinition(this.wave);
    const hasBoss = Boolean(def?.isBossWave) || this.enemies.some((e) => e.isBoss && e.alive);
    audioSynth.setMusicMood(hasBoss ? 'boss' : 'combat');
  }

  private rebuildPreviewRingGeometry(overclocked: boolean): void {
    if (!this.activeBuildType) return;
    const preset = TOWER_PRESETS[this.activeBuildType];
    const rangeM = getScaledRangeMeters(preset.baseRangeGdd, 1, overclocked);
    const ok = this.hoverValid || this.gold >= this.getTowerCost(this.activeBuildType);
    const rgb = !ok
      ? new THREE.Color(0xff2a4a)
      : overclocked
      ? new THREE.Color(0xfbbf24)
      : new THREE.Color(preset.accentColor);

    this.previewRingMesh.geometry.dispose();
    this.previewRingMesh.geometry = buildRangeRingGeometry(
      Math.max(0.6, rangeM - 0.35),
      rangeM,
      48,
      [rgb.r, rgb.g, rgb.b, 0.14],
      [rgb.r, rgb.g, rgb.b, 0.72]
    );
  }

  private refreshPreviewAndSlots(): void {
    const occupiedPads = new Set(
      this.towers.map((t) => t.overclockPadId).filter((id): id is number => id !== null)
    );

    for (const s of this.arena.slots) {
      const occupied = occupiedPads.has(s.slotId);
      const unlocked = this.unlockedOverclockPads.has(s.slotId);
      const isHoveredPad = this.hoverOverclockPadId === s.slotId;
      const isSelectedLocked = this.selectedLockedPadId === s.slotId;

      if (occupied) {
        s.plusMat.color.setHex(0xfbbf24);
        s.plusMat.emissive.setHex(0xf59e0b);
        s.plusMat.emissiveIntensity = 0.3;
        s.frameMat.color.setHex(0xfbbf24);
        s.frameMat.emissive.setHex(0xd97706);
        s.frameMat.emissiveIntensity = 0.85;
      } else if (unlocked) {
        // Purchased / Active Overclock Node: energized amber-gold glow!
        s.plusMat.color.setHex(isHoveredPad ? 0xfef08a : 0xfbbf24);
        s.plusMat.emissive.setHex(isHoveredPad ? 0xfacc15 : 0xf59e0b);
        s.plusMat.emissiveIntensity = isHoveredPad ? 1.85 : 1.05;
        s.frameMat.color.setHex(isHoveredPad ? 0xfef08a : 0xf59e0b);
        s.frameMat.emissive.setHex(0xd97706);
        s.frameMat.emissiveIntensity = isHoveredPad ? 1.45 : 0.85;
      } else {
        // Locked Overclock Node: muted steel-slate until bought for 120G
        s.plusMat.color.setHex(isSelectedLocked || isHoveredPad ? 0x94a3b8 : 0x64748b);
        s.plusMat.emissive.setHex(isSelectedLocked ? 0x38bdf8 : 0x334155);
        s.plusMat.emissiveIntensity = isSelectedLocked ? 0.95 : isHoveredPad ? 0.65 : 0.25;
        s.frameMat.color.setHex(isSelectedLocked ? 0x38bdf8 : isHoveredPad ? 0x64748b : 0x334155);
        s.frameMat.emissive.setHex(isSelectedLocked ? 0x0284c7 : 0x1e293b);
        s.frameMat.emissiveIntensity = isSelectedLocked ? 0.95 : isHoveredPad ? 0.55 : 0.22;
      }
    }

    // ONLY display a tower's range ring when highlighted (hovered) or selected (or Lab toggle)!
    for (const tower of this.towers) {
      tower.rangeRingMesh.visible =
        this.showAllRangeRings ||
        tower.id === this.selectedTowerId ||
        tower.id === this.hoveredTowerId;
    }

    if (this.phase === 'playing' && this.activeBuildType && this.hoverWorldPos) {
      const oc = this.hoverOverclockPadId !== null && this.unlockedOverclockPads.has(this.hoverOverclockPadId);
      this.rebuildPreviewRingGeometry(oc);
      this.previewRingMesh.position.set(this.hoverWorldPos.x, 0.035, this.hoverWorldPos.z);
      this.previewRingMesh.visible = true;

      this.ghostFootprintMesh.position.set(this.hoverWorldPos.x, 0.14, this.hoverWorldPos.z);
      this.ghostFootprintMat.color.setHex(
        !this.hoverValid ? 0xff2a4a : oc ? 0xfbbf24 : TOWER_PRESETS[this.activeBuildType].accentColor
      );
      this.ghostFootprintMesh.visible = true;
    } else {
      this.previewRingMesh.visible = false;
      this.ghostFootprintMesh.visible = false;
    }
  }

  private showBanner(msg: string): void {
    this.bannerMessage = msg;
    this.bannerTimer = 3.4;
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

    for (const r of this.beamTrails) {
      this.entityRoot.remove(r.mesh);
      r.mesh.geometry.dispose();
    }
    this.beamTrails = [];

    for (const f of this.flashes) {
      this.entityRoot.remove(f.sprite);
      f.mat.dispose();
    }
    this.flashes = [];

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this._mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, this._mat4);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private spawnEnemy(type: EnemyType): void {
    const preset = ENEMY_PRESETS[type];
    const maxHp = calculateEnemyWaveHp(preset.baseHp, this.wave, preset.isBoss, this.difficulty);
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
      baseSpeed: getEnemySpeedMps(preset.speedGdd, this.difficulty),
      rewardGold: getDifficultyRewardGold(preset.rewardGold, this.difficulty),
      leakDamage: preset.leakDamage,
      isBoss: preset.isBoss,
      isFinalBoss: preset.isFinalBoss,
      isFlying: preset.isFlying,
      distanceTraveled: 0,
      pathProgress: 0,
      slowTimer: 0,
      slowRatio: 0,
      frostAge: 0,
      frostMistTimer: 0,
      stunTimer: 0,
      hitFlashTimer: 0,
      position: rig.root.position.clone(),
      rig,
    };

    this.enemies.push(enemy);
    this.spawnParticles(enemy.position, preset.isFinalBoss ? 32 : preset.isBoss ? 22 : 8, preset.accentColor, 3.2, 0.45);
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
      enemy.deathTimer = enemy.isFinalBoss ? 0.6 : 0.34;
      this.gold += enemy.rewardGold;
      this.enemiesDefeated += 1;
      this.score += enemy.rewardGold * 10 + (enemy.isFinalBoss ? 2500 : enemy.isBoss ? 600 : 0);

      const tower = this.towers.find((t) => t.id === sourceTowerId);
      if (tower) tower.kills += 1;

      audioSynth.playEnemyKill(enemy.isBoss);
      this.spawnParticles(
        enemy.position,
        enemy.isFinalBoss ? 48 : enemy.isBoss ? 32 : 14,
        ENEMY_PRESETS[enemy.type].accentColor,
        enemy.isFinalBoss ? 7.5 : enemy.isBoss ? 5.6 : 3.6,
        enemy.isFinalBoss ? 0.95 : enemy.isBoss ? 0.72 : 0.46
      );
      this.pushFloatText(`+${enemy.rewardGold}G`, enemy.position, '#4ade80');
      const deathCenter = enemy.position.clone().add(new THREE.Vector3(0, enemy.isFlying ? 1.25 : 0.75, 0));
      this.spawnFlash(deathCenter, ENEMY_PRESETS[enemy.type].accentColor, enemy.isBoss ? 3.2 : 1.5, enemy.isBoss ? 0.5 : 0.32, 2.0);
      if (!enemy.isBoss) {
        this.spawnShockwave(enemy.position, 1.5, [1.0, 0.25, 0.3, 0.75], [1.0, 0.1, 0.2, 0.0]);
      }

      if (enemy.isFinalBoss) {
        this.hitstopTimer = 0.09;
        this.trauma = Math.min(1, this.trauma + 0.75);
        this.spawnShockwave(enemy.position, 6.5, [1.0, 0.25, 0.35, 0.95], [0.2, 0.85, 1.0, 0.0]);
        this.showBanner('OMEGA-0 ROOTKIT HANCUR! Bersihkan sisa pasukan pengawal untuk menang!');
      } else if (enemy.isBoss) {
        this.hitstopTimer = 0.06;
        this.trauma = Math.min(1, this.trauma + 0.48);
      }

      this.refreshPreviewAndSlots();
      this.emitHudSnapshot();
    }
  }

  private spawnBeamSegment(
    from: THREE.Vector3,
    to: THREE.Vector3,
    colorHex: number,
    radius = 0.055,
    duration = 0.22
  ): void {
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;
    const geo = new THREE.CylinderGeometry(radius, radius, dist, 6);
    geo.rotateZ(Math.PI / 2);
    geo.translate(dist * 0.5, 0, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(neonBoost(colorHex, 0.8, 1.0, 2.4)),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.position.copy(from);
    const dir = this._v1.subVectors(to, from).normalize();
    mesh.quaternion.setFromUnitVectors(this._xAxis, dir);
    this.entityRoot.add(mesh);
    this.beamTrails.push({ mesh, mat, age: 0, duration });
  }

  // Glowing beam with a hot white core, used for railgun shots and lightning arcs
  private spawnEnergyBeam(from: THREE.Vector3, to: THREE.Vector3, colorHex: number, radius: number, duration: number): void {
    this.spawnBeamSegment(from, to, colorHex, radius, duration);
    this.spawnBeamSegment(from, to, 0xffffff, radius * 0.35, duration * 0.8);
  }

  // Ice grows out of the ground around a slowed enemy, shimmers, and drifts a little frost mist
  private updateFrost(e: EnemyEntity, realDt: number): void {
    const overlay = e.rig.frozenOverlay;
    if (!overlay.visible) {
      overlay.visible = true;
      e.frostAge = 0;
      e.frostMistTimer = 0;
    }
    e.frostAge += realDt;
    const grow = Math.min(1, e.frostAge / 0.22);
    const eased = 1 - Math.pow(1 - grow, 3);
    overlay.scale.set(0.6 + 0.4 * eased, Math.max(0.02, eased), 0.6 + 0.4 * eased);
    e.rig.frozenMaterial.uniforms.uTime.value = this.elapsed;
    this.setFrostTint(e, 0.55 * eased);

    e.frostMistTimer -= realDt;
    if (e.frostMistTimer <= 0) {
      e.frostMistTimer = 0.28;
      this.spawnParticles(e.position, 2, 0xd6f2ff, 0.7, 0.5);
    }
  }

  // Slow wears off: the ice bursts into shards and the body returns to its own colours
  private shatterFrost(e: EnemyEntity): void {
    if (!e.rig.frozenOverlay.visible) return;
    e.rig.frozenOverlay.visible = false;
    this.setFrostTint(e, 0);
    const center = e.position.clone().add(new THREE.Vector3(0, e.isFlying ? 1.25 : 0.6, 0));
    this.spawnParticles(e.position, e.isBoss ? 22 : 12, 0xbfe9ff, 3.0, 0.42);
    this.spawnFlash(center, 0x9fdcff, e.isBoss ? 1.6 : 0.9, 0.2);
  }

  private setFrostTint(e: EnemyEntity, amount: number): void {
    const { tintMaterials, tintBaseColors } = e.rig;
    for (let i = 0; i < tintMaterials.length; i++) {
      tintMaterials[i].color.copy(tintBaseColors[i]).lerp(this._iceTint, amount);
    }
  }

  private spawnFlash(pos: THREE.Vector3, colorHex: number, size: number, duration: number, endScale = 1.7): void {
    const mat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: new THREE.Color(colorHex).multiplyScalar(neonBoost(colorHex, 0.7, 1.0, 2.2)),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.layers.enable(BLOOM_LAYER);
    sprite.position.copy(pos);
    const startSize = size * 0.8;
    sprite.scale.set(startSize, startSize, 1);
    this.entityRoot.add(sprite);
    this.flashes.push({ sprite, mat, age: 0, duration, startSize, endSize: startSize * endScale });
  }

  private fireTowerAttack(tower: TowerEntity, target: EnemyEntity, damage: number): void {
    const preset = TOWER_PRESETS[tower.type];
    const muzzleWorld = tower.rig.muzzleLocal.clone().applyMatrix4(tower.rig.turretHead.matrixWorld);
    const targetWorld = target.position.clone().add(new THREE.Vector3(0, target.isFlying ? 1.25 : 0.75, 0));

    if (tower.type === 'laser') {
      this.damageEnemy(target, damage, false, tower.id);
      audioSynth.playLaser();
      this.spawnParticles(targetWorld, 6, preset.accentColor, 2.6, 0.28);
      this.spawnFlash(muzzleWorld, preset.accentColor, 0.55, 0.12);
      this.spawnFlash(targetWorld, preset.accentColor, 0.8, 0.18);
      this.spawnBeamSegment(muzzleWorld, targetWorld, 0xffffff, 0.022, 0.12);

      if (tower.laserBeamMesh) {
        const dist = muzzleWorld.distanceTo(targetWorld);
        tower.laserBeamMesh.position.copy(muzzleWorld);
        const dir = this._v1.subVectors(targetWorld, muzzleWorld).normalize();
        tower.laserBeamMesh.quaternion.setFromUnitVectors(this._xAxis, dir);
        tower.laserBeamMesh.scale.set(dist, tower.ultimateActiveTimer > 0 ? 1.8 : 1, 1);
        tower.laserBeamMesh.visible = true;
        tower.laserActiveTimer = 0.2;
      }

      // Prism Overdrive Ultimate: hits a bonus nearby target with a secondary beam!
      if (tower.ultimateActiveTimer > 0) {
        const secondary = this.enemies.find(
          (e) => e.alive && e.id !== target.id && distanceXZ(tower.position, e.position) <= 10.5
        );
        if (secondary) {
          const secPos = secondary.position.clone().add(new THREE.Vector3(0, 0.75, 0));
          this.spawnEnergyBeam(muzzleWorld, secPos, preset.accentColor, 0.07, 0.16);
          this.spawnFlash(secPos, preset.accentColor, 0.8, 0.18);
          this.damageEnemy(secondary, damage * 0.85, false, tower.id);
        }
      }
      return;
    }

    if (tower.type === 'tesla') {
      // Chain lightning jumping across 3..6 enemies!
      const maxChains = getScaledChainCount(preset.chainCount, tower.level);
      const hitIds = new Set<number>([target.id]);
      let prevPos = muzzleWorld;
      let curr: EnemyEntity | null = target;

      audioSynth.playTesla();
      for (let hop = 0; hop < maxChains && curr; hop++) {
        const currPos = curr.position.clone().add(new THREE.Vector3(0, curr.isFlying ? 1.25 : 0.75, 0));
        this.spawnEnergyBeam(prevPos, currPos, preset.accentColor, 0.065, 0.22);
        this.spawnParticles(currPos, 6, preset.accentColor, 2.8, 0.28);
        this.spawnFlash(currPos, preset.accentColor, 0.75, 0.2);
        this.damageEnemy(curr, damage * Math.pow(0.88, hop), false, tower.id);
        prevPos = currPos;

        // Find nearest unhit enemy within 5.2m jump radius
        let nextTarget: EnemyEntity | null = null;
        let minD = 5.2;
        for (const cand of this.enemies) {
          if (!cand.alive || hitIds.has(cand.id)) continue;
          const d = distanceXZ(curr.position, cand.position);
          if (d < minD) {
            minD = d;
            nextTarget = cand;
          }
        }
        if (nextTarget) hitIds.add(nextTarget.id);
        curr = nextTarget;
      }
      return;
    }

    if (tower.type === 'armor_pen') {
      this.damageEnemy(target, damage, true, tower.id);
      audioSynth.playArmorPen();
      this.spawnParticles(targetWorld, 14, preset.accentColor, 4.6, 0.38);
      this.spawnEnergyBeam(muzzleWorld, targetWorld, preset.accentColor, 0.09, 0.26);
      this.spawnFlash(muzzleWorld, preset.accentColor, 0.9, 0.16);
      this.spawnFlash(targetWorld, preset.accentColor, 1.3, 0.24);
      return;
    }

    // Physical projectile for Plasma Cannon (arcing AoE shell) & Cryo Emitter (frost shard)
    const isCannon = tower.type === 'cannon';
    const geo = isCannon ? new THREE.SphereGeometry(0.19, 10, 10) : new THREE.OctahedronGeometry(0.18, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: preset.accentColor,
      emissive: preset.accentColor,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(muzzleWorld);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        color: new THREE.Color(preset.accentColor).multiplyScalar(neonBoost(preset.accentColor, 0.7, 1.0, 2.0)),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.setScalar(isCannon ? 1.0 : 0.75);
    halo.layers.enable(BLOOM_LAYER);
    mesh.layers.enable(BLOOM_LAYER);
    mesh.add(halo);
    this.entityRoot.add(mesh);
    this.spawnFlash(muzzleWorld, preset.accentColor, isCannon ? 0.9 : 0.6, 0.14);

    const dist = muzzleWorld.distanceTo(targetWorld);
    const speed = isCannon ? 17.5 : 21.0;
    const duration = Math.max(0.11, dist / speed);

    if (isCannon) audioSynth.playCannon();
    else audioSynth.playFreeze();

    // Cryo Emitter gains AoE frost pulse at Lv.3+
    const cryoAoe = !isCannon && tower.level >= 3 ? preset.aoeRadiusGdd * AOE_GDD_TO_METERS : 0;
    const slowBoost = !isCannon ? Math.min(0.62, preset.slowRatio + (tower.level - 1) * 0.05) : 0;

    this.projectiles.push({
      mesh,
      type: tower.type,
      startPos: muzzleWorld.clone(),
      pos: muzzleWorld.clone(),
      targetPos: targetWorld.clone(),
      targetEnemyId: target.id,
      progress: 0,
      duration,
      arcHeight: isCannon ? Math.min(2.6, 0.9 + dist * 0.14) : 0.35,
      damage,
      aoeRadiusMeters: isCannon ? preset.aoeRadiusGdd * AOE_GDD_TO_METERS : cryoAoe,
      slowRatio: slowBoost,
      slowDuration: preset.slowDurationSec,
      ignoresArmor: preset.ignoresArmor,
      sourceTowerId: tower.id,
      trailAccum: 0,
    });
  }

  private spawnShockwave(
    pos: THREE.Vector3,
    radius: number,
    centerCol: [number, number, number, number] = [1.0, 0.72, 0.25, 0.85],
    edgeCol: [number, number, number, number] = [1.0, 0.25, 0.05, 0.0]
  ): void {
    const geo = buildAoeShockwaveGeometry(radius, 36, centerCol, edgeCol);
    const mat = createRangeRingMaterial({ pulseSpeed: 0, pulseStrength: 0, fade: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.05, pos.z);
    mesh.scale.setScalar(0.12);
    this.entityRoot.add(mesh);
    this.shockwaves.push({ mesh, mat, age: 0, duration: 0.42, maxScale: 1.0 });
  }

  private spawnParticles(
    origin: THREE.Vector3,
    count: number,
    colorHex: number,
    speed: number,
    life: number
  ): void {
    for (let i = 0; i < count; i++) {
      const idx = this.particleCursor;
      const p = this.particles[idx];
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
      p.color.setHex(colorHex).multiplyScalar(neonBoost(colorHex, 0.7, 1.0, 2.2));
      this.particleMesh.setColorAt(idx, p.color);
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private pushFloatText(text: string, worldPos: THREE.Vector3, color: string): void {
    this._v3.set(worldPos.x, worldPos.y + 1.35, worldPos.z);
    this._v3.project(this.activeCamera);
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

    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerMessage = null;
        this.emitHudSnapshot();
      }
    }

    if (this.phase === 'title') {
      this.arena.update(dt, this.elapsed, 1.0);
      this.updateTitleCamera(dt);
    } else if (this.phase === 'playing') {
      this.arena.update(dt, this.elapsed, this.coreHp / Math.max(1, this.maxCoreHp));
      this.updatePlayerCameraControls(dt);
      this.updateCameraTransform(dt);

      if (this.pendingOutcome) {
        this.defeatDelayTimer -= dt;
        this.updateParticles(dt);
        if (this.defeatDelayTimer <= 0) {
          const won = this.pendingOutcome === 'victory';
          this.phase = won ? 'victory' : 'gameover';
          this.pendingOutcome = null;
          audioSynth.setMusicMood('off');
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
      this.updateCameraTransform(dt);
    }

    this.previewRingMat.uniforms.uTime.value = this.elapsed;
    for (const t of this.towers) {
      t.rangeRingMat.uniforms.uTime.value = this.elapsed;
      if (t.laserBeamMat) t.laserBeamMat.uniforms.uTime.value = this.elapsed;
      for (const pm of t.rig.phongMaterials) pm.uniforms.uTime.value = this.elapsed;
    }

    this.renderBloomFrame();

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.14 && this.phase === 'playing') {
      this.hudSyncAccum = 0;
      this.emitHudSnapshot();
    }

    this.scheduleNextTick();
  }

  private updateTitleCamera(dt: number): void {
    const angle = this.elapsed * 0.15;
    const radius = 32.0;
    const camX = Math.sin(angle) * radius * 0.88;
    const camZ = Math.cos(angle) * radius * 0.72 + 5.0;
    const camY = 15.2 + Math.sin(this.elapsed * 0.35) * 1.4;
    this.perspCamera.position.set(camX, camY, camZ);
    this.perspCamera.lookAt(0, 0.6, 0);
    this.orthoCamera.position.copy(this.perspCamera.position);
    this.orthoCamera.lookAt(0, 0.6, 0);
    void dt;
  }

  private updatePlayerCameraControls(dt: number): void {
    const panSpeed = 16.0 * dt;
    let panX = 0;
    let panZ = 0;
    if (this.keysPressed.has('arrowup')) panZ -= 1;
    if (this.keysPressed.has('arrowdown')) panZ += 1;
    if (this.keysPressed.has('arrowleft')) panX -= 1;
    if (this.keysPressed.has('arrowright')) panX += 1;

    if (panX !== 0 || panZ !== 0) {
      const cosY = Math.cos(this.camYaw);
      const sinY = Math.sin(this.camYaw);
      const worldDx = panX * cosY + panZ * sinY;
      const worldDz = -panX * sinY + panZ * cosY;
      this.camTargetGoal.x = THREE.MathUtils.clamp(this.camTargetGoal.x + worldDx * panSpeed, -17, 17);
      this.camTargetGoal.z = THREE.MathUtils.clamp(this.camTargetGoal.z + worldDz * panSpeed, -11, 11);
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
    // 0. Auto-Start Next Wave countdown
    if (this.autoStartWave && !this.waveActive && this.wave > 0 && this.wave < TOTAL_WAVES) {
      this.autoStartTimer -= realDt;
      if (this.autoStartTimer <= 0) {
        this.startNextWave();
      }
    }

    // 1. Wave Spawner
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer -= simDt;
      if (this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift()!;
        this.spawnEnemy(next.enemyId);
        this.spawnTimer = this.spawnQueue.length > 0 ? this.spawnQueue[0].delay : 0;
      }
    }

    // 2. Update Enemies along Nur's Extended Multi-Switchback Path
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.dying) {
        e.deathTimer -= realDt;
        const frac = Math.max(0, e.deathTimer / (e.isFinalBoss ? 0.6 : 0.34));
        e.rig.bodyGroup.scale.set(1 + (1 - frac) * 0.4, frac, 1 + (1 - frac) * 0.4);
        e.rig.bodyGroup.rotation.z = (1 - frac) * 0.65;
        e.rig.hpBarBg.visible = false;
        e.rig.frozenOverlay.visible = false;
        if (e.deathTimer <= 0) {
          this.entityRoot.remove(e.rig.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - simDt);
      }

      if (e.slowTimer > 0) {
        e.slowTimer -= simDt;
        this.updateFrost(e, realDt);
        if (e.slowTimer <= 0) {
          e.slowRatio = 0;
          this.shatterFrost(e);
        }
      }

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= realDt;
        const flashIntensity = e.hitFlashTimer > 0 ? 1.45 : 0;
        for (const mat of e.rig.flashMaterials) {
          mat.emissive.setHex(flashIntensity > 0 ? 0xffffff : 0x000000);
          mat.emissiveIntensity = flashIntensity;
        }
      }

      const effSpeed = e.stunTimer > 0 ? 0 : e.baseSpeed * (1 - e.slowRatio);
      e.distanceTraveled += effSpeed * simDt;

      if (e.distanceTraveled >= NUR_BAKED_PATH.totalLength) {
        e.alive = false;
        this.coreHp = Math.max(0, this.coreHp - e.leakDamage);
        this.trauma = Math.min(1, this.trauma + (e.isBoss ? 0.85 : 0.38));
        audioSynth.playCoreHit();
        this.spawnParticles(e.position, 22, 0xff1744, 4.6, 0.55);
        this.pushFloatText(`-${e.leakDamage} CORE HP`, e.position, '#ff1744');

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
      e.rig.root.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);

      if (e.isFlying) {
        e.rig.bodyGroup.position.y = 0.85 + Math.sin(this.elapsed * 5.2 + e.id) * 0.14;
        if (e.rig.crownOrWings) {
          e.rig.crownOrWings.rotation.z = Math.sin(this.elapsed * 9.0 + e.id) * 0.12;
        }
      } else {
        const stride = e.distanceTraveled * (e.isBoss ? 2.2 : 4.4);
        e.rig.bodyGroup.position.y = Math.abs(Math.sin(stride)) * (e.isBoss ? 0.12 : 0.08);
        e.rig.bodyGroup.rotation.z = Math.sin(stride) * 0.05;
        if (e.rig.crownOrWings) {
          e.rig.crownOrWings.rotation.z += realDt * (e.isFinalBoss ? 1.8 : 1.3);
          e.rig.crownOrWings.rotation.y += realDt * 0.8;
        }
        if (e.rig.secondaryRing) {
          e.rig.secondaryRing.rotation.z -= realDt * 2.2;
        }
      }

      e.rig.hpBarBg.quaternion.copy(this.activeCamera.quaternion);
      const hpRatio = Math.max(0.001, e.currentHp / e.maxHp);
      e.rig.hpBarFill.scale.x = hpRatio;
      const barMat = e.rig.hpBarFill.material as THREE.MeshBasicMaterial;
      if (!e.isBoss) {
        barMat.color.setHex(hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xf59e0b : 0xef4444);
      }
    }

    // 3. Update Towers (Farming Economy + Ultimate Cooldowns + Target Selection + Combat)
    for (const tower of this.towers) {
      const preset = TOWER_PRESETS[tower.type];
      const overclocked = tower.overclockPadId !== null;

      // Spin idle & Apex rings
      if (tower.rig.spinNode) {
        const spinSpeed = tower.ultimateActiveTimer > 0 ? 5.5 : tower.type === 'farm' ? 1.6 : 2.2;
        tower.rig.spinNode.rotation.y += realDt * spinSpeed;
        if (tower.type === 'freeze' || tower.type === 'farm') {
          const baseY = tower.type === 'farm' ? 0.86 : 0.68;
          tower.rig.spinNode.position.y = baseY + Math.sin(this.elapsed * 3.0 + tower.id) * 0.06;
        }
      }
      if (tower.level >= MAX_TOWER_LEVEL) {
        tower.rig.apexRing.rotation.z += realDt * 1.4;
        tower.rig.apexRing.position.y = 1.48 + Math.sin(this.elapsed * 3.2 + tower.id) * 0.05;
      }

      // Tick Ultimate cooldown & active duration
      if (tower.ultimateCooldown > 0) {
        tower.ultimateCooldown = Math.max(0, tower.ultimateCooldown - simDt);
      }
      if (tower.ultimateActiveTimer > 0) {
        tower.ultimateActiveTimer = Math.max(0, tower.ultimateActiveTimer - simDt);
      }

      // QUANTUM DATA FARM: Passive Gold mining packets during active wave!
      if (tower.type === 'farm') {
        if (this.waveActive) {
          tower.farmTimer -= simDt * (overclocked ? 1.15 : 1.0);
          if (tower.farmTimer <= 0) {
            const packet = getScaledFarmPacket(preset.incomePerCycle, tower.level, overclocked);
            this.gold += packet;
            tower.goldEarned += packet;
            tower.farmTimer = preset.incomeCycleSec;
            audioSynth.playFarmIncome();
            this.spawnParticles(tower.position, 10, 0x34d399, 2.8, 0.42);
            this.pushFloatText(`+${packet}G`, tower.position, '#34d399');
            this.emitHudSnapshot();
          }
        }
        continue;
      }

      if (tower.recoil > 0) {
        tower.recoil = Math.max(0, tower.recoil - realDt * 4.5);
        tower.rig.recoilGroup.position.z = -tower.recoil * 0.22;
      }

      if (tower.laserActiveTimer > 0) {
        tower.laserActiveTimer -= realDt;
        if (tower.laserActiveTimer <= 0 && tower.laserBeamMesh) {
          tower.laserBeamMesh.visible = false;
        }
      }

      const rangeMeters = getScaledRangeMeters(preset.baseRangeGdd, tower.level, overclocked);
      const dmg = getScaledDamage(preset.baseDamage, tower.level);
      const fireRate =
        getScaledFireRate(preset.fireRateSec, tower.level, overclocked) /
        (tower.type === 'laser' && tower.ultimateActiveTimer > 0 ? 2.6 : 1.0);

      tower.cooldown = Math.max(0, tower.cooldown - simDt);

      const target = selectTarget(tower.position, rangeMeters, this.enemies, tower.targetingMode);
      if (target) {
        if (tower.type !== 'tesla') {
          const desiredYaw = computeTurretYaw(tower.position, target.position);
          let diff = desiredYaw - tower.rig.turretHead.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          tower.rig.turretHead.rotation.y += diff * (1 - Math.exp(-15 * simDt));
        }

        if (tower.cooldown <= 0) {
          tower.rig.turretHead.updateMatrixWorld(true);
          this.fireTowerAttack(tower, target, dmg);
          tower.cooldown = fireRate;
          tower.recoil = 1.0;
        }
      }
    }

    // 4. Update Physical Projectiles (Plasma Cannon & Cryo Emitter)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += simDt / p.duration;

      const liveTarget = this.enemies.find((e) => e.id === p.targetEnemyId && e.alive);
      if (liveTarget) {
        p.targetPos.set(
          liveTarget.position.x,
          liveTarget.position.y + (liveTarget.isFlying ? 1.25 : 0.7),
          liveTarget.position.z
        );
      }

      const t = Math.min(1, p.progress);
      p.pos.lerpVectors(p.startPos, p.targetPos, t);
      p.pos.y += Math.sin(t * Math.PI) * p.arcHeight;
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += realDt * 8;
      p.mesh.rotation.y += realDt * 6;
      p.trailAccum += realDt;
      if (p.trailAccum >= 0.03) {
        p.trailAccum = 0;
        this.spawnFlash(p.pos, TOWER_PRESETS[p.type].accentColor, p.type === 'cannon' ? 0.42 : 0.3, 0.2, 0.3);
      }

      if (p.progress >= 1) {
        if (p.aoeRadiusMeters > 0) {
          const isCryo = p.type === 'freeze';
          this.spawnShockwave(
            p.targetPos,
            p.aoeRadiusMeters,
            isCryo ? [0.49, 0.83, 0.99, 0.8] : [1.0, 0.72, 0.25, 0.85],
            isCryo ? [0.22, 0.74, 0.97, 0.0] : [1.0, 0.25, 0.05, 0.0]
          );
          this.spawnParticles(p.targetPos, isCryo ? 14 : 20, isCryo ? 0x7dd3fc : 0xfb923c, 4.8, 0.52);
          this.spawnFlash(p.targetPos, isCryo ? 0x7dd3fc : 0xfb923c, isCryo ? 1.6 : 2.4, 0.3);
          if (!isCryo) this.trauma = Math.min(1, this.trauma + 0.14);
          for (const e of this.enemies) {
            if (!e.alive) continue;
            if (distanceXZ(p.targetPos, e.position) <= p.aoeRadiusMeters) {
              this.damageEnemy(
                e,
                p.damage,
                p.ignoresArmor,
                p.sourceTowerId,
                p.slowRatio,
                p.slowDuration
              );
            }
          }
        } else {
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
          this.spawnFlash(p.targetPos, 0x7dd3fc, 1.0, 0.22);
        }

        this.entityRoot.remove(p.mesh);
        p.mesh.geometry.dispose();
        for (const child of p.mesh.children) {
          if (child instanceof THREE.Sprite) child.material.dispose();
        }
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Update Shockwave Discs & Beam Trails
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

    for (let i = this.beamTrails.length - 1; i >= 0; i--) {
      const r = this.beamTrails[i];
      r.age += realDt;
      const frac = Math.min(1, r.age / r.duration);
      r.mat.opacity = (1 - frac) * 0.92;
      if (r.age >= r.duration) {
        this.entityRoot.remove(r.mesh);
        r.mesh.geometry.dispose();
        this.beamTrails.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += realDt;
      const frac = Math.min(1, f.age / f.duration);
      const size = f.startSize + (f.endSize - f.startSize) * (1 - Math.pow(1 - frac, 2));
      f.sprite.scale.set(size, size, 1);
      f.mat.opacity = 1 - frac;
      if (f.age >= f.duration) {
        this.entityRoot.remove(f.sprite);
        f.mat.dispose();
        this.flashes.splice(i, 1);
      }
    }

    // 6. Update Pooled Particles
    this.updateParticles(realDt);

    // 7. Wave Clear + Data Farm Dividends + Final Stage Victory Check!
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    if (this.waveActive && this.spawnQueue.length === 0 && aliveCount === 0 && !this.pendingOutcome) {
      this.waveActive = false;
      const bonus = getWaveClearBonus(this.wave, this.difficulty);

      // Collect Data Farm end-of-wave dividends!
      let farmDividendTotal = 0;
      for (const t of this.towers) {
        if (t.type === 'farm') {
          const div = getScaledFarmDividend(
            TOWER_PRESETS.farm.waveDividend,
            t.level,
            t.overclockPadId !== null
          );
          farmDividendTotal += div;
          t.goldEarned += div;
          this.pushFloatText(`+${div}G DIVIDEN`, t.position, '#34d399');
        }
      }

      const totalEarned = bonus + farmDividendTotal;
      this.gold += totalEarned;
      this.score += totalEarned * 5 + this.wave * 180;
      this.syncMusicMood();

      if (this.wave >= TOTAL_WAVES) {
        this.showBanner('FINAL STAGE SELESAI! OMEGA-0 Rootkit & pasukannya berhasil dimusnahkan!');
        this.pendingOutcome = 'victory';
        this.defeatDelayTimer = 0.75;
      } else {
        audioSynth.playUpgrade(false);
        this.showBanner(
          farmDividendTotal > 0
            ? `Wave ${this.wave} selesai! Bonus +${bonus}G + Dividen Farm +${farmDividendTotal}G`
            : `Wave ${this.wave} selesai! Bonus +${bonus}G`
        );
        if (this.autoStartWave) {
          this.autoStartTimer = 1.8;
        }
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

  private buildAbilitySnapshot(t: TowerEntity): ActiveAbilitySnapshot | null {
    if (t.level < MAX_TOWER_LEVEL) return null;
    const preset = TOWER_PRESETS[t.type];
    return {
      towerId: t.id,
      towerType: t.type,
      abilityName: preset.ultimate.name,
      hotkey: preset.ultimate.hotkey,
      description: preset.ultimate.description,
      cooldownRemaining: Number(t.ultimateCooldown.toFixed(1)),
      cooldownTotal: preset.ultimate.cooldownSec,
      activeRemaining: Number(t.ultimateActiveTimer.toFixed(1)),
      ready: t.ultimateCooldown <= 0,
      accentHex: preset.accentHex,
    };
  }

  private emitHudSnapshot(): void {
    const inspectedTowerId = this.selectedTowerId ?? this.hoveredTowerId;
    const isPinned = this.selectedTowerId !== null;
    const selectedTowerEntity =
      inspectedTowerId !== null
        ? this.towers.find((t) => t.id === inspectedTowerId) ?? null
        : null;

    let selectedTower: SelectedTowerSnapshot | null = null;
    if (selectedTowerEntity) {
      const preset = TOWER_PRESETS[selectedTowerEntity.type];
      const oc = selectedTowerEntity.overclockPadId !== null;
      selectedTower = {
        id: selectedTowerEntity.id,
        isPinned,
        overclocked: oc,
        locationLabel:
          selectedTowerEntity.overclockPadId !== null
            ? `Overclock Node ${selectedTowerEntity.overclockPadId + 1}`
            : 'Dek Arena Bebas',
        type: selectedTowerEntity.type,
        displayName: preset.displayName,
        role: preset.role,
        description: preset.description,
        tierName: preset.tierNames[selectedTowerEntity.level - 1],
        nextTierName:
          selectedTowerEntity.level < MAX_TOWER_LEVEL
            ? preset.tierNames[selectedTowerEntity.level]
            : null,
        level: selectedTowerEntity.level,
        damage: getScaledDamage(preset.baseDamage, selectedTowerEntity.level),
        rangeGdd: Math.round(getScaledRangeGdd(preset.baseRangeGdd, selectedTowerEntity.level, oc)),
        rangeMeters: Number(getScaledRangeMeters(preset.baseRangeGdd, selectedTowerEntity.level, oc).toFixed(1)),
        fireRateSec: getScaledFireRate(preset.fireRateSec, selectedTowerEntity.level, oc),
        farmPacketGold:
          selectedTowerEntity.type === 'farm'
            ? getScaledFarmPacket(preset.incomePerCycle, selectedTowerEntity.level, oc)
            : 0,
        farmWaveDividend:
          selectedTowerEntity.type === 'farm'
            ? getScaledFarmDividend(preset.waveDividend, selectedTowerEntity.level, oc)
            : 0,
        chainCount: getScaledChainCount(preset.chainCount, selectedTowerEntity.level),
        targetingMode: selectedTowerEntity.targetingMode,
        totalInvested: selectedTowerEntity.totalInvested,
        upgradeCost: calculateUpgradeCost(preset.baseCost, selectedTowerEntity.level, this.difficulty),
        sellRefund: calculateSellRefund(selectedTowerEntity.totalInvested),
        kills: selectedTowerEntity.kills,
        goldEarned: selectedTowerEntity.goldEarned,
        accentHex: preset.accentHex,
        ultimate: this.buildAbilitySnapshot(selectedTowerEntity),
      };
    }

    const overclockUnlockCost = this.getOverclockCost();
    const selectedLockedPad: LockedPadSnapshot | null =
      this.selectedLockedPadId !== null && !this.unlockedOverclockPads.has(this.selectedLockedPadId)
        ? {
            padId: this.selectedLockedPadId,
            name: `Overclock Node ${this.selectedLockedPadId + 1}`,
            unlockCost: overclockUnlockCost,
            canAfford: this.gold >= overclockUnlockCost,
          }
        : null;

    const abilities = this.towers
      .map((t) => this.buildAbilitySnapshot(t))
      .filter((a): a is ActiveAbilitySnapshot => a !== null);

    // Prioritize Final Boss in Boss Bar if both Mid-Boss and Final Boss exist on Wave 15!
    const activeBoss =
      this.enemies.find((e) => e.isFinalBoss && e.alive) ??
      this.enemies.find((e) => e.isBoss && e.alive);
    const bossStatus = activeBoss
      ? {
          name: ENEMY_PRESETS[activeBoss.type].displayName,
          role: ENEMY_PRESETS[activeBoss.type].role,
          hp: Math.ceil(activeBoss.currentHp),
          maxHp: activeBoss.maxHp,
          isFinalBoss: activeBoss.isFinalBoss,
        }
      : null;

    const currentDef = getWaveDefinition(Math.max(1, this.wave));
    const aliveEnemies = this.enemies.filter((e) => e.alive).length + this.spawnQueue.length;

    this.onHudUpdate({
      phase: this.phase,
      difficulty: this.difficulty,
      overclockUnlockCost,
      gold: this.gold,
      coreHp: this.coreHp,
      maxCoreHp: this.maxCoreHp,
      wave: this.wave,
      totalWaves: TOTAL_WAVES,
      stageLabel: currentDef?.stageLabel ?? 'Stage 1 · Perimeter Scan',
      waveActive: this.waveActive,
      autoStartWave: this.autoStartWave,
      enemiesRemaining: aliveEnemies,
      enemiesDefeated: this.enemiesDefeated,
      score: this.score,
      timeScale: this.timeScale,
      activeBuildType: this.activeBuildType,
      selectedTowerId: this.selectedTowerId,
      selectedTower,
      selectedLockedPad,
      unlockedOverclockCount: this.unlockedOverclockPads.size,
      abilities,
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
