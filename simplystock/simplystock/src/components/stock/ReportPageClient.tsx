"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, ArrowLeft, Search, RefreshCw } from "lucide-react";
import { fetchStockReport, searchStocks } from "@/lib/api";
import type { StockReportData } from "@/types/stockReport";
import StockReport from "@/components/stock/StockReport";
import StockReportLoading from "@/components/stock/StockReportLoading";

export default function ReportPageClient({ symbol }: { symbol: string }) {

  const [report, setReport] = useState<StockReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { symbol: string; name: string; exchange: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const loadReport = useCallback(async (sym: string) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await fetchStockReport(sym);
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "리포트 생성 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbol) loadReport(symbol);
  }, [symbol, loadReport]);

  // 검색
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results.slice(0, 6));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (sym: string) => {
    setSearchQuery("");
    setSearchResults([]);
    window.history.pushState(null, "", `/report/${sym.replace(/\.\w+$/, "")}/`);
    loadReport(sym);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-base font-semibold tracking-tight">
              SimplyStock
            </span>
          </Link>
          <span className="text-xs text-[var(--text-faint)]">AI 리포트</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* 검색바 */}
        <div className="relative mb-6">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2.5">
            <Search className="h-4 w-4 text-[var(--text-faint)] shrink-0" />
            <input
              type="text"
              placeholder="종목명 또는 종목코드 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
            />
            {searching && (
              <RefreshCw className="h-4 w-4 text-[var(--text-faint)] animate-spin" />
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] shadow-lg overflow-hidden">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => handleSelect(r.symbol)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-[var(--bg-card)] transition-colors text-left"
                >
                  <div>
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-[var(--text-faint)]">
                      {r.symbol.replace(/\.\w+$/, "")}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-faint)]">
                    {r.exchange}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 리포트 본문 */}
        {loading && <StockReportLoading />}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <p className="text-sm text-rose-400 mb-3">{error}</p>
            <button
              onClick={() => loadReport(symbol)}
              className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/30 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}
        {report && <StockReport data={report} />}

        {/* 면책 */}
        <footer className="mt-8 border-t border-[var(--border-secondary)] pt-4">
          <p className="text-[10px] leading-relaxed text-[var(--text-faint)]">
            본 리포트는 AI가 공개 데이터를 기반으로 생성한 투자 참고자료이며, 특정
            종목의 매수·매도를 권유하지 않습니다. 모든 투자 판단과 책임은 이용자
            본인에게 있습니다. 데이터 출처: Yahoo Finance, DART 전자공시, 네이버
            금융.
          </p>
        </footer>
      </main>
    </div>
  );
}
