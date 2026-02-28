"use client";

import { motion } from "framer-motion";

interface Props {
  onGuess: (guess: "up" | "down") => void;
  disabled?: boolean;
}

export function GameControls({ onGuess, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.button
        onClick={() => onGuess("up")}
        disabled={disabled}
        className="relative overflow-hidden py-4 sm:py-5 rounded-xl font-black text-white text-base sm:text-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="text-xl">📈</span>
          올랐다
        </span>
      </motion.button>

      <motion.button
        onClick={() => onGuess("down")}
        disabled={disabled}
        className="relative overflow-hidden py-4 sm:py-5 rounded-xl font-black text-white text-base sm:text-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="text-xl">📉</span>
          내렸다
        </span>
      </motion.button>
    </div>
  );
}
