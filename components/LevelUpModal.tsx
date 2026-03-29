"use client";

import { motion } from "framer-motion";
import { getLevelTitle } from "@/lib/rpgConstants";

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const title = getLevelTitle(level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="bg-gray-900 border border-indigo-500/40 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl shadow-indigo-900/40 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
          className="text-5xl mb-3"
        >
          ⚔️
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-xs text-indigo-400 font-mono font-bold tracking-widest mb-1">
            LEVEL UP
          </p>
          <p className="text-3xl font-black text-white mb-1">Lv.{level}</p>
          <p className="text-sm text-gray-400 font-mono">{title}</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
        >
          확인
        </motion.button>
      </motion.div>
    </div>
  );
}
