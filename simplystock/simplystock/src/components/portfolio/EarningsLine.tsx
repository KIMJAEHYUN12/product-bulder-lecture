"use client";

interface EarningsData {
  period: string;
  revenue: number | null;
  revenueYoY: number | null;
  opIncome: number | null;
  opIncomeYoY: number | null;
}

function formatKrw(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조`;
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억`;
  if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString();
}

function YoYBadge({ value }: { value: number | null }) {
  if (value == null) return null;
  const color = value >= 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`text-[9px] ${color}`}>
      ({value > 0 ? "+" : ""}{value.toFixed(1)}%)
    </span>
  );
}

export function EarningsLine({ data }: { data: EarningsData | null }) {
  if (!data) return null;
  if (data.revenue == null && data.opIncome == null) return null;

  return (
    <div className="text-[10px] text-[var(--text-muted)] animate-[fadeSlideIn_0.3s_ease-out_both]">
      <span className="mr-1">최근 실적 ({data.period}):</span>
      {data.revenue != null && (
        <span className="mr-2">
          매출 {formatKrw(data.revenue)} <YoYBadge value={data.revenueYoY} />
        </span>
      )}
      {data.opIncome != null && (
        <span>
          영업이익 {formatKrw(data.opIncome)} <YoYBadge value={data.opIncomeYoY} />
        </span>
      )}
    </div>
  );
}
