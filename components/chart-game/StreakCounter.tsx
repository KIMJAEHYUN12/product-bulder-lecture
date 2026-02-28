"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  streak: number;
}

export function StreakCounter({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={streak}
          className="text-lg sm:text-xl font-black text-orange-400 tabular-nums"
          initial={{ y: -20, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {streak}
        </motion.span>
      </AnimatePresence>
      <span className="text-xs text-gray-500 font-mono">연승</span>
    </div>
  );
}
