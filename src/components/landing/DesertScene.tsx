"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type CameraState = { x: number; z: number; yaw: number; pitch: number };
type SandState = { positions: Float32Array; velocities: Float32Array };
type AreaDefinition = {
  id: string;
  label: string;
  description: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  hue: number;
};
type AreaRuntime = {
  group: THREE.Group;
  glow: THREE.Mesh;
  core: THREE.Mesh;
  label: THREE.Sprite;
  labelMaterial: THREE.SpriteMaterial;
  beams: THREE.Mesh[];
  nodes: THREE.Mesh[];
  prominence: number;
  target: number;
};
type NetworkEdge = {
  from: string;
  to: string;
  curve: THREE.QuadraticBezierCurve3;
  line: THREE.Line;
  packet: THREE.Mesh;
  packetPhase: number;
  packetSpeed: number;
};

const TECH_AREAS: AreaDefinition[] = [
  {
    id: "backend",
    label: "BACKEND",
    description: "Distributed services, queues, and orchestration",
    x: -54,
    z: -126,
    width: 3.8,
    height: 25,
    depth: 4,
    hue: 32,
  },
  {
    id: "apis",
    label: "APIs",
    description: "Interfaces, versioning, and request flows",
    x: 2,
    z: -178,
    width: 3.4,
    height: 18,
    depth: 3.6,
    hue: 36,
  },
  {
    id: "integrations",
    label: "INTEGRATIONS",
    description: "External systems wired together carefully",
    x: 52,
    z: -152,
    width: 4.2,
    height: 21,
    depth: 4,
    hue: 25,
  },
  {
    id: "data",
    label: "DATA",
    description: "Pipelines, integrity, and movement between systems",
    x: -10,
    z: -232,
    width: 4.5,
    height: 23,
    depth: 4.3,
    hue: 18,
  },
  {
    id: "ai",
    label: "AI",
    description: "LLM-enabled workflows with quiet persistence",
    x: 88,
    z: -198,
    width: 3.6,
    height: 19,
    depth: 3.8,
    hue: 44,
  },
];

