"use client";

import { interpretRSI, interpretMA } from "@/lib/portfolioInterpret";

interface Props {
  rsi: number | null;
  maStatus: string;
  trend: string;
  sparkline: number[];
  asOf?: string;
}

export function TrendPanel({ rsi, maStatus, trend, sparkline, asOf }: Props) {
  const trendColor =
    trend === "상승" ? "text-emerald-400" :
    trend === "하락" ? "text-red-400" : "text-[var(--text-muted)]";
  const trendArrow =
    trend === "상승" ? "^" :
    trend === "하락" ? "v" : "-";

  // 변동률 계산
  const sparkChange = sparkline.length >= 2
    ? ((sparkline[sparkline.length - 1] - sparkline[0]) / sparkline[0] * 100)
    : null;

  const fmtPrice = (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    return n.toLocaleString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>추세 (6개월)</span>
        <span className="text-[9px]">Yahoo{asOf ? ` · ${asOf}` : ""}</span>
      </div>

      {/* 시작가 → 끝가 → 변동률 */}
      {sparkline.length >= 2 && (
        <div className="flex items-center justify-center gap-3 py-1">
          <div className="text-center">
            <div className="text-[9px] text-[var(--text-muted)]">시작가</div>
            <div className="text-xs font-bold text-[var(--text-primary)]">{fmtPrice(sparkline[0])}</div>
          </div>
          <span className="text-[var(--text-muted)]">→</span>
          <div className="text-center">
            <div className="text-[9px] text-[var(--text-muted)]">현재가</div>
            <div className="text-xs font-bold text-[var(--text-primary)]">{fmtPrice(sparkline[sparkline.length - 1])}</div>
          </div>
          {sparkChange != null && (
            <span className={`text-sm font-bold ${sparkChange >= 0 ? "text-red-400" : "text-blue-400"}`}>
              {sparkChange > 0 ? "+" : ""}{sparkChange.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* 지표 요약 */}
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div className="text-center">
          <div className="text-[var(--text-muted)]">추세</div>
          <div className={`font-bold ${trendColor}`}>{trendArrow} {trend}</div>
        </div>
        <div className="text-center space-y-0.5">
          <div className="text-[var(--text-muted)]">RSI(14)</div>
          <div className={`font-bold ${
            rsi != null && rsi > 70 ? "text-red-400" :
            rsi != null && rsi < 30 ? "text-blue-400" : "text-[var(--text-primary)]"
          }`}>
            {rsi?.toFixed(0) ?? "N/A"}
          </div>
          {rsi != null && (
            <div className="relative h-1 rounded-full bg-[var(--bg-overlay)] mx-auto w-12">
              <div className="absolute left-[30%] top-0 w-px h-full bg-[var(--text-muted)] opacity-30" />
              <div className="absolute left-[70%] top-0 w-px h-full bg-[var(--text-muted)] opacity-30" />
              <div
                className={`absolute top-0 h-full rounded-full ${
                  rsi > 70 ? "bg-red-500" : rsi < 30 ? "bg-blue-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(rsi, 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-[var(--text-muted)]">이평선</div>
          <div className={`font-bold ${
            maStatus === "정배열" ? "text-emerald-400" :
            maStatus === "역배열" ? "text-red-400" : "text-[var(--text-primary)]"
          }`}>
            {maStatus}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        {interpretRSI(rsi)} / {interpretMA(maStatus)}
      </p>
    </div>
  );
}
