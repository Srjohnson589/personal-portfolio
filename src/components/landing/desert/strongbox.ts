import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ATMOSPHERE_GLSL,
  NOISE_GLSL,
  TERRAIN_LOOKUP_GLSL,
  type SharedUniforms,
} from "./shaders";
import { SUN_DIRECTION } from "./terrain-data";

const PLATE = 0;
const BAND = 1;
const BRASS = 2;

const WIDTH = 1.3;
const DEPTH = 0.82;
const BODY_HEIGHT = 0.62;
const LID_RADIUS = DEPTH / 2;

function part(geometry: THREE.BufferGeometry, kind: number) {
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.deleteAttribute("uv");
  const count = prepared.getAttribute("position").count;
  prepared.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(count).fill(kind), 1));
  return prepared;
}

function placed(geometry: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  return geometry;
}

function buildStrongboxGeometry() {
  const parts: THREE.BufferGeometry[] = [];

  parts.push(part(placed(new THREE.BoxGeometry(WIDTH, BODY_HEIGHT, DEPTH), 0, BODY_HEIGHT / 2, 0), PLATE));
  parts.push(
    part(
      placed(new THREE.CylinderGeometry(LID_RADIUS, LID_RADIUS, WIDTH, 28, 1, false, 0, Math.PI), 0, BODY_HEIGHT, 0, 0, 0, Math.PI / 2),
      PLATE,
    ),
  );

  const bandXs = [-WIDTH / 2 + 0.07, -0.2, 0.2, WIDTH / 2 - 0.07];
  for (const x of bandXs) {
    parts.push(part(placed(new THREE.BoxGeometry(0.075, BODY_HEIGHT + 0.01, DEPTH + 0.025), x, BODY_HEIGHT / 2, 0), BAND));
    parts.push(
      part(
        placed(new THREE.CylinderGeometry(LID_RADIUS + 0.012, LID_RADIUS + 0.012, 0.075, 28, 1, false, 0, Math.PI), x, BODY_HEIGHT, 0, 0, 0, Math.PI / 2),
        BAND,
      ),
    );
    for (let i = 0; i < 4; i += 1) {
      const y = 0.08 + i * ((BODY_HEIGHT - 0.16) / 3);
      for (const side of [-1, 1]) {
        parts.push(part(placed(new THREE.SphereGeometry(0.018, 6, 4), x, y, side * (DEPTH / 2 + 0.014)), BAND));
      }
    }
  }

  parts.push(part(placed(new THREE.BoxGeometry(WIDTH + 0.02, 0.06, DEPTH + 0.03), 0, 0.03, 0), BAND));
  parts.push(part(placed(new THREE.BoxGeometry(WIDTH + 0.015, 0.045, DEPTH + 0.02), 0, BODY_HEIGHT - 0.02, 0), BAND));

  for (const side of [-1, 1]) {
    parts.push(part(placed(new THREE.TorusGeometry(0.09, 0.016, 6, 12, Math.PI), side * (WIDTH / 2 + 0.03), BODY_HEIGHT * 0.62, 0, 0, Math.PI / 2, Math.PI), BAND));
  }

  const front = DEPTH / 2 + 0.02;
  parts.push(part(placed(new THREE.BoxGeometry(0.2, 0.22, 0.03), 0, BODY_HEIGHT - 0.06, front), BAND));
  parts.push(part(placed(new THREE.BoxGeometry(0.15, 0.14, 0.06), 0, BODY_HEIGHT - 0.27, front + 0.04), BRASS));
  parts.push(part(placed(new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI), 0, BODY_HEIGHT - 0.2, front + 0.04), BRASS));

  return mergeGeometries(parts);
}

