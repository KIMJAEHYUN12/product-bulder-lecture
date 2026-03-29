# Ovision 프로젝트 컨텍스트 (2/2): Components

이 문서는 `/components/` 하위 모든 컴포넌트 소스 코드를 담고 있습니다.

---

## Top-level Components

### components/AdSlot.tsx

```tsx
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

interface AdSlotProps {
  className?: string;
}

export function AdSlot({ className = "" }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  return (
    <div className={`w-full flex justify-center my-4 ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8523090652113599"
        data-ad-slot=""
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

```

### components/AnalysisHistory.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { StaggerContainer } from "@/components/StaggerContainer";
import type { AnalysisHistoryItem } from "@/types";

const STORAGE_KEY = "ovision_bitgak_history";
const MAX_ITEMS = 4;

function loadHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: AnalysisHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // storage full
  }
}

export function addToHistory(item: AnalysisHistoryItem) {
  const prev = loadHistory().filter((h) => !(h.symbol === item.symbol && h.date === item.date));
  saveHistory([item, ...prev]);
}

interface Props {
  onSelect: (stock: { symbol: string; name: string }) => void;
}

export function AnalysisHistory({ onSelect }: Props) {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());

    const handler = () => setHistory(loadHistory());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const refresh = useCallback(() => setHistory(loadHistory()), []);

  // 외부에서 addToHistory 호출 후 새로고침할 수 있도록
  useEffect(() => {
    const id = window.setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">분석 히스토리</h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-gray-400 hover:text-red-400 font-mono transition-colors"
          >
            전체 삭제
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-gray-400 font-mono py-2">분석 기록이 없습니다</p>
      ) : (
        <StaggerContainer className="space-y-1">
          {history.map((h, i) => (
            <button
              key={`${h.symbol}-${h.date}-${i}`}
              onClick={() => onSelect({ symbol: h.symbol, name: h.name })}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate max-w-[100px]">
                    {h.name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ring-1 ${
                    h.channelDir === "상승" ? "bg-red-500/10 text-red-500 ring-red-500/20"
                    : h.channelDir === "하락" ? "bg-blue-500/10 text-blue-500 ring-blue-500/20"
                    : "bg-gray-500/10 text-gray-400 ring-gray-500/20"
                  }`}>
                    {h.channelDir}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{h.date}</span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold ${
                  h.rsi >= 70 ? "text-red-500" : h.rsi <= 30 ? "text-blue-500" : "text-gray-400"
                }`}>
                  RSI {h.rsi}
                </span>
              </div>
            </button>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

```

### components/AnalysisLoading.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisMode } from "@/types";

const STAGES: Record<AnalysisMode, string[]> = {
  kim: [
    "이미지 스캔 중",
    "포트폴리오 파악 중",
    "6대 섹터 대조 중",
    "팩폭 탄 장전 중",
    "독설 다듬는 중",
    "팩폭 발사 직전",
  ],
  makalong: [
    "차트 이미지 스캔 중",
    "고점·저점 포인트 탐색 중",
    "빗각 채널 작도 중",
    "중앙 라인·패턴 분석 중",
    "S/R Flip·눌림목 판별 중",
    "빗각 분석 결론 정리 직전",
  ],
};

const STAGE_INTERVAL = 1800; // ms

interface Props {
  isLoading: boolean;
  mode?: AnalysisMode;
}

