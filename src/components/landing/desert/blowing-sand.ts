import * as THREE from "three";
import {
  ATMOSPHERE_GLSL,
  NOISE_GLSL,
  TERRAIN_LOOKUP_GLSL,
  WIND_GLSL,
  type SharedUniforms,
} from "./shaders";

const SHADER_PRELUDE = `${NOISE_GLSL}${ATMOSPHERE_GLSL}${WIND_GLSL}${TERRAIN_LOOKUP_GLSL}`;

function seeds(count: number, size: number) {
  const data = new Float32Array(count * size);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random();
  return data;
}

// Grains hopping just above the surface, drawn as motion-blurred screen-space streaks.
export function createSaltation(shared: SharedUniforms, count: number) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds(count, 4), 4));
  geometry.instanceCount = count;

  const resolution = { value: new THREE.Vector2(1, 1) };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...shared,
      uResolution: resolution,
      uBox: { value: 80 },
      uStreak: { value: 0.07 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform vec2 uResolution;
      uniform float uBox;
      uniform float uStreak;
      varying float vAlpha;
      varying float vEdge;
      varying vec3 vColor;
      ${SHADER_PRELUDE}

      void main() {
        float speed = 0.55 + aSeed.w * 0.9;
        float hopLength = 0.9 + aSeed.z * 2.0;
        float hopHeight = 0.04 + pow(aSeed.z, 3.0) * 0.55;
        vec2 travelled = uWind * uFlow * speed;
        vec2 rel = mod(aSeed.xy * uBox + travelled - cameraPosition.xz + uBox * 0.5, uBox) - uBox * 0.5;
        vec2 p = cameraPosition.xz + rel;
        float ground = texture2D(uHeight, terrainUv(p)).r;
        float hop = fract(uFlow * speed / hopLength + aSeed.z * 7.0);

        vec3 head = vec3(p.x, ground + 0.03 + hopHeight * 4.0 * hop * (1.0 - hop), p.y);
        float climb = hopHeight * 4.0 * (1.0 - 2.0 * hop) * speed * uStreak / hopLength;
        vec3 tail = head - vec3(uWind.x * speed * uStreak, climb, uWind.y * speed * uStreak);

        vec4 clipHead = projectionMatrix * viewMatrix * vec4(head, 1.0);
        vec4 clipTail = projectionMatrix * viewMatrix * vec4(tail, 1.0);
        vec2 screen = (clipHead.xy / clipHead.w - clipTail.xy / clipTail.w) * uResolution;
        float screenLength = length(screen);
        vec2 dir = screenLength > 1e-3 ? screen / screenLength : vec2(1.0, 0.0);
        vec2 normal = vec2(-dir.y, dir.x);

        vec4 clip = mix(clipTail, clipHead, position.x);
        float grainPixels = 0.012 * uResolution.y * projectionMatrix[1][1] / max(clip.w, 1e-3) * 0.5;
        float width = max(grainPixels * 0.6, 0.8);
        clip.xy += normal * position.y * width / uResolution * 2.0 * clip.w;
        gl_Position = clip;

        float distanceToCamera = length(head - cameraPosition);
        float fade = smoothstep(uBox * 0.5, uBox * 0.28, distanceToCamera) * smoothstep(0.4, 1.6, distanceToCamera);
        vAlpha = gustField(head.xz) * fade * (0.3 + 0.7 * aSeed.z) * min(grainPixels / 0.9, 1.0) * 0.28;
        vEdge = position.y;

        float sunVisibility = texture2D(uLight, terrainUv(p)).r;
        float forward = min(phaseHG(dot(normalize(head - cameraPosition), uSunDir), 0.6), 10.0);
        vec3 grain = vec3(0.55, 0.32, 0.17) * (uSunColor * (0.16 + 0.05 * forward) * sunVisibility + AMBIENT_SKY * 1.4);
        vColor = applyAtmosphere(grain, head);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vEdge;
      varying vec3 vColor;
      void main() {
        float alpha = vAlpha * (1.0 - vEdge * vEdge);
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, resolution };
}

type VeilOptions = {
  origins: Float32Array;
  count: number;
  mode?: "drift" | "burst";
  rate: number;
  travel: number;
  lift: number;
  spread: number;
  size: [number, number];
  stretch: number;
  opacity: number;
  box?: number;
};

// Soft, wind-stretched sprites: sand streaming off crests, or dust sheets sliding across the flats.
function createVeil(shared: SharedUniforms, options: VeilOptions) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(options.origins, 3));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds(options.count, 4), 4));
  geometry.instanceCount = options.count;

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: options.mode ? { [options.mode.toUpperCase()]: "" } : {},
    uniforms: {
      ...shared,
      uRate: { value: options.rate },
      uTravel: { value: options.travel },
      uLift: { value: options.lift },
      uSpread: { value: options.spread },
      uSize: { value: new THREE.Vector2(...options.size) },
      uStretch: { value: options.stretch },
      uOpacity: { value: options.opacity },
      uBox: { value: options.box ?? 0 },
      uStart: { value: -1000 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOrigin;
      attribute vec4 aSeed;
      uniform float uRate;
      uniform float uTravel;
      uniform float uLift;
      uniform float uSpread;
      uniform vec2 uSize;
      uniform float uStretch;
      uniform float uOpacity;
      uniform float uBox;
      uniform float uStart;
      varying vec2 vCorner;
      varying vec2 vSeed;
      varying vec3 vColor;
      varying float vAlpha;
      ${SHADER_PRELUDE}

      void main() {
        vec3 wind = vec3(uWind.x, 0.0, uWind.y);
        vec3 side = vec3(-uWind.y, 0.0, uWind.x);

        #ifdef DRIFT
          vec2 travelled = uWind * uFlow * (0.6 + aSeed.z * 0.5);
          vec2 rel = mod(aOrigin.xz * uBox + travelled - cameraPosition.xz + uBox * 0.5, uBox) - uBox * 0.5;
          vec2 p = cameraPosition.xz + rel;
          float ground = texture2D(uHeight, terrainUv(p)).r;
          float size = mix(uSize.x, uSize.y, aSeed.w);
          vec3 center = vec3(p.x, ground + size * 0.22, p.y);
          float envelope = smoothstep(uBox * 0.5, uBox * 0.3, length(rel)) * (0.55 + 0.45 * sin(uTime * 0.35 + aSeed.x * 6.283));
        #elif defined(BURST)
          float life = (uTime - uStart) * uRate * (0.6 + 0.8 * aSeed.y) - aSeed.x * 0.35;
          vec3 center = aOrigin
            + wind * life * uTravel * (0.5 + aSeed.z)
            + side * (aSeed.w - 0.5) * uSpread * (0.4 + life)
            + vec3(0.0, uLift * life * (1.0 - 0.6 * life) * (0.5 + aSeed.z), 0.0);
          float ground = texture2D(uHeight, terrainUv(center.xz)).r;
          float size = mix(uSize.x, uSize.y, clamp(life, 0.0, 1.0));
          float envelope = step(0.0, life) * step(life, 1.0) * smoothstep(0.0, 0.06, life) * pow(max(1.0 - life, 0.0), 1.6);
        #else
          float life = fract(uTime * uRate * (0.7 + 0.6 * aSeed.y) + aSeed.x);
          vec3 center = aOrigin
            + wind * life * uTravel * (0.7 + aSeed.z * 0.6)
            + side * (aSeed.w - 0.5) * uSpread * (0.3 + life)
            + vec3(0.0, uLift * life * (1.0 - 0.45 * life), 0.0);
          float ground = texture2D(uHeight, terrainUv(center.xz)).r;
          float size = mix(uSize.x, uSize.y, life);
          float envelope = smoothstep(0.0, 0.12, life) * pow(1.0 - life, 1.4);
        #endif

        vec4 view = viewMatrix * vec4(center, 1.0);
        vec3 windView = (viewMatrix * vec4(wind, 0.0)).xyz;
        float projected = length(windView.xy);
        vec2 dir = projected > 1e-3 ? windView.xy / projected : vec2(1.0, 0.0);
        float stretch = mix(1.0, uStretch, projected);
        vec2 corner = position.xy;
        view.xy += (dir * corner.x * stretch + vec2(-dir.y, dir.x) * corner.y) * size;
        gl_Position = projectionMatrix * view;

        float farFade = 1.0 - smoothstep(280.0, 460.0, length(center - cameraPosition));
        #ifdef BURST
          float nearFade = smoothstep(0.6, 2.5, -view.z);
          vAlpha = envelope * nearFade * farFade * uOpacity;
        #else
          float nearFade = smoothstep(1.5, 9.0, -view.z);
          vAlpha = envelope * gustField(center.xz) * nearFade * farFade * uOpacity;
        #endif

        float sunVisibility = max(texture2D(uLight, terrainUv(center.xz)).r, smoothstep(1.0, 6.0, center.y - ground));
        float forward = min(phaseHG(dot(normalize(center - cameraPosition), uSunDir), 0.62), 9.0);
        vec3 dust = vec3(0.62, 0.4, 0.24);
        vColor = applyAtmosphere(dust * (uSunColor * (0.05 + 0.12 * forward) * sunVisibility + AMBIENT_SKY * 1.4), center);
        vCorner = corner;
        vSeed = aSeed.xy;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vCorner;
      varying vec2 vSeed;
      varying vec3 vColor;
      varying float vAlpha;
      ${NOISE_GLSL}

      void main() {
        float r = length(vCorner);
        float shape = exp(-r * r * 2.6) * smoothstep(1.0, 0.75, r);
        vec2 q = vCorner * 1.6 + vSeed * 37.0 + vec2(-uTime * 0.25, 0.0);
        float wisp = vnoise(q) * 0.65 + vnoise(q * 2.7 + 4.0) * 0.35;
        float alpha = shape * smoothstep(0.25, 0.85, wisp + 0.25 - r * 0.25) * vAlpha;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export function createCrestPlumes(shared: SharedUniforms, crests: Float32Array, perCrest: number) {
  const crestCount = crests.length / 3;
  const count = crestCount * perCrest;
  const origins = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const crest = Math.floor(i / perCrest) * 3;
    origins[i * 3] = crests[crest];
    origins[i * 3 + 1] = crests[crest + 1] + 0.2;
    origins[i * 3 + 2] = crests[crest + 2];
  }
  return createVeil(shared, {
    origins,
    count,
    rate: 0.16,
    travel: 16,
    lift: 1.4,
    spread: 5,
    size: [0.7, 4.2],
    stretch: 2.4,
    opacity: 0.2,
  });
}

export function createDriftSheets(shared: SharedUniforms, count: number) {
  return createVeil(shared, {
    origins: seeds(count, 3),
    count,
    mode: "drift",
    rate: 0,
    travel: 0,
    lift: 0,
    spread: 0,
    size: [5, 18],
    stretch: 3.6,
    opacity: 0.075,
    box: 420,
  });
}

export function createSandBurst(shared: SharedUniforms, origin: THREE.Vector3, radius: number, count: number) {
  const origins = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    origins[i * 3] = origin.x + Math.cos(angle) * r;
    origins[i * 3 + 1] = origin.y + Math.random() * 0.3;
    origins[i * 3 + 2] = origin.z + Math.sin(angle) * r;
  }
  const mesh = createVeil(shared, {
    origins,
    count,
    mode: "burst",
    rate: 0.42,
    travel: 11,
    lift: 2.6,
    spread: 4,
    size: [0.35, 2.8],
    stretch: 2,
    opacity: 0.55,
  });
  const start = (mesh.material as THREE.ShaderMaterial).uniforms.uStart;
  return { mesh, start };
}
