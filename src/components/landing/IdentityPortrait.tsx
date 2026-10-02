"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders Sarah's portrait with a graceful fallback to her initials when the
 * placeholder file at `/sarah-ferg.png` isn't available.
 *
 * Plain `onError` isn't enough here: if the image request fails before
 * client-side hydration finishes, the browser's non-bubbling `error` event
 * can fire before React attaches its listener, so we also check
 * `img.complete`/`naturalWidth` once mounted.
 */
export default function IdentityPortrait() {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, []);

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-amber-100/30 sm:h-20 sm:w-20">
      {!broken && (
        // Plain img (not next/image) so a missing placeholder file degrades
        // gracefully instead of failing the build.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src="/sarah-ferg.png"
          alt="Portrait of Sarah Johnson"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
      {broken && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-200/20 to-amber-900/40 font-mono text-lg text-amber-100">
          SJ
        </div>
      )}
    </div>
  );
}
