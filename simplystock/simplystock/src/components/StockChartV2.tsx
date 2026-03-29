"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { Candle, InvestorTrendDaily } from "@/types";
import { InvestorFlowChartV2 } from "./InvestorFlowChartV2";
import {
  computeRegressionChannelV2,
  buildBandData,
  buildMarkersV2,
  getTrendContext,
  buildOneLiner,
  resampleCandles,
  resampleTrend,
  toDateStr,
  normalizeDateStr,
  fmtVolume,
  WINDOW_SIZE,
  TREND_LABEL,
} from "@/lib/chartEngine";

type CandleInterval = "day" | "week" | "month";
type ViewportPeriod = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y" | "MAX";

const VIEWPORT_BARS: Record<ViewportPeriod, number | null> = {
  "1M": 22, "3M": 66, "6M": 130, "1Y": 250, "2Y": 500, "5Y": 1250, "MAX": null,
};

interface Props {
  candles: Candle[];
  investorDaily: InvestorTrendDaily[];
  height?: number;
  stockName?: string;
  stockSymbol?: string;
  isDark?: boolean;
  legacyMode?: boolean;
  analysisPeriod?: string;
  onScreenshot?: (fn: () => string | undefined) => void;
  onFullscreen?: () => void;
  onAnalysisPeriodChange?: (period: string) => void;
}

interface CrosshairData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  prevClose: number | null;
  markerDesc?: string;
}

const SHORT_WINDOWS = [20, 30, 60] as const;
const LONG_WINDOWS = [0, 60, 120, 250] as const; // 0 = OFF

type LegacyTrendPeriod = "OFF" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "MAX";
const LEGACY_PERIOD_BARS: Record<LegacyTrendPeriod, number | null> = {
  OFF: null, "1M": 22, "3M": 66, "6M": 130, "1Y": 250, "2Y": 500, MAX: null,
};

