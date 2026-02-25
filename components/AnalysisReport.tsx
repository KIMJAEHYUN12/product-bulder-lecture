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
import type { PortfolioScores } from "@/types";

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

function scoreColor(v: number) {
  if (v >= 70) return "text-green-500";
  if (v >= 45) return "text-yellow-500";
  return "text-red-500";
}

function scoreBarColor(v: number) {
  if (v >= 70) return "bg-green-500";
  if (v >= 45) return "bg-yellow-500";
  return "bg-red-500";
}

interface Props {
  analysis: string | null;
  scores: PortfolioScores | null;
}

export function AnalysisReport({ analysis, scores }: Props) {
  const radarData = scores
    ? SCORE_META.map(({ shortLabel, key }) => ({
        subject: shortLabel,
        value: scores[key],
        fullMark: 100,
      }))
    : [];

  return (
    <AnimatePresence>
      {(analysis || scores) && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-xl border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900 overflow-hidden shadow-xl flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">
                AI 전문 재무 리포트
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              독설가 킴 · 현장 전문가 분석
            </p>
          </div>

          {/* Radar chart */}
          {scores && (
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                포트폴리오 건강 지표
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#374151" strokeOpacity={0.3} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val ?? 0}점`, "점수"]}
                    contentStyle={{
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f9fafb",
                    }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Score bars */}
              <div className="space-y-2 mt-2">
                {SCORE_META.map(({ key, label, icon: Icon }) => {
                  const v = scores[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon size={13} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <motion.div
                          className={`h-full rounded-full ${scoreBarColor(v)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${v}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-8 text-right ${scoreColor(v)}`}>
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
            <div className="mx-5 border-t border-dashed border-gray-200 dark:border-gray-700 my-3" />
          )}

          {/* Analysis text */}
          {analysis && (
            <div className="px-5 pb-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                전문가 소견
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
