"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { InvestorTrendDaily } from "@/types";
import { normalizeDateStr, resampleTrend, fmtVolume } from "@/lib/chartEngine";

type ViewportPeriod = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "MAX";
type CandleInterval = "day" | "week" | "month";
type FlowMode = "bar" | "line";

const VIEWPORT_DAYS: Record<ViewportPeriod, number | null> = {
  "1M": 22, "3M": 66, "6M": 130, "1Y": 250, "2Y": 500, "5Y": 1250, "MAX": null,
};

/* ── 색상 상수 ── */
const C = {
  barBuy: "rgba(239,68,68,0.45)",    // 빨강 = 매수 (캔들 상승과 통일)
  barSell: "rgba(59,130,246,0.45)",   // 파랑 = 매도 (캔들 하락과 통일)
  ma20: "#fbbf24",                     // 앰버
  inst: "#60a5fa",                     // 기관 — 밝은 파랑
  frgn: "#fb923c",                     // 외인 — 주황 (빨강과 구분)
  indv: "#4ade80",                     // 개인 — 초록
  crosshair: "rgba(129,140,248,0.7)",  // 인디고
} as const;

interface Props {
  investorDaily: InvestorTrendDaily[];
  viewportPeriod: ViewportPeriod;
  candleInterval: CandleInterval;
  syncDate?: string | null;
  onCrosshairDate?: (date: string | null) => void;
  onChartReady?: (chart: ReturnType<typeof import("lightweight-charts").createChart>) => void;
  isDark?: boolean;
  height?: number;
}

interface BarTooltip {
  mode: "bar";
  date: string;
  combined: number;
  ma20: number | null;
  x: number;
  y: number;
}

interface LineTooltip {
  mode: "line";
  date: string;
  institution: number;
  foreign: number;
  individual: number;
  x: number;
  y: number;
}

type TooltipData = BarTooltip | LineTooltip;

