"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { searchStocks } from "@/lib/stockSearchApi";
import { fetchStockChart } from "@/lib/stockChartApi";
import { analyzeBitgak, computeMAArray } from "@/lib/bitgakEngine";
import type {
  Candle,
  BitgakResult,
  BitgakMeta,
  BitgakLine,
  BitgakViewMode,
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
  { value: "2y", label: "2년" },
  { value: "5y", label: "5년" },
];

const INTERVAL_OPTIONS: { value: ChartInterval; label: string }[] = [
  { value: "1d", label: "일봉" },
  { value: "1wk", label: "주봉" },
  { value: "1mo", label: "월봉" },
];

// 장기 범위 선택 시 자동 봉 전환 매핑
const AUTO_INTERVAL: Partial<Record<ChartRange, ChartInterval>> = {
  "2y": "1wk",
  "5y": "1mo",
};

// 기간별 유효한 봉 단위 매핑 (물리적으로 분석 불가능한 조합 차단)
const VALID_INTERVALS: Record<ChartRange, ChartInterval[]> = {
  "1mo": ["1d"],
  "3mo": ["1d", "1wk"],
  "6mo": ["1d", "1wk"],
  "1y": ["1d", "1wk", "1mo"],
  "2y": ["1d", "1wk", "1mo"],
  "5y": ["1d", "1wk", "1mo"],
};

function applyOpacity(hex: string, opacity: number): string {
  if (opacity >= 1) return hex;
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const MA_CONFIGS = [
  { period: 5, color: "#fbbf24", label: "MA5" },
  { period: 20, color: "#f97316", label: "MA20" },
  { period: 60, color: "#a855f7", label: "MA60" },
] as const;

interface Props {
  onAnalysisReady?: (summary: string, stockName: string, indicators?: TechIndicators, meta?: BitgakMeta) => void;
  externalSymbol?: { symbol: string; name: string } | null;
  onExternalClear?: () => void;
}

export function BitgakChart({ onAnalysisReady, externalSymbol, onExternalClear }: Props) {
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
  const [logScale, setLogScale] = useState(false);
  const [viewMode, setViewMode] = useState<BitgakViewMode>("auto");
  const [containerWidth, setContainerWidth] = useState(600);

  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부에서 종목 전달 시 (한글 심볼이면 검색 API로 실제 심볼 조회)
  useEffect(() => {
    if (externalSymbol && externalSymbol.symbol !== selected?.symbol) {
      const isKoreanSymbol = /[가-힣]/.test(externalSymbol.symbol);
      if (isKoreanSymbol) {
        searchStocks(externalSymbol.name).then((results) => {
          if (results.length > 0) {
            setSelected({ symbol: results[0].symbol, name: results[0].name });
            setQuery(results[0].name);
          }
        }).catch(() => {});
        setQuery(externalSymbol.name);
        return;
      }
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

  const handleRangeChange = useCallback((newRange: ChartRange) => {
    setRange(newRange);
    const autoInterval = AUTO_INTERVAL[newRange];
    if (autoInterval) {
      setInterval(autoInterval);
    } else {
      // 현재 봉이 새 범위에서 유효하지 않으면 첫 번째 유효 봉으로 전환
      const valid = VALID_INTERVALS[newRange];
      setInterval((prev) => valid.includes(prev) ? prev : valid[0]);
    }
  }, []);

  const resetStock = useCallback(() => {
    setQuery("");
    setSelected(null);
    setChartData(null);
    setBitgakResult(null);
    setError(null);
    onExternalClear?.();
  }, [onExternalClear]);

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
        const result = analyzeBitgak(data.candles, interval, logScale, viewMode);
        setBitgakResult(result);
        onAnalysisReady?.(result.summary, selected.name, result.indicators, result.meta);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "차트 조회 실패");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, range, interval, onAnalysisReady]);

  // logScale / viewMode 변경 시 빗각 재계산 (API 재호출 없이)
  useEffect(() => {
    if (!chartData || !selected) return;
    const result = analyzeBitgak(chartData.candles, interval, logScale, viewMode);
    setBitgakResult(result);
    onAnalysisReady?.(result.summary, selected.name, result.indicators, result.meta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logScale, viewMode]);

  const chartHeight = Math.min(containerWidth * 0.55, 400);

  // lightweight-charts 렌더링
  useEffect(() => {
    if (!chartData || !chartContainerRef.current) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, CandlestickSeries, LineSeries, HistogramSeries, createSeriesMarkers, PriceScaleMode } = await import("lightweight-charts");

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
          mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
          autoScale: true,
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.2 },
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

          const lineColor = applyOpacity(line.color, line.opacity ?? 1);
          const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: line.type === "midline" ? 1 : line.type === "trend_line" ? 2 : 2,
            lineStyle: line.style === "dashed" ? 1 : 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
            autoscaleInfoProvider: () => ({
              priceRange: null,
            }),
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
  }, [chartData, bitgakResult, showMA, logScale, chartHeight]);

  const showDropdown = suggestions.length > 0;

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-visible">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📐</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">빗각 차트 분석</h3>
        <span className="text-[10px] text-gray-400 font-mono">종목 선택 → 자동 빗각 작도</span>
      </div>

      {/* 검색창 */}
      <div className="relative z-50">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/70" />
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
            placeholder="종목명을 입력하세요"
            className="w-full pl-9 pr-8 py-3 rounded-xl bg-white dark:bg-white/[0.07] border-2 border-blue-400/30 dark:border-blue-400/25 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 focus:shadow-[0_0_16px_rgba(59,130,246,0.12)] transition-all"
          />
          {selected && (
            <button
              onClick={resetStock}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
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
                onClick={() => handleRangeChange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                  range === opt.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => {
              const isValid = VALID_INTERVALS[range]?.includes(opt.value) ?? true;
              return (
                <button
                  key={opt.value}
                  onClick={() => isValid && setInterval(opt.value)}
                  disabled={!isValid}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    !isValid
                      ? "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-zinc-600 cursor-not-allowed"
                      : interval === opt.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          <button
            onClick={() => setShowMA((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              showMA
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
            }`}
          >
            MA
          </button>
          <button
            onClick={() => setLogScale((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
              logScale
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
            }`}
          >
            LOG
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-white/20" />
          {([
            { value: "auto" as const, label: "자동", activeClass: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
            { value: "bullish" as const, label: "상승", activeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
            { value: "bearish" as const, label: "하락", activeClass: "bg-red-500/20 text-red-400 border border-red-500/30" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                viewMode === opt.value
                  ? opt.activeClass
                  : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <Skeleton variant="card" className="mt-3 h-[220px]" />
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
                className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-zinc-300 font-mono"
              >
                <span
                  className="inline-block w-3 h-[2px]"
                  style={{ backgroundColor: line.color }}
                />
                {line.label}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-gray-500 dark:text-zinc-400 font-mono leading-relaxed whitespace-pre-line">
            {bitgakResult.summary}
          </div>
        </div>
      )}
    </div>
  );
}
