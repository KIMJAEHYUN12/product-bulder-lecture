"use client";

import { Thermometer } from "lucide-react";
import type { MarketHealthData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: MarketHealthData;
}

function toTril(value: number): string {
  return (value / 10000).toFixed(1) + "조 원";
}

export function MarketHealthSection({ data }: Props) {
  return (
    <SectionCard title="시장 온도계" icon={<Thermometer className="h-4 w-4 text-orange-400" />}>
      <div className="grid grid-cols-2 gap-3">
        {data.customerDeposit !== null && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">고객예탁금</p>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {toTril(data.customerDeposit)}
            </p>
          </div>
        )}
        {data.creditLoan !== null && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">신용융자잔고</p>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {toTril(data.creditLoan)}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
