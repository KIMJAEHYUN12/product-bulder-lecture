"use client";

import { useState } from "react";
import { SignalBadge, getSignalConfig } from "./SignalBadge";
import { PerGauge } from "./PerGauge";
import { SupplyBar } from "./SupplyBar";
import { TrendPanel } from "./TrendPanel";
import { EarningsLine } from "./EarningsLine";
import type { PortfolioStockData, StockAnalysisView } from "@/lib/portfolioAnalyzeApi";
import { BodyPositionMini } from "./BodyPositionChart";

interface DataAsOf {
  price?: string | null;
  supply?: string | null;
  chart?: string | null;
  dart?: string | null;
}

function fmtAsOf(raw: string | null | undefined): string {
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) return `${parseInt(raw.slice(4, 6))}/${parseInt(raw.slice(6, 8))}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return `${parseInt(raw.slice(5, 7))}/${parseInt(raw.slice(8, 10))}`;
  return raw;
}

interface Props {
  stock: PortfolioStockData;
  aiView: StockAnalysisView | null;
  index: number;
  dataAsOf?: DataAsOf;
}

const signalBorderColor: Record<string, string> = {
  danger: "border-l-red-400",
  warning: "border-l-orange-400",
  caution: "border-l-amber-400",
  good: "border-l-emerald-400",
  strong: "border-l-blue-400",
};

export function StockSummaryCard({ stock, aiView, index, dataAsOf }: Props) {
  const [expanded, setExpanded] = useState(false);
  const signal = aiView?.signal || "caution";
  const borderColor = signalBorderColor[signal] || "border-l-[var(--border-primary)]";
  const retColor = (stock.returnPct ?? 0) >= 0 ? "text-red-400" : "text-blue-400";

  // 미니 게이지 데이터
  const valuationPct = stock.perBand?.perPosition ?? null;
  const supplyDir = stock.supply
    ? (stock.supply.foreignNet30 > 0 || stock.supply.institutionNet30 > 0 ? "매수" : "매도")
    : null;
  const rsi = stock.technicals?.rsi ?? null;
  const maStatus = stock.technicals?.maStatus ?? null;

  return (
    <div
      className={`rounded-xl border border-[var(--border-primary)] border-l-[3px] ${borderColor} bg-[var(--bg-card)] overflow-hidden animate-[fadeSlideIn_0.4s_ease-out_both]`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* 접힌 상태 */}
      <div className="px-4 py-3 space-y-2">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{stock.name}</h3>
            <SignalBadge signal={signal} />
          </div>
          <div className="text-right shrink-0 ml-2">
            <span className="text-xs text-[var(--text-muted)]">{stock.qty}주</span>
            {stock.returnPct != null && (
              <span className={`text-sm font-bold ml-2 ${retColor}`}>
                {stock.returnPct > 0 ? "+" : ""}{stock.returnPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">{stock.symbol} · {stock.sector}</div>

        {/* 미니 게이지 1줄 */}
        <div className="flex items-center gap-3 text-[10px]">
          {valuationPct != null && (
            <MiniGauge label="밸류" value={valuationPct} maxVal={100} suffix="%" />
          )}
          {supplyDir && (
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">수급</span>
              <span className={supplyDir === "매수" ? "text-red-400 font-medium" : "text-blue-400 font-medium"}>
                {supplyDir === "매수" ? "▲" : "▼"} {supplyDir}
              </span>
            </div>
          )}
          {rsi != null && (
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">RSI</span>
              <span className={`font-medium ${rsi > 70 ? "text-red-400" : rsi < 30 ? "text-blue-400" : "text-[var(--text-primary)]"}`}>
                {rsi.toFixed(0)}
              </span>
            </div>
          )}
          {maStatus && (
            <span className={`font-medium ${maStatus === "정배열" ? "text-emerald-400" : maStatus === "역배열" ? "text-red-400" : "text-[var(--text-muted)]"}`}>
              {maStatus}
            </span>
          )}
          <BodyPositionMini avgPrice={stock.avgPrice} priceRange3y={stock.priceRange3y} />
        </div>

        {/* 핵심 인사이트 */}
        {aiView?.key_insight && (
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            ⚡ {aiView.key_insight}
          </p>
        )}

        {/* 펼치기 버튼 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full text-center text-[11px] py-1 transition-colors ${
            expanded
              ? "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              : "text-blue-400 font-medium hover:text-blue-300"
          }`}
        >
          {expanded ? "접기 ▲" : "상세 데이터 보기 ▼"}
        </button>
      </div>

      {/* 펼친 상태: 기존 상세 데이터 */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? 2000 : 0, opacity: expanded ? 1 : 0 }}
      >
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[var(--border-primary)]">
          {stock.perBand && (
            <PerGauge
              position={stock.perBand.perPosition}
              currentPer={stock.perBand.currentPer}
              forwardPer={stock.perBand.forwardPer}
              bands={stock.perBand.bands}
              asOf={fmtAsOf(dataAsOf?.dart)}
            />
          )}
          <EarningsLine data={stock.earnings} />
          {stock.supply && (
            <SupplyBar
              foreignNet={stock.supply.foreignNet30}
              institutionNet={stock.supply.institutionNet30}
              individualNet={stock.supply.individualNet30}
              foreignStreak={stock.supply.foreignStreak}
              asOf={fmtAsOf(stock.supply.asOf ?? dataAsOf?.supply)}
            />
          )}
          {stock.technicals && (
            <TrendPanel
              rsi={stock.technicals.rsi}
              maStatus={stock.technicals.maStatus}
              trend={stock.technicals.trend}
              sparkline={stock.sparkline}
              asOf={fmtAsOf(dataAsOf?.chart)}
            />
          )}
          {stock.dividendYield != null && stock.dividendYield > 0 && (
            <div className="text-[0.85em] text-[var(--text-secondary)]">
              <span className={stock.dividendYield >= 3 ? "text-emerald-400 font-medium" : ""}>
                배당: 수익률 {stock.dividendYield.toFixed(1)}%
              </span>
              {stock.dividendPerShare != null && stock.dividendPerShare > 0 && (
                <span> · 주당배당금 {stock.dividendPerShare.toLocaleString()}원</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniGauge({ label, value, maxVal, suffix }: { label: string; value: number; maxVal: number; suffix: string }) {
  const pct = Math.min(Math.max((value / maxVal) * 100, 0), 100);
  const color = pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-1">
      <span className="text-[var(--text-muted)]">{label}</span>
      <div className="w-12 h-1.5 rounded-full bg-[var(--bg-overlay)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-medium text-[var(--text-primary)]">{value}{suffix}</span>
    </div>
  );
}
