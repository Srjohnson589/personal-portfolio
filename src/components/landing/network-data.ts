export type SystemNode = {
  id: string;
  label: string;
  description: string;
  /** Position as a percentage of the viewport, 0-100. */
  x: number;
  y: number;
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
    x: 70,
    y: 26,
  },
  {
    id: "apis",
    label: "APIs",
    description: "Design, versioning, and developer experience.",
    x: 87,
    y: 48,
  },
  {
    id: "integrations",
    label: "INTEGRATIONS",
    description: "Connecting disparate systems reliably.",
    x: 64,
    y: 72,
  },
  {
    id: "data",
    label: "DATA",
    description: "Pipelines, modeling, and data quality.",
    x: 38,
    y: 83,
  },
  {
    id: "ai",
    label: "AI",
    description: "Agentic workflows and applied AI systems.",
    x: 82,
    y: 18,
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
