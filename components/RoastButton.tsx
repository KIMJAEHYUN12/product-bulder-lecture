"use client";

import { motion } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
  "포트폴리오 분석 중...",
  "뼈 때릴 준비 중...",
  "독설 충전 중...",
  "팩폭 조준 중...",
];

interface Props {
  disabled: boolean;
  isLoading: boolean;
  hasResult: boolean;
  onClick: () => void;
}

export function RoastButton({ disabled, isLoading, hasResult, onClick }: Props) {
  const label = isLoading
    ? LOADING_MESSAGES[Math.floor(Date.now() / 1000) % LOADING_MESSAGES.length]
    : hasResult
    ? "다시 팩폭"
    : "팩폭 시작";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
        transition-colors
        ${disabled || isLoading
          ? "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          : "bg-kim-red hover:bg-red-700 text-white shadow-lg shadow-red-500/30"
        }`}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : undefined}
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Zap size={20} />
      )}
      {label}
    </motion.button>
  );
}
