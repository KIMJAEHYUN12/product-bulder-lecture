"use client";

import { motion } from "framer-motion";
import { STAT_LABELS } from "@/lib/rpgConstants";
import type { RpgStats } from "@/types";

interface Props {
  baseStats: RpgStats;
  totalStats: RpgStats;
}

const MAX_STAT = 30;
const STAT_KEYS: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];

export default function StatsPanel({ baseStats, totalStats }: Props) {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <h3 className="text-sm font-black text-white mb-3">능력치</h3>
      <div className="flex flex-col gap-2.5">
        {STAT_KEYS.map((key, i) => {
          const { label, color, bg } = STAT_LABELS[key];
          const base = baseStats[key];
          const total = totalStats[key];
          const bonus = total - base;
          const pct = Math.min((total / MAX_STAT) * 100, 100);

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-bold ${color}`}>{label}</span>
                <span className="text-xs font-mono text-gray-300">
                  {total}
                  {bonus > 0 && <span className="text-green-400 ml-1">(+{bonus})</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${bg}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
