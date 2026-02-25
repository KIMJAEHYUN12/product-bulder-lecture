"use client";

import { motion } from "framer-motion";
import type { Grade } from "@/types";

const GRADE_CONFIG: Record<
  NonNullable<Grade>,
  { color: string; bg: string; label: string; desc: string }
> = {
  S: {
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400",
    label: "S급",
    desc: "신의 한수",
  },
  A: {
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-400",
    label: "A급",
    desc: "제법인데요",
  },
  B: {
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-400",
    label: "B급",
    desc: "평범합니다",
  },
  C: {
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-400",
    label: "C급",
    desc: "걱정됩니다",
  },
  D: {
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-400",
    label: "D급",
    desc: "심각합니다",
  },
  F: {
    color: "text-gray-800 dark:text-gray-200",
    bg: "bg-gray-100 dark:bg-gray-900 border-gray-600",
    label: "F급",
    desc: "손절하세요",
  },
};

interface Props {
  grade: Grade;
}

export function StockGradeCard({ grade }: Props) {
  if (!grade) return null;
  const cfg = GRADE_CONFIG[grade];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${cfg.bg}`}
    >
      <span className={`text-3xl font-black font-mono ${cfg.color}`}>
        {cfg.label}
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {cfg.desc}
      </span>
    </motion.div>
  );
}
