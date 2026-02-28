"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
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
import { useRoastFlow } from "@/hooks/useRoastFlow";
import { useMarketData } from "@/hooks/useMarketData";
import { incrementAnalysisCount } from "@/lib/popularStocksApi";
import type { AnalysisMode, TechIndicators } from "@/types";

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("kim");
  const { state, loadImage, startRoast, startBitgakRoast, reset, clearResult } = useRoastFlow();
  const { fearGreed, news, econCalendar, commodities, kimComment, isLoading: marketLoading } = useMarketData();
  const [bitgakSummary, setBitgakSummary] = useState<{ summary: string; stockName: string } | null>(null);
  const [techIndicators, setTechIndicators] = useState<TechIndicators | null>(null);
  const [externalStock, setExternalStock] = useState<{ symbol: string; name: string } | null>(null);

  const handleBitgakReady = useCallback((summary: string, stockName: string, indicators?: TechIndicators) => {
    setBitgakSummary({ summary, stockName });
    setTechIndicators(indicators ?? null);

    // 인기 종목 카운트 증가
    if (stockName) {
      const symbolMatch = summary.match(/종목코드:\s*(\S+)/);
      incrementAnalysisCount(symbolMatch?.[1] ?? stockName, stockName);
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {mode === "kim" ? (
                <>오비젼의{" "}<span className="text-kim-red">팩폭 포폴 진단</span></>
              ) : (
                <>오비젼의{" "}<span className="text-blue-400">빗각 차트 분석</span></>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <KimCharacter expression={kimExpression} isLoading={isLoading} mode={mode} />
              <ThemeToggle />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {mode === "kim"
              ? "포트폴리오 스크린샷 업로드 → AI 팩폭 진단"
              : "종목 선택 → 자동 빗각 작도 → AI 매매 판단"}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3">
            <button
              onClick={() => switchMode("kim")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 transition-all whitespace-nowrap ${
                mode === "kim"
                  ? "bg-kim-red border-kim-red text-white shadow-lg shadow-red-900/50"
                  : "border-gray-200 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:border-kim-red/50 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="text-sm sm:text-base">🏭</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">포폴 진단</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono">스크린샷 분석</div>
              </div>
            </button>
            <button
              onClick={() => switchMode("makalong")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 transition-all whitespace-nowrap ${
                mode === "makalong"
                  ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-900/50"
                  : "border-gray-200 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:border-blue-400/50 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="text-sm sm:text-base">📐</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">차트 분석</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono">빗각 작도</div>
              </div>
            </button>
            <Link
              href="/mock-investment"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all whitespace-nowrap"
            >
              <span className="text-sm sm:text-base">📈</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">모의투자</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono hidden sm:block">가상 1,000만원</div>
              </div>
            </Link>
            <Link
              href="/stock-lab"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all whitespace-nowrap"
            >
              <span className="text-sm sm:text-base">🔬</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">종목 분석실</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono hidden sm:block">AI 비교 분석</div>
              </div>
            </Link>
            <Link
              href="/chart-game"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500 dark:hover:border-orange-400 transition-all whitespace-nowrap"
            >
              <span className="text-sm sm:text-base">🎮</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">차트게임</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono hidden sm:block">업다운 연승</div>
              </div>
            </Link>
            <Link
              href="/quiz"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all whitespace-nowrap"
            >
              <span className="text-sm sm:text-base">🧠</span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-black leading-none">투자성향</div>
                <div className="text-[9px] sm:text-[10px] opacity-75 leading-none mt-0.5 font-mono hidden sm:block">15문항 테스트</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-1 flex flex-col gap-4">
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

          {/* CENTER */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {mode === "kim" && <StockRoastSection />}
            {mode === "kim" && !hasImage && <DailyQuote />}

            {mode === "makalong" ? (
              <>
                <BitgakChart onAnalysisReady={handleBitgakReady} externalSymbol={externalStock} />

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
                      onClick={() => { reset(); setBitgakSummary(null); setTechIndicators(null); setExternalStock(null); }}
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
                  onClick={() => startRoast(mode, state.imageBase64 ?? "", state.mimeType ?? "")}
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

            <RoastResult roast={roast} error={error} grade={grade} mode={mode} isStreaming={state.isStreaming} />
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1">
            <AnalysisReport
              analysis={analysis}
              scores={scores}
              sector={sector}
              mode={mode}
            />
          </div>

        </div>

        {/* Bottom: Economic Calendar (포폴진단 모드만) */}
        {mode === "kim" && <EconomicCalendar events={econCalendar} />}

        {/* 면책조항 + 푸터 */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-white/10 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono leading-relaxed mb-3 max-w-xl mx-auto">
            본 서비스는 정보 제공 목적이며 투자 권유·추천이 아닙니다. AI 분석 결과는 참고용이며, 투자 판단과 그에 따른 손익의 책임은 전적으로 이용자 본인에게 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400 font-mono">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">개인정보처리방침</Link>
            <span>·</span>
            <span>© 2026 오비젼</span>
          </div>
        </div>
      </div>
      <HelpModal />
    </main>
  );
}