const RELIC_SHADER = {
  vertexShader: /* glsl */ `
    attribute float aPart;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vLocal;
    varying float vPart;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      vNormal = normalize(mat3(modelMatrix) * normal);
      vLocal = position;
      vPart = aPart;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uCover;
    uniform float uGround;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vLocal;
    varying float vPart;
    ${NOISE_GLSL}
    ${ATMOSPHERE_GLSL}
    ${TERRAIN_LOOKUP_GLSL}

    const vec3 SAND_ALBEDO = vec3(0.5, 0.27, 0.13);

    float ggx(float nh, float roughness) {
      float a = roughness * roughness;
      float d = nh * nh * (a * a - 1.0) + 1.0;
      return a * a / (3.14159 * d * d);
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(cameraPosition - vWorldPosition);
      if (dot(n, v) < 0.0) n = -n;
      vec3 l = uSunDir;

      float part = floor(vPart + 0.5);
      float streaks = vnoise(vec2(vLocal.x * 34.0 + vLocal.z * 21.0, vLocal.y * 5.0));
      float rust = smoothstep(0.45, 0.85, fbm(vLocal.xy * 16.0 + vLocal.zx * 11.0) * 0.75 + streaks * 0.35) * 0.75;
      float pitting = vnoise(vLocal.xz * 60.0 + vLocal.y * 40.0);

      vec3 albedo = mix(vec3(0.12, 0.105, 0.092), vec3(0.22, 0.11, 0.055), rust) * (0.9 + 0.2 * streaks);
      float metal = mix(0.75, 0.08, rust);
      float roughness = mix(0.42, 0.92, rust) + pitting * 0.06;

      if (part == 1.0) {
        albedo = mix(vec3(0.05, 0.046, 0.042), vec3(0.2, 0.085, 0.04), rust * 0.6);
        metal = mix(0.85, 0.15, rust * 0.6);
        roughness = mix(0.34, 0.85, rust * 0.6);
      } else if (part == 2.0) {
        albedo = mix(vec3(0.62, 0.43, 0.17), vec3(0.18, 0.2, 0.12), smoothstep(0.35, 0.8, rust + pitting * 0.3));
        metal = 0.9;
        roughness = 0.3 + 0.3 * rust;
      }

      float height = vWorldPosition.y - uGround;
      float drifted = vnoise(vWorldPosition.xz * 7.0) * 0.7 + vnoise(vWorldPosition.xz * 23.0) * 0.3;
      float settled = smoothstep(0.1, 0.7, n.y) * smoothstep(0.6, 0.4, drifted + 0.62 - uCover * 0.55);
      float banked = smoothstep(0.28, 0.0, height) * smoothstep(0.2, 0.6, vnoise(vWorldPosition.xz * 6.0 + 3.0) + 0.4);
      float dusted = smoothstep(0.6, 0.95, n.y) * smoothstep(0.35, 0.75, drifted) * 0.4;
      float sand = clamp(max(max(settled * uCover, banked * mix(0.35, 1.0, uCover)), dusted), 0.0, 1.0);
      vec3 grain = SAND_ALBEDO * (0.88 + 0.24 * vnoise(vWorldPosition.xz * 24.0));
      albedo = mix(albedo, grain, sand);
      metal = mix(metal, 0.0, sand);
      roughness = mix(roughness, 1.0, sand);

      float sunVisibility = texture2D(uLight, terrainUv(vWorldPosition.xz)).r;
      float nl = max(dot(n, l), 0.0);
      float nv = max(dot(n, v), 1e-3);
      vec3 h = normalize(l + v);
      vec3 f0 = mix(vec3(0.04), albedo, metal);
      vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
      float k = roughness * roughness * 0.5;
      float visibility = 1.0 / ((nl * (1.0 - k) + k) * (nv * (1.0 - k) + k) * 4.0);
      vec3 specular = fresnel * ggx(max(dot(n, h), 0.0), max(roughness, 0.08)) * visibility;

      vec3 direct = uSunColor * nl * sunVisibility;
      float occlusion = mix(0.45, 1.0, smoothstep(0.0, 0.5, height));
      vec3 sky = AMBIENT_SKY * (0.55 + 0.45 * n.y);
      vec3 bounce = SAND_ALBEDO * uSunColor * 0.06 * (0.5 - 0.5 * n.y);
      vec3 diffuse = albedo * (1.0 - metal);
      vec3 color = diffuse * (direct + (sky + bounce) * occlusion) + specular * direct;

      vec3 r = reflect(-v, n);
      vec3 environment = r.y > 0.0 ? mix(hazeColor(r), AMBIENT_SKY * 2.0, smoothstep(0.0, 0.6, r.y)) : SAND_ALBEDO * (uSunColor * 0.12 + AMBIENT_SKY);
      vec3 envFresnel = f0 + (1.0 - f0) * pow(1.0 - nv, 5.0) * (1.0 - roughness);
      color += environment * envFresnel * (1.0 - roughness * 0.7) * 0.45 * occlusion;

      gl_FragColor = vec4(applyAtmosphere(color, vWorldPosition), 1.0);
    }
  `,
};

