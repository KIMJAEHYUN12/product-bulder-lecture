"use client";

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
} from "@/components/DashboardWidgets";
import { useRoastFlow } from "@/hooks/useRoastFlow";
import { useMarketData } from "@/hooks/useMarketData";

export default function Home() {
  const { state, loadImage, startRoast, reset } = useRoastFlow();
  const { fearGreed, news, econCalendar, commodities, kimComment, isLoading: marketLoading } = useMarketData();
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
    <main className="min-h-screen bg-gray-950 text-white grid-bg transition-colors">
      {/* ── News Ticker ── */}
      <NewsTicker news={news} isLoading={marketLoading} />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-white leading-tight">
              독설가 킴의{" "}
              <span className="text-kim-red">팩폭 주식 상담소</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              6대 산업 전문가 대시보드 · 38세 현장직 베테랑 AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <KimCharacter expression={kimExpression} isLoading={isLoading} />
            <ThemeToggle />
          </div>
        </div>

        {/* ── Main 3-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

          {/* ── LEFT SIDEBAR ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <MarketSentimentGauge fearGreed={fearGreed} isLoading={marketLoading} />
            <CommodityTicker commodities={commodities} kimComment={kimComment} isLoading={marketLoading} />
          </div>

          {/* ── CENTER ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Show quote before image is loaded */}
            {!hasImage && <DailyQuote />}

            <FileDropZone previewUrl={previewUrl} onFile={loadImage} />

            <RoastButton
              disabled={!hasImage}
              isLoading={isLoading}
              hasResult={hasResult}
              onClick={startRoast}
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

            <RoastResult roast={roast} error={error} grade={grade} />
          </div>

          {/* ── RIGHT ── */}
          <div className="lg:col-span-1">
            <AnalysisReport
              analysis={analysis}
              scores={scores}
              sector={sector}
            />
          </div>

        </div>

        {/* ── Bottom: Economic Calendar ── */}
        <EconomicCalendar events={econCalendar} />
      </div>
    </main>
  );
}
