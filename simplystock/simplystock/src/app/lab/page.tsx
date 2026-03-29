"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchStocks, fetchStockChart, fetchInvestorTrend } from "@/lib/api";
import type { Candle, InvestorTrendDaily, StockSearchResult } from "@/types";
import { StockChartV2 } from "@/components/StockChartV2";

const PASSWORD = "simplylab2026";
const SESSION_KEY = "lab_auth";

export default function LabPage() {
  const [authed, setAuthed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    }
    return false;
  });
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  // 검색
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 차트 데이터
  const [selectedName, setSelectedName] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [investorDaily, setInvestorDaily] = useState<InvestorTrendDaily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
      const obs = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    }
  }, []);

  // 비밀번호 체크
  const handleAuth = () => {
    if (pw === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  // 검색
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchStocks(q);
        setResults(res);
        setShowDropdown(res.length > 0);
      } catch {
        setResults([]);
      }
    }, 300);
  }, []);

  // 종목 선택
  const handleSelect = useCallback(async (stock: StockSearchResult) => {
    setQuery(stock.name);
    setShowDropdown(false);
    setSelectedName(stock.name);
    setSelectedSymbol(stock.symbol);
    setLoading(true);
    setError("");

    try {
      const [chartRes, trendRes] = await Promise.allSettled([
        fetchStockChart(stock.symbol, "10y").catch(() => fetchStockChart(stock.symbol, "5y")),
        fetchInvestorTrend(stock.symbol, "5y"),
      ]);

      if (chartRes.status === "fulfilled") {
        setCandles(chartRes.value.candles);
      } else {
        setError("차트 데이터를 불러올 수 없습니다.");
      }

      if (trendRes.status === "fulfilled") {
        setInvestorDaily(trendRes.value.daily);
      } else {
        setInvestorDaily([]);
      }
    } catch {
      setError("데이터 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 비밀번호 게이트
  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
          <h1 className="text-center text-lg font-bold text-[var(--text-primary)]">Lab Access</h1>
          <p className="text-center text-sm text-[var(--text-muted)]">비공개 테스트 페이지입니다.</p>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
            placeholder="비밀번호 입력"
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500 placeholder:text-[var(--text-faint)]"
            autoFocus
          />
          {pwError && (
            <p className="text-center text-xs text-red-400">비밀번호가 올바르지 않습니다.</p>
          )}
          <button
            type="button"
            onClick={handleAuth}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-8">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <h1 className="shrink-0 text-sm font-bold text-[var(--text-primary)]">Lab V2</h1>
          {/* 검색 */}
          <div className="relative flex-1" ref={dropdownRef}>
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="종목명 또는 티커 검색"
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500 placeholder:text-[var(--text-faint)]"
            />
            {showDropdown && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-xl">
                {results.map(s => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-overlay)] transition-colors"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
                    <span className="text-xs text-[var(--text-faint)]">{s.symbol}</span>
                    <span className="ml-auto text-[10px] text-[var(--text-faint)]">{s.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-3xl px-0 sm:px-4 pt-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="mx-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && candles.length > 0 && (
          <>
            <div className="mb-2 px-2 sm:px-0">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {selectedName}
                <span className="ml-2 text-xs font-normal text-[var(--text-faint)]">{selectedSymbol}</span>
              </h2>
            </div>
            <StockChartV2
              candles={candles}
              investorDaily={investorDaily}
              stockName={selectedName}
              stockSymbol={selectedSymbol}
              isDark={isDark}
            />
          </>
        )}

        {!loading && candles.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-4xl text-[var(--text-faint)]">
              <svg className="mx-auto h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">종목을 검색하여 V2 차트를 확인하세요.</p>
            <p className="mt-1 text-xs text-[var(--text-faint)]">고정 윈도우 회귀 채널 + 정규화 수급 마커 + 합산 수급 바</p>
          </div>
        )}
      </div>
    </div>
  );
}
