"use client";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

interface AssetSummaryBarProps {
  totalAsset: number;
  returnPct: number;
  cash: number;
}

export function AssetSummaryBar({ totalAsset, returnPct, cash }: AssetSummaryBarProps) {
  return (
    <div className="sticky top-0 z-30 lg:hidden border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur-sm px-4 py-2.5">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">총 자산</div>
            <div className="text-sm font-bold">{fmt(totalAsset)}원</div>
          </div>
          <div className={`text-sm font-semibold ${returnPct >= 0 ? "text-red-400" : "text-blue-400"}`}>
            {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text-muted)]">현금</div>
          <div className="text-xs font-mono text-[var(--text-secondary)]">{fmt(cash)}원</div>
        </div>
      </div>
    </div>
  );
}
