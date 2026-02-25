"use client";

import { useState } from "react";
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
import type { AnalysisMode } from "@/types";

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("kim");
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
              {mode === "kim" ? (
                <>독설가 킴의{" "}<span className="text-kim-red">팩폭 주식 상담소</span></>
              ) : (
                <>마카롱의{" "}<span className="text-blue-400">투자 전략 리포트</span></>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {mode === "kim"
                ? "6대 산업 전문가 대시보드 · 38세 현장직 베테랑 AI"
                : "20년 경력 · 수급·차트·밸류에이션 3축 분석"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 모드 토글 */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setMode("kim")}
                className={`text-xs font-mono px-3 py-1.5 rounded-md transition-all ${
                  mode === "kim"
                    ? "bg-kim-red text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                킴
              </button>
              <button
                onClick={() => setMode("makalong")}
                className={`text-xs font-mono px-3 py-1.5 rounded-md transition-all ${
                  mode === "makalong"
                    ? "bg-blue-500 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                마카롱
              </button>
            </div>
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
            {!hasImage && <DailyQuote />}

            <FileDropZone previewUrl={previewUrl} onFile={loadImage} />

            <RoastButton
              disabled={!hasImage}
              isLoading={isLoading}
              hasResult={hasResult}
              onClick={() => startRoast(mode)}
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

            <RoastResult roast={roast} error={error} grade={grade} mode={mode} />
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
