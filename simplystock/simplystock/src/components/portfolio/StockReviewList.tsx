"use client";

import { X } from "lucide-react";
import type { OcrStock } from "@/lib/portfolioAnalyzeApi";

interface Props {
  stocks: OcrStock[];
  unmapped: string[];
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<OcrStock>) => void;
}

function formatPrice(n: number): string {
  if (!n) return "-";
  return n.toLocaleString() + "원";
}

export function StockReviewList({ stocks, unmapped, onRemove, onUpdate }: Props) {
  return (
    <div className="space-y-2">
      {stocks.map((stock, i) => (
        <div
          key={stock.symbol + i}
          className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {stock.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {stock.symbol}
                </span>
                {stock.market && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    stock.market === "KOSPI"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-purple-500/10 text-purple-400"
                  }`}>
                    {stock.market}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">수량</span>
                  <input
                    type="number"
                    value={stock.qty || ""}
                    onChange={(e) => onUpdate(i, { qty: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 px-1.5 py-0.5 rounded border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-xs text-[var(--text-primary)] text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">평단</span>
                  <input
                    type="number"
                    value={stock.avgPrice || ""}
                    onChange={(e) => onUpdate(i, { avgPrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-24 px-1.5 py-0.5 rounded border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-xs text-[var(--text-primary)] text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {stock.returnPct != null && (
                  <span className={`text-[11px] font-medium ${
                    stock.returnPct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {stock.returnPct >= 0 ? "+" : ""}{stock.returnPct}%
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onRemove(i)}
              className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {unmapped.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-[11px] text-amber-400">
            미인식 종목: {unmapped.join(", ")}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            아래 검색으로 직접 추가할 수 있습니다. 검색 안 될 시 <span className="text-amber-400/80 font-medium">종목코드(6자리 숫자)</span>로 검색해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
