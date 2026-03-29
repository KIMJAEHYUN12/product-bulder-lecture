"use client";

import { DollarSign } from "lucide-react";
import type { ExchangeRateItem, GlobalIndicatorItem } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  exchangeRates: ExchangeRateItem[];
  globalIndicators: GlobalIndicatorItem[];
  onDetail: (type: string, key: string) => void;
}

export function ExchangeRateSection({ exchangeRates, globalIndicators, onDetail }: Props) {
  return (
    <SectionCard title="환율 / 글로벌" icon={<DollarSign className="h-4 w-4 text-blue-400" />}>
      <div className="space-y-2">
        {exchangeRates.map((r) => {
          const isUp = r.change >= 0;
          const color = isUp ? "text-rose-400" : "text-emerald-400";
          return (
            <button
              key={r.symbol}
              type="button"
              onClick={() => onDetail("stock", r.symbol)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <span className="text-sm text-[var(--text-primary)]">{r.name}</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {r.rate.toLocaleString("ko-KR")}
                </span>
                <span className={`ml-2 text-xs ${color}`}>
                  {isUp ? "+" : ""}{r.changePct.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
        {exchangeRates.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] py-2">데이터 없음</p>
        )}

        {globalIndicators.length > 0 && (
          <>
            <div className="border-t border-[var(--border-primary)] my-1" />
            {globalIndicators.map((g) => {
              const isVix = g.symbol === "^VIX";
              const isUp = g.change >= 0;
              const changeColor = isVix
                ? g.value <= 20 ? "text-emerald-400" : g.value <= 30 ? "text-amber-400" : "text-rose-400"
                : isUp ? "text-emerald-400" : "text-rose-400";

              return (
                <button
                  key={g.symbol}
                  type="button"
                  onClick={() => onDetail("stock", g.symbol)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">{g.name}</span>
                    {g.level && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        g.level === "안정"
                          ? "bg-emerald-400/10 text-emerald-400"
                          : g.level === "경계"
                            ? "bg-amber-400/10 text-amber-400"
                            : "bg-rose-400/10 text-rose-400"
                      }`}>
                        {g.level}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {g.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`ml-2 text-xs ${changeColor}`}>
                      {isUp ? "+" : ""}{g.changePct.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </SectionCard>
  );
}
