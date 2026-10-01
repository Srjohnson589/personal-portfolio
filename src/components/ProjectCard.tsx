"use client";

import { motion } from "framer-motion";
import type { Project } from "@/data/projects";

export default function ProjectCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-lg shadow-black/20 transition-colors hover:border-white/30"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          {project.year}
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
          {project.status}
        </span>
      </div>

      <h3 className="text-xl font-semibold text-white">{project.title}</h3>
      <p className="text-sm font-medium text-zinc-400">{project.tagline}</p>
      <p className="text-sm leading-relaxed text-zinc-400">
        {project.summary}
      </p>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Approach
        </p>
        <ul className="space-y-1 text-sm text-zinc-400">
          {project.approach.map((step) => (
            <li key={step} className="flex gap-2">
              <span className="text-zinc-600">—</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {project.stack.map((tech) => (
          <span
            key={tech}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.article>
  );
}
