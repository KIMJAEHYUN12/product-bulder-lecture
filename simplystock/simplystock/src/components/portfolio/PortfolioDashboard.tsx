"use client";

import { SectorDonut } from "./SectorDonut";
import type { StockInSector } from "./SectorDonut";
import { interpretDiversification, formatVolume } from "@/lib/portfolioInterpret";
import type { PortfolioSummary, PortfolioStockData } from "@/lib/portfolioAnalyzeApi";

interface Props {
  portfolio: PortfolioSummary;
  stockNameMap?: Record<string, string>;
  stocks?: PortfolioStockData[];
  hasDiagnosis?: boolean;
}

export function PortfolioDashboard({ portfolio, stockNameMap = {}, stocks = [], hasDiagnosis = false }: Props) {
  const score = portfolio.diversificationScore;

  // 종목별 섹터+비중 계산
  const totalVal = portfolio.totalValue || 1;
  const stocksBySectorList: StockInSector[] = stocks.map((s) => ({
    name: s.name,
    sector: s.sector || "기타",
    weight: Math.round(((s.currentPrice || s.avgPrice) * s.qty / totalVal) * 100),
  })).sort((a, b) => b.weight - a.weight);

  // 상관관계: |r|>0.5 쌍이 있을 때만 렌더
  const correlationPairs = Object.entries(portfolio.correlationMatrix)
    .filter(([, v]) => Math.abs(v) > 0.5)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);
  const hasCorrelation = correlationPairs.length > 0;

  return (
    <div className="space-y-4">
      {/* 요약 카드 (진단 없을 때만) */}
      {!hasDiagnosis && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-[10px] text-[var(--text-muted)]">총 평가액</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {formatVolume(portfolio.totalValue)}원
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-muted)]">총 수익률</div>
              <div className={`text-sm font-bold ${portfolio.totalReturn >= 0 ? "text-red-400" : "text-blue-400"}`}>
                {portfolio.totalReturn > 0 ? "+" : ""}{typeof portfolio.totalReturn === "number" ? portfolio.totalReturn.toFixed(1) : "N/A"}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 섹터 도넛 + 분산도 통합 카드 */}
      {portfolio.sectorWeights.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
          <SectorDonut
            sectorWeights={portfolio.sectorWeights}
            stocksBySector={stocksBySectorList}
            diversificationScore={score}
            stockCount={portfolio.stockCount}
            diversificationText={interpretDiversification(score)}
          />
        </div>
      )}

      {/* 섹터 집중도 경고 */}
      {portfolio.sectorWeights.length > 0 && portfolio.sectorWeights[0].weight >= 70 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
          <span className="text-amber-400 text-sm shrink-0">!</span>
          <p className="text-[11px] text-amber-400 leading-relaxed">
            {portfolio.sectorWeights[0].sector} 섹터에 {portfolio.sectorWeights[0].weight}% 집중되어 있습니다.
            섹터 리스크에 취약할 수 있으니 분산을 고려해 보세요.
          </p>
        </div>
      )}

      {/* 상관관계 — |r|>0.5 쌍이 있을 때만 표시 */}
      {hasCorrelation && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-3">종목 간 상관관계</div>
          <div className="space-y-2">
            {correlationPairs.map(([key, v]) => {
              const [codeA, codeB] = key.split("_");
              const nameA = stockNameMap[codeA] || codeA;
              const nameB = stockNameMap[codeB] || codeB;
              const barWidth = Math.abs(v) * 100;
              const barColor = Math.abs(v) > 0.7 ? "bg-red-500" : "bg-amber-500";
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">{nameA} - {nameB}</span>
                    <span className={`font-medium ${
                      Math.abs(v) > 0.7 ? "text-red-400" : "text-amber-400"
                    }`}>
                      {v > 0 ? "+" : ""}{v.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--bg-overlay)]">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