export function AnalysisLoading({ isLoading, mode = "kim" }: Props) {
  const stages = STAGES[mode];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [doneIdx, setDoneIdx] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setCurrentIdx(0);
      setDoneIdx([]);
      return;
    }

    setCurrentIdx(0);
    setDoneIdx([]);

    const interval = setInterval(() => {
      setCurrentIdx((prev) => {
        const next = prev + 1;
        setDoneIdx((d) => [...d, prev]);
        if (next >= stages.length) {
          clearInterval(interval);
          return prev; // 마지막 단계에서 멈춤
        }
        return next;
      });
    }, STAGE_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoading, mode, stages.length]);

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 overflow-hidden"
      >
        {/* 터미널 헤더 */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-black/40 border-b border-gray-200 dark:border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-2 text-xs text-gray-500 dark:text-zinc-400 font-mono">
            {mode === "kim" ? "ovision_analysis.sh" : "mcr_strategy.sh"}
          </span>
        </div>

        {/* 터미널 바디 */}
        <div className="px-4 py-3 font-mono text-xs space-y-1.5 min-h-[120px]">
          {stages.map((stage, i) => {
            const isDone = doneIdx.includes(i);
            const isCurrent = i === currentIdx;
            const isPending = i > currentIdx;

            if (isPending) return null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className={`shrink-0 ${isDone ? "text-emerald-500" : "text-kim-red"}`}>
                  {isDone ? "✓" : ">"}
                </span>
                <span
                  className={
                    isDone
                      ? "text-gray-400 dark:text-zinc-500"
                      : "text-gray-900 dark:text-gray-100"
                  }
                >
                  {stage}
                </span>
                {isCurrent && (
                  <span className="inline-block w-1.5 h-3.5 bg-kim-red animate-type-cursor ml-0.5" />
                )}
                {isDone && (
                  <span className="text-emerald-500 ml-auto text-[10px]">완료</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* 진행 바 */}
        <div className="px-4 pb-3">
          <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-kim-red rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: `${Math.min(((currentIdx + 1) / stages.length) * 100, 95)}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400 font-mono">AI 분석 중...</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {Math.min(Math.round(((currentIdx + 1) / stages.length) * 95), 95)}%
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

```

### components/AnalysisReport.tsx

```tsx
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

```

### components/AnimatedNumber.tsx

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useSpring, useTransform, motion, useMotionValue } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({
  value,
  format = (n) => n.toFixed(2),
  duration = 0.8,
  className = "",
  style,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { duration: duration * 1000 });
  const display = useTransform(spring, (v) => format(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref} className={className} style={style}>{format(value)}</span>;
}

```

### components/AttendanceCalendar.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAttendance, CYCLE_REWARDS } from "@/hooks/useAttendance";
import { grantExpDynamic } from "@/lib/rpgExp";

export function AttendanceCalendar() {
  const { data, checkIn, isMilestone } = useAttendance();
  const [rewardPopup, setRewardPopup] = useState<string | null>(null);
  const [milestoneShow, setMilestoneShow] = useState(false);

  // 마일스톤 표시
  useEffect(() => {
    if (isMilestone && data.checkedToday) {
      setMilestoneShow(true);
      const t = setTimeout(() => setMilestoneShow(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isMilestone, data.checkedToday]);

  function handleCheckIn() {
    const reward = checkIn();
    if (!reward) return;

    // 기본 출석 EXP(30)는 daily_login으로 이미 지급됨
    // 30 초과분만 attendance_bonus로 추가 지급
    const extraExp = reward.exp - 30;
    if (extraExp > 0) {
      grantExpDynamic(
        "attendance_bonus",
        extraExp,
        `출석 ${reward.day}일차 보너스`
      );
    }

    setRewardPopup(reward.label);
    setTimeout(() => setRewardPopup(null), 3000);
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            출석 체크
          </h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {data.totalDays}일 누적 출석
          </p>
        </div>
        {!data.checkedToday && (
          <button
            onClick={handleCheckIn}
            className="px-3 py-1.5 rounded-lg bg-kim-red text-white text-xs font-bold hover:bg-red-600 transition-colors"
          >
            출석하기
          </button>
        )}
        {data.checkedToday && (
          <span className="text-[10px] text-green-600 dark:text-green-400 font-mono font-bold">
            출석 완료
          </span>
        )}
      </div>

      {/* 7일 사이클 */}
      <div className="grid grid-cols-7 gap-1.5">
        {CYCLE_REWARDS.map((reward) => {
          const isCompleted = data.currentDay >= reward.day && data.checkedToday;
          const isPast =
            reward.day < data.currentDay ||
            (reward.day === data.currentDay && data.checkedToday);
          const isCurrent =
            reward.day === data.currentDay + 1 && !data.checkedToday;
          const isCurrentDone =
            reward.day === data.currentDay && data.checkedToday;

          return (
            <div
              key={reward.day}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-center transition-colors ${
                isCurrentDone
                  ? "border-green-500/50 bg-green-500/10"
                  : isCurrent
                  ? "border-kim-red/50 bg-kim-red/10"
                  : isPast
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <span className="text-[10px] font-mono text-gray-500">
                {reward.day}일
              </span>
              <div className="text-sm">
                {isPast || isCompleted ? (
                  <span className="text-green-500">&#10003;</span>
                ) : reward.stones ? (
                  <span>&#128142;</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-600">
                    &#9675;
                  </span>
                )}
              </div>
              <span className="text-[8px] font-mono text-gray-400 dark:text-gray-600 leading-tight">
                {reward.exp}
              </span>
            </div>
          );
        })}
      </div>

      {/* 보상 팝업 */}
      <AnimatePresence>
        {rewardPopup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 text-center text-xs font-mono text-kim-red font-bold bg-kim-red/10 rounded-lg py-2"
          >
            {rewardPopup}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 28일 마일스톤 */}
      <AnimatePresence>
        {milestoneShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mt-2 text-center text-xs font-mono text-amber-500 font-bold bg-amber-500/10 border border-amber-500/30 rounded-lg py-2"
          >
            28일 출석 마일스톤 달성!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/BitgakChart.tsx

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { searchStocks } from "@/lib/stockSearchApi";
import { fetchStockChart } from "@/lib/stockChartApi";
import { analyzeBitgak, computeMAArray } from "@/lib/bitgakEngine";
import type {
  Candle,
  BitgakResult,
  BitgakMeta,
  BitgakLine,
  BitgakViewMode,
  ChartRange,
  ChartInterval,
  StockChartResponse,
  TechIndicators,
} from "@/types";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1개월" },
  { value: "3mo", label: "3개월" },
  { value: "6mo", label: "6개월" },
  { value: "1y", label: "1년" },
  { value: "2y", label: "2년" },
  { value: "5y", label: "5년" },
];

const INTERVAL_OPTIONS: { value: ChartInterval; label: string }[] = [
  { value: "1d", label: "일봉" },
  { value: "1wk", label: "주봉" },
  { value: "1mo", label: "월봉" },
];

// 장기 범위 선택 시 자동 봉 전환 매핑
const AUTO_INTERVAL: Partial<Record<ChartRange, ChartInterval>> = {
  "2y": "1wk",
  "5y": "1mo",
};

// 기간별 유효한 봉 단위 매핑 (물리적으로 분석 불가능한 조합 차단)
const VALID_INTERVALS: Record<ChartRange, ChartInterval[]> = {
  "1mo": ["1d"],
  "3mo": ["1d", "1wk"],
  "6mo": ["1d", "1wk"],
  "1y": ["1d", "1wk", "1mo"],
  "2y": ["1d", "1wk", "1mo"],
  "5y": ["1d", "1wk", "1mo"],
};

function applyOpacity(hex: string, opacity: number): string {
  if (opacity >= 1) return hex;
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const MA_CONFIGS = [
  { period: 5, color: "#fbbf24", label: "MA5" },
  { period: 20, color: "#f97316", label: "MA20" },
  { period: 60, color: "#a855f7", label: "MA60" },
] as const;

interface Props {
  onAnalysisReady?: (summary: string, stockName: string, indicators?: TechIndicators, meta?: BitgakMeta) => void;
  externalSymbol?: { symbol: string; name: string } | null;
  onExternalClear?: () => void;
}

export function BitgakChart({ onAnalysisReady, externalSymbol, onExternalClear }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [range, setRange] = useState<ChartRange>("6mo");
  const [interval, setInterval] = useState<ChartInterval>("1d");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<StockChartResponse | null>(null);
  const [bitgakResult, setBitgakResult] = useState<BitgakResult | null>(null);
  const [showMA, setShowMA] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [viewMode, setViewMode] = useState<BitgakViewMode>("auto");
  const [containerWidth, setContainerWidth] = useState(600);

  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 종목 전달 시 (한글 심볼이면 검색 API로 실제 심볼 조회)
  useEffect(() => {
    if (externalSymbol && externalSymbol.symbol !== selected?.symbol) {
      const isKoreanSymbol = /[가-힣]/.test(externalSymbol.symbol);
      if (isKoreanSymbol) {
        searchStocks(externalSymbol.name).then((results) => {
          if (results.length > 0) {
            setSelected({ symbol: results[0].symbol, name: results[0].name });
            setQuery(results[0].name);
          }
        }).catch(() => {});
        setQuery(externalSymbol.name);
        return;
      }
      setSelected(externalSymbol);
      setQuery(externalSymbol.name);
      setError(null);
    }
  }, [externalSymbol, selected?.symbol]);

  // 컨테이너 너비 감지
  useEffect(() => {
    const container = chartContainerRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (selected || !query.trim() || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        setSuggestions(results.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected]);

  const selectStock = useCallback((stock: { symbol: string; name: string }) => {
    setSelected(stock);
    setQuery(stock.name);
    setError(null);
  }, []);

  const handleRangeChange = useCallback((newRange: ChartRange) => {
    setRange(newRange);
    const autoInterval = AUTO_INTERVAL[newRange];
    if (autoInterval) {
      setInterval(autoInterval);
    } else {
      // 현재 봉이 새 범위에서 유효하지 않으면 첫 번째 유효 봉으로 전환
      const valid = VALID_INTERVALS[newRange];
      setInterval((prev) => valid.includes(prev) ? prev : valid[0]);
    }
  }, []);

  const resetStock = useCallback(() => {
    setQuery("");
    setSelected(null);
    setChartData(null);
    setBitgakResult(null);
    setError(null);
    onExternalClear?.();
  }, [onExternalClear]);

  // 차트 데이터 로드
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchStockChart(selected.symbol, range, interval)
      .then((data) => {
        if (cancelled) return;
        setChartData(data);
        const result = analyzeBitgak(data.candles, interval, logScale, viewMode);
        setBitgakResult(result);
        onAnalysisReady?.(result.summary, selected.name, result.indicators, result.meta);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "차트 조회 실패");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, range, interval, onAnalysisReady]);

  // logScale / viewMode 변경 시 빗각 재계산 (API 재호출 없이)
  useEffect(() => {
    if (!chartData || !selected) return;
    const result = analyzeBitgak(chartData.candles, interval, logScale, viewMode);
    setBitgakResult(result);
    onAnalysisReady?.(result.summary, selected.name, result.indicators, result.meta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logScale, viewMode]);

  const chartHeight = Math.min(containerWidth * 0.55, 400);

  // lightweight-charts 렌더링
  useEffect(() => {
    if (!chartData || !chartContainerRef.current) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers, PriceScaleMode } = await import("lightweight-charts");

      const container = chartContainerRef.current;
      if (!container) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        layout: {
          background: { color: "#0a0a0a" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
          horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
        },
        rightPriceScale: {
          mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
          autoScale: true,
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: false,
        },
      });

      chartRef.current = chart;

      const toDateStr = (ts: number) => {
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      // 캔들스틱 시리즈
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });

      const candleData = chartData.candles.map((c: Candle) => ({
        time: toDateStr(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(candleData);

      // 거래량 히스토그램
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      const volumeData = chartData.candles.map((c: Candle) => ({
        time: toDateStr(c.time),
        value: c.volume,
        color: c.close >= c.open ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)",
      }));
      volumeSeries.setData(volumeData);

      // 이동평균선
      if (showMA) {
        const closes = chartData.candles.map((c: Candle) => c.close);
        for (const ma of MA_CONFIGS) {
          const maValues = computeMAArray(closes, ma.period);
          const maData = maValues
            .map((v, i) => ({
              time: toDateStr(chartData.candles[i].time),
              value: v,
            }))
            .filter((d) => !isNaN(d.value));

          if (maData.length > 0) {
            const maSeries = chart.addSeries(LineSeries, {
              color: ma.color,
              lineWidth: 1,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            maSeries.setData(maData);
          }
        }
      }

      // 빗각선 렌더링
      if (bitgakResult) {
        for (const line of bitgakResult.lines) {
          const lineData = line.points.map((p: { time: number; value: number }) => ({
            time: toDateStr(p.time),
            value: p.value,
          }));

          const lineColor = applyOpacity(line.color, line.opacity ?? 1);
          const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: line.type === "midline" ? 1 : line.type === "trend_line" ? 2 : 2,
            lineStyle: line.style === "dashed" ? 1 : 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
            autoscaleInfoProvider: () => ({
              priceRange: null,
            }),
          });
          lineSeries.setData(lineData);
        }

        // 피벗 마커
        const markers = [
          ...bitgakResult.highs.map((p) => ({
            time: toDateStr(p.time),
            position: "aboveBar" as const,
            color: "#ef4444",
            shape: "arrowDown" as const,
            text: "",
          })),
          ...bitgakResult.lows.map((p) => ({
            time: toDateStr(p.time),
            position: "belowBar" as const,
            color: "#22c55e",
            shape: "arrowUp" as const,
            text: "",
          })),
        ].sort((a, b) => (a.time > b.time ? 1 : -1));

        if (markers.length > 0) {
          createSeriesMarkers(candleSeries, markers);
        }
      }

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && container) {
          chart.applyOptions({ width: container.clientWidth, height: chartHeight });
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, bitgakResult, showMA, logScale, chartHeight]);

  const showDropdown = suggestions.length > 0;

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-visible">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📐</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">빗각 차트 분석</h3>
        <span className="text-[10px] text-gray-400 font-mono">종목 선택 → 자동 빗각 작도</span>
      </div>

      {/* 검색창 */}
      <div className="relative z-50">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/70" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) {
                resetStock();
                setQuery(e.target.value);
              }
            }}
            placeholder="종목명을 입력하세요"
            className="w-full pl-9 pr-8 py-3 rounded-xl bg-white dark:bg-white/[0.07] border-2 border-blue-400/30 dark:border-blue-400/25 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all"
          />
          {selected && (
            <button
              onClick={resetStock}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* 자동완성 */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
            >
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => selectStock({ symbol: s.symbol, name: s.name })}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 기간/봉 선택 + MA 토글 */}
      {selected && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRangeChange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  range === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => {
              const isValid = VALID_INTERVALS[range]?.includes(opt.value) ?? true;
              return (
                <button
                  key={opt.value}
                  onClick={() => isValid && setInterval(opt.value)}
                  disabled={!isValid}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    !isValid
                      ? "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-zinc-600 cursor-not-allowed"
                      : interval === opt.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <button
            onClick={() => setShowMA((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              showMA
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
            }`}
          >
            MA
          </button>
          <button
            onClick={() => setLogScale((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              logScale
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
            }`}
          >
            LOG
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          {([
            { value: "auto" as const, label: "자동", activeClass: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
            { value: "bullish" as const, label: "상승", activeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
            { value: "bearish" as const, label: "하락", activeClass: "bg-red-500/20 text-red-400 border border-red-500/30" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === opt.value
                  ? opt.activeClass
                  : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <Skeleton variant="card" className="mt-3 h-[220px]" />
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* 차트 영역 */}
      {selected && !error && (
        <div
          ref={chartContainerRef}
          className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10"
          style={{ minHeight: chartHeight }}
        />
      )}

      {/* MA 범례 */}
      {selected && showMA && chartData && (
        <div className="flex gap-3 mt-2">
          {MA_CONFIGS.map((ma) => (
            <span key={ma.period} className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
              <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: ma.color }} />
              {ma.label}
            </span>
          ))}
        </div>
      )}

      {/* 빗각 분석 요약 */}
      {bitgakResult && bitgakResult.lines.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1.5">채널 분석 결과</div>
          <div className="flex flex-wrap gap-2">
            {bitgakResult.lines.map((line: BitgakLine, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-zinc-300 font-mono"
              >
                <span
                  className="inline-block w-3 h-[2px]"
                  style={{ backgroundColor: line.color }}
                />
                {line.label}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-500 dark:text-zinc-400 font-mono leading-relaxed whitespace-pre-line">
            {bitgakResult.summary}
          </div>
        </div>
      )}
    </div>
  );
}

```

### components/BitgakInterpretCard.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { BitgakMeta } from "@/types";

interface Props {
  meta: BitgakMeta;
  stockName: string;
}

const DIR_CONFIG = {
  "상승": { icon: TrendingUp, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "상승 채널" },
  "하락": { icon: TrendingDown, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "하락 채널" },
  "횡보": { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", label: "횡보 채널" },
  "판별불가": { icon: AlertTriangle, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", label: "채널 판별불가" },
} as const;

function formatPrice(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function BitgakInterpretCard({ meta, stockName }: Props) {
  const dir = DIR_CONFIG[meta.channelDirection];
  const DirIcon = dir.icon;

  const gaugePercent = meta.positionPercent != null
    ? Math.max(0, Math.min(100, meta.positionPercent))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-card rounded-2xl p-5 space-y-4"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📐</span>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">빗각 해석</h3>
          <span className="text-[10px] text-gray-400 font-mono">{stockName}</span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          {meta.period.start} ~ {meta.period.end} ({meta.period.candleCount}봉)
        </span>
      </div>

      {/* 채널 방향 */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dir.bg}`}>
        <DirIcon size={20} className={dir.color} />
        <div>
          <div className={`text-sm font-black ${dir.color}`}>{dir.label}</div>
          {meta.channelPosition && (
            <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
              현재 위치: {meta.channelPosition}
            </div>
          )}
        </div>
      </div>

      {/* 채널 내 위치 게이지 */}
      {gaugePercent != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 font-mono">하단 지지</span>
            <span className="text-[10px] text-gray-500 font-mono">채널 내 위치</span>
            <span className="text-[10px] text-gray-500 font-mono">상단 저항</span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            {/* 구간 색상 */}
            <div className="absolute inset-0 flex">
              <div className="w-1/3 bg-blue-500/20" />
              <div className="w-1/3 bg-yellow-500/10" />
              <div className="w-1/3 bg-red-500/20" />
            </div>
            {/* 현재 위치 인디케이터 */}
            <div
              className="absolute top-0 h-full w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              style={{ left: `calc(${gaugePercent}% - 2px)` }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
              {meta.positionPercent}%
            </span>
          </div>
        </div>
      )}

      {/* 3-3 원칙 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
          {meta.threeThree.highsMet
            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : <XCircle size={14} className="text-gray-400 shrink-0" />
          }
          <div>
            <div className="text-[10px] text-gray-400 font-mono">고점 피벗</div>
            <div className={`text-xs font-bold ${meta.threeThree.highsMet ? "text-emerald-500" : "text-gray-500"}`}>
              {meta.threeThree.highsCount}개 {meta.threeThree.highsMet ? "충족" : "미충족"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
          {meta.threeThree.lowsMet
            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : <XCircle size={14} className="text-gray-400 shrink-0" />
          }
          <div>
            <div className="text-[10px] text-gray-400 font-mono">저점 피벗</div>
            <div className={`text-xs font-bold ${meta.threeThree.lowsMet ? "text-emerald-500" : "text-gray-500"}`}>
              {meta.threeThree.lowsCount}개 {meta.threeThree.lowsMet ? "충족" : "미충족"}
            </div>
          </div>
        </div>
      </div>

      {/* S/R Flip */}
      {meta.srFlips.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 font-mono mb-1.5">S/R Flip 라인</div>
          <div className="flex flex-wrap gap-1.5">
            {meta.srFlips.map((label, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <span className="inline-block w-2 h-[2px] bg-amber-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 가격 정보 */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "고가", value: formatPrice(meta.priceRange.high), color: "text-red-500" },
          { label: "저가", value: formatPrice(meta.priceRange.low), color: "text-blue-500" },
          { label: "현재가", value: formatPrice(meta.priceRange.current), color: "text-gray-900 dark:text-white" },
          {
            label: "변동률",
            value: `${meta.priceRange.changePct >= 0 ? "+" : ""}${meta.priceRange.changePct.toFixed(1)}%`,
            color: meta.priceRange.changePct >= 0 ? "text-red-500" : "text-blue-500",
          },
        ].map((item) => (
          <div key={item.label} className="text-center px-2 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
            <div className="text-[10px] text-gray-400 font-mono">{item.label}</div>
            <div className={`text-xs font-bold font-mono ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

```

### components/ChartOverlay.tsx

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, Eye, EyeOff, Download } from "lucide-react";
import type { ChartLine } from "@/types";

const LINE_COLORS: Record<ChartLine["type"], string> = {
  channel_top: "#ef4444",
  channel_bottom: "#22c55e",
  midline: "#facc15",
  support: "#22c55e",
  resistance: "#ef4444",
  trendline: "#3b82f6",
};

const LINE_LABELS: Record<ChartLine["type"], string> = {
  channel_top: "상단",
  channel_bottom: "하단",
  midline: "중앙",
  support: "지지",
  resistance: "저항",
  trendline: "추세",
};

interface Props {
  imageUrl: string;
  lines: ChartLine[];
  onClear?: () => void;
}

export function ChartOverlay({ imageUrl, lines, onClear }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [showLines, setShowLines] = useState(true);

  const drawLines = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPI 보정 (레티나 대응)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = imgSize.w * dpr;
    canvas.height = imgSize.h * dpr;
    canvas.style.width = `${imgSize.w}px`;
    canvas.style.height = `${imgSize.h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!showLines || lines.length === 0) return;

    for (const line of lines) {
      if (line.points.length < 2) continue;

      const color = LINE_COLORS[line.type] || "#3b82f6";
      const isDashed = line.type === "midline" || line.style === "dashed";

      // % → 실제 픽셀 변환
      const pts = line.points.map((p) => ({
        px: (p.x / 100) * imgSize.w,
        py: (p.y / 100) * imgSize.h,
      }));

      // ── 선 그리기 (포인트 사이만, 연장 없음) ──
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(isDashed ? [6, 4] : []);
      ctx.globalAlpha = 0.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].px, pts[i].py);
      }
      ctx.stroke();

      // ── 포인트 마커 ──
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const pt of pts) {
        // 외곽 원
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // 내부 흰 점
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      // ── 라벨 (마지막 포인트 옆에) ──
      const labelText = line.label || LINE_LABELS[line.type] || "";
      if (labelText) {
        const lastPt = pts[pts.length - 1];
        const lx = Math.min(lastPt.px + 8, imgSize.w - 80);
        const ly = lastPt.py + 4;

        ctx.font = "bold 10px 'Pretendard', monospace";
        const metrics = ctx.measureText(labelText);
        const pad = 3;
        const bgW = metrics.width + pad * 2;
        const bgH = 14;

        // 배경 박스
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(lx - pad, ly - bgH + 2, bgW, bgH, 3);
        ctx.fill();

        // 텍스트
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillText(labelText, lx, ly - 2);
      }
    }
  }, [lines, imgSize, showLines]);

  useEffect(() => {
    drawLines();
  }, [drawLines]);

  // 이미지 사이즈 추적
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const img = container.querySelector("img");
      if (img && img.clientWidth > 0) {
        setImgSize({ w: img.clientWidth, h: img.clientHeight });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    const container = containerRef.current;
    if (!container) return;
    const img = container.querySelector("img");
    if (img && img.clientWidth > 0) {
      setImgSize({ w: img.clientWidth, h: img.clientHeight });
    }
  };

  // 합성 다운로드
  const handleDownload = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;

    const merged = document.createElement("canvas");
    merged.width = img.naturalWidth;
    merged.height = img.naturalHeight;
    const mctx = merged.getContext("2d");
    if (!mctx) return;

    mctx.drawImage(img, 0, 0);

    // 빗각선을 원본 이미지 해상도에 맞춰 다시 그리기
    const scaleX = img.naturalWidth / imgSize.w;
    const scaleY = img.naturalHeight / imgSize.h;

    for (const line of lines) {
      if (line.points.length < 2) continue;
      const color = LINE_COLORS[line.type] || "#3b82f6";
      const isDashed = line.type === "midline" || line.style === "dashed";
      const pts = line.points.map((p) => ({
        px: (p.x / 100) * imgSize.w * scaleX,
        py: (p.y / 100) * imgSize.h * scaleY,
      }));

      mctx.beginPath();
      mctx.strokeStyle = color;
      mctx.lineWidth = 3 * Math.max(scaleX, scaleY);
      mctx.setLineDash(isDashed ? [10, 8] : []);
      mctx.globalAlpha = 0.8;
      mctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 1; i < pts.length; i++) {
        mctx.lineTo(pts[i].px, pts[i].py);
      }
      mctx.stroke();
    }

    const link = document.createElement("a");
    link.download = "mcr-bitgak-analysis.png";
    link.href = merged.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/30" ref={containerRef}>
      <Image
        src={imageUrl}
        alt="차트 분석"
        width={800}
        height={450}
        className="w-full h-auto block"
        unoptimized
        onLoad={handleImageLoad}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />

      {/* 컨트롤 버튼 */}
      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
        <button
          onClick={() => setShowLines((v) => !v)}
          className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-blue-600 rounded-full text-white transition-colors shadow"
          title={showLines ? "빗각 숨기기" : "빗각 보기"}
        >
          {showLines ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          onClick={handleDownload}
          className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-blue-600 rounded-full text-white transition-colors shadow"
          title="빗각 이미지 저장"
        >
          <Download size={14} />
        </button>
        {onClear && (
          <button
            onClick={onClear}
            className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors shadow"
            title="이미지 삭제"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 범례 */}
      {showLines && lines.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {lines.map((line, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[10px] text-white font-mono">
              <span
                className="inline-block w-4 h-[2px]"
                style={{
                  backgroundColor: LINE_COLORS[line.type] || "#3b82f6",
                  borderStyle: line.type === "midline" ? "dashed" : "solid",
                }}
              />
              {line.label || LINE_LABELS[line.type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

```

### components/CrossNavigation.tsx

```tsx
"use client";

import Link from "next/link";

const MENUS = [
  { path: "/", label: "포폴진단", icon: "📋", desc: "AI 포트폴리오 분석" },
  { path: "/?mode=chart", label: "차트분석", icon: "📈", desc: "빗각·기술지표" },
  { path: "/mock-investment", label: "모의투자", icon: "📊", desc: "가상 주식 매매" },
  { path: "/stock-lab", label: "분석실", icon: "🔬", desc: "AI 종목 분석" },
  { path: "/chart-game", label: "차트게임", icon: "🎮", desc: "업다운 예측" },
  { path: "/quiz", label: "퀴즈", icon: "🧠", desc: "투자성향 테스트" },
  { path: "/backtest", label: "백테스트", icon: "⏪", desc: "전략 시뮬레이션" },
  { path: "/adventure", label: "모험", icon: "⚔️", desc: "RPG 성장" },
];

interface Props {
  currentPath: string;
}

export default function CrossNavigation({ currentPath }: Props) {
  const items = MENUS.filter((m) => m.path !== currentPath);

  return (
    <div className="mt-6 mb-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
        다른 기능 둘러보기
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((m) => (
          <Link
            key={m.path}
            href={m.path}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <span className="text-lg">{m.icon}</span>
            <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
              {m.label}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
              {m.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

```

### components/DailyBriefing.tsx

```tsx
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

```

### components/DailyDiscovery.tsx

```tsx
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

```

### components/DashboardWidgets.tsx

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Zap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Sector } from "@/types";
import type { FearGreedData, EconEvent, CommodityItem, NewsItem } from "@/hooks/useMarketData";

// ─── Data ────────────────────────────────────────────────────────────────────

const NEWS_ITEMS: NewsItem[] = [
  { title: "🔴 삼성전자 HBM4 엔비디아 퀄 테스트 진행 중 · 3Q26 공급 가시화", url: "" },
  { title: "⚡ 효성중공업 미국 변압기 수주잔고 3.2조 돌파 · 신규 팩토리 증설 확정", url: "" },
  { title: "🧬 삼성바이오로직스 5공장 가동률 40%→65% 상향 조정", url: "" },
  { title: "🚗 현대차 울산 EV 전용라인 3조 투자 확정 · 2027년 양산", url: "" },
  { title: "💾 SK하이닉스 HBM3E 16단 GB200 NVL72 공급 단가 타결", url: "" },
  { title: "🔋 LG에너지솔루션 오하이오 2공장 가동률 50% 하향 · GM 발주 감소", url: "" },
  { title: "🧠 네이버 하이퍼클로바X B2B 계약 23건 신규 수주 · 공공 부문 확대", url: "" },
  { title: "⚙️ 현대모비스 자율주행 레벨3 센서퓨전 모듈 독점 납품 확정", url: "" },
  { title: "🔋 포스코퓨처엠 양극재 수주잔고 8.7조 · 2026 가이던스 유지", url: "" },
  { title: "🔌 두산에너빌리티 체코 원전 수주 최종 협상 진입 · 수주액 24조 추정", url: "" },
  { title: "💊 셀트리온 자가면역 바이오시밀러 미국 FDA 승인 · 연 매출 5,000억 전망", url: "" },
  { title: "🔧 LS일렉트릭 미국 데이터센터향 배전반 수주 급증 · 북미 법인 증설", url: "" },
];

function calcFearGreed(): number {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  return (((seed * 9301 + 49297) % 233280) / 233280) * 70 + 15;
}

interface FGInfo {
  label: string;
  color: string;
  emoji: string;
}
function fgInfo(v: number): FGInfo {
  if (v <= 25) return { label: "극단적 공포", color: "#ef4444", emoji: "😱" };
  if (v <= 45) return { label: "공포", color: "#f97316", emoji: "😨" };
  if (v <= 55) return { label: "중립", color: "#eab308", emoji: "😐" };
  if (v <= 75) return { label: "탐욕", color: "#22c55e", emoji: "😏" };
  return { label: "극단적 탐욕", color: "#10b981", emoji: "🤑" };
}

// 더미 제거 — 실제 일정은 서버(functions/index.js)에서 BOK·Fed·통계청 공식 기준으로 반환

const INDUSTRY_CHECKLISTS: Record<string, string[]> = {
  이차전지: [
    "분리막 수율 92% 이상?",
    "고객사 장기공급계약 체결?",
    "전해질 배합 독자 특허 보유?",
    "LFP 전환 대응 전략 있음?",
    "CATL 대비 원가 10%↓ 달성?",
  ],
  반도체: [
    "HBM 생산능력 로드맵 확보?",
    "EUV 장비 대기 12개월 대응?",
    "선단공정 3nm 이하 진입?",
    "고객사 집중도 Top1 < 30%?",
    "재고조정 사이클 저점 통과?",
  ],
  전력: [
    "수주잔고 소화 2년 이상?",
    "HVDC 국산화 부품 67%↑?",
    "미국 IRA 세액공제 수혜?",
    "규소강판 수급 계약 확보?",
    "신규 수주 모멘텀 지속?",
  ],
  AI: [
    "실제 MRR 전환 매출 검증?",
    "GPU TCO 대비 서비스 마진?",
    "고객 락인(Lock-in) 구조?",
    "오픈소스 대체 리스크 검토?",
    "B2B 계약 ASP 상승 추세?",
  ],
  바이오: [
    "임상 3상 설계 엄밀성?",
    "FDA/EMA 허가 전략 명확?",
    "기술이전 마일스톤 구조?",
    "현금 런웨이 18개월 이상?",
    "CMO 생산능력 사전 확보?",
  ],
  자동차: [
    "BEV 전용 플랫폼 비중?",
    "ADAS 레벨3 양산 일정?",
    "현대·기아 공급망 의존도?",
    "연 2~5% 단가 인하 대응?",
    "소프트웨어 내재화율 목표?",
  ],
  혼합: [
    "섹터 간 상관관계 낮음?",
    "각 섹터 대표 종목 선별?",
    "경기 민감도 분산 확인?",
    "환율 노출 헤지 전략?",
    "리밸런싱 주기 설정?",
  ],
  기타: [
    "비즈니스 모델 이해?",
    "경쟁자 대비 해자(Moat)?",
    "창업자/경영진 트랙레코드?",
    "현금흐름 흑자 전환 시점?",
    "적정 밸류에이션 근거?",
  ],
};

const DAILY_QUOTES = [
  {
    quote: "차트는 과거다. 공장 가동률이 미래다.",
    sub: "수율 90% 못 넘으면 주가도 없어요.",
  },
  {
    quote: "PER 30이 싸다고요? 이익이 나야 PER이죠.",
    sub: "성장주 프리미엄은 성장할 때만 유효합니다.",
  },
  {
    quote: "테마주는 올라갈 때 팔아야 테마주입니다.",
    sub: "고점에서 물리면 그냥 주식이에요.",
  },
  {
    quote: "분기 실적 발표 전날 사면 안 됩니다.",
    sub: "살 거면 3일 전. 발표 당일은 이미 늦었어요.",
  },
  {
    quote: "IR 자료의 '글로벌 1위'는 해당 분기 한정입니다.",
    sub: "지속가능성을 먼저 보세요.",
  },
  {
    quote: "공장 짓는다고 주가 오르는 건 2021년에 끝났어요.",
    sub: "수주 → 매출 → 이익 흐름을 보세요.",
  },
  {
    quote: "외인 순매수 3일 이상 지속 시 진입을 검토하세요.",
    sub: "하루짜리 순매수는 노이즈입니다.",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

interface FuturesData {
  name: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
}

// 선물 장 상태 판별 (KST 기준)
function getFuturesMarketStatus(): { label: string; isOpen: boolean; isNight: boolean } {
  const now = new Date();
  const kstH = (now.getUTCHours() + 9) % 24;
  const kstM = now.getUTCMinutes();
  const kstMin = kstH * 60 + kstM;
  const day = now.getUTCDay(); // 0=Sun
  if (day === 0 || day === 6) return { label: "주말 휴장", isOpen: false, isNight: false };
  // 정규장 09:00~15:45
  if (kstMin >= 540 && kstMin < 945) return { label: "정규장", isOpen: true, isNight: false };
  // 야간 18:00~06:00
  if (kstMin >= 1080 || kstMin < 360) return { label: "야간선물", isOpen: false, isNight: true };
  if (kstMin < 540) return { label: "장 준비 중", isOpen: false, isNight: false };
  return { label: "장 마감", isOpen: false, isNight: false };
}

/** 코스피200 선물 위젯 (정규장 KIS API / 야간은 esignal 안내) */
export function KospiNightFutures() {
  const [data, setData] = useState<FuturesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFutures = async () => {
      try {
        const FIREBASE_HOST = "https://bitgak.co.kr";
        const API_URL =
          process.env.NEXT_PUBLIC_KOSPI_FUTURES_API_URL ||
          `${FIREBASE_HOST}/api/kospi-futures`;
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
        const json = await res.json();
        if (!cancelled) {
          if (json.error) {
            setError(json.error);
          } else {
            setData(json);
            setError(null);
            setLastUpdated(new Date());
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError("데이터 로드 실패");
          setLoading(false);
        }
      }
    };

    fetchFutures();
    const interval = window.setInterval(fetchFutures, 300000); // 5분
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const isUp = (data?.change ?? 0) > 0;
  const isDown = (data?.change ?? 0) < 0;
  const market = getFuturesMarketStatus();

  const updatedStr = lastUpdated
    ? `${String(lastUpdated.getHours()).padStart(2, "0")}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`
    : null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-blue-500" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            코스피200 선물
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
            market.isOpen
              ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
              : "text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/5"
          }`}>
            {loading ? "..." : market.isNight ? "야간 장중" : market.label}
          </span>
          {updatedStr && !market.isNight && (
            <span className="text-[9px] text-gray-400 font-mono">{updatedStr}</span>
          )}
        </div>
      </div>

      {market.isNight ? (
        /* ── 야간: 정규장 종가 + esignal 안내 ── */
        <div>
          {data && (
            <div className="mb-3">
              <p className="text-[9px] text-gray-400 mb-1">정규장 종가</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-black font-mono ${
                  isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-900 dark:text-white"
                }`}>
                  {data.price.toFixed(2)}
                </span>
                <span className={`text-xs font-bold font-mono ${
                  isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500"
                }`}>
                  {isUp ? "▲" : isDown ? "▼" : "–"}{" "}
                  {Math.abs(data.change).toFixed(2)} ({isUp ? "+" : ""}{data.changePct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
          <a
            href="http://esignal.co.kr/kospi200-futures-night/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
          >
            <span>야간선물 실시간 보기</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-xs text-gray-500 dark:text-gray-600 font-mono">{error}</p>
      ) : data ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${
              isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-900 dark:text-white"
            }`}>
              {data.price.toFixed(2)}
            </span>
            <span className={`text-sm font-bold font-mono ${
              isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500"
            }`}>
              {isUp ? "▲" : isDown ? "▼" : "–"}
              {" "}{Math.abs(data.change).toFixed(2)}
              {" "}({isUp ? "+" : ""}{data.changePct.toFixed(2)}%)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-[9px] text-gray-400 font-mono">고가</p>
              <p className="text-xs font-bold text-red-500 dark:text-red-400 font-mono">{data.high.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-mono">저가</p>
              <p className="text-xs font-bold text-blue-500 dark:text-blue-400 font-mono">{data.low.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-mono">거래량</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white font-mono">{data.volume.toLocaleString()}</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** 상단 뉴스 롤링 티커 */
export function NewsTicker({ news, isLoading }: { news?: NewsItem[]; isLoading?: boolean }) {
  const isLive = !!(news && news.length > 0);
  const items = isLive ? news! : NEWS_ITEMS;
  const displayItems = [...items, ...items]; // seamless loop

  return (
    <div className="overflow-hidden bg-gray-100 dark:bg-black/50 border-b border-gray-200 dark:border-white/10 py-2 px-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold shrink-0 border px-2 py-0.5 rounded font-mono transition-colors ${
          isLoading
            ? "text-gray-400 border-gray-300 dark:text-gray-500 dark:border-gray-700"
            : isLive
            ? "text-green-600 dark:text-green-400 border-green-500/50"
            : "text-red-500 dark:text-red-400 border-red-500/50"
        }`}>
          {isLoading ? "..." : isLive ? "LIVE" : "DEMO"}
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker">
            {displayItems.map((item, i) =>
              isLive && item.url ? (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-300 shrink-0 mr-10 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {item.title}
                </a>
              ) : (
                <span key={i} className="text-sm text-gray-600 dark:text-gray-300 shrink-0 mr-10">
                  {item.title}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 파일 업로드 전 오늘의 명언 */
export function DailyQuote() {
  const [quote, setQuote] = useState(DAILY_QUOTES[0]);

  useEffect(() => {
    const idx = new Date().getDate() % DAILY_QUOTES.length;
    setQuote(DAILY_QUOTES[idx]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 text-center"
    >
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Zap size={12} className="text-kim-gold" />
        <p className="text-xs text-kim-gold uppercase tracking-widest font-mono">
          오비젼의 오늘의 훈수
        </p>
        <Zap size={12} className="text-kim-gold" />
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2">
        &ldquo;{quote.quote}&rdquo;
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{quote.sub}</p>
    </motion.div>
  );
}

const FG_LABEL_KO: Record<string, string> = {
  "Extreme Fear": "극단적 공포",
  "Fear": "공포",
  "Neutral": "중립",
  "Greed": "탐욕",
  "Extreme Greed": "극단적 탐욕",
};

/** 시장 공포/탐욕 게이지 */
export function MarketSentimentGauge({
  fearGreed,
  isLoading,
}: {
  fearGreed?: FearGreedData | null;
  isLoading?: boolean;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (fearGreed) {
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, [fearGreed]);

  const isReal = !!fearGreed;
  const value = fearGreed?.value ?? 50;
  const labelKo = fearGreed ? (FG_LABEL_KO[fearGreed.label] ?? fearGreed.label) : "";
  const info = fgInfo(value);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
              시장 공포/탐욕
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-600 font-mono">가상화폐 시장 심리 지수</p>
          </div>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          isReal
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {isLoading ? "..." : isReal ? "실시간" : "오류"}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-green-500 mb-3">
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-gray-300 dark:border-gray-900 transition-all duration-1000 ease-out"
          style={{
            left: `${isReal && animated ? value : 50}%`,
            transform: "translateX(-50%) translateY(-50%)",
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-600 mb-3 font-mono">
        <span>공포</span>
        <span>중립</span>
        <span>탐욕</span>
      </div>

      <div className="text-center">
        {isLoading || !fearGreed ? (
          <div className="py-1">
            <div className="h-8 w-16 mx-auto rounded bg-gray-200 dark:bg-white/5 animate-pulse mb-1" />
            <div className="h-4 w-20 mx-auto rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
          </div>
        ) : (
          <>
            <span className="text-3xl font-black font-mono" style={{ color: info.color }}>
              {value}
            </span>
            <span className="text-lg ml-2">{info.emoji}</span>
            <p className="text-sm font-semibold mt-0.5" style={{ color: info.color }}>
              {labelKo}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const COMMODITY_URLS: Record<string, string> = {
  // 귀금속
  gold:      "https://finance.yahoo.com/quote/GC%3DF/",
  silver:    "https://finance.yahoo.com/quote/SI%3DF/",
  palladium: "https://finance.yahoo.com/quote/PA%3DF/",
  // 에너지
  oil:       "https://finance.yahoo.com/quote/CL%3DF/",
  natgas:    "https://finance.yahoo.com/quote/NG%3DF/",
  uranium:   "https://finance.yahoo.com/quote/URA/",
  // 산업 금속
  copper:    "https://finance.yahoo.com/quote/HG%3DF/",
  nickel:    "https://finance.yahoo.com/quote/NI%3DF/",
  aluminum:  "https://finance.yahoo.com/quote/ALI%3DF/",
  // 배터리 소재
  lithium:   "https://finance.yahoo.com/quote/LIT/",
};

/** 핵심 원재료 시세 위젯 */
export function CommodityTicker({
  commodities,
  kimComment,
  isLoading,
}: {
  commodities?: CommodityItem[];
  kimComment?: string;
  isLoading?: boolean;
}) {
  const formatPrice = (price: number, currency: string) => {
    if (price >= 10000) return `${(price / 1000).toFixed(1)}K`;
    if (price >= 1000) return price.toFixed(0);
    return price.toFixed(2);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-gray-500 dark:text-gray-400" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            핵심 원재료 시세
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          commodities && commodities.length > 0
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {isLoading ? "로딩..." : commodities?.length ? "Yahoo Finance" : "데이터 없음"}
        </span>
      </div>

      {/* Price grid — lg:grid-cols-2 to fit narrow sidebar */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-3">
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="rounded-lg p-2.5 border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] animate-pulse h-16" />
          ))}
        </div>
      ) : commodities && commodities.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-3">
          {commodities.map((c) => (
            <motion.a
              key={c.key}
              href={COMMODITY_URLS[c.key] ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-lg p-2.5 border block transition-opacity hover:opacity-80 cursor-pointer ${
                c.changePct > 0
                  ? "border-red-500/30 bg-red-50 dark:bg-red-950/20"
                  : c.changePct < 0
                  ? "border-blue-500/30 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <p className="text-[10px] text-gray-500 mb-0.5">{c.name}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                {formatPrice(c.price, c.currency)}
                <span className="text-[9px] text-gray-500 dark:text-gray-600 ml-0.5">{c.currency}</span>
              </p>
              <p className={`text-xs font-mono font-bold ${
                c.changePct > 0 ? "text-red-500 dark:text-red-400" : c.changePct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
              }`}>
                {c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : "–"}
                {" "}{Math.abs(c.changePct).toFixed(2)}%
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-700 mt-0.5">{c.note}</p>
            </motion.a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-600 text-center py-4">시세 로드 실패</p>
      )}

      {/* 공장장 킴의 원가 분석 */}
      {kimComment && !isLoading && (
        <div className="border-t border-gray-200 dark:border-white/10 pt-3">
          <p className="text-[10px] text-kim-gold font-mono mb-1.5">
            ⚙️ 오비젼의 원가 분석
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{kimComment}</p>
        </div>
      )}
    </div>
  );
}

const ECON_URLS: Record<string, string> = {
  "금통위": "https://www.bok.or.kr/portal/main/contents.do?menuNo=200761",
  "FOMC":   "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  "실적":   "https://dart.fss.or.kr/dsac001/mainAll.do",
  "물가":   "https://kostat.go.kr/board.es?mid=a10301060200&bid=218",
  "무역":   "https://tradedata.go.kr/",
  "GDP":    "https://ecos.bok.or.kr/",
};

/** 하단 주요 경제 일정 */
export function EconomicCalendar({ events }: { events?: EconEvent[] }) {
  const hasEvents = !!(events && events.length > 0);

  // 태그별 색상
  const tagStyle = (tag: string) => {
    if (tag === "금통위") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    if (tag === "FOMC")  return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
    if (tag === "실적")  return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
    if (tag === "GDP")   return "bg-green-500/15 text-green-600 dark:text-green-400";
    if (tag === "물가")  return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    if (tag === "무역")  return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    return "bg-gray-100 dark:bg-white/5 text-gray-500";
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gray-500 dark:text-gray-400" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            주요 경제·실적 일정
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          hasEvents
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {hasEvents ? "KR 공식 일정 · BOK·Fed" : "로드 중"}
        </span>
      </div>

      {hasEvents ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {events!.map((ev, i) => (
            <motion.a
              key={i}
              href={ev.url ?? ECON_URLS[ev.tag] ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-lg p-2.5 border block transition-opacity hover:opacity-80 cursor-pointer ${
                ev.hot
                  ? "border-red-500/30 bg-red-50 dark:bg-red-950/20"
                  : "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <p className="text-xs font-mono text-gray-500 mb-1">{ev.date}</p>
              <p className="text-xs text-gray-900 dark:text-white font-medium leading-tight mb-1.5">
                {ev.event}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${tagStyle(ev.tag)}`}>
                {ev.tag}
              </span>
            </motion.a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-kim-gold font-mono text-center py-4 leading-relaxed">
          💊 일정도 안 보고 매수 버튼 누르는 손가락이 문제다
        </p>
      )}
    </div>
  );
}

```

### components/ExpressionIcons.tsx

```tsx
"use client";

interface IconProps {
  size?: number;
  className?: string;
}

/* ─── Kim 모드: 원형 얼굴 라인 아트 ─── */

export function KimNeutral({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="20" r="2" fill="currentColor" />
      <circle cx="31" cy="20" r="2" fill="currentColor" />
      <line x1="16" y1="31" x2="32" y2="31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function KimShocked({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="19" r="3" fill="currentColor" />
      <circle cx="31" cy="19" r="3" fill="currentColor" />
      <ellipse cx="24" cy="33" rx="4" ry="5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function KimSmug({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="21" r="2" fill="currentColor" />
      <circle cx="31" cy="21" r="2" fill="currentColor" />
      <line x1="28" y1="14" x2="34" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 30 Q24 36 32 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function KimAngry({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="21" r="2" fill="currentColor" />
      <circle cx="31" cy="21" r="2" fill="currentColor" />
      <line x1="12" y1="14" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="14" x2="27" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 34 Q24 28 31 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function KimPity({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="22" r="2" fill="currentColor" />
      <circle cx="31" cy="22" r="2" fill="currentColor" />
      <line x1="12" y1="17" x2="21" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="17" x2="27" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 33 Q24 28 31 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ─── MCR 모드: 기하학 상태 아이콘 ─── */

export function McrNeutral({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="10" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="10" y1="24" x2="38" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function McrShocked({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <polyline points="6,12 16,18 24,14 32,30 42,38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="22" y1="28" x2="26" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="28" x2="22" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="34" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function McrSmug({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <line x1="6" y1="30" x2="42" y2="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <polyline points="10,38 18,32 26,34 32,28 36,20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="32,20 36,14 36,20 42,20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function McrAngry({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="16" x2="32" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="16" x2="16" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function McrPity({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M12,28 Q12,12 28,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <polyline points="22,12 28,12 28,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="8" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
    </svg>
  );
}

```

### components/ExpToast.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastItem {
  id: number;
  exp: number;
  label: string;
  type: "exp" | "stone";
}

let nextId = 0;

export function ExpToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleExpGranted = useCallback((e: Event) => {
    const { exp, label } = (e as CustomEvent).detail;
    if (!exp || exp <= 0) return;

    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, exp, label, type: "exp" }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const handleStoneGranted = useCallback((e: Event) => {
    const { amount, label } = (e as CustomEvent).detail;
    if (!amount || amount <= 0) return;

    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, exp: amount, label, type: "stone" }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    window.addEventListener("ovision-exp-granted", handleExpGranted);
    window.addEventListener("ovision-stone-granted", handleStoneGranted);
    return () => {
      window.removeEventListener("ovision-exp-granted", handleExpGranted);
      window.removeEventListener("ovision-stone-granted", handleStoneGranted);
    };
  }, [handleExpGranted, handleStoneGranted]);

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="px-4 py-2 rounded-xl bg-indigo-600/90 backdrop-blur border border-indigo-400/30 shadow-lg shadow-indigo-900/40"
          >
            <div className="flex items-center gap-2">
              {t.type === "stone" ? (
                <>
                  <span className="text-indigo-300 text-sm font-black">+{t.exp}</span>
                  <span className="text-white/80 text-xs font-mono">투자석</span>
                </>
              ) : (
                <>
                  <span className="text-amber-300 text-sm font-black">+{t.exp}</span>
                  <span className="text-white/80 text-xs font-mono">EXP</span>
                </>
              )}
              <span className="text-white/50 text-[10px] font-mono">{t.label}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

```

### components/FileDropZone.tsx

```tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, ImageIcon, X, Camera } from "lucide-react";
import Image from "next/image";

interface Props {
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  mode?: "kim" | "makalong";
}

export function FileDropZone({ previewUrl, onFile, onClear, mode = "kim" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/")) onFile(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
        ${isDragging
          ? mode === "makalong"
            ? "border-blue-400 bg-blue-500/15 dark:bg-blue-500/15 shadow-[0_0_30px_rgba(59,130,246,0.35)]"
            : "border-kim-red bg-red-500/15 dark:bg-red-500/15 shadow-[0_0_30px_rgba(230,57,70,0.35)]"
          : mode === "makalong"
            ? "border-blue-400/60 dark:border-blue-400/40 bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-500/10 dark:to-gray-900/60 hover:border-blue-400 hover:shadow-[0_0_24px_rgba(59,130,246,0.2)]"
            : "border-indigo-400/60 dark:border-indigo-400/40 bg-gradient-to-b from-indigo-50/80 to-white dark:from-indigo-500/10 dark:to-gray-900/60 hover:border-indigo-400 hover:shadow-[0_0_24px_rgba(99,102,241,0.2)]"
        }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
        }}
      />

      {previewUrl ? (
        <div className="relative w-full h-56 rounded-xl overflow-hidden">
          <Image
            src={previewUrl}
            alt={mode === "makalong" ? "차트 미리보기" : "포트폴리오 미리보기"}
            fill
            className="object-contain"
            unoptimized
          />
          {/* X 삭제 버튼 */}
          {onClear && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center
                         bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors shadow"
              title="이미지 삭제"
            >
              <X size={14} />
            </button>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium">클릭하여 변경</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
          <motion.div
            animate={isDragging ? { scale: 1.15 } : { scale: [1, 1.08, 1] }}
            transition={isDragging ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className={`p-5 rounded-2xl ${mode === "makalong"
              ? "bg-blue-500/20 ring-2 ring-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
              : "bg-indigo-500/20 ring-2 ring-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"}`}
          >
            {isDragging ? (
              <ImageIcon size={40} className={mode === "makalong" ? "text-blue-400" : "text-indigo-400"} />
            ) : (
              <Camera size={40} className={mode === "makalong" ? "text-blue-400" : "text-indigo-400"} />
            )}
          </motion.div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white text-base font-black">
              {mode === "makalong"
                ? "차트 캡처를 올려주세요"
                : "포트폴리오 스크린샷을 올려주세요"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              {mode === "makalong"
                ? "주봉 · 일봉 · 분봉 캔들 차트"
                : "증권앱 보유종목 화면 캡처"}
            </p>
          </div>
          <motion.span
            animate={{ boxShadow: [
              mode === "makalong"
                ? "0 0 0 0 rgba(59,130,246,0)"
                : "0 0 0 0 rgba(99,102,241,0)",
              mode === "makalong"
                ? "0 0 0 8px rgba(59,130,246,0.15)"
                : "0 0 0 8px rgba(99,102,241,0.15)",
              mode === "makalong"
                ? "0 0 0 0 rgba(59,130,246,0)"
                : "0 0 0 0 rgba(99,102,241,0)",
            ]}}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className={`px-6 py-3 text-white text-sm font-black rounded-xl transition-colors ${
              mode === "makalong"
                ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                : "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30"
            }`}
          >
            클릭하여 파일 선택
          </motion.span>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center font-mono leading-relaxed">
            {mode === "makalong"
              ? "네이버증권 · 트레이딩뷰 · 키움 영웅문 차트 권장"
              : "종목명 · 수량 · 수익률이 보이면 정확도 UP"}
          </p>
        </div>
      )}
    </motion.div>
  );
}

```

### components/HelpModal.tsx

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";

const HELP_SECTIONS = [
  {
    emoji: "🏭",
    title: "포폴 진단",
    desc: "증권앱 보유종목 스크린샷을 업로드하면 AI가 포트폴리오를 팩폭으로 분석해줍니다.",
  },
  {
    emoji: "📐",
    title: "차트 분석",
    desc: "종목을 검색하면 자동으로 빗각 채널을 작도하고, AI가 매매 판단을 내려줍니다.",
  },
  {
    emoji: "🔬",
    title: "종목 분석실",
    desc: "1~3개 종목을 검색하면 수익률 비교 차트, AI 브리핑, 관련 뉴스를 한 화면에서 볼 수 있습니다.",
  },
  {
    emoji: "📰",
    title: "종목 뉴스",
    desc: "종목을 검색하면 관련 최신 뉴스를 한눈에 볼 수 있습니다.",
  },
  {
    emoji: "🎮",
    title: "차트 업다운 게임",
    desc: "종목명을 가린 실제 과거 차트를 보고 올랐는지 내렸는지 맞춰보세요. 연승 기록으로 랭킹 경쟁!",
  },
  {
    emoji: "📈",
    title: "모의투자",
    desc: "가상 1,000만원으로 실제 시세 기반 매매 연습을 할 수 있습니다.",
  },
  {
    emoji: "🧠",
    title: "투자성향 테스트",
    desc: "15문항으로 나의 투자 성향을 분석해보세요.",
  },
  {
    emoji: "📊",
    title: "대시보드",
    desc: "코스피200 선물, 공포탐욕지수, 원자재 시세, 경제캘린더를 실시간으로 확인합니다.",
  },
];

export function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 플로팅 ? 버튼 */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-kim-red text-white shadow-lg shadow-red-900/40 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="도움말"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* 모달 */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 오버레이 */}
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />

            {/* 컨테이너 */}
            <motion.div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  오비젼 사용 가이드
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 섹션 목록 */}
              <div className="flex flex-col gap-3">
                {HELP_SECTIONS.map((s) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
                  >
                    <span className="text-2xl shrink-0">{s.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {s.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

```

### components/HeroLanding.tsx

```tsx
"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface HeroLandingProps {
  onStartKim: () => void;
  onStartMakalong: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  onDismiss?: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const featureContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const featureItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cards = [
  {
    label: "포폴 진단",
    sub: "스크린샷 업로드 → AI 팩폭 진단",
    color: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 hover:border-indigo-400",
    textColor: "text-indigo-500 dark:text-indigo-400",
    glow: "hover:shadow-lg",
    icon: "🏭",
    action: "kim" as const,
  },
  {
    label: "차트 분석",
    sub: "빗각 자동 작도 → AI 매매 판단",
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-400",
    textColor: "text-blue-500 dark:text-blue-400",
    glow: "hover:shadow-lg",
    icon: "📐",
    action: "makalong" as const,
  },
  {
    label: "모의투자",
    sub: "가상 1,000만원으로 실전 연습",
    color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400",
    textColor: "text-emerald-500 dark:text-emerald-400",
    glow: "hover:shadow-lg",
    icon: "📈",
    action: "link" as const,
    href: "/mock-investment",
  },
];

const features = [
  {
    icon: "🏭",
    title: "포폴 진단",
    desc: "포트폴리오 스크린샷을 올리면 AI가 팩폭으로 진단",
    border: "border-indigo-500/20 dark:border-indigo-500/30",
  },
  {
    icon: "📐",
    title: "차트 분석",
    desc: "빗각 자동 작도 + 기술지표로 매매 타이밍 분석",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
  {
    icon: "🔬",
    title: "종목 분석실",
    desc: "종목 비교, 수급, AI 브리핑을 한눈에",
    border: "border-purple-500/20 dark:border-purple-500/30",
  },
  {
    icon: "📈",
    title: "모의투자",
    desc: "가상 1,000만원으로 실전 감각 연습",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  {
    icon: "🎮",
    title: "차트게임",
    desc: "실제 차트로 업다운 맞추기 연승 도전",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
];

export function HeroLanding({ onStartKim, onStartMakalong, contentRef, onDismiss }: HeroLandingProps) {
  const scrollToContent = () => {
    onDismiss?.();
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCardClick = (card: (typeof cards)[number]) => {
    onDismiss?.();
    if (card.action === "kim") {
      onStartKim();
      contentRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (card.action === "makalong") {
      onStartMakalong();
      contentRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center hero-mesh overflow-hidden px-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center max-w-2xl mx-auto"
      >
        {/* Title */}
        <motion.h2
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[.3em] text-gray-900 dark:text-white mb-4 select-none"
        >
          오 비 젼
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-sm sm:text-base text-gray-500 dark:text-zinc-400 font-mono mb-10"
        >
          AI가 분석하고, 팩트로 때립니다
        </motion.p>

        {/* Feature cards */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg sm:max-w-2xl"
        >
          {cards.map((card) =>
            card.action === "link" ? (
              <Link key={card.label} href={card.href!} onClick={() => onDismiss?.()}>
                <div
                  className={`group relative bg-gradient-to-b ${card.color} border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${card.glow}`}
                >
                  <div className="text-2xl sm:text-3xl mb-2">{card.icon}</div>
                  <div className={`text-sm sm:text-base font-black ${card.textColor}`}>{card.label}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 font-mono leading-snug">
                    {card.sub}
                  </div>
                </div>
              </Link>
            ) : (
              <div
                key={card.label}
                onClick={() => handleCardClick(card)}
                className={`group relative bg-gradient-to-b ${card.color} border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${card.glow}`}
              >
                <div className="text-2xl sm:text-3xl mb-2">{card.icon}</div>
                <div className={`text-sm sm:text-base font-black ${card.textColor}`}>{card.label}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 font-mono leading-snug">
                  {card.sub}
                </div>
              </div>
            )
          )}
        </motion.div>
      </motion.div>

      {/* Feature introduction section */}
      <motion.div
        variants={featureContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-14 sm:mt-20 w-full max-w-2xl mx-auto"
      >
        <motion.p
          variants={featureItem}
          className="text-center text-xs sm:text-sm text-gray-400 dark:text-zinc-500 font-mono mb-6"
        >
          주요 기능
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={featureItem}
              className={`glass-card ${f.border} border p-5 rounded-2xl`}
            >
              <div className="text-xl mb-2">{f.icon}</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Scroll arrow */}
      <motion.button
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.8 } }}
        onClick={scrollToContent}
        className="mt-10 sm:mt-14 text-gray-400 dark:text-zinc-500 animate-bounce"
        aria-label="스크롤하여 시작"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10l5 5 5-5" />
        </svg>
        <span className="block text-[10px] font-mono mt-1">스크롤하여 시작</span>
      </motion.button>
    </section>
  );
}

```

### components/InvestorTrendCompact.tsx

```tsx
"use client";

import { Skeleton } from "@/components/Skeleton";
import type { InvestorTrendData } from "@/types";

function formatQty(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function formatDate(d: string): string {
  if (!d || d.length < 8) return d;
  return `${d.slice(4, 6)}/${d.slice(6)}`;
}

function SignedCell({ value, color }: { value: number; color: string }) {
  return (
    <td
      className="text-right font-mono text-[10px] sm:text-xs px-1.5 py-1"
      style={{ color: value >= 0 ? color : "#6b7280" }}
    >
      {value >= 0 ? "+" : ""}
      {formatQty(value)}
    </td>
  );
}

interface Props {
  data: InvestorTrendData | null;
  isLoading: boolean;
}

export function InvestorTrendCompact({ data, isLoading }: Props) {
  if (!data && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const recent5 = [...data.daily].reverse().slice(0, 5);

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 mb-3">
        투자자 수급 동향
      </p>

      {/* 누적 요약 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">외국인</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.foreign >= 0 ? "#ef4444" : "#6b7280" }}>
            {data.summary.foreign >= 0 ? "+" : ""}{formatQty(data.summary.foreign)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">기관</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.institution >= 0 ? "#3b82f6" : "#6b7280" }}>
            {data.summary.institution >= 0 ? "+" : ""}{formatQty(data.summary.institution)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">개인</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.individual >= 0 ? "#10b981" : "#6b7280" }}>
            {data.summary.individual >= 0 ? "+" : ""}{formatQty(data.summary.individual)}
          </p>
        </div>
      </div>

      {/* 최근 5일 테이블 */}
      {recent5.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200 dark:border-white/10">
                <th className="text-left font-medium px-1.5 py-1">날짜</th>
                <th className="text-right font-medium px-1.5 py-1">외국인</th>
                <th className="text-right font-medium px-1.5 py-1">기관</th>
                <th className="text-right font-medium px-1.5 py-1">개인</th>
              </tr>
            </thead>
            <tbody>
              {recent5.map((d) => (
                <tr key={d.date} className="border-b border-gray-100 dark:border-white/5">
                  <td className="text-left text-gray-500 font-mono px-1.5 py-1">
                    {formatDate(d.date)}
                  </td>
                  <SignedCell value={d.foreign} color="#ef4444" />
                  <SignedCell value={d.institution} color="#3b82f6" />
                  <SignedCell value={d.individual} color="#10b981" />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 font-mono mt-1.5 text-right">단위: 주</p>
        </div>
      )}
    </div>
  );
}

```

### components/InviteCodeSection.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { useInviteCode } from "@/hooks/useInviteCode";
import { generateCharacterShareImage } from "@/lib/characterShareImage";
import type { RpgCharacter, RpgStats } from "@/types";

interface InviteCodeSectionProps {
  user: User | null;
  character?: RpgCharacter | null;
  totalStats?: RpgStats | null;
  sharePath?: string;
}

export function InviteCodeSection({ user, character, totalStats, sharePath }: InviteCodeSectionProps) {
  const {
    myCode,
    inviteCount,
    loading,
    message,
    shareLink,
    shareKakao,
    copyLink,
    submitCode,
  } = useInviteCode(user, sharePath);

  const [inputCode, setInputCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 캐릭터 카드 이미지 생성 → 카카오 공유
  const handleKakaoShare = useCallback(async () => {
    if (!character || !totalStats) {
      shareKakao();
      return;
    }
    setGenerating(true);
    try {
      const blob = await generateCharacterShareImage(character, totalStats);
      if (blob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        shareKakao(dataUrl);
      } else {
        shareKakao();
      }
    } catch {
      shareKakao();
    } finally {
      setGenerating(false);
    }
  }, [character, totalStats, shareKakao]);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mt-4">
      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">
        친구 초대
      </h3>
      <p className="text-[10px] text-gray-500 font-mono mb-3">
        {character ? "내 캐릭터 카드와 함께 공유하고 투자석 보상을 받으세요" : "링크를 공유하고 투자석 보상을 받으세요"}
      </p>

      {user ? (
        <>
          {/* 메인 공유 버튼 */}
          <button
            onClick={shareLink}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 mb-2"
          >
            {loading ? "준비 중..." : "링크 공유하기"}
          </button>

          {/* 보조 버튼 */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleKakaoShare}
              disabled={loading || generating}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#FEE500] text-[#191919] text-xs font-bold hover:bg-[#FDD835] transition-colors disabled:opacity-40"
            >
              <span className="text-sm">💬</span>
              {generating ? "생성중..." : character ? "캐릭터 공유" : "카카오"}
            </button>
            <button
              onClick={copyLink}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
            >
              <span className="text-sm">📋</span>
              복사
            </button>
          </div>

          {/* 초대 현황 */}
          {myCode && (
            <p className="text-[10px] text-gray-500 font-mono text-center mb-2">
              내 코드: {myCode} · {inviteCount}명 초대
            </p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-gray-400 font-mono mb-2">
          로그인하면 초대 링크를 만들 수 있습니다
        </p>
      )}

      {/* 접이식 수동 입력 */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono transition-colors"
      >
        {showManual ? "▲ 닫기" : "▼ 초대코드가 있나요?"}
      </button>

      {showManual && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) =>
              setInputCode(e.target.value.toUpperCase().slice(0, 6))
            }
            placeholder="초대코드 입력"
            maxLength={6}
            className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={() => {
              submitCode(inputCode);
              setInputCode("");
            }}
            disabled={loading || inputCode.length < 6}
            className="shrink-0 px-3 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            등록
          </button>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <p
          className={`text-[10px] font-mono text-center mt-2 ${
            message.ok
              ? "text-green-600 dark:text-green-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

```

### components/KimCharacter.tsx

```tsx
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

```

### components/LevelUpModal.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import { getLevelTitle } from "@/lib/rpgConstants";

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const title = getLevelTitle(level);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="bg-gray-900 border border-indigo-500/40 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl shadow-indigo-900/40 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
          className="text-5xl mb-3"
        >
          ⚔️
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-xs text-indigo-400 font-mono font-bold tracking-widest mb-1">
            LEVEL UP
          </p>
          <p className="text-3xl font-black text-white mb-1">Lv.{level}</p>
          <p className="text-sm text-gray-400 font-mono">{title}</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
        >
          확인
        </motion.button>
      </motion.div>
    </div>
  );
}

```

### components/PopularStocks.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/Skeleton";
import { StaggerContainer } from "@/components/StaggerContainer";
import { fetchPopularStocks, type PopularStockEntry } from "@/lib/popularStocksApi";

interface Props {
  onSelect: (stock: { symbol: string; name: string }) => void;
}

export function PopularStocks({ onSelect }: Props) {
  const [stocks, setStocks] = useState<PopularStockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPopularStocks()
      .then(setStocks)
      .catch(() => setStocks([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔥</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">인기 분석 종목</h3>
        <span className="text-[10px] text-gray-400 font-mono">오늘 TOP 5</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <p className="text-xs text-gray-400 font-mono py-2">아직 분석된 종목이 없습니다</p>
      ) : (
        <StaggerContainer className="space-y-1.5">
          {stocks.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => onSelect({ symbol: s.symbol, name: s.name })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <span className={`text-xs font-black w-5 text-center ${
                i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-500"
              }`}>
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate max-w-[140px]">
                {s.name}
              </span>
              <span className="text-[10px] text-gray-400 font-mono ml-auto shrink-0">
                {s.count}회
              </span>
            </button>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

```

### components/RoastButton.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";

const LOADING_KIM = [
  "포트폴리오 분석 중...",
  "뼈 때릴 준비 중...",
  "독설 충전 중...",
  "팩폭 조준 중...",
];

const LOADING_MCR = [
  "차트 스캔 중...",
  "빗각 작도 중...",
  "채널 분석 중...",
  "타점 계산 중...",
];

interface Props {
  disabled: boolean;
  isLoading: boolean;
  hasResult: boolean;
  onClick: () => void;
  mode?: "kim" | "makalong";
}

export function RoastButton({ disabled, isLoading, hasResult, onClick, mode = "kim" }: Props) {
  const isMcr = mode === "makalong";
  const msgs = isMcr ? LOADING_MCR : LOADING_KIM;
  const label = isLoading
    ? msgs[Math.floor(Date.now() / 1000) % msgs.length]
    : hasResult
    ? (isMcr ? "다시 분석" : "다시 팩폭")
    : (isMcr ? "📐 빗각 분석 시작" : "팩폭 시작");

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
        transition-colors
        ${disabled || isLoading
          ? "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          : isMcr
            ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
            : "bg-kim-red hover:bg-red-700 text-white shadow-lg shadow-red-500/30"
        }`}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : undefined}
    >
      {isLoading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Zap size={20} />
      )}
      {label}
    </motion.button>
  );
}

```

### components/RoastResult.tsx

```tsx
"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StockGradeCard } from "./StockGradeCard";
import { ShareModal } from "./ShareModal";
import { generateAnalysisShareImage } from "@/lib/analysisShareImage";
import type { Grade, PortfolioScores, AnalysisMode } from "@/types";

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

function extractAdvice(text: string) {
  const kimRe = /💊\s*액막이\s*한마디\s*[:：]\s*([\s\S]*)/;
  const mcrRe = /📐\s*MC\.?R\s*결론\s*[:：]\s*([\s\S]*)/;
  const km = kimRe.exec(text);
  if (km) return { main: text.slice(0, km.index).trim(), advice: km[1].trim(), adviceType: "kim" as const };
  const mm = mcrRe.exec(text);
  if (mm) return { main: text.slice(0, mm.index).trim(), advice: mm[1].trim(), adviceType: "mcr" as const };
  return { main: text, advice: null, adviceType: "kim" as const };
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

/* ── 컴포넌트 ── */

interface Props {
  roast: string | null;
  error: string | null;
  grade: Grade;
  mode?: AnalysisMode;
  isStreaming?: boolean;
  scores?: PortfolioScores | null;
}

interface SharePreview {
  dataUrl: string;
  text: string;
  imageCopied: boolean;
}

const SITE_URL = "https://bitgak.co.kr";

function getShareUrl(mode: AnalysisMode): string {
  return mode === "makalong" ? `${SITE_URL}?mode=makalong` : SITE_URL;
}

export function RoastResult({ roast, error, grade, mode = "kim", isStreaming = false, scores }: Props) {
  const headerLines =
    mode === "makalong"
      ? ["================================", "      오비젼 빗각 분석 리포트       ", "================================"]
      : ["================================", "      오비젼의 팩폭 영수증       ", "================================"];

  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("ko-KR"));
  }, []);

  useEffect(() => {
    if (!roast) {
      setDisplayed("");
      setIsTyping(false);
      wasStreamingRef.current = false;
      return;
    }

    if (isStreaming) {
      wasStreamingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayed("");
    setIsTyping(true);

    let i = 0;
    const fullText = roast;

    function typeNext() {
      if (i < fullText.length) {
        setDisplayed(fullText.slice(0, i + 1));
        i++;
        timerRef.current = setTimeout(typeNext, 18);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 18);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roast, isStreaming]);

  async function handleShareImage() {
    if (!roast || !grade || sharingLoading) return;
    setSharingLoading(true);
    const shareUrl = getShareUrl(mode);
    const label = mode === "makalong" ? "오비젼 빗각 분석" : "오비젼 팩폭 진단";
    const preview = roast.slice(0, 60).replace(/\n/g, " ") + "...";
    const friendlyText = `[${label}] 등급: ${grade}급\n"${preview}"\n\n오비젼에서 분석 받아봐`;

    try {
      const blob = await generateAnalysisShareImage(grade, roast, scores ?? null, mode);
      if (!blob) return;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let imageCopied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        imageCopied = true;
      } catch { /* clipboard image not supported */ }

      setSharePreview({ dataUrl, text: friendlyText, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {(roast || error) && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-900 overflow-hidden shadow-xl"
          >
            {/* Receipt header */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <pre className="text-xs font-mono text-gray-500 dark:text-zinc-400 text-center leading-tight">
                {headerLines.join("\n")}
              </pre>
            </div>

            {/* Grade badge */}
            {grade && (
              <div className="flex justify-center pt-4 pb-2">
                <StockGradeCard grade={grade} />
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4">
              {error ? (
                <p className="text-red-500 dark:text-red-400 text-sm font-mono">
                  ⚠ {error}
                </p>
              ) : (
                (() => {
                  const showCursor = isStreaming || isTyping;
                  const isDone = !showCursor;
                  const { main, advice, adviceType } = isDone
                    ? extractAdvice(displayed)
                    : { main: displayed, advice: null, adviceType: "kim" as const };
                  const paragraphs = main ? splitParagraphs(main) : [];
                  return (
                    <div className="space-y-3">
                      {paragraphs.map((p, i) => (
                        <p key={i} className="text-gray-800 dark:text-gray-200 text-[13px] leading-[1.9]">
                          {highlightNumbers(p)}
                          {showCursor && i === paragraphs.length - 1 && (
                            <span className="inline-block w-0.5 h-4 bg-kim-red ml-0.5 animate-type-cursor align-text-bottom" />
                          )}
                        </p>
                      ))}
                      {advice && (
                        <div className={`mt-1 p-3.5 rounded-xl border-l-[3px] ${
                          adviceType === "mcr"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-l-blue-500 border border-blue-200 dark:border-blue-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 border-l-amber-500 border border-amber-200 dark:border-amber-500/20"
                        }`}>
                          <p className={`text-[11px] font-bold tracking-wide uppercase ${
                            adviceType === "mcr" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {adviceType === "mcr" ? "📐 오비젼 결론" : "💊 액막이 한마디"}
                          </p>
                          <p className="text-[13px] text-gray-800 dark:text-zinc-200 mt-1.5 font-semibold leading-relaxed">
                            {highlightNumbers(advice)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Receipt footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2">
              <p className="text-xs font-mono text-gray-400 text-center">
                본 분석은 정보 제공 목적이며 투자 권유가 아닙니다 · {dateStr}
              </p>
              {roast && !isStreaming && !isTyping && (
                <button
                  onClick={handleShareImage}
                  disabled={sharingLoading}
                  className="w-full py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-mono text-gray-500 dark:text-zinc-400 hover:border-kim-red/50 hover:text-kim-red transition-colors disabled:opacity-50"
                >
                  {sharingLoading ? "이미지 생성 중..." : `📤 ${mode === "makalong" ? "빗각 분석" : "팩폭 결과"} 이미지로 공유`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl={getShareUrl(mode)}
        imageFileName="ovision-analysis.png"
      />
    </>
  );
}

```

### components/ShareModal.tsx

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { kakaoShareFeed } from "@/lib/kakaoShare";
import { grantExp } from "@/lib/rpgExp";

const SITE_URL = "https://bitgak.co.kr";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl?: string;
  imageCopied?: boolean;
  shareText: string;
  shareUrl?: string;
  imageFileName?: string;
}

export function ShareModal({
  open,
  onClose,
  imageDataUrl,
  imageCopied,
  shareText,
  shareUrl = SITE_URL,
  imageFileName = "ovision-share.png",
}: ShareModalProps) {
  const [copyTextDone, setCopyTextDone] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  function handleDownload() {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = imageFileName;
    a.click();
    grantExp("share_content");
  }

  function handleTwitter() {
    const url =
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    grantExp("share_content");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopyLinkDone(true);
    setTimeout(() => setCopyLinkDone(false), 2000);
    grantExp("share_content");
  }

  async function handleKakao() {
    setKakaoLoading(true);
    try {
      await kakaoShareFeed({
        title: shareText.split("\n")[0] || "오비젼 AI 팩폭 진단",
        description: shareText.split("\n").slice(1).join(" ").trim() || "포트폴리오 분석 결과를 확인하세요",
        imageDataUrl,
        shareUrl,
      });
      grantExp("share_content");
    } finally {
      setKakaoLoading(false);
    }
  }

  async function handleCopyText() {
    await navigator.clipboard
      .writeText(`${shareText}\n\n${shareUrl}`)
      .catch(() => {});
    setCopyTextDone(true);
    setTimeout(() => setCopyTextDone(false), 2000);
    grantExp("share_content");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
          >
            {/* Image preview */}
            {imageDataUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageDataUrl}
                alt="공유 카드"
                className="w-full block"
              />
            )}

            <div className="p-4 flex flex-col gap-2">
              {/* Clipboard image banner */}
              {imageCopied ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 font-bold text-sm mb-0.5">
                    이미지가 클립보드에 복사됐어요!
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">
                      Ctrl+V
                    </kbd>
                    로 붙여넣기
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-mono text-center">
                  이미지를 저장하거나 공유하세요
                </p>
              )}

              {/* button grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleKakao}
                  disabled={kakaoLoading}
                  className="col-span-2 py-3 rounded-xl bg-[#FEE500] text-[#191919] font-bold text-sm hover:bg-[#FDD835] transition-colors disabled:opacity-60"
                >
                  {kakaoLoading ? "공유 준비중..." : "카카오톡 공유"}
                </button>
                {imageDataUrl && (
                  <button
                    onClick={handleDownload}
                    className="py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                  >
                    이미지 저장
                  </button>
                )}
                <button
                  onClick={handleTwitter}
                  className="py-2.5 rounded-xl bg-black text-white font-bold text-sm border border-white/20 hover:bg-white/10 transition-colors"
                >
                  X / Twitter
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    copyLinkDone
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-gray-200 hover:bg-white/20"
                  }`}
                >
                  {copyLinkDone ? "복사됨!" : "링크 복사"}
                </button>
                <button
                  onClick={handleCopyText}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    copyTextDone
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-gray-200 hover:bg-white/20"
                  }`}
                >
                  {copyTextDone ? "복사됨!" : "텍스트 복사"}
                </button>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-600 font-mono hover:text-gray-400 transition-colors"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

```

### components/Skeleton.tsx

```tsx
interface SkeletonProps {
  variant?: "bar" | "circle" | "card";
  className?: string;
}

export function Skeleton({ variant = "bar", className = "" }: SkeletonProps) {
  const base =
    "animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-white/5 dark:via-white/10 dark:to-white/5";

  if (variant === "circle") {
    return <div className={`${base} rounded-full ${className}`} />;
  }

  if (variant === "card") {
    return <div className={`${base} rounded-lg ${className}`} />;
  }

  return <div className={`${base} rounded ${className}`} />;
}

```

### components/StaggerContainer.tsx

```tsx
"use client";

import { Children, ReactNode } from "react";
import { motion } from "framer-motion";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

const containerVariants = {
  hidden: {},
  visible: (custom: { delay: number; staggerDelay: number }) => ({
    transition: {
      delayChildren: custom.delay,
      staggerChildren: custom.staggerDelay,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function StaggerContainer({
  children,
  className = "",
  delay = 0,
  staggerDelay = 0.06,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      custom={{ delay, staggerDelay }}
    >
      {Children.map(children, (child) =>
        child ? <motion.div variants={itemVariants}>{child}</motion.div> : null
      )}
    </motion.div>
  );
}

```

### components/StockGradeCard.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import type { Grade } from "@/types";

const GRADE_CONFIG: Record<
  NonNullable<Grade>,
  { color: string; bg: string; glow: string; label: string; desc: string }
> = {
  S: {
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400 ring-1 ring-yellow-400/40",
    glow: "shadow-lg",
    label: "S급",
    desc: "신의 한수",
  },
  A: {
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-400 ring-1 ring-green-400/40",
    glow: "shadow-md",
    label: "A급",
    desc: "제법인데요",
  },
  B: {
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-400 ring-1 ring-blue-400/40",
    glow: "shadow-md",
    label: "B급",
    desc: "평범합니다",
  },
  C: {
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-400 ring-1 ring-orange-400/40",
    glow: "shadow-md",
    label: "C급",
    desc: "걱정됩니다",
  },
  D: {
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-400 ring-1 ring-red-400/40",
    glow: "shadow-md",
    label: "D급",
    desc: "심각합니다",
  },
  F: {
    color: "text-gray-800 dark:text-gray-200",
    bg: "bg-gray-100 dark:bg-gray-900 border-gray-600",
    glow: "",
    label: "F급",
    desc: "손절하세요",
  },
};

interface Props {
  grade: Grade;
}

export function StockGradeCard({ grade }: Props) {
  if (!grade) return null;
  const cfg = GRADE_CONFIG[grade];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${cfg.bg} ${cfg.glow}`}
    >
      <span className={`text-3xl font-black font-mono ${cfg.color}`}>
        {cfg.label}
      </span>
      <span className="text-sm text-gray-600 dark:text-zinc-400">
        {cfg.desc}
      </span>
    </motion.div>
  );
}

```

### components/StockRoastSection.tsx

```tsx
"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { useStockRoast } from "@/hooks/useStockRoast";

export function StockRoastSection() {
  const {
    query,
    setQuery,
    suggestions,
    selected,
    selectStock,
    isLoading,
    result,
    error,
    reset,
  } = useStockRoast();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // suggestions가 비면 자연히 닫힘
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleShare() {
    if (!result || !selected) return;
    const newsText = result.news.slice(0, 3).map((n) => `- ${n.title}`).join("\n");
    const text =
      `[오비젼] ${selected.name} 관련 뉴스\n\n${newsText}\n\n` +
      `👉 https://bitgak.co.kr`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  const showDropdown = suggestions.length > 0;

  return (
    <div className="glass-card rounded-2xl p-5 relative z-20 overflow-visible">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔍</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">종목 뉴스</h3>
        <span className="text-[10px] text-gray-400 font-mono">종목 검색 → 관련 뉴스</span>
      </div>

      {/* 검색창 */}
      <div className="relative z-50" ref={dropdownRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kim-red/70" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) {
                reset();
                setQuery(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                selectStock(suggestions[0]);
              }
            }}
            placeholder="종목명을 입력하세요"
            className="w-full pl-9 pr-8 py-3 rounded-xl bg-white dark:bg-white/[0.07] border-2 border-kim-red/30 dark:border-kim-red/25 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-kim-red/60 focus:ring-2 focus:ring-kim-red/20 focus:shadow-[0_0_16px_rgba(230,57,70,0.12)] transition-all"
          />
          {selected && (
            <button
              onClick={reset}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
            >
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => selectStock({ symbol: s.symbol, name: s.name })}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 font-mono">
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-kim-red rounded-full animate-spin" />
          뉴스 조회 중...
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* 결과 카드 */}
      <AnimatePresence>
        {result && selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-3"
          >
            {/* 종목명 */}
            <div className="px-1 mb-2">
              <span className="text-base font-black text-gray-900 dark:text-white">{selected.name}</span>
            </div>

            {/* 뉴스 */}
            {result.news.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] text-gray-400 font-mono px-1">관련 뉴스</div>
                {result.news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5 text-xs group-hover:text-kim-red transition-colors">▸</span>
                      <span className="text-xs text-gray-700 dark:text-zinc-300 font-mono leading-relaxed line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 font-mono text-center py-3">
                관련 뉴스가 없습니다
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleShare}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                공유
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                다른 종목
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/StreakBadge.tsx

```tsx
"use client";

import { motion } from "framer-motion";

interface StreakBadgeProps {
  currentStreak: number;
  maxStreak: number;
}

export function StreakBadge({ currentStreak, maxStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 shrink-0"
      title={`최대 연속: ${maxStreak}일`}
    >
      <span className="text-orange-500 text-xs leading-none">🔥</span>
      <span className="text-[10px] font-bold text-orange-500 font-mono leading-none">
        {currentStreak}
      </span>
    </motion.div>
  );
}

```

### components/TechIndicatorCard.tsx

```tsx
"use client";

import type { TechIndicators } from "@/types";

interface Props {
  indicators: TechIndicators;
}

function getRsiColor(rsi: number): string {
  if (rsi >= 70) return "text-red-500";
  if (rsi <= 30) return "text-blue-500";
  return "text-gray-400";
}

function getRsiLabel(rsi: number): string {
  if (rsi >= 80) return "극단적 과매수";
  if (rsi >= 70) return "과매수 구간";
  if (rsi <= 20) return "극단적 과매도";
  if (rsi <= 30) return "과매도 구간";
  if (rsi >= 50) return "매수 우위";
  return "매도 우위";
}

function getMaAlignment(ma5: number, ma20: number, ma60: number): { label: string; color: string } {
  if (ma5 > ma20 && ma20 > ma60) return { label: "정배열 (강세)", color: "text-red-500" };
  if (ma5 < ma20 && ma20 < ma60) return { label: "역배열 (약세)", color: "text-blue-500" };
  return { label: "혼합 (횡보)", color: "text-gray-400" };
}

export function TechIndicatorCard({ indicators }: Props) {
  const { rsi, macd, bb, ma5, ma20, ma60 } = indicators;
  const maInfo = getMaAlignment(ma5, ma20, ma60);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📊</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">기술지표 요약</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* RSI */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">RSI(14)</span>
            <span className={`text-sm font-black ${getRsiColor(rsi)}`}>{rsi}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                rsi >= 70 ? "bg-red-500" : rsi <= 30 ? "bg-blue-500" : "bg-gray-400"
              }`}
              style={{ width: `${rsi}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-blue-400 font-mono">30</span>
            <span className={`text-[10px] font-mono ${getRsiColor(rsi)}`}>{getRsiLabel(rsi)}</span>
            <span className="text-[10px] text-red-400 font-mono">70</span>
          </div>
        </div>

        {/* MACD */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">MACD</span>
            <span className={`text-[10px] font-bold ${macd.trend === "bullish" ? "text-red-500" : "text-blue-500"}`}>
              {macd.trend === "bullish" ? "골든크로스" : "데드크로스"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 dark:text-zinc-400">
            <span>MACD: {macd.macd}</span>
            <span>Signal: {macd.signal}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-400 font-mono">히스토그램:</span>
            <span className={`text-[10px] font-bold ${macd.histogram > 0 ? "text-red-500" : "text-blue-500"}`}>
              {macd.histogram > 0 ? "+" : ""}{macd.histogram}
            </span>
          </div>
        </div>

        {/* 볼린저 밴드 */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">볼린저 밴드</span>
            <span className={`text-[10px] font-bold ${
              bb.position === "above" ? "text-red-500" : bb.position === "below" ? "text-blue-500" : "text-gray-400"
            }`}>
              {bb.position === "above" ? "상단 이탈" : bb.position === "below" ? "하단 이탈" : "밴드 내"}
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 space-y-0.5">
            <div className="flex justify-between">
              <span>상단</span><span className="text-red-400">{bb.upper.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>중간</span><span>{bb.middle.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>하단</span><span className="text-blue-400">{bb.lower.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 이동평균 배열 */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">이동평균</span>
            <span className={`text-[10px] font-bold ${maInfo.color}`}>{maInfo.label}</span>
          </div>
          <div className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400">MA5</span><span>{ma5.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">MA20</span><span>{ma20.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">MA60</span><span>{ma60.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

### components/ThemeToggle.tsx

```tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="테마 전환"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

```

### components/UpdateBanner.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  const handleNewVersion = useCallback(() => {
    setShow(true);
  }, []);

  useVersionCheck(handleNewVersion);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center px-4 py-2.5 bg-kim-red text-white text-xs font-mono shadow-lg"
        >
          <span className="mr-3">🔄 새 버전이 업데이트됐습니다</span>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded bg-white text-kim-red font-bold hover:bg-gray-100 transition-colors"
          >
            새로고침
          </button>
          <button
            onClick={() => setShow(false)}
            className="ml-2 px-2 py-1 rounded text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

```

### components/Watchlist.tsx

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { searchStocks, type StockSearchResult } from "@/lib/stockSearchApi";

export function Watchlist() {
  const { user } = useAuth();
  const { items, prices, loading, addItem, removeItem, isFull } = useWatchlist(user?.uid);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 디바운스
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchStocks(query);
      setResults(res.slice(0, 6));
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setQuery("");
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="glass-card p-3" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <span className="text-yellow-500">★</span>
          관심 종목
          <span className="text-[10px] font-mono text-gray-400">
            {items.length}/5
          </span>
        </h3>
        {!isFull && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="text-[10px] text-kim-red hover:underline font-mono"
          >
            {showSearch ? "닫기" : "+ 추가"}
          </button>
        )}
      </div>

      {/* 검색 영역 */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) {
                  e.preventDefault();
                  const first = results[0];
                  const alreadyAdded = items.some((i) => i.symbol === first.symbol);
                  if (!alreadyAdded && !isFull) {
                    addItem({ symbol: first.symbol, name: first.name });
                    setQuery("");
                    setResults([]);
                    setShowSearch(false);
                  }
                }
              }}
              placeholder="종목명 검색..."
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50"
              autoFocus
            />
            {searching && (
              <p className="text-[10px] text-gray-400 mt-1 font-mono">검색 중...</p>
            )}
            {results.length > 0 && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">
                {results.map((r) => {
                  const alreadyAdded = items.some((i) => i.symbol === r.symbol);
                  return (
                    <button
                      key={r.symbol}
                      disabled={alreadyAdded || isFull}
                      onClick={() => {
                        addItem({ symbol: r.symbol, name: r.name });
                        setQuery("");
                        setResults([]);
                        setShowSearch(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 flex justify-between items-center"
                    >
                      <span className="text-gray-900 dark:text-white truncate max-w-[140px]">
                        {r.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono ml-2 shrink-0">
                        {alreadyAdded ? "추가됨" : r.exchange}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 종목 리스트 */}
      {items.length === 0 ? (
        <p className="text-[10px] text-gray-400 font-mono text-center py-3">
          관심 종목을 추가해보세요
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const p = prices[item.symbol];
            const isUp = p && p.changePct > 0;
            const isDown = p && p.changePct < 0;
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => removeItem(item.symbol)}
                    className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="삭제"
                  >
                    ×
                  </button>
                  <span className="text-xs text-gray-900 dark:text-white truncate max-w-[100px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {loading && !p ? (
                    <span className="text-[10px] text-gray-400 font-mono">...</span>
                  ) : p ? (
                    <>
                      <span className="text-xs font-mono text-gray-900 dark:text-white">
                        {p.price.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-400"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {p.changePct.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

```

## components/adventure/

### components/adventure/BattleArena.tsx

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TurnResult } from "@/types";

interface Props {
  playerEmoji: string;
  playerNickname: string;
  opponentEmoji: string;
  opponentNickname: string;
  turns: TurnResult[];
  playerMaxHp: number;
  opponentMaxHp: number;
  onComplete: () => void;
}

function hpColor(pct: number): string {
  if (pct > 60) return "bg-green-500";
  if (pct > 30) return "bg-amber-500";
  return "bg-red-500";
}

export default function BattleArena({
  playerEmoji,
  playerNickname,
  opponentEmoji,
  opponentNickname,
  turns,
  playerMaxHp,
  opponentMaxHp,
  onComplete,
}: Props) {
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1);
  const [subPhase, setSubPhase] = useState<"clash" | "damage" | "hp" | "flavor" | "ko">("clash");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const turn = currentTurnIdx >= 0 && currentTurnIdx < turns.length ? turns[currentTurnIdx] : null;
  const prevTurn = currentTurnIdx > 0 ? turns[currentTurnIdx - 1] : null;

  const playerHp = turn ? turn.playerHp : playerMaxHp;
  const opponentHp = turn ? turn.opponentHp : opponentMaxHp;
  const displayPlayerHp = subPhase === "clash" || subPhase === "damage"
    ? (prevTurn ? prevTurn.playerHp : playerMaxHp)
    : playerHp;
  const displayOpponentHp = subPhase === "clash" || subPhase === "damage"
    ? (prevTurn ? prevTurn.opponentHp : opponentMaxHp)
    : opponentHp;

  const isKo = turn && (turn.playerHp <= 0 || turn.opponentHp <= 0);
  const playerLost = turn ? turn.playerHp <= 0 : false;
  const opponentLost = turn ? turn.opponentHp <= 0 : false;

  useEffect(() => {
    // 첫 턴 시작
    timerRef.current = setTimeout(() => {
      setCurrentTurnIdx(0);
      setSubPhase("clash");
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentTurnIdx < 0) return;
    if (currentTurnIdx >= turns.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }

    const t = turns[currentTurnIdx];

    // 턴 진행 타이밍: clash(0.3s) → damage(0.5s) → hp(0.3s) → flavor(0.3s) → next(0.8s)
    if (subPhase === "clash") {
      timerRef.current = setTimeout(() => setSubPhase("damage"), 300);
    } else if (subPhase === "damage") {
      timerRef.current = setTimeout(() => setSubPhase("hp"), 500);
    } else if (subPhase === "hp") {
      timerRef.current = setTimeout(() => setSubPhase("flavor"), 300);
    } else if (subPhase === "flavor") {
      if (t.playerHp <= 0 || t.opponentHp <= 0) {
        timerRef.current = setTimeout(() => setSubPhase("ko"), 300);
      } else {
        timerRef.current = setTimeout(() => {
          setCurrentTurnIdx((prev) => prev + 1);
          setSubPhase("clash");
        }, 800);
      }
    } else if (subPhase === "ko") {
      timerRef.current = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentTurnIdx, subPhase, turns, onComplete]);

  const playerHpPct = Math.max(0, (displayPlayerHp / playerMaxHp) * 100);
  const opponentHpPct = Math.max(0, (displayOpponentHp / opponentMaxHp) * 100);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      {/* Round 표시 */}
      {turn && (
        <div className="text-center mb-4">
          <span className="text-xs text-gray-400 font-mono">
            Round {turn.turn} — {turn.label}
          </span>
        </div>
      )}

      {/* 이모지 배틀 영역 */}
      <div className="flex items-center justify-between mb-4 px-4">
        {/* 플레이어 */}
        <motion.div
          className="flex flex-col items-center"
          animate={
            subPhase === "clash"
              ? { x: [0, 20, 0] }
              : playerLost && subPhase === "ko"
              ? { opacity: 0.3, scale: 0.8, rotate: 15 }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
            {playerEmoji}
          </div>
          <span className="text-[10px] text-gray-400 font-mono mt-1 max-w-[60px] truncate">
            {playerNickname}
          </span>
        </motion.div>

        {/* VS / KO */}
        <AnimatePresence mode="wait">
          {subPhase === "ko" && isKo ? (
            <motion.span
              key="ko"
              className="text-2xl font-black text-red-400"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              K.O.
            </motion.span>
          ) : (
            <span key="vs" className="text-sm font-black text-gray-600">VS</span>
          )}
        </AnimatePresence>

        {/* 상대 */}
        <motion.div
          className="flex flex-col items-center"
          animate={
            subPhase === "clash"
              ? { x: [0, -20, 0] }
              : opponentLost && subPhase === "ko"
              ? { opacity: 0.3, scale: 0.8, rotate: -15 }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
            {opponentEmoji}
          </div>
          <span className="text-[10px] text-gray-400 font-mono mt-1 max-w-[60px] truncate">
            {opponentNickname}
          </span>
        </motion.div>
      </div>

      {/* 데미지 숫자 */}
      <div className="flex items-center justify-between px-8 h-8 mb-2">
        <AnimatePresence>
          {turn && (subPhase === "damage" || subPhase === "hp" || subPhase === "flavor") && (
            <motion.span
              key={`pdmg-${currentTurnIdx}`}
              className={`font-black ${
                turn.isCritical ? "text-amber-400 text-lg" : "text-white text-sm"
              }`}
              initial={{ opacity: 1, y: 0, scale: turn.isCritical ? 1.3 : 1 }}
              animate={{ opacity: 0, y: -30, scale: 1 }}
              transition={{ duration: turn.isCritical ? 1 : 0.8 }}
            >
              -{turn.playerDmg}
              {turn.isCritical && <span className="text-xs ml-0.5">CRITICAL!</span>}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {turn && (subPhase === "damage" || subPhase === "hp" || subPhase === "flavor") && (
            <motion.span
              key={`odmg-${currentTurnIdx}`}
              className={`font-black ${
                turn.isCritical ? "text-amber-400 text-lg" : "text-white text-sm"
              }`}
              initial={{ opacity: 1, y: 0, scale: turn.isCritical ? 1.3 : 1 }}
              animate={{ opacity: 0, y: -30, scale: 1 }}
              transition={{ duration: turn.isCritical ? 1 : 0.8 }}
            >
              -{turn.opponentDmg}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* HP 바 */}
      <div className="flex gap-3 items-center mb-2">
        {/* 플레이어 HP — 오른쪽 정렬 */}
        <div className="flex-1">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex justify-end">
            <motion.div
              className={`h-full rounded-full ${hpColor(playerHpPct)}`}
              animate={{ width: `${playerHpPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono">{playerNickname}</span>
            <span className="text-[10px] text-gray-500 font-mono">{Math.max(0, displayPlayerHp)}</span>
          </div>
        </div>

        {/* 상대 HP — 왼쪽 정렬 */}
        <div className="flex-1">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${hpColor(opponentHpPct)}`}
              animate={{ width: `${opponentHpPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono">{Math.max(0, displayOpponentHp)}</span>
            <span className="text-[10px] text-gray-500 font-mono">{opponentNickname}</span>
          </div>
        </div>
      </div>

      {/* 플레이버 텍스트 */}
      <AnimatePresence mode="wait">
        {turn && (subPhase === "flavor" || subPhase === "ko") && (
          <motion.p
            key={`flavor-${currentTurnIdx}`}
            className="text-xs text-gray-300 italic text-center mt-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            &ldquo;{turn.flavorText}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/adventure/BattlePanel.tsx

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateOpponent,
  simulateBattle,
  sumStats,
  getBattleAttempts,
  consumeBattleAttempt,
  consumePaidBattleAttempt,
  getWinStreak,
  updateWinStreak,
  getBattleHistory,
  addBattleHistory,
} from "@/lib/battleEngine";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import { grantExp, applyExp } from "@/lib/rpgExp";
import { expForLevel } from "@/lib/rpgConstants";
import { getKSTDateString } from "@/lib/kstDate";
import BattleArena from "@/components/adventure/BattleArena";
import BattleResultView from "@/components/adventure/BattleResultView";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type {
  RpgCharacter,
  RpgStats,
  BattleOpponent,
  BattleResult,
  BattleHistoryEntry,
} from "@/types";

type BattlePhase = "idle" | "matching" | "fighting" | "result";

interface Props {
  character: RpgCharacter;
  totalStats: RpgStats;
  setCharacter: (c: SetCharacterArg) => void;
  onLevelUp: (level: number) => void;
}

export default function BattlePanel({ character, totalStats, setCharacter, onLevelUp }: Props) {
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [opponent, setOpponent] = useState<BattleOpponent | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [attempts, setAttempts] = useState({ used: 0, remaining: 3 });
  const [history, setHistory] = useState<BattleHistoryEntry[]>([]);
  const [streakBonus, setStreakBonus] = useState(0);
  const [matchReveal, setMatchReveal] = useState(0); // 0~4 순차 공개 단계
  const rewardAppliedRef = useRef(false);

  useEffect(() => {
    setAttempts(getBattleAttempts());
    setHistory(getBattleHistory());
  }, []);

  const myCombatPower = sumStats(totalStats);
  const myClass = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;

  // ── 배틀 시작 ──
  const startBattle = useCallback(() => {
    const isFree = attempts.remaining > 0;
    if (!isFree) {
      // 투자석 소모
      if (character.stones < 1) {
        setPhase("idle");
        return;
      }
      consumePaidBattleAttempt();
      setCharacter(prev => ({ ...prev, stones: prev.stones - 1 }));
    } else {
      if (!consumeBattleAttempt()) {
        setPhase("idle");
        return;
      }
    }

    rewardAppliedRef.current = false;
    const opp = generateOpponent(character.level);
    setOpponent(opp);
    setPhase("matching");
    setMatchReveal(0);
    setAttempts(getBattleAttempts());

    // 순차 공개 (0.3s stagger)
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setMatchReveal(step);
      if (step >= 4) {
        clearInterval(interval);
        // 1.5s 후 전투 시작
        setTimeout(() => {
          const result = simulateBattle(totalStats, opp);
          setBattleResult(result);
          setPhase("fighting");
        }, 600);
      }
    }, 300);
  }, [attempts, character, totalStats, setCharacter]);

  // ── 전투 완료 보상 처리 ──
  const handleBattleComplete = useCallback(() => {
    if (rewardAppliedRef.current || !battleResult || !opponent) return;
    rewardAppliedRef.current = true;

    const winner = battleResult.winner;
    const expType = winner === "player" ? "battle_win" : winner === "opponent" ? "battle_lose" : "battle_draw";

    // EXP 부여 (토스트 자동)
    grantExp(expType);

    // 연승 처리
    const { streak, bonusStones } = updateWinStreak(winner === "player");
    void streak;
    setStreakBonus(bonusStones);

    // EXP & 레벨업 적용 — character.exp/level은 함수형 내부에서 참조
    const stoneReward = battleResult.stoneReward + bonusStones;

    setCharacter(prev => {
      const updatedRecord = { ...prev.battleRecord };
      if (winner === "player") updatedRecord.wins++;
      else if (winner === "opponent") updatedRecord.losses++;
      else updatedRecord.draws++;

      const expResult = applyExp(
        prev.exp,
        prev.level,
        battleResult.expReward,
        expForLevel
      );

      if (expResult.leveledUp) {
        onLevelUp(expResult.level);
      }

      return {
        ...prev,
        exp: expResult.exp,
        level: expResult.level,
        stones: prev.stones + stoneReward + expResult.levelsGained,
        battleRecord: updatedRecord,
      };
    });

    // 히스토리 저장
    const entry: BattleHistoryEntry = {
      date: getKSTDateString(),
      winner,
      opponentClassName: opponent.className,
      opponentLevel: opponent.level,
      expReward: battleResult.expReward,
      stoneReward: battleResult.stoneReward + bonusStones,
    };
    addBattleHistory(entry);
    setHistory(getBattleHistory());

    setAttempts(getBattleAttempts());

    setPhase("result");
  }, [battleResult, opponent, setCharacter, onLevelUp]);

  // ── 재시작 / 돌아가기 ──
  const retry = () => {
    const freshAttempts = getBattleAttempts();
    const canRetry = freshAttempts.remaining > 0 || character.stones >= 1;

    if (!canRetry) {
      setBattleResult(null);
      setOpponent(null);
      setStreakBonus(0);
      setPhase("idle");
      setAttempts(freshAttempts);
      setHistory(getBattleHistory());
      return;
    }

    setBattleResult(null);
    setOpponent(null);
    setStreakBonus(0);
    setAttempts(freshAttempts);
    startBattle();
  };

  const goBack = () => {
    setBattleResult(null);
    setOpponent(null);
    setStreakBonus(0);
    setPhase("idle");
    setAttempts(getBattleAttempts());
    setHistory(getBattleHistory());
  };

  const isFreeAvailable = attempts.remaining > 0;
  const canBattle = isFreeAvailable || character.stones >= 1;

  // ── 렌더링 ──
  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        {/* ── idle: 매칭 대기 ── */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* 헤더 */}
            <div className="glass-card rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-black text-white">투자 배틀</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  오늘 전적: {character.battleRecord.wins}승 {character.battleRecord.losses}패
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  남은 횟수: {attempts.remaining}/3
                  {!isFreeAvailable && <span className="text-indigo-400 ml-1">+1석 추가</span>}
                </span>
              </div>
            </div>

            {/* VS 카드 */}
            <div className="glass-card rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between">
                {/* 나 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                    {myClass.emoji}
                  </div>
                  <span className="text-xs font-bold text-white mt-1.5 max-w-[70px] truncate">
                    {character.nickname}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
                  <span className="text-[10px] text-gray-500 font-mono">전투력 {myCombatPower}</span>
                </div>

                <span className="text-xl font-black text-gray-600">VS</span>

                {/* 상대 (???) */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-gray-600">
                    ?
                  </div>
                  <span className="text-xs font-bold text-gray-600 mt-1.5">???</span>
                  <span className="text-[10px] text-gray-600 font-mono">???</span>
                  <span className="text-[10px] text-gray-600 font-mono">???</span>
                </div>
              </div>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={startBattle}
              disabled={!canBattle}
              className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                canBattle
                  ? "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              {isFreeAvailable
                ? "배틀 시작"
                : character.stones >= 1
                ? "투자석 1개 소모하고 배틀"
                : "투자석 부족"}
            </button>

            {/* 히스토리 */}
            {history.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mt-3">
                <h3 className="text-xs font-bold text-gray-400 mb-2">최근 전적</h3>
                <div className="flex flex-col gap-1">
                  {history.map((h, i) => (
                    <div key={i} className="text-xs font-mono flex items-center gap-1.5">
                      <span
                        className={
                          h.winner === "player"
                            ? "text-green-400"
                            : h.winner === "opponent"
                            ? "text-red-400"
                            : "text-amber-400"
                        }
                      >
                        {h.winner === "player" ? "W" : h.winner === "opponent" ? "L" : "D"}
                      </span>
                      <span className="text-gray-500">
                        vs {h.opponentClassName} Lv.{h.opponentLevel}
                      </span>
                      {h.expReward > 0 && (
                        <span className="text-amber-400/60">+{h.expReward}exp</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── matching: 상대 순차 공개 ── */}
        {phase === "matching" && opponent && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                {/* 나 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                    {myClass.emoji}
                  </div>
                  <span className="text-xs font-bold text-white mt-1.5 max-w-[70px] truncate">
                    {character.nickname}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
                  <span className="text-[10px] text-gray-500 font-mono">전투력 {myCombatPower}</span>
                </div>

                <motion.span
                  className="text-xl font-black text-red-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  VS
                </motion.span>

                {/* 상대 — 순차 공개 */}
                <div className="flex flex-col items-center">
                  {matchReveal >= 1 ? (
                    <motion.div
                      className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {opponent.emoji}
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-gray-600">
                      ?
                    </div>
                  )}

                  {matchReveal >= 2 ? (
                    <motion.span
                      className="text-xs font-bold text-white mt-1.5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {opponent.className}
                    </motion.span>
                  ) : (
                    <span className="text-xs font-bold text-gray-600 mt-1.5">???</span>
                  )}

                  {matchReveal >= 3 ? (
                    <motion.span
                      className="text-[10px] text-gray-400 font-mono"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Lv.{opponent.level}
                    </motion.span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono">???</span>
                  )}

                  {matchReveal >= 4 ? (
                    <motion.span
                      className="text-[10px] text-gray-400 font-mono"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      전투력 {opponent.combatPower}
                    </motion.span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono">???</span>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 font-mono mt-4 animate-pulse">
                상대를 찾는 중...
              </p>
            </div>
          </motion.div>
        )}

        {/* ── fighting: 전투 진행 ── */}
        {phase === "fighting" && battleResult && opponent && (
          <motion.div
            key="fighting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <BattleArena
              playerEmoji={myClass.emoji}
              playerNickname={character.nickname}
              opponentEmoji={opponent.emoji}
              opponentNickname={opponent.nickname}
              turns={battleResult.turns}
              playerMaxHp={sumStats(totalStats) * 10}
              opponentMaxHp={sumStats(opponent.stats) * 10}
              onComplete={handleBattleComplete}
            />
          </motion.div>
        )}

        {/* ── result: 결과 화면 ── */}
        {phase === "result" && battleResult && opponent && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <BattleResultView
              result={battleResult}
              opponent={opponent}
              onRetry={retry}
              onBack={goBack}
              streakBonus={streakBonus}
              battleRecord={character.battleRecord}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/adventure/BattleResultView.tsx

```tsx
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { BattleResult, BattleOpponent, BattleRecord } from "@/types";

interface Props {
  result: BattleResult;
  opponent: BattleOpponent;
  onRetry: () => void;
  onBack: () => void;
  streakBonus: number;
  battleRecord: BattleRecord;
}

function VictoryParticles() {
  const particles = useMemo(() => {
    const colors = ["bg-amber-400", "bg-yellow-300", "bg-orange-400"];
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random(),
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute w-2 h-2 rounded-full ${p.color}`}
          style={{ left: `${p.x}%` }}
          initial={{ y: -50, opacity: 1 }}
          animate={{ y: 300, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

export default function BattleResultView({
  result,
  opponent,
  onRetry,
  onBack,
  streakBonus,
  battleRecord,
}: Props) {
  const isWin = result.winner === "player";
  const isLose = result.winner === "opponent";
  const isDraw = result.winner === "draw";

  const totalWins = battleRecord.wins;
  const totalLosses = battleRecord.losses;
  const totalGames = totalWins + totalLosses + battleRecord.draws;
  const winPct = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <motion.div
      className="relative"
      animate={isLose ? { x: [0, -5, 5, -3, 3, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* 패배 빨간 flash */}
      {isLose && (
        <motion.div
          className="absolute inset-0 bg-red-500/5 rounded-2xl"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* 승리 파티클 */}
      {isWin && <VictoryParticles />}

      <div className="glass-card rounded-2xl p-6 text-center relative">
        {/* 이모지 */}
        <motion.div
          className="text-5xl mb-2"
          initial={isWin ? { scale: 0.3 } : { scale: 0.8 }}
          animate={
            isLose
              ? { scale: 1, x: [0, -5, 5, -3, 3, 0] }
              : { scale: 1 }
          }
          transition={isWin ? { type: "spring", stiffness: 300, damping: 15 } : { duration: 0.4 }}
        >
          {isWin ? "🏆" : isLose ? "💀" : "⚖️"}
        </motion.div>

        {/* 결과 텍스트 */}
        <h3
          className={`text-xl font-black mb-3 ${
            isWin ? "text-amber-400" : isLose ? "text-gray-400" : "text-amber-400"
          }`}
        >
          {isWin ? "승리!" : isLose ? "패배..." : "무승부"}
        </h3>

        {/* 보상 카드 */}
        {isWin || isDraw ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 font-mono mb-1">EXP</div>
              <div className="text-sm font-black text-amber-300">
                +<AnimatedNumber value={result.expReward} format={(n) => Math.round(n).toString()} />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 font-mono mb-1">투자석</div>
              <div className="text-sm font-black text-indigo-300">
                +<AnimatedNumber value={result.stoneReward} format={(n) => Math.round(n).toString()} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-3 text-center mb-3">
            <div className="text-[10px] text-gray-400 font-mono mb-1">EXP</div>
            <div className="text-sm font-black text-amber-300">
              +<AnimatedNumber value={result.expReward} format={(n) => Math.round(n).toString()} />
            </div>
          </div>
        )}

        {/* 연승 보너스 */}
        {streakBonus > 0 && (
          <motion.div
            className="text-xs font-bold text-amber-400 mb-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            3연승 보너스! +{streakBonus} 투자석
          </motion.div>
        )}

        {/* 전적 */}
        <p className="text-xs text-gray-400 font-mono">
          전적: {totalWins}승 {totalLosses}패 ({winPct}%)
        </p>

        {/* 상대 정보 */}
        <p className="text-[10px] text-gray-600 font-mono mt-1">
          vs {opponent.emoji} {opponent.className} Lv.{opponent.level}
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
        >
          다시 배틀
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-all"
        >
          돌아가기
        </button>
      </div>
    </motion.div>
  );
}

```

### components/adventure/CharacterCreation.tsx

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import { INVESTOR_TYPES, type InvestorTypeKey } from "@/lib/investorQuiz";
import type { RpgClassKey } from "@/types";

interface Props {
  onComplete: (classKey: RpgClassKey, nickname: string) => void;
  recommendedClass?: InvestorTypeKey | null;
  isLoggedIn: boolean;
}

const CLASS_KEYS: RpgClassKey[] = [
  "visionary", "dealmaker", "sage", "strategist",
  "hunter", "observer", "contrarian", "explorer",
];

export default function CharacterCreation({ onComplete, recommendedClass, isLoggedIn }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClass, setSelectedClass] = useState<RpgClassKey | null>(null);
  const [nickname, setNickname] = useState("");

  const handleClassSelect = (key: RpgClassKey) => {
    setSelectedClass(key);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!selectedClass) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) return;
    onComplete(selectedClass, trimmed);
  };

  return (
    <div className="glass-card p-5 rounded-2xl">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-lg font-black text-white mb-1">클래스를 선택하세요</h2>
            <p className="text-xs text-gray-400 font-mono mb-4">투자 스타일에 맞는 RPG 클래스를 골라보세요</p>

            {recommendedClass && (
              <div className="mb-4 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                <p className="text-xs text-indigo-300 font-mono">
                  투자성향 테스트 결과 추천: <span className="font-bold text-indigo-200">{RPG_CLASSES[recommendedClass]?.emoji} {RPG_CLASSES[recommendedClass]?.className}</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {CLASS_KEYS.map((key, i) => {
                const cls = RPG_CLASSES[key];
                const isRecommended = key === recommendedClass;
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleClassSelect(key)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isRecommended
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-mono">추천</span>
                    )}
                    <div className="text-2xl mb-1">{cls.emoji}</div>
                    <div className="text-sm font-bold text-white">{cls.className}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cls.subtitle}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {INVESTOR_TYPES[key].character}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button
              onClick={() => setStep(1)}
              className="text-xs text-gray-400 hover:text-white transition-colors font-mono mb-3"
            >
              ← 클래스 다시 선택
            </button>

            {selectedClass && (
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-3xl">{RPG_CLASSES[selectedClass]?.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-white">{RPG_CLASSES[selectedClass]?.className}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{RPG_CLASSES[selectedClass]?.subtitle}</div>
                </div>
              </div>
            )}

            <h2 className="text-lg font-black text-white mb-1">닉네임을 입력하세요</h2>
            <p className="text-xs text-gray-400 font-mono mb-4">2~12자, 투자 모험에서 사용할 이름입니다</p>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="닉네임 입력..."
              maxLength={12}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none text-sm font-mono"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-500 font-mono">{nickname.trim().length}/12</span>
              {!isLoggedIn && (
                <span className="text-[10px] text-amber-400/80 font-mono">Google 로그인하면 데이터가 저장됩니다</span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={nickname.trim().length < 2}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm transition-colors"
            >
              모험 시작
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/adventure/CharacterProfile.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import type { RpgCharacter, RpgStats } from "@/types";

interface Props {
  character: RpgCharacter;
  totalStats: RpgStats;
  levelTitle: string;
  expNeeded: number;
}

export default function CharacterProfile({ character, totalStats, levelTitle, expNeeded }: Props) {
  const classInfo = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;
  const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
  const expPct = expNeeded > 0 ? Math.min((character.exp / expNeeded) * 100, 100) : 0;
  return (
    <div className="glass-card p-5 rounded-2xl">
      {/* 클래스 + 기본 정보 */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl"
        >
          {classInfo.emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">{levelTitle}</span>
            <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5 truncate">{character.nickname}</h3>
          <p className="text-[10px] text-gray-400 font-mono">{classInfo.className} · {classInfo.subtitle}</p>
        </div>
      </div>

      {/* EXP 바 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-gray-400">EXP</span>
          <span className="text-gray-500">{character.exp} / {expNeeded}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${expPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>
      </div>

      {/* 전투력 + 투자석 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2.5 rounded-xl bg-white/5 text-center">
          <div className="text-[10px] text-gray-500 font-mono">전투력</div>
          <div className="text-sm font-black text-white mt-0.5">{combatPower}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 text-center">
          <div className="text-[10px] text-gray-500 font-mono">투자석</div>
          <div className="text-sm font-black text-amber-400 mt-0.5">{character.stones}</div>
        </div>
      </div>
    </div>
  );
}

```

### components/adventure/EnhancePanel.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SLOT_LABELS,
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
  STAT_LABELS,
} from "@/lib/rpgConstants";
import {
  getEnhanceCost,
  getSuccessRate,
  canEnhance,
  executeEnhance,
  MAX_ENHANCE_LEVEL,
} from "@/lib/enhanceEngine";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentSlotKey } from "@/types";

interface Props {
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
}

interface EnhanceLog {
  id: number;
  message: string;
  success: boolean;
}

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

let logId = 0;

export default function EnhancePanel({ character, setCharacter }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotKey>("weapon");
  const [logs, setLogs] = useState<EnhanceLog[]>([]);
  const [animState, setAnimState] = useState<"idle" | "shaking" | "success" | "fail">("idle");

  const item = character.equipment?.[selectedSlot] ?? null;

  const handleEnhance = useCallback(() => {
    if (!item || !canEnhance(item)) return;
    const cost = getEnhanceCost(item.enhanceLevel);
    if (character.stones < cost) return;

    // 진동 애니메이션 시작
    setAnimState("shaking");

    setTimeout(() => {
      const result = executeEnhance(item);
      setCharacter(prev => ({
        ...prev,
        stones: prev.stones - cost,
        equipment: {
          ...(prev.equipment ?? {}),
          [selectedSlot]: {
            ...item,
            enhanceLevel: result.newLevel,
            bonus: result.newBonus,
          },
        },
      }));
      setAnimState(result.success ? "success" : "fail");
      setLogs((prev) => [
        { id: ++logId, message: `${item.name} ${result.message}`, success: result.success },
        ...prev.slice(0, 4),
      ]);

      setTimeout(() => setAnimState("idle"), 600);
    }, 800);
  }, [item, selectedSlot, setCharacter]);

  const cost = item ? getEnhanceCost(item.enhanceLevel) : 0;
  const rate = item ? getSuccessRate(item.enhanceLevel) : 0;
  const isMaxed = item ? !canEnhance(item) : false;
  const canAfford = character.stones >= cost;

  // 실패 페널티 설명
  const penaltyText = !item
    ? ""
    : item.enhanceLevel <= 3
      ? "실패 시 레벨 유지"
      : item.enhanceLevel <= 6
        ? "실패 시 50% 확률로 -1"
        : "실패 시 -1 확정";

  return (
    <div className="flex flex-col gap-3">
      {/* 투자석 잔고 */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💎</span>
          <span className="text-sm font-bold text-white">투자석</span>
        </div>
        <span className="text-lg font-black text-indigo-400 font-mono">{character.stones}</span>
      </div>

      {/* 슬롯 선택 탭 */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5">
        {SLOTS.map((slot) => {
          const slotInfo = SLOT_LABELS[slot];
          const slotItem = character.equipment?.[slot];
          return (
            <button
              key={slot}
              onClick={() => setSelectedSlot(slot)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                selectedSlot === slot ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {selectedSlot === slot && (
                <motion.div
                  layoutId="enhance-slot"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative text-base">{slotInfo.emoji}</span>
              <span className="relative text-[10px] font-bold">{slotInfo.label}</span>
              {slotItem && slotItem.enhanceLevel > 0 && (
                <span className="relative text-[10px] font-mono text-indigo-400">+{slotItem.enhanceLevel}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 장비 카드 */}
      {item && (
        <motion.div
          animate={
            animState === "shaking"
              ? { x: [0, -3, 3, -3, 3, -2, 2, 0], transition: { duration: 0.8, repeat: Infinity } }
              : animState === "success"
                ? { scale: [1, 1.05, 1], transition: { duration: 0.4 } }
                : animState === "fail"
                  ? { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.4 } }
                  : { x: 0, scale: 1 }
          }
          className={`glass-card p-5 rounded-2xl border transition-shadow ${GRADE_BG_COLORS[item.grade]} ${
            animState === "success" ? "shadow-lg" : ""
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white truncate">{item.name}</div>
              <div className={`text-xs font-mono ${GRADE_COLORS[item.grade]}`}>
                {GRADE_LABELS[item.grade]}
                {item.enhanceLevel > 0 && (
                  <span className="text-indigo-400 ml-1">+{item.enhanceLevel}</span>
                )}
                {isMaxed && <span className="text-amber-400 ml-1">(MAX)</span>}
              </div>
            </div>
          </div>

          {/* 보너스 스탯 */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(item.bonus).map(([k, v]) =>
              v ? (
                <span
                  key={k}
                  className={`text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 ${
                    STAT_LABELS[k as keyof typeof STAT_LABELS]?.color ?? "text-gray-400"
                  }`}
                >
                  {STAT_LABELS[k as keyof typeof STAT_LABELS]?.label ?? k} +{v}
                </span>
              ) : null
            )}
          </div>
        </motion.div>
      )}

      {/* 강화 미리보기 */}
      {item && !isMaxed && (
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">강화 비용</span>
            <span className={`font-mono font-bold ${canAfford ? "text-indigo-400" : "text-red-400"}`}>
              💎 {cost}개
              {!canAfford && <span className="text-red-400 ml-1">(부족)</span>}
            </span>
          </div>

          {/* 성공률 바 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">성공률</span>
              <span className={`font-mono font-bold ${
                rate >= 70 ? "text-green-400" : rate >= 40 ? "text-amber-400" : "text-red-400"
              }`}>
                {rate}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono">{penaltyText}</div>
        </div>
      )}

      {/* 강화 버튼 */}
      {item && (
        <button
          onClick={handleEnhance}
          disabled={isMaxed || !canAfford || animState !== "idle"}
          className={`w-full py-3.5 rounded-xl text-sm font-black transition-all ${
            isMaxed
              ? "bg-amber-500/20 text-amber-400 cursor-default"
              : !canAfford || animState !== "idle"
                ? "bg-white/5 text-gray-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]"
          }`}
        >
          {animState === "shaking" ? (
            <span className="animate-pulse">강화 중...</span>
          ) : isMaxed ? (
            "최대 강화 달성"
          ) : !canAfford ? (
            "투자석 부족"
          ) : (
            `+${item.enhanceLevel} → +${item.enhanceLevel + 1} 강화하기`
          )}
        </button>
      )}

      {/* 강화 로그 */}
      <AnimatePresence>
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-1"
          >
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg ${
                  log.success
                    ? "bg-indigo-500/10 text-indigo-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {log.success ? "✓" : "✗"} {log.message}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

### components/adventure/EquipmentSlots.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import { SLOT_LABELS, GRADE_COLORS, GRADE_BG_COLORS, GRADE_LABELS } from "@/lib/rpgConstants";
import type { EquipmentSlotKey, EquipmentItem } from "@/types";

interface Props {
  equipment?: Record<EquipmentSlotKey, EquipmentItem | null> | null;
}

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

export default function EquipmentSlots({ equipment }: Props) {
  if (!equipment) return null;
  return (
    <div className="glass-card p-5 rounded-2xl">
      <h3 className="text-sm font-black text-white mb-3">장비</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {SLOTS.map((slot, i) => {
          const item = equipment[slot];
          const slotInfo = SLOT_LABELS[slot];

          return (
            <motion.div
              key={slot}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`p-3 rounded-xl border ${
                item ? GRADE_BG_COLORS[item.grade] : "border-white/10 bg-white/5"
              }`}
            >
              {item ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className={`text-[10px] font-mono ${GRADE_COLORS[item.grade]}`}>
                        {GRADE_LABELS[item.grade]}
                        {item.enhanceLevel > 0 && ` +${item.enhanceLevel}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {Object.entries(item.bonus).map(([k, v]) => (
                      v ? <span key={k} className="mr-1.5">{k === "attack" ? "공" : k === "defense" ? "방" : k === "intelligence" ? "지" : k === "stamina" ? "체" : "운"}+{v}</span> : null
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-gray-600">
                  <span className="text-lg">{slotInfo.emoji}</span>
                  <span className="text-[10px] font-mono mt-1">{slotInfo.label} · 비어있음</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

```

### components/adventure/GachaPanel.tsx

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
} from "@/lib/rpgConstants";
import {
  GRADE_RATES,
  SINGLE_COST,
  MULTI_COST,
  MULTI_COUNT,
  pullGacha,
} from "@/lib/gachaEngine";
import GachaReveal from "./GachaReveal";
import GachaResult from "./GachaResult";
import type { GachaItem } from "@/lib/gachaPool";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentGrade } from "@/types";

interface Props {
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
}

type Phase = "idle" | "revealing" | "result";

const GRADE_ORDER: EquipmentGrade[] = ["common", "uncommon", "rare", "epic", "legendary"];
const HISTORY_KEY = "ovision_gacha_history";
const MAX_HISTORY = 20;
const DISPLAY_HISTORY = 10;

interface HistoryEntry {
  emoji: string;
  grade: EquipmentGrade;
  name: string;
}

export default function GachaPanel({ character, setCharacter }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<GachaItem[]>([]);
  const [showRates, setShowRates] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // localStorage에서 히스토리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveHistory = useCallback((newItems: GachaItem[]) => {
    const entries: HistoryEntry[] = newItems.map((item) => ({
      emoji: item.emoji,
      grade: item.grade,
      name: item.name,
    }));
    setHistory((prev) => {
      const updated = [...entries, ...prev].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const canAffordSingle = character.stones >= SINGLE_COST;
  const canAffordMulti = character.stones >= MULTI_COST;

  const handlePull = useCallback((count: 1 | 5) => {
    if (phase !== "idle") return;
    const cost = count === 1 ? SINGLE_COST : MULTI_COST;
    if (character.stones < cost) return;

    setCharacter(prev => ({ ...prev, stones: prev.stones - cost }));
    const items = pullGacha(count);
    setResults(items);
    setPhase("revealing");
  }, [phase, character.stones, setCharacter]);

  const handleRevealComplete = useCallback(() => {
    saveHistory(results);
    setPhase("result");
  }, [results, saveHistory]);

  const handleResultClose = useCallback(() => {
    setPhase("idle");
    setResults([]);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* 투자석 잔고 */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💎</span>
          <span className="text-sm font-bold text-white">투자석</span>
        </div>
        <span className="text-lg font-black text-indigo-400 font-mono">{character.stones}</span>
      </div>

      {/* 뽑기 버튼 / 확률표 / 히스토리 (idle 시) */}
      {phase === "idle" && (
        <>
          {/* 뽑기 버튼 2개 */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePull(1)}
                disabled={!canAffordSingle}
                className={`py-4 rounded-xl text-sm font-black transition-all ${
                  canAffordSingle
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                <div>🎰 1회 뽑기</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-70">💎 {SINGLE_COST}</div>
              </button>
              <button
                onClick={() => handlePull(5)}
                disabled={!canAffordMulti}
                className={`py-4 rounded-xl text-sm font-black transition-all ${
                  canAffordMulti
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white active:scale-[0.98]"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                <div>🎰 {MULTI_COUNT}회 뽑기</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-70">
                  💎 <span className="line-through text-gray-500">{SINGLE_COST * MULTI_COUNT}</span>{" "}
                  <span className="text-white font-bold">{MULTI_COST}</span>
                </div>
              </button>
            </div>

            {/* 확률표 토글 */}
            <div className="mt-3">
              <button
                onClick={() => setShowRates(!showRates)}
                className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-gray-400 transition-colors font-mono"
              >
                <span>확률표 보기</span>
                <span className={`transition-transform ${showRates ? "rotate-180" : ""}`}>▼</span>
              </button>
              <AnimatePresence>
                {showRates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/5 rounded-xl p-3 mt-2 space-y-1">
                      {GRADE_ORDER.map((grade) => (
                        <div key={grade} className="flex items-center justify-between text-[10px] font-mono">
                          <span className={GRADE_COLORS[grade]}>{GRADE_LABELS[grade]}</span>
                          <span className="text-gray-500">{GRADE_RATES[grade]}%</span>
                        </div>
                      ))}
                      <p className="text-[9px] text-gray-600 font-mono pt-1">
                        {MULTI_COUNT}연뽑: 고급 이상 1개 보장
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 최근 획득 히스토리 */}
          {history.length > 0 && (
            <div className="glass-card p-5 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-mono mb-2">최근 획득</p>
              <div className="overflow-x-auto flex gap-1.5">
                {history.slice(0, DISPLAY_HISTORY).map((entry, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${GRADE_BG_COLORS[entry.grade]}`}
                    title={entry.name}
                  >
                    <span className="text-base">{entry.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 연출 오버레이 */}
      <AnimatePresence>
        {phase === "revealing" && results.length > 0 && (
          <GachaReveal items={results} onComplete={handleRevealComplete} />
        )}
      </AnimatePresence>

      {/* 결과 카드 */}
      {phase === "result" && results.length > 0 && (
        <GachaResult
          items={results}
          character={character}
          setCharacter={setCharacter}
          onClose={handleResultClose}
        />
      )}
    </div>
  );
}

```

### components/adventure/GachaResult.tsx

```tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
  SLOT_LABELS,
  STAT_LABELS,
} from "@/lib/rpgConstants";
import { gachaItemToEquipment, compareWithCurrent, type StatDiff } from "@/lib/gachaEngine";
import type { GachaItem } from "@/lib/gachaPool";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentItem } from "@/types";

interface Props {
  items: GachaItem[];
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
  onClose: () => void;
}

const GRADE_GLOW: Record<string, string> = {
  common: "",
  uncommon: "shadow-[0_0_20px_rgba(34,197,94,0.15)]",
  rare: "shadow-[0_0_30px_rgba(59,130,246,0.2)]",
  epic: "shadow-[0_0_40px_rgba(168,85,247,0.2)]",
  legendary: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
};

export default function GachaResult({ items, character, setCharacter, onClose }: Props) {
  const isSingle = items.length === 1;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(isSingle ? 0 : null);
  const [handled, setHandled] = useState<Set<number>>(new Set());

  const selectedItem = selectedIdx !== null ? items[selectedIdx] : null;
  const equipment = selectedItem ? gachaItemToEquipment(selectedItem) : null;
  const currentEquipped = selectedItem ? character.equipment?.[selectedItem.slot] ?? null : null;
  const diffs = equipment ? compareWithCurrent(currentEquipped, equipment) : [];

  const handleEquip = useCallback((item: GachaItem, idx: number) => {
    const eq = gachaItemToEquipment(item);
    setCharacter(prev => ({
      ...prev,
      equipment: { ...(prev.equipment ?? {}), [item.slot]: eq },
    }));
    const next = new Set(handled);
    next.add(idx);
    setHandled(next);

    if (isSingle) {
      onClose();
    } else {
      setSelectedIdx(null);
    }
  }, [setCharacter, handled, isSingle, onClose]);

  const handleKeep = useCallback((idx: number) => {
    const next = new Set(handled);
    next.add(idx);
    setHandled(next);

    if (isSingle) {
      onClose();
    } else {
      setSelectedIdx(null);
    }
  }, [handled, isSingle, onClose]);

  const allHandled = handled.size === items.length;

  // ── 1회 뽑기 결과 ──
  if (isSingle && selectedItem && equipment) {
    return (
      <SingleResult
        item={selectedItem}
        equipment={equipment}
        currentEquipped={currentEquipped}
        diffs={diffs}
        onEquip={() => handleEquip(selectedItem, 0)}
        onKeep={() => handleKeep(0)}
      />
    );
  }

  // ── 5회 뽑기 결과 ──
  return (
    <div className="flex flex-col gap-3">
      <div className="glass-card p-5 rounded-2xl">
        <p className="text-sm font-bold text-white text-center mb-4">5회 뽑기 결과</p>

        {/* 미니 카드 가로 배열 */}
        <div className="flex gap-2 justify-center overflow-x-auto pb-2">
          {items.map((item, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              onClick={() => !handled.has(idx) && setSelectedIdx(idx)}
              className={`w-14 h-20 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all ${
                GRADE_BG_COLORS[item.grade]
              } ${
                handled.has(idx) ? "opacity-30" : selectedIdx === idx ? "ring-2 ring-indigo-400 scale-105" : "hover:scale-105"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[8px] font-mono ${GRADE_COLORS[item.grade]}`}>
                {GRADE_LABELS[item.grade]}
              </span>
            </motion.button>
          ))}
        </div>

        {selectedIdx === null && !allHandled && (
          <p className="text-[10px] text-gray-500 text-center mt-2 font-mono">
            탭해서 상세 보기
          </p>
        )}
      </div>

      {/* 선택된 아이템 상세 */}
      <AnimatePresence mode="wait">
        {selectedIdx !== null && selectedItem && equipment && (
          <motion.div
            key={`detail-${selectedIdx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SingleResult
              item={selectedItem}
              equipment={equipment}
              currentEquipped={currentEquipped}
              diffs={diffs}
              onEquip={() => handleEquip(selectedItem, selectedIdx)}
              onKeep={() => handleKeep(selectedIdx)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 닫기 버튼 (전부 처리 완료 시) */}
      {allHandled && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
        >
          닫기
        </motion.button>
      )}

      {/* 남은 것 전부 보관 */}
      {!allHandled && handled.size > 0 && selectedIdx === null && (
        <button
          onClick={() => {
            const next = new Set(handled);
            items.forEach((_, idx) => next.add(idx));
            setHandled(next);
          }}
          className="w-full py-2.5 rounded-xl text-xs font-mono text-gray-500 hover:text-gray-400 transition-colors"
        >
          나머지 전부 보관하기
        </button>
      )}
    </div>
  );
}

// ── 단일 결과 카드 ──
function SingleResult({
  item,
  equipment,
  currentEquipped,
  diffs,
  onEquip,
  onKeep,
}: {
  item: GachaItem;
  equipment: EquipmentItem;
  currentEquipped: EquipmentItem | null;
  diffs: StatDiff[];
  onEquip: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`glass-card rounded-2xl p-6 ${GRADE_GLOW[item.grade]}`}>
        {/* 등급 제목 */}
        <p className={`text-sm font-bold text-center mb-3 ${GRADE_COLORS[item.grade]}`}>
          새로운 장비!
        </p>

        {/* 이모지 + 이름 */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <motion.span
            className="text-5xl"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {item.emoji}
          </motion.span>
          <span className="text-base font-black text-white">{item.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${GRADE_COLORS[item.grade]}`}>
              {GRADE_LABELS[item.grade]}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {SLOT_LABELS[item.slot]?.label}
            </span>
          </div>
        </div>

        {/* 스탯 카드 */}
        <div className={`rounded-xl border p-3 mb-4 ${GRADE_BG_COLORS[item.grade]}`}>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(equipment.bonus).map(([k, v]) =>
              v ? (
                <span
                  key={k}
                  className={`text-xs font-mono ${
                    STAT_LABELS[k as keyof typeof STAT_LABELS]?.color ?? "text-gray-400"
                  }`}
                >
                  {STAT_LABELS[k as keyof typeof STAT_LABELS]?.label ?? k} +{v}
                </span>
              ) : null
            )}
          </div>
        </div>

        {/* 현재 장비 비교 */}
        {currentEquipped && (
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-mono">
                현재 {SLOT_LABELS[item.slot]?.label}: {currentEquipped.name}
                {currentEquipped.enhanceLevel > 0 && ` +${currentEquipped.enhanceLevel}`}
              </span>
            </div>
            {diffs.map((d) => (
              <div key={d.stat} className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className={STAT_LABELS[d.stat]?.color ?? "text-gray-400"}>
                  {STAT_LABELS[d.stat]?.label}
                </span>
                <span className="text-gray-500">{d.current}</span>
                <span className="text-gray-600">→</span>
                <span className="text-white">{d.incoming}</span>
                <span className={d.diff > 0 ? "text-green-400" : d.diff < 0 ? "text-red-400" : "text-gray-500"}>
                  ({d.diff > 0 ? "+" : ""}{d.diff})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 강화 경고 */}
        {currentEquipped && currentEquipped.enhanceLevel > 0 && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-[10px] text-amber-400 font-mono">
              현재 장비가 +{currentEquipped.enhanceLevel} 강화 상태입니다. 교체 시 초기화됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onEquip}
          className="flex-1 py-2.5 px-6 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98] transition-all"
        >
          장착하기
        </button>
        <button
          onClick={onKeep}
          className="flex-1 py-2.5 px-6 rounded-xl text-sm bg-white/10 hover:bg-white/15 text-gray-300 active:scale-[0.98] transition-all"
        >
          보관하기
        </button>
      </div>
    </div>
  );
}

```

### components/adventure/GachaReveal.tsx

```tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GRADE_COLORS } from "@/lib/rpgConstants";
import type { GachaItem } from "@/lib/gachaPool";
import type { EquipmentGrade } from "@/types";

interface Props {
  items: GachaItem[];
  onComplete: () => void;
}

const GRADE_PRIORITY: Record<EquipmentGrade, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const FLASH_COLORS: Partial<Record<EquipmentGrade, string>> = {
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-amber-500",
};

const RING_HEX: Record<EquipmentGrade, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#a78bfa",
  legendary: "#fbbf24",
};

const GRADE_DURATION: Record<EquipmentGrade, number> = {
  common: 600,
  uncommon: 800,
  rare: 1200,
  epic: 1800,
  legendary: 2500,
};

export default function GachaReveal({ items, onComplete }: Props) {
  const completedRef = useRef(false);
  const safeComplete = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };
  const isMulti = items.length > 1;

  // 5연뽑: 등급순 정렬 (common → legendary)
  const sorted = useMemo(() => {
    if (!isMulti) return items;
    return [...items].sort((a, b) => GRADE_PRIORITY[a.grade] - GRADE_PRIORITY[b.grade]);
  }, [items, isMulti]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardPhase, setCardPhase] = useState<"wait" | "shake" | "flash" | "flip" | "done">("wait");

  const currentItem = sorted[currentIdx];
  const isLastCard = currentIdx === sorted.length - 1;
  const useFullAnimation = !isMulti || isLastCard;
  const grade = currentItem.grade;

  // 각 카드 연출 타이머
  useEffect(() => {
    if (!currentItem) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (!useFullAnimation) {
      // 간소화: flip만
      setCardPhase("flip");
      timers.push(setTimeout(() => {
        setCardPhase("done");
        timers.push(setTimeout(() => {
          if (currentIdx < sorted.length - 1) {
            setCurrentIdx((prev) => prev + 1);
            setCardPhase("wait");
          }
        }, 200));
      }, 500));
    } else {
      // 풀 연출
      let elapsed = 0;

      if (grade === "legendary") {
        setCardPhase("shake");
        timers.push(setTimeout(() => setCardPhase("flash"), 400));
        elapsed = 400;
      } else if (grade === "epic" || grade === "rare") {
        setCardPhase("flash");
      } else {
        setCardPhase("flip");
      }

      if (grade === "legendary" || grade === "epic" || grade === "rare") {
        timers.push(setTimeout(() => setCardPhase("flip"), elapsed + 300));
      }

      const totalDuration = GRADE_DURATION[grade];
      timers.push(setTimeout(() => {
        setCardPhase("done");
        timers.push(setTimeout(() => {
          if (currentIdx < sorted.length - 1) {
            setCurrentIdx((prev) => prev + 1);
            setCardPhase("wait");
          } else {
            safeComplete();
          }
        }, 300));
      }, totalDuration));
    }

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, currentItem, grade, useFullAnimation, sorted.length]);

  // 5연뽑 간소화 카드의 마지막 전 카드가 끝나면 다음으로 이동 처리는 위에서 함
  // 마지막 카드 연출 후 onComplete 호출도 위에서 함

  const showFlash = (cardPhase === "flash" || cardPhase === "flip" || cardPhase === "done") && FLASH_COLORS[grade] && useFullAnimation;
  const showRings = (cardPhase === "flip" || cardPhase === "done") && GRADE_PRIORITY[grade] >= 2 && useFullAnimation;
  const showParticles = (cardPhase === "flip" || cardPhase === "done") && GRADE_PRIORITY[grade] >= 3 && useFullAnimation;
  const particleCount = grade === "legendary" ? 12 : 8;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 멀티 진행 표시 */}
      {isMulti && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sorted.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx < currentIdx ? "bg-white/30" : idx === currentIdx ? "bg-indigo-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      )}

      {/* 배경 flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key={`flash-${currentIdx}`}
            className={`fixed inset-0 ${FLASH_COLORS[grade]}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* 화면 shake 컨테이너 */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={
          cardPhase === "shake" && grade === "legendary"
            ? { x: [0, -4, 4, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.4 }}
      >
        {/* Ring pulse */}
        <AnimatePresence>
          {showRings && (
            <>
              {[0, 1].map((i) => (
                <motion.div
                  key={`ring-${currentIdx}-${i}`}
                  className="absolute w-32 h-44 rounded-2xl border-2 pointer-events-none"
                  style={{ borderColor: RING_HEX[grade] }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.3, repeat: 1 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* 파티클 */}
        {showParticles && (
          <Particles count={particleCount} color={RING_HEX[grade]} />
        )}

        {/* 카드 */}
        <div className="relative" style={{ perspective: 600 }}>
          <motion.div
            key={`card-${currentIdx}`}
            className="w-32 h-44 relative"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotateY: 180 }}
            animate={{
              rotateY: cardPhase === "flip" || cardPhase === "done" ? 0 : 180,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* 앞면 */}
            <div
              className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center gap-2 backface-hidden ${gradeCardBg(grade)}`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-4xl">{currentItem.emoji}</span>
              <span className="text-xs font-black text-white text-center px-2 leading-tight">
                {currentItem.name}
              </span>
              <span className={`text-[10px] font-mono ${GRADE_COLORS[grade]}`}>
                {gradeLabel(grade)}
              </span>
            </div>
            {/* 뒷면 */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-900 to-gray-900 border border-white/10 flex items-center justify-center backface-hidden"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="text-4xl text-white/20 font-black">?</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 탭해서 스킵 */}
      <button
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 font-mono"
        onClick={safeComplete}
      >
        탭해서 스킵
      </button>
    </motion.div>
  );
}

// ── 파티클 ──
function Particles({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i + (Math.random() * 30 - 15);
      const distance = 60 + Math.random() * 40;
      const rad = (angle * Math.PI) / 180;
      return { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance };
    });
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ── 등급별 카드 배경 ──
function gradeCardBg(grade: EquipmentGrade): string {
  switch (grade) {
    case "common": return "border-gray-600 bg-gray-800";
    case "uncommon": return "border-green-600 bg-green-900/60";
    case "rare": return "border-blue-600 bg-blue-900/60";
    case "epic": return "border-purple-600 bg-purple-900/60";
    case "legendary": return "border-amber-500 bg-amber-900/60";
  }
}

function gradeLabel(grade: EquipmentGrade): string {
  const labels: Record<EquipmentGrade, string> = {
    common: "일반",
    uncommon: "고급",
    rare: "희귀",
    epic: "영웅",
    legendary: "전설",
  };
  return labels[grade];
}

```

### components/adventure/StatsPanel.tsx

```tsx
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

```

## components/chart-game/

### components/chart-game/GameChart.tsx

```tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { GameCandle } from "@/types";

interface Props {
  visibleCandles: GameCandle[];
  hiddenCandles: GameCandle[];
  phase: "guessing" | "revealing" | "result" | "gameover";
  onRevealComplete?: () => void;
}

export function GameChart({ visibleCandles, hiddenCandles, phase, onRevealComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [chartReady, setChartReady] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Normalize candles: shift prices so first visible candle starts at 100
  const normalizeCandles = useCallback((candles: GameCandle[]) => {
    if (candles.length === 0) return [];
    const base = candles[0].open;
    if (base === 0) return candles;
    const ratio = 100 / base;
    return candles.map((c) => ({
      time: c.time,
      open: Math.round(c.open * ratio * 100) / 100,
      high: Math.round(c.high * ratio * 100) / 100,
      low: Math.round(c.low * ratio * 100) / 100,
      close: Math.round(c.close * ratio * 100) / 100,
    }));
  }, []);

  // Create chart when visible candles change (new round)
  useEffect(() => {
    if (!containerRef.current || visibleCandles.length === 0) return;

    setChartReady(false);
    let cancelled = false;

    (async () => {
      const { createChart, CandlestickSeries } = await import("lightweight-charts");
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;

      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }

      const chart = createChart(container, {
        width: container.clientWidth,
        height: Math.min(container.clientWidth * 0.6, 360),
        layout: {
          background: { color: "#0a0a0a" },
          textColor: "#6b7280",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.03)" },
          horzLines: { color: "rgba(255,255,255,0.03)" },
        },
        rightPriceScale: {
          visible: false,
          borderColor: "rgba(255,255,255,0.1)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: false,
        },
        crosshair: { mode: 0 },
      });

      chartRef.current = chart;

      const normalized = normalizeCandles(visibleCandles);

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });

      series.setData(normalized.map((c) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));

      candleSeriesRef.current = series;
      chart.timeScale().fitContent();

      // Resize handler
      const ro = new ResizeObserver(() => {
        if (chartRef.current && container) {
          chartRef.current.applyOptions({
            width: container.clientWidth,
            height: Math.min(container.clientWidth * 0.6, 360),
          });
        }
      });
      ro.observe(container);

      setChartReady(true);
    })();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCandles, normalizeCandles]);

  // Reveal animation — waits for chartReady
  useEffect(() => {
    if (phase !== "revealing" || !chartReady || !candleSeriesRef.current || hiddenCandles.length === 0) return;

    // Show price axis
    if (chartRef.current) {
      chartRef.current.applyOptions({ rightPriceScale: { visible: true } });
    }

    const allCandles = normalizeCandles([...visibleCandles, ...hiddenCandles]);
    let idx = 0;
    setRevealedCount(0);

    const timer = setInterval(() => {
      if (!candleSeriesRef.current) { clearInterval(timer); return; }
      const candleIdx = visibleCandles.length + idx;
      if (candleIdx >= allCandles.length) {
        clearInterval(timer);
        if (chartRef.current) chartRef.current.timeScale().fitContent();
        onRevealComplete?.();
        return;
      }

      const dataSlice = allCandles.slice(0, candleIdx + 1);
      candleSeriesRef.current.setData(dataSlice.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));

      idx++;
      setRevealedCount(idx);
    }, 60);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chartReady]);

  // When going to result/gameover, ensure full chart is shown
  useEffect(() => {
    if ((phase === "result" || phase === "gameover") && chartRef.current && candleSeriesRef.current) {
      chartRef.current.applyOptions({ rightPriceScale: { visible: true } });
      const allCandles = normalizeCandles([...visibleCandles, ...hiddenCandles]);
      candleSeriesRef.current.setData(allCandles.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));
      chartRef.current.timeScale().fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a]">
      <div ref={containerRef} className="w-full" />

      {/* Curtain overlay during guessing */}
      {phase === "guessing" && (
        <div className="absolute right-0 top-0 bottom-0 w-[30%] sm:w-[22%] bg-gradient-to-r from-transparent via-gray-950/80 to-gray-950 flex items-center justify-center z-10 pointer-events-none">
          <motion.div
            className="text-4xl sm:text-5xl text-white/80"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            ?
          </motion.div>
        </div>
      )}

      {/* Reveal progress */}
      {phase === "revealing" && hiddenCandles.length > 0 && (
        <div className="absolute top-2 right-3 z-10 text-[10px] font-mono text-gray-500">
          {revealedCount}/{hiddenCandles.length}
        </div>
      )}
    </div>
  );
}

```

### components/chart-game/GameControls.tsx

```tsx
"use client";

import { motion } from "framer-motion";

interface Props {
  onGuess: (guess: "up" | "down") => void;
  disabled?: boolean;
}

export function GameControls({ onGuess, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.button
        onClick={() => onGuess("up")}
        disabled={disabled}
        className="relative overflow-hidden py-4 sm:py-5 rounded-xl font-black text-white text-base sm:text-lg bg-red-600 hover:bg-red-500 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="text-xl">📈</span>
          올랐다
        </span>
      </motion.button>

      <motion.button
        onClick={() => onGuess("down")}
        disabled={disabled}
        className="relative overflow-hidden py-4 sm:py-5 rounded-xl font-black text-white text-base sm:text-lg bg-blue-600 hover:bg-blue-500 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="text-xl">📉</span>
          내렸다
        </span>
      </motion.button>
    </div>
  );
}

```

### components/chart-game/StreakCounter.tsx

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  streak: number;
}

export function StreakCounter({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={streak}
          className="text-lg sm:text-xl font-black text-orange-400 tabular-nums"
          initial={{ y: -20, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {streak}
        </motion.span>
      </AnimatePresence>
      <span className="text-xs text-gray-500 font-mono">연승</span>
    </div>
  );
}

```

## components/mock/

### components/mock/CharacterSnapshotCard.tsx

```tsx
import type { CharacterSnapshot } from "@/types/social";

const GRADE_COLORS: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

interface Props {
  snapshot: CharacterSnapshot;
}

export function CharacterSnapshotCard({ snapshot }: Props) {
  const total =
    snapshot.battleRecord.wins +
    snapshot.battleRecord.losses +
    snapshot.battleRecord.draws;

  return (
    <div className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-purple-400">캐릭터</span>
        <span className="text-[10px] font-mono text-gray-500">
          전투력 {snapshot.combatPower}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base">{snapshot.classEmoji}</span>
        <span className="text-xs font-bold text-gray-800 dark:text-zinc-200">
          {snapshot.nickname}
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          Lv.{snapshot.level} {snapshot.className}
        </span>
      </div>
      {snapshot.equipment.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {snapshot.equipment.map((eq, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] font-mono ${GRADE_COLORS[eq.grade] ?? "text-gray-400"}`}
            >
              {eq.emoji} {eq.name}
              {eq.enhanceLevel > 0 && (
                <span className="text-yellow-400">+{eq.enhanceLevel}</span>
              )}
            </span>
          ))}
        </div>
      )}
      {total > 0 && (
        <div className="text-[10px] font-mono text-gray-500">
          전적 {snapshot.battleRecord.wins}승 {snapshot.battleRecord.losses}패{" "}
          {snapshot.battleRecord.draws}무
        </div>
      )}
    </div>
  );
}

```

### components/mock/CommunityBoard.tsx

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { Skeleton } from "@/components/Skeleton";
import { StaggerContainer } from "@/components/StaggerContainer";
import { PortfolioSnapshotCard } from "@/components/mock/PortfolioSnapshotCard";
import { CharacterSnapshotCard } from "@/components/mock/CharacterSnapshotCard";
import { fetchCommunityPosts, addCommunityPost, deleteCommunityPost, CommunityPost } from "@/lib/communityApi";
import { toggleLike, addReply, fetchReplies } from "@/lib/communityReplyApi";
import { isAdmin } from "@/lib/adminConfig";
import type { PostCategory, BoardId, PostSnapshot, CommunityReply } from "@/types/social";

const DEFAULT_CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: "insight", label: "인사이트" },
  { key: "question", label: "질문" },
  { key: "brag", label: "수익자랑" },
  { key: "tip", label: "꿀팁" },
];

interface CommunityBoardProps {
  user: User | null;
  nickname?: string;
  boardId?: BoardId;
  boardTitle?: string;
  boardSubtitle?: string;
  categories?: { key: PostCategory; label: string }[];
  snapshotData?: PostSnapshot | null;
  snapshotCategory?: PostCategory;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function CommunityBoard({
  user,
  nickname,
  boardId = "community",
  boardTitle = "투자 게시판",
  boardSubtitle = "투자 의견 · 수익 자랑 · 수다 · 누구나 열람",
  categories = DEFAULT_CATEGORIES,
  snapshotData,
  snapshotCategory,
}: CommunityBoardProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>(categories[0]?.key ?? "insight");
  const [attachSnapshot, setAttachSnapshot] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>({});
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const allCategories: { key: PostCategory | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    ...categories,
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchCommunityPosts(30, boardId));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  // 카테고리 변경 시 스냅샷 첨부 토글 리셋
  useEffect(() => {
    setAttachSnapshot(false);
  }, [selectedCategory]);

  const filteredPosts = activeCategory === "all"
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  const categoryLabelMap = Object.fromEntries(allCategories.map((c) => [c.key, c.label]));

  async function handleDelete(postId: string) {
    if (!user) return;
    setDeletingId(postId);
    try {
      await deleteCommunityPost(postId, boardId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      setNotice({ msg: "삭제 실패", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    const trimmed = content.trim();
    if (trimmed.length < 2) return;
    const nick = nickname || user.displayName || "익명";
    setSubmitting(true);
    try {
      const snap = attachSnapshot && snapshotData && selectedCategory === snapshotCategory
        ? snapshotData
        : undefined;
      await addCommunityPost(user.uid, nick, trimmed, selectedCategory, boardId, snap);
      setContent("");
      setAttachSnapshot(false);
      setNotice({ msg: "등록되었습니다!", ok: true });
      setTimeout(() => setNotice(null), 3000);
      load().catch(() => {});
    } catch {
      setNotice({ msg: "오류가 발생했습니다", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleLike(post: CommunityPost) {
    if (!user) return;
    const liked = post.likedBy.includes(user.uid);

    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: liked ? p.likes - 1 : p.likes + 1,
              likedBy: liked
                ? p.likedBy.filter((id) => id !== user.uid)
                : [...p.likedBy, user.uid],
            }
          : p
      )
    );

    try {
      await toggleLike(post.id, user.uid, liked, boardId);
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likes: liked ? p.likes + 1 : p.likes - 1,
                likedBy: liked
                  ? [...p.likedBy, user.uid]
                  : p.likedBy.filter((id) => id !== user.uid),
              }
            : p
        )
      );
    }
  }

  async function handleExpandReplies(postId: string) {
    if (expandedReplies === postId) {
      setExpandedReplies(null);
      return;
    }
    setExpandedReplies(postId);
    if (!replies[postId]) {
      try {
        const fetched = await fetchReplies(postId, 20, boardId);
        setReplies((prev) => ({ ...prev, [postId]: fetched }));
      } catch {
        // silent
      }
    }
  }

  async function handleSubmitReply(postId: string) {
    if (!user || replyContent.trim().length < 1) return;
    const nick = nickname || user.displayName || "익명";
    setReplySubmitting(true);
    try {
      await addReply(postId, user.uid, nick, replyContent.trim(), boardId);
      setReplyContent("");
      // replyCount optimistic
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p
        )
      );
      // 답글 새로고침
      const fetched = await fetchReplies(postId, 20, boardId);
      setReplies((prev) => ({ ...prev, [postId]: fetched }));
    } catch {
      setNotice({ msg: "답글 등록 실패", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setReplySubmitting(false);
    }
  }

  // 스냅샷 첨부 가능 여부
  const canAttach =
    snapshotData && snapshotCategory && selectedCategory === snapshotCategory;
  const snapshotLabel =
    snapshotData?.type === "portfolio" ? "포트폴리오 정보 첨부" : "캐릭터 정보 첨부";

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">{boardTitle}</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {boardSubtitle}
          </p>
        </div>
        <button
          onClick={() => load().catch(() => {})}
          disabled={loading}
          className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-mono border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
        >
          새로고침
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {allCategories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
              activeCategory === cat.key
                ? "bg-kim-red text-white"
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Write area */}
      {user ? (
        <div className="mb-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 font-mono">
              <span className="text-kim-red font-bold">{nickname || user.displayName || "익명"}</span>
              {" "}으로 등록됩니다
            </span>
          </div>
          {/* Category select */}
          <div className="flex gap-1 mb-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-kim-red/20 text-kim-red font-bold"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* Snapshot attach checkbox */}
          {canAttach && (
            <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachSnapshot}
                onChange={(e) => setAttachSnapshot(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-white/20 text-kim-red focus:ring-kim-red/50 bg-transparent"
              />
              <span className="text-[10px] font-mono text-gray-500">
                {snapshotLabel}
              </span>
            </label>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder="의견이나 자랑을 남겨보세요 (200자)"
            rows={2}
            className="w-full bg-transparent text-gray-900 dark:text-white font-mono text-xs focus:outline-none resize-none placeholder:text-gray-400 dark:placeholder:text-gray-700"
          />
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-200 dark:border-white/10">
            <span className="text-[10px] text-gray-500 font-mono">{content.trim().length}/200</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || content.trim().length < 2}
              className="text-xs font-mono px-3 py-1 rounded bg-kim-red text-white hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              {submitting ? "..." : "등록"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 text-center text-xs text-gray-500 font-mono py-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200 dark:border-white/5">
          로그인 후 글을 남길 수 있습니다
        </div>
      )}

      {notice && (
        <div className={`mb-2 text-center text-xs font-mono py-1 rounded ${
          notice.ok ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
        }`}>
          {notice.msg}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" className="h-14" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 글이 없습니다. 첫 번째 의견을 남겨보세요!
        </div>
      ) : (
        <StaggerContainer className="flex flex-col gap-1.5">
          {filteredPosts.map((post) => {
            const liked = user ? post.likedBy.includes(user.uid) : false;
            const isExpanded = expandedReplies === post.id;

            return (
              <div key={post.id}>
                <div
                  className={`rounded-lg px-3 py-2.5 border text-xs ${
                    post.userId === user?.uid
                      ? "bg-kim-red/5 border-kim-red/20"
                      : "bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold font-mono text-xs ${
                        post.userId === user?.uid ? "text-kim-red" : "text-gray-700 dark:text-zinc-300"
                      }`}>
                        {post.nickname}
                        {post.userId === user?.uid && (
                          <span className="ml-1 text-[10px] text-kim-red/60">나</span>
                        )}
                        {isAdmin(user?.uid) && post.userId !== user?.uid && (
                          <span className="ml-1 text-[10px] text-yellow-500/70">관리자</span>
                        )}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-white/10 text-gray-500 dark:text-gray-500">
                        {categoryLabelMap[post.category] ?? post.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {timeAgo(post.createdAt)}
                      </span>
                      {(post.userId === user?.uid || isAdmin(user?.uid)) && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="text-[10px] text-gray-400 hover:text-red-500 font-mono transition-colors disabled:opacity-40"
                        >
                          {deletingId === post.id ? "..." : "삭제"}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">{post.content}</p>

                  {/* Snapshot card */}
                  {post.snapshot?.type === "portfolio" && (
                    <PortfolioSnapshotCard snapshot={post.snapshot} />
                  )}
                  {post.snapshot?.type === "character" && (
                    <CharacterSnapshotCard snapshot={post.snapshot} />
                  )}

                  {/* Like & Reply buttons */}
                  <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={() => handleToggleLike(post)}
                      disabled={!user}
                      className={`flex items-center gap-1 text-[11px] font-mono transition-colors ${
                        liked
                          ? "text-red-500"
                          : "text-gray-400 hover:text-red-400"
                      } disabled:opacity-40`}
                    >
                      <span>{liked ? "\u2665" : "\u2661"}</span>
                      <span>{post.likes > 0 ? post.likes : ""}</span>
                    </button>
                    <button
                      onClick={() => handleExpandReplies(post.id)}
                      className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <span>&#128172;</span>
                      <span>{post.replyCount > 0 ? post.replyCount : ""}</span>
                    </button>
                  </div>
                </div>

                {/* Reply section */}
                {isExpanded && (
                  <div className="ml-3 mt-1 border-l-2 border-gray-200 dark:border-white/10 pl-3">
                    {replies[post.id]?.map((r) => (
                      <div
                        key={r.id}
                        className="text-[11px] py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0"
                      >
                        <span className="font-bold font-mono text-gray-700 dark:text-zinc-300">
                          {r.nickname}
                        </span>
                        <span className="ml-1.5 text-gray-500 dark:text-zinc-500 font-mono">
                          {timeAgo(r.createdAt)}
                        </span>
                        <p className="text-gray-600 dark:text-zinc-400 mt-0.5">
                          {r.content}
                        </p>
                      </div>
                    ))}
                    {(!replies[post.id] || replies[post.id].length === 0) && (
                      <p className="text-[10px] text-gray-500 font-mono py-2">
                        아직 답글이 없습니다
                      </p>
                    )}
                    {user && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) =>
                            setReplyContent(e.target.value.slice(0, 200))
                          }
                          placeholder="답글 입력..."
                          className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-[11px] font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSubmitReply(post.id)}
                          disabled={
                            replySubmitting || replyContent.trim().length < 1
                          }
                          className="shrink-0 px-2 py-1 rounded bg-kim-red text-white text-[10px] font-mono font-bold hover:bg-red-600 transition-colors disabled:opacity-40"
                        >
                          {replySubmitting ? "..." : "등록"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}

```

### components/mock/InvestorProfileModal.tsx

```tsx
"use client";

import { useState } from "react";
import { Portfolio } from "@/hooks/useMockPortfolio";

interface InvestorProfile {
  type: string;
  emoji: string;
  description: string;
  traits: string[];
  strength: string;
  weakness: string;
  kimComment: string;
}

interface Props {
  portfolio: Portfolio;
  returnPct: number;
  totalAsset: number;
  onClose: () => void;
}

const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_PROFILE_API_URL ||
  "/api/investor-profile";

export function InvestorProfileModal({ portfolio, returnPct, totalAsset, onClose }: Props) {
  const [mbti, setMbti] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestorProfile | null>(null);
  const [error, setError] = useState(false);

  const hasHistory = portfolio.history.length > 0;

  async function analyze() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbti: mbti.trim().toUpperCase(),
          history: portfolio.history,
          holdings: portfolio.holdings,
          returnPct,
          totalAsset,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white">🧠 내 투자 성향 분석</h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {hasHistory
                ? `거래 ${portfolio.history.length}건 기반 AI 분석`
                : "MBTI 기반 간이 분석"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {!result ? (
            <div className="flex flex-col gap-4">
              {/* MBTI 입력 */}
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1.5 block">
                  MBTI <span className="text-gray-400">(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="예: INTJ"
                  maxLength={4}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50 uppercase tracking-widest"
                />
              </div>

              {/* 거래 없을 때 안내 */}
              {!hasHistory && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400 font-mono">
                  아직 거래 내역이 없어요. MBTI만으로 투자 성향을 예측합니다.
                </div>
              )}

              {/* 거래 있을 때 요약 */}
              {hasHistory && (
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-gray-500 font-mono mb-2">분석에 사용될 데이터</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                        {portfolio.history.length}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">총 거래</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                        {Object.keys(portfolio.holdings).length}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">보유 종목</div>
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          returnPct > 0
                            ? "text-red-500 dark:text-red-400"
                            : returnPct < 0
                            ? "text-blue-500 dark:text-blue-400"
                            : "text-gray-500"
                        }`}
                      >
                        {returnPct > 0 ? "+" : ""}
                        {returnPct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">수익률</div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-500 font-mono text-center">
                  분석에 실패했습니다. 다시 시도해주세요.
                </div>
              )}

              <button
                onClick={analyze}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-kim-red text-white font-bold text-sm hover:bg-kim-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI 분석 중...
                  </span>
                ) : (
                  "AI 성향 분석하기"
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* 유형 카드 */}
              <div className="text-center py-5 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="text-5xl mb-2">{result.emoji}</div>
                <div className="text-lg font-black text-gray-900 dark:text-white mb-1">
                  {result.type}
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono leading-relaxed px-3">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div className="flex flex-col gap-1.5">
                {result.traits.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                    <span className="text-gray-700 dark:text-zinc-300">{t}</span>
                  </div>
                ))}
              </div>

              {/* 강점 / 약점 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mb-1">
                    💪 강점
                  </div>
                  <div className="text-xs text-gray-700 dark:text-zinc-300 font-mono leading-relaxed">
                    {result.strength}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-red-500 dark:text-red-400 font-mono mb-1">
                    ⚠️ 약점
                  </div>
                  <div className="text-xs text-gray-700 dark:text-zinc-300 font-mono leading-relaxed">
                    {result.weakness}
                  </div>
                </div>
              </div>

              {/* 오비젼의 한마디 */}
              <div className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-500 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-xs text-gray-700 dark:text-zinc-300 font-mono leading-relaxed">
                  💬 &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono py-1 transition-colors text-center"
              >
                다시 분석하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

```

### components/mock/InvestorQuizModal.tsx

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  InvestorType,
  InvestorTypeKey,
} from "@/lib/investorQuiz";
import { generateInvestorShareImage } from "./InvestorShareCard";

const SITE_URL = "https://bitgak.co.kr/mock-investment";

interface Props {
  onComplete: (result: InvestorType) => void;
  onClose: () => void;
}

interface SharePreview {
  dataUrl: string;
  blob: Blob;
  text: string;
  imageCopied: boolean;
}

export function InvestorQuizModal({ onComplete, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [selected, setSelected] = useState<InvestorTypeKey | null>(null);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const question = QUIZ_QUESTIONS[currentIdx];
  const progress = (currentIdx / QUIZ_QUESTIONS.length) * 100;
  const isLast = currentIdx === QUIZ_QUESTIONS.length - 1;

  function handleSelect(type: InvestorTypeKey) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => {
      const newAnswers = [...answers, type];
      if (isLast) {
        setResult(calcInvestorType(newAnswers));
      } else {
        setAnswers(newAnswers);
        setCurrentIdx((i) => i + 1);
        setSelected(null);
      }
    }, 420);
  }

  function handleConfirm() {
    if (!result) return;
    onComplete(result);
    onClose();
  }

  async function handleShare() {
    if (!result || sharingLoading) return;
    setSharingLoading(true);
    const friendlyText =
      `나 ${result.name}래 ㅋㅋ\n` +
      `"${result.kimComment.slice(0, 45)}..."\n\n` +
      `오비젼 투자성향 테스트 해봐`;

    try {
      const blob = await generateInvestorShareImage(result);
      if (!blob) return;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let imageCopied = false;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        imageCopied = true;
      } catch { /* clipboard image not supported */ }

      setSharePreview({ dataUrl, blob, text: friendlyText, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }

  function downloadImage() {
    if (!sharePreview) return;
    const a = document.createElement("a");
    a.href = sharePreview.dataUrl;
    a.download = "ovision-investor-type.png";
    a.click();
  }

  async function copyText() {
    if (!sharePreview) return;
    await navigator.clipboard.writeText(`${sharePreview.text}\n\n👉 ${SITE_URL}`).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">

          {!result ? (
            <>
              {/* 헤더 */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-mono">
                    {currentIdx + 1} / {QUIZ_QUESTIONS.length}
                  </span>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* 진행 바 */}
                <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-kim-red rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* 질문 */}
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed min-h-[48px]"
                  >
                    Q{currentIdx + 1}. {question.q}
                  </motion.h2>
                </AnimatePresence>
              </div>

              {/* 선택지 */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-2"
                  >
                    {question.options.map((opt, i) => {
                      const isChosen = selected === opt.type;
                      const isDimmed = selected !== null && selected !== opt.type;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleSelect(opt.type)}
                          disabled={selected !== null}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: isDimmed ? 0.35 : 1, x: 0, scale: isChosen ? 1.01 : 1 }}
                          transition={{ duration: 0.15, delay: i * 0.05 }}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-mono transition-colors ${
                            isChosen
                              ? "bg-kim-red border-kim-red text-white"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:border-kim-red/50 hover:bg-kim-red/5"
                          } disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* 결과 화면 */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring" }}
              className="p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              {/* 유형 카드 */}
              <div className="text-center py-5 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="text-5xl mb-3">{result.emoji}</div>
                <div className="text-xl font-black text-gray-900 dark:text-white mb-1">
                  {result.name}
                </div>
                <p className="text-xs text-gray-500 font-mono leading-relaxed px-3">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div>
                <p className="text-[10px] text-gray-400 font-mono mb-2">투자 성향</p>
                <div className="flex flex-col gap-1.5">
                  {result.traits.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                      <span className="text-gray-700 dark:text-zinc-300">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강점 / 주의점 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-mono font-bold mb-1.5">💪 강점</p>
                  <div className="flex flex-col gap-1">
                    {result.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-zinc-400 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-orange-500 font-mono font-bold mb-1.5">⚠️ 주의</p>
                  <div className="flex flex-col gap-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-zinc-400 font-mono leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오비젼 한마디 */}
              <div className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-400 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-xs text-gray-700 dark:text-zinc-300 font-mono">
                  💬 &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                disabled={sharingLoading}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sharingLoading ? "⏳ 이미지 생성 중..." : "🖼️ 결과 이미지 공유하기"}
              </button>

              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-kim-red text-white font-bold text-sm hover:bg-kim-red/90 transition-colors"
              >
                저장하고 닫기
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* PC 공유 미리보기 모달 */}
      <AnimatePresence>
        {sharePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
            onClick={() => setSharePreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
            >
              {/* 미리보기 이미지 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharePreview.dataUrl}
                alt="투자성향 결과 카드"
                className="w-full block"
              />

              {/* 액션 버튼들 */}
              <div className="p-4 flex flex-col gap-2">
                {sharePreview.imageCopied ? (
                  /* 이미지 클립보드 복사 성공 */
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                    <p className="text-green-400 font-bold text-sm mb-0.5">✓ 이미지가 클립보드에 복사됐어요!</p>
                    <p className="text-xs text-gray-400 font-mono">
                      카카오톡 · 메시지 등에서 <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl+V</kbd> 로 바로 붙여넣기 하세요
                    </p>
                  </div>
                ) : (
                  /* 클립보드 미지원 → 저장 유도 */
                  <p className="text-xs text-gray-500 font-mono text-center">
                    이미지를 저장하거나 텍스트를 복사해서 공유하세요
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={downloadImage}
                    className="flex-1 py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                  >
                    💾 이미지 저장
                  </button>
                  <button
                    onClick={copyText}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      copyDone
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-gray-200 hover:bg-white/20"
                    }`}
                  >
                    {copyDone ? "✓ 복사됨!" : "📋 텍스트 복사"}
                  </button>
                </div>
                <button
                  onClick={() => setSharePreview(null)}
                  className="w-full py-2 text-xs text-gray-600 font-mono hover:text-gray-400 transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

```

### components/mock/InvestorShareCard.ts

```tsx
/**
 * Canvas-based share card generator for investor type results.
 * Generates a 400×580 PNG — no external dependencies.
 */
import type { InvestorType, InvestorTypeKey } from "@/lib/investorQuiz";

const TYPE_COLORS: Record<
  InvestorTypeKey,
  { bg1: string; bg2: string; accent: string; light: string }
> = {
  visionary:   { bg1: "#030a13", bg2: "#071520", accent: "#06B6D4", light: "#A5F3FC" },
  dealmaker:   { bg1: "#13100a", bg2: "#1f1a0f", accent: "#D4A853", light: "#FDE68A" },
  sage:        { bg1: "#031308", bg2: "#071f0f", accent: "#16A34A", light: "#86EFAC" },
  strategist:  { bg1: "#030813", bg2: "#07101f", accent: "#2563EB", light: "#93C5FD" },
  hunter:      { bg1: "#130303", bg2: "#1f0707", accent: "#DC2626", light: "#FCA5A5" },
  observer:    { bg1: "#130a03", bg2: "#1f1207", accent: "#EA580C", light: "#FDBA74" },
  contrarian:  { bg1: "#0a0313", bg2: "#13071f", accent: "#9333EA", light: "#D8B4FE" },
  explorer:    { bg1: "#13030a", bg2: "#1f0713", accent: "#EC4899", light: "#F9A8D4" },
};

/** Wrap Korean/mixed text by pixel width */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Rounded rectangle path helper */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Korean-safe font stack */
const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

export async function generateInvestorShareImage(
  result: InvestorType
): Promise<Blob | null> {
  try {
    const DPR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = 400, H = 580;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const c = TYPE_COLORS[result.key];

    // ── Background ──────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, c.bg1);
    bg.addColorStop(1, c.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Center glow blob
    const glowCenter = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, 160);
    glowCenter.addColorStop(0, c.accent + "44");
    glowCenter.addColorStop(1, "transparent");
    ctx.fillStyle = glowCenter;
    ctx.fillRect(0, 0, W, H);

    // ── Top branding ────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `11px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 투자성향 테스트", W / 2, 34);

    // ── Character image ─────────────────────────────────────
    const cx = W / 2, cy = 175, cr = 65;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(cx, cy, cr * 0.5, cx, cy, cr * 2);
    outerGlow.addColorStop(0, c.accent + "50");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 2, 0, Math.PI * 2);
    ctx.fill();

    // Load and draw character image in circle
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = result.image;
      });
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - cr, cy - cr, cr * 2, cr * 2);
      ctx.restore();
    } catch {
      // Fallback to emoji if image fails
      ctx.font = `52px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.fillText(result.emoji, cx, cy);
    }

    // Circle border with glow
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = c.accent;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // ── Character name ─────────────────────────────────────
    ctx.fillStyle = c.light;
    ctx.font = `bold 14px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(result.character, W / 2, 272);

    // ── Type name ───────────────────────────────────────────
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = c.accent + "80";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(result.name, W / 2, 300);
    ctx.restore();

    // ── Subtitle ────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `12px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(result.subtitle, W / 2, 320);

    // Divider
    const grad = ctx.createLinearGradient(60, 0, W - 60, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, c.accent + "70");
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 336); ctx.lineTo(W - 60, 336);
    ctx.stroke();

    // ── Traits (top 3) ──────────────────────────────────────
    const traits = result.traits.slice(0, 3);
    ctx.font = `12px ${KO_FONT}`;
    traits.forEach((t, i) => {
      const ty = 362 + i * 25;
      ctx.fillStyle = c.accent;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("▸", 58, ty);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      const truncated = ctx.measureText(t).width > W - 140 ? t.slice(0, 22) + "…" : t;
      ctx.fillText(truncated, 76, ty);
    });

    // ── Kim comment box ─────────────────────────────────────
    const boxX = 40, boxY = 443, boxW = W - 80, boxH = 72;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = c.accent + "40";
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    // "오비젼의 한마디" label
    ctx.fillStyle = c.light;
    ctx.font = `10px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("💬 오비젼의 한마디", boxX + 14, boxY + 15);

    // Comment text (max 2 lines)
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `11px ${KO_FONT}`;
    const commentLines = wrapText(ctx, `"${result.kimComment}"`, boxW - 28);
    commentLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, boxX + 14, boxY + 33 + i * 18);
    });

    // ── Bottom URL ──────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("bitgak.co.kr", W / 2, H - 18);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateInvestorShareImage]", e);
    return null;
  }
}

```

### components/mock/LoginButton.tsx

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import Image from "next/image";

interface LoginButtonProps {
  user: User | null;
  loading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function LoginButton({ user, loading, onSignIn, onSignOut }: LoginButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (user) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="계정 메뉴"
          className="flex items-center gap-2 rounded-lg hover:bg-white/5 px-1.5 py-1 transition-colors"
        >
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName ?? ""}
              width={36}
              height={36}
              className="rounded-full ring-2 ring-white/20"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-kim-red/30 flex items-center justify-center text-sm font-bold text-kim-red">
              {(user.displayName ?? "?")[0]}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-none truncate max-w-[80px]">
              {user.displayName}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">▾ 메뉴</div>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-gray-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-2.5 border-b border-white/10">
              <div className="text-xs font-bold text-white truncate">{user.displayName}</div>
              <div className="text-[10px] text-gray-500 font-mono truncate">{user.email}</div>
            </div>
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 font-mono transition-colors flex items-center gap-2"
            >
              <span>↩</span> 로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => Promise.resolve(onSignIn()).catch(() => {})}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition-colors text-xs font-bold whitespace-nowrap"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="hidden sm:inline">Google 로그인</span>
      <span className="sm:hidden">로그인</span>
    </button>
  );
}

```

### components/mock/NicknameModal.tsx

```tsx
"use client";

import { useState } from "react";

interface NicknameModalProps {
  onConfirm: (nickname: string, strategy: string) => void;
  onClose?: () => void;
  defaultNickname?: string; // 초기값 (편집 가능)
  defaultStrategy?: string; // 기존 전략 초기값
}

export function NicknameModal({ onConfirm, onClose, defaultNickname, defaultStrategy }: NicknameModalProps) {
  const [nickname, setNickname] = useState(defaultNickname ?? "");
  const [strategy, setStrategy] = useState(defaultStrategy ?? "");
  const [error, setError] = useState("");

  function handleConfirm() {
    const nick = nickname.trim();
    if (nick.length < 2) { setError("닉네임은 2자 이상 입력하세요."); return; }
    if (nick.length > 20) { setError("닉네임이 너무 깁니다."); return; }
    onConfirm(nick, strategy.trim().slice(0, 20));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="bg-gray-900 border border-white/15 rounded-xl p-6 w-full max-w-[320px] shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-2">🏆</div>
          <h2 className="text-base font-black text-white">닉네임 & 전략 설정</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            랭킹에 표시될 닉네임과 투자 전략을 설정하세요
          </p>
        </div>

        {/* 닉네임 — 항상 편집 가능 */}
        <label className="block text-xs text-gray-500 font-mono mb-1">
          닉네임 <span className="text-gray-600">(2–20자)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder="ex) 반도체왕, 주식고수"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          autoFocus
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-kim-red mb-3"
        />

        {/* 한줄 전략 */}
        <label className="block text-xs text-gray-500 font-mono mb-1">
          나의 투자 전략 <span className="text-gray-600">(선택 · 20자 이내)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder='ex) "반도체 올인", "분산이 답"'
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-kim-red mb-1"
        />
        <div className="text-right text-[10px] text-gray-600 font-mono mb-4">
          {strategy.trim().length}/20
        </div>

        {error && (
          <p className="text-xs text-red-400 font-mono text-center mb-3">{error}</p>
        )}

        <div className="text-[10px] text-gray-600 font-mono text-center mb-4">
          ※ 닉네임과 전략은 공개됩니다. 개인정보 입력 금지.
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-2 rounded-lg bg-kim-red text-white text-sm font-mono font-bold hover:bg-red-600 transition-colors mb-2"
        >
          저장 & 랭킹 등록
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

```

### components/mock/OrderModal.tsx

```tsx
"use client";

import { useState } from "react";
import { StockInfo } from "./StockList";
import { Holding } from "@/hooks/useMockPortfolio";

interface OrderModalProps {
  stock: StockInfo;
  type: "buy" | "sell";
  currentPrice: number;
  cash: number;
  holding: Holding | null;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export function OrderModal({
  stock,
  type,
  currentPrice,
  cash,
  holding,
  onConfirm,
  onClose,
}: OrderModalProps) {
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  const price = Math.round(currentPrice);
  const total = price * qty;
  const maxBuy = Math.floor(cash / price);
  const maxSell = holding?.qty ?? 0;
  const max = type === "buy" ? maxBuy : maxSell;

  function handleConfirm() {
    if (qty <= 0) { setError("수량을 입력하세요."); return; }
    if (qty > max) {
      setError(type === "buy" ? "잔액이 부족합니다." : "보유 수량이 부족합니다.");
      return;
    }
    onConfirm(qty);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-gray-900 border border-white/15 rounded-xl p-6 w-full max-w-[320px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded mr-2 ${
                type === "buy"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {type === "buy" ? "매수" : "매도"}
            </span>
            <span className="text-sm font-bold text-white">{stock.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Price info */}
        <div className="bg-white/5 rounded-lg p-3 mb-4 space-y-1.5 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">현재가</span>
            <span className="text-white font-bold">{fmt(price)}원</span>
          </div>
          {type === "buy" && (
            <div className="flex justify-between">
              <span className="text-gray-400">보유 현금</span>
              <span className="text-white">{fmt(cash)}원</span>
            </div>
          )}
          {type === "sell" && holding && (
            <div className="flex justify-between">
              <span className="text-gray-400">평균 단가</span>
              <span className="text-white">{fmt(holding.avgPrice)}원</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">최대 {type === "buy" ? "매수" : "매도"}</span>
            <span className="text-white">{fmt(max)}주</span>
          </div>
        </div>

        {/* Qty input */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 font-mono mb-1">수량</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={max}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setQty(Math.max(1, Math.min(max, v)));
              }}
              className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-center text-white font-mono text-sm focus:outline-none focus:border-white/40"
            />
            <button
              onClick={() => setQty((q) => Math.min(max, q + 1))}
              className="w-8 h-8 rounded bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
          {/* Quick buttons */}
          <div className="flex gap-1 mt-2">
            {[0.25, 0.5, 1].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setQty(Math.max(1, Math.floor(max * ratio)))}
                className="flex-1 text-xs font-mono py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
              >
                {ratio === 1 ? "최대" : `${ratio * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between text-sm font-mono mb-4 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-gray-400">주문 금액</span>
          <span className={`font-bold ${type === "buy" ? "text-red-300" : "text-blue-300"}`}>
            {fmt(total)}원
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-mono mb-3 text-center">{error}</p>
        )}

        <div className="text-[10px] text-gray-600 font-mono text-center mb-3">
          ※ 현재가로 즉시 체결됩니다
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm font-mono border border-white/10 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2 rounded-lg text-white text-sm font-mono font-bold transition-colors ${
              type === "buy"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {type === "buy" ? "매수" : "매도"}
          </button>
        </div>
      </div>
    </div>
  );
}

```

### components/mock/PortfolioSnapshotCard.tsx

```tsx
import type { PortfolioSnapshot } from "@/types/social";

interface Props {
  snapshot: PortfolioSnapshot;
}

export function PortfolioSnapshotCard({ snapshot }: Props) {
  const pctColor =
    snapshot.returnPct > 0
      ? "text-red-500"
      : snapshot.returnPct < 0
        ? "text-blue-500"
        : "text-gray-500";

  return (
    <div className="mt-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-indigo-400">포트폴리오</span>
        <span className={`text-xs font-bold font-mono ${pctColor}`}>
          {snapshot.returnPct > 0 ? "+" : ""}
          {snapshot.returnPct.toFixed(2)}%
        </span>
      </div>
      <div className="text-xs font-mono text-gray-600 dark:text-zinc-300 mb-1.5">
        총 자산 {Math.round(snapshot.totalAsset).toLocaleString("ko-KR")}원
      </div>
      {snapshot.holdings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {snapshot.holdings.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-[10px] font-mono text-indigo-300"
            >
              {h.name}
              <span className={h.pnlPct >= 0 ? "text-red-400" : "text-blue-400"}>
                {h.pnlPct > 0 ? "+" : ""}
                {h.pnlPct.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

```

### components/mock/PortfolioSummary.tsx

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Portfolio, Holding } from "@/hooks/useMockPortfolio";
import { StockPrice } from "@/lib/stockPricesApi";

const PIE_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b",
  "#3b82f6", "#a855f7", "#14b8a6", "#ef4444",
];

function PortfolioPieChart({
  holdings,
  prices,
  cash,
  totalAsset,
}: {
  holdings: Record<string, Holding>;
  prices: Record<string, StockPrice>;
  cash: number;
  totalAsset: number;
}) {
  const entries = Object.entries(holdings);
  if (entries.length === 0) return null;

  const slices = entries.map(([symbol, h]) => {
    const price = prices[symbol]?.price ?? h.currentPrice;
    return { name: h.name, value: Math.round(price * h.qty) };
  });

  if (cash > 0) slices.push({ name: "현금", value: Math.round(cash) });

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <p className="text-xs text-gray-500 font-mono mb-3">자산 비중</p>
      <div className="flex items-center gap-3">
        <ResponsiveContainer width={110} height={110}>
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              dataKey="value"
              strokeWidth={0}
            >
              {slices.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === slices.length - 1 && slices[i].name === "현금"
                    ? "#9ca3af"
                    : PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: string | number | undefined) => [
                `${((Number(val ?? 0) / totalAsset) * 100).toFixed(1)}%`,
                "",
              ]}
              contentStyle={{
                background: "rgba(15,15,25,0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#f9fafb",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 범례 */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {slices.map((s, i) => {
            const pct = ((s.value / totalAsset) * 100).toFixed(1);
            const color = i === slices.length - 1 && s.name === "현금"
              ? "#9ca3af"
              : PIE_COLORS[i % PIE_COLORS.length];
            return (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs font-mono text-gray-600 dark:text-zinc-400 truncate flex-1">
                  {s.name}
                </span>
                <span className="text-xs font-mono font-bold text-gray-900 dark:text-white shrink-0">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PortfolioSummaryProps {
  portfolio: Portfolio;
  prices: Record<string, StockPrice>;
  totalAsset: number;
  returnPct: number;
  settling: boolean;
  onReset: () => void;
  onSell: (symbol: string, holding: Holding, price: number) => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function HoldingRow({
  symbol,
  holding,
  price,
  onSell,
}: {
  symbol: string;
  holding: Holding;
  price: number | null;
  onSell: (symbol: string, holding: Holding, price: number) => void;
}) {
  const current = price ?? holding.currentPrice;
  const evalAmount = current * holding.qty;
  const pnl = (current - holding.avgPrice) * holding.qty;
  const pnlPct = ((current - holding.avgPrice) / holding.avgPrice) * 100;
  const pnlColor = pnl > 0 ? "text-red-500 dark:text-red-400" : pnl < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500";

  return (
    <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-white/10">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{holding.name}</div>
          <div className="text-[10px] text-gray-500 font-mono">{holding.qty}주 · 평단 {fmt(holding.avgPrice)}</div>
        </div>
        <button
          onClick={() => onSell(symbol, holding, current)}
          className="text-xs font-mono px-2 py-1.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40 transition-colors whitespace-nowrap shrink-0 ml-2"
        >
          매도
        </button>
      </div>
      <div className="flex justify-between items-end mt-1.5">
        <div className="text-xs font-mono text-gray-900 dark:text-white font-bold">
          {fmt(Math.round(evalAmount))}원
        </div>
        <div className={`text-xs font-mono font-bold ${pnlColor}`}>
          {pnl > 0 ? "+" : ""}{fmt(Math.round(pnl))}원 ({pnlPct > 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
        </div>
      </div>
    </div>
  );
}

export function PortfolioSummary({
  portfolio,
  prices,
  totalAsset,
  returnPct,
  settling,
  onReset,
  onSell,
}: PortfolioSummaryProps) {
  const [tab, setTab] = useState<"portfolio" | "history">("portfolio");
  const holdingEntries = Object.entries(portfolio.holdings);
  const history = [...(portfolio.history ?? [])].reverse();

  const pnlAmount = Math.round(totalAsset - 10_000_000);
  const investedAmount = Object.values(portfolio.holdings).reduce(
    (s, h) => s + h.avgPrice * h.qty, 0
  );
  const evaluatedAmount = Object.entries(portfolio.holdings).reduce(
    (s, [sym, h]) => s + (prices[sym]?.price ?? h.currentPrice) * h.qty, 0
  );
  const holdingPnl = Math.round(evaluatedAmount - investedAmount);
  const pnlColor = pnlAmount > 0
    ? "text-red-500 dark:text-red-400"
    : pnlAmount < 0
      ? "text-blue-500 dark:text-blue-400"
      : "text-gray-500";

  return (
    <div className="flex flex-col gap-3">
      {/* 평가손익 히어로 */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="text-xs text-gray-500 dark:text-zinc-400 font-mono">평가손익</div>
          <button
            onClick={onReset}
            className="text-[10px] text-gray-500 hover:text-red-500 font-mono border border-gray-200 dark:border-white/10 hover:border-red-500/30 px-2 py-0.5 rounded transition-colors"
          >
            초기화
          </button>
        </div>
        <div className={`text-2xl font-black font-mono mb-0.5 ${pnlColor}`}>
          <AnimatedNumber value={pnlAmount} format={(n) => `${n > 0 ? "+" : ""}${fmt(Math.round(n))}`} />
          <span className="text-sm ml-1">원</span>
        </div>
        <div className={`text-lg font-mono font-bold ${pnlColor}`}>
          <AnimatedNumber value={returnPct} format={(n) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`} />
        </div>

        {/* 투자 상세 */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
          <div>
            <div className="text-gray-400">투자원금</div>
            <div className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(investedAmount))}원</div>
          </div>
          <div>
            <div className="text-gray-400">평가금액</div>
            <div className={`font-bold ${holdingPnl > 0 ? "text-red-500 dark:text-red-400" : holdingPnl < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
              {fmt(Math.round(evaluatedAmount))}원
            </div>
          </div>
          <div>
            <div className="text-gray-400">총자산</div>
            <div className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(totalAsset))}원</div>
          </div>
          <div>
            <div className="text-gray-400">현금</div>
            <div className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(portfolio.cash))}원</div>
          </div>
        </div>

        {settling && (
          <div className="mt-2 text-xs text-yellow-500 dark:text-yellow-400 font-mono animate-pulse">
            종가 업데이트 중...
          </div>
        )}
        {portfolio.settledAt && (
          <div className="mt-1 text-[10px] text-gray-400 font-mono">
            종가 기준: {portfolio.settledAt}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setTab("portfolio")}
          className="relative flex-1 py-1.5 text-xs font-bold rounded-md transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {tab === "portfolio" && (
            <motion.div
              layoutId="portfolio-tab-indicator"
              className="absolute inset-0 bg-white dark:bg-white/10 rounded-md shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 ${tab === "portfolio" ? "text-gray-900 dark:text-white" : ""}`}>
            보유종목
          </span>
        </button>
        <button
          onClick={() => setTab("history")}
          className="relative flex-1 py-1.5 text-xs font-bold rounded-md transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {tab === "history" && (
            <motion.div
              layoutId="portfolio-tab-indicator"
              className="absolute inset-0 bg-white dark:bg-white/10 rounded-md shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 ${tab === "history" ? "text-gray-900 dark:text-white" : ""}`}>
            거래내역
            {history.length > 0 && (
              <span className="ml-1 text-[10px] text-gray-400 font-mono">
                {history.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {tab === "portfolio" ? (
        <>
          {/* 파이차트 */}
          {holdingEntries.length > 0 && (
            <PortfolioPieChart
              holdings={portfolio.holdings}
              prices={prices}
              cash={portfolio.cash}
              totalAsset={totalAsset}
            />
          )}

          {/* 보유 종목 */}
          {holdingEntries.length > 0 ? (
            <div>
              <div className="text-xs text-gray-500 font-mono mb-2">
                보유 종목 ({holdingEntries.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {holdingEntries.map(([symbol, holding]) => (
                  <HoldingRow
                    key={symbol}
                    symbol={symbol}
                    holding={holding}
                    price={prices[symbol]?.price ?? null}
                    onSell={onSell}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 font-mono text-center py-8">
              보유 종목 없음
            </div>
          )}
        </>
      ) : (
        /* 거래내역 탭 */
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="text-xs text-gray-500 font-mono text-center py-8">
              거래 내역 없음
            </div>
          ) : (
            <>
              {/* 요약 */}
              {(() => {
                const buys = history.filter(h => h.type === "buy");
                const sells = history.filter(h => h.type === "sell");
                const totalVolume = history.reduce((s, h) => s + h.price * h.qty, 0);
                const buyVolume = buys.reduce((s, h) => s + h.price * h.qty, 0);
                const sellVolume = sells.reduce((s, h) => s + h.price * h.qty, 0);
                return (
                  <div className="px-3 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">총 거래</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        <span className="text-red-500 dark:text-red-400">매수 {buys.length}건</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-blue-500 dark:text-blue-400">매도 {sells.length}건</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">총 거래대금</span>
                      <span className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(totalVolume))}원</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-500">매수금액</span>
                      <span className="text-red-500 dark:text-red-400">{fmt(Math.round(buyVolume))}원</span>
                    </div>
                    {sellVolume > 0 && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-gray-500">매도금액</span>
                        <span className="text-blue-500 dark:text-blue-400">{fmt(Math.round(sellVolume))}원</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 컬럼 헤더 */}
              <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <span className="col-span-2">날짜</span>
                <span className="col-span-1">구분</span>
                <span className="col-span-3">종목</span>
                <span className="col-span-2 text-right">수량</span>
                <span className="col-span-4 text-right">거래금액</span>
              </div>

              {/* 목록 */}
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 max-h-[280px] overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="grid grid-cols-12 items-center px-3 py-2 text-xs font-mono hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="col-span-2 text-gray-400">{h.date.slice(5)}</span>
                    <span className={`col-span-1 font-bold ${
                      h.type === "buy" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
                    }`}>
                      {h.type === "buy" ? "매수" : "매도"}
                    </span>
                    <span className="col-span-3 text-gray-700 dark:text-zinc-300 truncate">{h.name}</span>
                    <span className="col-span-2 text-right text-gray-500">{h.qty}주</span>
                    <span className="col-span-4 text-right text-gray-900 dark:text-white font-bold">
                      {fmt(Math.round(h.price * h.qty))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

```

### components/mock/RankingBoard.tsx

```tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/Skeleton";
import { fetchTopRankings, fetchMyRank, deleteRanking, RankingEntry } from "@/lib/rankingApi";
import { isAdmin } from "@/lib/adminConfig";

interface RankingBoardProps {
  myUserId: string | null;
  refreshTrigger?: number;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtPnl(amount: number) {
  const man = amount / 10000;
  const abs = Math.abs(man);
  const str = abs >= 10000 ? `${(abs / 10000).toFixed(1)}억` : `${Math.round(abs)}만`;
  return amount >= 0 ? `+${str}` : `-${str}`;
}

function pnlColor(amount: number) {
  if (amount > 0) return "text-red-500 dark:text-red-400";
  if (amount < 0) return "text-blue-500 dark:text-blue-400";
  return "text-gray-500";
}

function deltaLabel(current: number, prev?: number) {
  if (prev === undefined) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.005) return null;
  const arrow = diff > 0 ? "\u25B2" : "\u25BC";
  const color = diff > 0 ? "text-red-400" : "text-blue-400";
  return { text: `${arrow}${Math.abs(diff).toFixed(1)}%p`, color };
}

const MEDALS = ["🥇", "🥈", "🥉"];
const BOT_META: Record<string, { emoji: string; label: string }> = {
  bot_signal: { emoji: "📡", label: "시그널봇" },
  bot_gold: { emoji: "✨", label: "골드봇" },
  bot_ant: { emoji: "🐜", label: "개미봇" },
};
const INITIAL_VISIBLE = 10;
const LOAD_MORE_STEP = 50;

function RankingRow({
  entry,
  rank,
  isMe,
  canDelete,
  onDelete,
}: {
  entry: RankingEntry;
  rank: number;
  isMe: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const returnPct = entry.returnPct ?? 0;
  const pnl = entry.pnlAmount ?? Math.round(entry.totalAsset - 10_000_000);
  const delta = deltaLabel(returnPct, entry.prevReturnPct);
  const holdingExtra = (entry.holdingCount ?? 0) > 1 ? ` 외 ${(entry.holdingCount ?? 0) - 1}` : "";
  const holdingText = entry.topHolding ? `${entry.topHolding}${holdingExtra}` : "";

  return (
    <div
      className={`group px-2 py-2 rounded-lg transition-colors ${
        isMe
          ? "bg-kim-red/10 border border-kim-red/30"
          : "hover:bg-gray-50 dark:hover:bg-white/5"
      }`}
    >
      <div className="grid grid-cols-12 items-center text-xs font-mono">
        <span className="col-span-1 text-gray-500">
          {rank <= 3 ? MEDALS[rank - 1] : `${rank}`}
        </span>
        <div className="col-span-5 min-w-0">
          <div className={`truncate font-semibold ${isMe ? "text-kim-red" : "text-gray-900 dark:text-white"}`}>
            {entry.nickname?.trim() || "익명"}
            {isMe && <span className="ml-1 text-[10px] text-kim-red/70">나</span>}
            {entry.userId.startsWith("bot_") && (
              <span className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded font-mono">AI</span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 font-mono truncate flex items-center gap-1">
            {entry.investorType && <span>{entry.investorType}</span>}
            {entry.investorType && holdingText && <span>·</span>}
            {holdingText && <span>{holdingText}</span>}
          </div>
        </div>
        <div className="col-span-3 text-right">
          <span
            className={`font-bold ${
              returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
            }`}
          >
            {returnPct > 0 ? "+" : ""}
            {returnPct.toFixed(2)}%
          </span>
          {delta && (
            <div className={`text-[10px] ${delta.color}`}>{delta.text}</div>
          )}
        </div>
        <div className="col-span-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className={`font-bold ${pnl === 0 ? "text-gray-500" : pnlColor(pnl)}`}>
              {fmtPnl(pnl)}
            </span>
            {canDelete && (
              <button
                onClick={onDelete}
                className="hidden group-hover:inline-block text-[10px] text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                title="삭제 (관리자)"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[10px] text-gray-500">
            {fmt(Math.round(entry.totalAsset / 10000))}만
          </div>
        </div>
      </div>
      {entry.strategy && (
        <div className="mt-0.5 ml-6 text-xs text-gray-500 font-mono truncate">
          💬 &ldquo;{entry.strategy}&rdquo;
        </div>
      )}
    </div>
  );
}

export function RankingBoard({ myUserId, refreshTrigger }: RankingBoardProps) {
  const [allRankings, setAllRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; entry: RankingEntry } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchTopRankings(200);
      const filtered = data.filter(
        (e) => e.nickname?.trim() || e.userId.startsWith("bot_") || Math.abs(e.returnPct ?? 0) > 0.001
      );
      setAllRankings(filtered);

      if (myUserId) {
        const inList = filtered.findIndex((e) => e.userId === myUserId);
        if (inList >= 0) {
          setMyRank({ rank: inList + 1, entry: filtered[inList] });
        } else {
          const my = await fetchMyRank(myUserId).catch(() => null);
          setMyRank(my);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  useEffect(() => { load().catch(() => {}); }, [load, refreshTrigger]);

  // 봇 엔트리 + 순위 (allRankings에서 추출)
  const botEntries = useMemo(() => {
    return allRankings
      .map((e, i) => ({ entry: e, rank: i + 1 }))
      .filter(({ entry }) => entry.userId.startsWith("bot_"));
  }, [allRankings]);

  // 검색 필터링
  const displayRankings = useMemo(() => {
    if (!searchMode || !searchTerm.trim()) return allRankings;
    const term = searchTerm.trim().toLowerCase();
    return allRankings.filter(
      (e) =>
        (e.nickname?.toLowerCase().includes(term)) ||
        (e.userId.startsWith("bot_") && BOT_META[e.userId]?.label.toLowerCase().includes(term))
    );
  }, [allRankings, searchMode, searchTerm]);

  // 표시할 랭킹 (검색 중이면 전부, 아니면 visibleCount만큼)
  const visibleRankings = useMemo(() => {
    if (searchMode && searchTerm.trim()) return displayRankings;
    return displayRankings.slice(0, visibleCount);
  }, [displayRankings, visibleCount, searchMode, searchTerm]);

  const hasMore = !searchMode && visibleCount < allRankings.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, allRankings.length));
  };

  const handleDelete = async (entry: RankingEntry) => {
    if (!confirm(`${entry.nickname} 랭킹을 삭제하시겠습니까?`)) return;
    try {
      await deleteRanking(entry.userId);
      load().catch(() => {});
    } catch { /* ignore */ }
  };

  // 내 순위가 현재 표시 목록에 있는지
  const meInVisible = visibleRankings.some((r) => r.userId === myUserId);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">🏆 수익률 랭킹</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            TOP {allRankings.length} · 실시간
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSearchMode((v) => !v);
              if (searchMode) setSearchTerm("");
            }}
            className={`text-[10px] font-mono border px-2 py-1 rounded transition-colors ${
              searchMode
                ? "text-kim-red border-kim-red/30 bg-kim-red/10"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30"
            }`}
          >
            🔍
          </button>
          <button
            onClick={() => load().catch(() => {})}
            disabled={loading}
            className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-mono border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 검색 입력 */}
      {searchMode && (
        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="닉네임 검색..."
            autoFocus
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50 focus:ring-1 focus:ring-kim-red/20"
          />
          {searchTerm.trim() && (
            <p className="text-[10px] text-gray-400 font-mono mt-1">
              {displayRankings.length}명 검색됨
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          랭킹을 불러오지 못했습니다
        </div>
      ) : allRankings.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 등록된 참가자가 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* 섹션 A: AI 봇 고정 영역 */}
          {!searchMode && botEntries.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-indigo-400 font-mono font-bold mb-1.5 px-2 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                AI 투자봇
              </div>
              <div className="border border-indigo-500/20 rounded-lg bg-indigo-500/5 divide-y divide-indigo-500/10">
                {botEntries.map(({ entry, rank }) => {
                  const meta = BOT_META[entry.userId];
                  const returnPct = entry.returnPct ?? 0;
                  const pnl = entry.pnlAmount ?? Math.round(entry.totalAsset - 10_000_000);
                  return (
                    <div key={entry.userId} className="px-3 py-2">
                      <div className="grid grid-cols-12 items-center text-xs font-mono">
                        <span className="col-span-1 text-gray-500">{rank}</span>
                        <div className="col-span-5 min-w-0">
                          <div className="truncate font-semibold text-gray-900 dark:text-white">
                            {meta?.emoji} {meta?.label || entry.nickname}
                            <span className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded">AI</span>
                          </div>
                        </div>
                        <div className="col-span-3 text-right">
                          <span
                            className={`font-bold ${
                              returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
                            }`}
                          >
                            {returnPct > 0 ? "+" : ""}
                            {returnPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className={`font-bold ${pnl === 0 ? "text-gray-500" : pnlColor(pnl)}`}>
                            {fmtPnl(pnl)}
                          </span>
                          <div className="text-[10px] text-gray-500">
                            {fmt(Math.round(entry.totalAsset / 10000))}만
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 섹션 B: 수익률 랭킹 테이블 헤더 */}
          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-2 pb-1 border-b border-gray-200 dark:border-white/10">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">수익률</span>
            <span className="col-span-3 text-right">평가손익</span>
          </div>

          {/* 랭킹 행 */}
          {visibleRankings.map((entry) => {
            const rank = allRankings.indexOf(entry) + 1;
            const isMe = entry.userId === myUserId;
            const canDelete = isAdmin(myUserId) && !isMe;
            return (
              <RankingRow
                key={entry.userId}
                entry={entry}
                rank={rank}
                isMe={isMe}
                canDelete={canDelete}
                onDelete={() => handleDelete(entry)}
              />
            );
          })}

          {/* 더보기 버튼 */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="mt-2 w-full text-[11px] font-mono text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 py-2 rounded-lg transition-colors"
            >
              더보기 ({visibleCount}/{allRankings.length})
            </button>
          )}

          {/* 내 순위 — 현재 목록에 없을 때만 */}
          {myRank && !meInVisible && (() => {
            const me = myRank.entry;
            const myReturnPct = me.returnPct ?? 0;
            const myPnl = me.pnlAmount ?? Math.round(me.totalAsset - 10_000_000);
            const myDelta = deltaLabel(myReturnPct, me.prevReturnPct);
            const myHoldingExtra = (me.holdingCount ?? 0) > 1 ? ` 외 ${(me.holdingCount ?? 0) - 1}` : "";
            const myHoldingText = me.topHolding ? `${me.topHolding}${myHoldingExtra}` : "";
            return (
            <>
              <div className="flex items-center gap-2 py-1 px-2">
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
                <span className="text-[10px] text-gray-400 font-mono shrink-0">내 순위</span>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
              </div>
              <div className="px-2 py-2 rounded-lg bg-kim-red/10 border border-kim-red/30">
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">{myRank.rank}</span>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate font-semibold text-kim-red">
                      {me.nickname}
                      <span className="ml-1 text-[10px] text-kim-red/70">나</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono truncate flex items-center gap-1">
                      {me.investorType && <span>{me.investorType}</span>}
                      {me.investorType && myHoldingText && <span>·</span>}
                      {myHoldingText && <span>{myHoldingText}</span>}
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`font-bold ${
                      myReturnPct > 0 ? "text-red-500 dark:text-red-400"
                      : myReturnPct < 0 ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-500"
                    }`}>
                      {myReturnPct > 0 ? "+" : ""}
                      {myReturnPct.toFixed(2)}%
                    </span>
                    {myDelta && (
                      <div className={`text-[10px] ${myDelta.color}`}>{myDelta.text}</div>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`font-bold ${myPnl === 0 ? "text-gray-500" : pnlColor(myPnl)}`}>
                      {fmtPnl(myPnl)}
                    </span>
                    <div className="text-[10px] text-gray-500">
                      {fmt(Math.round(me.totalAsset / 10000))}만
                    </div>
                  </div>
                </div>
              </div>
            </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

```

### components/mock/SectorTabs.tsx

```tsx
"use client";

export const SECTORS = [
  "반도체",
  "전력기기",
  "이차전지",
  "바이오",
  "엔터/플랫폼",
  "자동차",
  "정유/화학",
  "금융/증권",
  "의료기기",
  "조선/방산",
  "건설/인프라",
  "철강/소재",
  "소비재",
  "운송/물류",
  "통신",
  "유통",
  "지주/기타",
  "ETF",
] as const;

export type Sector = (typeof SECTORS)[number];

interface SectorTabsProps {
  active: Sector;
  onChange: (s: Sector) => void;
}

export function SectorTabs({ active, onChange }: SectorTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {SECTORS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-all whitespace-nowrap ${
            active === s
              ? "bg-kim-red text-white border-kim-red shadow"
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

```

### components/mock/StockList.tsx

```tsx
"use client";

import { Skeleton } from "@/components/Skeleton";
import { Sector } from "./SectorTabs";
import { StockPrice } from "@/lib/stockPricesApi";
import { Holding } from "@/hooks/useMockPortfolio";

export interface StockInfo {
  symbol: string;
  name: string;
  sector: Sector;
}

export const ALL_STOCKS: StockInfo[] = [
  // ── 반도체 ──
  { symbol: "005930.KS", name: "삼성전자",         sector: "반도체" },
  { symbol: "000660.KS", name: "SK하이닉스",       sector: "반도체" },
  { symbol: "009150.KS", name: "삼성전기",         sector: "반도체" },
  { symbol: "011070.KS", name: "LG이노텍",        sector: "반도체" },
  { symbol: "042700.KS", name: "한미반도체",       sector: "반도체" },
  { symbol: "058470.KS", name: "리노공업",         sector: "반도체" },
  { symbol: "403870.KQ", name: "HPSP",             sector: "반도체" },
  { symbol: "098460.KQ", name: "고영",             sector: "반도체" },
  { symbol: "036930.KQ", name: "주성엔지니어링",   sector: "반도체" },
  { symbol: "240810.KQ", name: "원익IPS",          sector: "반도체" },
  { symbol: "357780.KQ", name: "솔브레인",         sector: "반도체" },
  { symbol: "039030.KQ", name: "이오테크닉스",     sector: "반도체" },
  { symbol: "000990.KS", name: "DB하이텍",         sector: "반도체" },
  { symbol: "402340.KS", name: "SK스퀘어",         sector: "반도체" },
  { symbol: "353200.KQ", name: "대덕전자",         sector: "반도체" },
  { symbol: "007660.KQ", name: "이수페타시스",     sector: "반도체" },
  { symbol: "025950.KQ", name: "동진쎄미켐",       sector: "반도체" },
  { symbol: "089030.KQ", name: "테크윙",           sector: "반도체" },
  { symbol: "095340.KQ", name: "ISC",              sector: "반도체" },
  { symbol: "067310.KQ", name: "하나마이크론",     sector: "반도체" },
  { symbol: "064760.KQ", name: "티씨케이",         sector: "반도체" },
  { symbol: "014680.KS", name: "한솔케미칼",       sector: "반도체" },
  { symbol: "195870.KS", name: "해성디에스",       sector: "반도체" },
  { symbol: "187220.KQ", name: "디오",             sector: "반도체" },
  { symbol: "166090.KQ", name: "피엔티",           sector: "반도체" },
  { symbol: "078340.KQ", name: "컴투스",           sector: "반도체" },
  // ── 전력기기 ──
  { symbol: "267260.KS", name: "HD현대일렉트릭",   sector: "전력기기" },
  { symbol: "267270.KS", name: "효성중공업",       sector: "전력기기" },
  { symbol: "010120.KS", name: "LS ELECTRIC",      sector: "전력기기" },
  { symbol: "033100.KS", name: "제룡전기",         sector: "전력기기" },
  { symbol: "006260.KS", name: "LS",               sector: "전력기기" },
  { symbol: "103590.KS", name: "일진전기",         sector: "전력기기" },
  { symbol: "112610.KS", name: "씨에스윈드",       sector: "전력기기" },
  { symbol: "015760.KS", name: "한국전력",         sector: "전력기기" },
  { symbol: "051600.KS", name: "한전KPS",          sector: "전력기기" },
  { symbol: "034220.KS", name: "LG디스플레이",     sector: "전력기기" },
  { symbol: "052690.KS", name: "한전기술",         sector: "전력기기" },
  { symbol: "001440.KS", name: "대한전선",         sector: "전력기기" },
  // ── 이차전지 ──
  { symbol: "373220.KS", name: "LG에너지솔루션",   sector: "이차전지" },
  { symbol: "086520.KS", name: "에코프로",         sector: "이차전지" },
  { symbol: "003670.KS", name: "포스코퓨처엠",     sector: "이차전지" },
  { symbol: "066970.KS", name: "엘앤에프",         sector: "이차전지" },
  { symbol: "247540.KS", name: "에코프로비엠",     sector: "이차전지" },
  { symbol: "006400.KS", name: "삼성SDI",          sector: "이차전지" },
  { symbol: "348370.KQ", name: "엔켐",             sector: "이차전지" },
  { symbol: "012510.KS", name: "더블유씨피",       sector: "이차전지" },
  { symbol: "005070.KS", name: "코스모신소재",     sector: "이차전지" },
  { symbol: "108320.KQ", name: "LX세미콘",         sector: "이차전지" },
  { symbol: "361610.KS", name: "SK아이이테크놀로지", sector: "이차전지" },
  { symbol: "383310.KQ", name: "에코프로에이치엔",  sector: "이차전지" },
  { symbol: "278280.KQ", name: "천보",             sector: "이차전지" },
  { symbol: "365340.KQ", name: "성일하이텍",       sector: "이차전지" },
  // ── 바이오/제약 ──
  { symbol: "207940.KS", name: "삼성바이오로직스", sector: "바이오" },
  { symbol: "068270.KS", name: "셀트리온",         sector: "바이오" },
  { symbol: "196170.KQ", name: "알테오젠",         sector: "바이오" },
  { symbol: "000100.KS", name: "유한양행",         sector: "바이오" },
  { symbol: "326030.KS", name: "SK바이오팜",       sector: "바이오" },
  { symbol: "145020.KQ", name: "휴젤",             sector: "바이오" },
  { symbol: "028300.KQ", name: "HLB",              sector: "바이오" },
  { symbol: "141080.KQ", name: "리가켐바이오",     sector: "바이오" },
  { symbol: "128940.KS", name: "한미약품",         sector: "바이오" },
  { symbol: "185750.KS", name: "종근당",           sector: "바이오" },
  { symbol: "006280.KS", name: "녹십자",           sector: "바이오" },
  { symbol: "069620.KS", name: "대웅제약",         sector: "바이오" },
  { symbol: "302440.KQ", name: "SK바이오사이언스", sector: "바이오" },
  { symbol: "195990.KQ", name: "에이비엘바이오",   sector: "바이오" },
  { symbol: "950170.KQ", name: "JW중외제약",       sector: "바이오" },
  { symbol: "003850.KS", name: "보령",             sector: "바이오" },
  { symbol: "009420.KS", name: "한올바이오파마",   sector: "바이오" },
  { symbol: "003090.KS", name: "대웅",             sector: "바이오" },
  { symbol: "008930.KS", name: "한미사이언스",     sector: "바이오" },
  { symbol: "007570.KS", name: "일양약품",         sector: "바이오" },
  { symbol: "009290.KS", name: "광동제약",         sector: "바이오" },
  { symbol: "086900.KQ", name: "메디톡스",         sector: "바이오" },
  { symbol: "019170.KQ", name: "신풍제약",         sector: "바이오" },
  // ── 엔터/플랫폼 ──
  { symbol: "035420.KS", name: "네이버",           sector: "엔터/플랫폼" },
  { symbol: "035720.KS", name: "카카오",           sector: "엔터/플랫폼" },
  { symbol: "352820.KS", name: "HYBE",             sector: "엔터/플랫폼" },
  { symbol: "035900.KS", name: "JYP Ent.",         sector: "엔터/플랫폼" },
  { symbol: "259960.KS", name: "크래프톤",         sector: "엔터/플랫폼" },
  { symbol: "263750.KS", name: "펄어비스",         sector: "엔터/플랫폼" },
  { symbol: "251270.KS", name: "넷마블",           sector: "엔터/플랫폼" },
  { symbol: "293490.KQ", name: "카카오게임즈",     sector: "엔터/플랫폼" },
  { symbol: "041510.KQ", name: "SM",               sector: "엔터/플랫폼" },
  { symbol: "323410.KS", name: "카카오뱅크",       sector: "엔터/플랫폼" },
  { symbol: "067160.KQ", name: "아프리카TV",       sector: "엔터/플랫폼" },
  { symbol: "036570.KS", name: "엔씨소프트",       sector: "엔터/플랫폼" },
  { symbol: "112040.KQ", name: "위메이드",         sector: "엔터/플랫폼" },
  { symbol: "122870.KQ", name: "YG엔터테인먼트",   sector: "엔터/플랫폼" },
  { symbol: "377300.KS", name: "카카오페이",       sector: "엔터/플랫폼" },
  { symbol: "035760.KS", name: "CJ ENM",           sector: "엔터/플랫폼" },
  { symbol: "253450.KQ", name: "스튜디오드래곤",   sector: "엔터/플랫폼" },
  { symbol: "018260.KS", name: "삼성SDS",          sector: "엔터/플랫폼" },
  // ── 자동차 ──
  { symbol: "005380.KS", name: "현대차",           sector: "자동차" },
  { symbol: "000270.KS", name: "기아",             sector: "자동차" },
  { symbol: "012330.KS", name: "현대모비스",       sector: "자동차" },
  { symbol: "204320.KS", name: "HL만도",           sector: "자동차" },
  { symbol: "018880.KS", name: "한온시스템",       sector: "자동차" },
  { symbol: "161390.KS", name: "한국타이어앤테크놀로지", sector: "자동차" },
  { symbol: "011210.KS", name: "현대위아",         sector: "자동차" },
  { symbol: "298050.KS", name: "효성첨단소재",     sector: "자동차" },
  { symbol: "298040.KS", name: "현대트랜시스",     sector: "자동차" },
  { symbol: "307950.KS", name: "현대오토에버",     sector: "자동차" },
  // ── 정유/화학 ──
  { symbol: "051910.KS", name: "LG화학",           sector: "정유/화학" },
  { symbol: "096770.KS", name: "SK이노베이션",     sector: "정유/화학" },
  { symbol: "010950.KS", name: "S-Oil",            sector: "정유/화학" },
  { symbol: "011780.KS", name: "금호석유",         sector: "정유/화학" },
  { symbol: "078930.KS", name: "GS",               sector: "정유/화학" },
  { symbol: "011170.KS", name: "롯데케미칼",       sector: "정유/화학" },
  { symbol: "009830.KS", name: "한화솔루션",       sector: "정유/화학" },
  { symbol: "010060.KS", name: "OCI홀딩스",        sector: "정유/화학" },
  { symbol: "298000.KS", name: "효성화학",         sector: "정유/화학" },
  { symbol: "011790.KS", name: "SKC",              sector: "정유/화학" },
  { symbol: "006650.KS", name: "대한유화",         sector: "정유/화학" },
  { symbol: "298020.KS", name: "효성티앤씨",       sector: "정유/화학" },
  // ── 금융/증권 ──
  { symbol: "039490.KS", name: "키움증권",         sector: "금융/증권" },
  { symbol: "006800.KS", name: "미래에셋증권",     sector: "금융/증권" },
  { symbol: "105560.KS", name: "KB금융",           sector: "금융/증권" },
  { symbol: "016360.KS", name: "삼성증권",         sector: "금융/증권" },
  { symbol: "055550.KS", name: "신한지주",         sector: "금융/증권" },
  { symbol: "086790.KS", name: "하나금융지주",     sector: "금융/증권" },
  { symbol: "316140.KS", name: "우리금융지주",     sector: "금융/증권" },
  { symbol: "138040.KS", name: "메리츠금융지주",   sector: "금융/증권" },
  { symbol: "005940.KS", name: "NH투자증권",       sector: "금융/증권" },
  { symbol: "071050.KS", name: "한국금융지주",     sector: "금융/증권" },
  { symbol: "032830.KS", name: "삼성화재",         sector: "금융/증권" },
  { symbol: "001450.KS", name: "현대해상",         sector: "금융/증권" },
  { symbol: "005830.KS", name: "DB손해보험",       sector: "금융/증권" },
  { symbol: "138930.KS", name: "BNK금융지주",      sector: "금융/증권" },
  { symbol: "139130.KS", name: "DGB금융지주",      sector: "금융/증권" },
  { symbol: "175330.KS", name: "JB금융지주",       sector: "금융/증권" },
  // ── 의료기기 ──
  { symbol: "214150.KQ", name: "클래시스",         sector: "의료기기" },
  { symbol: "214450.KQ", name: "파마리서치",       sector: "의료기기" },
  { symbol: "145720.KQ", name: "덴티움",           sector: "의료기기" },
  { symbol: "328130.KQ", name: "루닛",             sector: "의료기기" },
  { symbol: "085660.KQ", name: "차바이오텍",       sector: "의료기기" },
  { symbol: "950160.KQ", name: "코오롱티슈진",     sector: "의료기기" },
  { symbol: "322510.KQ", name: "제이앤티씨",       sector: "의료기기" },
  { symbol: "389030.KQ", name: "지놈앤컴퍼니",     sector: "의료기기" },
  { symbol: "041830.KQ", name: "인바디",           sector: "의료기기" },
  { symbol: "043150.KQ", name: "바텍",             sector: "의료기기" },
  // ── 조선/방산 ──
  { symbol: "329180.KS", name: "HD현대중공업",     sector: "조선/방산" },
  { symbol: "042660.KS", name: "한화오션",         sector: "조선/방산" },
  { symbol: "009540.KS", name: "HD한국조선해양",   sector: "조선/방산" },
  { symbol: "012450.KS", name: "한화에어로스페이스", sector: "조선/방산" },
  { symbol: "047810.KS", name: "한국항공우주",     sector: "조선/방산" },
  { symbol: "272210.KS", name: "한화시스템",       sector: "조선/방산" },
  { symbol: "079550.KS", name: "LIG넥스원",        sector: "조선/방산" },
  { symbol: "010620.KS", name: "HD현대미포",       sector: "조선/방산" },
  { symbol: "064350.KS", name: "현대로템",         sector: "조선/방산" },
  { symbol: "010140.KS", name: "삼성중공업",       sector: "조선/방산" },
  // ── 건설/인프라 ──
  { symbol: "000720.KS", name: "현대건설",         sector: "건설/인프라" },
  { symbol: "047040.KS", name: "대우건설",         sector: "건설/인프라" },
  { symbol: "006360.KS", name: "GS건설",           sector: "건설/인프라" },
  { symbol: "028260.KS", name: "삼성물산",         sector: "건설/인프라" },
  { symbol: "375500.KS", name: "DL이앤씨",         sector: "건설/인프라" },
  { symbol: "294870.KS", name: "HDC현대산업개발",  sector: "건설/인프라" },
  { symbol: "028050.KS", name: "삼성엔지니어링",   sector: "건설/인프라" },
  { symbol: "009410.KS", name: "태영건설",         sector: "건설/인프라" },
  // ── 철강/소재 ──
  { symbol: "005490.KS", name: "포스코홀딩스",     sector: "철강/소재" },
  { symbol: "004020.KS", name: "현대제철",         sector: "철강/소재" },
  { symbol: "010130.KS", name: "고려아연",         sector: "철강/소재" },
  { symbol: "001230.KS", name: "동국제강",         sector: "철강/소재" },
  { symbol: "058430.KS", name: "포스코스틸리온",   sector: "철강/소재" },
  { symbol: "002240.KS", name: "고려제강",         sector: "철강/소재" },
  { symbol: "047050.KS", name: "포스코인터내셔널", sector: "철강/소재" },
  { symbol: "103140.KS", name: "풍산",             sector: "철강/소재" },
  { symbol: "022100.KS", name: "POSCO DX",         sector: "철강/소재" },
  // ── 소비재 ──
  { symbol: "097950.KS", name: "CJ제일제당",       sector: "소비재" },
  { symbol: "271560.KS", name: "오리온",           sector: "소비재" },
  { symbol: "033780.KS", name: "KT&G",             sector: "소비재" },
  { symbol: "004370.KS", name: "농심",             sector: "소비재" },
  { symbol: "000080.KS", name: "하이트진로",       sector: "소비재" },
  { symbol: "090430.KS", name: "아모레퍼시픽",     sector: "소비재" },
  { symbol: "051900.KS", name: "LG생활건강",       sector: "소비재" },
  { symbol: "192820.KS", name: "코스맥스",         sector: "소비재" },
  { symbol: "280360.KS", name: "롯데웰푸드",       sector: "소비재" },
  { symbol: "005440.KS", name: "현대그린푸드",     sector: "소비재" },
  { symbol: "002790.KS", name: "아모레G",          sector: "소비재" },
  { symbol: "049770.KS", name: "동원F&B",          sector: "소비재" },
  { symbol: "021240.KS", name: "코웨이",           sector: "소비재" },
  { symbol: "383220.KS", name: "F&F",              sector: "소비재" },
  { symbol: "111770.KS", name: "영원무역",         sector: "소비재" },
  { symbol: "003230.KS", name: "삼양식품",         sector: "소비재" },
  { symbol: "005180.KS", name: "빙그레",           sector: "소비재" },
  { symbol: "008770.KS", name: "호텔신라",         sector: "소비재" },
  { symbol: "161890.KQ", name: "한국콜마",         sector: "소비재" },
  { symbol: "267980.KS", name: "매일유업",         sector: "소비재" },
  // ── 운송/물류 ──
  { symbol: "003490.KS", name: "대한항공",         sector: "운송/물류" },
  { symbol: "011200.KS", name: "HMM",              sector: "운송/물류" },
  { symbol: "000120.KS", name: "CJ대한통운",       sector: "운송/물류" },
  { symbol: "180640.KS", name: "한진칼",           sector: "운송/물류" },
  { symbol: "241560.KS", name: "두산밥캣",         sector: "운송/물류" },
  { symbol: "086280.KS", name: "현대글로비스",     sector: "운송/물류" },
  { symbol: "028670.KS", name: "팬오션",           sector: "운송/물류" },
  { symbol: "089590.KS", name: "제주항공",         sector: "운송/물류" },
  { symbol: "002320.KS", name: "한진",             sector: "운송/물류" },
  // ── 통신 ──
  { symbol: "017670.KS", name: "SK텔레콤",         sector: "통신" },
  { symbol: "030200.KS", name: "KT",               sector: "통신" },
  { symbol: "032640.KS", name: "LG유플러스",       sector: "통신" },
  // ── 유통 ──
  { symbol: "139480.KS", name: "이마트",           sector: "유통" },
  { symbol: "004170.KS", name: "신세계",           sector: "유통" },
  { symbol: "069960.KS", name: "현대백화점",       sector: "유통" },
  { symbol: "007070.KS", name: "GS리테일",         sector: "유통" },
  { symbol: "282330.KS", name: "BGF리테일",        sector: "유통" },
  { symbol: "023530.KS", name: "롯데쇼핑",         sector: "유통" },
  // ── 지주/기타 ──
  { symbol: "034730.KS", name: "SK",               sector: "지주/기타" },
  { symbol: "003550.KS", name: "LG",               sector: "지주/기타" },
  { symbol: "000880.KS", name: "한화",             sector: "지주/기타" },
  { symbol: "034020.KS", name: "두산에너빌리티",   sector: "지주/기타" },
  { symbol: "267250.KS", name: "HD현대",           sector: "지주/기타" },
  { symbol: "001040.KS", name: "CJ",               sector: "지주/기타" },
  { symbol: "004990.KS", name: "롯데지주",         sector: "지주/기타" },
  { symbol: "036460.KS", name: "한국가스공사",     sector: "지주/기타" },
  { symbol: "066570.KS", name: "LG전자",           sector: "지주/기타" },
  { symbol: "000150.KS", name: "두산",             sector: "지주/기타" },
  // ── ETF ──
  { symbol: "069500.KS", name: "KODEX 200",              sector: "ETF" },
  { symbol: "102110.KS", name: "TIGER 200",              sector: "ETF" },
  { symbol: "229200.KS", name: "KODEX 코스닥150",        sector: "ETF" },
  { symbol: "360750.KS", name: "TIGER 미국S&P500",       sector: "ETF" },
  { symbol: "122630.KS", name: "KODEX 레버리지",         sector: "ETF" },
  { symbol: "305720.KS", name: "TIGER 2차전지테마",      sector: "ETF" },
  { symbol: "381180.KS", name: "TIGER 미국나스닥100",    sector: "ETF" },
  { symbol: "461500.KS", name: "KODEX 미국반도체MV",     sector: "ETF" },
  { symbol: "252670.KS", name: "KODEX 200선물인버스2X",  sector: "ETF" },
  { symbol: "114800.KS", name: "KODEX 인버스",           sector: "ETF" },
  { symbol: "091160.KS", name: "KODEX 반도체",           sector: "ETF" },
  { symbol: "143850.KS", name: "TIGER 미국S&P500선물(H)", sector: "ETF" },
];

interface StockListProps {
  sector: Sector;
  prices: Record<string, StockPrice>;
  pricesLoading: boolean;
  holdings: Record<string, Holding>;
  onBuy: (stock: StockInfo, price: number) => void;
  onSell: (stock: StockInfo, price: number, holding: Holding) => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export function StockList({
  sector,
  prices,
  pricesLoading,
  holdings,
  onBuy,
  onSell,
}: StockListProps) {
  const stocks = ALL_STOCKS.filter((s) => s.sector === sector);

  return (
    <div className="flex flex-col gap-1">
      {stocks.map((stock) => {
        const px = prices[stock.symbol];
        const holding = holdings[stock.symbol];
        const changePct = px?.changePct ?? 0;
        const price = px?.price ?? null;

        return (
          <div
            key={stock.symbol}
            className="flex items-center justify-between bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 gap-2"
          >
            {/* 종목 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {stock.name}
                </span>
                {holding && (
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                    {holding.qty}주
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">{stock.symbol}</div>
            </div>

            {/* 가격 */}
            <div className="text-right min-w-[90px]">
              {pricesLoading && !price ? (
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ) : price ? (
                <>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {fmt(Math.round(price))}
                  </div>
                  <div
                    className={`text-xs font-mono ${
                      changePct > 0
                        ? "text-red-500 dark:text-red-400"
                        : changePct < 0
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-gray-500"
                    }`}
                  >
                    {changePct > 0 ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 font-mono">—</div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-1">
              <button
                disabled={!price}
                onClick={() => price && onBuy(stock, price)}
                className="text-xs font-mono px-2 py-1 rounded bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                매수
              </button>
              <button
                disabled={!price || !holding}
                onClick={() => price && holding && onSell(stock, price, holding)}
                className="text-xs font-mono px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                매도
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

```

### components/mock/WebViewBanner.tsx

```tsx
"use client";

import { useEffect, useState } from "react";

/** 카카오톡 / 인스타 등 인앱 WebView 감지 (정식 브라우저 오탐 방지) */
function detectWebView(): { isWebView: boolean; isKakao: boolean; isAndroid: boolean } {
  if (typeof navigator === "undefined") return { isWebView: false, isKakao: false, isAndroid: false };
  const ua = navigator.userAgent;

  // 카카오톡 인앱 브라우저 — UA에 KAKAOTALK 명시됨
  const isKakao = /KAKAOTALK/i.test(ua);

  // Android 공식 WebView 플래그: "wv)" 포함 (Chrome, Samsung 등 정식 브라우저엔 없음)
  const isAndroidWebView = /Android/.test(ua) && /wv\)/.test(ua);

  // 인스타그램 / Facebook 인앱
  const isSocialApp = /Instagram|FBAN|FBAV/i.test(ua);

  const isAndroid = /Android/i.test(ua);
  return {
    isWebView: isKakao || isAndroidWebView || isSocialApp,
    isKakao,
    isAndroid,
  };
}

export function WebViewBanner() {
  const [info, setInfo] = useState<{ isWebView: boolean; isKakao: boolean; isAndroid: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInfo(detectWebView());
  }, []);

  if (!info?.isWebView || dismissed) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const chromeUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="sticky top-0 z-40 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-3">
      <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-300">
          {info.isKakao ? "카카오톡 브라우저" : "인앱 브라우저"} — Google 로그인 불가
        </p>
        <p className="text-xs text-amber-200/70 font-mono mt-0.5">
          {info.isAndroid
            ? <>우측 상단 <span className="text-white">⋯</span> → 다른 브라우저로 열기</>
            : <>하단 공유 버튼(↑) → Safari로 열기</>}
        </p>
        {info.isAndroid && (
          <a
            href={chromeUrl}
            className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold hover:bg-amber-500/30 transition-colors"
          >
            Chrome으로 열기
          </a>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-300 text-lg leading-none shrink-0 mt-0.5"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}

```

## components/stock-lab/

### components/stock-lab/AiBriefing.tsx

```tsx
"use client";

import { motion } from "framer-motion";
import type { StockBriefingResponse } from "@/types";

interface Props {
  stockCount: number;
  briefing: string | null;
  briefingResult: StockBriefingResponse | null;
  isBriefingStreaming: boolean;
  onRequest: () => void;
}

export function AiBriefing({ stockCount, briefing, briefingResult, isBriefingStreaming, onRequest }: Props) {
  if (stockCount === 0) return null;

  const buttonLabel = stockCount === 1 ? "🔬 이 종목 어때?" : "🔬 어떤 게 낫나?";
  const showButton = !briefingResult && !isBriefingStreaming;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-black text-white mb-3">AI 브리핑</h3>

      {/* 분석 요청 버튼 */}
      {showButton && (
        <motion.button
          onClick={onRequest}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {buttonLabel}
        </motion.button>
      )}

      {/* 스트리밍 중 */}
      {isBriefingStreaming && briefing && (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
          {briefing}
          <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
        </div>
      )}

      {isBriefingStreaming && !briefing && (
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono py-4">
          <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          오비젼이 분석 중...
        </div>
      )}

      {/* 결과 */}
      {briefingResult && !isBriefingStreaming && (
        <div className="space-y-3">
          {/* 브리핑 텍스트 */}
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {briefingResult.briefing}
          </p>

          {/* verdict + riskLevel 배지 */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black ring-1 ${
                briefingResult.verdict === "매수"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 ring-red-500/20"
                  : briefingResult.verdict === "매도"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 ring-blue-500/20"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 ring-yellow-500/20"
              }`}
            >
              {briefingResult.verdict}
            </span>
            <span
              className={`px-2 py-1 rounded-md text-[10px] font-bold ring-1 ${
                briefingResult.riskLevel === "low"
                  ? "bg-green-500/15 text-green-400 ring-green-500/20"
                  : briefingResult.riskLevel === "high"
                  ? "bg-red-500/15 text-red-400 ring-red-500/20"
                  : "bg-yellow-500/15 text-yellow-400 ring-yellow-500/20"
              }`}
            >
              위험도 {briefingResult.riskLevel === "low" ? "낮음" : briefingResult.riskLevel === "high" ? "높음" : "보통"}
            </span>
          </div>

          {/* keyPoints */}
          {briefingResult.keyPoints.length > 0 && (
            <ul className="space-y-1">
              {briefingResult.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* 다시 분석 */}
          <button
            onClick={onRequest}
            className="text-[10px] text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
          >
            다시 분석
          </button>
        </div>
      )}
    </div>
  );
}

```

### components/stock-lab/BottomTabs.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectorCompare } from "./SectorCompare";
import { InvestorTrend } from "./InvestorTrend";
import { NewsPanel } from "./NewsPanel";
import { SignalScanner } from "./SignalScanner";
import type { StockPrice } from "@/lib/stockPricesApi";
import type { StockSearchResult } from "@/lib/stockSearchApi";
import type { InvestorTrendData, SignalScanResponse, StockNewsItem } from "@/types";

const TABS = ["비교", "수급", "뉴스", "신호"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  stocks: { symbol: string; name: string }[];
  newsMap: Record<string, StockNewsItem[]>;
  investorMap: Record<string, InvestorTrendData>;
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoadingInvestor: boolean;
  isLoadingSector: boolean;
  signalData: SignalScanResponse | null;
  isLoadingSignal: boolean;
  getIndustry: (symbol: string) => string;
  onLoadInvestor: (symbol: string) => void;
  onLoadSector: (symbol: string) => void;
  onLoadSignal: () => void;
  onSelectStock: (symbol: string, name: string) => void;
}

export function BottomTabs({
  stocks,
  newsMap,
  investorMap,
  sectorPeers,
  sectorPriceMap,
  isLoadingInvestor,
  isLoadingSector,
  signalData,
  isLoadingSignal,
  getIndustry,
  onLoadInvestor,
  onLoadSector,
  onLoadSignal,
  onSelectStock,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("뉴스");

  useEffect(() => {
    if (stocks.length === 0) return;
    const lastSymbol = stocks[stocks.length - 1].symbol;

    if (activeTab === "수급") {
      onLoadInvestor(lastSymbol);
    } else if (activeTab === "비교") {
      onLoadSector(lastSymbol);
    }
  }, [activeTab, stocks, onLoadInvestor, onLoadSector]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "text-white"
                : "bg-white/5 text-gray-500 hover:text-gray-300"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="bottom-tab-indicator"
                className="absolute inset-0 bg-white/15 rounded-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      {activeTab === "비교" && (
        <SectorCompare
          stocks={stocks}
          sectorPeers={sectorPeers}
          sectorPriceMap={sectorPriceMap}
          isLoading={isLoadingSector}
          getIndustry={getIndustry}
          onLoad={onLoadSector}
        />
      )}

      {activeTab === "수급" && (
        <InvestorTrend
          stocks={stocks}
          investorMap={investorMap}
          isLoading={isLoadingInvestor}
          onLoad={onLoadInvestor}
        />
      )}

      {activeTab === "뉴스" && (
        <NewsPanel stocks={stocks} newsMap={newsMap} />
      )}

      {activeTab === "신호" && (
        <SignalScanner
          signalData={signalData}
          isLoading={isLoadingSignal}
          onLoad={onLoadSignal}
          onSelectStock={onSelectStock}
        />
      )}
    </div>
  );
}

```

### components/stock-lab/ComparisonCards.tsx

```tsx
"use client";

import { Skeleton } from "@/components/Skeleton";
import type { StockPrice } from "@/lib/stockPricesApi";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  priceMap: Record<string, StockPrice>;
}

export function ComparisonCards({ stocks, priceMap }: Props) {
  if (stocks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {stocks.map((s, i) => {
        const price = priceMap[s.symbol];
        if (!price) {
          return (
            <div
              key={s.symbol}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
          );
        }

        const isUp = price.changePct >= 0;

        return (
          <div
            key={s.symbol}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STOCK_COLORS[i] }}
              />
              <span className="text-xs font-bold text-white">{s.name}</span>
            </div>
            <div className="text-lg font-black text-white">
              {price.price.toLocaleString()}
              <span className="text-[10px] text-gray-500 ml-1">
                {price.currency === "KRW" ? "원" : price.currency}
              </span>
            </div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                isUp ? "text-red-400" : "text-blue-400"
              }`}
            >
              {isUp ? "+" : ""}
              {price.changePct.toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

```

### components/stock-lab/ComparisonChart.tsx

```tsx
"use client";

import { useRef, useEffect } from "react";
import { Skeleton } from "@/components/Skeleton";
import type { StockChartResponse, ChartRange, Candle } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

interface Props {
  stocks: { symbol: string; name: string }[];
  chartDataMap: Record<string, StockChartResponse>;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  isLoading: boolean;
}

function toDateStr(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeCandles(candles: Candle[]) {
  if (candles.length === 0) return [];
  const basePrice = candles[0].close;
  return candles.map((c) => ({
    time: toDateStr(c.time),
    value: ((c.close - basePrice) / basePrice) * 100,
  }));
}

export function ComparisonChart({ stocks, chartDataMap, range, onRangeChange, isLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || stocks.length === 0) return;

    const hasData = stocks.some((s) => chartDataMap[s.symbol]);
    if (!hasData) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, LineSeries } = await import("lightweight-charts");
      const container = containerRef.current;
      if (!container) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chartHeight = Math.min(container.clientWidth * 0.6, 350);
      chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        layout: {
          background: { color: "#0a0a0a" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
          horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: false,
        },
        localization: {
          priceFormatter: (price: number) => `${price.toFixed(1)}%`,
        },
      });

      chartRef.current = chart;

      stocks.forEach((stock, i) => {
        const chartData = chartDataMap[stock.symbol];
        if (!chartData) return;

        const normalized = normalizeCandles(chartData.candles);
        if (normalized.length === 0) return;

        const series = chart!.addSeries(LineSeries, {
          color: STOCK_COLORS[i],
          lineWidth: 2,
          crosshairMarkerVisible: true,
          lastValueVisible: true,
          priceLineVisible: false,
        });

        series.setData(normalized);
      });

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && container) {
          const h = Math.min(container.clientWidth * 0.6, 350);
          chart.applyOptions({ width: container.clientWidth, height: h });
        }
      });
      resizeObserver.observe(container);
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [stocks, chartDataMap]);

  if (stocks.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-3xl mb-2">🔬</div>
        <div className="text-sm text-gray-400 font-mono">종목을 검색해서 추가하세요</div>
        <div className="text-[10px] text-gray-500 mt-1 font-mono">최대 3개 비교 가능</div>
      </div>
    );
  }

  return (
    <div>
      {/* 범례 */}
      <div className="flex items-center gap-4 mb-2">
        {stocks.map((s, i) => (
          <div key={s.symbol} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STOCK_COLORS[i] }}
            />
            <span className="text-xs font-bold text-white">{s.name}</span>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div className="relative">
        <div
          ref={containerRef}
          className="rounded-xl overflow-hidden border border-white/10"
          style={{ minHeight: 220 }}
        />
        {isLoading && (
          <Skeleton variant="card" className="absolute inset-0" />
        )}
      </div>

      {/* 범위 선택 */}
      <div className="flex gap-1 mt-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRangeChange(opt.value)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
              range === opt.value
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

```

### components/stock-lab/InvestorTrend.tsx

```tsx
"use client";

import { useState, useMemo } from "react";
import { Skeleton } from "@/components/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { InvestorTrendData } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  investorMap: Record<string, InvestorTrendData>;
  isLoading: boolean;
  onLoad: (symbol: string) => void;
}

function formatQty(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color }}>
        {value >= 0 ? "+" : ""}
        {formatQty(value)}
      </p>
    </div>
  );
}

export function InvestorTrend({ stocks, investorMap, isLoading, onLoad }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const activeStock = stocks[activeTab] || stocks[0];
  const data = activeStock ? investorMap[activeStock.symbol] : undefined;
  const loaded = data !== undefined;

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      date: d.date ? `${d.date.slice(4, 6)}/${d.date.slice(6)}` : "",
      foreign: d.foreign,
      institution: d.institution,
      individual: d.individual,
    }));
  }, [data]);

  if (stocks.length === 0) {
    return (
      <div className="text-xs text-gray-500 font-mono py-8 text-center">
        종목을 선택하면 투자자별 순매수 추이를 확인할 수 있습니다
      </div>
    );
  }

  return (
    <div>
      {stocks.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {stocks.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === i
                  ? "text-white"
                  : "bg-white/5 text-gray-500 hover:text-gray-300"
              }`}
              style={
                activeTab === i
                  ? { backgroundColor: STOCK_COLORS[i] + "cc" }
                  : undefined
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {!loaded && activeStock && (
        <button
          onClick={() => onLoad(activeStock.symbol)}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {isLoading ? "로딩 중..." : "수급 데이터 불러오기"}
        </button>
      )}

      {loaded && data && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard label="외국인" value={data.summary.foreign} color="#ef4444" />
            <SummaryCard label="기관" value={data.summary.institution} color="#3b82f6" />
            <SummaryCard label="개인" value={data.summary.individual} color="#10b981" />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] text-gray-500 font-mono mb-2">최근 20일 순매수 추이 (주)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatQty}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(val, name) => {
                      const v = typeof val === "number" ? val : 0;
                      const n = name ?? "";
                      return [
                        formatQty(v),
                        n === "foreign" ? "외국인" : n === "institution" ? "기관" : "개인",
                      ];
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "foreign" ? "외국인" : value === "institution" ? "기관" : "개인"
                    }
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <ReferenceLine y={0} stroke="#374151" />
                  <Bar dataKey="foreign" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="institution" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="individual" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {isLoading && !data && (
        <div className="space-y-2 py-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      )}
    </div>
  );
}

```

### components/stock-lab/NewsPanel.tsx

```tsx
"use client";

import { useState } from "react";
import type { StockNewsItem } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  newsMap: Record<string, StockNewsItem[]>;
}

export function NewsPanel({ stocks, newsMap }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  if (stocks.length === 0) return null;

  const activeStock = stocks[activeTab] || stocks[0];
  const news = newsMap[activeStock?.symbol] || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-black text-white mb-3">관련 뉴스</h3>

      {/* 탭 */}
      {stocks.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {stocks.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === i
                  ? "text-white"
                  : "bg-white/5 text-gray-500 hover:text-gray-300"
              }`}
              style={
                activeTab === i
                  ? { backgroundColor: STOCK_COLORS[i] + "cc" }
                  : undefined
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 뉴스 목록 */}
      {news.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono py-4 text-center">
          뉴스를 불러오는 중...
        </div>
      ) : (
        <ul className="space-y-2">
          {news.slice(0, 5).map((item, i) => (
            <li key={i}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-300 hover:text-white transition-colors leading-relaxed"
              >
                <span className="text-gray-500 mr-1.5">{i + 1}.</span>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

```

### components/stock-lab/SectorCompare.tsx

```tsx
"use client";

import { Skeleton } from "@/components/Skeleton";
import type { StockPrice } from "@/lib/stockPricesApi";
import type { StockSearchResult } from "@/lib/stockSearchApi";

interface Props {
  stocks: { symbol: string; name: string }[];
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoading: boolean;
  getIndustry: (symbol: string) => string;
  onLoad: (symbol: string) => void;
}

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

export function SectorCompare({
  stocks,
  sectorPeers,
  sectorPriceMap,
  isLoading,
  getIndustry,
  onLoad,
}: Props) {
  if (stocks.length === 0) {
    return (
      <div className="text-xs text-gray-500 font-mono py-8 text-center">
        종목을 선택하면 같은 업종 경쟁사를 비교할 수 있습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stocks.map((stock, idx) => {
        const industry = getIndustry(stock.symbol);
        const peers = sectorPeers[stock.symbol];
        const loaded = peers !== undefined;

        if (!loaded) {
          return (
            <div key={stock.symbol} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STOCK_COLORS[idx] }}
                />
                <span className="text-sm font-bold text-white">{stock.name}</span>
                {industry && (
                  <span className="text-[10px] text-gray-500 font-mono">{industry}</span>
                )}
              </div>
              <button
                onClick={() => onLoad(stock.symbol)}
                className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                경쟁사 비교 불러오기
              </button>
            </div>
          );
        }

        if (peers.length === 0) {
          return (
            <div key={stock.symbol} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STOCK_COLORS[idx] }}
                />
                <span className="text-sm font-bold text-white">{stock.name}</span>
                {industry && (
                  <span className="text-[10px] text-gray-500 font-mono">{industry}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono text-center py-3">
                같은 업종 종목이 없습니다
              </p>
            </div>
          );
        }

        return (
          <div key={stock.symbol} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: STOCK_COLORS[idx] }}
              />
              <span className="text-sm font-bold text-white">{stock.name}</span>
              {industry && (
                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">
                  {industry}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {peers.map((peer) => {
                const price = sectorPriceMap[peer.symbol];
                return (
                  <div
                    key={peer.symbol}
                    className="rounded-lg bg-white/5 border border-white/10 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{peer.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{peer.exchange}</p>
                      </div>
                      {price ? (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-white">
                            {price.price.toLocaleString()}
                          </p>
                          <p
                            className={`text-[10px] font-mono ${
                              price.changePct >= 0 ? "text-red-400" : "text-blue-400"
                            }`}
                          >
                            {price.changePct >= 0 ? "+" : ""}
                            {price.changePct.toFixed(2)}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      )}
    </div>
  );
}

```

### components/stock-lab/SignalScanner.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SignalScanResponse } from "@/types";

type FilterType = "전체" | "5·20 교차" | "20·60 교차";

interface Props {
  signalData: SignalScanResponse | null;
  isLoading: boolean;
  onLoad: () => void;
  onSelectStock: (symbol: string, name: string) => void;
}

export function SignalScanner({ signalData, isLoading, onLoad, onSelectStock }: Props) {
  const [filter, setFilter] = useState<FilterType>("전체");

  useEffect(() => {
    if (!signalData && !isLoading) onLoad();
  }, [signalData, isLoading, onLoad]);

  const filtered = signalData?.results.filter((s) => {
    if (filter === "전체") return true;
    if (filter === "5·20 교차") return s.crossType === "5_20";
    return s.crossType === "20_60";
  }) || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 mt-2">골든크로스 스캔 중...</p>
        <p className="text-[10px] text-gray-600 mt-1">최대 30초 소요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">골든크로스 + 수급</span>
          {signalData && (
            <span className="text-[10px] text-gray-500">
              {signalData.totalScanned}종목 스캔 · {signalData.results.length}건
            </span>
          )}
        </div>
        <button
          onClick={onLoad}
          className="text-[10px] text-gray-500 hover:text-white transition-colors"
        >
          새로고침
        </button>
      </div>

      <div className="flex gap-1">
        {(["전체", "5·20 교차", "20·60 교차"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
              filter === f
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-gray-500 hover:text-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-500">감지된 신호 없음</p>
          <p className="text-[10px] text-gray-600 mt-1">골든크로스 + 외국인/기관 순매수 조건</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.button
                key={`${s.symbol}-${s.crossType}-${s.crossDate}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectStock(s.symbol, s.name)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{s.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {s.symbol.replace(/\.\w+$/, "")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-white">
                      {s.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        s.changePct >= 0 ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      s.crossType === "5_20"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {s.crossType === "5_20" ? "5/20 GC" : "20/60 GC"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {s.daysAfterCross === 0 ? "오늘" : `${s.daysAfterCross}일 전`}
                  </span>
                  {s.foreignPct > 0 && (
                    <span className="text-[10px] text-gray-500">
                      외인 {s.foreignPct.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] flex-wrap">
                  <span className={s.foreignNet > 0 ? "text-red-400" : "text-blue-400"}>
                    외국인 {s.foreignNet > 0 ? "+" : ""}
                    {s.foreignNet.toLocaleString()}
                  </span>
                  <span className={s.institutionNet > 0 ? "text-red-400" : "text-blue-400"}>
                    기관 {s.institutionNet > 0 ? "+" : ""}
                    {s.institutionNet.toLocaleString()}
                  </span>
                  <span className={s.individualNet < 0 ? "text-blue-400" : "text-red-400"}>
                    개인 {s.individualNet > 0 ? "+" : ""}
                    {s.individualNet.toLocaleString()}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-[9px] text-gray-600 text-center mt-2">
        투자 판단의 참고 자료이며 투자 권유가 아닙니다
      </p>
    </div>
  );
}

```

### components/stock-lab/StockSearchBar.tsx

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStocks } from "@/lib/stockSearchApi";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  onAdd: (stock: { symbol: string; name: string }) => void;
  onRemove: (symbol: string) => void;
}

export function StockSearchBar({ stocks, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = stocks.length >= 3;

  useEffect(() => {
    if (!query.trim() || query.trim().length < 1 || isFull) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        const filtered = results.filter(
          (r) => !stocks.some((s) => s.symbol === r.symbol)
        );
        setSuggestions(filtered.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isFull, stocks]);

  const selectStock = (stock: { symbol: string; name: string }) => {
    onAdd(stock);
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative z-50">
      {/* 선택된 종목 태그 + 검색 입력 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-blue-500/50 transition-colors">
        {stocks.map((s, i) => (
          <motion.span
            key={s.symbol}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white max-w-[140px]"
            style={{ backgroundColor: STOCK_COLORS[i] + "cc" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STOCK_COLORS[i] }}
            />
            <span className="truncate">{s.name}</span>
            <button
              onClick={() => onRemove(s.symbol)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </motion.span>
        ))}
        {!isFull ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                selectStock(suggestions[0]);
              }
            }}
            placeholder={stocks.length === 0 ? "종목명 검색 (최대 3개)" : "종목 추가..."}
            className="flex-1 min-w-[100px] bg-transparent text-sm font-mono text-white placeholder:text-gray-500 focus:outline-none"
          />
        ) : (
          <span className="text-[10px] text-gray-500 font-mono px-1">최대 3종목</span>
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-gray-900 border border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
          >
            {suggestions.map((s) => (
              <button
                key={s.symbol}
                onClick={() => selectStock(s)}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

---

_끝 — 총 72개 파일_
