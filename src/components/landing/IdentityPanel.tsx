"use client";

import IdentityPortrait from "./IdentityPortrait";

/**
 * Sarah's identity anchor, reworked as a physical artifact in the landscape:
 * portrait first, with the name and role engraved beside it rather than
 * presented like a standard web card.
 */
export default function IdentityPanel() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute left-4 top-[56%] w-[min(36rem,calc(100vw-2rem))] -translate-y-1/2 sm:left-8 lg:left-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-amber-100/10 bg-[linear-gradient(180deg,rgba(15,11,8,0.42)_0%,rgba(28,18,12,0.24)_100%)] p-4 backdrop-blur-[4px] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,214,150,0.12),transparent_42%)]" />
          <div className="relative flex items-end gap-4 sm:gap-5">
            <IdentityPortrait className="h-44 w-32 shrink-0 sm:h-52 sm:w-36" />

            <div className="min-w-0 pb-1">
              <div className="mb-2">
                <h1 className="text-xl font-semibold tracking-tight text-amber-50 sm:text-2xl">
                  Sarah Johnson
                </h1>
                <p className="text-sm text-amber-100/70">Software Engineer</p>
              </div>

              <p className="max-w-sm font-mono text-[10px] uppercase tracking-[0.3em] text-amber-100/55 sm:text-xs">
                Backend · APIs · Integrations · Data · AI
              </p>

              <div className="mt-6 flex items-center gap-4">
                <span className="h-px w-10 bg-gradient-to-r from-amber-100/50 to-transparent" />
                <a
                  href="https://theferg.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-100/40 underline-offset-4 transition-colors hover:text-amber-100/70 hover:underline"
                >
                  Ferguson Advertising
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
