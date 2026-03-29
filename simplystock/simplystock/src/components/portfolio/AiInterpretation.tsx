"use client";

import { useState } from "react";
import type { AiAnalysis } from "@/lib/portfolioAnalyzeApi";

export type ViewMode = "trailing" | "forward";

interface Props {
  aiAnalysis: AiAnalysis | null;
  interpretation: string;
  isStreaming: boolean;
  viewMode: ViewMode;
  stockNameMap?: Record<string, string>;
}

export function AiInterpretation({ aiAnalysis, interpretation, isStreaming, viewMode, stockNameMap = {} }: Props) {
  const [expanded, setExpanded] = useState(false);

  // 스트리밍 중이고 아직 aiAnalysis가 없으면 로딩 표시
  if (isStreaming && !aiAnalysis) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-indigo-400">AI</span>
          </div>
          <span className="text-xs font-medium text-[var(--text-primary)]">종합 해석</span>
          <span className="text-[10px] text-indigo-400 animate-pulse">분석 중...</span>
        </div>
      </div>
    );
  }

  // AI 분석 있으면 종목별 상세 분석 토글
  if (aiAnalysis && aiAnalysis.stocks.length > 0) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-400">AI</span>
            </div>
            <span className="font-medium text-[var(--text-primary)]">종목별 상세 분석</span>
          </div>
          <span className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ maxHeight: expanded ? 5000 : 0, opacity: expanded ? 1 : 0 }}
        >
          <div className="px-4 pb-4">
            {aiAnalysis.stocks.map((stock, idx) => {
              const view = stock[viewMode];
              const name = stockNameMap[stock.code] || stock.name || stock.code;
              const signal = view.signal as string;
              return (
                <div key={stock.code} className={idx > 0 ? "border-t border-[var(--border-primary)] pt-4 mt-4" : ""}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">{name}</span>
                    {signal && <SignalBadge signal={signal} />}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                    {view.detail_analysis}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 폴백: 기존 텍스트 렌더링
  if (!interpretation) return null;

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-indigo-400">AI</span>
        </div>
        <span className="text-xs font-medium text-[var(--text-primary)]">종합 해석</span>
        {isStreaming && (
          <span className="text-[10px] text-indigo-400 animate-pulse">분석 중...</span>
        )}
      </div>
      <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
        {interpretation}
        {isStreaming && <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5" />}
      </div>
    </div>
  );
}

const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  danger:  { label: "위험", cls: "bg-red-500/20 text-red-500" },
  warning: { label: "경고", cls: "bg-amber-500/20 text-amber-500" },
  caution: { label: "주의", cls: "bg-yellow-500/20 text-yellow-500" },
  good:    { label: "양호", cls: "bg-emerald-500/20 text-emerald-500" },
  strong:  { label: "강세", cls: "bg-blue-500/20 text-blue-500" },
};

function SignalBadge({ signal }: { signal: string }) {
  const badge = SIGNAL_BADGE[signal];
  if (!badge) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>
      {badge.label}
    </span>
  );
}
