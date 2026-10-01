"use client";

import { useEffect, useRef } from "react";
import { usePointer } from "@/hooks/use-pointer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Grain = {
  x: number;
  y: number;
  depth: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
};

type Haze = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
};

const GRAIN_COUNT_DESKTOP = 110;
const GRAIN_COUNT_MOBILE = 50;
const HAZE_COUNT_DESKTOP = 7;
const HAZE_COUNT_MOBILE = 4;
const MOBILE_BREAKPOINT = 768;

/**
 * Canvas-based blowing sand/dust, in two layers:
 *  - fine grains rendered as short motion-streaked strokes (not pinpoint
 *    dots, which read as stars), drifting left-to-right with depth-based
 *    speed and size;
 *  - a handful of large, soft, blurred haze blobs that drift much more
 *    slowly, giving the scene atmospheric depth and a sense of scale.
 * Both layers nudge slightly with the cursor. Falls back to a single
 * static frame when the user prefers reduced motion.
 */
export default function DustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = usePointer();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let grains: Grain[] = [];
    let haze: Haze[] = [];
    let animationFrame = 0;
    let lastTime: number | null = null;

    const createField = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const grainCount = isMobile ? GRAIN_COUNT_MOBILE : GRAIN_COUNT_DESKTOP;
      const hazeCount = isMobile ? HAZE_COUNT_MOBILE : HAZE_COUNT_DESKTOP;

      grains = Array.from({ length: grainCount }, () => {
        const depth = Math.random();
        // Bias toward the lower two-thirds of the screen so this reads as
        // ground-level sand rather than a sky full of stars.
        const y = height * (0.2 + Math.random() * 0.8);
        return {
          x: Math.random() * width,
          y,
          depth,
          size: 0.7 + depth * 1.6,
          speed: 10 + depth * 34,
          drift: (Math.random() - 0.5) * 4,
          opacity: 0.1 + depth * 0.22,
        };
      });

      haze = Array.from({ length: hazeCount }, () => ({
        x: Math.random() * width,
        y: height * (0.35 + Math.random() * 0.6),
        radius: 120 + Math.random() * 180,
        speed: 1.5 + Math.random() * 3,
        opacity: 0.05 + Math.random() * 0.05,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createField();
    };

    resize();
    window.addEventListener("resize", resize);

    ctx.lineCap = "round";

    const paint = (streakScale: number) => {
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.filter = "blur(28px)";
      for (const blob of haze) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(226, 158, 97, ${blob.opacity})`;
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      for (const grain of grains) {
        const streak = streakScale * (grain.speed * 0.1 + 1.5);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(214, 178, 132, ${grain.opacity})`;
        ctx.lineWidth = grain.size;
        ctx.moveTo(grain.x, grain.y);
        ctx.lineTo(grain.x - streak, grain.y - grain.drift * 0.6);
        ctx.stroke();
      }
    };

    if (reducedMotion) {
      paint(0);
      return () => window.removeEventListener("resize", resize);
    }

    const loop = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const { nx, ny } = pointer.current;

      for (const grain of grains) {
        grain.x += grain.speed * dt + nx * grain.depth * 6 * dt;
        grain.y += grain.drift * dt + ny * grain.depth * 3 * dt;

        if (grain.x > width + 20) grain.x = -20;
        if (grain.x < -20) grain.x = width + 20;
        if (grain.y > height + 10) grain.y = -10;
        if (grain.y < -10) grain.y = height + 10;
      }

      for (const blob of haze) {
        blob.x += blob.speed * dt + nx * 4 * dt;
        if (blob.x - blob.radius > width) blob.x = -blob.radius;
        if (blob.x + blob.radius < 0) blob.x = width + blob.radius;
      }

      paint(1);
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [pointer, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full mix-blend-screen"
    />
  );
}
