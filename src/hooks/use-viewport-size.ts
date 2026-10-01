"use client";

import { useEffect, useState } from "react";

type ViewportSize = {
  width: number;
  height: number;
};

/**
 * Tracks the viewport size in actual pixels so SVG/canvas layers can use a
 * 1:1 coordinate system (avoids the distortion that comes from stretching a
 * percentage-based viewBox over a non-square viewport).
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}
