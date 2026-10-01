import AnimatedSection from "@/components/AnimatedSection";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/data/projects";

export default function Projects() {
  return (
    <AnimatedSection id="projects" className="mx-auto max-w-5xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 font-mono text-sm uppercase tracking-[0.3em] text-zinc-500">
          Selected work
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Projects
        </h2>
        <p className="mt-4 text-zinc-400">
          Most of the code behind these lives in private repositories, so
          each card outlines the problem, the approach, and the stack rather
          than linking to source.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </AnimatedSection>
  );
}
