"use client";

import { Users } from "lucide-react";
import type { InvestorTrendData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: InvestorTrendData;
}

function formatAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000) {
    return (n / 10000).toFixed(1) + "조";
  }
  return n.toLocaleString("ko-KR") + "억";
}

const INVESTOR_CONFIG = [
  { key: "foreign" as const, label: "외국인", accent: "blue" },
  { key: "institution" as const, label: "기관", accent: "violet" },
  { key: "individual" as const, label: "개인", accent: "amber" },
];

export function InvestorTrendSection({ data }: Props) {
  return (
    <SectionCard title="시장 투자자 동향" icon={<Users className="h-4 w-4 text-blue-400" />}>
      <p className="text-[10px] text-[var(--text-faint)] mb-2">KODEX 200 ETF (코스피200 추종) 순매수 기준</p>
      <div className="grid grid-cols-3 gap-3">
        {INVESTOR_CONFIG.map(({ key, label, accent }) => {
          const todayVal = data.latest[key];
          const sum5 = data.recent5Sum[key];
          const isPositive = todayVal >= 0;
          const sum5Positive = sum5 >= 0;

          return (
            <div
              key={key}
              className={`rounded-xl border border-${accent}-500/20 bg-${accent}-500/5 p-3 text-center`}
            >
              <p className={`text-xs font-medium text-${accent}-400 mb-1`}>{label}</p>
              <p className={`text-base font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                {isPositive ? "+" : ""}{formatAmount(todayVal)}
              </p>
              <p className={`text-[10px] mt-1 ${sum5Positive ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                5일 {sum5Positive ? "+" : ""}{formatAmount(sum5)}
              </p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
