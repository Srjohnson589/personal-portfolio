"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * A quiet closing beat: lets the visitor know the scene responds to them,
 * without pointing at any destination yet (none exist in this prototype).
 */
export default function ExploreCue() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 2.4, ease: "easeOut" }}
      className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-amber-100/40"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.35em]">
        drag to look
      </span>
      {reducedMotion ? (
        <span aria-hidden="true" className="block h-3 w-px bg-amber-100/40" />
      ) : (
        <motion.span
          aria-hidden="true"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="block h-3 w-px bg-amber-100/40"
        />
      )}
    </motion.div>
  );
}
