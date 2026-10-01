"use client";

import { useState } from "react";
import OceanScene, { type OceanMood } from "./OceanScene";

const moods: { id: OceanMood; label: string; swatch: string }[] = [
  { id: "dawn", label: "Dawn", swatch: "bg-[#d99a88]" },
  { id: "day", label: "Daylight", swatch: "bg-[#82b9c6]" },
  { id: "dusk", label: "Sunset", swatch: "bg-[#c77b69]" },
  { id: "night", label: "Night", swatch: "bg-[#303d61]" },
];

export default function LandingExperience() {
  const [mood, setMood] = useState<OceanMood>("dusk");
  const [waveAmount, setWaveAmount] = useState(68);
  const [perspective, setPerspective] = useState(50);
  const [paused, setPaused] = useState(false);

  return (
    <main className="relative isolate h-dvh min-h-[620px] w-full overflow-hidden bg-[#12131e] text-[#f8f1e8]">
      <OceanScene
        mood={mood}
        waveAmount={waveAmount}
        perspective={perspective}
        paused={paused}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#100f1c]/35 via-transparent to-[#090d17]/45"
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
        <span className="hidden text-[10px] uppercase tracking-[0.28em] text-white/60 sm:block">
          Software engineer&nbsp; · &nbsp;Backend / APIs / AI
        </span>
      </header>

      <section
        id="about"
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-5 sm:px-10 lg:px-14"
      >
        <div className="pointer-events-auto max-w-[min(42rem,calc(100vw-2.5rem))] rounded-[1.75rem] border border-white/20 bg-[#17151a]/45 p-6 shadow-[0_24px_100px_rgba(15,10,15,.25)] backdrop-blur-xl sm:p-9 lg:p-11">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#f2d2a3]/85 sm:text-xs">
            Thoughtful systems, made real
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
              Explore the scene
            </span>
          </div>
        </div>
      </section>

      <aside
        aria-label="Ocean scene controls"
        className="absolute bottom-5 left-1/2 z-20 w-[min(94vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/20 bg-[#16151a]/60 p-4 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:w-56 sm:-translate-y-1/2 sm:translate-x-0 sm:rounded-[1.5rem] sm:p-5 lg:right-10"
      >
        <div className="flex items-center justify-between sm:mb-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/55">
            Scene controls
          </p>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/75 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2d2a3]"
          >
            {paused ? "Play waves" : "Pause"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-0 sm:grid-cols-2">
          {moods.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMood(option.id)}
              aria-pressed={mood === option.id}
              className={`flex items-center justify-center gap-2 rounded-full border px-2 py-2 text-[9px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2d2a3] sm:justify-start sm:px-3 sm:text-[10px] ${
                mood === option.id
                  ? "border-[#f2d2a3]/80 bg-white/15 text-white"
                  : "border-white/15 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${option.swatch}`} />
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block sm:mt-6">
          <span className="flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">
            Wave intensity <span>{waveAmount}%</span>
          </span>
          <input
            type="range"
            min="10"
            max="100"
            value={waveAmount}
            onChange={(event) => setWaveAmount(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer accent-[#f1d0a0]"
            aria-label="Wave intensity"
          />
        </label>

        <label className="mt-3 block sm:mt-5">
          <span className="flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">
            Horizon <span>{perspective}%</span>
          </span>
          <input
            type="range"
            min="20"
            max="80"
            value={perspective}
            onChange={(event) => setPerspective(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer accent-[#f1d0a0]"
            aria-label="Horizon height"
          />
        </label>

        <p className="mt-4 hidden border-t border-white/15 pt-4 text-[10px] leading-5 text-white/45 sm:block">
          Drag the water to look around. Use arrow keys when the scene is
          focused.
        </p>
      </aside>

      <div className="pointer-events-none absolute bottom-5 left-6 z-10 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/45 sm:block sm:left-10">
        A portfolio in motion
      </div>
    </main>
  );
}
