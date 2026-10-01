"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Camera = { x: number; y: number; depth: number };
type SandGrain = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function DesertScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, depth: 0 });
  const drawRef = useRef<() => void>(() => {});
  const dragRef = useRef<{ x: number; y: number; lookX: number; lookY: number } | null>(null);
  const keysRef = useRef(new Set<string>());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let grains: SandGrain[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grains = Array.from({ length: Math.min(520, Math.round((width * height) / 3000)) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        size: 0.35 + Math.random() * 1.8,
        speed: 18 + Math.random() * 95,
        sway: (Math.random() - 0.5) * 26,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const duneHeight = (x: number, base: number, amplitude: number, phase: number) =>
      base +
      Math.sin(x * 0.0018 + phase) * amplitude +
      Math.sin(x * 0.00075 - phase * 0.72) * amplitude * 0.68 +
      Math.sin(x * 0.0039 + phase * 1.8) * amplitude * 0.12;

    const render = (time: number) => {
      const camera = cameraRef.current;
      const lookX = camera.x * 0.00016;
      const horizon = height * (0.48 + camera.y * 0.00008 + Math.sin(camera.depth * 0.00015) * 0.012);
      const sunX = width * (0.72 - lookX * 0.5);
      const sunY = horizon - height * 0.13;
      const clock = time / 1000;

      const sky = ctx.createLinearGradient(0, 0, 0, horizon + height * 0.1);
      sky.addColorStop(0, "#211a2a");
      sky.addColorStop(0.28, "#60404a");
      sky.addColorStop(0.68, "#c47b59");
      sky.addColorStop(1, "#f2c18a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.56);
      sunGlow.addColorStop(0, "rgba(255,228,181,.86)");
      sunGlow.addColorStop(0.16, "rgba(255,190,129,.36)");
      sunGlow.addColorStop(0.58, "rgba(223,130,93,.12)");
      sunGlow.addColorStop(1, "rgba(223,130,93,0)");
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, height);

      const sunRadius = Math.max(28, Math.min(width, height) * 0.072);
      const sunDisc = ctx.createRadialGradient(
        sunX - sunRadius * 0.22,
        sunY - sunRadius * 0.28,
        sunRadius * 0.1,
        sunX,
        sunY,
        sunRadius,
      );
      sunDisc.addColorStop(0, "#fff4d8");
      sunDisc.addColorStop(0.72, "#ffe4b6");
      sunDisc.addColorStop(1, "#f9c68e");
      ctx.fillStyle = sunDisc;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.filter = `blur(${Math.max(8, height * 0.018)}px)`;
      for (let cloud = 0; cloud < 11; cloud += 1) {
        const drift = reducedMotion ? 0 : clock * (3 + cloud % 4);
        const cloudX = ((cloud * width * 0.14 + drift + width) % (width * 1.2)) - width * 0.1;
        const cloudY = horizon * (0.36 + (cloud % 5) * 0.072);
        const cloudWidth = width * (0.12 + (cloud % 3) * 0.055);
        const haze = ctx.createLinearGradient(cloudX - cloudWidth, cloudY, cloudX + cloudWidth, cloudY);
        haze.addColorStop(0, "rgba(244,183,142,0)");
        haze.addColorStop(0.5, `rgba(249,199,159,${cloud % 2 ? 0.1 : 0.16})`);
        haze.addColorStop(1, "rgba(244,183,142,0)");
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, cloudWidth, height * 0.018, -0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const atmosphericHaze = ctx.createLinearGradient(0, horizon - height * 0.07, 0, horizon + height * 0.12);
      atmosphericHaze.addColorStop(0, "rgba(255,204,156,0)");
      atmosphericHaze.addColorStop(0.5, "rgba(255,202,157,.36)");
      atmosphericHaze.addColorStop(1, "rgba(238,172,125,0)");
      ctx.fillStyle = atmosphericHaze;
      ctx.fillRect(0, horizon - height * 0.08, width, height * 0.22);

      const layers = [
        { base: 0.51, amp: 0.032, phase: 1.1, color: "#9d6454", shift: 0.12 },
        { base: 0.56, amp: 0.052, phase: 3.4, color: "#b97857", shift: 0.3 },
        { base: 0.63, amp: 0.075, phase: 5.1, color: "#c8875e", shift: 0.55 },
        { base: 0.73, amp: 0.105, phase: 0.4, color: "#d39766", shift: 0.82 },
        { base: 0.88, amp: 0.15, phase: 2.3, color: "#bd7955", shift: 1.2 },
      ];

      layers.forEach((layer, layerIndex) => {
        const parallax = camera.x * layer.shift;
        const base = height * layer.base + camera.y * layer.shift * 0.18;
        const amplitude = height * layer.amp;
        const step = Math.max(8, width / 180);
        const points: { x: number; y: number }[] = [];

        for (let x = -step; x <= width + step; x += step) {
          const worldX = x + parallax + camera.depth * layer.shift * 0.32;
          points.push({
            x,
            y: duneHeight(worldX, base, amplitude, layer.phase),
          });
        }

        const fill = ctx.createLinearGradient(0, base - amplitude * 1.6, 0, height);
        fill.addColorStop(0, layer.color);
        fill.addColorStop(0.48, layerIndex > 2 ? "#ca895f" : layer.color);
        fill.addColorStop(1, layerIndex > 2 ? "#85533f" : "#70483f");
        ctx.beginPath();
        ctx.moveTo(0, height);
        points.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();

        if (layerIndex >= 2) {
          ctx.save();
          ctx.beginPath();
          points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.strokeStyle = layerIndex === 4
            ? "rgba(255,220,168,.45)"
            : "rgba(255,214,167,.28)";
          ctx.lineWidth = layerIndex === 4 ? 2.2 : 1.2;
          ctx.shadowColor = "rgba(255,203,148,.42)";
          ctx.shadowBlur = 16;
          ctx.stroke();
          ctx.restore();
        }

        if (layerIndex >= 3) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.strokeStyle = "#ffe0b1";
          ctx.lineWidth = 0.65;
          for (let ridge = 0; ridge < 15; ridge += 1) {
            const yOffset = ridge * height * 0.0035;
            ctx.beginPath();
            points.forEach((point, index) => {
              const wave = Math.sin((point.x + parallax) * 0.004 + ridge) * (1 + ridge * 0.15);
              if (index === 0) ctx.moveTo(point.x, point.y + yOffset + wave);
              else ctx.lineTo(point.x, point.y + yOffset + wave);
            });
            ctx.stroke();
          }
          ctx.restore();
        }
      });

      const wind = reducedMotion ? 0 : 1;
      grains.forEach((grain) => {
        const depth = 0.2 + grain.z * 0.8;
        const drift = reducedMotion ? 0 : elapsed * grain.speed * depth;
        const x = ((grain.x - drift + camera.x * depth * 0.55) % (width + 80) + width + 80) % (width + 80) - 40;
        const y = grain.y + camera.y * depth * 0.2 + Math.sin(clock * 1.2 + grain.phase) * grain.sway * 0.2;
        const sandHaze = grain.z < 0.52;

        if (sandHaze) {
          ctx.fillStyle = `rgba(255,219,174,${(0.018 + grain.z * 0.035) * wind})`;
          ctx.beginPath();
          ctx.ellipse(x, y, 14 + grain.z * 42, 3 + grain.z * 8, -0.08, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(255,224,187,${0.12 + grain.z * 0.28})`;
          ctx.lineWidth = grain.size;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 3 + grain.speed * 0.12, y - grain.sway * 0.1);
          ctx.stroke();
        }
      });

      const foregroundDust = ctx.createRadialGradient(width * 0.52, height * 0.82, 0, width * 0.52, height * 0.82, width * 0.56);
      foregroundDust.addColorStop(0, "rgba(236,170,120,.13)");
      foregroundDust.addColorStop(1, "rgba(236,170,120,0)");
      ctx.fillStyle = foregroundDust;
      ctx.fillRect(0, horizon, width, height - horizon);

      const vignette = ctx.createRadialGradient(width * 0.52, height * 0.45, height * 0.18, width * 0.5, height * 0.5, width * 0.83);
      vignette.addColorStop(0, "rgba(23,15,24,0)");
      vignette.addColorStop(1, "rgba(20,13,22,.38)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysRef.current.add(key);
        if (event.target === canvas) event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const clearKeys = () => keysRef.current.clear();

    const loop = (time: number) => {
      const dt = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      elapsed += dt;

      const keys = keysRef.current;
      const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
      const lateral = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      cameraRef.current.depth += forward * dt * 180;
      cameraRef.current.x += lateral * dt * 160;

      render(time);
      if (!reducedMotion) frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    drawRef.current = () => render(elapsed * 1000);
    loop(0);
    if (!reducedMotion) frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      cancelAnimationFrame(frame);
      drawRef.current = () => {};
    };
  }, [reducedMotion]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      lookX: cameraRef.current.x,
      lookY: cameraRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    cameraRef.current.x = drag.lookX - (event.clientX - drag.x) * 0.7;
    cameraRef.current.y = clamp(drag.lookY - (event.clientY - drag.y) * 0.8, -heightLimit(), heightLimit());
    drawRef.current();
  };

  const heightLimit = () => (typeof window === "undefined" ? 500 : window.innerHeight * 0.45);

  return (
    <canvas
      ref={canvasRef}
      role="group"
      aria-label="Immersive desert. Drag to look around. Use W A S D or arrow keys to walk."
      tabIndex={0}
      className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onKeyDown={(event) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
          event.preventDefault();
        }
      }}
    />
  );
}
