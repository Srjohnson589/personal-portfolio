export type Project = {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  approach: string[];
  stack: string[];
  year: string;
  status: "Private repo" | "In progress" | "Case study coming soon";
};

/**
 * These entries intentionally describe the *project and approach* rather
 * than linking to source code, since the underlying repositories are
 * private. Replace the placeholders below with real write-ups as each
 * case study is ready.
 */
export const projects: Project[] = [
  {
    slug: "project-one",
    title: "Project One",
    tagline: "A short, punchy description of the problem this solved.",
    summary:
      "Replace this with a 2-3 sentence overview of the product, who it was for, and the outcome. Focus on the problem and the impact, not implementation details.",
    approach: [
      "Discovery & research step",
      "Key architectural or design decision",
      "How it was validated / shipped",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS"],
    year: "2025",
    status: "Case study coming soon",
  },
  {
    slug: "project-two",
    title: "Project Two",
    tagline: "Another short, punchy description.",
    summary:
      "Replace this with a 2-3 sentence overview of the product, who it was for, and the outcome.",
    approach: [
      "Discovery & research step",
      "Key architectural or design decision",
      "How it was validated / shipped",
    ],
    stack: ["Node.js", "PostgreSQL", "AWS"],
    year: "2025",
    status: "Case study coming soon",
  },
  {
    slug: "project-three",
    title: "Project Three",
    tagline: "A third placeholder project outline.",
    summary:
      "Replace this with a 2-3 sentence overview of the product, who it was for, and the outcome.",
    approach: [
      "Discovery & research step",
      "Key architectural or design decision",
      "How it was validated / shipped",
    ],
    stack: ["React", "GraphQL", "Figma"],
    year: "2024",
    status: "Private repo",
  },
];
