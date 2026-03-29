"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchDailyDiscovery, type DailyDiscoveryData } from "@/lib/dailyDiscoveryApi";

const CATEGORY_COLORS: Record<string, string> = {
  "외국인 동향": "bg-blue-500/15 text-blue-500",
  "역사 속 오늘": "bg-purple-500/15 text-purple-500",
  "시장 이상 신호": "bg-red-500/15 text-red-500",
  "계절성 패턴": "bg-emerald-500/15 text-emerald-500",
  "숫자로 보는 시장": "bg-amber-500/15 text-amber-500",
};

export function DailyDiscovery() {
  const [data, setData] = useState<DailyDiscoveryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyDiscovery()
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-3">
        <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-1" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const colorClass = CATEGORY_COLORS[data.category] || "bg-amber-500/15 text-amber-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-amber-500 text-sm">💡</span>
        <h3 className="text-xs font-bold text-gray-900 dark:text-white">오늘의 발견</h3>
        <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full ${colorClass}`}>
          {data.category}
        </span>
      </div>
      <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
        {data.fact}
      </p>
      {data.source && (
        <p className="text-[10px] text-gray-400 mt-1.5 font-mono truncate">
          {data.source}
        </p>
      )}
    </motion.div>
  );
}
