"use client";

import { Gauge } from "lucide-react";
import type { FearGreedData } from "@/types/capitalMarket";
import { SectionCard } from "./SectionCard";

interface Props {
  data: FearGreedData;
}

function getColor(value: number): string {
  if (value <= 25) return "text-rose-400";
  if (value <= 45) return "text-orange-400";
  if (value <= 55) return "text-amber-400";
  if (value <= 75) return "text-lime-400";
  return "text-emerald-400";
}

function getBarColor(value: number): string {
  if (value <= 25) return "bg-rose-500";
  if (value <= 45) return "bg-orange-500";
  if (value <= 55) return "bg-amber-500";
  if (value <= 75) return "bg-lime-500";
  return "bg-emerald-500";
}

export function FearGreedSection({ data }: Props) {
  const color = getColor(data.value);
  const barColor = getBarColor(data.value);

  return (
    <SectionCard title="Fear & Greed" icon={<Gauge className="h-4 w-4 text-violet-400" />}>
      <div className="space-y-3">
        <div className="text-center">
          <p className={`text-3xl font-bold ${color}`}>{data.value}</p>
          <p className={`text-sm font-medium ${color}`}>{data.label}</p>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--bg-overlay)]">
          <div
            className={`h-2 rounded-full ${barColor} transition-all`}
            style={{ width: `${data.value}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
          <span>극단적 공포</span>
          <span>극단적 탐욕</span>
        </div>
        {data.previous !== null && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            전일: {data.previous}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
