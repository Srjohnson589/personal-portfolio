"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

export type PointerState = {
  /** Raw viewport pixel coordinates. */
  x: number;
  y: number;
  /** Normalized -1..1 relative to viewport center, used for parallax. */
  nx: number;
  ny: number;
};

const PointerContext = createContext<RefObject<PointerState> | null>(null);

/**
 * Tracks pointer position in a mutable ref (no React state) so consumers can
 * read the latest value inside their own animation-frame loops without
 * triggering re-renders on every mouse move.
 */
export function PointerProvider({ children }: { children: ReactNode }) {
  const ref = useRef<PointerState>({ x: 0, y: 0, nx: 0, ny: 0 });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const { innerWidth, innerHeight } = window;
      ref.current.x = event.clientX;
      ref.current.y = event.clientY;
      ref.current.nx = (event.clientX / innerWidth) * 2 - 1;
      ref.current.ny = (event.clientY / innerHeight) * 2 - 1;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <PointerContext.Provider value={ref}>{children}</PointerContext.Provider>
  );
}

export function usePointer(): RefObject<PointerState> {
  const ctx = useContext(PointerContext);
  if (!ctx) {
    throw new Error("usePointer must be used within a PointerProvider");
  }
  return ctx;
}
