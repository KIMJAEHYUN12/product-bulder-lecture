"use client";

import type { BotType } from "@/types";

const BOT_COLORS: Record<BotType, string> = {
  signal: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  golden: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ant: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

const BOT_LABELS: Record<BotType, string> = {
  signal: "BOT",
  golden: "BOT",
  ant: "BOT",
};

interface BotBadgeProps {
  botType: BotType;
  className?: string;
}

export function BotBadge({ botType, className = "" }: BotBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${BOT_COLORS[botType]} ${className}`}
    >
      {BOT_LABELS[botType]}
    </span>
  );
}
