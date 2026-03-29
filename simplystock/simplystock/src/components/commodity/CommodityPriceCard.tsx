"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchCommodityPrices } from "@/lib/api";
import type { CommodityPriceData } from "@/lib/api";

interface Props {
  symbol: string;
  name: string;
  exchange: string;
  unit: string;
}

export function CommodityPriceCard({ symbol, name, exchange, unit }: Props) {
  const [data, setData] = useState<CommodityPriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommodityPrices([symbol])
      .then((res) => setData(res[symbol] ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-[var(--bg-card)]" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-[var(--bg-card)]" />
        <div className="mt-2 h-4 w-20 animate-pulse rounded bg-[var(--bg-card)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5">
        <p className="text-sm text-[var(--text-muted)]">{name}</p>
        <p className="mt-1 text-xs text-[var(--text-faint)]">가격 정보를 불러올 수 없습니다</p>
      </div>
    );
  }

  const isUp = data.changePct > 0;
  const isDown = data.changePct < 0;
  const currencySymbol = data.currency === "USD" ? "$" : data.currency === "KRW" ? "₩" : "";
  const decimals = data.price < 10 ? 4 : data.price < 100 ? 2 : 0;

  return (
    <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{name}</p>
          <p className="text-[10px] text-[var(--text-faint)]">{exchange} · {unit}</p>
        </div>
        <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
          isUp ? "bg-red-500/10 text-red-400" : isDown ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-[var(--text-muted)]"
        }`}>
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          {isUp ? "+" : ""}{data.changePct.toFixed(2)}%
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold">
          {currencySymbol}{data.price.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}
        </span>
        <span className="ml-1.5 text-xs text-[var(--text-faint)]">{data.currency}</span>
      </div>
    </div>
  );
}
