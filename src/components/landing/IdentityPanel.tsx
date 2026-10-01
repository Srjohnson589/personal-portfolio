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
    <div className="pointer-events-none absolute inset-0 flex items-center">
      <div className="pointer-events-auto mx-6 max-w-md sm:mx-12 md:mx-20">
        <div className="mb-6 flex items-center gap-4">
          <IdentityPortrait />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-amber-50 sm:text-2xl">
              Sarah Johnson
            </h1>
            <p className="text-sm text-amber-100/70">Software Engineer</p>
          </div>
        </div>

        <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-100/60">
          Backend · APIs · Integrations · AI
        </p>

        <a
          href="https://theferg.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block text-xs text-amber-100/40 underline-offset-4 transition-colors hover:text-amber-100/70 hover:underline"
        >
          Ferguson Advertising
        </a>
      </div>
    </div>
  );
}
