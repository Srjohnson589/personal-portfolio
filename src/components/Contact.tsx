"use client";

import { motion } from "framer-motion";

export default function Contact() {
  return (
    <section
      id="contact"
      className="border-t border-white/10 px-6 py-24 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto max-w-xl"
      >
        <p className="mb-2 font-mono text-sm uppercase tracking-[0.3em] text-zinc-500">
          Say hello
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Let&apos;s build something.
        </h2>
        <p className="mt-4 text-zinc-400">
          Replace this with your email address or a contact form.
        </p>
        <a
          href="mailto:hello@example.com"
          className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
        >
          hello@example.com
        </a>
      </motion.div>
    </section>
  );
}
