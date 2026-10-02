export type SystemNode = {
  id: string;
  label: string;
  description: string;
  /** Position as a percentage of the viewport, 0-100. */
  x: number;
  y: number;
  /** Relative depth used to bias size/brightness; higher means nearer. */
  depth: number;
  /** Height of the visible structure in pixels. */
  structureHeight: number;
  /** Width of the visible structure in pixels. */
  structureWidth: number;
};

/**
 * The "hidden technical system" woven into the environment. Positions are
 * loose and asymmetric on purpose — this is a constellation of systems
 * talking to each other, not a grid of feature cards.
 */
export const systemNodes: SystemNode[] = [
  {
    id: "backend",
    label: "BACKEND",
    description: "Distributed services, queues, event-driven systems.",
    x: 69,
    y: 36,
    depth: 0.34,
    structureHeight: 178,
    structureWidth: 30,
  },
  {
    id: "apis",
    label: "APIs",
    description: "Design, versioning, and developer experience.",
    x: 84,
    y: 51,
    depth: 0.3,
    structureHeight: 166,
    structureWidth: 28,
  },
  {
    id: "integrations",
    label: "INTEGRATIONS",
    description: "Connecting disparate systems reliably.",
    x: 62,
    y: 72,
    depth: 0.58,
    structureHeight: 198,
    structureWidth: 24,
  },
  {
    id: "data",
    label: "DATA",
    description: "Pipelines, modeling, and data quality.",
    x: 38,
    y: 83,
    depth: 0.78,
    structureHeight: 220,
    structureWidth: 22,
  },
  {
    id: "ai",
    label: "AI",
    description: "Agentic workflows and applied AI systems.",
    x: 80,
    y: 22,
    depth: 0.46,
    structureHeight: 156,
    structureWidth: 32,
  },
];

/** Sparse connections between nodes — systems communicating, not a hierarchy. */
export const systemEdges: Array<[string, string]> = [
  ["backend", "apis"],
  ["apis", "integrations"],
  ["integrations", "data"],
  ["backend", "integrations"],
  ["backend", "ai"],
  ["apis", "ai"],
];
