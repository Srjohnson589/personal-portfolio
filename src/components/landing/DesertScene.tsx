"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { createCrestPlumes, createDriftSheets, createSaltation } from "./desert/blowing-sand";
import { createPost } from "./desert/post";
import { createSharedUniforms } from "./desert/shaders";
import { createSky } from "./desert/sky";
import { bakeTerrainLighting, createTerrainMaterial } from "./desert/terrain";
import {
  SUN_DIRECTION,
  createTerrainGeometry,
  generateTerrain,
  sampleHeight,
  type Flat,
} from "./desert/terrain-data";

type CameraState = { x: number; z: number; yaw: number; pitch: number };
type IntegrationNodeDefinition = {
  id: string;
  label: string;
  description: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  hue: number;
  primary?: boolean;
};
type IntegrationNodeRuntime = {
  definition: IntegrationNodeDefinition;
  group: THREE.Group;
  column: THREE.Mesh;
  cap: THREE.Mesh;
  glow: THREE.Mesh;
  label: THREE.Sprite;
  labelMaterial: THREE.SpriteMaterial;
  prominence: number;
  target: number;
};
type IntegrationEdge = {
  from: string;
  to: string;
  curve: THREE.QuadraticBezierCurve3;
  line: THREE.Line;
  packet: THREE.Mesh;
  packetPhase: number;
  packetSpeed: number;
};

const INTEGRATION_NODES: IntegrationNodeDefinition[] = [
  {
    id: "crm",
    label: "CRM",
    description: "Customer records entering the system",
    x: 16,
    z: -150,
    radius: 2.2,
    height: 8.5,
    hue: 28,
  },
  {
    id: "integrations",
    label: "INTEGRATIONS",
    description: "The connected system Sarah is building",
    x: 52,
    z: -160,
    radius: 3.8,
    height: 20.5,
    hue: 34,
    primary: true,
  },
  {
    id: "backend",
    label: "BACKEND",
    description: "Processing, orchestration, and logic",
    x: 79,
    z: -176,
    radius: 2.6,
    height: 10,
    hue: 30,
  },
  {
    id: "database",
    label: "DATABASE",
    description: "Persistent state and event history",
    x: 34,
    z: -206,
    radius: 2.3,
    height: 9,
    hue: 24,
  },
  {
    id: "erp",
    label: "ERP",
    description: "Downstream systems receiving the response",
    x: 68,
    z: -225,
    radius: 2.15,
    height: 7.8,
    hue: 20,
  },
];

const INTEGRATION_EDGES: Array<[string, string]> = [
  ["crm", "integrations"],
  ["integrations", "backend"],
  ["backend", "database"],
  ["backend", "erp"],
  ["database", "integrations"],
];

const TERRAIN_FLATS: Flat[] = [
  { x: 0, z: 40, radius: 46 },
  { x: -30, z: -92, radius: 30 },
  { x: 48, z: -188, radius: 78 },
];
const EYE_HEIGHT = 1.75;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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

