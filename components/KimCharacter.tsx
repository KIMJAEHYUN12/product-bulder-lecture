"use client";

import { motion } from "framer-motion";
import type { KimExpression } from "@/types";

const EXPRESSIONS: Record<KimExpression, { emoji: string; label: string }> = {
  neutral: { emoji: "😐", label: "무표정" },
  shocked: { emoji: "😱", label: "충격" },
  smug: { emoji: "😏", label: "비웃음" },
  angry: { emoji: "🤬", label: "분노" },
  pity: { emoji: "😔", label: "안쓰러움" },
};

interface Props {
  expression: KimExpression;
  isLoading: boolean;
}

export function KimCharacter({ expression, isLoading }: Props) {
  const { emoji, label } = EXPRESSIONS[expression];

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      key={expression}
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
        오비젼 · {label}
      </span>
    </motion.div>
  );
}
