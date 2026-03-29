"use client";

import { TrendingUp } from "lucide-react";
import type { IndexItem } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  stocks: IndexItem[];
  onDetail: (type: string, key: string) => void;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function StockMarketSection({ stocks, onDetail }: Props) {
  return (
    <SectionCard title="주식시장" icon={<TrendingUp className="h-4 w-4 text-indigo-400" />}>
      <div className="space-y-2">
        {stocks.map((s) => {
          const isUp = s.change >= 0;
          const color = isUp ? "text-emerald-400" : "text-rose-400";
          return (
            <button
              key={s.symbol}
              type="button"
              onClick={() => onDetail("stock", s.symbol)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <span className="text-sm text-[var(--text-primary)]">{s.name}</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {fmt(s.price, s.price > 10000 ? 0 : 2)}
                </span>
                <span className={`ml-2 text-xs ${color}`}>
                  {isUp ? "+" : ""}{fmt(s.changePct)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