function makeLabelTexture(label: string, sublabel: string, emphasis = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 168;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(20, 16, 18, 0.56)";
  ctx.strokeStyle = `rgba(255, 224, 180, ${0.18 + emphasis * 0.16})`;
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 16, 612, 120, 30);
  ctx.fill();
  ctx.stroke();

  ctx.font = "600 36px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = `rgba(255, 238, 214, ${0.38 + emphasis * 0.52})`;
  ctx.fillText(label, 34, 68);

  ctx.font = "500 17px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = `rgba(255, 240, 224, ${0.14 + emphasis * 0.44})`;
  ctx.fillText(sublabel, 34, 102);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createIntegrationNode(definition: IntegrationNodeDefinition, ground: number) {
  const group = new THREE.Group();
  group.position.set(
    definition.x,
    ground - 0.32,
    definition.z,
  );

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(definition.radius * 1.15, definition.radius * 1.42, 1.4, 8),
    new THREE.MeshStandardMaterial({
      color: `hsl(${definition.hue} 26% 37%)`,
      roughness: 0.96,
      metalness: 0.02,
    }),
  );
  base.position.y = 0.7;
  group.add(base);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(definition.radius, definition.radius * 1.06, definition.height, 10),
    new THREE.MeshStandardMaterial({
      color: `hsl(${definition.hue} 22% 49%)`,
      roughness: 0.7,
      metalness: 0.12,
      transparent: true,
      opacity: 0.84,
    }),
  );
  column.position.y = definition.height * 0.5 + 1.0;
  group.add(column);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(definition.radius * 0.72, 18, 14),
    new THREE.MeshBasicMaterial({
      color: "#ffe1af",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  cap.position.y = definition.height + 1.9;
  group.add(cap);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(definition.radius * 1.9, 3.1), 20, 14),
    new THREE.MeshBasicMaterial({
      color: "#ffd9a2",
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    }),
  );
  glow.position.y = definition.height * 0.78 + 3.8;
  group.add(glow);

  const labelTexture = makeLabelTexture(
    definition.label,
    definition.description,
    definition.primary ? 0.92 : 0.42,
  );
  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture ?? undefined,
    transparent: true,
    depthWrite: false,
    opacity: definition.primary ? 0.08 : 0.03,
    color: "#ffe7c2",
  });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(definition.primary ? 18.5 : 14.5, definition.primary ? 4.9 : 4.4, 1);
  label.position.set(0, definition.height + 7.8, 0);
  group.add(label);

  return {
    definition,
    group,
    column,
    cap,
    glow,
    label,
    labelMaterial,
    prominence: definition.primary ? 0.18 : 0.08,
    target: definition.primary ? 0.18 : 0.08,
  } satisfies IntegrationNodeRuntime;
}

