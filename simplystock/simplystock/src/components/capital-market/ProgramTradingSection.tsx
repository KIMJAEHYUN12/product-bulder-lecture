"use client";

import { ArrowLeftRight } from "lucide-react";
import type { ProgramTradingData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: ProgramTradingData;
}

function formatBillion(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) return (value / 10000).toFixed(1) + "조";
  return value.toLocaleString() + "억";
}

export function ProgramTradingSection({ data }: Props) {
  const items = [
    { label: "차익거래", value: data.arbitrage },
    { label: "비차익거래", value: data.nonArbitrage },
    { label: "합계", value: data.total },
  ];

  return (
    <SectionCard title="프로그램 매매" icon={<ArrowLeftRight className="h-4 w-4 text-cyan-400" />}>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">{item.label}</p>
            <p className={`text-sm font-bold ${item.value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {item.value >= 0 ? "+" : ""}{formatBillion(item.value)}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
