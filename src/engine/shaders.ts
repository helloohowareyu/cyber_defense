// Custom GLSL Shaders & Procedural Offline Textures
// Direct WebGL2/Three.js port of Yusuf's 3 Godot shaders (RPS CIF65116 CPMK-2):
// 1. freeze_crystal_phong.gdshader -> Explicit Blinn-Phong + Fresnel Rim Lighting
// 2. laser_beam_scroll.gdshader    -> Scrolling UV Texture Mapping + Additive Blending
// 3. range_ring_blend.gdshader     -> Barycentric Vertex Color + Alpha Blending
// Plus animated road flow shader and 100% offline CanvasTexture generators.

import * as THREE from 'three';

/**
 * 1. Blinn-Phong + Fresnel Rim Shader (port of freeze_crystal_phong.gdshader)
 * Explicitly computes Ambient + Lambertian Diffuse + Blinn-Phong Specular (N.H)^s + Fresnel Rim.
 */
export function createBlinnPhongCrystalMaterial(options: {
  baseColor: number | string;
  rimColor?: number | string;
  ambientStrength?: number;
  shininess?: number;
  specularStrength?: number;
  rimPower?: number;
  opacity?: number;
  transparent?: boolean;
}): THREE.ShaderMaterial {
  const base = new THREE.Color(options.baseColor);
  const rim = new THREE.Color(options.rimColor ?? 0xbef2ff);

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: base },
      uRimColor: { value: rim },
      uLightDir: { value: new THREE.Vector3(0.55, 0.78, 0.35).normalize() },
      uLightColor: { value: new THREE.Color(0xfff4e0) },
      uAmbientStrength: { value: options.ambientStrength ?? 0.22 },
      uShininess: { value: options.shininess ?? 48.0 },
      uSpecularStrength: { value: options.specularStrength ?? 1.25 },
      uRimPower: { value: options.rimPower ?? 2.6 },
      uOpacity: { value: options.opacity ?? 1.0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalWorld;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBaseColor;
      uniform vec3 uRimColor;
      uniform vec3 uLightDir;
      uniform vec3 uLightColor;
      uniform float uAmbientStrength;
      uniform float uShininess;
      uniform float uSpecularStrength;
      uniform float uRimPower;
      uniform float uOpacity;
      uniform float uTime;

      varying vec3 vNormalWorld;
      varying vec3 vWorldPos;

      void main() {
        vec3 N = normalize(vNormalWorld);
        vec3 L = normalize(uLightDir);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 H = normalize(L + V);

        // Ambient + Lambertian Diffuse + Blinn-Phong Specular
        vec3 ambient = uBaseColor * uAmbientStrength;
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = uBaseColor * uLightColor * diff * 0.95;
        float spec = pow(max(dot(N, H), 0.0), uShininess);
        vec3 specular = uLightColor * spec * uSpecularStrength;

        // Fresnel Rim Glow
        float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uRimPower);
        float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
        vec3 rimGlow = uRimColor * fresnel * 0.85 * pulse;

        vec3 finalColor = ambient + diffuse + specular + rimGlow;
        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `,
    transparent: options.transparent ?? false,
    depthWrite: !(options.transparent ?? false),
    side: THREE.FrontSide,
  });
}

/**
 * Procedural 1D pulse texture for Laser Beam scrolling UV shader (GL_REPEAT).
 */
export function createLaserPulseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.0, '#182430');
    grad.addColorStop(0.2, '#ffffff');
    grad.addColorStop(0.35, '#2b4054');
    grad.addColorStop(0.55, '#a8f0ff');
    grad.addColorStop(0.75, '#ffffff');
    grad.addColorStop(1.0, '#182430');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 2. Scrolling UV + Additive Blending Laser Beam Shader (port of laser_beam_scroll.gdshader)
 * glBlendFunc(GL_SRC_ALPHA, GL_ONE) via THREE.AdditiveBlending.
 */
export function createLaserBeamMaterial(
  pulseTexture: THREE.Texture,
  beamColor: number | string = 0x22d3ee
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBeamColor: { value: new THREE.Color(beamColor) },
      uPulseTexture: { value: pulseTexture },
      uTime: { value: 0 },
      uScrollSpeed: { value: 6.5 },
      uIntensity: { value: 2.2 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBeamColor;
      uniform sampler2D uPulseTexture;
      uniform float uTime;
      uniform float uScrollSpeed;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec2 scrolledUv = vec2(vUv.x * 2.4 - uTime * uScrollSpeed, vUv.y);
        float pulse = texture2D(uPulseTexture, scrolledUv).r;
        float core = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float coreFalloff = core * core;
        vec3 col = mix(uBeamColor, vec3(1.0), coreFalloff * 0.55) * (0.45 + pulse * 0.9) * uIntensity;
        gl_FragColor = vec4(col, coreFalloff);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * 3. Vertex-Color Interpolated Alpha-Blended Ring & Shockwave Shader (port of range_ring_blend.gdshader)
 * glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA) via THREE.NormalBlending.
 */
export function createRangeRingMaterial(options?: {
  pulseSpeed?: number;
  pulseStrength?: number;
  fade?: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulseSpeed: { value: options?.pulseSpeed ?? 0.85 },
      uPulseStrength: { value: options?.pulseStrength ?? 0.22 },
      uFade: { value: options?.fade ?? 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPulseSpeed;
      uniform float uPulseStrength;
      uniform float uFade;
      varying vec4 vColor;

      void main() {
        float pulse = 1.0 - uPulseStrength * (0.5 + 0.5 * sin(uTime * uPulseSpeed * 6.2831853));
        gl_FragColor = vec4(vColor.rgb, vColor.a * pulse * uFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * 4. Animated directional chevron guide strip along Nur's Bezier road deck.
 */
export function createRoadChevronMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x00f0ff) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        // vUv.x = distance along road (meters), vUv.y = 0..1 across width
        float crossCenter = abs(vUv.y - 0.5) * 2.0; // 0 at center, 1 at edges
        float chevronCoord = fract(vUv.x * 0.42 - uTime * 0.85 + crossCenter * 0.32);
        float chevron = smoothstep(0.0, 0.08, chevronCoord) * (1.0 - smoothstep(0.14, 0.24, chevronCoord));
        float laneMask = 1.0 - smoothstep(0.45, 0.72, crossCenter);
        float alpha = chevron * laneMask * 0.36;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * Procedural PBR Tech-Deck Albedo + Bump + Roughness CanvasTextures for Nur's 32x18 arena.
 */
export function createCircuitDeckTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;

  // Albedo canvas
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const actx = albedoCanvas.getContext('2d')!;
  actx.fillStyle = '#071329';
  actx.fillRect(0, 0, size, size);

  // Subtle metallic tile paneling
  const tile = 64;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const shade = ((x / tile + y / tile) % 2 === 0) ? '#091833' : '#061124';
      actx.fillStyle = shade;
      actx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      actx.strokeStyle = 'rgba(0, 229, 255, 0.09)';
      actx.lineWidth = 1;
      actx.strokeRect(x + 2.5, y + 2.5, tile - 5, tile - 5);

      // Subtle micro circuit trace
      if ((x + y) % 128 === 0) {
        actx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        actx.beginPath();
        actx.moveTo(x + 12, y + 32);
        actx.lineTo(x + 26, y + 32);
        actx.lineTo(x + 34, y + 22);
        actx.lineTo(x + 50, y + 22);
        actx.stroke();
      }
    }
  }

  // Bump & roughness canvas (grayscale linear)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#909090';
  bctx.fillRect(0, 0, size, size);
  bctx.strokeStyle = '#303030';
  bctx.lineWidth = 3;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      bctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
    }
  }

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#555555';
  rctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      rctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? '#464646' : '#646464';
      rctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 4.5);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(8, 4.5);
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(8, 4.5);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, bumpMap, roughnessMap };
}

/**
 * Soft radial contact shadow texture for grounding towers and enemies on the deck.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
