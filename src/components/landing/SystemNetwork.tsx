"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePointer } from "@/hooks/use-pointer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useViewportSize } from "@/hooks/use-viewport-size";
import { systemEdges, systemNodes } from "./network-data";

const PROXIMITY_RADIUS = 260;
const LERP_FACTOR = 0.08;
const BASE_PROMINENCE = 0.22;

type NodeRuntime = {
  current: number;
  target: number;
  hover: boolean;
};

/**
 * The "hidden technical system" layer: a sparse graph of floating nodes
 * connected by thin, gently curved lines, with small packets of light
 * traveling between them. Nodes start subtle (partially obscured by the
 * environment) and become prominent as the cursor approaches or focuses
 * them.
 *
 * Node/edge visuals are read from refs and written directly to DOM nodes
 * each frame (not React state) so the interaction stays smooth without
 * triggering re-renders on every mouse move.
 */
export default function SystemNetwork() {
  const pointer = usePointer();
  const reducedMotion = usePrefersReducedMotion();
  const { width, height } = useViewportSize();

  const nodeRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const dotRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const labelRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const descRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const edgeRefs = useRef(new Map<string, SVGPathElement | null>());
  const packetRefs = useRef<Array<SVGCircleElement | null>>([]);

  // Lazily-initialized, mutated outside of render (inside the rAF loop and
  // event handlers below) — using useState's initializer keeps this a single
  // stable object without touching ref.current during render.
  const [runtime] = useState(() => {
    const map = new Map<string, NodeRuntime>();
    systemNodes.forEach((node) => {
      map.set(node.id, {
        current: BASE_PROMINENCE,
        target: BASE_PROMINENCE,
        hover: false,
      });
    });
    return map;
  });

  const pixelNodes = useMemo(
    () =>
      systemNodes.map((node) => ({
        ...node,
        px: (node.x / 100) * width,
        py: (node.y / 100) * height,
      })),
    [width, height],
  );

  // Edges get a fixed, gentle curve (alternating sides) so the network
  // reads as organic connections drifting through the environment rather
  // than a sharp, geometric constellation diagram.
  const edgeGeometry = useMemo(() => {
    return systemEdges
      .map(([from, to], index) => {
        const a = pixelNodes.find((n) => n.id === from);
        const b = pixelNodes.find((n) => n.id === to);
        if (!a || !b) return null;

        const mx = (a.px + b.px) / 2;
        const my = (a.py + b.py) / 2;
        const dx = b.px - a.px;
        const dy = b.py - a.py;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / length;
        const ny = dx / length;
        const curvature = length * 0.09 * (index % 2 === 0 ? 1 : -1);

        return {
          id: `${from}-${to}`,
          from,
          to,
          a,
          b,
          cx: mx + nx * curvature,
          cy: my + ny * curvature,
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  }, [pixelNodes]);

  const packets = useMemo(
    () =>
      systemEdges.map(([from, to], index) => ({
        id: `${from}-${to}`,
        from,
        to,
        duration: 3.6 + (index % 3) * 0.9,
        offset: (index * 0.37) % 1,
      })),
    [],
  );

  const setHover = (id: string, isHovered: boolean) => {
    const rt = runtime.get(id);
    if (rt) rt.hover = isHovered;

    // When motion is reduced, the animation loop below never runs, so apply
    // the hover affordance instantly and directly instead.
    if (reducedMotion) {
      const label = labelRefs.current.get(id);
      const desc = descRefs.current.get(id);
      const dot = dotRefs.current.get(id);
      const button = nodeRefs.current.get(id);
      if (label) label.style.opacity = isHovered ? "1" : "0.85";
      if (desc) desc.style.opacity = isHovered ? "1" : "0";
      if (dot) dot.style.opacity = isHovered ? "1" : "0.8";
      if (button)
        button.style.transform = `translate(-50%, -50%) scale(${isHovered ? 1.06 : 1})`;
    }
  };

  useEffect(() => {
    if (width === 0 || height === 0) return;

    if (reducedMotion) {
      // Static, fully legible state — no continuous animation.
      pixelNodes.forEach((node) => {
        const button = nodeRefs.current.get(node.id);
        const label = labelRefs.current.get(node.id);
        const dot = dotRefs.current.get(node.id);
        if (button) button.style.transform = "translate(-50%, -50%) scale(1)";
        if (label) label.style.opacity = "0.85";
        if (dot) dot.style.opacity = "0.8";
      });
      edgeGeometry.forEach((edge) => {
        const path = edgeRefs.current.get(edge.id);
        if (path) {
          path.setAttribute("stroke-opacity", "0.28");
          path.setAttribute("stroke-width", "1.1");
        }
      });
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const loop = (time: number) => {
      if (start === null) start = time;
      const elapsed = (time - start) / 1000;
      const pointerState = pointer.current;

      pixelNodes.forEach((node) => {
        const rt = runtime.get(node.id);
        if (!rt) return;

        const dx = pointerState.x - node.px;
        const dy = pointerState.y - node.py;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - distance / PROXIMITY_RADIUS);

        rt.target = rt.hover ? 1 : Math.max(BASE_PROMINENCE, proximity);
        rt.current += (rt.target - rt.current) * LERP_FACTOR;

        const button = nodeRefs.current.get(node.id);
        const label = labelRefs.current.get(node.id);
        const desc = descRefs.current.get(node.id);
        const dot = dotRefs.current.get(node.id);
        const prominence = rt.current;

        if (button) {
          button.style.transform = `translate(-50%, -50%) scale(${(0.82 + prominence * 0.32).toFixed(3)})`;
        }
        if (label) {
          label.style.opacity = (0.16 + prominence * 0.84).toFixed(3);
        }
        if (dot) {
          dot.style.opacity = (0.35 + prominence * 0.65).toFixed(3);
        }
        if (desc) {
          desc.style.opacity = Math.max(0, (prominence - 0.7) / 0.3).toFixed(3);
        }
      });

      edgeGeometry.forEach((edge) => {
        const path = edgeRefs.current.get(edge.id);
        if (!path) return;
        const a = runtime.get(edge.from)?.current ?? BASE_PROMINENCE;
        const b = runtime.get(edge.to)?.current ?? BASE_PROMINENCE;
        const strength = (a + b) / 2;
        path.setAttribute("stroke-opacity", (0.06 + strength * 0.32).toFixed(3));
        path.setAttribute("stroke-width", (0.75 + strength * 1.25).toFixed(2));
      });

      packets.forEach((packet, index) => {
        const circle = packetRefs.current[index];
        if (!circle) return;
        const edge = edgeGeometry.find((e) => e.id === packet.id);
        if (!edge) return;

        const t = (elapsed / packet.duration + packet.offset) % 1;
        const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        const inv = 1 - eased;
        // Quadratic bezier point, matching the edge path's curve.
        const cx =
          inv * inv * edge.a.px +
          2 * inv * eased * edge.cx +
          eased * eased * edge.b.px;
        const cy =
          inv * inv * edge.a.py +
          2 * inv * eased * edge.cy +
          eased * eased * edge.b.py;

        const strength =
          ((runtime.get(packet.from)?.current ?? BASE_PROMINENCE) +
            (runtime.get(packet.to)?.current ?? BASE_PROMINENCE)) /
          2;

        circle.setAttribute("cx", cx.toFixed(2));
        circle.setAttribute("cy", cy.toFixed(2));
        circle.setAttribute("opacity", (0.25 + strength * 0.65).toFixed(3));
      });

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [
    edgeGeometry,
    packets,
    pixelNodes,
    pointer,
    reducedMotion,
    runtime,
    width,
    height,
  ]);

  if (width === 0 || height === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        {edgeGeometry.map((edge) => (
          <path
            key={edge.id}
            ref={(el) => {
              edgeRefs.current.set(edge.id, el);
            }}
            d={`M ${edge.a.px} ${edge.a.py} Q ${edge.cx} ${edge.cy} ${edge.b.px} ${edge.b.py}`}
            fill="none"
            stroke="rgba(255, 214, 160, 1)"
            strokeOpacity={0.1}
            strokeWidth={0.75}
            strokeLinecap="round"
          />
        ))}

        {!reducedMotion &&
          packets.map((packet, index) => (
            <circle
              key={packet.id}
              ref={(el) => {
                packetRefs.current[index] = el;
              }}
              r={2}
              fill="rgba(255, 236, 200, 0.95)"
              style={{
                filter: "drop-shadow(0 0 3px rgba(255, 220, 170, 0.9))",
              }}
            />
          ))}
      </svg>

      <nav aria-label="Areas of Sarah's work" className="absolute inset-0">
        <ul className="contents">
          {pixelNodes.map((node) => (
            <li
              key={node.id}
              className="pointer-events-auto absolute"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <button
                type="button"
                ref={(el) => {
                  nodeRefs.current.set(node.id, el);
                }}
                aria-label={`${node.label}. ${node.description}`}
                className="group relative flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-full p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/70"
                style={{ transform: "translate(-50%, -50%) scale(0.82)" }}
                onMouseEnter={() => setHover(node.id, true)}
                onMouseLeave={() => setHover(node.id, false)}
                onFocus={() => setHover(node.id, true)}
                onBlur={() => setHover(node.id, false)}
              >
                <span
                  ref={(el) => {
                    dotRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="block h-2.5 w-2.5 rounded-full bg-amber-100 shadow-[0_0_12px_4px_rgba(255,214,150,0.5)] transition-shadow group-hover:shadow-[0_0_18px_6px_rgba(255,214,150,0.75)]"
                  style={{ opacity: 0.35 + BASE_PROMINENCE * 0.65 }}
                />
                <span
                  ref={(el) => {
                    labelRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="whitespace-nowrap font-mono text-[11px] tracking-[0.3em] text-amber-100"
                  style={{ opacity: 0.16 + BASE_PROMINENCE * 0.84 }}
                >
                  {node.label}
                </span>
                <span
                  ref={(el) => {
                    descRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="max-w-[12rem] text-center text-[11px] leading-snug text-amber-50/80"
                  style={{ opacity: 0 }}
                >
                  {node.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
