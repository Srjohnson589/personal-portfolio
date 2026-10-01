"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePointer } from "@/hooks/use-pointer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type ParallaxLayerProps = {
  /** Maximum translation in pixels at the extremes of pointer travel. */
  depth: number;
  className?: string;
  children: ReactNode;
};

/**
 * Wraps a visual layer and nudges it based on cursor position, smoothed with
 * a simple lerp so the motion feels inertial rather than snapping to the
 * cursor 1:1. Layers with different `depth` values create a sense of scale.
 */
export default function ParallaxLayer({
  depth,
  className,
  children,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = usePointer();
  const reducedMotion = usePrefersReducedMotion();
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;

    let frame: number;

    const loop = () => {
      const target = pointer.current;
      current.current.x += (target.nx * depth - current.current.x) * 0.06;
      current.current.y += (target.ny * depth - current.current.y) * 0.06;

      if (ref.current) {
        ref.current.style.transform = `translate3d(${current.current.x.toFixed(2)}px, ${current.current.y.toFixed(2)}px, 0)`;
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [depth, pointer, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
