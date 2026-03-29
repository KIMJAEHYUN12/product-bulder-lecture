"use client";

import { useState, useEffect } from "react";

export interface StockInSector {
  name: string;
  sector: string;
  weight: number; // 포트폴리오 전체 대비 비중 %
}

interface Props {
  sectorWeights: { sector: string; weight: number }[];
  stocksBySector?: StockInSector[];
  diversificationScore?: number;
  stockCount?: number;
  diversificationText?: string;
}

const COLORS = [
  "#818cf8", "#f472b6", "#34d399", "#fbbf24",
  "#60a5fa", "#f87171", "#a78bfa", "#fb923c",
];

export function SectorDonut({ sectorWeights, stocksBySector = [], diversificationScore, stockCount, diversificationText }: Props) {
  // CSS conic-gradient 기반 도넛 차트
  let cumPercent = 0;
  const gradientStops = sectorWeights.map((s, i) => {
    const start = cumPercent;
    cumPercent += s.weight;
    const color = COLORS[i % COLORS.length];
    return `${color} ${start}% ${cumPercent}%`;
  });

  const gradient = `conic-gradient(${gradientStops.join(", ")})`;

  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--text-muted)]">섹터 구성</div>

      <div className="flex items-center gap-4">
        {/* 도넛 */}
        <div className="relative w-20 h-20 shrink-0">
          <div
            className="w-full h-full rounded-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-3 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--text-primary)]">
              {sectorWeights.length}섹터
            </span>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex-1 space-y-1.5">
          {sectorWeights.slice(0, 6).map((s, i) => {
            const stocks = stocksBySector.filter((st) => st.sector === s.sector);
            return (
              <div key={s.sector}>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-[var(--text-secondary)] truncate max-w-[100px]">{s.sector}</span>
                  <span className={`ml-auto ${s.weight >= 70 ? "text-amber-400 font-bold" : "text-[var(--text-muted)]"}`}>
                    {s.weight}%
                  </span>
                  {s.weight >= 70 && (
                    <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-400">집중</span>
                  )}
                </div>
                {stocks.length > 0 && (
                  <div className="ml-[14px] text-[0.8em] text-[var(--text-secondary)] leading-snug mt-0.5">
                    {stocks.map((st, j) => (
                      <span key={st.name}>
                        {j > 0 && <span className="mx-0.5">·</span>}
                        {st.name} ({st.weight}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 분산도 게이지 (score가 제공되면 표시) */}
      {diversificationScore != null && (
        <>
          <div className="border-t border-[var(--border-primary)] pt-3 space-y-1">
            <DiversificationGaugeInline score={diversificationScore} />
            <p className="text-[11px] text-[var(--text-muted)] text-center">
              {diversificationText || ""} {stockCount != null ? `(${stockCount}종목)` : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function DiversificationGaugeInline({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(50);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const filled = Math.round(animatedScore / 10);
  const scoreColor = score >= 50 ? "text-emerald-400" : score >= 30 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>집중</span>
        <span className={`text-xs font-bold ${scoreColor}`}>{score}점</span>
        <span>분산</span>
      </div>
      <div className="flex items-center gap-0.5 justify-center">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-full h-2 rounded-sm transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              i < filled
                ? score >= 50 ? "bg-emerald-500" : score >= 30 ? "bg-amber-500" : "bg-red-500"
                : "bg-[var(--bg-overlay)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
