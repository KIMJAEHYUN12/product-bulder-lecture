"use client";

import { motion } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";

const LOADING_KIM = [
  "포트폴리오 분석 중...",
  "뼈 때릴 준비 중...",
  "독설 충전 중...",
  "팩폭 조준 중...",
];

const LOADING_MCR = [
  "차트 스캔 중...",
  "빗각 작도 중...",
  "채널 분석 중...",
  "타점 계산 중...",
];

interface Props {
  disabled: boolean;
  isLoading: boolean;
  hasResult: boolean;
  onClick: () => void;
  mode?: "kim" | "makalong";
}

export function RoastButton({ disabled, isLoading, hasResult, onClick, mode = "kim" }: Props) {
  const isMcr = mode === "makalong";
  const msgs = isMcr ? LOADING_MCR : LOADING_KIM;
  const label = isLoading
    ? msgs[Math.floor(Date.now() / 1000) % msgs.length]
    : hasResult
    ? (isMcr ? "다시 분석" : "다시 팩폭")
    : (isMcr ? "📐 빗각 분석 시작" : "팩폭 시작");

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
        transition-colors
        ${disabled || isLoading
          ? "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          : isMcr
            ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
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
