"use client";

import { BarChart3 } from "lucide-react";
import type { KospiValuationData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: KospiValuationData;
}

export function MarketValuationSection({ data }: Props) {
  return (
    <SectionCard title="KOSPI 밸류에이션" icon={<BarChart3 className="h-4 w-4 text-teal-400" />}>
      <div className="grid grid-cols-2 gap-3">
        {data.per !== null && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">PER</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {data.per.toFixed(1)}
            </p>
            <p className="text-[10px] text-[var(--text-faint)]">배</p>
          </div>
        )}
        {data.dividendYield !== null && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">배당수익률</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {data.dividendYield.toFixed(2)}
            </p>
            <p className="text-[10px] text-[var(--text-faint)]">%</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