const NETWORK_EDGES: Array<[string, string]> = [
  ["backend", "apis"],
  ["apis", "integrations"],
  ["integrations", "data"],
  ["backend", "integrations"],
  ["backend", "ai"],
  ["apis", "ai"],
  ["data", "backend"],
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function terrainHeight(x: number, z: number) {
  const broadDunes =
    Math.sin(z * 0.018 + Math.sin(x * 0.009) * 2.2) * 5.8 +
    Math.sin(z * 0.009 + x * 0.006) * 4.2 +
    Math.sin(x * 0.015 + z * 0.007) * 2.1;
  const fineRidges =
    Math.sin(z * 0.068 + Math.sin(x * 0.025) * 1.3) * 0.48 +
    Math.sin(z * 0.11 + x * 0.018) * 0.2;
  return broadDunes + fineRidges;
}

function createDuneTerrain() {
  const width = 440;
  const depth = 620;
  const segmentsX = 240;
  const segmentsZ = 310;
  const positions = new Float32Array((segmentsX + 1) * (segmentsZ + 1) * 3);
  const colors = new Float32Array(positions.length);
  const colorShadow = new THREE.Color("#8e5846");
  const colorSand = new THREE.Color("#bd8058");
  const colorLit = new THREE.Color("#f1c28a");
  let index = 0;

  for (let iz = 0; iz <= segmentsZ; iz += 1) {
    const z = 240 - (iz / segmentsZ) * depth;
    for (let ix = 0; ix <= segmentsX; ix += 1) {
      const x = -width / 2 + (ix / segmentsX) * width;
      const y = terrainHeight(x, z);
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;

      const noise =
        Math.sin(x * 0.21 + z * 0.14) * 0.025 +
        Math.sin(x * 0.047 - z * 0.091) * 0.035;
      const ridgeLight = Math.max(0, Math.sin(z * 0.068 + Math.sin(x * 0.025) * 1.3)) * 0.22;
      const color = colorShadow.clone().lerp(colorSand, 0.48 + noise + ridgeLight);
      color.lerp(colorLit, clamp(0.13 + ridgeLight * 0.48 + noise, 0, 0.48));
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
      index += 3;
    }
  }

  const indices: number[] = [];
  for (let z = 0; z < segmentsZ; z += 1) {
    for (let x = 0; x < segmentsX; x += 1) {
      const a = z * (segmentsX + 1) + x;
      const b = a + segmentsX + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vec3 direction = normalize(vDirection);
        float elevation = max(direction.y, 0.0);
        vec3 zenith = vec3(0.075, 0.060, 0.12);
        vec3 upper = vec3(0.24, 0.13, 0.20);
        vec3 horizon = vec3(0.88, 0.45, 0.29);
        vec3 sky = mix(horizon, upper, smoothstep(0.0, 0.48, elevation));
        sky = mix(sky, zenith, smoothstep(0.40, 0.94, elevation));

        vec2 cloudUv = vec2(atan(direction.z, direction.x) * 1.05, elevation * 7.0);
        float clouds = fbm(cloudUv + vec2(uTime * 0.003, 0.0));
        float cloudBand = smoothstep(0.08, 0.0, abs(elevation - 0.20));
        float cloudShape = smoothstep(0.38, 0.69, clouds) * cloudBand;
        sky = mix(sky, vec3(0.91, 0.57, 0.39), cloudShape * 0.52);

        vec3 sunDirection = normalize(vec3(0.47, 0.20, -0.86));
        float sunDot = dot(direction, sunDirection);
        float glow = exp(-max(0.0, 1.0 - sunDot) * 24.0);
        float disc = smoothstep(0.99925, 0.99955, sunDot);
        sky += vec3(1.0, 0.48, 0.22) * glow * 0.62;
        sky = mix(sky, vec3(1.0, 0.84, 0.60), disc);
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(480, 48, 32), material);
  dome.frustumCulled = false;
  return { dome, material };
}

function makeLabelTexture(label: string, emphasis = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const radius = 24;
  ctx.fillStyle = "rgba(20, 16, 18, 0.58)";
  ctx.strokeStyle = `rgba(255, 224, 180, ${0.2 + emphasis * 0.18})`;
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 12, 488, 104, radius);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = `rgba(255, 238, 214, ${0.45 + emphasis * 0.45})`;
  ctx.fillText(label, 30, 58);

  ctx.font = "500 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = `rgba(255, 240, 224, ${0.18 + emphasis * 0.46})`;
  ctx.fillText("technical landscape", 30, 86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createAreaStructure(definition: AreaDefinition) {
  const group = new THREE.Group();
  group.position.set(definition.x, terrainHeight(definition.x, definition.z) - 0.35, definition.z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(definition.width * 0.95, definition.width * 1.2, 1.6, 8),
    new THREE.MeshStandardMaterial({
      color: `hsl(${definition.hue} 28% 39%)`,
      roughness: 0.95,
      metalness: 0.02,
    }),
  );
  base.position.y = 0.8;
  base.rotation.y = definition.x * 0.01;
  group.add(base);

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(definition.width, definition.height, definition.depth),
    new THREE.MeshStandardMaterial({
      color: `hsl(${definition.hue} 24% 48%)`,
      roughness: 0.68,
      metalness: 0.16,
      transparent: true,
      opacity: 0.86,
    }),
  );
  core.position.y = definition.height * 0.5 + 1.3;
  group.add(core);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(definition.width * 1.5, 3.4), 18, 14),
    new THREE.MeshBasicMaterial({
      color: "#ffd9a2",
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  glow.position.y = definition.height * 0.72 + 4;
  group.add(glow);

  const nodeA = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#ffe8c6", transparent: true, opacity: 0.82 }),
  );
  nodeA.position.set(-definition.width * 0.8, definition.height * 0.64, 0);
  group.add(nodeA);

  const nodeB = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.66 }),
  );
  nodeB.position.set(definition.width * 0.72, definition.height * 0.38, definition.depth * 0.3);
  group.add(nodeB);

  const beams: THREE.Mesh[] = [];
  const beamCount = 3;
  for (let i = 0; i < beamCount; i += 1) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(definition.width * (0.24 + i * 0.04), 1.6, 0.3),
      new THREE.MeshBasicMaterial({
        color: "#ffd6a0",
        transparent: true,
        opacity: 0.14 + i * 0.05,
      }),
    );
    beam.position.set(0, definition.height * (0.26 + i * 0.19), definition.depth * (0.08 * i - 0.07));
    beams.push(beam);
    group.add(beam);
  }

  const labelTexture = makeLabelTexture(definition.label, 0.7);
  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture ?? undefined,
    transparent: true,
    depthWrite: false,
    opacity: 0.08,
    color: "#ffe7c2",
  });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(17, 4.25, 1);
  label.position.set(0, definition.height + 8.2, 0);
  group.add(label);

  const nodes = [nodeA, nodeB];

  return {
    group,
    glow,
    core,
    label,
    labelMaterial,
    beams,
    nodes,
    prominence: 0.18,
    target: 0.18,
  } satisfies AreaRuntime;
}

