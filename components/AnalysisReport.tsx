"use client";

import { ReactNode } from "react";
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
import { useTheme } from "next-themes";
import type { PortfolioScores, Sector } from "@/types";

/* ── 텍스트 포맷팅 헬퍼 ── */

const NUM_RE = /[+-]?\d[\d,.~]*%|\([+-]?\d[\d,.]*[만억천원$/\w]*\)|\$\d[\d,.]*[/\w]*|[+-]\d[\d,.]*[만억천원]+/g;

function highlightNumbers(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    const neg = s.startsWith("-") || s.startsWith("(-");
    const pos = s.startsWith("+") || s.startsWith("(+");
    const cls = neg
      ? "text-red-500 dark:text-red-400 font-bold"
      : pos
        ? "text-emerald-600 dark:text-emerald-400 font-bold"
        : "font-bold text-gray-900 dark:text-white";
    parts.push(<span key={k++} className={cls}>{s}</span>);
    last = m.index + s.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function splitParagraphs(text: string): string[] {
  if (text.includes("\n")) return text.split(/\n+/).filter((s) => s.trim());
  if (text.length < 80) return [text];
  const safe = text.replace(/\.\.\./g, "\u2026");
  const sentences = safe.split(/(?<=[.?!])\s+/).map((s) => s.replace(/\u2026/g, "..."));
  if (sentences.length <= 2) return [text];
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const g = sentences.slice(i, Math.min(i + 2, sentences.length)).join(" ");
    if (g.trim()) result.push(g.trim());
  }
  return result;
}

type ScoreMeta = {
  key: keyof PortfolioScores;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
};

const SCORE_META_KIM: ScoreMeta[] = [
  { key: "diversification", label: "분산도", shortLabel: "분산", icon: Layers },
  { key: "returns", label: "수익률", shortLabel: "수익", icon: TrendingUp },
  { key: "stability", label: "안정성", shortLabel: "안정", icon: ShieldAlert },
  { key: "momentum", label: "모멘텀", shortLabel: "모멘텀", icon: Target },
  { key: "risk_management", label: "리스크 관리", shortLabel: "리스크", icon: BarChart2 },
];

const SCORE_META_MCR: ScoreMeta[] = [
  { key: "diversification", label: "채널 신뢰도", shortLabel: "채널", icon: Layers },
  { key: "returns", label: "추세 강도", shortLabel: "추세", icon: TrendingUp },
  { key: "stability", label: "패턴 안정성", shortLabel: "패턴", icon: ShieldAlert },
  { key: "momentum", label: "모멘텀", shortLabel: "모멘텀", icon: Target },
  { key: "risk_management", label: "리스크 관리", shortLabel: "리스크", icon: BarChart2 },
];

const SECTOR_META: Record<
  string,
  { emoji: string; badge: string; label: string }
> = {
  이차전지: {
    emoji: "⚡",
    badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30 ring-1 ring-yellow-400/20",
    label: "이차전지",
  },
  반도체: {
    emoji: "💾",
    badge: "text-blue-400 bg-blue-400/10 border-blue-400/30 ring-1 ring-blue-400/20",
    label: "반도체",
  },
  전력: {
    emoji: "🔌",
    badge: "text-orange-400 bg-orange-400/10 border-orange-400/30 ring-1 ring-orange-400/20",
    label: "전력/에너지",
  },
  AI: {
    emoji: "🧠",
    badge: "text-purple-400 bg-purple-400/10 border-purple-400/30 ring-1 ring-purple-400/20",
    label: "AI/IT",
  },
  바이오: {
    emoji: "🧬",
    badge: "text-green-400 bg-green-400/10 border-green-400/30 ring-1 ring-green-400/20",
    label: "바이오",
  },
  자동차: {
    emoji: "⚙️",
    badge: "text-gray-300 bg-gray-300/10 border-gray-300/30 ring-1 ring-gray-300/20",
    label: "자동차",
  },
  혼합: {
    emoji: "📊",
    badge: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30 ring-1 ring-indigo-400/20",
    label: "혼합 포트폴리오",
  },
  기타: {
    emoji: "📊",
    badge: "text-gray-400 bg-gray-400/10 border-gray-400/30 ring-1 ring-gray-400/20",
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
  mode?: "kim" | "makalong";
  roast?: string | null;
}

export function AnalysisReport({ analysis, scores, sector, mode = "kim", roast }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const isMcr = mode === "makalong";
  const SCORE_META = isMcr ? SCORE_META_MCR : SCORE_META_KIM;
  const safeScore = (v: unknown): number => {
    if (typeof v === "number" && !isNaN(v)) return v;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const radarData = scores
    ? SCORE_META.map(({ shortLabel, key }) => ({
        subject: shortLabel,
        value: safeScore(scores[key]),
        fullMark: 100,
      }))
    : [];

  const sectorMeta = sector ? (SECTOR_META[sector] ?? SECTOR_META["기타"]) : null;

  const isMcrMode = isMcr;
  const displayText = analysis || (isMcrMode ? roast : null);

  return (
    <AnimatePresence>
      {(displayText || scores) && (
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
          <div className="relative px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-400" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">
                  {isMcr ? "오비젼 빗각 분석 리포트" : "AI 전문 재무 리포트"}
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
              {isMcr ? "오비젼 빗각 분석 엔진" : "오비젼 · 현장직 베테랑 분석"}
            </p>
          </div>

          {/* Radar chart */}
          {scores && (
            <div className="relative px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                {isMcr ? "빗각 기술 지표" : "포트폴리오 건강 지표"}
              </p>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart
                  data={radarData}
                  margin={{ top: 8, right: 20, bottom: 8, left: 20 }}
                >
                  <PolarGrid stroke={isDark ? "#ffffff" : "#000000"} strokeOpacity={0.06} />
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
                    stroke={isMcr ? "#3b82f6" : "#818cf8"}
                    fill={isMcr ? "#3b82f6" : "#818cf8"}
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Score bars */}
              <div className="space-y-2 mt-1">
                {SCORE_META.map(({ key, label, icon: Icon }) => {
                  const v = safeScore(scores[key]);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon size={12} className="text-gray-600 shrink-0" />
                      <span className="text-xs text-gray-500 w-16 shrink-0">
                        {label}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-white/5">
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
          {scores && displayText && (
            <div className="mx-5 border-t border-dashed border-gray-200 dark:border-white/10 my-3" />
          )}

          {/* Analysis text */}
          {displayText && (
            <div className="relative px-5 pb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                {isMcr ? "빗각 상세 분석" : "전문가 소견"}
              </p>
              <div className="space-y-2.5">
                {splitParagraphs(displayText).map((p, i) => (
                  <p key={i} className="text-[13px] text-gray-700 dark:text-zinc-300 leading-[1.9]">
                    {highlightNumbers(p)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
