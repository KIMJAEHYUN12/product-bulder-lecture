"use client";

import { motion } from "framer-motion";

interface StreakBadgeProps {
  currentStreak: number;
  maxStreak: number;
}

export function StreakBadge({ currentStreak, maxStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 shrink-0"
      title={`최대 연속: ${maxStreak}일`}
    >
      <span className="text-orange-500 text-xs leading-none">🔥</span>
      <span className="text-[10px] font-bold text-orange-500 font-mono leading-none">
        {currentStreak}
      </span>
    </motion.div>
  );
}
