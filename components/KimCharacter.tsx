"use client";

import { motion } from "framer-motion";
import type { KimExpression } from "@/types";

const KIM_EXPRESSIONS: Record<KimExpression, { emoji: string; label: string }> = {
  neutral: { emoji: "😐", label: "무표정" },
  shocked: { emoji: "😱", label: "충격" },
  smug: { emoji: "😏", label: "비웃음" },
  angry: { emoji: "🤬", label: "분노" },
  pity: { emoji: "😔", label: "안쓰러움" },
};

const MCR_EXPRESSIONS: Record<KimExpression, { emoji: string; label: string }> = {
  neutral: { emoji: "🧊", label: "시황 체크 중" },
  shocked: { emoji: "📉", label: "빗각 붕괴" },
  smug: { emoji: "🎯", label: "빗각 돌파" },
  angry: { emoji: "🗑️", label: "헛지랄 확인" },
  pity: { emoji: "📐", label: "되돌림 대기" },
};

interface Props {
  expression: KimExpression;
  isLoading: boolean;
  mode?: "kim" | "makalong";
}

export function KimCharacter({ expression, isLoading, mode = "kim" }: Props) {
  const isMcr = mode === "makalong";
  const EXPRESSIONS = isMcr ? MCR_EXPRESSIONS : KIM_EXPRESSIONS;
  const { emoji, label } = EXPRESSIONS[expression];
  const name = isMcr ? "빗각 분석" : "오비젼";

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      key={`${mode}-${expression}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="text-5xl select-none"
        animate={isLoading ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
        transition={isLoading ? { repeat: Infinity, duration: 0.8 } : {}}
      >
        {emoji}
      </motion.div>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
        {name} · {label}
      </span>
    </motion.div>
  );
}