export function InvestorFlowChartV2({
  investorDaily,
  viewportPeriod,
  candleInterval,
  syncDate,
  onCrosshairDate,
  onChartReady,
  isDark = true,
  height: fixedHeight,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primarySeriesRef = useRef<any>(null);
  const dataMapRef = useRef<Map<string, number>>(new Map());
  const isExternalSyncRef = useRef(false);
  const onCrosshairDateRef = useRef(onCrosshairDate);
  onCrosshairDateRef.current = onCrosshairDate;

  const [mode, setMode] = useState<FlowMode>("bar");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const getSlicedData = useCallback(() => {
    if (investorDaily.length === 0) return [];

    const resampled = resampleTrend(investorDaily, candleInterval);
    const sorted = [...resampled].sort(
      (a, b) => normalizeDateStr(a.date).localeCompare(normalizeDateStr(b.date)),
    );

    const days = VIEWPORT_DAYS[viewportPeriod];
    const intervalDiv = candleInterval === "month" ? 22 : candleInterval === "week" ? 5 : 1;
    const sliceLen = days ? Math.max(Math.round(days / intervalDiv), 10) : sorted.length;
    const startIdx = Math.max(0, sorted.length - sliceLen);
    return sorted.slice(startIdx);
  }, [investorDaily, viewportPeriod, candleInterval]);

  const buildBarData = useCallback(() => {
    const slice = getSlicedData();
    if (slice.length === 0) return { bars: [], ma: [] };

    const bars: { time: string; value: number; color: string }[] = [];
    const combined: number[] = [];

    for (const d of slice) {
      const val = d.institution + d.foreign;
      combined.push(val);
      bars.push({
        time: normalizeDateStr(d.date),
        value: val,
        color: val >= 0 ? C.barBuy : C.barSell,
      });
    }

    const ma: { time: string; value: number }[] = [];
    for (let i = 0; i < slice.length; i++) {
      if (i < 19) continue;
      const window = combined.slice(i - 19, i + 1);
      const avg = window.reduce((s, v) => s + v, 0) / window.length;
      ma.push({ time: normalizeDateStr(slice[i].date), value: avg });
    }

    return { bars, ma };
  }, [getSlicedData]);

  const buildLineData = useCallback(() => {
    const slice = getSlicedData();
    if (slice.length === 0) return { inst: [], frgn: [], indv: [], crosses: [] };

    let cumInst = 0;
    let cumFrgn = 0;
    let cumIndv = 0;

    const inst: { time: string; value: number }[] = [];
    const frgn: { time: string; value: number }[] = [];
    const indv: { time: string; value: number }[] = [];

    for (const d of slice) {
      cumInst += d.institution;
      cumFrgn += d.foreign;
      cumIndv += d.individual;
      const time = normalizeDateStr(d.date);
      inst.push({ time, value: cumInst });
      frgn.push({ time, value: cumFrgn });
      indv.push({ time, value: cumIndv });
    }

    const crosses: { time: string; position: "aboveBar" | "belowBar"; color: string; shape: "circle"; text: string }[] = [];
    for (let i = 1; i < inst.length; i++) {
      if (frgn[i - 1].value <= indv[i - 1].value && frgn[i].value > indv[i].value) {
        crosses.push({ time: frgn[i].time, position: "belowBar", color: C.frgn, shape: "circle", text: "외인↑" });
      }
      if (inst[i - 1].value <= indv[i - 1].value && inst[i].value > indv[i].value) {
        crosses.push({ time: inst[i].time, position: "belowBar", color: C.inst, shape: "circle", text: "기관↑" });
      }
    }

    return { inst, frgn, indv, crosses };
  }, [getSlicedData]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || investorDaily.length === 0) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, HistogramSeries, LineSeries, CrosshairMode, createSeriesMarkers } = await import("lightweight-charts");

      const rect = el.getBoundingClientRect();
      const width = rect.width;
      const height = fixedHeight ?? Math.min(width * (mode === "line" ? 0.45 : 0.35), mode === "line" ? 250 : 200);
      const isMobile = width < 500;

      const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";

      chart = createChart(el, {
        width,
        height,
        localization: { locale: "ko-KR", priceFormatter: (p: number) => fmtVolume(p) },
        layout: {
          background: { color: "transparent" },
          textColor: isDark ? "#6b7280" : "#4b5563",
          fontSize: isMobile ? 9 : 11,
        },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: C.crosshair, width: 1, style: 2, labelVisible: false },
          horzLine: { color: C.crosshair, width: 1, style: 2 },
        },
        rightPriceScale: {
          borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 },
          minimumWidth: isMobile ? 40 : 55, entireTextOnly: true,
        },
        timeScale: { borderVisible: false, timeVisible: false, visible: false },
      });

      chartRef.current = chart;
      onChartReady?.(chart);

      if (mode === "bar") {
        const { bars, ma } = buildBarData();

        const barSeries = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false });
        barSeries.setData(bars as never[]);
        primarySeriesRef.current = barSeries;

        const dataMap = new Map<string, number>();
        for (const d of bars) dataMap.set(d.time, d.value);
        dataMapRef.current = dataMap;

        if (ma.length > 0) {
          const maSeries = chart.addSeries(LineSeries, {
            color: C.ma20, lineWidth: 2, priceLineVisible: false,
            lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 3,
          });
          maSeries.setData(ma as never[]);
        }

        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.point) {
            setTooltip(null);
            if (!isExternalSyncRef.current) onCrosshairDateRef.current?.(null);
            return;
          }
          const bVal = param.seriesData.get(barSeries) as { value: number } | undefined;
          if (!bVal) { setTooltip(null); return; }
          const dateStr = String(param.time);
          const maEntry = ma.find(m => m.time === dateStr);
          setTooltip({ mode: "bar", date: dateStr, combined: bVal.value, ma20: maEntry?.value ?? null, x: param.point.x, y: param.point.y });
          if (!isExternalSyncRef.current) onCrosshairDateRef.current?.(dateStr);
        });
      } else {
        const { inst, frgn, indv, crosses } = buildLineData();

        const instSeries = chart.addSeries(LineSeries, {
          color: C.inst, lineWidth: 2, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        });
        instSeries.setData(inst as never[]);
        primarySeriesRef.current = instSeries;

        const dataMap = new Map<string, number>();
        for (const d of inst) dataMap.set(d.time, d.value);
        dataMapRef.current = dataMap;

        const frgnSeries = chart.addSeries(LineSeries, {
          color: C.frgn, lineWidth: 2, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        });
        frgnSeries.setData(frgn as never[]);

        if (crosses.length > 0) {
          createSeriesMarkers(instSeries, crosses as never[]);
        }

        const indvSeries = chart.addSeries(LineSeries, {
          color: C.indv, lineWidth: 2, priceLineVisible: false,
          lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        });
        indvSeries.setData(indv as never[]);

        chart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.point) {
            setTooltip(null);
            if (!isExternalSyncRef.current) onCrosshairDateRef.current?.(null);
            return;
          }
          const iVal = param.seriesData.get(instSeries) as { value: number } | undefined;
          const fVal = param.seriesData.get(frgnSeries) as { value: number } | undefined;
          const dVal = param.seriesData.get(indvSeries) as { value: number } | undefined;
          if (!iVal || !fVal || !dVal) { setTooltip(null); return; }
          const dateStr = String(param.time);
          setTooltip({ mode: "line", date: dateStr, institution: iVal.value, foreign: fVal.value, individual: dVal.value, x: param.point.x, y: param.point.y });
          if (!isExternalSyncRef.current) onCrosshairDateRef.current?.(dateStr);
        });
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        if (!chart || !el) return;
        const w = el.getBoundingClientRect().width;
        const h = fixedHeight ?? Math.min(w * (mode === "line" ? 0.45 : 0.35), mode === "line" ? 250 : 200);
        chart.applyOptions({ width: w, height: h });
      });
      ro.observe(el);
      (el as HTMLDivElement & { _ro?: ResizeObserver })._ro = ro;
    })();

    return () => {
      if (chart) { chart.remove(); chartRef.current = null; primarySeriesRef.current = null; }
      const ro = (el as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) { ro.disconnect(); delete (el as HTMLDivElement & { _ro?: ResizeObserver })._ro; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investorDaily, isDark, viewportPeriod, candleInterval, mode, fixedHeight]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = primarySeriesRef.current;
    if (!chart || !series || syncDate == null) return;
    const val = dataMapRef.current.get(syncDate);
    if (val == null) return;
    isExternalSyncRef.current = true;
    chart.setCrosshairPosition(val, syncDate, series);
    requestAnimationFrame(() => { isExternalSyncRef.current = false; });
  }, [syncDate]);

  if (investorDaily.length === 0) return null;

  return (
    <div className="mx-2 sm:mx-4 mt-2 mb-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        {/* 모드 토글 */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border-primary)] p-0.5">
          {([["bar", "합산"], ["line", "주체별"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                mode === key
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="text-[var(--text-faint)]">순매수 수량</span>
          {mode === "bar" ? (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-red-500/45" />
                <span className="text-[var(--text-faint)]">매수</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-blue-500/45" />
                <span className="text-[var(--text-faint)]">매도</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-3 rounded bg-amber-400" />
                <span className="text-[var(--text-faint)]">20MA</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-3 rounded" style={{ backgroundColor: C.inst }} />
                <span className="text-[var(--text-faint)]">기관</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-3 rounded" style={{ backgroundColor: C.frgn }} />
                <span className="text-[var(--text-faint)]">외인</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-[3px] w-3 rounded" style={{ backgroundColor: C.indv }} />
                <span className="text-[var(--text-faint)]">개인</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="relative" ref={containerRef}>
        {tooltip && tooltip.mode === "bar" && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-[var(--border-primary)] bg-[var(--tooltip-bg)] px-2.5 py-2 text-[11px] shadow-lg backdrop-blur-sm"
            style={{ left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 300) - 150), top: 8 }}
          >
            <div className="mb-1 text-[var(--text-faint)]">{tooltip.date}</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${tooltip.combined >= 0 ? "text-red-400" : "text-blue-400"}`}>
                기관+외인: {fmtVolume(tooltip.combined)}
              </span>
            </div>
            {tooltip.ma20 != null && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-amber-400">20MA: {fmtVolume(tooltip.ma20)}</span>
              </div>
            )}
          </div>
        )}

        {tooltip && tooltip.mode === "line" && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-[var(--border-primary)] bg-[var(--tooltip-bg)] px-2.5 py-2 text-[11px] shadow-lg backdrop-blur-sm"
            style={{ left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 300) - 140), top: 8 }}
          >
            <div className="mb-1 text-[var(--text-faint)]">{tooltip.date} <span className="text-[9px]">누적</span></div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: C.inst }} />
              <span className="text-[var(--text-muted)]">기관</span>
              <span className="ml-auto font-medium" style={{ color: C.inst }}>{fmtVolume(tooltip.institution)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: C.frgn }} />
              <span className="text-[var(--text-muted)]">외인</span>
              <span className="ml-auto font-medium" style={{ color: C.frgn }}>{fmtVolume(tooltip.foreign)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: C.indv }} />
              <span className="text-[var(--text-muted)]">개인</span>
              <span className="ml-auto font-medium" style={{ color: C.indv }}>{fmtVolume(tooltip.individual)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
