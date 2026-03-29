"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, TrendingUp, Star, X, Menu, LogIn, LogOut, BarChart3, BrainCircuit, History, Gamepad2, Calendar, Crosshair, Activity, BookOpen, Clock, ArrowLeft, LayoutDashboard, Users, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/adminConfig";
import { ShareModal } from "@/components/ShareModal";
import { StockChartV2 } from "@/components/StockChartV2";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NewsTicker } from "@/components/NewsTicker";
import { SignalScanner } from "@/components/home/SignalScanner";
import { HomeDefault } from "@/components/home/HomeDefault";
import { WatchlistSidebar } from "@/components/home/WatchlistSidebar";
import { StockTradeButton } from "@/components/home/StockTradeButton";
import { AnnounceBanner } from "@/components/home/AnnounceBanner";
import { PushNotificationBanner } from "@/components/home/PushNotificationBanner";
import { FloatingContact } from "@/components/home/FloatingContact";
import { FeedbackForm } from "@/components/home/FeedbackForm";
import { AdminPanel } from "@/components/home/AdminPanel";
import {
  fetchStockChart,
  fetchInvestorTrend,
  searchStocks,
  fetchSignals,
  fetchGoldenSignals,
  fetchGoldenHistory,
  fetchBSSignals,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  renameWatchlistItem,
  reorderWatchlist,
  manageWatchlistFolders,
  setWatchlistFolder,
  setWatchlistUserId,
  migrateWatchlist,
  fetchStockPrices,
} from "@/lib/api";
import type { SignalEntry, GoldenSignalEntry, BSSignalEntry, WatchlistItem, WatchlistFolder, GoldenHistoryResponse } from "@/lib/api";
import type { StockPrice } from "@/types";
import { normalizeDateStr } from "@/lib/chartEngine";
import type {
  Candle,
  InvestorTrendDaily,
  StockSearchResult,
} from "@/types";

