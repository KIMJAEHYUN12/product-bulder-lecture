"use client";

import type { CollectionStep, AnalysisPhase } from "@/hooks/usePortfolioAnalysis";
import type { OcrStock } from "@/lib/portfolioAnalyzeApi";

interface Props {
  stocks: OcrStock[];
  progress: CollectionStep[];
  currentPhase: AnalysisPhase;
  phaseLabel: string;
}

const PHASES: { key: AnalysisPhase; label: string }[] = [
  { key: "ocr", label: "종목 확인" },
  { key: "dart", label: "데이터 수집" },
  { key: "valuation", label: "밸류에이션" },
  { key: "ai", label: "AI 분석" },
];

const STEP_CONFIG: { key: string; label: string }[] = [
  { key: "perBand", label: "밸류에이션 (PER 밴드)" },
  { key: "investorTrend", label: "수급 동향 (외국인/기관)" },
  { key: "chart", label: "차트 기술지표 (RSI/이평선)" },
];

function getPhaseIndex(phase: AnalysisPhase): number {
  if (!phase) return -1;
  return PHASES.findIndex((p) => p.key === phase);
}

function formatPreview(step: string, preview?: Record<string, unknown>): string | null {
  if (!preview) return null;
  switch (step) {
    case "perBand": {
      const pos = preview.perPosition as number | undefined;
      const per = preview.currentPer as number | undefined;
      if (pos != null && per != null) {
        const label = pos > 75 ? "고평가" : pos > 50 ? "보통" : pos > 25 ? "저평가" : "매우 저평가";
        return `PER ${per.toFixed(1)}배 (${label} 구간)`;
      }
      return null;
    }
    case "investorTrend": {
      const fNet = (preview.foreignNet30 ?? preview.foreignNet) as number | undefined;
      if (fNet != null) {
        const abs = Math.abs(fNet);
        const sign = fNet >= 0 ? "순매수" : "순매도";
        const vol = abs >= 100000000 ? `${(abs / 100000000).toFixed(1)}억` : abs >= 10000 ? `${(abs / 10000).toFixed(0)}만` : abs.toLocaleString();
        return `외국인 30일 ${vol}원 ${sign}`;
      }
      return null;
    }
    case "chart": {
      const rsi = preview.rsi as number | undefined;
      const trend = preview.trend as string | undefined;
      if (rsi != null && trend) {
        return `RSI ${rsi.toFixed(0)} / 추세 ${trend}`;
      }
      return null;
    }
    default:
      return null;
  }
}

/** Shimmer skeleton bar */
function Shimmer() {
  return (
    <div className="h-3 w-24 rounded bg-[var(--bg-overlay)] overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

export function CollectionProgress({ stocks, progress, currentPhase, phaseLabel }: Props) {
  const stockNames = stocks.map((s) => s.name);
  const activePhaseIdx = getPhaseIndex(currentPhase);

  const totalSteps = stockNames.length * STEP_CONFIG.length;
  const doneSteps = progress.filter((p) => p.status === "done" || p.status === "failed").length;
  const overallPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Shimmer keyframe (inline style) */}
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* Phase Stepper */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between mb-3">
          {PHASES.map((phase, i) => {
            const isDone = i < activePhaseIdx;
            const isActive = i === activePhaseIdx;

            return (
              <div key={phase.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                    isDone ? "bg-emerald-500/20 text-emerald-400 scale-100" :
                    isActive ? "bg-indigo-500/20 text-indigo-400 scale-110" :
                    "bg-[var(--bg-overlay)] text-[var(--text-muted)] scale-100"
                  }`}>
                    {isDone ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 whitespace-nowrap transition-colors duration-300 ${
                    isDone ? "text-emerald-400" :
                    isActive ? "text-indigo-400 font-medium" :
                    "text-[var(--text-muted)]"
                  }`}>
                    {phase.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1.5 mt-[-14px] rounded-full transition-all duration-700 ${
                    isDone ? "bg-emerald-500/40" :
                    isActive ? "bg-indigo-500/30" :
                    "bg-[var(--bg-overlay)]"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {phaseLabel && (
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-primary)]">
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-secondary)]">{phaseLabel}</span>
          </div>
        )}
      </div>

      {/* 전체 진행률 */}
      {stockNames.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--text-secondary)]">
              데이터 수집 ({doneSteps}/{totalSteps})
            </span>
            <span className="text-xs font-bold text-indigo-400 tabular-nums transition-all duration-300">
              {overallPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(overallPct, 2)}%` }}
            />
          </div>
        </div>
      )}

      {/* 종목별 데이터 수집 카드 */}
      {stockNames.map((name) => {
        const steps = progress.filter((p) => p.stock === name);
        const allDone = STEP_CONFIG.every((sc) =>
          steps.some((s) => s.step === sc.key && (s.status === "done" || s.status === "failed"))
        );
        const hasAny = steps.length > 0;

        return (
          <div
            key={name}
            className={`rounded-xl border bg-[var(--bg-card)] p-3 transition-all duration-500 ${
              allDone
                ? "border-emerald-500/40"
                : hasAny
                ? "border-indigo-500/40"
                : "border-[var(--border-primary)] opacity-40"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                allDone
                  ? "bg-emerald-500/20 text-emerald-400"
                  : hasAny
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-[var(--bg-overlay)] text-[var(--text-muted)]"
              }`}>
                {allDone ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : hasAny ? (
                  <div className="w-2.5 h-2.5 border-[1.5px] border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : "-"}
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">{name}</span>
            </div>

            <div className="space-y-2 pl-7">
              {STEP_CONFIG.map((sc) => {
                const step = steps.find((s) => s.step === sc.key);
                const isDone = step?.status === "done";
                const isFailed = step?.status === "failed";
                const isLoading = step?.status === "loading";
                const isPending = !step;
                const previewText = isDone ? formatPreview(sc.key, step?.preview) : null;

                return (
                  <div
                    key={sc.key}
                    className={`flex items-start gap-2 transition-all duration-300 ${
                      isDone ? "opacity-100" : isFailed ? "opacity-100" : isLoading ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    {/* Status icon */}
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                      isDone ? "bg-emerald-500/20 text-emerald-400 scale-100" :
                      isFailed ? "bg-red-500/20 text-red-400 scale-100" :
                      isLoading ? "bg-indigo-500/15 text-indigo-400 scale-100" :
                      "bg-[var(--bg-overlay)] text-[var(--text-muted)] scale-90"
                    }`}>
                      {isDone ? (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isFailed ? (
                        <span className="text-[8px] font-bold">X</span>
                      ) : isLoading ? (
                        <div className="w-2 h-2 border-[1.5px] border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-[8px]">-</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] transition-colors duration-300 ${
                          isDone ? "text-[var(--text-primary)]" :
                          isFailed ? "text-red-400" :
                          isLoading ? "text-indigo-400" :
                          "text-[var(--text-muted)]"
                        }`}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Loading shimmer */}
                      {isLoading && (
                        <div className="mt-1">
                          <Shimmer />
                        </div>
                      )}

                      {/* Done: preview fade in */}
                      {previewText && (
                        <p className="text-[10px] text-emerald-400/80 mt-0.5 animate-[fadeIn_0.3s_ease-out]">
                          {previewText}
                        </p>
                      )}
                      {isFailed && (
                        <p className="text-[10px] text-red-400/80 mt-0.5">수집 실패</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* fadeIn keyframe */}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
