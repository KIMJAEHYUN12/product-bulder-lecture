"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useBacktest, type CustomPeriod } from "@/hooks/useBacktest";
import { searchStocks, type StockSearchResult } from "@/lib/stockSearchApi";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { ShareModal } from "@/components/ShareModal";
import { LoginButton } from "@/components/mock/LoginButton";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { StaggerContainer } from "@/components/StaggerContainer";
import { Skeleton } from "@/components/Skeleton";
import { generateBacktestShareImage, generateBacktestShareText } from "@/lib/backtestShareImage";
import type { ChartRange, BacktestResult } from "@/types";

const AMOUNT_PRESETS = [
  { label: "100만", value: 1_000_000 },
  { label: "500만", value: 5_000_000 },
  { label: "1000만", value: 10_000_000 },
  { label: "5000만", value: 50_000_000 },
  { label: "1억", value: 100_000_000 },
];

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

const LINE_COLORS: Record<string, string> = {};
const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

function formatKrw(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString();
}

function StatCard({
  label,
  value,
  numericValue,
  color,
  accentFrom,
  accentTo,
}: {
  label: string;
  value: string;
  numericValue?: number;
  color?: string;
  accentFrom?: string;
  accentTo?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center border ${
        accentFrom
          ? `bg-gradient-to-br ${accentFrom} ${accentTo ?? "to-transparent"} border-white/[0.08]`
          : "bg-white/[0.03] border-white/[0.08]"
      }`}
    >
      <p className="text-[10px] text-gray-500 font-mono mb-1">{label}</p>
      {numericValue !== undefined ? (
        <AnimatedNumber
          value={numericValue}
          format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          className={`text-lg font-black font-mono ${color ?? "text-white"}`}
        />
      ) : (
        <p className={`text-lg font-black font-mono ${color ?? "text-white"}`}>{value}</p>
      )}
    </div>
  );
}

function BacktestChart({ result, stockNames }: { result: BacktestResult; stockNames: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || result.dailyValues.length === 0) return;

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
          background: { color: "transparent" },
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
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
        timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: false },
        localization: {
          priceFormatter: (price: number) => formatKrw(price),
        },
      });
      chartRef.current = chart;

      const portfolioSeries = chart.addSeries(LineSeries, {
        color: "#ffffff",
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      portfolioSeries.setData(result.dailyValues.map((d) => ({ time: d.date, value: d.value })));

      const kospiSeries = chart.addSeries(LineSeries, {
        color: "#6b7280",
        lineWidth: 1,
        lineStyle: 2,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      kospiSeries.setData(result.kospiValues.map((d) => ({ time: d.date, value: d.value })));

      const symbols = Object.keys(result.stockValues);
      symbols.forEach((sym, i) => {
        const data = result.stockValues[sym];
        if (data.length === 0) return;
        const series = chart!.addSeries(LineSeries, {
          color: STOCK_COLORS[i] || "#94a3b8",
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(data.map((d) => ({ time: d.date, value: d.value })));
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
  }, [result]);

  const symbols = Object.keys(result.stockValues);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-bold text-white font-mono">
          <span className="w-2.5 h-0.5 bg-white rounded" />
          포트폴리오
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-gray-400 font-mono">
          <span className="w-2.5 h-0.5 bg-gray-500 rounded" style={{ borderTop: "1px dashed #6b7280" }} />
          KOSPI
        </span>
        {symbols.map((sym, i) => (
          <span
            key={sym}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono"
            style={{
              backgroundColor: STOCK_COLORS[i] + "15",
              color: STOCK_COLORS[i],
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STOCK_COLORS[i] }} />
            {stockNames[sym] || sym}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden"
        style={{ minHeight: 220 }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant="card" className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
      </div>
      <Skeleton variant="card" className="h-56 w-full" />
    </div>
  );
}

export default function BacktestPage() {
  const {
    stocks, amount, range, customPeriod, result, isLoading, error,
    addStock, removeStock, setAmount, setRange, setCustomPeriod, runBacktest,
  } = useBacktest();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [customAmountInput, setCustomAmountInput] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sharePreview, setSharePreview] = useState<{ dataUrl: string; text: string; imageCopied: boolean } | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const results = await searchStocks(q);
      setSearchResults(results.slice(0, 8));
      setShowDropdown(results.length > 0);
    }, 300);
  }, []);

  const handleSelectStock = useCallback((sr: StockSearchResult) => {
    addStock({ symbol: sr.symbol, name: sr.name });
    setQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  }, [addStock]);

  const stockNameMap: Record<string, string> = {};
  stocks.forEach((s) => { stockNameMap[s.symbol] = s.name; });

  const isProfit = result ? result.totalReturnPct >= 0 : false;
  const vsKospi = result ? result.totalReturnPct - result.kospiReturnPct : 0;

  const handleShare = useCallback(async () => {
    if (!result || sharingLoading) return;
    setSharingLoading(true);
    try {
      const blob = await generateBacktestShareImage({ result, stockNames: stockNameMap, amount });
      if (!blob) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      let imageCopied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        imageCopied = true;
      } catch { /* not supported */ }
      const text = generateBacktestShareText(result, stockNameMap, amount);
      setSharePreview({ dataUrl, text, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }, [result, stockNameMap, amount, sharingLoading]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-mono"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            홈
          </Link>
          <div className="text-center">
            <h1 className="text-base font-black">만약 그때 샀다면?</h1>
            <p className="text-[10px] text-gray-500 font-mono">포트폴리오 시뮬레이터</p>
          </div>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {/* 종목 검색 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-xs font-bold text-gray-300">종목 선택</p>
            <span className="text-[10px] text-gray-600 font-mono ml-auto">최대 3개</span>
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  e.preventDefault();
                  handleSelectStock(searchResults[0]);
                }
              }}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="종목명 또는 코드 검색..."
              disabled={stocks.length >= 3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 transition-colors"
            />
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden z-40 max-h-64 overflow-y-auto">
                {searchResults.map((sr) => (
                  <button
                    key={sr.symbol}
                    onMouseDown={() => handleSelectStock(sr)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-sm font-bold text-white">{sr.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{sr.symbol}</span>
                    <span className="text-[10px] text-gray-600 font-mono ml-auto">{sr.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {stocks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {stocks.map((s, i) => (
                <div
                  key={s.symbol}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono"
                  style={{
                    borderColor: STOCK_COLORS[i] + "40",
                    backgroundColor: STOCK_COLORS[i] + "15",
                    color: STOCK_COLORS[i],
                  }}
                >
                  {s.name}
                  <button
                    onClick={() => removeStock(s.symbol)}
                    className="ml-1 text-gray-500 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 투자 금액 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-xs font-bold text-gray-300">종목당 투자금</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setAmount(p.value); setCustomAmountInput(""); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  amount === p.value && !customAmountInput
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              inputMode="numeric"
              value={customAmountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setCustomAmountInput(raw);
                const num = parseInt(raw, 10);
                if (num > 0) setAmount(num);
              }}
              placeholder="직접 입력 (원)"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {customAmountInput && (
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {formatKrw(parseInt(customAmountInput, 10) || 0)}원
              </span>
            )}
          </div>
        </div>

        {/* 기간 선택 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-xs font-bold text-gray-300">투자 기간</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  range === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setRange("custom")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                range === "custom"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              직접 설정
            </button>
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="date"
                value={customPeriod.from}
                onChange={(e) => setCustomPeriod({ ...customPeriod, from: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark] transition-colors"
              />
              <span className="text-xs text-gray-500">~</span>
              <input
                type="date"
                value={customPeriod.to}
                onChange={(e) => setCustomPeriod({ ...customPeriod, to: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark] transition-colors"
              />
            </div>
          )}
        </div>

        {/* 실행 버튼 */}
        <button
          onClick={runBacktest}
          disabled={stocks.length === 0 || isLoading}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              시뮬레이션 중...
            </span>
          ) : "백테스트 실행"}
        </button>

        {error && (
          <p className="text-xs text-red-400 font-mono text-center">{error}</p>
        )}

        {/* 로딩 스켈레톤 */}
        {isLoading && !result && <LoadingSkeleton />}

        {/* 결과 */}
        <AnimatePresence>
          {result && result.dailyValues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <StaggerContainer className="flex flex-col gap-4" staggerDelay={0.08}>
                {/* 최종 금액 */}
                <div
                  className={`text-center py-5 px-4 rounded-2xl border ${
                    isProfit
                      ? "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
                      : "bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20"
                  }`}
                >
                  <p className="text-[10px] text-gray-500 font-mono mb-1">최종 자산</p>
                  <div className="flex items-center justify-center gap-2">
                    <AnimatedNumber
                      value={result.finalAmount}
                      format={formatKrw}
                      className="text-3xl font-black text-white font-mono"
                    />
                    <span className="text-sm text-gray-400">원</span>
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isProfit
                          ? "bg-red-500/20 text-red-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {result.totalReturnPct >= 0 ? "+" : ""}{result.totalReturnPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-2">
                    종목당 {formatKrw(amount)}원 · 총 {formatKrw(amount * stocks.length)}원 투자
                  </p>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="총 수익률"
                    value=""
                    numericValue={result.totalReturnPct}
                    color={result.totalReturnPct >= 0 ? "text-red-400" : "text-blue-400"}
                    accentFrom={result.totalReturnPct >= 0 ? "from-red-500/5" : "from-blue-500/5"}
                  />
                  <StatCard
                    label="최대 낙폭 (MDD)"
                    value={`-${result.maxDrawdownPct.toFixed(1)}%`}
                    accentFrom="from-blue-500/5"
                  />
                  <StatCard
                    label="연환산 수익률 (CAGR)"
                    value=""
                    numericValue={result.cagrPct}
                    color={result.cagrPct >= 0 ? "text-red-400" : "text-blue-400"}
                    accentFrom={result.cagrPct >= 0 ? "from-red-500/5" : "from-blue-500/5"}
                  />
                  <StatCard
                    label="vs KOSPI"
                    value={`${vsKospi >= 0 ? "+" : ""}${vsKospi.toFixed(1)}%p`}
                    color={vsKospi >= 0 ? "text-green-400" : "text-orange-400"}
                    accentFrom={vsKospi >= 0 ? "from-green-500/5" : "from-orange-500/5"}
                  />
                </div>

                {/* 차트 */}
                <BacktestChart result={result} stockNames={stockNameMap} />

                {/* 종목별 수익률 */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                  <p className="text-[10px] text-gray-500 font-mono mb-3">종목별 수익률</p>
                  <div className="flex flex-col gap-2.5">
                    {stocks.map((s, i) => {
                      const ret = result.stockReturns[s.symbol] ?? 0;
                      const maxAbs = Math.max(
                        ...stocks.map((st) => Math.abs(result.stockReturns[st.symbol] ?? 0)),
                        Math.abs(result.kospiReturnPct),
                        1,
                      );
                      const barWidth = Math.min(Math.abs(ret) / maxAbs * 100, 100);
                      return (
                        <div key={s.symbol} className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: STOCK_COLORS[i] }}
                            />
                            <span className="text-sm font-bold text-white flex-1">{s.name}</span>
                            <span className={`text-sm font-black font-mono ${ret >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                            </span>
                          </div>
                          <div className="ml-6 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ret >= 0 ? "bg-red-500/60" : "bg-blue-500/60"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-0.5 bg-gray-500 rounded shrink-0" />
                          <span className="text-sm text-gray-400 flex-1 font-mono">KOSPI</span>
                          <span className={`text-sm font-mono ${result.kospiReturnPct >= 0 ? "text-red-400" : "text-blue-400"}`}>
                            {result.kospiReturnPct >= 0 ? "+" : ""}{result.kospiReturnPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="ml-6 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              result.kospiReturnPct >= 0 ? "bg-red-500/40" : "bg-blue-500/40"
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.abs(result.kospiReturnPct) /
                                  Math.max(
                                    ...stocks.map((st) => Math.abs(result.stockReturns[st.symbol] ?? 0)),
                                    Math.abs(result.kospiReturnPct),
                                    1,
                                  ) * 100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 공유 버튼 */}
                <button
                  onClick={handleShare}
                  disabled={sharingLoading}
                  className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:border-indigo-500/50 hover:text-white transition-colors disabled:opacity-50"
                >
                  {sharingLoading ? "이미지 생성 중..." : "📤 백테스트 결과 공유하기"}
                </button>

                {/* 면책 */}
                <div className="border-t border-white/[0.06] pt-3 flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                    과거 데이터 기반 시뮬레이션이며 미래 수익을 보장하지 않습니다.
                    수수료, 세금, 슬리피지 미반영.
                  </p>
                </div>

                <AdSlot />
              </StaggerContainer>
            </motion.div>
          )}
        </AnimatePresence>

        <CrossNavigation currentPath="/backtest" />
      </div>

      {/* 푸터 */}
      <div className="py-4 text-center text-xs text-gray-600 font-mono">
        © 2026 오비젼
      </div>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl="https://bitgak.co.kr/backtest"
        imageFileName="ovision-backtest.png"
      />
    </main>
  );
}