export function StockChartV2({ candles, investorDaily, height, stockName, stockSymbol, isDark = true, legacyMode = false, analysisPeriod, onScreenshot, onFullscreen, onAnalysisPeriodChange }: Props) {
  const [candleInterval, setCandleInterval] = useState<CandleInterval>("day");
  const [viewportPeriod, setViewportPeriod] = useState<ViewportPeriod>("1M");
  const [showDetail, setShowDetail] = useState(true); // 기본 7선, 3선 토글 가능
  const [shortWindow, setShortWindow] = useState<number>(60);
  const [longWindow, setLongWindow] = useState<number>(0); // 0 = OFF
  const [trendPeriod, setTrendPeriod] = useState<LegacyTrendPeriod>("OFF"); // V1 추세 기간
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);
  const [syncDate, setSyncDate] = useState<string | null>(null);
  const [showDailyDetail, setShowDailyDetail] = useState(!height);
  const [dailyTab, setDailyTab] = useState<"supply" | "basic">("supply");

  const priceContainerRef = useRef<HTMLDivElement>(null);
  const priceChartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const flowChartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  const dateToIndexRef = useRef<Map<string, number>>(new Map());
  const rCandlesRef = useRef<Candle[]>([]);
  const totalBarsRef = useRef(0);
  const isExternalSyncRef = useRef(false);
  const markerMapRef = useRef<Map<string, string>>(new Map());
  const [showMarkerLegend, setShowMarkerLegend] = useState(false);
  const [logScale, setLogScale] = useState(true);

  // 스크린샷 함수 등록
  useEffect(() => {
    if (!onScreenshot) return;
    onScreenshot(() => {
      const priceCanvas = priceChartRef.current?.takeScreenshot();
      const flowCanvas = flowChartRef.current?.takeScreenshot();
      if (!priceCanvas) return undefined;
      if (flowCanvas) {
        const merged = document.createElement("canvas");
        merged.width = Math.max(priceCanvas.width, flowCanvas.width);
        merged.height = priceCanvas.height + flowCanvas.height;
        const ctx = merged.getContext("2d")!;
        ctx.fillStyle = isDark ? "#0f1117" : "#ffffff";
        ctx.fillRect(0, 0, merged.width, merged.height);
        ctx.drawImage(priceCanvas, 0, 0);
        ctx.drawImage(flowCanvas, 0, priceCanvas.height);
        return merged.toDataURL("image/png");
      }
      return priceCanvas.toDataURL("image/png");
    });
  }, [onScreenshot, isDark]);

  // candles 변경 시 뷰포트 리셋
  useEffect(() => {
    setViewportPeriod("1M");
  }, [candles]);

  // 수급 차트 공간 (전체보기용): 컨트롤바(~40px) + 수급차트 높이
  const flowHeightRef = useRef(0);
  const getFlowHeight = useCallback(() => {
    if (!height || investorDaily.length === 0) return 0;
    // 전체보기에서 수급 차트에 할당할 높이 (전체의 25%, 최소 120, 최대 200)
    return Math.max(120, Math.min(Math.round(height * 0.25), 200));
  }, [height, investorDaily.length]);

  const getChartHeight = useCallback(
    () => {
      if (!priceContainerRef.current) return 300;
      if (height) {
        // 전체보기: 수급 차트 + 컨트롤바(~100px) 빼고 할당
        const flowH = getFlowHeight();
        const reserved = flowH > 0 ? flowH + 100 : 0;
        flowHeightRef.current = flowH;
        return height - reserved;
      }
      return Math.min(priceContainerRef.current.clientWidth * 0.8, 520);
    },
    [height, getFlowHeight],
  );

  const handleViewport = useCallback((period: ViewportPeriod) => {
    setViewportPeriod(period);
    const pc = priceChartRef.current;
    if (!pc) return;
    const bars = VIEWPORT_BARS[period];
    if (bars === null) {
      pc.timeScale().fitContent();
    } else {
      const total = totalBarsRef.current;
      const from = total - bars;
      const to = total - 1 + 2;
      pc.timeScale().setVisibleLogicalRange({ from, to });
    }
  }, []);

  const handleFlowCrosshairDate = useCallback((date: string | null) => {
    const chart = priceChartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series || !date) return;
    const idx = dateToIndexRef.current.get(date);
    if (idx == null) return;
    isExternalSyncRef.current = true;
    const c = rCandlesRef.current[idx];
    chart.setCrosshairPosition(c.close, date, series);
    setCrosshairData({
      date, open: c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume, prevClose: idx > 0 ? rCandlesRef.current[idx - 1].close : null,
    });
    requestAnimationFrame(() => { isExternalSyncRef.current = false; });
  }, []);

  // 한 줄 해석 상태
  const [oneLiner, setOneLiner] = useState<string>("");
  const [trendLabel, setTrendLabel] = useState<{ text: string; color: string } | null>(null);
  const [longTrendLabel, setLongTrendLabel] = useState<{ text: string; color: string } | null>(null);

  useEffect(() => {
    if (!candles.length || !priceContainerRef.current) return;

    let priceChart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      const {
        createChart, CandlestickSeries, LineSeries, AreaSeries,
        HistogramSeries, createSeriesMarkers, PriceScaleMode,
      } = await import("lightweight-charts");

      const priceEl = priceContainerRef.current;
      if (!priceEl) return;

      if (priceChartRef.current) {
        priceChartRef.current.remove();
        priceChartRef.current = null;
      }

      const rCandles = resampleCandles(candles, candleInterval);
      const rInvestor = resampleTrend(investorDaily, candleInterval);
      const priceH = getChartHeight();
      const isMobile = priceEl.clientWidth < 640;

      const monoFont = isMobile ? "monospace" : "var(--font-geist-mono), ui-monospace, monospace";
      const fmtPrice = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
      const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
      const textColor = isDark
        ? (isMobile ? "#e5e7eb" : "#9ca3af")
        : (isMobile ? "#1f2937" : "#4b5563");

      priceChart = createChart(priceEl, {
        width: priceEl.clientWidth,
        height: priceH,
        layout: {
          background: { color: "transparent" },
          textColor,
          fontSize: isMobile ? 9 : 10,
          fontFamily: monoFont,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: {
          vertLine: { color: "rgba(129,140,248,0.7)", width: 1 as const, style: 2 as const },
          horzLine: { color: "rgba(129,140,248,0.7)", width: 1 as const, style: 2 as const },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.2 },
          minimumWidth: isMobile ? 48 : 60,
          entireTextOnly: true,
          ticksVisible: false,
          mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        },
        localization: {
          locale: "ko-KR",
          priceFormatter: fmtPrice,
          timeFormatter: (t: number | string) => {
            const d = typeof t === "string" ? new Date(t) : new Date(t * 1000);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
          },
        },
        timeScale: {
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
          timeVisible: false,
          visible: true,
          fixLeftEdge: true,
          fixRightEdge: true,
          rightOffset: 3,
          tickMarkFormatter: (time: string, tickMarkType: number) => {
            const d = new Date(time);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const day = d.getDate();
            // tickMarkType: 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
            if (tickMarkType === 0) return `${y}`;
            if (tickMarkType === 1 || day === 1 || day <= 7) {
              return m === 1 ? `${y}.${m}월` : `${m}월`;
            }
            return `${m}/${day}`;
          },
        },
        handleScroll: { vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: true, pinch: true, mouseWheel: true },
      });
      priceChartRef.current = priceChart;

      // 캔들스틱
      const candleData = rCandles.map(c => ({
        time: toDateStr(c.time), open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      const candleSeries = priceChart.addSeries(CandlestickSeries, {
        upColor: "#ef4444", downColor: "#3b82f6",
        borderUpColor: "#ef4444", borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444", wickDownColor: "#3b82f6",
        priceFormat: { type: "custom", formatter: fmtPrice, minMove: 1 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1 as const,
        priceLineStyle: 2 as const,
        priceLineColor: rCandles.length > 0 && rCandles[rCandles.length - 1].close >= rCandles[rCandles.length - 1].open
          ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)",
      });
      candleSeries.setData(candleData);
      candleSeriesRef.current = candleSeries;

      // 거래량
      const volumeSeries = priceChart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" }, priceScaleId: "volume",
        lastValueVisible: false, priceLineVisible: false,
      });
      priceChart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 }, visible: false,
      });
      volumeSeries.setData(
        rCandles.map(c => ({
          time: toDateStr(c.time), value: c.volume,
          color: c.close >= c.open ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)",
        })),
      );

      // 수급 맵
      const trendMap = new Map<string, InvestorTrendDaily>();
      for (const d of rInvestor) {
        trendMap.set(normalizeDateStr(d.date), d);
      }

      // ── 단기 회귀 채널 ──
      const effectiveShortWindow = legacyMode
        ? (trendPeriod === "OFF" ? 0 : trendPeriod === "MAX" ? rCandles.length : (LEGACY_PERIOD_BARS[trendPeriod] ?? 60))
        : shortWindow;
      const effectiveLongWindow = legacyMode ? 0 : longWindow;
      const reg = effectiveShortWindow > 0 ? computeRegressionChannelV2(rCandles, effectiveShortWindow, logScale) : null;

      if (reg) {
        const trend = getTrendContext(reg);
        setTrendLabel(TREND_LABEL[trend]);

        const rgb = "245,158,11"; // amber 계열

        // 기본 3선: 중심 + ±2σ
        for (const mult of [2, -2]) {
          const area = priceChart.addSeries(AreaSeries, {
            lineColor: `rgba(${rgb},0.7)`,
            topColor: `rgba(${rgb},0.12)`,
            bottomColor: `rgba(${rgb},0.01)`,
            lineWidth: 2, lineStyle: 2,
            crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
          });
          area.setData(buildBandData(rCandles, reg, mult, candleInterval));
        }

        // 중심선
        const glow = priceChart.addSeries(LineSeries, {
          color: `rgba(${rgb},0.15)`, lineWidth: 4, lineStyle: 0,
          crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
        });
        glow.setData(buildBandData(rCandles, reg, 0, candleInterval));

        const center = priceChart.addSeries(LineSeries, {
          color: `rgba(${rgb},1)`, lineWidth: 2, lineStyle: 0,
          crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
        });
        center.setData(buildBandData(rCandles, reg, 0, candleInterval));

        // 상세 7선: ±1.4σ, ±0.7σ 추가 (균등 간격)
        if (showDetail) {
          for (const mult of [1.4, -1.4, 0.7, -0.7]) {
            const detailLine = priceChart.addSeries(LineSeries, {
              color: `rgba(${rgb},0.30)`, lineWidth: 1, lineStyle: 2,
              crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
            });
            detailLine.setData(buildBandData(rCandles, reg, mult, candleInterval));
          }
        }

        // 마커
        const markers = buildMarkersV2(rCandles, reg, trendMap, trend);
        const mMap = new Map<string, string>();
        if (markers.length) {
          createSeriesMarkers(candleSeries, markers);
          for (const m of markers) mMap.set(m.time, m.description);
        }
        markerMapRef.current = mMap;

        // ── 장기 회귀 채널 (점선, 보라 계열) ──
        let longTrendCtx: ReturnType<typeof getTrendContext> | null = null;
        if (effectiveLongWindow > 0 && rCandles.length >= effectiveLongWindow) {
          const regLong = computeRegressionChannelV2(rCandles, effectiveLongWindow, logScale);
          if (regLong) {
            longTrendCtx = getTrendContext(regLong);
            const longRgb = "168,85,247"; // purple 계열

            // 장기 3선만: ±2σ + 중심 (점선)
            for (const mult of [2, -2]) {
              const longBand = priceChart.addSeries(LineSeries, {
                color: `rgba(${longRgb},0.5)`, lineWidth: 1, lineStyle: 3,
                crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
              });
              longBand.setData(buildBandData(rCandles, regLong, mult, candleInterval));
            }

            const longCenter = priceChart.addSeries(LineSeries, {
              color: `rgba(${longRgb},0.7)`, lineWidth: 2, lineStyle: 3,
              crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false,
            });
            longCenter.setData(buildBandData(rCandles, regLong, 0, candleInterval));
          }
        }

        // 한 줄 해석 (장기 추세 포함)
        const liner = buildOneLiner(rCandles, reg, trendMap);
        setOneLiner(liner.text);

        if (longTrendCtx) {
          setLongTrendLabel(TREND_LABEL[longTrendCtx]);
        } else {
          setLongTrendLabel(null);
        }
      } else {
        setOneLiner("");
        setTrendLabel(null);
        setLongTrendLabel(null);
      }

      // 초기 뷰포트
      const candleDates = rCandles.map(c => toDateStr(c.time));
      totalBarsRef.current = candleDates.length;

      if (candleInterval !== "day") {
        const fitBars = reg ? reg.windowSize : rCandles.length;
        const initFrom = Math.max(0, candleDates.length - fitBars) - 1;
        const initTo = candleDates.length - 1 + 2;
        priceChart.timeScale().setVisibleLogicalRange({ from: initFrom, to: initTo });
      } else {
        const vpBars = VIEWPORT_BARS[viewportPeriod];
        if (vpBars === null) {
          priceChart.timeScale().fitContent();
        } else {
          const initFrom = Math.max(0, candleDates.length - vpBars);
          const initTo = candleDates.length - 1 + 2;
          priceChart.timeScale().setVisibleLogicalRange({ from: initFrom, to: initTo });
        }
      }

      // 크로스헤어
      const dateToIndex = new Map<string, number>();
      candleDates.forEach((d, i) => dateToIndex.set(d, i));
      dateToIndexRef.current = dateToIndex;
      rCandlesRef.current = rCandles;

      const buildCH = (idx: number): CrosshairData => {
        const c = rCandles[idx];
        const prev = idx > 0 ? rCandles[idx - 1] : null;
        const dateKey = toDateStr(c.time);
        return {
          date: dateKey, open: c.open, high: c.high, low: c.low, close: c.close,
          volume: c.volume, prevClose: prev?.close ?? null,
          markerDesc: markerMapRef.current.get(dateKey),
        };
      };
      setCrosshairData(buildCH(rCandles.length - 1));

      let lastCHDate = "";
      priceChart.subscribeCrosshairMove((param) => {
        if (!param.time) {
          if (lastCHDate !== "__latest__") {
            lastCHDate = "__latest__";
            setCrosshairData(buildCH(rCandles.length - 1));
          }
          return;
        }
        const ds = param.time as string;
        if (ds === lastCHDate) return;
        lastCHDate = ds;
        const idx = dateToIndex.get(ds);
        if (idx == null) return;
        setCrosshairData(buildCH(idx));
        if (!isExternalSyncRef.current) {
          setSyncDate(ds);
        }
      });

      // 리사이즈
      ro = new ResizeObserver(() => {
        if (!priceEl) return;
        const w = priceEl.clientWidth;
        const pH = height ?? Math.min(w * 0.8, 520);
        priceChartRef.current?.applyOptions({ width: w, height: pH });
      });
      ro.observe(priceEl);
    })();

    return () => {
      ro?.disconnect();
      priceChartRef.current?.remove();
      priceChartRef.current = null;
    };
  }, [candles, investorDaily, getChartHeight, candleInterval, viewportPeriod, isDark, showDetail, shortWindow, longWindow, height, legacyMode, trendPeriod, logScale]);

  return (
    <div className="w-full rounded-none sm:rounded-xl border-y sm:border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden" style={{ letterSpacing: "-0.05em" }}>
      {/* 한 줄 해석 */}
      {oneLiner && (
        <div className="px-2 sm:px-4 pt-2 sm:pt-3">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)] px-3 py-2">
            {trendLabel && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ color: trendLabel.color, backgroundColor: `${trendLabel.color}20` }}
              >
                {longTrendLabel ? "단기 " : ""}{trendLabel.text.includes("상") ? "↑" : trendLabel.text.includes("하") ? "↓" : "→"} {trendLabel.text}
              </span>
            )}
            {longTrendLabel && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ color: longTrendLabel.color, backgroundColor: `${longTrendLabel.color}20`, borderWidth: 1, borderColor: `${longTrendLabel.color}40` }}
              >
                장기 {longTrendLabel.text.includes("상") ? "↑" : longTrendLabel.text.includes("하") ? "↓" : "→"} {longTrendLabel.text}
              </span>
            )}
            <span className="text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
              {oneLiner}
            </span>
          </div>
        </div>
      )}

      {/* 컨트롤 */}
      <div className="px-2 sm:px-4 pt-2 sm:pt-3 pb-1 space-y-1">
        {/* Row 1: 봉 타입 + 조회 기간 */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-[10px] sm:text-xs text-[var(--text-faint)] font-bold shrink-0">봉</span>
          {([["day", "일"], ["week", "주"], ["month", "월"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setCandleInterval(val)}
              className={`rounded-md min-h-[30px] min-w-[28px] px-1.5 sm:px-2 text-[11px] sm:text-xs font-medium transition-colors ${
                candleInterval === val
                  ? "bg-[var(--bg-overlay)] text-[var(--text-primary)]"
                  : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-[var(--border-primary)] mx-1" />
          <span className="text-[10px] sm:text-xs text-[var(--text-faint)] font-bold shrink-0">{onAnalysisPeriodChange ? "분석" : "조회"}</span>
          {(["1M", "3M", "6M", "1Y", "2Y", "5Y", "MAX"] as ViewportPeriod[]).map(vp => (
            <button
              key={vp}
              type="button"
              onClick={() => {
                handleViewport(vp);
                onAnalysisPeriodChange?.(vp);
              }}
              className={`rounded-md min-h-[30px] px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-medium transition-colors ${
                (analysisPeriod ? analysisPeriod === vp : viewportPeriod === vp)
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {vp}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onFullscreen ? onFullscreen() : priceChartRef.current?.timeScale().fitContent()}
            className="rounded-md min-h-[30px] min-w-[28px] px-1 text-[var(--text-faint)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="전체보기"
            title="전체보기"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
        {/* Row 2: 범례 + 채널 설정 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[var(--text-faint)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
              상승
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
              하락
            </span>
            <button
              type="button"
              onClick={() => setShowMarkerLegend(v => !v)}
              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                showMarkerLegend
                  ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-400"
                  : "border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-indigo-400 hover:border-indigo-500/40"
              }`}
              title="신호 범례"
            >
              <span className="text-green-400">B</span>/<span className="text-red-400">S</span> 신호
            </button>
            <div className="ml-1 flex items-center rounded border border-[var(--border-primary)] overflow-hidden">
              <button
                type="button"
                onClick={() => setLogScale(true)}
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  logScale
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-[var(--text-muted)] hover:text-indigo-400"
                }`}
                title="로그 스케일 (비율 기반)"
              >
                로그
              </button>
              <button
                type="button"
                onClick={() => setLogScale(false)}
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  !logScale
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-[var(--text-muted)] hover:text-indigo-400"
                }`}
                title="선형 스케일 (절대값 기반)"
              >
                선형
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {legacyMode ? (
              <>
                <span className="text-[9px] text-amber-400/80">추세</span>
                {(["OFF", "1M", "3M", "6M", "1Y", "2Y", "MAX"] as LegacyTrendPeriod[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTrendPeriod(p)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      trendPeriod === p
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <div className="w-px h-3 bg-[var(--border-primary)] mx-0.5" />
                <button
                  type="button"
                  onClick={() => setShowDetail(v => !v)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors border ${
                    showDetail
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                      : "border-[var(--border-primary)] text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {showDetail ? "7선" : "3선"}
                </button>
              </>
            ) : (
              <>
                <span className="text-[9px] text-amber-400/80">단기</span>
                {SHORT_WINDOWS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setShortWindow(w)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      shortWindow === w
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {w}
                  </button>
                ))}
                <div className="w-px h-3 bg-[var(--border-primary)] mx-0.5" />
                <span className="text-[9px] text-purple-400/80">장기</span>
                {LONG_WINDOWS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setLongWindow(w)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      longWindow === w
                        ? "bg-purple-500/20 text-purple-400"
                        : "text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {w === 0 ? "OFF" : w}
                  </button>
                ))}
                <div className="w-px h-3 bg-[var(--border-primary)] mx-0.5" />
                <button
                  type="button"
                  onClick={() => setShowDetail(v => !v)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors border ${
                    showDetail
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                      : "border-[var(--border-primary)] text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {showDetail ? "7선" : "3선"}
                </button>
              </>
            )}
          </div>
        </div>
        {/* 마커 범례 패널 */}
        {showMarkerLegend && (
          <div className="mt-1 px-2 py-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[9px] sm:text-[10px] text-[var(--text-faint)] space-y-0.5">
            <div className="flex items-center gap-1.5"><span className="text-green-400 font-bold">B</span><span className="inline-block w-2.5 h-2.5 bg-green-400" /> 채널 하단 + 수급 유입 (강한 신호)</div>
            <div className="flex items-center gap-1.5"><span className="text-green-400/50 font-bold">B</span><span className="text-green-400/50 text-sm leading-none">&#8593;</span> 채널 하단 + 수급 유입 + 하락추세 (약한 신호)</div>
            <div className="flex items-center gap-1.5"><span className="text-red-400 font-bold">S</span><span className="inline-block w-2.5 h-2.5 bg-red-400" /> 채널 상단 + 수급 유출 (강한 신호)</div>
            <div className="flex items-center gap-1.5"><span className="text-red-400/50 font-bold">S</span><span className="text-red-400/50 text-sm leading-none">&#8595;</span> 채널 상단 + 수급 유출 + 상승추세 (약한 신호)</div>
          </div>
        )}
      </div>

      {/* OHLCV 헤더 */}
      {crosshairData && (
        <div className="px-2 sm:px-4 py-1 border-t border-[var(--border-secondary)] font-mono tabular-nums" style={{ letterSpacing: "normal" }}>
          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px]">
            <span className="shrink-0 text-[var(--text-faint)]">{crosshairData.date}</span>
            <span className="shrink-0 text-[var(--text-faint)]">시 <span className="text-[var(--text-secondary)]">{crosshairData.open.toLocaleString()}</span></span>
            <span className="shrink-0 text-[var(--text-faint)]">고 <span className="text-red-400">{crosshairData.high.toLocaleString()}</span></span>
            <span className="shrink-0 text-[var(--text-faint)]">저 <span className="text-blue-400">{crosshairData.low.toLocaleString()}</span></span>
            <span className="shrink-0 text-[var(--text-faint)]">종 <span className={
              crosshairData.prevClose != null
                ? crosshairData.close > crosshairData.prevClose ? "text-red-400" : crosshairData.close < crosshairData.prevClose ? "text-blue-400" : "text-[var(--text-secondary)]"
                : "text-[var(--text-secondary)]"
            }>{crosshairData.close.toLocaleString()}</span></span>
            {crosshairData.prevClose != null && (
              <span className={`shrink-0 ${
                crosshairData.close > crosshairData.prevClose ? "text-red-400" : crosshairData.close < crosshairData.prevClose ? "text-blue-400" : "text-[var(--text-faint)]"
              }`}>
                {crosshairData.close > crosshairData.prevClose ? "+" : ""}{((crosshairData.close - crosshairData.prevClose) / crosshairData.prevClose * 100).toFixed(2)}%
              </span>
            )}
            <span className="shrink-0 text-[var(--text-faint)]">거래량 <span className="text-[var(--text-secondary)]">{fmtVolume(crosshairData.volume)}</span></span>
            {crosshairData.markerDesc && (
              <span className={`shrink-0 font-sans text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded ${
                crosshairData.markerDesc.includes("매수")
                  ? "bg-green-500/15 text-green-400"
                  : "bg-red-500/15 text-red-400"
              }`}>
                {crosshairData.markerDesc}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 차트 영역 */}
      <div ref={priceContainerRef} className="w-full" />

      {/* 아랫차트: 수급 히스토그램 */}
      {investorDaily.length > 0 && (
        <InvestorFlowChartV2
          investorDaily={investorDaily}
          viewportPeriod={viewportPeriod}
          candleInterval={candleInterval}
          syncDate={syncDate}
          onCrosshairDate={handleFlowCrosshairDate}
          onChartReady={(c) => { flowChartRef.current = c; }}
          isDark={isDark}
          height={flowHeightRef.current > 0 ? flowHeightRef.current : undefined}
        />
      )}

      {/* ── 모바일 일별 매매동향 (md 미만) ── */}
      {investorDaily.length > 0 && (
        <>
          <div className="md:hidden border-t border-[var(--border-secondary)] px-2 py-3">
            <button
              type="button"
              onClick={() => setShowDailyDetail((v) => !v)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 py-3 text-[12px] font-medium text-indigo-400 active:bg-indigo-500/10 transition-colors"
            >
              <span>{showDailyDetail ? "일별 매매동향 닫기" : "일별 매매동향"}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${showDailyDetail ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {showDailyDetail && (
            <div className="md:hidden">
              <div className="flex border-b border-[var(--border-secondary)] mx-2">
                {([["supply", "수급 및 보유"], ["basic", "기본 정보"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDailyTab(key)}
                    className={`flex-1 py-2.5 text-[12px] font-medium text-center transition-colors ${
                      dailyTab === key
                        ? "text-indigo-400 border-b-2 border-indigo-400"
                        : "text-[var(--text-faint)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto px-2 pt-2 pb-3 space-y-1.5" style={{ maxHeight: 480 }}>
                {[...investorDaily].reverse().slice(0, 60).map((d) => {
                  const dateStr = normalizeDateStr(d.date);
                  const diff = d.priceChange ?? 0;
                  const rate = d.changeRate ?? 0;
                  return (
                    <div
                      key={`${dailyTab}-${dateStr}`}
                      className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] px-3 py-2 font-mono tabular-nums"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-faint)]">{dateStr.slice(5)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                            {d.close != null ? d.close.toLocaleString() : "-"}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[12px] font-bold leading-tight ${
                              rate > 0
                                ? "bg-red-500/15 text-red-400"
                                : rate < 0
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-[var(--bg-overlay)] text-[var(--text-faint)]"
                            }`}
                          >
                            {rate > 0 ? "+" : ""}{rate.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {dailyTab === "basic" ? (
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[var(--text-faint)]">전일비</span>
                            <span className={`font-medium ${diff > 0 ? "text-red-400" : diff < 0 ? "text-blue-400" : "text-[var(--text-faint)]"}`}>
                              {diff > 0 ? "▲" : diff < 0 ? "▼" : ""}{Math.abs(diff).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-faint)]">거래량</span>
                            <span className="font-bold text-[var(--text-primary)]">{d.volume != null ? d.volume.toLocaleString() + " 주" : "-"}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                            <div className={`rounded-md py-1.5 ${d.individual > 0 ? "bg-red-500/10" : d.individual < 0 ? "bg-blue-500/10" : "bg-[var(--bg-overlay)]"}`}>
                              <div className="text-[9px] text-[var(--text-faint)] mb-0.5">개인</div>
                              <div className={`text-[12px] font-bold ${d.individual > 0 ? "text-red-500" : d.individual < 0 ? "text-blue-500" : "text-[var(--text-faint)]"}`}>
                                {d.individual > 0 ? "+" : ""}{d.individual.toLocaleString()}
                              </div>
                            </div>
                            <div className={`rounded-md py-1.5 ${d.foreign > 0 ? "bg-red-500/10" : d.foreign < 0 ? "bg-blue-500/10" : "bg-[var(--bg-overlay)]"}`}>
                              <div className="text-[9px] text-[var(--text-faint)] mb-0.5">외국인</div>
                              <div className={`text-[12px] font-bold ${d.foreign > 0 ? "text-red-500" : d.foreign < 0 ? "text-blue-500" : "text-[var(--text-faint)]"}`}>
                                {d.foreign > 0 ? "+" : ""}{d.foreign.toLocaleString()}
                              </div>
                            </div>
                            <div className={`rounded-md py-1.5 ${d.institution > 0 ? "bg-red-500/10" : d.institution < 0 ? "bg-blue-500/10" : "bg-[var(--bg-overlay)]"}`}>
                              <div className="text-[9px] text-[var(--text-faint)] mb-0.5">기관</div>
                              <div className={`text-[12px] font-bold ${d.institution > 0 ? "text-red-500" : d.institution < 0 ? "text-blue-500" : "text-[var(--text-faint)]"}`}>
                                {d.institution > 0 ? "+" : ""}{d.institution.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-[var(--border-secondary)] grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-faint)]">외인보유</span>
                              <span className="text-[var(--text-secondary)]">{d.foreignTotal != null ? d.foreignTotal.toLocaleString() : "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-faint)]">보유율</span>
                              <span className="text-[var(--text-secondary)]">{d.foreignPct != null ? `${d.foreignPct.toFixed(2)}%` : "-"}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PC 테이블 (md 이상) ── */}
          <div className="hidden md:block border-t border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={() => setShowDailyDetail((v) => !v)}
              className="w-full flex items-center gap-2 px-4 pt-3 pb-1 group"
            >
              <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide">일별 매매동향</span>
              <svg
                className={`h-3 w-3 text-[var(--text-faint)] transition-transform duration-200 ${showDailyDetail ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDailyDetail && <div className="overflow-x-auto overflow-y-auto pb-2" style={{ maxHeight: 400 }}>
              <table className="min-w-[640px] w-full text-[11px] font-mono tabular-nums border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] border-b-2 border-[var(--border-primary)]">
                    <th className="py-2 px-2 text-center font-semibold">날짜</th>
                    <th className="py-2 px-2 text-right font-semibold">종가</th>
                    <th className="py-2 px-2 text-right font-semibold">전일비</th>
                    <th className="py-2 px-2 text-right font-semibold">등락률</th>
                    <th className="py-2 px-2 text-right font-semibold">거래량</th>
                    <th className="py-2 px-2 text-right font-semibold text-green-500/80">개인</th>
                    <th className="py-2 px-2 text-right font-semibold text-orange-500/80">외국인</th>
                    <th className="py-2 px-2 text-right font-semibold text-blue-500/80">기관</th>
                    <th className="py-2 px-2 text-right font-semibold">외인보유</th>
                    <th className="py-2 px-2 text-right font-semibold">보유율</th>
                  </tr>
                </thead>
                <tbody>
                  {[...investorDaily].reverse().slice(0, 90).map((d, i) => {
                    const dateStr = normalizeDateStr(d.date);
                    const diff = d.priceChange ?? 0;
                    const rate = d.changeRate ?? 0;
                    const diffColor = diff > 0 ? "text-red-400" : diff < 0 ? "text-blue-400" : "text-[var(--text-faint)]";
                    const isEven = i % 2 === 0;
                    return (
                      <tr
                        key={dateStr}
                        className={`border-b border-[var(--border-secondary)] transition-colors duration-150 hover:bg-[var(--bg-overlay)] ${
                          isEven ? "bg-[var(--bg-overlay)]" : "bg-transparent"
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center text-[var(--text-faint)]">{dateStr.slice(5)}</td>
                        <td className="py-1.5 px-2 text-right text-[var(--text-primary)]">{d.close != null ? d.close.toLocaleString() : "-"}</td>
                        <td className={`py-1.5 px-2 text-right ${diffColor}`}>
                          {diff > 0 ? "▲" : diff < 0 ? "▼" : ""}{Math.abs(diff).toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <span
                            className={`inline-block rounded-full px-1.5 py-0.5 leading-tight ${
                              rate > 0
                                ? "bg-red-500/10 text-red-400"
                                : rate < 0
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "text-[var(--text-faint)]"
                            }`}
                          >
                            {rate > 0 ? "+" : ""}{rate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-[var(--text-muted)]">{d.volume != null ? d.volume.toLocaleString() : "-"}</td>
                        <td className={`py-1.5 px-2 text-right ${d.individual > 0 ? "text-green-500" : d.individual < 0 ? "text-green-700" : "text-[var(--text-faint)]"}`}>
                          {d.individual.toLocaleString()}
                        </td>
                        <td className={`py-1.5 px-2 text-right ${d.foreign > 0 ? "text-orange-500" : d.foreign < 0 ? "text-orange-700" : "text-[var(--text-faint)]"}`}>
                          {d.foreign.toLocaleString()}
                        </td>
                        <td className={`py-1.5 px-2 text-right ${d.institution > 0 ? "text-blue-500" : d.institution < 0 ? "text-blue-700" : "text-[var(--text-faint)]"}`}>
                          {d.institution.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right text-[var(--text-muted)]">
                          {d.foreignTotal != null ? d.foreignTotal.toLocaleString() : "-"}
                        </td>
                        <td className="py-1.5 px-2 text-right text-[var(--text-muted)]">
                          {d.foreignPct != null ? `${d.foreignPct.toFixed(2)}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </div>
        </>
      )}

      {/* 버전 라벨 */}
      <div className="px-2 sm:px-4 py-1.5 text-center">
        <span className="text-[9px] text-[var(--text-faint)]">
          Chart {legacyMode ? "V1" : "V2"} Lab{stockName ? ` · ${stockName}` : ""}
        </span>
      </div>

    </div>
  );
}
