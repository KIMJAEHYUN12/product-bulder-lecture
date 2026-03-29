"use client";

import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import type { IndexItem } from "@/types/capitalMarket";

interface MarketBriefProps {
  stocks?: IndexItem[];
  updatedAt?: string;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi} 기준`;
}

export function MarketBrief({ stocks, updatedAt }: MarketBriefProps) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <a
      href="/capital-market/"
      className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2 transition-colors hover:bg-[var(--bg-card)] group"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {stocks.map((s) => {
          const isUp = s.change >= 0;
          const color = isUp ? "text-emerald-400" : "text-rose-400";
          const Icon = s.change > 0 ? TrendingUp : s.change < 0 ? TrendingDown : Minus;

          return (
            <div key={s.symbol} className="flex items-center gap-1.5">
              <Icon className={`h-3 w-3 ${color} shrink-0`} />
              <span className="text-sm text-[var(--text-primary)]">{s.name}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {fmt(s.price, s.price > 10000 ? 0 : 2)}
              </span>
              <span className={`text-xs ${color}`}>
                {isUp ? "+" : ""}{fmt(s.changePct)}%
              </span>
            </div>
          );
        })}
        {updatedAt && (
          <span className="text-[10px] text-[var(--text-faint)]">
            {formatTime(updatedAt)}
          </span>
        )}
      </div>
      <span className="hidden sm:flex items-center gap-0.5 text-[11px] text-[var(--text-faint)] group-hover:text-indigo-400 transition-colors shrink-0 ml-2">
        전체 보기
        <ChevronRight className="h-3 w-3" />
      </span>
    </a>
  );
}
