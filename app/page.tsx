"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileDropZone } from "@/components/FileDropZone";
import { RoastButton } from "@/components/RoastButton";
import { KimCharacter } from "@/components/KimCharacter";
import { RoastResult } from "@/components/RoastResult";
import { AnalysisReport } from "@/components/AnalysisReport";
import {
  NewsTicker,
  DailyQuote,
  MarketSentimentGauge,
  CommodityTicker,
  EconomicCalendar,
  KospiNightFutures,
} from "@/components/DashboardWidgets";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { StockRoastSection } from "@/components/StockRoastSection";
import { BitgakChart } from "@/components/BitgakChart";
import { TechIndicatorCard } from "@/components/TechIndicatorCard";
import { PopularStocks } from "@/components/PopularStocks";
import { AnalysisHistory, addToHistory } from "@/components/AnalysisHistory";
import { HelpModal } from "@/components/HelpModal";
import { AdSlot } from "@/components/AdSlot";
import { DailyBriefing } from "@/components/DailyBriefing";
import { StreakBadge } from "@/components/StreakBadge";
import { Watchlist } from "@/components/Watchlist";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useRoastFlow } from "@/hooks/useRoastFlow";
import { useMarketData } from "@/hooks/useMarketData";
import { useStreak } from "@/hooks/useStreak";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/mock/LoginButton";
import { incrementAnalysisCount } from "@/lib/popularStocksApi";
import { grantExp } from "@/lib/rpgExp";
import { BitgakInterpretCard } from "@/components/BitgakInterpretCard";
import type { AnalysisMode, TechIndicators, BitgakMeta } from "@/types";

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("kim");
  const { state, loadImage, startRoast, startBitgakRoast, reset, clearResult } = useRoastFlow();
  const { fearGreed, news, econCalendar, commodities, kimComment, isLoading: marketLoading } = useMarketData();
  const [bitgakSummary, setBitgakSummary] = useState<{ summary: string; stockName: string } | null>(null);
  const [techIndicators, setTechIndicators] = useState<TechIndicators | null>(null);
  const [bitgakMeta, setBitgakMeta] = useState<BitgakMeta | null>(null);
  const [externalStock, setExternalStock] = useState<{ symbol: string; name: string } | null>(null);
  const [mobileWatchlistOpen, setMobileWatchlistOpen] = useState(false);
  const streak = useStreak();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  // URL 쿼리 파라미터 처리 (?mode=makalong, ?ref=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    if (modeParam === "makalong") {
      setMode("makalong");
    }
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("ovision_pending_invite", refCode.toUpperCase());
      // URL에서 ?ref= 제거
      params.delete("ref");
      const qs = params.toString();
      const cleanUrl = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  const handleBitgakReady = useCallback((summary: string, stockName: string, indicators?: TechIndicators, meta?: BitgakMeta) => {
    setBitgakSummary({ summary, stockName });
    setTechIndicators(indicators ?? null);
    setBitgakMeta(meta ?? null);

    // 인기 종목 카운트 증가 (Yahoo Finance symbol 우선 사용)
    if (stockName) {
      const sym = externalStock?.symbol || summary.match(/종목코드:\s*(\S+)/)?.[1] || stockName;
      incrementAnalysisCount(sym, stockName);
    }

    // 히스토리에 추가
    if (indicators) {
      const channelMatch = summary.match(/채널 방향:\s*(\S+)/);
      const posMatch = summary.match(/현재 위치:\s*(.+)/);
      addToHistory({
        symbol: externalStock?.symbol ?? stockName,
        name: stockName,
        date: new Date().toLocaleDateString("ko-KR"),
        channelDir: channelMatch?.[1] ?? "판별불가",
        position: posMatch?.[1] ?? "",
        rsi: indicators.rsi,
      });
    }

    grantExp("bitgak_analysis");
  }, [externalStock]);

  const handleExternalSelect = useCallback((stock: { symbol: string; name: string }) => {
    setExternalStock(stock);
  }, []);

  const switchMode = (newMode: AnalysisMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    clearResult();
    setBitgakSummary(null);
    setTechIndicators(null);
    setBitgakMeta(null);
    setExternalStock(null);
  };
  const {
    previewUrl,
    isLoading,
    roast,
    analysis,
    scores,
    sector,
    error,
    grade,
    kimExpression,
  } = state;

  const hasImage = !!previewUrl;
  const hasResult = !!roast || !!error;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white grid-bg transition-colors">
      {/* News Ticker */}
      <NewsTicker news={news} isLoading={marketLoading} />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <DailyBriefing />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
              {mode === "kim" ? (
                <>오비젼의{" "}<span className="text-kim-red">포폴 진단</span></>
              ) : (
                <>오비젼의{" "}<span className="text-blue-400">차트 분석</span></>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <StreakBadge currentStreak={streak.currentStreak} maxStreak={streak.maxStreak} />
              <KimCharacter expression={kimExpression} isLoading={isLoading} mode={mode} />
              <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
              <ThemeToggle />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {mode === "kim"
              ? "포트폴리오 스크린샷 업로드 → AI 팩폭 진단"
              : "종목 선택 → 자동 빗각 작도 → AI 매매 판단"}
          </p>
          <div className="space-y-2 mt-3">
            {/* 핵심 2개 — 크게 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => switchMode("kim")}
                className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                  mode === "kim"
                    ? "border-kim-red text-white shadow-lg shadow-red-900/50"
                    : "border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:border-kim-red/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {mode === "kim" && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 bg-kim-red rounded-[10px]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative text-sm sm:text-base">🏭</span>
                <div className="relative text-left">
                  <div className="text-xs sm:text-sm font-black leading-none">포폴 진단</div>
                  <div className="text-[10px] opacity-75 leading-none mt-0.5 font-mono">스크린샷 분석</div>
                </div>
              </button>
              <button
                onClick={() => switchMode("makalong")}
                className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                  mode === "makalong"
                    ? "border-blue-500 text-white shadow-lg shadow-blue-900/50"
                    : "border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:border-blue-400/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {mode === "makalong" && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 bg-blue-500 rounded-[10px]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative text-sm sm:text-base">📐</span>
                <div className="relative text-left">
                  <div className="text-xs sm:text-sm font-black leading-none">차트 분석</div>
                  <div className="text-[10px] opacity-75 leading-none mt-0.5 font-mono">빗각 작도</div>
                </div>
              </button>
            </div>
            {/* 나머지 6개 — 3x2 균등 그리드 */}
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                href="/mock-investment"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all text-center"
              >
                <span className="text-sm">📈</span>
                <div className="text-xs font-black leading-none">모의투자</div>
              </Link>
              <Link
                href="/stock-lab"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-cyan-500/50 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all text-center"
              >
                <span className="text-sm">🔬</span>
                <div className="text-xs font-black leading-none">분석실</div>
              </Link>
              <Link
                href="/chart-game"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-orange-500/50 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500 dark:hover:border-orange-400 transition-all text-center"
              >
                <span className="text-sm">🎮</span>
                <div className="text-xs font-black leading-none">차트게임</div>
              </Link>
              <Link
                href="/quiz"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all text-center"
              >
                <span className="text-sm">🧠</span>
                <div className="text-xs font-black leading-none">투자성향</div>
              </Link>
              <Link
                href="/backtest"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-violet-500/50 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 hover:border-violet-500 dark:hover:border-violet-400 transition-all text-center"
              >
                <span className="text-sm">🔄</span>
                <div className="text-xs font-black leading-none">백테스트</div>
              </Link>
              <Link
                href="/adventure"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500 dark:hover:border-amber-400 transition-all text-center"
              >
                <span className="text-sm">⚔️</span>
                <div className="text-xs font-black leading-none">투자 모험</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 isolate">

          {/* LEFT SIDEBAR — 모바일에서는 분석 영역 아래로 */}
          <div className="order-2 lg:order-none lg:col-span-1 flex flex-col gap-4">
            <div className="hidden lg:block">
              <Watchlist />
            </div>
            {user && <AttendanceCalendar />}
            {mode === "kim" ? (
              <>
                <KospiNightFutures />
                <MarketSentimentGauge fearGreed={fearGreed} isLoading={marketLoading} />
                <CommodityTicker commodities={commodities} kimComment={kimComment} isLoading={marketLoading} />
              </>
            ) : (
              <>
                <PopularStocks onSelect={handleExternalSelect} />
                <AnalysisHistory onSelect={handleExternalSelect} />
              </>
            )}
          </div>

          {/* CENTER — 모바일에서 최상단 */}
          <div className="order-1 lg:order-none lg:col-span-2 flex flex-col gap-4">
            {mode === "kim" && <StockRoastSection />}
            {mode === "kim" && !hasImage && <DailyQuote />}

            {mode === "makalong" ? (
              <>
                <BitgakChart onAnalysisReady={handleBitgakReady} externalSymbol={externalStock} onExternalClear={() => setExternalStock(null)} />

                {techIndicators && <TechIndicatorCard indicators={techIndicators} />}

                {bitgakSummary && (
                  <RoastButton
                    disabled={!bitgakSummary}
                    isLoading={isLoading}
                    hasResult={hasResult}
                    onClick={() => startBitgakRoast(bitgakSummary.summary, bitgakSummary.stockName)}
                    mode={mode}
                  />
                )}

                {hasResult && !isLoading && (
                  <div className="text-center">
                    <button
                      onClick={() => { reset(); setBitgakSummary(null); setTechIndicators(null); setBitgakMeta(null); setExternalStock(null); }}
                      className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
                    >
                      새 차트 분석
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <FileDropZone previewUrl={previewUrl} onFile={loadImage} onClear={reset} mode={mode} />

                <RoastButton
                  disabled={!hasImage}
                  isLoading={isLoading}
                  hasResult={hasResult}
                  onClick={() => startRoast(mode, state.imageBase64 ?? "", state.mimeType || "image/jpeg")}
                  mode={mode}
                />

                {hasResult && !isLoading && (
                  <div className="text-center">
                    <button
                      onClick={reset}
                      className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
                    >
                      새 포트폴리오로 시작
                    </button>
                  </div>
                )}
              </>
            )}

            <AnalysisLoading isLoading={isLoading} mode={mode} />

            {mode === "makalong" && bitgakMeta && bitgakSummary ? (
              <BitgakInterpretCard meta={bitgakMeta} stockName={bitgakSummary.stockName} />
            ) : (
              <RoastResult roast={roast} error={error} grade={grade} mode={mode} isStreaming={state.isStreaming} scores={scores} />
            )}
          </div>

          {/* RIGHT — 모바일에서 사이드바 아래 */}
          <div className="order-3 lg:order-none lg:col-span-1">
            <AnalysisReport
              analysis={analysis}
              scores={scores}
              sector={sector}
              mode={mode}
              roast={mode === "makalong" ? roast : null}
            />
          </div>

        </div>

        {/* Bottom: Economic Calendar (포폴진단 모드만) */}
        {mode === "kim" && <EconomicCalendar events={econCalendar} />}

        {/* 광고 */}
        <AdSlot className="mt-6" />

        {/* SimplyStock 크로스 프로모션 */}
        <a
          href="https://simplystock.co.kr"
          target="_blank"
          rel="noopener"
          className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.08] group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-cyan-500 text-lg shrink-0">📊</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 font-mono">SimplyStock</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">회귀 채널과 수급 흐름으로 종목을 분석해보세요</p>
            </div>
          </div>
          <span className="text-xs text-cyan-500 group-hover:text-cyan-400 transition-colors shrink-0 ml-2 font-mono">바로가기 &rarr;</span>
        </a>

        {/* 면책조항 + 푸터 */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 text-center">
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono leading-relaxed mb-3 max-w-xl mx-auto">
            본 서비스는 정보 제공 목적이며 투자 권유·추천이 아닙니다. AI 분석 결과는 참고용이며, 투자 판단과 그에 따른 손익의 책임은 전적으로 이용자 본인에게 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 font-mono">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">개인정보처리방침</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">이용약관</Link>
            <span>·</span>
            <span>© 2026 오비젼</span>
          </div>
        </div>
      </div>
      {/* 모바일 관심종목 FAB */}
      <button
        onClick={() => setMobileWatchlistOpen(true)}
        className="fixed bottom-20 right-6 z-40 lg:hidden w-12 h-12 rounded-full bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 flex items-center justify-center text-lg active:scale-95 transition-transform"
        aria-label="관심종목 열기"
      >
        ★
      </button>

      {/* 모바일 관심종목 바텀시트 */}
      <AnimatePresence>
        {mobileWatchlistOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileWatchlistOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-gray-900 px-4 pt-4 pb-8"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">관심 종목</h2>
                <button
                  onClick={() => setMobileWatchlistOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono"
                >
                  닫기
                </button>
              </div>
              <Watchlist />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HelpModal />
    </main>
  );
}
