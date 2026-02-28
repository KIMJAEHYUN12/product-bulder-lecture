"use client";

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
              className="rounded-xl border border-white/10 bg-white/5 p-3 animate-pulse"
            >
              <div className="h-4 bg-white/10 rounded w-20 mb-2" />
              <div className="h-6 bg-white/10 rounded w-28" />
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
