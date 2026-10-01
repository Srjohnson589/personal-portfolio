"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <div className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Animated gradient blobs for visual interest */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <motion.div
          className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-fuchsia-600/30 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-500/30 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 font-mono text-sm uppercase tracking-[0.3em] text-zinc-400"
      >
        Designer &amp; Developer
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl"
      >
        Building thoughtful products with a lot of craft in between.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-xl text-lg text-zinc-400"
      >
        I work across a handful of private projects — this is where I share
        the thinking, the design process, and the approach behind them.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col gap-4 sm:flex-row"
      >
        <a
          href="#projects"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
        >
          View projects
        </a>
        <a
          href="#contact"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Get in touch
        </a>
      </motion.div>
    </div>
  );
}
