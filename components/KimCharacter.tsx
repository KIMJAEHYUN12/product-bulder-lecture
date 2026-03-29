"use client";

import { type ComponentType } from "react";
import { motion } from "framer-motion";
import type { KimExpression } from "@/types";
import {
  KimNeutral, KimShocked, KimSmug, KimAngry, KimPity,
  McrNeutral, McrShocked, McrSmug, McrAngry, McrPity,
} from "./ExpressionIcons";

type ExpressionEntry = { Icon: ComponentType<{ size?: number; className?: string }>; label: string };

const KIM_EXPRESSIONS: Record<KimExpression, ExpressionEntry> = {
  neutral: { Icon: KimNeutral, label: "무표정" },
  shocked: { Icon: KimShocked, label: "충격" },
  smug: { Icon: KimSmug, label: "비웃음" },
  angry: { Icon: KimAngry, label: "분노" },
  pity: { Icon: KimPity, label: "안쓰러움" },
};

const MCR_EXPRESSIONS: Record<KimExpression, ExpressionEntry> = {
  neutral: { Icon: McrNeutral, label: "시황 체크 중" },
  shocked: { Icon: McrShocked, label: "빗각 붕괴" },
  smug: { Icon: McrSmug, label: "빗각 돌파" },
  angry: { Icon: McrAngry, label: "헛지랄 확인" },
  pity: { Icon: McrPity, label: "되돌림 대기" },
};

interface Props {
  expression: KimExpression;
  isLoading: boolean;
  mode?: "kim" | "makalong";
}

export function KimCharacter({ expression, isLoading, mode = "kim" }: Props) {
  const isMcr = mode === "makalong";
  const EXPRESSIONS = isMcr ? MCR_EXPRESSIONS : KIM_EXPRESSIONS;
  const { Icon, label } = EXPRESSIONS[expression];
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
        className={`select-none ${isMcr ? "text-blue-400" : "text-kim-red"}`}
        animate={isLoading ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
        transition={isLoading ? { repeat: Infinity, duration: 0.8 } : {}}
      >
        <Icon size={48} />
      </motion.div>
      <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
        {name} · {label}
      </span>
    </motion.div>
  );
}
