"use client";

import type { BotTradeEntry } from "@/types";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

interface BotTradeLogProps {
  trades: BotTradeEntry[];
}

export function BotTradeLog({ trades }: BotTradeLogProps) {
  if (trades.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] text-center py-4">
        아직 매매 기록이 없습니다
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {trades.map((trade, i) => {
        if (trade.type === "thinking") {
          return (
            <div
              key={i}
              className="rounded-lg bg-rose-500/5 border border-rose-500/20 px-3 py-2"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-rose-400 font-medium">독백</span>
                <span className="text-[10px] text-[var(--text-muted)]">{trade.date}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {trade.reason}
              </p>
            </div>
          );
        }

        const isBuy = trade.type === "buy";
        return (
          <div
            key={i}
            className="flex items-start justify-between gap-2 py-1.5 border-b border-[var(--border-primary)] last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isBuy
                      ? "bg-red-500/10 text-red-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {isBuy ? "매수" : "매도"}
                </span>
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {trade.name}
                </span>
                {trade.signal && (
                  <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-primary)]">
                    {trade.signal}
                  </span>
                )}
                {trade.sentiment && (
                  <span
                    className={`px-1 py-0.5 rounded text-[9px] ${
                      trade.sentiment === "panic"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {trade.sentiment === "panic" ? "패닉" : "FOMO"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">
                {trade.reason}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-[var(--text-muted)]">
                {trade.qty}주 @ {fmt(trade.price ?? 0)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">{trade.date}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
