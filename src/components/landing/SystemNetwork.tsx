"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePointer } from "@/hooks/use-pointer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useViewportSize } from "@/hooks/use-viewport-size";
import { systemEdges, systemNodes } from "./network-data";

const PROXIMITY_RADIUS = 340;
const LERP_FACTOR = 0.075;
const BASE_PROMINENCE = 0.12;

type NodeRuntime = {
  current: number;
  target: number;
  hover: boolean;
  phase: number;
};

/**
 * The hidden technical system embedded in the desert: sparse monolith-like
 * structures, subtle connections, and small request/response packets that
 * make the network feel alive without turning it into a dashboard.
 */
export default function SystemNetwork() {
  const pointer = usePointer();
  const reducedMotion = usePrefersReducedMotion();
  const { width, height } = useViewportSize();

  const structureRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const labelRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const descRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const glowRefs = useRef(new Map<string, HTMLSpanElement | null>());
  const edgeRefs = useRef(new Map<string, SVGPathElement | null>());
  const packetRefs = useRef<Array<SVGCircleElement | null>>([]);

  const [runtime] = useState(() => {
    const map = new Map<string, NodeRuntime>();
    systemNodes.forEach((node) => {
      map.set(node.id, {
        current: BASE_PROMINENCE,
        target: BASE_PROMINENCE,
        hover: false,
        phase: Math.random() * Math.PI * 2,
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

  const edgeGeometry = useMemo(() => {
    return systemEdges
      .map(([from, to], index) => {
        const a = pixelNodes.find((node) => node.id === from);
        const b = pixelNodes.find((node) => node.id === to);
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
      systemEdges.flatMap(([from, to], index) => [
        {
          id: `${from}-${to}-req`,
          edgeId: `${from}-${to}`,
          from,
          to,
          direction: 1,
          duration: 3.4 + (index % 3) * 0.6,
          offset: (index * 0.23) % 1,
          radius: 1.7,
          opacity: 0.8,
        },
        {
          id: `${from}-${to}-res`,
          edgeId: `${from}-${to}`,
          from: to,
          to: from,
          direction: -1,
          duration: 4.2 + (index % 2) * 0.7,
          offset: (index * 0.41 + 0.37) % 1,
          radius: 1.35,
          opacity: 0.45,
        },
      ]),
    [],
  );

  const setHover = (id: string, isHovered: boolean) => {
    const rt = runtime.get(id);
    if (rt) rt.hover = isHovered;

    if (reducedMotion) {
      const structure = structureRefs.current.get(id);
      const label = labelRefs.current.get(id);
      const desc = descRefs.current.get(id);
      const glow = glowRefs.current.get(id);
      if (structure) structure.style.opacity = isHovered ? "1" : "0.9";
      if (label) label.style.opacity = isHovered ? "1" : "0.32";
      if (desc) desc.style.opacity = isHovered ? "1" : "0";
      if (glow) glow.style.opacity = isHovered ? "0.72" : "0.22";
    }
  };

  useEffect(() => {
    if (width === 0 || height === 0) return;

    if (reducedMotion) {
      pixelNodes.forEach((node) => {
        const structure = structureRefs.current.get(node.id);
        const label = labelRefs.current.get(node.id);
        const desc = descRefs.current.get(node.id);
        const glow = glowRefs.current.get(node.id);
        if (structure) structure.style.transform = "translate(-50%, -100%) scale(0.94)";
        if (structure) structure.style.opacity = "0.9";
        if (label) label.style.opacity = "0.32";
        if (desc) desc.style.opacity = "0";
        if (glow) glow.style.opacity = "0.22";
      });
      edgeGeometry.forEach((edge) => {
        const path = edgeRefs.current.get(edge.id);
        if (path) {
          path.setAttribute("stroke-opacity", "0.26");
          path.setAttribute("stroke-width", "1.15");
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

        rt.target = rt.hover
          ? 1
          : Math.max(BASE_PROMINENCE, proximity * 0.92 + node.depth * 0.08);
        rt.current += (rt.target - rt.current) * LERP_FACTOR;

        const prominence = rt.current;
        const structure = structureRefs.current.get(node.id);
        const label = labelRefs.current.get(node.id);
        const desc = descRefs.current.get(node.id);
        const glow = glowRefs.current.get(node.id);

        if (structure) {
          const bob =
            Math.sin(elapsed * (0.65 + node.depth * 0.35) + rt.phase) *
            (0.8 + node.depth * 1.3);
          const scale = 0.86 + node.depth * 0.18 + prominence * 0.2;
          const rise = (1 - prominence) * 14 + bob;
          structure.style.transform = `translate(-50%, -100%) translateY(${rise.toFixed(
            2,
          )}px) scale(${scale.toFixed(3)})`;
          structure.style.opacity = (0.18 + node.depth * 0.42 + prominence * 0.38).toFixed(
            3,
          );
          structure.style.filter = `drop-shadow(0 0 ${(8 + prominence * 16).toFixed(
            1,
          )}px rgba(255, 203, 137, ${(0.06 + prominence * 0.15).toFixed(3)}))`;
        }
        if (label) {
          label.style.opacity = (0.05 + prominence * 0.9).toFixed(3);
        }
        if (desc) {
          desc.style.opacity = Math.max(0, (prominence - 0.52) / 0.4).toFixed(3);
        }
        if (glow) {
          glow.style.opacity = (0.12 + prominence * 0.58).toFixed(3);
        }
      });

      edgeGeometry.forEach((edge) => {
        const path = edgeRefs.current.get(edge.id);
        if (!path) return;
        const a = runtime.get(edge.from)?.current ?? BASE_PROMINENCE;
        const b = runtime.get(edge.to)?.current ?? BASE_PROMINENCE;
        const strength = (a + b) / 2;
        path.setAttribute("stroke-opacity", (0.05 + strength * 0.34).toFixed(3));
        path.setAttribute("stroke-width", (0.7 + strength * 1.15).toFixed(2));
      });

      packets.forEach((packet, index) => {
        const circle = packetRefs.current[index];
        if (!circle) return;
        const edge = edgeGeometry.find((candidate) => candidate.id === packet.edgeId);
        if (!edge) return;

        let t = (elapsed / packet.duration + packet.offset) % 1;
        if (packet.direction < 0) t = 1 - t;
        const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        const inv = 1 - eased;

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
        circle.setAttribute(
          "opacity",
          (packet.opacity * (0.25 + strength * 0.8)).toFixed(3),
        );
        circle.setAttribute("r", (packet.radius + strength * 0.85).toFixed(2));
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
              r={packet.radius}
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
                  structureRefs.current.set(node.id, el);
                }}
                aria-label={`${node.label}. ${node.description}`}
                className="group relative flex flex-col items-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-100/70"
                style={{
                  transform: "translate(-50%, -100%) translateY(12px) scale(0.94)",
                  transformOrigin: "50% 100%",
                  willChange: "transform, opacity, filter",
                }}
                onMouseEnter={() => setHover(node.id, true)}
                onMouseLeave={() => setHover(node.id, false)}
                onFocus={() => setHover(node.id, true)}
                onBlur={() => setHover(node.id, false)}
              >
                <span
                  ref={(el) => {
                    glowRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-8 rounded-full bg-[radial-gradient(circle,rgba(255,197,130,0.45),transparent_68%)] blur-3xl"
                  style={{ opacity: 0.22 }}
                />

                <div
                  className="relative flex items-end justify-center"
                  style={{
                    height: `${node.structureHeight}px`,
                    width: `${node.structureWidth}px`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-1/2 bottom-0 h-[95%] w-full -translate-x-1/2 rounded-t-[999px] bg-[linear-gradient(180deg,rgba(255,234,198,0.04)_0%,rgba(255,198,122,0.28)_45%,rgba(64,35,18,0.68)_100%)] ring-1 ring-amber-100/10"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[18%] bottom-[10%] h-[76%] rounded-t-[999px] bg-[linear-gradient(180deg,rgba(255,247,230,0.2)_0%,rgba(247,205,133,0.32)_42%,rgba(120,68,28,0.16)_100%)]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[10%] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-amber-100 shadow-[0_0_12px_4px_rgba(255,214,150,0.55)]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-[10px] h-3 w-3 -translate-x-1/2 rounded-full bg-amber-50 shadow-[0_0_10px_4px_rgba(255,227,180,0.55)]"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,232,198,0.5),transparent)]"
                  />
                </div>

                <span
                  ref={(el) => {
                    labelRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="mt-3 whitespace-nowrap font-mono text-[11px] tracking-[0.34em] text-amber-100"
                  style={{ opacity: 0.18 }}
                >
                  {node.label}
                </span>
                <span
                  ref={(el) => {
                    descRefs.current.set(node.id, el);
                  }}
                  aria-hidden="true"
                  className="mt-2 max-w-[14rem] text-center text-[11px] leading-snug text-amber-50/80"
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
