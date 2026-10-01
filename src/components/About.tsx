import AnimatedSection from "@/components/AnimatedSection";

export default function About() {
  return (
    <AnimatedSection
      id="about"
      className="mx-auto max-w-5xl px-6 py-24 border-t border-white/10"
    >
      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-sm uppercase tracking-[0.3em] text-zinc-500">
            About
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A bit about how I work
          </h2>
        </div>
        <div className="space-y-4 text-zinc-400">
          <p>
            Replace this paragraph with your own story: background, what you
            care about, and the kind of problems you like solving.
          </p>
          <p>
            I like pairing solid engineering with real attention to design,
            motion, and polish — this site is as much a design project as it
            is a list of projects.
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}
