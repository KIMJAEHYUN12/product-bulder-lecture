"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, ArrowLeft, TrendingUp, Info, AlertTriangle, Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PerBandChart } from "@/components/PerBandChart";
import { ShareModal } from "@/components/ShareModal";
import { searchStocks, fetchPerBand } from "@/lib/api";
import { generateValuationShareImage } from "@/lib/valuationShareImage";
import type { StockSearchResult, PerBandData } from "@/types";

const SECTOR_PER_REF: Record<string, { label: string; min: number; max: number }> = {
  "Technology": { label: "IT/테크", min: 15, max: 30 },
  "Financial Services": { label: "금융", min: 5, max: 12 },
  "Healthcare": { label: "헬스케어", min: 20, max: 50 },
  "Industrials": { label: "산업재", min: 8, max: 15 },
  "Consumer Cyclical": { label: "경기소비재", min: 10, max: 20 },
  "Consumer Defensive": { label: "필수소비재", min: 15, max: 25 },
  "Energy": { label: "에너지", min: 5, max: 15 },
  "Basic Materials": { label: "소재", min: 8, max: 15 },
  "Communication Services": { label: "커뮤니케이션", min: 15, max: 25 },
  "Real Estate": { label: "부동산", min: 15, max: 30 },
  "Utilities": { label: "유틸리티", min: 10, max: 20 },
};

