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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.34em] text-white/88">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/78 font-serif text-sm tracking-normal">
            SJ
          </span>
          <span>Sarah Johnson</span>
        </div>
        <span className="hidden text-[10px] uppercase tracking-[0.28em] text-white/60 sm:block">
          Software engineer&nbsp; · &nbsp;Backend / APIs / AI
        </span>
      </header>

      <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex justify-center px-5">
        <p className="rounded-full border border-white/10 bg-[#201a20]/22 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.19em] text-white/48 backdrop-blur-sm sm:text-[10px]">
          Drag to look&nbsp; · &nbsp;W A S D or arrow keys to wander
        </p>
      </div>
    </main>
  );
}