function createRelicMaterial(shared: SharedUniforms, ground: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uCover: { value: 1 },
      uGround: { value: ground },
    },
    vertexShader: RELIC_SHADER.vertexShader,
    fragmentShader: RELIC_SHADER.fragmentShader,
  });
}

function createContactShadow(length: number, width: number) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    blending: THREE.CustomBlending,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.ZeroFactor,
    uniforms: { uStrength: { value: 1 }, uLength: { value: length } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uStrength;
      uniform float uLength;
      varying vec2 vUv;
      void main() {
        float along = vUv.y;
        float spread = 0.32 + 0.18 * along;
        float across = abs(vUv.x - 0.5) / spread;
        float shape = smoothstep(1.0, 0.55 - 0.3 * along, across) * smoothstep(1.0, 0.55, along) * smoothstep(0.0, 0.04, along);
        vec3 shade = mix(vec3(1.0), vec3(0.36, 0.38, 0.52), shape * uStrength);
        gl_FragColor = vec4(shade, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, 1, length);
  return mesh;
}

function createGlint() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        vec4 view = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float scale = clamp(-view.z * 0.034, 0.18, 2.4);
        view.xy += position.xy * scale;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        float core = exp(-r * r * 60.0) + exp(-r * r * 9.0) * 0.18;
        float rays = exp(-abs(vUv.x) * 26.0) * exp(-abs(vUv.y) * 3.5) + exp(-abs(vUv.y) * 26.0) * exp(-abs(vUv.x) * 3.5);
        float shape = (core + rays * 0.35) * smoothstep(1.0, 0.6, r);
        gl_FragColor = vec4(vec3(2.4, 1.5, 0.75) * shape * uIntensity, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return { mesh, intensity: material.uniforms.uIntensity };
}

export type Strongbox = ReturnType<typeof createStrongbox>;

export function createStrongbox(shared: SharedUniforms, position: THREE.Vector3, groundNormal: THREE.Vector3) {
  const group = new THREE.Group();
  group.position.copy(position);

  const material = createRelicMaterial(shared, position.y);
  const box = new THREE.Mesh(buildStrongboxGeometry(), material);
  box.scale.setScalar(0.85);
  const restTilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), groundNormal);
  const facing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.55);
  const restOrientation = restTilt.clone().multiply(facing);
  const buriedOrientation = restOrientation
    .clone()
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.26, 0, -0.14)));
  group.add(box);

  const shadowDirection = new THREE.Vector2(-SUN_DIRECTION.x, -SUN_DIRECTION.z).normalize();
  const shadowLength = 3.2;
  const shadow = createContactShadow(shadowLength, 1.7);
  shadow.quaternion.copy(restTilt).multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(shadowDirection.x, shadowDirection.y)),
  );
  shadow.position.copy(
    new THREE.Vector3(shadowDirection.x, 0, shadowDirection.y).multiplyScalar(shadowLength / 2 - 0.35),
  );
  shadow.position.y = 0.02;
  group.add(shadow);

  const glint = createGlint();
  glint.mesh.position.set(0.2, BODY_HEIGHT + LID_RADIUS * 0.72, LID_RADIUS * 0.72);
  box.add(glint.mesh);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitTarget.position.y = 0.4;
  group.add(hitTarget);

  const shadowMaterial = shadow.material as THREE.ShaderMaterial;
  let progress = 0;

  const apply = () => {
    const eased = progress * progress * (3 - 2 * progress);
    const cover = 1 - THREE.MathUtils.smoothstep(progress, 0.05, 0.7);
    box.quaternion.slerpQuaternions(buriedOrientation, restOrientation, eased);
    box.position.set(0, THREE.MathUtils.lerp(-0.62, -0.42, eased), 0);
    material.uniforms.uCover.value = cover;
    shadowMaterial.uniforms.uStrength.value = THREE.MathUtils.lerp(0.55, 1, eased);
  };
  apply();

  return {
    group,
    hitTarget,
    get progress() {
      return progress;
    },
    setProgress(value: number) {
      progress = THREE.MathUtils.clamp(value, 0, 1);
      apply();
    },
    setGlint(value: number) {
      glint.intensity.value = value;
      glint.mesh.visible = value > 0.001;
    },
    dispose() {
      box.geometry.dispose();
      material.dispose();
      shadow.geometry.dispose();
      shadowMaterial.dispose();
      glint.mesh.geometry.dispose();
      (glint.mesh.material as THREE.Material).dispose();
      hitTarget.geometry.dispose();
      (hitTarget.material as THREE.Material).dispose();
    },
  };
}
