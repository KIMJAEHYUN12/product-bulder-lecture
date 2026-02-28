"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStocks } from "@/lib/stockSearchApi";
import { fetchStockChart } from "@/lib/stockChartApi";
import { analyzeBitgak, computeMAArray } from "@/lib/bitgakEngine";
import type {
  Candle,
  BitgakResult,
  BitgakLine,
  ChartRange,
  ChartInterval,
  StockChartResponse,
  TechIndicators,
} from "@/types";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1개월" },
  { value: "3mo", label: "3개월" },
  { value: "6mo", label: "6개월" },
  { value: "1y", label: "1년" },
];

const INTERVAL_OPTIONS: { value: ChartInterval; label: string }[] = [
  { value: "1d", label: "일봉" },
  { value: "1wk", label: "주봉" },
];

const MA_CONFIGS = [
  { period: 5, color: "#fbbf24", label: "MA5" },
  { period: 20, color: "#f97316", label: "MA20" },
  { period: 60, color: "#a855f7", label: "MA60" },
] as const;

interface Props {
  onAnalysisReady?: (summary: string, stockName: string, indicators?: TechIndicators) => void;
  externalSymbol?: { symbol: string; name: string } | null;
}

export function BitgakChart({ onAnalysisReady, externalSymbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const [range, setRange] = useState<ChartRange>("6mo");
  const [interval, setInterval] = useState<ChartInterval>("1d");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<StockChartResponse | null>(null);
  const [bitgakResult, setBitgakResult] = useState<BitgakResult | null>(null);
  const [showMA, setShowMA] = useState(true);
  const [containerWidth, setContainerWidth] = useState(600);

  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 종목 전달 시
  useEffect(() => {
    if (externalSymbol && externalSymbol.symbol !== selected?.symbol) {
      setSelected(externalSymbol);
      setQuery(externalSymbol.name);
      setError(null);
    }
  }, [externalSymbol, selected?.symbol]);

  // 컨테이너 너비 감지
  useEffect(() => {
    const container = chartContainerRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (selected || !query.trim() || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        setSuggestions(results.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected]);

  const selectStock = useCallback((stock: { symbol: string; name: string }) => {
    setSelected(stock);
    setQuery(stock.name);
    setError(null);
  }, []);

  const resetStock = useCallback(() => {
    setQuery("");
    setSelected(null);
    setChartData(null);
    setBitgakResult(null);
    setError(null);
  }, []);

  // 차트 데이터 로드
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchStockChart(selected.symbol, range, interval)
      .then((data) => {
        if (cancelled) return;
        setChartData(data);
        const result = analyzeBitgak(data.candles);
        setBitgakResult(result);
        onAnalysisReady?.(result.summary, selected.name, result.indicators);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "차트 조회 실패");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selected, range, interval, onAnalysisReady]);

  const chartHeight = Math.min(containerWidth * 0.55, 400);

  // lightweight-charts 렌더링
  useEffect(() => {
    if (!chartData || !chartContainerRef.current) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers } = await import("lightweight-charts");

      const container = chartContainerRef.current;
      if (!container) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

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
      });

      chartRef.current = chart;

      const toDateStr = (ts: number) => {
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      // 캔들스틱 시리즈
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });

      const candleData = chartData.candles.map((c: Candle) => ({
        time: toDateStr(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      candleSeries.setData(candleData);

      // 거래량 히스토그램
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      const volumeData = chartData.candles.map((c: Candle) => ({
        time: toDateStr(c.time),
        value: c.volume,
        color: c.close >= c.open ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)",
      }));
      volumeSeries.setData(volumeData);

      // 이동평균선
      if (showMA) {
        const closes = chartData.candles.map((c: Candle) => c.close);
        for (const ma of MA_CONFIGS) {
          const maValues = computeMAArray(closes, ma.period);
          const maData = maValues
            .map((v, i) => ({
              time: toDateStr(chartData.candles[i].time),
              value: v,
            }))
            .filter((d) => !isNaN(d.value));

          if (maData.length > 0) {
            const maSeries = chart.addSeries(LineSeries, {
              color: ma.color,
              lineWidth: 1,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            maSeries.setData(maData);
          }
        }
      }

      // 빗각선 렌더링
      if (bitgakResult) {
        for (const line of bitgakResult.lines) {
          const lineData = line.points.map((p: { time: number; value: number }) => ({
            time: toDateStr(p.time),
            value: p.value,
          }));

          const lineSeries = chart.addSeries(LineSeries, {
            color: line.color,
            lineWidth: line.type === "midline" ? 1 : 2,
            lineStyle: line.style === "dashed" ? 1 : 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          lineSeries.setData(lineData);
        }

        // 피벗 마커
        const markers = [
          ...bitgakResult.highs.map((p) => ({
            time: toDateStr(p.time),
            position: "aboveBar" as const,
            color: "#ef4444",
            shape: "arrowDown" as const,
            text: "",
          })),
          ...bitgakResult.lows.map((p) => ({
            time: toDateStr(p.time),
            position: "belowBar" as const,
            color: "#22c55e",
            shape: "arrowUp" as const,
            text: "",
          })),
        ].sort((a, b) => (a.time > b.time ? 1 : -1));

        if (markers.length > 0) {
          createSeriesMarkers(candleSeries, markers);
        }
      }

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && container) {
          chart.applyOptions({ width: container.clientWidth, height: chartHeight });
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, bitgakResult, showMA, chartHeight]);

  const showDropdown = suggestions.length > 0;

  return (
    <div className="glass-card rounded-xl p-4 relative z-0 overflow-visible">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📐</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">빗각 차트 분석</h3>
        <span className="text-[10px] text-gray-400 font-mono">종목 선택 → 자동 빗각 작도</span>
      </div>

      {/* 검색창 */}
      <div className="relative z-50">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) {
                resetStock();
                setQuery(e.target.value);
              }
            }}
            placeholder="종목명 검색 (예: 삼성전자, SK하이닉스)"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors pr-8"
          />
          {selected && (
            <button
              onClick={resetStock}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* 자동완성 */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
            >
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => selectStock({ symbol: s.symbol, name: s.name })}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 기간/봉 선택 + MA 토글 */}
      {selected && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  range === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInterval(opt.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  interval === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <button
            onClick={() => setShowMA((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
              showMA
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
            }`}
          >
            MA
          </button>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 font-mono">
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          차트 데이터 로딩 중...
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* 차트 영역 */}
      {selected && !error && (
        <div
          ref={chartContainerRef}
          className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10"
          style={{ minHeight: chartHeight }}
        />
      )}

      {/* MA 범례 */}
      {selected && showMA && chartData && (
        <div className="flex gap-3 mt-2">
          {MA_CONFIGS.map((ma) => (
            <span key={ma.period} className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
              <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: ma.color }} />
              {ma.label}
            </span>
          ))}
        </div>
      )}

      {/* 빗각 분석 요약 */}
      {bitgakResult && bitgakResult.lines.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-1.5">채널 분석 결과</div>
          <div className="flex flex-wrap gap-2">
            {bitgakResult.lines.map((line: BitgakLine, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-300 font-mono"
              >
                <span
                  className="inline-block w-3 h-[2px]"
                  style={{ backgroundColor: line.color }}
                />
                {line.label}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-relaxed whitespace-pre-line">
            {bitgakResult.summary}
          </div>
        </div>
      )}
    </div>
  );
}
