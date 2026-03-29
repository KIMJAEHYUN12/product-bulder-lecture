"use client";

import { Landmark } from "lucide-react";
import type { BondRate } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  bonds: BondRate[];
  onDetail: (type: string, key: string) => void;
}

export function BondMarketSection({ bonds, onDetail }: Props) {
  // 신용스프레드 = 회사채AA- - 국고채3Y
  const corpBond = bonds.find((b) => b.code === "010300000");
  const govBond3 = bonds.find((b) => b.code === "010200000");
  const spread = corpBond && govBond3 ? corpBond.rate - govBond3.rate : null;

  return (
    <SectionCard title="채권 / 금리" icon={<Landmark className="h-4 w-4 text-amber-400" />}>
      <div className="space-y-2">
        {bonds.map((b) => (
          <button
            key={b.code}
            type="button"
            onClick={() => onDetail("bond", b.code)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">{b.name}</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {b.rate.toFixed(2)}%
            </span>
          </button>
        ))}
        {spread !== null && (
          <div className="flex items-center justify-between rounded-lg bg-[var(--bg-overlay)] px-3 py-2">
            <span className="text-sm text-[var(--text-muted)]">신용스프레드</span>
            <span className={`text-sm font-semibold ${spread > 1.0 ? "text-rose-400" : "text-emerald-400"}`}>
              {spread.toFixed(2)}%p
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
