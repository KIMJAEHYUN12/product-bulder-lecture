"use client";

import { Skeleton } from "@/components/Skeleton";
import type { InvestorTrendData } from "@/types";

function formatQty(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function formatDate(d: string): string {
  if (!d || d.length < 8) return d;
  return `${d.slice(4, 6)}/${d.slice(6)}`;
}

function SignedCell({ value, color }: { value: number; color: string }) {
  return (
    <td
      className="text-right font-mono text-[10px] sm:text-xs px-1.5 py-1"
      style={{ color: value >= 0 ? color : "#6b7280" }}
    >
      {value >= 0 ? "+" : ""}
      {formatQty(value)}
    </td>
  );
}

interface Props {
  data: InvestorTrendData | null;
  isLoading: boolean;
}

export function InvestorTrendCompact({ data, isLoading }: Props) {
  if (!data && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const recent5 = [...data.daily].reverse().slice(0, 5);

  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 mb-3">
        투자자 수급 동향
      </p>

      {/* 누적 요약 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">외국인</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.foreign >= 0 ? "#ef4444" : "#6b7280" }}>
            {data.summary.foreign >= 0 ? "+" : ""}{formatQty(data.summary.foreign)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">기관</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.institution >= 0 ? "#3b82f6" : "#6b7280" }}>
            {data.summary.institution >= 0 ? "+" : ""}{formatQty(data.summary.institution)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">개인</p>
          <p className="text-xs font-bold font-mono" style={{ color: data.summary.individual >= 0 ? "#10b981" : "#6b7280" }}>
            {data.summary.individual >= 0 ? "+" : ""}{formatQty(data.summary.individual)}
          </p>
        </div>
      </div>

      {/* 최근 5일 테이블 */}
      {recent5.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200 dark:border-white/10">
                <th className="text-left font-medium px-1.5 py-1">날짜</th>
                <th className="text-right font-medium px-1.5 py-1">외국인</th>
                <th className="text-right font-medium px-1.5 py-1">기관</th>
                <th className="text-right font-medium px-1.5 py-1">개인</th>
              </tr>
            </thead>
            <tbody>
              {recent5.map((d) => (
                <tr key={d.date} className="border-b border-gray-100 dark:border-white/5">
                  <td className="text-left text-gray-500 font-mono px-1.5 py-1">
                    {formatDate(d.date)}
                  </td>
                  <SignedCell value={d.foreign} color="#ef4444" />
                  <SignedCell value={d.institution} color="#3b82f6" />
                  <SignedCell value={d.individual} color="#10b981" />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 font-mono mt-1.5 text-right">단위: 주</p>
        </div>
      )}
    </div>
  );
}
