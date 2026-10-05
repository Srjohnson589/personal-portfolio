"use client";

import { useCallback, useState } from "react";
import DesertScene from "./DesertScene";
import FieldJournal from "./journal/FieldJournal";
import { markFound, useFoundRelics } from "./journal/found-store";
import { relicById } from "./journal/relics";

function SatchelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 8V6.5A2.5 2.5 0 0 1 10.5 4h3A2.5 2.5 0 0 1 16 6.5V8" />
      <path d="M4.5 9.5C4.5 8.7 5.2 8 6 8h12c.8 0 1.5.7 1.5 1.5V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
      <path d="M4.5 10.5c2.5 2.2 5 3.2 7.5 3.2s5-1 7.5-3.2" />
      <path d="M12 13.7v2" />
    </svg>
  );
}

export default function LandingExperience() {
  const found = useFoundRelics();
  const [openId, setOpenId] = useState<string | null>(null);

  const handleRelicFound = useCallback((id: string) => {
    markFound(id);
    window.setTimeout(() => setOpenId(id), 500);
  }, []);
  const closeJournal = useCallback(() => setOpenId(null), []);

  const openRelic = openId ? relicById(openId) ?? null : null;
  const latest = found.at(-1);

  return (
    <main className="relative isolate h-dvh min-h-[620px] w-full overflow-hidden bg-[#211a22] text-[#fff5e8]">
      <DesertScene onRelicFound={handleRelicFound} />
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
          Drag to look&nbsp; · &nbsp;Click the sand to walk
        </p>
      </div>

      {latest && (
        <button
          type="button"
          onClick={() => setOpenId(latest)}
          aria-label={`Open field journal (${found.length} found)`}
          className="absolute bottom-[4.5rem] right-4 z-20 flex items-center gap-2 rounded-full border border-[#f1e4c8]/25 bg-[#2a1d18]/55 py-2 pl-3 pr-4 font-journal text-[0.95rem] italic text-[#f1e4c8]/85 backdrop-blur-sm transition hover:border-[#f1e4c8]/45 hover:text-[#f1e4c8] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#f1e4c8]/60 sm:bottom-7 sm:right-8"
        >
          <SatchelIcon />
          Journal
        </button>
      )}

      <FieldJournal open={openRelic !== null} relic={openRelic} onClose={closeJournal} />
    </main>
  );
}
