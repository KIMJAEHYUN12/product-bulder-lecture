"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, ShieldAlert, BarChart2, Layers, Target } from "lucide-react";
import type { PortfolioScores, Sector } from "@/types";

const SCORE_META: {
  key: keyof PortfolioScores;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}[] = [
  { key: "diversification", label: "분산도", shortLabel: "분산", icon: Layers },
  { key: "returns", label: "수익률", shortLabel: "수익", icon: TrendingUp },
  { key: "stability", label: "안정성", shortLabel: "안정", icon: ShieldAlert },
  { key: "momentum", label: "모멘텀", shortLabel: "모멘텀", icon: Target },
  { key: "risk_management", label: "리스크 관리", shortLabel: "리스크", icon: BarChart2 },
];

const SECTOR_META: Record<
  string,
  { emoji: string; badge: string; label: string }
> = {
  이차전지: {
    emoji: "⚡",
    badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    label: "이차전지",
  },
  반도체: {
    emoji: "💾",
    badge: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    label: "반도체",
  },
  전력: {
    emoji: "🔌",
    badge: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    label: "전력/에너지",
  },
  AI: {
    emoji: "🧠",
    badge: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    label: "AI/IT",
  },
  바이오: {
    emoji: "🧬",
    badge: "text-green-400 bg-green-400/10 border-green-400/30",
    label: "바이오",
  },
  자동차: {
    emoji: "⚙️",
    badge: "text-gray-300 bg-gray-300/10 border-gray-300/30",
    label: "자동차",
  },
  혼합: {
    emoji: "📊",
    badge: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30",
    label: "혼합 포트폴리오",
  },
  기타: {
    emoji: "📊",
    badge: "text-gray-400 bg-gray-400/10 border-gray-400/30",
    label: "기타",
  },
};

function scoreBarColor(v: number) {
  if (v >= 70) return "bg-green-500";
  if (v >= 45) return "bg-yellow-500";
  return "bg-red-500";
}
function scoreTextColor(v: number) {
  if (v >= 70) return "text-green-400";
  if (v >= 45) return "text-yellow-400";
  return "text-red-400";
}

interface Props {
  analysis: string | null;
  scores: PortfolioScores | null;
  sector: Sector | null;
}

export function AnalysisReport({ analysis, scores, sector }: Props) {
  const radarData = scores
    ? SCORE_META.map(({ shortLabel, key }) => ({
        subject: shortLabel,
        value: scores[key],
        fullMark: 100,
      }))
    : [];

  const sectorMeta = sector ? (SECTOR_META[sector] ?? SECTOR_META["기타"]) : null;

  return (
    <AnimatePresence>
      {(analysis || scores) && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative glass-card overflow-hidden"
        >
          {/* Sector watermark */}
          {sectorMeta && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span
                className="text-[10rem] leading-none opacity-[0.04]"
                aria-hidden="true"
              >
                {sectorMeta.emoji}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="relative px-5 py-4 border-b border-white/8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-400" />
                <h3 className="font-bold text-white text-sm tracking-wide">
                  AI 전문 재무 리포트
                </h3>
              </div>
              {sectorMeta && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sectorMeta.badge}`}
                >
                  {sectorMeta.emoji} {sectorMeta.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              오비젼 · 현장직 베테랑 분석
            </p>
          </div>

          {/* Radar chart */}
          {scores && (
            <div className="relative px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                포트폴리오 건강 지표
              </p>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart
                  data={radarData}
                  margin={{ top: 8, right: 20, bottom: 8, left: 20 }}
                >
                  <PolarGrid stroke="#ffffff" strokeOpacity={0.06} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val ?? 0}점`, "점수"]}
                    contentStyle={{
                      background: "rgba(15,15,25,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f9fafb",
                      backdropFilter: "blur(8px)",
                    }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Score bars */}
              <div className="space-y-2 mt-1">
                {SCORE_META.map(({ key, label, icon: Icon }) => {
                  const v = scores[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon size={12} className="text-gray-600 shrink-0" />
                      <span className="text-xs text-gray-500 w-16 shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-white/5">
                        <motion.div
                          className={`h-full rounded-full ${scoreBarColor(v)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${v}%` }}
                          transition={{
                            duration: 0.9,
                            ease: "easeOut",
                            delay: 0.2,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold w-7 text-right font-mono ${scoreTextColor(v)}`}
                      >
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          {scores && analysis && (
            <div className="mx-5 border-t border-dashed border-white/10 my-3" />
          )}

          {/* Analysis text */}
          {analysis && (
            <div className="relative px-5 pb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                전문가 소견
              </p>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
                {analysis}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
