"use client";

import DesertScene from "./DesertScene";

export default function LandingExperience() {
  return (
    <main className="relative isolate h-dvh min-h-[620px] w-full overflow-hidden bg-[#211a22] text-[#fff5e8]">
      <DesertScene />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#171423]/30 via-transparent to-[#21151c]/35"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <a
          href="#about"
          className="pointer-events-auto flex items-center gap-3 text-xs font-medium uppercase tracking-[0.34em] text-white/90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 font-serif text-sm tracking-normal">
            SJ
          </span>
          <span>Sarah Johnson</span>
        </a>
        <span className="hidden text-[10px] uppercase tracking-[0.28em] text-white/65 sm:block">
          Software engineer&nbsp; · &nbsp;Backend / APIs / AI
        </span>
      </header>

      <section
        id="about"
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-5 sm:px-10 lg:px-14"
      >
        <div className="pointer-events-auto max-w-[min(42rem,calc(100vw-2.5rem))] rounded-[1.75rem] border border-white/20 bg-[#201a20]/45 p-6 shadow-[0_24px_100px_rgba(20,12,16,.32)] backdrop-blur-xl sm:p-9 lg:p-11">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#f4d1a0]/85 sm:text-xs">
            Building useful things, thoughtfully
          </p>
          <h1 className="font-serif text-5xl font-light leading-[0.95] tracking-[-0.055em] text-white drop-shadow sm:text-7xl lg:text-[6.5rem]">
            Sarah
            <br />
            Johnson<span className="text-[#efc99e]">.</span>
          </h1>
          <p className="mt-5 text-xs uppercase tracking-[0.27em] text-[#f4d5a7]/85 sm:text-sm">
            Software engineer
          </p>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
            I build dependable software for the teams and people who rely on
            it—from backend foundations and APIs to integrations and AI.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Backend", "APIs", "Integrations", "AI"].map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/75"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5">
            <a
              href="https://theferg.com/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
            >
              Ferguson Advertising
            </a>
            <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
              <span aria-hidden="true" className="h-px w-6 bg-[#f2d2a3]/70" />
              The open dunes
            </span>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex justify-center px-5">
        <p className="rounded-full border border-white/15 bg-[#201a20]/35 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.19em] text-white/65 backdrop-blur-sm sm:text-[10px]">
          Drag to look&nbsp; · &nbsp;W A S D or arrow keys to wander
        </p>
      </div>
    </main>
  );
}
