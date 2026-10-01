/**
 * Pure-CSS dusk desert backdrop: a sky-to-sand gradient, a low warm sun
 * glow, a horizon glow, and a vignette. Deliberately static (no JS) so the
 * base atmosphere costs nothing — all motion comes from the dust and the
 * system layers above it.
 */
export default function Atmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0e1a_0%,#1b1711_42%,#2e1d10_72%,#140d08_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_16%,rgba(255,196,120,0.28),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_125%,rgba(255,150,80,0.16),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
