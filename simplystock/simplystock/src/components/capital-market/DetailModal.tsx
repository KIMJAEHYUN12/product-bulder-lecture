"use client";

import { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import type { CapitalMarketSeries } from "@/types/capitalMarket";

interface Props {
  series: CapitalMarketSeries | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function DetailModal({ series, loading, error, onClose }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!series || !chartRef.current || series.series.length === 0) return;

    let cancelled = false;

    (async () => {
      const { createChart, LineSeries, ColorType } = await import("lightweight-charts");
      if (cancelled || !chartRef.current) return;

      // 기존 차트 제거
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }

      const chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 280,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "rgba(255,255,255,0.6)",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.05)" },
          horzLines: { color: "rgba(255,255,255,0.05)" },
        },
        timeScale: { borderColor: "rgba(255,255,255,0.1)" },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      });

      chartInstanceRef.current = chart;

      const lineSeries = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 2,
      });

      const data = series.series
        .filter((p) => p.value > 0)
        .map((p) => {
          const d = p.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
          return { time: d, value: p.value };
        });

      lineSeries.setData(data);
      chart.timeScale().fitContent();

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      ro.observe(chartRef.current);

      return () => {
        ro.disconnect();
      };
    })();

    return () => {
      cancelled = true;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [series]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {series?.label || "시계열 차트"}{series?.unit ? ` (${series.unit})` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-rose-400">{error}</div>
        )}

        {!loading && !error && series && series.series.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">데이터 없음</div>
        )}

        <div ref={chartRef} className="w-full" />
      </div>
    </div>
  );
}
