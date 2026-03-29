"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchDailyBriefing, type DailyBriefingData } from "@/lib/dailyBriefingApi";
import { Skeleton } from "@/components/Skeleton";

const SENTIMENT_ICON: Record<DailyBriefingData["sentiment"], string> = {
  positive: "▲",
  neutral: "●",
  negative: "▼",
};

const SENTIMENT_COLOR: Record<DailyBriefingData["sentiment"], string> = {
  positive: "text-emerald-500",
  neutral: "text-yellow-500",
  negative: "text-red-500",
};

export function DailyBriefing() {
  const [data, setData] = useState<DailyBriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyBriefing()
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-5 mb-4">
        <Skeleton variant="bar" className="h-4 w-40 mb-3" />
        <Skeleton variant="bar" className="h-3 w-full mb-2" />
        <Skeleton variant="bar" className="h-3 w-3/4 mb-3" />
        <div className="flex gap-2">
          <Skeleton variant="bar" className="h-6 w-24" />
          <Skeleton variant="bar" className="h-6 w-24" />
          <Skeleton variant="bar" className="h-6 w-24" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cachedTime = new Date(data.cachedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${SENTIMENT_COLOR[data.sentiment]}`}>
            {SENTIMENT_ICON[data.sentiment]}
          </span>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            오늘의 마켓 브리핑
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">{cachedTime} 기준</span>
      </div>

      <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 leading-relaxed mb-3">
        {data.briefing}
      </p>

      {data.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.highlights.map((h, i) => (
            <span
              key={i}
              className="inline-block px-2 py-0.5 text-[10px] font-mono rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-400"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