export default function ValuationPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const [data, setData] = useState<PerBandData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<"forward" | "trailing" | "pbr">("forward");

  // 공유 게이트
  const [showShareGate, setShowShareGate] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState("");
  const pendingSymbolRef = useRef("");
  const firstDataRef = useRef<PerBandData | null>(null);
  const firstNameRef = useRef("");
  const firstSymbolRef = useRef("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const enterDuringComposeRef = useRef(false);

  const hasPass = useCallback(() => {
    try {
      const until = localStorage.getItem("valuation_pass_until");
      if (!until) return false;
      return new Date(until).getTime() > Date.now();
    } catch { return false; }
  }, []);

  const grantPass = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    localStorage.setItem("valuation_pass_until", midnight.toISOString());
  }, []);

  // 테마 동기화
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // 검색 디바운스
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchStocks(query);
        setResults(res);
        setShowDropdown(res.length > 0);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  // ?ticker= 쿼리 파라미터로 자동 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");
    if (!ticker) return;

    // 종목 검색 후 자동 선택
    searchStocks(ticker).then((res) => {
      if (res.length > 0) {
        handleSelect(res[0]);
      } else {
        // 심볼 직접 사용
        setSelectedSymbol(ticker);
        setSelectedName(ticker);
        setQuery(ticker);
        loadPerBand(ticker, ticker);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPerBand = useCallback(async (symbol: string, name?: string) => {
    const used = localStorage.getItem("valuation_used") === "1";
    if (used && !hasPass()) {
      pendingSymbolRef.current = symbol;
      setShowShareGate(true);
      return;
    }

    setShowShareGate(false);
    setShareGateDone(false);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await fetchPerBand(symbol);
      setData(result);
      if (!used) {
        localStorage.setItem("valuation_used", "1");
        firstDataRef.current = result;
        firstNameRef.current = name || result.name || symbol;
        firstSymbolRef.current = symbol;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PER 밴드 데이터를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, [hasPass]);

  const handleSelect = useCallback(
    (stock: StockSearchResult) => {
      setSelectedSymbol(stock.symbol);
      setSelectedName(stock.name);
      setQuery(stock.name);
      setShowDropdown(false);
      loadPerBand(stock.symbol, stock.name);

      // URL 업데이트 (히스토리 교체)
      const code = stock.symbol.replace(/\.\w+$/, "");
      window.history.replaceState(null, "", `/valuation/?ticker=${code}`);
    },
    [loadPerBand],
  );

  /** 숫자 포맷 */
  const fmtNum = (n: number, decimals = 1) =>
    n.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const fmtPrice = (n: number, currency: string) => {
    if (currency === "KRW") return n.toLocaleString("ko-KR") + "원";
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /** PER 위치에 따른 색상 */
  const positionColor = (pos: number) => {
    if (pos <= 25) return "text-emerald-400";
    if (pos <= 50) return "text-sky-400";
    if (pos <= 75) return "text-amber-400";
    return "text-red-400";
  };

  const handleShareGateClick = useCallback(() => {
    const d = firstDataRef.current ?? data;
    const name = firstNameRef.current || selectedName;
    const sym = firstSymbolRef.current || selectedSymbol;
    if (d) {
      const img = generateValuationShareImage(d, name, sym);
      setShareImageUrl(img);
    }
    setShowShareModal(true);
  }, [data, selectedName, selectedSymbol]);

  const [shareGateDone, setShareGateDone] = useState(false);

  const handleShareComplete = useCallback(() => {
    grantPass();
    setShowShareModal(false);
    setShareGateDone(true);
  }, [grantPass]);

  const positionLabel = (pos: number) => {
    if (pos <= 20) return "저평가 구간";
    if (pos <= 40) return "다소 저평가";
    if (pos <= 60) return "적정 수준";
    if (pos <= 80) return "다소 고평가";
    return "고평가 구간";
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">홈</span>
            </a>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold tracking-tight">밸류에이션</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {/* 검색바 */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                const val = (e.target as HTMLInputElement).value;
                setQuery(val);
                if (enterDuringComposeRef.current) {
                  enterDuringComposeRef.current = false;
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  searchStocks(val).then((res) => {
                    setResults(res);
                    setShowDropdown(res.length > 0);
                    if (res.length > 0) handleSelect(res[0]);
                  });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (composingRef.current) {
                    enterDuringComposeRef.current = true;
                    return;
                  }
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  const q = query.trim();
                  if (q) {
                    searchStocks(q).then((res) => {
                      setResults(res);
                      setShowDropdown(res.length > 0);
                      if (res.length > 0) handleSelect(res[0]);
                    });
                  }
                }
              }}
              placeholder="종목명 또는 심볼 검색"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          {showDropdown && (
            <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-lg">
              {results.map((stock) => (
                <li key={stock.symbol}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-overlay)]"
                    onClick={() => handleSelect(stock)}
                  >
                    <span className="font-medium">{stock.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {stock.symbol} · {stock.exchange}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 설명 카드 */}
        {!selectedSymbol && !loading && (
          <div className="mt-6 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              <div>
                <h2 className="text-sm font-semibold">PER 밴드란?</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
                  과거 실적(EPS) 대비 주가가 비싼지 싼지를 보여주는 도구입니다.
                  주가가 밴드 하단에 가까울수록 역사적으로 저평가, 상단에 가까울수록 고평가 구간입니다.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  DART 공시 데이터 기반으로 최대 10년간의 PER 밴드를 분석합니다.
                  위 검색바에서 종목을 검색해보세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 종목명 */}
        {selectedSymbol && (
          <div className="mt-3">
            <span className="text-sm font-medium text-[var(--text-secondary)]">{selectedName}</span>
            <span className="ml-1.5 text-xs text-[var(--text-muted)]">{selectedSymbol}</span>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">PER 밴드 분석 중...</span>
            <span className="text-[10px] text-[var(--text-faint)]">DART 공시 데이터 수집에 최대 10초 소요될 수 있습니다</span>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* 공유 게이트 */}
        {showShareGate && !loading && (
          <div className="mt-8 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 text-center">
            <Share2 className="mx-auto h-8 w-8 text-indigo-400" />
            {shareGateDone ? (
              <>
                <h3 className="mt-3 text-sm font-semibold">공유해주셔서 감사합니다</h3>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  오늘 하루 무제한 이용 가능합니다. 위 검색바에서 종목을 검색해주세요.
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-sm font-semibold">더 많은 종목을 분석하려면 공유해주세요</h3>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  공유하면 오늘 하루 무제한 이용 가능합니다
                </p>
                <button
                  type="button"
                  onClick={handleShareGateClick}
                  className="mt-4 rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  분석 결과 공유하기
                </button>
              </>
            )}
          </div>
        )}

        {/* 결과 */}
        {!loading && !error && data && !showShareGate && (
          <div className="mt-4 space-y-4">
            {/* 탭 전환 */}
            <div className="flex gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("forward")}
                className={`flex-1 rounded-md px-2 py-2 transition-colors ${
                  activeTab === "forward"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <span className="block text-xs font-medium">Forward PER</span>
                <span className="block text-[9px] opacity-60">미래실적 기준</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trailing")}
                className={`flex-1 rounded-md px-2 py-2 transition-colors ${
                  activeTab === "trailing"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <span className="block text-xs font-medium">Trailing PER</span>
                <span className="block text-[9px] opacity-60">과거실적 기준</span>
              </button>
              {data.pbrBandChart && data.pbrBandChart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("pbr")}
                  className={`flex-1 rounded-md px-2 py-2 transition-colors ${
                    activeTab === "pbr"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <span className="block text-xs font-medium">PBR</span>
                  <span className="block text-[9px] opacity-60">자산가치 기준</span>
                </button>
              )}
            </div>

            {/* ── Forward PER 탭 ── */}
            {activeTab === "forward" && (() => {
              const hasFwd = data.forwardBandChart && data.forwardBandChart.length > 0 && data.forwardPerBands;
              if (!hasFwd) {
                // forwardPer가 있으면 Trailing vs Forward 비교 뷰 표시
                if (data.forwardPer != null && data.currentPer != null && data.forwardPer > 0) {
                  const diffPct = Math.round(((data.forwardPer - data.currentPer) / data.currentPer) * 1000) / 10;
                  const absDiff = Math.abs(diffPct);
                  const prefix = absDiff >= 30 ? "대폭 " : "";
                  const comment = diffPct > 5
                    ? `${prefix}시장이 실적 둔화를 반영 중`
                    : diffPct < -5
                    ? `${prefix}실적 개선 기대 선반영`
                    : "현 수준 유지 전망";
                  const maxBar = Math.max(data.currentPer, data.forwardPer);
                  return (
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
                      <p className="text-xs font-medium text-[var(--text-muted)] text-center mb-4">
                        Forward PER 밴드 데이터 부족
                      </p>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--text-muted)]">Trailing</span>
                            <span className="font-medium tabular-nums">{fmtNum(data.currentPer)}배</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-sky-500/60"
                              style={{ width: `${Math.min((data.currentPer / maxBar) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--text-muted)]">Forward</span>
                            <span className="font-medium tabular-nums">{fmtNum(data.forwardPer)}배</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500/60"
                              style={{ width: `${Math.min((data.forwardPer / maxBar) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <span className={`text-xs font-medium ${diffPct > 5 ? "text-red-400" : diffPct < -5 ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                          차이 {diffPct > 0 ? "+" : ""}{fmtNum(diffPct)}%
                        </span>
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{comment}</p>
                      </div>
                      <p className="mt-3 text-center text-[10px] text-[var(--text-faint)]">
                        밴드 차트는 Trailing 탭에서 확인
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 text-center">
                    <Info className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      추정 실적 데이터가 부족하여 Forward PER 밴드를 표시할 수 없습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("trailing")}
                      className="mt-2 text-xs text-indigo-400 hover:underline"
                    >
                      Trailing PER 보기
                    </button>
                  </div>
                );
              }
              const fwdBands = data.forwardPerBands!;
              return (
                <>
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-2 sm:p-3">
                    <h3 className="mb-2 px-1 text-xs font-medium text-[var(--text-muted)]">
                      Forward PER 밴드 차트{data.forwardEpsYear ? ` (FY${data.forwardEpsYear} 기준)` : ""}
                    </h3>
                    <PerBandChart data={data} isDark={isDark} mode="forward" bandChart={data.forwardBandChart} />
                    {data.dataSources && data.dataSources.forwardEps && (
                      <p className="mt-1 px-1 text-[9px] text-[var(--text-faint)]">
                        주가: {data.dataSources.price} | 추정EPS: {data.dataSources.forwardEps}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">현재 Forward PER</div>
                      <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                        {data.currentForwardPer != null ? fmtNum(data.currentForwardPer) + "x" : "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">평균 Forward PER</div>
                      <div className="mt-1 text-lg font-bold text-[var(--text-muted)]">
                        {data.avgForwardPer != null ? fmtNum(data.avgForwardPer) + "x" : "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">과거 대비 위치</div>
                      <div className={`mt-1 text-lg font-bold ${positionColor(data.forwardPerPosition ?? 50)}`}>
                        {data.forwardPerPosition ?? "-"}%
                      </div>
                      <div className={`text-[10px] ${positionColor(data.forwardPerPosition ?? 50)}`}>
                        {positionLabel(data.forwardPerPosition ?? 50)}
                      </div>
                    </div>
                  </div>

                  {/* Forward PER 밴드 구간 수치 */}
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
                    <h3 className="mb-2 text-xs font-medium text-[var(--text-muted)]">Forward PER 밴드 구간</h3>
                    <div className="space-y-1">
                      {(["max", "p75", "median", "p25", "min"] as const).map((k) => {
                        const colors: Record<string, string> = {
                          max: "text-red-400", p75: "text-amber-400",
                          median: "text-[var(--text-muted)]", p25: "text-sky-400", min: "text-emerald-400",
                        };
                        const labels: Record<string, string> = {
                          max: "상단 (95%)", p75: "75%", median: "중앙값", p25: "25%", min: "하단 (5%)",
                        };
                        return (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className={colors[k]}>{labels[k]}</span>
                            <span className={`font-medium tabular-nums ${colors[k]}`}>
                              {fmtNum(fwdBands[k])}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                    <p className="text-[10px] text-indigo-300 leading-relaxed">
                      Forward PER: 각 시점의 주가를 1년 후 실현 EPS로 나눠 계산합니다.
                      {data.forwardEpsYear
                        ? ` 최근 구간은 FY${data.forwardEpsYear} 컨센서스 추정 EPS를 사용합니다.`
                        : " 최근 구간은 컨센서스 추정 EPS를 사용합니다."}
                    </p>
                  </div>
                </>
              );
            })()}

            {/* ── Trailing PER 탭 ── */}
            {activeTab === "trailing" && (
              <>
                <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-2 sm:p-3">
                  <h3 className="mb-2 px-1 text-xs font-medium text-[var(--text-muted)]">Trailing PER 밴드 차트</h3>
                  <PerBandChart data={data} isDark={isDark} />
                  {data.dataSources && (
                    <p className="mt-1 px-1 text-[9px] text-[var(--text-faint)]">
                      주가: {data.dataSources.price} | 실적: {data.dataSources.earnings}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                    <div className="text-[10px] text-[var(--text-faint)]">현재 PER</div>
                    <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                      {data.currentPer != null ? fmtNum(data.currentPer) + "x" : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                    <div className="text-[10px] text-[var(--text-faint)]">평균 PER</div>
                    <div className="mt-1 text-lg font-bold text-[var(--text-muted)]">
                      {fmtNum(data.avgPer)}x
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                    <div className="text-[10px] text-[var(--text-faint)]">과거 대비 위치</div>
                    <div className={`mt-1 text-lg font-bold ${positionColor(data.perPosition)}`}>
                      {data.perPosition}%
                    </div>
                    <div className={`text-[10px] ${positionColor(data.perPosition)}`}>
                      {positionLabel(data.perPosition)}
                    </div>
                  </div>
                </div>

                {/* 업종 PER 참고 */}
                {data.sector && SECTOR_PER_REF[data.sector] && (
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-[var(--text-muted)]">업종 참고 PER</span>
                        <span className="ml-1.5 font-medium">{SECTOR_PER_REF[data.sector].label}</span>
                        <span className="ml-1.5 text-[var(--text-faint)]">
                          {SECTOR_PER_REF[data.sector].min}~{SECTOR_PER_REF[data.sector].max}배
                        </span>
                      </div>
                      {data.currentPer != null && (
                        <span className={`text-xs font-medium ${
                          data.currentPer < SECTOR_PER_REF[data.sector].min ? "text-emerald-400"
                          : data.currentPer > SECTOR_PER_REF[data.sector].max ? "text-red-400"
                          : "text-sky-400"
                        }`}>
                          {data.currentPer < SECTOR_PER_REF[data.sector].min ? "업종 평균 이하"
                          : data.currentPer > SECTOR_PER_REF[data.sector].max ? "업종 평균 이상"
                          : "업종 평균 범위"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* PER 밴드 수치 */}
                <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
                  <h3 className="mb-2 text-xs font-medium text-[var(--text-muted)]">PER 밴드 구간</h3>
                  <div className="space-y-1">
                    {(["max", "p75", "median", "p25", "min"] as const).map((k) => {
                      const colors: Record<string, string> = {
                        max: "text-red-400", p75: "text-amber-400",
                        median: "text-[var(--text-muted)]", p25: "text-sky-400", min: "text-emerald-400",
                      };
                      const labels: Record<string, string> = {
                        max: "상단 (95%)", p75: "75%", median: "중앙값", p25: "25%", min: "하단 (5%)",
                      };
                      return (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className={colors[k]}>{labels[k]}</span>
                          <span className={`font-medium tabular-nums ${colors[k]}`}>
                            {fmtNum(data.perBands[k])}x
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── PBR 탭 ── */}
            {activeTab === "pbr" && data.pbrBandChart && data.pbrBandChart.length > 0 && data.pbrBands && (() => {
              const pbrBands = data.pbrBands!;
              return (
                <>
                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-2 sm:p-3">
                    <h3 className="mb-2 px-1 text-xs font-medium text-[var(--text-muted)]">PBR 밴드 차트</h3>
                    <PerBandChart data={data} isDark={isDark} mode="pbr" bandChart={data.pbrBandChart} />
                    {data.dataSources && (
                      <p className="mt-1 px-1 text-[9px] text-[var(--text-faint)]">
                        주가: {data.dataSources.price} | 자본: {data.dataSources.earnings}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">현재 PBR</div>
                      <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                        {data.currentPbr != null ? fmtNum(data.currentPbr) + "x" : "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">평균 PBR</div>
                      <div className="mt-1 text-lg font-bold text-[var(--text-muted)]">
                        {data.avgPbr != null ? fmtNum(data.avgPbr) + "x" : "-"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 text-center">
                      <div className="text-[10px] text-[var(--text-faint)]">과거 대비 위치</div>
                      <div className={`mt-1 text-lg font-bold ${positionColor(data.pbrPosition ?? 50)}`}>
                        {data.pbrPosition ?? "-"}%
                      </div>
                      <div className={`text-[10px] ${positionColor(data.pbrPosition ?? 50)}`}>
                        {positionLabel(data.pbrPosition ?? 50)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
                    <h3 className="mb-2 text-xs font-medium text-[var(--text-muted)]">PBR 밴드 구간</h3>
                    <div className="space-y-1">
                      {(["max", "p75", "median", "p25", "min"] as const).map((k) => {
                        const colors: Record<string, string> = {
                          max: "text-red-400", p75: "text-amber-400",
                          median: "text-[var(--text-muted)]", p25: "text-sky-400", min: "text-emerald-400",
                        };
                        const labels: Record<string, string> = {
                          max: "상단 (95%)", p75: "75%", median: "중앙값", p25: "25%", min: "하단 (5%)",
                        };
                        return (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className={colors[k]}>{labels[k]}</span>
                            <span className={`font-medium tabular-nums ${colors[k]}`}>
                              {fmtNum(pbrBands[k])}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* 적자 연도 제외 안내 */}
            {data.lossYears > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="text-xs text-amber-300">
                  최근 10년 중 {data.lossYears}년 적자 연도가 분석에서 제외되었습니다
                </span>
              </div>
            )}

            {/* 밴드 신뢰도 경고 */}
            {((activeTab === "trailing" && data.bandReliability === "low") ||
              (activeTab === "forward" && data.forwardBandReliability === "low") ||
              (activeTab === "pbr" && data.pbrBandReliability === "low")) && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="text-xs text-amber-300">
                  적자 구간 포함으로 밴드 신뢰도가 낮습니다 (참고용)
                </span>
              </div>
            )}

            {/* EPS 추이 */}
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
              <h3 className="mb-2 text-xs font-medium text-[var(--text-muted)]">연간 EPS 추이</h3>
              <div className="space-y-1">
                {activeTab === "forward" && data.forwardEpsEstimate != null && data.forwardEpsYear != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-400">{data.forwardEpsYear}년(E)</span>
                    <span className="font-medium tabular-nums text-indigo-400">
                      {fmtPrice(data.forwardEpsEstimate, data.currency)}
                    </span>
                  </div>
                )}
                {[...data.epsHistory].reverse().map((e) => (
                  <div key={e.year} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">{e.year}년</span>
                    <span className="font-medium tabular-nums">
                      {fmtPrice(e.eps, data.currency)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-[var(--text-faint)]">출처: Yahoo Finance</p>
            </div>
          </div>
        )}
      </main>

      {/* 공유 모달 */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareComplete}
        imageDataUrl={shareImageUrl || undefined}
        shareText={`${firstNameRef.current || selectedName} 밸류에이션 분석 결과`}
        shareUrl={`https://simplystock.co.kr/valuation/?ticker=${(firstSymbolRef.current || selectedSymbol).replace(/\.\w+$/, "")}`}
        imageFileName="simplystock-valuation.png"
        kakaoTitle={`${firstNameRef.current || selectedName} 밸류에이션`}
        kakaoDescription="PER 밴드 분석으로 저평가/고평가를 확인해보세요"
        kakaoButtonTitle="밸류에이션 보기"
      />

      {/* 면책 고지 */}
      <footer className="border-t border-[var(--border-secondary)] mt-8 py-4 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] leading-relaxed text-[var(--text-faint)]">
            PER 밴드는 DART 공시 재무제표 기반 데이터 시각화이며, 특정 종목의 매수·매도를 권유하지 않습니다.
            과거 실적이 미래 수익을 보장하지 않으며, 모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[var(--text-faint)]">
            <a href="/" className="hover:text-[var(--text-muted)] transition-colors">홈</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/guide/" className="hover:text-[var(--text-muted)] transition-colors">가이드</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/terms/" className="hover:text-[var(--text-muted)] transition-colors">이용약관</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/privacy/" className="hover:text-[var(--text-muted)] transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
