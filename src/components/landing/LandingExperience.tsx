"use client";

import { motion } from "framer-motion";
import { PointerProvider } from "@/hooks/use-pointer";
import Atmosphere from "./Atmosphere";
import DustField from "./DustField";
import ExploreCue from "./ExploreCue";
import IdentityPanel from "./IdentityPanel";
import ParallaxLayer from "./ParallaxLayer";
import SystemNetwork from "./SystemNetwork";

/**
 * Prototype landing experience: an atmospheric desert environment that
 * gradually reveals a hidden network of systems as the visitor's cursor
 * moves through it. This intentionally stops at the "explore further"
 * moment — no destinations are built yet.
 */
export default function LandingExperience() {
  return (
    <PointerProvider>
      <div className="relative h-dvh w-full overflow-hidden bg-[#0b0a08]">
        <Atmosphere />

        <ParallaxLayer depth={18} className="absolute inset-0">
          <DustField />
        </ParallaxLayer>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 1.1 }}
          className="absolute inset-0"
        >
          <ParallaxLayer depth={30} className="absolute inset-0">
            <SystemNetwork />
          </ParallaxLayer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <ParallaxLayer depth={8} className="absolute inset-0">
            <IdentityPanel />
          </ParallaxLayer>
        </motion.div>

        <ExploreCue />
      </div>
    </PointerProvider>
  );
}
