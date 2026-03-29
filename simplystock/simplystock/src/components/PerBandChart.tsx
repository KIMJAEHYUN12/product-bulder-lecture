"use client";

import { useRef, useEffect, useCallback } from "react";
import type { PerBandData } from "@/types";

interface Props {
  data: PerBandData;
  isDark?: boolean;
  mode?: "per" | "pbr" | "forward";
  bandChart?: PerBandData["pbrBandChart"] | PerBandData["forwardBandChart"];
}

const BAND_KEYS = ["bandMin", "band25", "bandMed", "band75", "bandMax"] as const;
const COLOR_KEYS = ["min", "p25", "median", "p75", "max"] as const;

const BAND_COLORS: Record<(typeof COLOR_KEYS)[number], { line: string; label: string }> = {
  max: { line: "#ef4444", label: "상단 95%" },
  p75: { line: "#f59e0b", label: "75%" },
  median: { line: "#6b7280", label: "중앙" },
  p25: { line: "#38bdf8", label: "25%" },
  min: { line: "#22c55e", label: "하단 5%" },
};

export function PerBandChart({ data, isDark = true, mode = "per", bandChart: externalBandChart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  const chartData = (mode === "forward" || mode === "pbr") && externalBandChart
    ? externalBandChart
    : data.bandChart;
  const bands = mode === "forward" && data.forwardPerBands
    ? data.forwardPerBands
    : mode === "pbr" && data.pbrBands
    ? data.pbrBands
    : data.perBands;
  const suffix = mode === "pbr" ? " PBR" : mode === "forward" ? " Fwd" : "";

  const buildChart = useCallback(async () => {
    const el = containerRef.current;
    if (!el || !chartData.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const { createChart, LineSeries } = await import("lightweight-charts");

    const width = el.clientWidth;
    const height = Math.min(width * 0.6, 400);

    const bgColor = isDark ? "#0a0a14" : "#f8f9fa";
    const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
    const crosshairColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

    const chart = createChart(el, {
      width,
      height,
      layout: { background: { color: bgColor }, textColor, fontFamily: "inherit" },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        vertLine: { color: crosshairColor, labelBackgroundColor: isDark ? "#1a1a2e" : "#e2e8f0" },
        horzLine: { color: crosshairColor, labelBackgroundColor: isDark ? "#1a1a2e" : "#e2e8f0" },
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;

    // 밴드선 (아래→위 순서)
    for (let i = 0; i < BAND_KEYS.length; i++) {
      const key = BAND_KEYS[i];
      const colorKey = COLOR_KEYS[i];
      const series = chart.addSeries(LineSeries, {
        color: BAND_COLORS[colorKey].line,
        lineWidth: 1,
        lineStyle: colorKey === "median" ? 2 : 0,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(chartData.map((p) => ({ time: p.date, value: p[key] })));
    }

    // 주가 라인 (최상위)
    const priceSeries = chart.addSeries(LineSeries, {
      color: isDark ? "#ffffff" : "#111827",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    priceSeries.setData(chartData.map((p) => ({ time: p.date, value: p.close })));

    chart.timeScale().fitContent();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = Math.min(w * 0.6, 400);
        chart.applyOptions({ width: w, height: h });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [chartData, isDark, bands]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    buildChart().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [buildChart]);

  useEffect(() => {
    const onTheme = () => { buildChart(); };
    window.addEventListener("theme-change", onTheme);
    return () => window.removeEventListener("theme-change", onTheme);
  }, [buildChart]);

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: isDark ? "#fff" : "#111" }} />
          주가
        </span>
        {COLOR_KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-3 rounded"
              style={{ background: BAND_COLORS[k].line }}
            />
            {bands[k]}x{suffix}
          </span>
        ))}
      </div>
    </div>
  );
}
