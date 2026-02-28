"use client";

import { useRef, useEffect } from "react";
import type { StockChartResponse, ChartRange, Candle } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

interface Props {
  stocks: { symbol: string; name: string }[];
  chartDataMap: Record<string, StockChartResponse>;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  isLoading: boolean;
}

function toDateStr(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeCandles(candles: Candle[]) {
  if (candles.length === 0) return [];
  const basePrice = candles[0].close;
  return candles.map((c) => ({
    time: toDateStr(c.time),
    value: ((c.close - basePrice) / basePrice) * 100,
  }));
}

export function ComparisonChart({ stocks, chartDataMap, range, onRangeChange, isLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || stocks.length === 0) return;

    const hasData = stocks.some((s) => chartDataMap[s.symbol]);
    if (!hasData) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, LineSeries } = await import("lightweight-charts");
      const container = containerRef.current;
      if (!container) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chartHeight = Math.min(container.clientWidth * 0.6, 350);
      chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        layout: {
          background: { color: "#0a0a0a" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
          horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: false,
        },
        localization: {
          priceFormatter: (price: number) => `${price.toFixed(1)}%`,
        },
      });

      chartRef.current = chart;

      stocks.forEach((stock, i) => {
        const chartData = chartDataMap[stock.symbol];
        if (!chartData) return;

        const normalized = normalizeCandles(chartData.candles);
        if (normalized.length === 0) return;

        const series = chart!.addSeries(LineSeries, {
          color: STOCK_COLORS[i],
          lineWidth: 2,
          crosshairMarkerVisible: true,
          lastValueVisible: true,
          priceLineVisible: false,
        });

        series.setData(normalized);
      });

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && container) {
          const h = Math.min(container.clientWidth * 0.6, 350);
          chart.applyOptions({ width: container.clientWidth, height: h });
        }
      });
      resizeObserver.observe(container);
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [stocks, chartDataMap]);

  if (stocks.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-3xl mb-2">🔬</div>
        <div className="text-sm text-gray-400 font-mono">종목을 검색해서 추가하세요</div>
        <div className="text-[10px] text-gray-500 mt-1 font-mono">최대 3개 비교 가능</div>
      </div>
    );
  }

  return (
    <div>
      {/* 범례 */}
      <div className="flex items-center gap-4 mb-2">
        {stocks.map((s, i) => (
          <div key={s.symbol} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STOCK_COLORS[i] }}
            />
            <span className="text-xs font-bold text-white">{s.name}</span>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div className="relative">
        <div
          ref={containerRef}
          className="rounded-xl overflow-hidden border border-white/10"
          style={{ minHeight: 220 }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <span className="inline-block w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 범위 선택 */}
      <div className="flex gap-1 mt-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onRangeChange(opt.value)}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
              range === opt.value
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
