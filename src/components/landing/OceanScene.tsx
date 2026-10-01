"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export type OceanMood = "dawn" | "day" | "dusk" | "night";

type OceanSceneProps = {
  mood: OceanMood;
  waveAmount: number;
  perspective: number;
  paused: boolean;
};

type Look = { x: number; y: number };

const PALETTES: Record<OceanMood, { sky: string[]; water: string[]; sun: string }> = {
  dawn: {
    sky: ["#19213a", "#764d68", "#f0a36f", "#f6d3a0"],
    water: ["#252a3d", "#754d4d", "#dfa16f"],
    sun: "#fff0ca",
  },
  day: {
    sky: ["#427b9b", "#8fc5d0", "#f5d2a0", "#fff0cc"],
    water: ["#164e66", "#277b88", "#a9a17d"],
    sun: "#fff7d7",
  },
  dusk: {
    sky: ["#17152d", "#59354f", "#c27663", "#f4c68d"],
    water: ["#111c30", "#463748", "#9c6555"],
    sun: "#fff0cb",
  },
  night: {
    sky: ["#050d1d", "#111e38", "#26344c", "#465064"],
    water: ["#07111f", "#15253a", "#374458"],
    sun: "#dce8ff",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function OceanScene({
  mood,
  waveAmount,
  perspective,
  paused,
}: OceanSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lookRef = useRef<Look>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; lookX: number; lookY: number } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let elapsed = 0;
    let previousTime = 0;
    let glints: { x: number; depth: number; phase: number; length: number }[] = [];
    let clouds: { x: number; y: number; width: number; height: number; opacity: number; speed: number }[] = [];
    const palette = PALETTES[mood];
    const sunX = 0.72;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glints = Array.from({ length: Math.round((width * height) / 3600) }, () => ({
        x: Math.random(),
        depth: Math.random(),
        phase: Math.random() * Math.PI * 2,
        length: 2 + Math.random() * 18,
      }));
      clouds = Array.from({ length: Math.round(width / 24) }, () => ({
        x: Math.random(),
        y: 0.27 + Math.random() * 0.27,
        width: 0.025 + Math.random() * 0.12,
        height: 0.006 + Math.random() * 0.024,
        opacity: 0.035 + Math.random() * 0.11,
        speed: 0.3 + Math.random() * 0.8,
      }));
    };

    const paint = (time: number) => {
      const look = lookRef.current;
      const horizon = clamp(height * (0.51 + (perspective - 50) * 0.0022) + look.y * 34, height * 0.38, height * 0.66);
      const shiftX = look.x * 38;
      const currentTime = time / 1000;
      const waveSpeed = reducedMotion || paused ? 0 : currentTime;

      const sky = ctx.createLinearGradient(0, 0, 0, horizon + height * 0.12);
      sky.addColorStop(0, palette.sky[0]);
      sky.addColorStop(0.43, palette.sky[1]);
      sky.addColorStop(0.8, palette.sky[2]);
      sky.addColorStop(1, palette.sky[3]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const sunCenterX = width * sunX + shiftX;
      const glow = ctx.createRadialGradient(sunCenterX, horizon - height * 0.12, 0, sunCenterX, horizon - height * 0.12, width * 0.48);
      glow.addColorStop(0, mood === "night" ? "rgba(137,169,218,.20)" : "rgba(255,222,170,.52)");
      glow.addColorStop(0.28, mood === "night" ? "rgba(83,120,176,.12)" : "rgba(255,185,129,.25)");
      glow.addColorStop(1, "rgba(255,190,130,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const sunRadius = Math.max(22, Math.min(width, height) * 0.055);
      const sunY = horizon - height * 0.13;
      const sunHalo = ctx.createRadialGradient(sunCenterX, sunY, sunRadius * 0.35, sunCenterX, sunY, sunRadius * 2.8);
      sunHalo.addColorStop(0, mood === "night" ? "rgba(210,225,255,.4)" : "rgba(255,237,202,.65)");
      sunHalo.addColorStop(1, "rgba(255,222,190,0)");
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(sunCenterX, sunY, sunRadius * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.sun;
      ctx.globalAlpha = mood === "night" ? 0.82 : 0.92;
      ctx.beginPath();
      ctx.arc(sunCenterX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.filter = `blur(${Math.max(5, height * 0.009)}px)`;
      for (const cloud of clouds) {
        const drift = waveSpeed * cloud.speed * 2.2;
        const cloudX = ((cloud.x * width + drift + width) % (width + cloud.width * width)) - cloud.width * width * 0.5;
        const cloudY = horizon * cloud.y;
        const cloudWidth = cloud.width * width;
        const cloudHeight = cloud.height * height;
        const cloudGradient = ctx.createLinearGradient(
          cloudX - cloudWidth / 2,
          cloudY,
          cloudX + cloudWidth / 2,
          cloudY,
        );
        const tint = mood === "night" ? "190,205,233" : mood === "day" ? "255,242,211" : "255,196,158";
        cloudGradient.addColorStop(0, `rgba(${tint},0)`);
        cloudGradient.addColorStop(0.24, `rgba(${tint},${cloud.opacity})`);
        cloudGradient.addColorStop(0.72, `rgba(${tint},${cloud.opacity * 1.5})`);
        cloudGradient.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = cloudGradient;
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, cloudWidth / 2, cloudHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cloudX - cloudWidth * 0.16, cloudY - cloudHeight * 0.38, cloudWidth * 0.28, cloudHeight * 0.7, -0.08, 0, Math.PI * 2);
        ctx.ellipse(cloudX + cloudWidth * 0.18, cloudY - cloudHeight * 0.22, cloudWidth * 0.24, cloudHeight * 0.62, 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (mood === "night") {
        for (let i = 0; i < 90; i += 1) {
          const x = ((i * 193.7) % Math.max(width, 1));
          const y = ((i * 97.3) % Math.max(horizon * 0.72, 1));
          ctx.fillStyle = `rgba(255,244,220,${0.15 + ((i * 17) % 50) / 100})`;
          ctx.fillRect(x, y, i % 7 === 0 ? 1.5 : 1, i % 7 === 0 ? 1.5 : 1);
        }
      }

      const water = ctx.createLinearGradient(0, horizon, 0, height);
      water.addColorStop(0, palette.water[0]);
      water.addColorStop(0.52, palette.water[1]);
      water.addColorStop(1, palette.water[2]);
      ctx.fillStyle = water;
      ctx.fillRect(0, horizon, width, height - horizon);

      const rowCount = Math.max(36, Math.min(72, Math.round(height / 12)));
      for (let row = 0; row < rowCount; row += 1) {
        const depth = row / (rowCount - 1);
        const yBase = horizon + depth * depth * (height - horizon);
        const amplitude = (1.2 + depth * 22) * waveAmount * 0.01;
        const frequency = 0.009 + depth * 0.024;
        const phase = waveSpeed * (0.46 + depth * 0.6) + row * 0.57;
        const alpha = 0.1 + depth * 0.34;
        const lineWidth = 0.45 + depth * 1.4;
        const shimmer = Math.max(0, 1 - Math.abs(depth - 0.48) * 1.6);

        ctx.beginPath();
        for (let step = 0; step <= 80; step += 1) {
          const x = (step / 80) * (width + 100) - 50;
          const localX = x - shiftX;
          const wave =
            Math.sin(localX * frequency + phase) * amplitude +
            Math.sin(localX * frequency * 1.9 - phase * 0.72) * amplitude * 0.36 +
            Math.sin(localX * frequency * 0.43 + phase * 1.3) * amplitude * 0.6;
          const perspectiveTilt = look.x * depth * 12;
          const y = yBase + wave + look.y * depth * 10 + perspectiveTilt;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const reflectionDistance = Math.abs((row * 13 + Math.sin(phase) * 17) - (sunCenterX - shiftX) * 0.16);
        const reflection = clamp(1 - reflectionDistance / (width * (0.06 + depth * 0.16)), 0, 1) * shimmer;
        ctx.strokeStyle = mood === "night"
          ? `rgba(164,190,225,${alpha * (0.65 + reflection * 0.9)})`
          : `rgba(255,${Math.round(198 + depth * 36)},${Math.round(154 + depth * 48)},${alpha * (0.7 + reflection * 1.9)})`;
        ctx.lineWidth = lineWidth + reflection * 1.5;
        ctx.stroke();
      }

      for (const glint of glints) {
        const y = horizon + glint.depth * glint.depth * (height - horizon);
        const relativeX = glint.x * width + shiftX * glint.depth;
        const reflectionWidth = width * (0.035 + glint.depth * 0.17);
        const strength = clamp(1 - Math.abs(relativeX - sunCenterX) / reflectionWidth, 0, 1);
        const flicker = 0.25 + (Math.sin(waveSpeed * 1.7 + glint.phase) + 1) * 0.25;
        if (strength < 0.08) continue;
        ctx.beginPath();
        ctx.strokeStyle = mood === "night"
          ? `rgba(196,215,255,${strength * flicker * 0.6})`
          : `rgba(255,231,192,${strength * flicker * 0.7})`;
        ctx.lineWidth = 0.7 + glint.depth * 1.5;
        ctx.moveTo(relativeX - glint.length * 0.5, y);
        ctx.lineTo(relativeX + glint.length * 0.5, y);
        ctx.stroke();
      }

      const vignette = ctx.createRadialGradient(width * 0.55, height * 0.45, height * 0.18, width * 0.5, height * 0.5, width * 0.78);
      vignette.addColorStop(0, "rgba(10,8,18,0)");
      vignette.addColorStop(1, mood === "day" ? "rgba(16,26,34,.22)" : "rgba(7,6,17,.48)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    drawRef.current = () => paint(elapsed * 1000);

    const loop = (time: number) => {
      const dt = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      elapsed += dt;
      paint(elapsed * 1000);
      if (!reducedMotion && !paused) frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    loop(0);
    if (!reducedMotion && !paused) frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      drawRef.current = () => {};
    };
  }, [mood, paused, perspective, reducedMotion, waveAmount]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      lookX: lookRef.current.x,
      lookY: lookRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    lookRef.current = {
      x: clamp(drag.lookX + (event.clientX - drag.x) / window.innerWidth, -1, 1),
      y: clamp(drag.lookY + (event.clientY - drag.y) / window.innerHeight, -1, 1),
    };
    drawRef.current();
  };

  return (
    <canvas
      ref={canvasRef}
      role="group"
      aria-label="Interactive ocean scene. Drag to look around, or use the arrow keys."
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
        const amount = event.shiftKey ? 0.2 : 0.08;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          lookRef.current.x = clamp(
            lookRef.current.x + (event.key === "ArrowLeft" ? -amount : amount),
            -1,
            1,
          );
          drawRef.current();
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          lookRef.current.y = clamp(
            lookRef.current.y + (event.key === "ArrowUp" ? -amount : amount),
            -1,
            1,
          );
          drawRef.current();
        }
      }}
    />
  );
}
