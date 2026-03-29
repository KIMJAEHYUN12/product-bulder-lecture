"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, ArrowLeft, Search, X, Loader2, Play, Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareModal } from "@/components/ShareModal";
import { generateBacktestShareImage } from "@/lib/backtestShareImage";
import { searchStocks } from "@/lib/api";
import { useBacktest } from "@/hooks/useBacktest";
import type { StockSearchResult, InvestMode } from "@/types";
import type { ChartRange } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const INVEST_MODES: { value: InvestMode; label: string; desc: string }[] = [
  { value: "lump", label: "일시투자", desc: "한 번에 투자" },
  { value: "monthly", label: "월적립", desc: "매월 정액 매수" },
  { value: "daily", label: "일적립", desc: "매일 정액 매수" },
];

const AMOUNT_PRESETS: Record<InvestMode, { label: string; value: number }[]> = {
  lump: [
    { label: "100만", value: 1_000_000 },
    { label: "500만", value: 5_000_000 },
    { label: "1,000만", value: 10_000_000 },
    { label: "5,000만", value: 50_000_000 },
    { label: "1억", value: 100_000_000 },
  ],
  monthly: [
    { label: "10만", value: 100_000 },
    { label: "30만", value: 300_000 },
    { label: "50만", value: 500_000 },
    { label: "100만", value: 1_000_000 },
    { label: "300만", value: 3_000_000 },
  ],
  daily: [
    { label: "1만", value: 10_000 },
    { label: "3만", value: 30_000 },
    { label: "5만", value: 50_000 },
    { label: "10만", value: 100_000 },
    { label: "30만", value: 300_000 },
  ],
};

const DEFAULT_AMOUNTS: Record<InvestMode, number> = {
  lump: 10_000_000,
  monthly: 500_000,
  daily: 50_000,
};

const AMOUNT_LABELS: Record<InvestMode, string> = {
  lump: "투자 금액",
  monthly: "월 적립금",
  daily: "일 적립금",
};

