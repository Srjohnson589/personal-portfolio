"use client";

import { useEffect, useRef, useState } from "react";

type IdentityPortraitProps = {
  className?: string;
};

/**
 * Sarah's portrait, framed like a physical object rather than a generic
 * profile image. If the asset is missing, it still degrades to her initials.
 */
export default function IdentityPortrait({ className = "" }: IdentityPortraitProps) {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] border border-amber-100/14 bg-[linear-gradient(180deg,rgba(255,236,208,0.08)_0%,rgba(39,23,13,0.34)_100%)] shadow-[0_28px_70px_-40px_rgba(0,0,0,0.9)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,217,163,0.18),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_58%,rgba(0,0,0,0.28)_100%)]" />
      {!broken && (
        // Plain img (not next/image) so a missing placeholder file degrades
        // gracefully instead of failing the build.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src="/sarah-ferg.jpg"
          alt="Portrait of Sarah Johnson"
          className="relative z-10 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
      {broken && (
        <div className="relative z-10 flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-200/20 via-amber-700/20 to-amber-950/50 font-mono text-lg text-amber-50">
          SJ
        </div>
      )}
    </div>
  );
}
