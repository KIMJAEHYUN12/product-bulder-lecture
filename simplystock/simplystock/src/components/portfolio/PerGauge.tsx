"use client";

import { useState, useEffect } from "react";
import { interpretPerPosition } from "@/lib/portfolioInterpret";

interface Props {
  position: number;
  currentPer: number | null;
  forwardPer?: number | null;
  bands: { min: number; p25: number; median: number; p75: number; max: number };
  asOf?: string;
}

export function PerGauge({ position, currentPer, forwardPer, bands, asOf }: Props) {
  const hasForward = forwardPer != null && currentPer != null;
  const [animatedPos, setAnimatedPos] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedPos(position), 100);
    return () => clearTimeout(t);
  }, [position]);

  const label = interpretPerPosition(position);
  const color =
    position > 75 ? "text-red-400" :
    position > 50 ? "text-amber-400" :
    position > 25 ? "text-emerald-400" : "text-blue-400";

  const markerColor =
    position > 75 ? "bg-red-400 border-red-300" :
    position > 50 ? "bg-amber-400 border-amber-300" :
    position > 25 ? "bg-emerald-400 border-emerald-300" : "bg-blue-400 border-blue-300";

  // Forward 비교 계산
  const forwardDiff = hasForward
    ? ((forwardPer! - currentPer!) / currentPer! * 100)
    : 0;
  const forwardMaxPer = hasForward ? Math.max(currentPer!, forwardPer!) : 0;

  const forwardInterpret = (() => {
    if (!hasForward) return null;
    const prefix = Math.abs(forwardDiff) >= 30 ? "대폭 " : "";
    if (forwardDiff > 5) return { text: `${prefix}시장이 실적 둔화를 반영 중`, color: "text-red-400" };
    if (forwardDiff < -5) return { text: `${prefix}실적 개선 기대 선반영`, color: "text-emerald-400" };
    return { text: "현 수준 유지 전망", color: "text-[var(--text-muted)]" };
  })();

  return (
    <div className="space-y-2">
      {/* 제목 + 출처 */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>PER 밴드 (10년)</span>
        <span className="text-[9px]">DART · Yahoo 자체계산{asOf ? ` · ${asOf}` : ""}</span>
      </div>

      {/* 밴드 게이지 (Trailing 기준) — 항상 표시 */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500/40 via-emerald-500/40 via-50% via-amber-500/40 to-red-500/40">
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow-lg transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${markerColor}`}
          style={{ left: `${Math.min(Math.max(animatedPos, 2), 98)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>{bands.min?.toFixed(1)}배</span>
        <span className={`text-xs font-bold ${color}`}>
          {currentPer?.toFixed(1) ?? "N/A"}배 ({position}%)
          {currentPer != null && bands.max > 0 && currentPer > bands.max && (
            <span className="ml-1 text-[9px] font-normal text-red-400">
              {position >= 100 ? "역대 최고 수준" : "상위 5% 초과"}
            </span>
          )}
        </span>
        <span>{bands.max?.toFixed(1)}배</span>
      </div>

      {/* Forward 비교 뷰 — Forward 데이터 있으면 항상 표시 */}
      {hasForward && (
        <div className="space-y-2 pt-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)]">Trailing</span>
              <span className={`font-bold ${color}`}>{currentPer!.toFixed(1)}배</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-overlay)]">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
                style={{ width: `${forwardMaxPer > 0 ? (currentPer! / forwardMaxPer) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)]">Forward</span>
              <span className="font-bold text-[var(--text-primary)]">{forwardPer!.toFixed(1)}배</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-overlay)]">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-700 ease-out"
                style={{ width: `${forwardMaxPer > 0 ? (forwardPer! / forwardMaxPer) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[var(--bg-overlay)]">
            <span className="text-[10px] text-[var(--text-muted)]">
              차이 {forwardDiff > 0 ? "+" : ""}{forwardDiff.toFixed(1)}%
            </span>
            {forwardInterpret && (
              <span className={`text-[10px] font-medium ${forwardInterpret.color}`}>
                {forwardInterpret.text}
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
