"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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
                <span className="text-[11px] font-mono text-gray-600 dark:text-gray-400 truncate flex-1">
                  {s.name}
                </span>
                <span className="text-[11px] font-mono font-bold text-gray-900 dark:text-white shrink-0">
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
  const pnl = (current - holding.avgPrice) * holding.qty;
  const pnlPct = ((current - holding.avgPrice) / holding.avgPrice) * 100;

  return (
    <div className="bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{holding.name}</div>
          <div className="text-[10px] text-gray-500 font-mono">{symbol}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-mono text-gray-900 dark:text-white">{holding.qty}주</div>
            <div
              className={`text-[11px] font-mono ${
                pnlPct > 0 ? "text-red-500 dark:text-red-400" : pnlPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
              }`}
            >
              {pnlPct > 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </div>
          </div>
          <button
            onClick={() => onSell(symbol, holding, current)}
            className="text-xs font-mono px-2 py-1.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40 transition-colors whitespace-nowrap"
          >
            매도
          </button>
        </div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-500 font-mono">
          평단 {fmt(holding.avgPrice)}
        </span>
        <span
          className={`text-[10px] font-mono ${
            pnl > 0 ? "text-red-500 dark:text-red-400" : pnl < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
          }`}
        >
          {pnl > 0 ? "+" : ""}
          {fmt(Math.round(pnl))}원
        </span>
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

  return (
    <div className="flex flex-col gap-3">
      {/* 요약 헤더 */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">내 포트폴리오</div>
          <button
            onClick={onReset}
            className="text-[10px] text-gray-500 hover:text-red-500 font-mono border border-gray-200 dark:border-white/10 hover:border-red-500/30 px-2 py-0.5 rounded transition-colors"
          >
            초기화
          </button>
        </div>
        <div className="text-2xl font-black text-gray-900 dark:text-white font-mono mb-1">
          {fmt(Math.round(totalAsset))}
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">원</span>
        </div>
        <div className={`text-sm font-mono font-bold ${
          returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
        }`}>
          {returnPct > 0 ? "+" : ""}{returnPct.toFixed(2)}%
        </div>
        <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
          <span>현금 {fmt(Math.round(portfolio.cash))}원</span>
          <span>주식 {fmt(Math.round(totalAsset - portfolio.cash))}원</span>
        </div>
        {settling && (
          <div className="mt-2 text-[11px] text-yellow-500 dark:text-yellow-400 font-mono animate-pulse">
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
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
            tab === "portfolio"
              ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          보유종목
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
            tab === "history"
              ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          거래내역
          {history.length > 0 && (
            <span className="ml-1 text-[10px] text-gray-400 font-mono">
              {history.length}
            </span>
          )}
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
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">총 거래</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        <span className="text-red-500 dark:text-red-400">매수 {buys.length}건</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-blue-500 dark:text-blue-400">매도 {sells.length}건</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">총 거래대금</span>
                      <span className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(totalVolume))}원</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">매수금액</span>
                      <span className="text-red-500 dark:text-red-400">{fmt(Math.round(buyVolume))}원</span>
                    </div>
                    {sellVolume > 0 && (
                      <div className="flex justify-between text-[11px] font-mono">
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
                  <div key={i} className="grid grid-cols-12 items-center px-3 py-2 text-[11px] font-mono hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="col-span-2 text-gray-400">{h.date.slice(5)}</span>
                    <span className={`col-span-1 font-bold ${
                      h.type === "buy" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
                    }`}>
                      {h.type === "buy" ? "매수" : "매도"}
                    </span>
                    <span className="col-span-3 text-gray-700 dark:text-gray-300 truncate">{h.name}</span>
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
