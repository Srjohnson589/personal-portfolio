"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type CameraState = { x: number; z: number; yaw: number; pitch: number };
type SandState = { positions: Float32Array; velocities: Float32Array };

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

    const sandCount = 3600;
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
      sandGeometry.computeBoundingSphere();
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