function createPortraitFigure(texture: THREE.Texture) {
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5.1, 48),
    new THREE.MeshBasicMaterial({
      color: "#130b08",
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.5, 0.72, 1);
  shadow.position.y = 0.04;
  group.add(shadow);

  const dustGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 14),
    new THREE.MeshBasicMaterial({
      color: "#f2c28b",
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    }),
  );
  dustGlow.position.set(0, 7.4, -0.12);
  group.add(dustGlow);

  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 11.1),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.04,
      opacity: 0.98,
      toneMapped: false,
    }),
  );
  body.position.set(0, 5.55, 0.12);
  group.add(body);

  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(7.9, 11.4),
    new THREE.MeshBasicMaterial({
      color: "#f7d7ad",
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
    }),
  );
  rim.position.set(0, 5.55, -0.04);
  group.add(rim);

  return { group, shadow, dustGlow, body, rim };
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
  const cameraRef = useRef<CameraState>({ x: 0, z: 46, yaw: 0, pitch: -0.035 });
  const dragRef = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    moved: boolean;
  } | null>(null);
  const keysRef = useRef(new Set<string>());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      mount.classList.add("desert-fallback");
      return;
    }

    const compact = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#c98a68", 0.0018);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2400);
    const cameraState = cameraRef.current;
    const walkSpeed = 15;
    let pendingTravel = 0;

    const terrainData = generateTerrain(TERRAIN_FLATS);
    const groundAt = (x: number, z: number) => sampleHeight(terrainData.heights, x, z);
    const eyeTarget = (x: number, z: number) =>
      Math.max(sampleHeight(terrainData.smoothHeights, x, z), groundAt(x, z)) + EYE_HEIGHT;
    let eyeHeight = eyeTarget(cameraState.x, cameraState.z);

    const shared = createSharedUniforms(terrainData.heightTexture);
    const lighting = bakeTerrainLighting(renderer, shared, compact ? 1024 : 2048);
    shared.uLight.value = lighting.texture;

    const { dome, material: skyMaterial } = createSky(shared);
    scene.add(dome);

    const sunLight = new THREE.DirectionalLight("#ffc596", 3.2);
    sunLight.position.copy(SUN_DIRECTION).multiplyScalar(200);
    scene.add(sunLight);
    scene.add(new THREE.HemisphereLight("#8d86b4", "#8a5636", 1.4));

    const terrainGeometry = createTerrainGeometry(terrainData.heights, compact ? 420 : 720);
    const { material: terrainMaterial, rippleTime } = createTerrainMaterial(shared);
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.frustumCulled = false;
    scene.add(terrain);

    const saltation = createSaltation(shared, reducedMotion || compact ? 3500 : 9000);
    const plumes = createCrestPlumes(shared, terrainData.crests, compact ? 4 : 7);
    const driftSheets = createDriftSheets(shared, compact ? 120 : 220);
    scene.add(driftSheets, plumes, saltation.mesh);

    const portraitTexture = new THREE.TextureLoader().load("/sarah-ferg.png");
    portraitTexture.colorSpace = THREE.SRGBColorSpace;
    portraitTexture.generateMipmaps = true;
    portraitTexture.minFilter = THREE.LinearMipmapLinearFilter;
    portraitTexture.magFilter = THREE.LinearFilter;

    const portraitFigure = createPortraitFigure(portraitTexture);
    portraitFigure.group.position.set(-30, groundAt(-30, -92) + 0.12, -92);
    portraitFigure.group.rotation.y = 0.18;
    scene.add(portraitFigure.group);

    const nodes = INTEGRATION_NODES.map((definition) =>
      createIntegrationNode(definition, groundAt(definition.x, definition.z)),
    );
    nodes.forEach((node) => scene.add(node.group));

    const primaryNode = nodes.find((node) => node.definition.primary) ?? nodes[0];
    const nodeMap = new Map(nodes.map((node) => [node.definition.id, node]));

    const packetMaterial = new THREE.MeshBasicMaterial({
      color: "#fff0cd",
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const edges: IntegrationEdge[] = [];

    INTEGRATION_EDGES.forEach(([from, to], index) => {
      const fromNode = nodeMap.get(from);
      const toNode = nodeMap.get(to);
      if (!fromNode || !toNode) return;

      const fromPoint = new THREE.Vector3(
        fromNode.definition.x,
        groundAt(fromNode.definition.x, fromNode.definition.z) + fromNode.definition.height * 0.78 + 2.8,
        fromNode.definition.z,
      );
      const toPoint = new THREE.Vector3(
        toNode.definition.x,
        groundAt(toNode.definition.x, toNode.definition.z) + toNode.definition.height * 0.78 + 2.8,
        toNode.definition.z,
      );

      const curve = createCurvePoints(fromPoint, toPoint, 11 + (index % 2) * 2.5);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      const line = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: "#ffdcb0",
          transparent: true,
          opacity: 0.06,
        }),
      );
      scene.add(line);

      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), packetMaterial.clone());
      scene.add(packet);

      edges.push({
        from,
        to,
        curve,
        line,
        packet,
        packetPhase: (index * 0.21) % 1,
        packetSpeed: 0.04 + index * 0.008,
      });
    });

    const post = createPost(renderer, scene, camera);
    post.setSize(window.innerWidth, window.innerHeight);
    renderer.getDrawingBufferSize(saltation.resolution.value);

    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let disposed = false;

    const updateCamera = () => {
      camera.position.set(cameraState.x, eyeHeight, cameraState.z);
      const lookDistance = 120;
      camera.lookAt(
        cameraState.x + Math.sin(cameraState.yaw) * lookDistance,
        eyeHeight + Math.sin(cameraState.pitch) * lookDistance,
        cameraState.z - Math.cos(cameraState.yaw) * lookDistance,
      );
      dome.position.copy(camera.position);
    };

    const render = () => {
      updateCamera();
      post.render(elapsed);
    };

    const resize = () => {
      if (disposed) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      post.setSize(window.innerWidth, window.innerHeight);
      renderer.getDrawingBufferSize(saltation.resolution.value);
      render();
    };

    const queueTravel = (distance: number) => {
      pendingTravel = clamp(pendingTravel + distance, -80, 80);
    };

    const updateWind = (delta: number) => {
      const gust = clamp(
        0.55 + Math.sin(elapsed * 0.21) * 0.25 + Math.sin(elapsed * 0.53 + 1.3) * 0.2,
        0,
        1,
      );
      shared.uGust.value = gust;
      shared.uFlow.value += delta * 5.5 * (0.55 + 0.6 * gust);
      shared.uTime.value = elapsed;
      rippleTime.value += delta * 0.03 * (0.4 + gust);
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

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = clamp(-event.deltaY * 0.008, -8, 8);
      queueTravel(step);
    };

    const animate = (time: number) => {
      if (disposed) return;
      const delta = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;

      const keys = keysRef.current;
      const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      const lateral = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      cameraState.x += (Math.cos(cameraState.yaw) * lateral + Math.sin(cameraState.yaw) * forward) * walkSpeed * delta;
      cameraState.z += (Math.sin(cameraState.yaw) * lateral - Math.cos(cameraState.yaw) * forward) * walkSpeed * delta;

      if (Math.abs(pendingTravel) > 0.001) {
        const travelStep = pendingTravel * Math.min(1, delta * 6.5);
        cameraState.x += Math.sin(cameraState.yaw) * travelStep;
        cameraState.z -= Math.cos(cameraState.yaw) * travelStep;
        pendingTravel -= travelStep;
      }

      cameraState.x = clamp(cameraState.x, -140, 140);
      cameraState.z = clamp(cameraState.z, -350, 80);
      eyeHeight += (eyeTarget(cameraState.x, cameraState.z) - eyeHeight) * Math.min(1, delta * 4);
      eyeHeight = Math.max(eyeHeight, groundAt(cameraState.x, cameraState.z) + EYE_HEIGHT * 0.7);

      if (!reducedMotion) {
        elapsed += delta;
        updateWind(delta);
      }

      const cameraForward = new THREE.Vector3(
        Math.sin(cameraState.yaw),
        Math.sin(cameraState.pitch),
        -Math.cos(cameraState.yaw),
      ).normalize();
      const cameraPosition = new THREE.Vector3(cameraState.x, eyeHeight, cameraState.z);

      nodes.forEach((node) => {
        const worldPosition = new THREE.Vector3(
          node.group.position.x,
          node.group.position.y + node.definition.height * 0.7,
          node.group.position.z,
        );
        const toNode = worldPosition.clone().sub(cameraPosition);
        const distance = toNode.length();
        const direction = toNode.normalize();
        const facing = Math.max(0, cameraForward.dot(direction));
        const proximity = Math.max(0, 1 - distance / (node.definition.primary ? 255 : 180));
        const focus = clamp(proximity * (node.definition.primary ? 0.78 : 0.6) + facing * 0.85, 0, 1);
        node.target = Math.max(node.definition.primary ? 0.16 : 0.05, focus);
        node.prominence += (node.target - node.prominence) * 0.06;

        const scale = node.definition.primary ? 0.92 + node.prominence * 0.12 : 0.96 + node.prominence * 0.08;
        node.group.scale.setScalar(scale);
        (node.column.material as THREE.MeshStandardMaterial).opacity =
          0.48 + node.prominence * (node.definition.primary ? 0.34 : 0.22);
        (node.cap.material as THREE.MeshBasicMaterial).opacity =
          0.08 + node.prominence * (node.definition.primary ? 0.18 : 0.1);
        node.glow.scale.setScalar(0.88 + node.prominence * (node.definition.primary ? 0.58 : 0.26));
        (node.glow.material as THREE.MeshBasicMaterial).opacity = 0.03 + node.prominence * (node.definition.primary ? 0.16 : 0.08);
        node.labelMaterial.opacity = node.definition.primary
          ? 0.08 + node.prominence * 0.66
          : 0.03 + node.prominence * 0.42;
      });

      const portraitFocus = clamp(
        Math.max(
          0,
          1 -
            cameraPosition
              .clone()
              .sub(portraitFigure.group.position.clone().add(new THREE.Vector3(0, 5.5, 0)))
              .length() /
              230,
        ) * 0.35 +
          Math.max(0, cameraForward.dot(
            portraitFigure.group.position.clone().sub(cameraPosition).normalize(),
          )) * 0.55,
        0,
        1,
      );

      const portraitSway = reducedMotion ? 0 : Math.sin(elapsed * 0.32) * 0.022;
      portraitFigure.group.position.x = -30 + Math.sin(cameraState.yaw) * 0.8;
      portraitFigure.group.position.z = -92 + Math.cos(cameraState.yaw) * 0.5;
      portraitFigure.group.rotation.y = 0.18 + cameraState.yaw * 0.05 + portraitSway;
      (portraitFigure.shadow.material as THREE.MeshBasicMaterial).opacity = 0.2 + portraitFocus * 0.05;
      (portraitFigure.dustGlow.material as THREE.MeshBasicMaterial).opacity = 0.05 + portraitFocus * 0.05;
      (portraitFigure.rim.material as THREE.MeshBasicMaterial).opacity = 0.03 + portraitFocus * 0.05;
      portraitFigure.body.scale.setScalar(0.98 + portraitFocus * 0.02);

      edges.forEach((edge, index) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return;

        const strength = (from.prominence + to.prominence) / 2;
        const lineMaterial = edge.line.material as THREE.LineBasicMaterial;
        lineMaterial.opacity = 0.02 + strength * 0.34;
        edge.line.scale.setScalar(0.98 + strength * 0.03);

        if (!reducedMotion) {
          edge.packetPhase = (edge.packetPhase + delta * edge.packetSpeed) % 1;
          const packetPhase = (edge.packetPhase + index * 0.13) % 1;
          const point = edge.curve.getPointAt(packetPhase);
          edge.packet.position.copy(point);
          const packetMaterialInstance = edge.packet.material as THREE.MeshBasicMaterial;
          packetMaterialInstance.opacity = 0.16 + strength * 0.68;
          edge.packet.scale.setScalar(0.72 + strength * 0.48);
        } else {
          edge.packet.visible = strength > 0.1;
          edge.packet.position.copy(edge.curve.getPointAt(0.35 + index * 0.1));
        }
      });

      primaryNode.labelMaterial.opacity = 0.08 + primaryNode.prominence * 0.66;

      render();
      frame = requestAnimationFrame(animate);
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        yaw: cameraState.yaw,
        pitch: cameraState.pitch,
        moved: false,
      };
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (Math.abs(event.clientX - drag.x) > 4 || Math.abs(event.clientY - drag.y) > 4) {
        drag.moved = true;
      }
      cameraState.yaw = drag.yaw - (event.clientX - drag.x) * 0.0035;
      cameraState.pitch = clamp(drag.pitch + (event.clientY - drag.y) * 0.0024, -0.62, 0.48);
    };

    const handlePointerUp = () => {
      const drag = dragRef.current;
      if (drag && !drag.moved) {
        queueTravel(14);
      }
      dragRef.current = null;
    };

    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      "aria-label",
      "Immersive desert. Drag to look around. Click or scroll to move through the environment.",
    );
    renderer.domElement.setAttribute("role", "group");
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    render();
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
      renderer.domElement.removeEventListener("wheel", handleWheel);

      terrainGeometry.dispose();
      terrainMaterial.dispose();
      terrainData.heightTexture.dispose();
      lighting.dispose();
      [saltation.mesh, plumes, driftSheets].forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      dome.geometry.dispose();
      skyMaterial.dispose();
      portraitTexture.dispose();
      portraitFigure.shadow.material.dispose();
      portraitFigure.dustGlow.material.dispose();
      portraitFigure.body.material.dispose();
      portraitFigure.rim.material.dispose();

      nodes.forEach((node) => {
        (node.column.material as THREE.Material).dispose();
        (node.cap.material as THREE.Material).dispose();
        (node.glow.material as THREE.Material).dispose();
        node.labelMaterial.map?.dispose();
        node.labelMaterial.dispose();
      });

      edges.forEach((edge) => {
        edge.line.geometry.dispose();
        (edge.line.material as THREE.Material).dispose();
        edge.packet.geometry.dispose();
        (edge.packet.material as THREE.Material).dispose();
      });

      packetMaterial.dispose();
      post.dispose();
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