function createPortraitDisplay(texture: THREE.Texture) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(17, 24, 1.2),
    new THREE.MeshStandardMaterial({
      color: "#6f4e39",
      roughness: 0.78,
      metalness: 0.08,
    }),
  );
  frame.rotation.y = -0.18;
  frame.position.set(-6, 12.5, 0);
  group.add(frame);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(15.4, 21.4),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    }),
  );
  plate.position.set(-6, 12.55, 0.72);
  plate.rotation.y = -0.18;
  group.add(plate);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(16.2, 22.1),
    new THREE.MeshBasicMaterial({
      color: "#f7d7ad",
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  veil.position.set(-6, 12.6, 0.82);
  veil.rotation.y = -0.18;
  group.add(veil);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(10.5, 11.8, 32),
    new THREE.MeshBasicMaterial({
      color: "#ffd8aa",
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  halo.position.set(-6, 12.8, -0.15);
  halo.rotation.y = -0.18;
  group.add(halo);

  return { group, plate, frame, halo };
}

function createPacketMaterial() {
  return new THREE.MeshBasicMaterial({
    color: "#fff1d0",
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
}

function createCurvePoints(a: THREE.Vector3, b: THREE.Vector3, lift = 12) {
  const control = new THREE.Vector3(
    (a.x + b.x) / 2,
    Math.max(a.y, b.y) + lift,
    (a.z + b.z) / 2,
  );
  return new THREE.QuadraticBezierCurve3(a, control, b);
}

export default function DesertScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraState>({ x: 0, z: 46, yaw: 0, pitch: -0.045 });
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const keysRef = useRef(new Set<string>());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      mount.classList.add("desert-fallback");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#c48767", 0.0034);

    const camera = new THREE.PerspectiveCamera(57, window.innerWidth / window.innerHeight, 0.1, 700);
    const cameraState = cameraRef.current;

    const { dome, material: skyMaterial } = createSky();
    scene.add(dome);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(4.6, 32, 24),
      new THREE.MeshBasicMaterial({ color: "#ffe5bd", toneMapped: false }),
    );
    sun.position.set(94, 38, -180);
    scene.add(sun);

    const sunLight = new THREE.DirectionalLight("#ffd3a0", 3.3);
    sunLight.position.set(-80, 125, 80);
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight("#f8c8a4", "#593d37", 2.1));
    const fill = new THREE.DirectionalLight("#90729a", 0.85);
    fill.position.set(70, 65, -110);
    scene.add(fill);

    const terrainGeometry = createDuneTerrain();
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.93,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    );
    terrain.position.y = -1;
    scene.add(terrain);

    const sandCount = reducedMotion ? 1200 : 3600;
    const sandPositions = new Float32Array(sandCount * 3);
    const sandVelocities = new Float32Array(sandCount * 3);
    for (let i = 0; i < sandCount; i += 1) {
      const i3 = i * 3;
      sandPositions[i3] = (Math.random() - 0.5) * 210;
      sandPositions[i3 + 1] = Math.random() * 30 + 0.6;
      sandPositions[i3 + 2] = cameraState.z - Math.random() * 260;
      sandVelocities[i3] = 5 + Math.random() * 18;
      sandVelocities[i3 + 1] = (Math.random() - 0.5) * 1.4;
      sandVelocities[i3 + 2] = (Math.random() - 0.5) * 2.4;
    }
    const sandGeometry = new THREE.BufferGeometry();
    sandGeometry.setAttribute("position", new THREE.BufferAttribute(sandPositions, 3));
    const sand = new THREE.Points(
      sandGeometry,
      new THREE.PointsMaterial({
        color: "#ffe0b4",
        size: 0.14,
        transparent: true,
        opacity: 0.62,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(sand);
    const sandState: SandState = { positions: sandPositions, velocities: sandVelocities };

    const portraitTexture = new THREE.TextureLoader().load("/sarah-ferg.png");
    portraitTexture.colorSpace = THREE.SRGBColorSpace;
    portraitTexture.generateMipmaps = true;
    portraitTexture.minFilter = THREE.LinearMipmapLinearFilter;
    portraitTexture.magFilter = THREE.LinearFilter;

    const portraitDisplay = createPortraitDisplay(portraitTexture);
    scene.add(portraitDisplay.group);

    const areas = TECH_AREAS.map(createAreaStructure);
    areas.forEach((area) => scene.add(area.group));

    const areaMap = new Map(TECH_AREAS.map((area, index) => [area.id, { definition: area, runtime: areas[index] }]));

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    const packetMaterial = createPacketMaterial();
    const networkEdges: NetworkEdge[] = [];

    NETWORK_EDGES.forEach(([from, to], index) => {
      const fromNode = areaMap.get(from);
      const toNode = areaMap.get(to);
      if (!fromNode || !toNode) return;

      const fromPoint = new THREE.Vector3(
        fromNode.definition.x,
        terrainHeight(fromNode.definition.x, fromNode.definition.z) + fromNode.definition.height * 0.78 + 3,
        fromNode.definition.z,
      );
      const toPoint = new THREE.Vector3(
        toNode.definition.x,
        terrainHeight(toNode.definition.x, toNode.definition.z) + toNode.definition.height * 0.78 + 3,
        toNode.definition.z,
      );

      const curve = createCurvePoints(fromPoint, toPoint, 12 + (index % 3) * 3);
      const linePoints = curve.getPoints(24);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: "#ffdcb0",
          transparent: true,
          opacity: 0.12,
        }),
      );
      networkGroup.add(line);

      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), packetMaterial.clone());
      networkGroup.add(packet);

      networkEdges.push({
        from,
        to,
        curve,
        line,
        packet,
        packetPhase: (index * 0.17) % 1,
        packetSpeed: 0.058 + index * 0.008,
      });
    });

    const portraitAnchor = new THREE.Vector3(-6, terrainHeight(-6, -78) + 12, -78);
    const portraitLink = createCurvePoints(
      portraitAnchor,
      new THREE.Vector3(TECH_AREAS[0].x, terrainHeight(TECH_AREAS[0].x, TECH_AREAS[0].z) + 16, TECH_AREAS[0].z),
      10,
    );
    const portraitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(portraitLink.getPoints(20)),
      new THREE.LineBasicMaterial({
        color: "#ffdcb0",
        transparent: true,
        opacity: 0.1,
      }),
    );
    networkGroup.add(portraitLine);

    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let disposed = false;

    const updateCamera = () => {
      const eyeHeight = terrain.position.y + terrainHeight(cameraState.x, cameraState.z) + 2.15;
      camera.position.set(cameraState.x, eyeHeight, cameraState.z);
      const lookDistance = 120;
      camera.lookAt(
        cameraState.x + Math.sin(cameraState.yaw) * lookDistance,
        eyeHeight + Math.sin(cameraState.pitch) * lookDistance,
        cameraState.z - Math.cos(cameraState.yaw) * lookDistance,
      );
      dome.position.copy(camera.position);
      renderer.render(scene, camera);
    };

    const resize = () => {
      if (disposed) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateCamera();
    };

    const updateSand = (delta: number) => {
      const { positions, velocities } = sandState;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (velocities[i] + 9) * delta;
        positions[i + 1] += velocities[i + 1] * delta;
        positions[i + 2] += velocities[i + 2] * delta;
        if (positions[i] > cameraState.x + 100) positions[i] = cameraState.x - 110;
        if (positions[i + 1] < 0.25) positions[i + 1] = 0.25 + Math.random() * 30;
        if (positions[i + 1] > 31) positions[i + 1] = 0.3 + Math.random() * 4;
        if (positions[i + 2] < cameraState.z - 240) positions[i + 2] = cameraState.z + 8;
        if (positions[i + 2] > cameraState.z + 8) positions[i + 2] = cameraState.z - 240;
      }
      sandGeometry.attributes.position.needsUpdate = true;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysRef.current.add(key);
        if (event.target === renderer.domElement) event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const clearKeys = () => keysRef.current.clear();

    const animate = (time: number) => {
      if (disposed) return;
      const delta = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      elapsed += delta;

      const keys = keysRef.current;
      const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      const lateral = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      const walkSpeed = 15;
      cameraState.x += (Math.cos(cameraState.yaw) * lateral + Math.sin(cameraState.yaw) * forward) * walkSpeed * delta;
      cameraState.z += (Math.sin(cameraState.yaw) * lateral - Math.cos(cameraState.yaw) * forward) * walkSpeed * delta;
      cameraState.x = clamp(cameraState.x, -140, 140);
      cameraState.z = clamp(cameraState.z, -350, 80);

      if (!reducedMotion) {
        updateSand(delta);
        skyMaterial.uniforms.uTime.value = elapsed;
      }

      const cameraForward = new THREE.Vector3(
        Math.sin(cameraState.yaw),
        Math.sin(cameraState.pitch),
        -Math.cos(cameraState.yaw),
      ).normalize();
      const cameraPosition = new THREE.Vector3(cameraState.x, terrain.position.y + terrainHeight(cameraState.x, cameraState.z) + 2.15, cameraState.z);

      areas.forEach((area) => {
        const worldPosition = new THREE.Vector3(area.group.position.x, area.group.position.y + 10, area.group.position.z);
        const toArea = worldPosition.clone().sub(cameraPosition);
        const distance = toArea.length();
        const direction = toArea.normalize();
        const facing = Math.max(0, cameraForward.dot(direction));
        const proximity = Math.max(0, 1 - distance / 220);
        const focus = clamp(proximity * 0.7 + facing * 0.8, 0, 1);
        area.target = Math.max(0.14, focus);
        area.prominence += (area.target - area.prominence) * 0.06;

        area.group.scale.setScalar(0.95 + area.prominence * 0.11);
        area.labelMaterial.opacity = 0.06 + area.prominence * 0.58;
        area.label.material.needsUpdate = true;
        area.glow.scale.setScalar(0.88 + area.prominence * 0.44);
        area.glow.material.opacity = 0.08 + area.prominence * 0.14;
        area.core.material.opacity = 0.54 + area.prominence * 0.34;
        area.beams.forEach((beam, index) => {
          beam.material.opacity = 0.08 + area.prominence * (0.05 + index * 0.03);
        });
        area.nodes.forEach((node, index) => {
          (node.material as THREE.MeshBasicMaterial).opacity = 0.45 + area.prominence * (0.22 + index * 0.1);
          node.scale.setScalar(0.95 + area.prominence * 0.3);
        });
      });

      const portraitSwing = reducedMotion ? 0 : Math.sin(elapsed * 0.35) * 0.03;
      portraitDisplay.group.rotation.y = -0.18 + portraitSwing;
      portraitDisplay.frame.rotation.y = -0.18 + portraitSwing;
      portraitDisplay.plate.rotation.y = -0.18 + portraitSwing;
      portraitDisplay.halo.material.opacity = reducedMotion
        ? 0.16
        : 0.14 + Math.max(0, Math.sin(elapsed * 0.6)) * 0.06;

      networkEdges.forEach((edge, index) => {
        const from = areaMap.get(edge.from);
        const to = areaMap.get(edge.to);
        if (!from || !to) return;
        const strength = (from.runtime.prominence + to.runtime.prominence) * 0.5;
        const lineMaterial = edge.line.material as THREE.LineBasicMaterial;
        lineMaterial.opacity = 0.08 + strength * 0.28;
        edge.line.scale.setScalar(0.98 + strength * 0.03);

        if (!reducedMotion) {
          edge.packetPhase = (edge.packetPhase + delta * edge.packetSpeed) % 1;
          const point = edge.curve.getPointAt((edge.packetPhase + index * 0.07) % 1);
          edge.packet.position.copy(point);
          const packetMaterialInstance = edge.packet.material as THREE.MeshBasicMaterial;
          packetMaterialInstance.opacity = 0.28 + strength * 0.58;
          edge.packet.scale.setScalar(0.76 + strength * 0.36);
        } else {
          const point = edge.curve.getPointAt((index * 0.19) % 1);
          edge.packet.position.copy(point);
        }
      });

      const portraitLineMaterial = portraitLine.material as THREE.LineBasicMaterial;
      portraitLineMaterial.opacity = reducedMotion
        ? 0.08
        : 0.08 + Math.max(0, Math.sin(elapsed * 0.7)) * 0.04;

      updateCamera();
      frame = requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        yaw: cameraState.yaw,
        pitch: cameraState.pitch,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      cameraState.yaw = drag.yaw - (event.clientX - drag.x) * 0.0035;
      cameraState.pitch = clamp(drag.pitch + (event.clientY - drag.y) * 0.0024, -0.62, 0.48);
      updateCamera();
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Immersive desert. Drag to look around. Use W A S D or arrow keys to walk.",
    );
    renderer.domElement.setAttribute("role", "group");
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    updateCamera();
    frame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);

      terrainGeometry.dispose();
      (terrain.material as THREE.Material).dispose();
      sandGeometry.dispose();
      (sand.material as THREE.Material).dispose();
      skyMaterial.dispose();
      (sun.material as THREE.Material).dispose();
      (sun.geometry as THREE.BufferGeometry).dispose();
      portraitTexture.dispose();
      portraitDisplay.frame.material.dispose();
      portraitDisplay.plate.material.dispose();
      portraitDisplay.halo.material.dispose();

      areas.forEach((area) => {
        (area.core.material as THREE.Material).dispose();
        (area.glow.material as THREE.Material).dispose();
        area.labelMaterial.map?.dispose();
        area.labelMaterial.dispose();
        area.beams.forEach((beam) => (beam.material as THREE.Material).dispose());
        area.nodes.forEach((node) => (node.material as THREE.Material).dispose());
      });

      networkEdges.forEach((edge) => {
        edge.line.geometry.dispose();
        (edge.line.material as THREE.Material).dispose();
        (edge.packet.material as THREE.Material).dispose();
        edge.packet.geometry.dispose();
      });
      portraitLine.geometry.dispose();
      (portraitLine.material as THREE.Material).dispose();
      packetMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      aria-label="Immersive 3D sunset desert"
      className="desert-scene absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
    />
  );
}