function FullscreenChart({
  candles, investorDaily, stockName, stockSymbol, isDark, legacyMode, onClose,
}: {
  candles: Candle[];
  investorDaily: InvestorTrendDaily[];
  stockName: string;
  stockSymbol: string;
  isDark: boolean;
  legacyMode?: boolean;
  onClose: () => void;
}) {
  // 모바일만 뷰포트 기반 높이 사용, 데스크톱은 차트 기본 비율 사용
  const [mobileHeight, setMobileHeight] = useState<number | undefined>(undefined);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calc = () => {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        const hh = headerRef.current?.offsetHeight ?? 48;
        setMobileHeight(window.innerHeight - hh);
      } else {
        setMobileHeight(undefined);
      }
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
      <div
        ref={headerRef}
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] shrink-0"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {stockName} <span className="text-[var(--text-muted)] text-xs">{stockSymbol}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <StockChartV2
          candles={candles}
          investorDaily={investorDaily}
          stockName={stockName}
          stockSymbol={stockSymbol}
          isDark={isDark}
          legacyMode={legacyMode}
          height={mobileHeight}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const [candles, setCandles] = useState<Candle[]>([]);
  const [investorDaily, setInvestorDaily] = useState<InvestorTrendDaily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [signals, setSignals] = useState<SignalEntry[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsScannedAt, setSignalsScannedAt] = useState("");

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistFolders, setWatchlistFolders] = useState<WatchlistFolder[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [goldenSignals, setGoldenSignals] = useState<GoldenSignalEntry[]>([]);
  const [goldenSignalsLoading, setGoldenSignalsLoading] = useState(true);
  const [goldenScannedAt, setGoldenScannedAt] = useState("");
  const [goldenHistory, setGoldenHistory] = useState<GoldenHistoryResponse | null>(null);
  const [goldenHistoryLoading, setGoldenHistoryLoading] = useState(true);
  const [bsSignals, setBsSignals] = useState<BSSignalEntry[]>([]);
  const [bsSignalsLoading, setBsSignalsLoading] = useState(true);
  const [bsScannedAt, setBsScannedAt] = useState("");

  const [todayAnalysisCount, setTodayAnalysisCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState<{ today: number; total: number } | null>(null);
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, StockPrice>>({});

  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);
  const [timeMachinePeriod, setTimeMachinePeriod] = useState<string>("MAX");
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);

  const [isDark, setIsDark] = useState(true);
  const [fullscreenChart, setFullscreenChart] = useState(false);
  const [legacyMode, setLegacyMode] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | undefined>();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const screenshotFnRef = useRef<(() => string | undefined) | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitRef = useRef(false);
  const composingRef = useRef(false);
  const enterDuringComposeRef = useRef(false);
  const justSelectedRef = useRef(false);

  // 테마 상태 동기화
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);

  // 타임머신: 과거 시점 + 기간 제한 데이터 필터링
  const TM_PERIOD_DAYS: Record<string, number | null> = {
    "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730, "5Y": 1825, "MAX": null,
  };

  const { tmCandles, tmInvestor } = useMemo(() => {
    let filtered = candles;
    let filteredInv = investorDaily;

    // 끝점: 타임머신 날짜 또는 전체
    if (timeMachineDate) {
      const endTs = new Date(timeMachineDate + "T23:59:59+09:00").getTime() / 1000;
      filtered = filtered.filter((c) => c.time <= endTs);
      filteredInv = filteredInv.filter((d) => normalizeDateStr(d.date) <= timeMachineDate);
    }

    // 시작점: 기간 제한
    const days = TM_PERIOD_DAYS[timeMachinePeriod];
    if (days !== null && filtered.length > 0) {
      const endTs = filtered[filtered.length - 1].time;
      const startTs = endTs - days * 86400;
      filtered = filtered.filter((c) => c.time >= startTs);

      const fmtDate = (ts: number) => {
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const startDate = fmtDate(startTs);
      filteredInv = filteredInv.filter((d) => normalizeDateStr(d.date) >= startDate);
    }

    return { tmCandles: filtered, tmInvestor: filteredInv };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, investorDaily, timeMachineDate, timeMachinePeriod]);

  const tmCandleDateRange = useMemo(() => {
    if (candles.length === 0) return { min: "", max: "" };
    const fmt = (ts: number) => {
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    return { min: fmt(candles[0].time), max: fmt(candles[candles.length - 1].time) };
  }, [candles]);

  const loadChart = useCallback(
    async (symbol: string) => {
      setLoading(true);
      setError(null);
      try {
        const [chartRes, trendRes] = await Promise.allSettled([
          fetchStockChart(symbol, "10y").catch(() => fetchStockChart(symbol, "5y")),
          fetchInvestorTrend(symbol, "5y"),
        ]);
        if (chartRes.status === "fulfilled") {
          setCandles(chartRes.value.candles);
        } else {
          throw chartRes.reason;
        }
        if (trendRes.status === "fulfilled") {
          setInvestorDaily(trendRes.value.daily);
        } else {
          setInvestorDaily([]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "데이터를 불러올 수 없습니다";
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        setError(isAbort ? "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." : msg);
        setCandles([]);
        setInvestorDaily([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchSignals()
      .then((r) => { setSignals(r.signals); setSignalsScannedAt(r.scannedAt); })
      .catch(() => setSignals([]))
      .finally(() => setSignalsLoading(false));
    fetchGoldenSignals()
      .then((r) => { setGoldenSignals(r.results); setGoldenScannedAt(r.scannedAt); })
      .catch(() => setGoldenSignals([]))
      .finally(() => setGoldenSignalsLoading(false));
    fetchGoldenHistory()
      .then(setGoldenHistory)
      .catch(() => setGoldenHistory(null))
      .finally(() => setGoldenHistoryLoading(false));
    fetchBSSignals()
      .then((r) => { setBsSignals(r.results); setBsScannedAt(r.scannedAt); })
      .catch(() => setBsSignals([]))
      .finally(() => setBsSignalsLoading(false));
    fetch("/api/popular-stocks", { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((entries: { count: number }[]) => {
        const total = entries.reduce((s, e) => s + (e.count || 0), 0);
        setTodayAnalysisCount(total);
      })
      .catch(() => {});
    fetch("/api/visitor-count", { signal: AbortSignal.timeout(8000) })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data: { today: number; total: number }) => {
        if (typeof data?.today === "number" && typeof data?.total === "number") {
          setVisitorCount(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setWatchlistUserId(user?.uid ?? null);
    (async () => {
      try {
        if (user) {
          // migrate는 items만 반환 → 이후 list로 folders도 가져옴
          await migrateWatchlist(user.uid).catch(() => {});
        }
        const result = await fetchWatchlist();
        setWatchlist(result.items);
        setWatchlistFolders(result.folders ?? []);
      } catch { /* API 실패 시 기존 목록 유지 */ }
      finally { setWatchlistLoading(false); }
    })();
  }, [user, authLoading]);

  // 관심종목 현재가 갱신 (60초 interval)
  useEffect(() => {
    if (watchlist.length === 0) { setWatchlistPrices({}); return; }
    const symbols = watchlist.map((w) => w.symbol);
    const load = () => fetchStockPrices(symbols).then(setWatchlistPrices).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [watchlist]);

  useEffect(() => {
    didInitRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const ticker = params.get("ticker");
    if (ticker) {
      const name = params.get("name") || ticker.replace(/\.\w+$/, "");
      setSelectedSymbol(ticker);
      setSelectedName(name);
      setQuery(name);
      loadChart(ticker);
      window.history.replaceState({ symbol: ticker, name }, "", `/?ticker=${ticker}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뒤로가기/앞으로가기 시 상태 복원
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (e.state?.symbol) {
        setSelectedSymbol(e.state.symbol);
        setSelectedName(e.state.name);
        setQuery(e.state.name);
        loadChart(e.state.symbol);
      } else {
        setSelectedSymbol("");
        setSelectedName("");
        setCandles([]);
        setInvestorDaily([]);
        setQuery("");
        setError(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadChart]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const res = await searchStocks(query);
      setResults(res);
      setShowDropdown(res.length > 0);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goHome = useCallback(() => {
    setSelectedSymbol("");
    setSelectedName("");
    setCandles([]);
    setInvestorDaily([]);
    setQuery("");
    setError(null);
    window.history.pushState({}, "", "/");
  }, []);

  const handleSelect = (stock: StockSearchResult) => {
    justSelectedRef.current = true;
    setSelectedSymbol(stock.symbol);
    setSelectedName(stock.name);
    setQuery(stock.name);
    setShowDropdown(false);
    loadChart(stock.symbol);
    window.history.pushState(
      { symbol: stock.symbol, name: stock.name },
      "",
      `/?ticker=${stock.symbol}`,
    );
  };

  const isInWatchlist = useCallback(
    (symbol: string) => watchlist.some((w) => w.symbol === symbol),
    [watchlist],
  );

  const handleToggleWatchlist = useCallback(
    async (symbol: string, name: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const removing = isInWatchlist(symbol);

      if (removing) {
        setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
      } else {
        setWatchlist((prev) => [...prev, { symbol, name, addedAt: new Date().toISOString() }]);
      }

      try {
        const updated = removing
          ? await removeFromWatchlist(symbol)
          : await addToWatchlist(symbol, name);
        setWatchlist(updated);
      } catch (err) {
        const e = err as Error & { code?: string; items?: typeof watchlist };
        if (e?.code === "MAX_REACHED") {
          alert(e.message);
          const items = e.items;
          if (items) setWatchlist(items);
        } else {
          // API 실패 시 기존 목록 유지, 서버 동기화만 재시도
          const fresh = await fetchWatchlist().catch(() => null);
          if (fresh) { setWatchlist(fresh.items); setWatchlistFolders(fresh.folders ?? []); }
        }
      }
    },
    [isInWatchlist],
  );

  const handleRenameWatchlist = useCallback(async (symbol: string, customName: string) => {
    setWatchlist((prev) => prev.map((w) =>
      w.symbol === symbol ? { ...w, customName: customName || undefined } : w
    ));
    try {
      const updated = await renameWatchlistItem(symbol, customName);
      setWatchlist(updated);
    } catch {
      const fresh = await fetchWatchlist().catch(() => null);
      if (fresh) { setWatchlist(fresh.items); setWatchlistFolders(fresh.folders ?? []); }
    }
  }, []);

  const handleReorderWatchlist = useCallback(async (symbols: string[]) => {
    // 낙관적 업데이트
    setWatchlist((prev) => {
      const map = Object.fromEntries(prev.map((w) => [w.symbol, w]));
      const reordered = symbols.filter((s) => map[s]).map((s) => map[s]);
      for (const w of prev) {
        if (!symbols.includes(w.symbol)) reordered.push(w);
      }
      return reordered;
    });
    try {
      const updated = await reorderWatchlist(symbols);
      setWatchlist(updated);
    } catch {
      const fresh = await fetchWatchlist().catch(() => null);
      if (fresh) { setWatchlist(fresh.items); setWatchlistFolders(fresh.folders ?? []); }
    }
  }, []);

  const handleManageFolders = useCallback(async (folders: WatchlistFolder[]) => {
    setWatchlistFolders(folders);
    try {
      const result = await manageWatchlistFolders(folders);
      setWatchlistFolders(result.folders);
      setWatchlist(result.items);
    } catch { /* ignore */ }
  }, []);

  const handleSetFolder = useCallback(async (symbol: string, folderId: string | null) => {
    setWatchlist((prev) => prev.map((w) =>
      w.symbol === symbol ? { ...w, folderId: folderId || undefined } : w
    ));
    try {
      const updated = await setWatchlistFolder(symbol, folderId);
      setWatchlist(updated);
    } catch { /* ignore */ }
  }, []);

  const handleQuickAdd = useCallback(async () => {
    const stocks = [
      { symbol: "005930.KS", name: "삼성전자" },
      { symbol: "000660.KS", name: "SK하이닉스" },
      { symbol: "005380.KS", name: "현대차" },
    ];
    for (const s of stocks) {
      if (!watchlist.some((w) => w.symbol === s.symbol)) {
        try {
          const updated = await addToWatchlist(s.symbol, s.name);
          setWatchlist(updated);
        } catch { /* ignore */ }
      }
    }
  }, [watchlist]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TrendingUp className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-semibold tracking-tight">SimplyStock</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {authLoading ? (
              <div className="h-8 w-16 animate-pulse rounded-lg bg-[var(--bg-overlay)]" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="hidden sm:inline text-sm text-[var(--text-secondary)] max-w-[100px] truncate">
                  {user.displayName}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-[var(--text-faint)]">로그인 시 관심종목 동기화</span>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  로그인
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 실시간 뉴스 티커 */}
      <NewsTicker />

      {/* 공지 배너 */}
      <AnnounceBanner />
      <PushNotificationBanner />

      {/* 사이드바 드로어 (네비 + 관심종목) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-semibold">SimplyStock</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 네비게이션 */}
            <nav className="mb-5 space-y-4">
              {/* 분석 도구 */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">분석 도구</div>
                <ul className="space-y-0.5">
                  <li>
                    <a
                      href="/portfolio?ref=sidebar"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <Activity className="h-4 w-4 text-indigo-400" />
                      포트폴리오 건강검진
                      <span className="ml-auto rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                        NEW
                      </span>
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10"
                    >
                      <BarChart3 className="h-4 w-4" />
                      차트 분석
                    </button>
                  </li>
                  <li>
                    <a
                      href={selectedSymbol ? `/valuation/?ticker=${selectedSymbol.replace(/\.\w+$/, "")}` : "/valuation/"}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
                      밸류에이션
                    </a>
                  </li>
                  <li>
                    <a
                      href="/stock/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <Crosshair className="h-4 w-4 text-[var(--text-muted)]" />
                      종목 분석
                    </a>
                  </li>
                  <li>
                    <a
                      href="/capital-market/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[var(--text-muted)]" />
                      자본시장 통계 (테스트 중)
                    </a>
                  </li>
                </ul>
              </div>

              {/* 투자 연습 */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">투자 연습</div>
                <ul className="space-y-0.5">
                  <li>
                    <a
                      href="/mock/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <Gamepad2 className="h-4 w-4 text-[var(--text-muted)]" />
                      모의투자
                    </a>
                  </li>
                  <li>
                    <a
                      href="/backtest/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <History className="h-4 w-4 text-[var(--text-muted)]" />
                      백테스트
                    </a>
                  </li>
                </ul>
              </div>

              {/* 부가 도구 */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">부가 도구</div>
                <ul className="space-y-0.5">
                  <li>
                    <a
                      href="/quiz/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <BrainCircuit className="h-4 w-4 text-[var(--text-muted)]" />
                      투자성향 테스트
                    </a>
                  </li>
                  <li>
                    <a
                      href="/commodities/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                      원자재 시세
                    </a>
                  </li>
                  <li>
                    <a
                      href="/earnings/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                      실적 캘린더
                    </a>
                  </li>
                </ul>
              </div>

              {/* 학습 */}
              <div>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">학습</div>
                <ul className="space-y-0.5">
                  <li>
                    <a
                      href="/guide/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                      가이드
                    </a>
                  </li>
                  <li>
                    <a
                      href="/dictionary/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                      용어사전
                    </a>
                  </li>
                  <li>
                    <a
                      href="/analysis/"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                      분석자료실
                    </a>
                  </li>
                </ul>
              </div>
            </nav>

            {/* 관심종목 (모바일 사이드바) */}
            <WatchlistSidebar
              watchlist={watchlist}
              watchlistLoading={watchlistLoading}
              selectedSymbol={selectedSymbol}
              onSelectStock={(stock) => {
                handleSelect({ ...stock, exchange: stock.exchange || "", type: stock.type || "equity" });
                setSidebarOpen(false);
              }}
              onRemove={handleToggleWatchlist}
              onRename={handleRenameWatchlist}
              onReorder={handleReorderWatchlist}
              variant="mobile"
              prices={watchlistPrices}
              onQuickAdd={handleQuickAdd}
              signals={signals}
              goldenSignals={goldenSignals}
              bsSignals={bsSignals}
              folders={watchlistFolders}
              onManageFolders={handleManageFolders}
              onSetFolder={handleSetFolder}
            />

            {/* 하단 링크 */}
            <div className="mt-6 border-t border-[var(--border-secondary)] pt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-faint)]">
              <a href="/about/" className="hover:text-[var(--text-muted)] transition-colors">소개</a>
              <a href="/terms/" className="hover:text-[var(--text-muted)] transition-colors">이용약관</a>
              <a href="/privacy/" className="hover:text-[var(--text-muted)] transition-colors">개인정보처리방침</a>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-6 lg:flex lg:gap-6">
        {/* 사이드바: 관심종목 (데스크톱만) */}
        <WatchlistSidebar
          watchlist={watchlist}
          watchlistLoading={watchlistLoading}
          selectedSymbol={selectedSymbol}
          onSelectStock={handleSelect}
          onRemove={handleToggleWatchlist}
          onRename={handleRenameWatchlist}
          onReorder={handleReorderWatchlist}
          variant="desktop"
          prices={watchlistPrices}
          onQuickAdd={handleQuickAdd}
          signals={signals}
          goldenSignals={goldenSignals}
          bsSignals={bsSignals}
          folders={watchlistFolders}
          onManageFolders={handleManageFolders}
          onSetFolder={handleSetFolder}
        />

        {/* 메인 콘텐츠 */}
        <main className="min-w-0 flex-1">
          {/* 홈 버튼 (종목 선택 시) */}
          {selectedSymbol && (
            <button
              type="button"
              onClick={goHome}
              className="mb-2 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              홈
            </button>
          )}

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
                    if (results.length > 0) {
                      handleSelect(results[0]);
                    } else if (query.trim()) {
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      searchStocks(query).then((res) => {
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

          {/* 종목명 + 별 버튼 + 카카오 공유 */}
          {selectedSymbol && (
            <div className="mt-3 sm:mt-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] truncate">
                  {selectedName}
                </span>
                <span className="text-[10px] sm:text-xs text-[var(--text-muted)] shrink-0">{selectedSymbol}</span>
                <button
                  type="button"
                  onClick={() => handleToggleWatchlist(selectedSymbol, selectedName)}
                  className="p-0.5 transition-transform hover:scale-110 shrink-0"
                >
                  <Star
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      isInWatchlist(selectedSymbol)
                        ? "fill-amber-400 text-amber-400"
                        : "text-[var(--text-faint)] hover:text-amber-400/60"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const img = screenshotFnRef.current?.();
                    setShareImageUrl(img);
                    setShareModal(true);
                  }}
                  className="flex items-center gap-1 rounded-md bg-[#FEE500] px-2 py-1 text-[#3C1E1E] hover:bg-[#FDD835] transition-colors shrink-0"
                  aria-label="차트 공유"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.9 3.33c-.08.3.26.54.52.37l3.87-2.57c.6.08 1.22.13 1.85.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z"/>
                  </svg>
                  <span className="text-[11px] font-medium">공유</span>
                </button>
                <a
                  href={`/valuation/?ticker=${selectedSymbol.replace(/\.\w+$/, "")}`}
                  className="flex items-center gap-0.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                >
                  <TrendingUp className="h-3 w-3" />
                  밸류에이션
                </a>
                <button
                  type="button"
                  onClick={() => setLegacyMode(v => !v)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors shrink-0 ${
                    legacyMode
                      ? "border-orange-500/50 bg-orange-500/20 text-orange-400"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                  }`}
                >
                  {legacyMode ? "구버전" : "신버전"}
                </button>
              </div>

              {/* 타임머신 */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setTimeMachineOpen((v) => !v)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                    timeMachineDate
                      ? "border-purple-500/50 bg-purple-500/20 text-purple-400"
                      : "border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  타임머신
                  {timeMachineDate && (
                    <span className="ml-0.5">({timeMachineDate})</span>
                  )}
                </button>

                {timeMachineOpen && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={timeMachineDate ?? ""}
                      min={tmCandleDateRange.min}
                      max={tmCandleDateRange.max}
                      onChange={(e) => setTimeMachineDate(e.target.value || null)}
                      className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500/50"
                    />
                    {timeMachineDate && (
                      <button
                        type="button"
                        onClick={() => { setTimeMachineDate(null); setTimeMachineOpen(false); }}
                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        현재로 돌아가기
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 타임머신 활성 배지 */}
              {(timeMachineDate || timeMachinePeriod !== "MAX") && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5">
                  <span className="text-xs text-purple-400">
                    {timeMachinePeriod !== "MAX" ? `${timeMachinePeriod} 범위` : "전체 범위"}
                    {timeMachineDate ? ` / ${timeMachineDate} 시점` : ""}
                    {" "}— 해당 데이터로 지표가 재계산됩니다
                  </span>
                </div>
              )}

              {/* 타임머신 데이터 부족 경고 */}
              {timeMachineDate && tmCandles.length < 2 && tmCandles.length < candles.length && (
                <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-400">
                  선택한 날짜에 충분한 데이터가 없습니다
                </div>
              )}
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="mt-12 flex flex-col items-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">차트 불러오는 중...</span>
            </div>
          )}

          {/* 에러 */}
          {error && !loading && (
            <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* 차트 */}
          {!loading && !error && candles.length > 0 && (!timeMachineDate || tmCandles.length >= 2) && (
            <div className="mt-4 sm:mt-5 -mx-2 sm:mx-0">
              <div className="flex justify-end px-2 sm:px-0 mb-1">
                <span className="text-[10px] text-[var(--text-faint)] tracking-tight">simplystock.co.kr</span>
              </div>
              <StockChartV2 candles={tmCandles} investorDaily={tmInvestor} stockName={selectedName} stockSymbol={selectedSymbol} isDark={isDark} legacyMode={legacyMode} analysisPeriod={timeMachinePeriod} onAnalysisPeriodChange={setTimeMachinePeriod} onScreenshot={(fn) => { screenshotFnRef.current = fn; }} onFullscreen={() => setFullscreenChart(true)} />
            </div>
          )}

          {/* 모의투자 매매 버튼 */}
          {selectedSymbol && !loading && (
            <div className="mt-3">
              <StockTradeButton
                symbol={selectedSymbol}
                name={selectedName}
                userId={user?.uid ?? null}
                onSignIn={signInWithGoogle}
              />
            </div>
          )}

          {/* 수급 스캔 (접기/펼치기) */}
          <SignalScanner
            signals={signals}
            signalsLoading={signalsLoading}
            signalsScannedAt={signalsScannedAt}
            goldenSignals={goldenSignals}
            goldenSignalsLoading={goldenSignalsLoading}
            goldenScannedAt={goldenScannedAt}
            goldenHistory={goldenHistory}
            goldenHistoryLoading={goldenHistoryLoading}
            bsSignals={bsSignals}
            bsSignalsLoading={bsSignalsLoading}
            bsScannedAt={bsScannedAt}
            watchlist={watchlist}
            isAdmin={isAdmin(user?.uid)}
            onSelectSignal={handleSelect}
            onToggleWatchlist={handleToggleWatchlist}
            onOpenChange={setScannerOpen}
          />

          {/* 초기 상태 */}
          {!selectedSymbol && !loading && (
            <HomeDefault
              signals={signals}
              signalsLoading={signalsLoading}
              signalsScannedAt={signalsScannedAt}
              goldenSignals={goldenSignals}
              goldenSignalsLoading={goldenSignalsLoading}
              goldenScannedAt={goldenScannedAt}
              goldenHistory={goldenHistory}
              onSelectStock={handleSelect}
              todayAnalysisCount={todayAnalysisCount}
              scannerOpen={scannerOpen}
            />
          )}
        </main>
      </div>

      {/* 풀스크린 차트 */}
      {fullscreenChart && candles.length > 0 && (
        <FullscreenChart
          candles={tmCandles}
          investorDaily={tmInvestor}
          stockName={selectedName}
          stockSymbol={selectedSymbol}
          isDark={isDark}
          legacyMode={legacyMode}
          onClose={() => setFullscreenChart(false)}
        />
      )}

      {/* 차트 공유 모달 */}
      <ShareModal
        open={shareModal}
        onClose={() => { setShareModal(false); setShareImageUrl(undefined); }}
        imageDataUrl={shareImageUrl}
        shareText={`[SimplyStock] ${selectedName || "종목"} 차트 분석`}
        shareUrl="https://simplystock.co.kr"
        imageFileName={`simplystock-${selectedSymbol || "chart"}.png`}
        kakaoTitle={`${selectedName || "종목"} 차트 분석`}
        kakaoDescription={`회귀 채널과 수급 흐름으로 ${selectedName || "종목"}을 분석해보세요.`}
        kakaoButtonTitle="차트 보러 가기"
      />

      {/* 방문자 카운터 */}
      {visitorCount && (
        <div className="flex items-center justify-center gap-4 mt-8 px-4">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5">
            <Eye className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] text-[var(--text-muted)]">오늘</span>
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">{(visitorCount.today ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] text-[var(--text-muted)]">누적</span>
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">{(visitorCount.total ?? 0).toLocaleString()}</span>
          </div>
          {todayAnalysisCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[11px] text-[var(--text-muted)]">오늘 분석</span>
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">{todayAnalysisCount.toLocaleString()}건</span>
            </div>
          )}
        </div>
      )}

      {/* 피드백 폼 */}
      <FeedbackForm user={user} />

      {/* 관리자 패널 */}
      <AdminPanel user={user} />

      {/* 면책 고지 + 링크 */}
      <footer className="border-t border-[var(--border-secondary)] mt-8 py-4 px-4">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[10px] leading-relaxed text-[var(--text-faint)]">
            본 서비스는 투자 참고용 데이터 분석 도구이며, 특정 종목의 매수·매도를 권유하지 않습니다.
            모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[var(--text-faint)]">
            <a href="/guide/" className="hover:text-[var(--text-muted)] transition-colors">가이드</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/analysis/" className="hover:text-[var(--text-muted)] transition-colors">분석 자료실</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/about/" className="hover:text-[var(--text-muted)] transition-colors">소개</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/terms/" className="hover:text-[var(--text-muted)] transition-colors">이용약관</a>
            <span className="text-[var(--border-primary)]">|</span>
            <a href="/privacy/" className="hover:text-[var(--text-muted)] transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </footer>

      {/* 플로팅 문의 버튼 */}
      <FloatingContact />
    </div>
  );
}
