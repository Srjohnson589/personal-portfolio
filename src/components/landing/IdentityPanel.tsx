"use client";

import IdentityPortrait from "./IdentityPortrait";

/**
 * Sarah's identity anchor: portrait, name, role, and a deliberately
 * understated link to her employer. This is plain, real HTML text (not
 * canvas/SVG) so it stays fully accessible regardless of the visual
 * experiments happening around it.
 */
export default function IdentityPanel() {
  return (
    <section
      id="about"
      className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-start px-5 sm:bottom-7 sm:px-8 lg:px-12"
    >
      <div className="pointer-events-auto max-w-[min(27rem,calc(100vw-2.5rem))] rounded-[1.6rem] border border-white/14 bg-[#1e181b]/46 p-4 shadow-[0_20px_80px_rgba(22,14,18,.28)] backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#f3c98d]/12 blur-md" aria-hidden="true" />
            <IdentityPortrait />
          </div>
          <div>
            <p className="font-serif text-2xl leading-none text-[#fff5eb] sm:text-[1.7rem]">
              Sarah Johnson
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-[#f6d7ad]/78">
              Software Engineer
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-[22rem] text-sm leading-7 text-white/72">
          Backend systems, APIs, integrations, data, and AI—built to feel quiet,
          dependable, and connected.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {["Backend", "APIs", "Integrations", "Data", "AI"].map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/65"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <a
            href="https://theferg.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-white/48 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/82"
          >
            Ferguson Advertising
          </a>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/38">
            open dunes
          </span>
        </div>
      </div>
    </section>
  );
}
