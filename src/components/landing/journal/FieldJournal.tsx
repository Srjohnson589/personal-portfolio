"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { Relic } from "./relics";

function StrongboxSketch() {
  return (
    <svg viewBox="0 0 160 110" className="h-24 w-auto" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 52 L22 94 L118 100 L138 86 L138 46" strokeWidth="1.6" />
      <path d="M22 52 L118 58 L138 46" strokeWidth="1.4" />
      <path d="M118 58 L118 100" strokeWidth="1.4" />
      <path d="M22 52 C22 22 112 20 118 58" strokeWidth="1.6" />
      <path d="M118 58 C118 30 132 24 138 46" strokeWidth="1.2" />
      <path d="M58 26 C62 24 64 40 64 55 L64 97" strokeWidth="2.4" opacity="0.7" />
      <path d="M86 26 C92 26 92 42 92 57 L92 99" strokeWidth="2.4" opacity="0.7" />
      <rect x="70" y="64" width="12" height="13" rx="1.5" strokeWidth="1.3" />
      <path d="M72 64 C72 57 80 57 80 64" strokeWidth="1.2" />
      <path d="M10 96 C40 92 70 106 104 104 C122 103 140 96 152 92" strokeWidth="1" opacity="0.55" />
      <path d="M16 103 C44 100 80 110 120 108" strokeWidth="0.8" opacity="0.35" />
    </svg>
  );
}

const SKETCHES: Record<string, () => React.JSX.Element> = { strongbox: StrongboxSketch };

type FieldJournalProps = {
  open: boolean;
  relic: Relic | null;
  onClose: () => void;
};

export default function FieldJournal({ open, relic, onClose }: FieldJournalProps) {
  const reducedMotion = usePrefersReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const Sketch = relic ? SKETCHES[relic.id] : undefined;

  return (
    <AnimatePresence>
      {open && relic && (
        <motion.div
          key="journal"
          className="absolute inset-0 z-30 flex items-center justify-center bg-[#1a1216]/45 px-4 py-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
          onClick={onClose}
        >
          <motion.article
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-title"
            className="journal-page relative max-h-full w-full max-w-[34rem] overflow-y-auto rounded-[3px] px-7 pb-8 pt-9 font-journal text-[#3a2818] sm:px-11 sm:pb-11 sm:pt-12"
            initial={reducedMotion ? false : { y: 18, rotate: -0.6, opacity: 0 }}
            animate={{ y: 0, rotate: -0.3, opacity: 1 }}
            exit={reducedMotion ? undefined : { y: 10, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close journal"
              className="absolute right-4 top-3 rounded-full px-2 text-2xl leading-none text-[#3a2818]/55 transition hover:text-[#3a2818] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#3a2818]/50"
            >
              ×
            </button>

            <p className="text-[0.78rem] uppercase tracking-[0.32em] text-[#7a5734]">{relic.chapter}</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 id="journal-title" className="text-[2.1rem] font-medium leading-[1.05] sm:text-[2.5rem]">
                {relic.name}
              </h2>
              {Sketch && (
                <div className="hidden shrink-0 -rotate-3 text-[#5a3d24]/70 sm:block">
                  <Sketch />
                </div>
              )}
            </div>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-[#5a3d24]/45 via-[#5a3d24]/20 to-transparent" />

            <p className="mt-5 text-[1.22rem] italic leading-snug text-[#5a3d24]">{relic.hook}</p>

            <div className="mt-5 space-y-4 text-[1.1rem] leading-relaxed">
              {relic.story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-6 text-[1.1rem] leading-relaxed">
              <span className="font-semibold">What it changed: </span>
              {relic.result}
            </p>

            <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-[#5a3d24]/20 pt-4 text-[0.95rem]">
              <p className="uppercase tracking-[0.16em] text-[#6b4a2c]/85 text-[0.78rem]">{relic.tags.join("  ·  ")}</p>
              <p className="italic text-[#6b4a2c]">{relic.credit}</p>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
