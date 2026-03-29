"use client";

import { DollarSign } from "lucide-react";
import type { UsTreasuryData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: UsTreasuryData;
}

export function UsTreasurySection({ data }: Props) {
  return (
    <SectionCard title="미국 국채 금리" icon={<DollarSign className="h-4 w-4 text-sky-400" />}>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors">
          <span className="text-sm text-[var(--text-primary)]">10Y 국채</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {data.yield10Y.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors">
          <span className="text-sm text-[var(--text-primary)]">13W T-Bill</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {data.yield13W.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] px-3 py-2">
          <span className="text-sm text-[var(--text-muted)]">장단기 스프레드</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${data.inverted ? "text-rose-400" : "text-emerald-400"}`}>
              {data.spread > 0 ? "+" : ""}{data.spread.toFixed(2)}%p
            </span>
            {data.inverted && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                역전
              </span>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
