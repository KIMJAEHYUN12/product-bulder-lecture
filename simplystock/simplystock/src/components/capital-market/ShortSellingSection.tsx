"use client";

import { TrendingDown } from "lucide-react";
import type { ShortSellingData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: ShortSellingData;
}

function formatShares(value: number): string {
  if (value >= 100000000) return (value / 100000000).toFixed(1) + "억 주";
  if (value >= 10000) return (value / 10000).toFixed(0) + "만 주";
  return value.toLocaleString() + "주";
}

export function ShortSellingSection({ data }: Props) {
  return (
    <SectionCard title="공매도 잔고" icon={<TrendingDown className="h-4 w-4 text-pink-400" />}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">총 잔고</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatShares(data.balance)}
          </p>
        </div>
        {data.ratio !== null && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">공매도 비중</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {data.ratio.toFixed(2)}%
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