const PERIOD_PRESETS: { label: string; value: ChartRange | "custom" }[] = [
  { label: "1개월", value: "1mo" },
  { label: "3개월", value: "3mo" },
  { label: "6개월", value: "6mo" },
  { label: "1년", value: "1y" },
  { label: "2년", value: "2y" },
  { label: "5년", value: "5y" },
  { label: "직접 입력", value: "custom" },
];

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export default function BacktestPage() {
  const bt = useBacktest();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | undefined>();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    searchTimerRef.current = setTimeout(async () => {
      const res = await searchStocks(query);
      setResults(res);
      setShowDropdown(res.length > 0);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleModeChange = (mode: InvestMode) => {
    bt.setInvestMode(mode);
    bt.setAmount(DEFAULT_AMOUNTS[mode]);
    setCustomAmount("");
  };

  const handleShare = async () => {
    if (!bt.result) return;
    const img = await generateBacktestShareImage(bt.result, bt.stocks, bt.amount);
    setShareImage(img);
    setShareOpen(true);
  };

  const handleSelect = (stock: StockSearchResult) => {
    bt.addStock({ symbol: stock.symbol, name: stock.name });
    setQuery("");
    setShowDropdown(false);
  };

  const isDCA = bt.investMode !== "lump";
  const modeLabel = bt.investMode === "monthly" ? "월" : bt.investMode === "daily" ? "일" : "";

  // chart data 가공 — 종목별 라인 + DCA 투자금 라인
  const STOCK_COLORS = ["#f472b6", "#34d399", "#fbbf24"];
  const chartData = bt.result
    ? bt.result.dailyValues.map((d, i) => {
        const row: Record<string, string | number> = {
          date: d.date.slice(5),
          portfolio: Math.round(d.value),
          kospi: Math.round(bt.result!.kospiValues[i]?.value ?? 0),
        };
        for (const s of bt.stocks) {
          const sv = bt.result!.stockValues[s.symbol];
          if (sv && sv[i]) row[s.symbol] = Math.round(sv[i].value);
        }
        if (bt.result!.investMode !== "lump" && bt.result!.investedValues[i]) {
          row.invested = Math.round(bt.result!.investedValues[i].value);
        }
        return row;
      })
    : [];

  const stockBarData = bt.result
    ? bt.stocks.map((s) => ({
        name: s.name,
        return: +(bt.result!.stockReturns[s.symbol] ?? 0).toFixed(2),
      }))
    : [];

  // 공유 텍스트
  const shareText = bt.result
    ? isDCA
      ? `[SimplyStock 백테스트] ${bt.stocks.map((s) => s.name).join("+")} ${modeLabel} ${fmt(bt.amount)}원 적립 → ${fmt(bt.result.finalAmount)}원 (${bt.result.totalReturnPct >= 0 ? "+" : ""}${bt.result.totalReturnPct.toFixed(2)}%)`
      : `[SimplyStock 백테스트] ${bt.stocks.map((s) => s.name).join("+")} 투자금 ${fmt(bt.amount)}원 → ${fmt(bt.result.finalAmount)}원 (${bt.result.totalReturnPct >= 0 ? "+" : ""}${bt.result.totalReturnPct.toFixed(2)}%)`
    : "";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <a href="/" className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-semibold tracking-tight">SimplyStock</span>
          </a>
          <span className="text-sm text-[var(--text-muted)]">백테스트</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* 종목 검색 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">종목 선택 (최대 3개)</h3>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="종목명 또는 심볼 검색"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                disabled={bt.stocks.length >= 3}
              />
            </div>
            {showDropdown && (
              <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-lg">
                {results.map((s) => (
                  <li key={s.symbol}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[var(--bg-overlay)]"
                      onClick={() => handleSelect(s)}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{s.symbol}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {bt.stocks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {bt.stocks.map((s) => (
                <span
                  key={s.symbol}
                  className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"
                >
                  {s.name}
                  <button type="button" onClick={() => bt.removeStock(s.symbol)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 투자 방식 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">투자 방식</h3>
          <div className="grid grid-cols-3 gap-2">
            {INVEST_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => handleModeChange(m.value)}
                className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${
                  bt.investMode === m.value
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                <p className="text-xs font-semibold">{m.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 투자금액 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">{AMOUNT_LABELS[bt.investMode]}</h3>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_PRESETS[bt.investMode].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => { bt.setAmount(p.value); setCustomAmount(""); }}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  bt.amount === p.value && !customAmount
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={customAmount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                setCustomAmount(v);
                if (v) bt.setAmount(Number(v));
              }}
              placeholder="직접 입력 (원)"
              className="w-40 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5 text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {fmt(bt.amount)}원
            </span>
          </div>
        </section>

        {/* 기간 */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">투자 기간</h3>
          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => bt.setRange(p.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  bt.range === p.value
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                    : "border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {bt.range === "custom" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={bt.customPeriod.from}
                onChange={(e) => bt.setCustomPeriod({ ...bt.customPeriod, from: e.target.value })}
                className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5 text-sm outline-none"
              />
              <span className="text-xs text-[var(--text-muted)]">~</span>
              <input
                type="date"
                value={bt.customPeriod.to}
                onChange={(e) => bt.setCustomPeriod({ ...bt.customPeriod, to: e.target.value })}
                className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5 text-sm outline-none"
              />
            </div>
          )}
        </section>

        {/* 실행 버튼 */}
        <button
          type="button"
          disabled={bt.stocks.length === 0 || bt.isLoading}
          onClick={bt.runBacktest}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {bt.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              백테스트 실행
            </>
          )}
        </button>

        {bt.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {bt.error}
          </div>
        )}

        {/* 결과 */}
        {bt.result && (
          <div className="space-y-5">
            {/* 최종 금액 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-5 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">최종 평가 금액</p>
              <p className="text-2xl font-bold">{fmt(bt.result.finalAmount)}원</p>
              <p className={`text-sm font-medium mt-1 ${bt.result.totalReturnPct >= 0 ? "text-red-400" : "text-blue-400"}`}>
                {bt.result.totalReturnPct >= 0 ? "+" : ""}{bt.result.totalReturnPct.toFixed(2)}%
              </p>
              {isDCA && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  총 투자금 {fmt(bt.result.totalInvested)}원
                </p>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                결과 공유
              </button>
            </div>

            {/* 4 지표 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="수익률" value={`${bt.result.totalReturnPct >= 0 ? "+" : ""}${bt.result.totalReturnPct.toFixed(2)}%`} color={bt.result.totalReturnPct >= 0 ? "text-red-400" : "text-blue-400"} />
              <MetricCard label="MDD" value={`-${bt.result.maxDrawdownPct.toFixed(2)}%`} color="text-blue-400" />
              <MetricCard label={isDCA ? "CAGR(근사)" : "CAGR"} value={`${bt.result.cagrPct >= 0 ? "+" : ""}${bt.result.cagrPct.toFixed(2)}%`} color={bt.result.cagrPct >= 0 ? "text-emerald-400" : "text-red-400"} />
              <MetricCard label="vs KOSPI" value={`${(bt.result.totalReturnPct - bt.result.kospiReturnPct) >= 0 ? "+" : ""}${(bt.result.totalReturnPct - bt.result.kospiReturnPct).toFixed(2)}%p`} color={(bt.result.totalReturnPct - bt.result.kospiReturnPct) >= 0 ? "text-emerald-400" : "text-red-400"} />
            </div>

            {/* 라인차트 */}
            {chartData.length > 0 && (
              <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
                <h4 className="mb-3 text-sm font-semibold">포트폴리오 vs KOSPI</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      interval="preserveStartEnd"
                      tickCount={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [`${fmt(v as number)}원`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="portfolio" name="포트폴리오" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="kospi" name="KOSPI" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    {isDCA && (
                      <Line type="stepAfter" dataKey="invested" name="누적 투자금" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    )}
                    {bt.stocks.map((s, idx) => (
                      <Line key={s.symbol} type="monotone" dataKey={s.symbol} name={s.name} stroke={STOCK_COLORS[idx % STOCK_COLORS.length]} strokeWidth={1.5} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 종목별 수익률 바 */}
            {stockBarData.length > 0 && (
              <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
                <h4 className="mb-3 text-sm font-semibold">종목별 수익률</h4>
                <ResponsiveContainer width="100%" height={Math.max(120, stockBarData.length * 50)}>
                  <BarChart data={stockBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [`${v}%`, "수익률"]}
                    />
                    <Bar dataKey="return" radius={[0, 4, 4, 0]}>
                      {stockBarData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.return >= 0 ? "#ef4444" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>

      {bt.result && (
        <ShareModal
          open={shareOpen}
          onClose={() => { setShareOpen(false); setShareImage(undefined); }}
          imageDataUrl={shareImage}
          shareText={shareText}
          shareUrl="https://simplystock.co.kr/backtest"
          imageFileName="simplystock-backtest.png"
          kakaoTitle="백테스트 결과"
          kakaoDescription={`${bt.stocks.map((s) => s.name).join("+")} → ${fmt(bt.result.finalAmount)}원 (${bt.result.totalReturnPct >= 0 ? "+" : ""}${bt.result.totalReturnPct.toFixed(2)}%)`}
          kakaoButtonTitle="나도 백테스트하기"
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
      <p className="text-[10px] text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
