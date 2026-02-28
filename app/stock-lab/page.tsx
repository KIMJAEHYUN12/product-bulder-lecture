"use client";

import Link from "next/link";
import { StockSearchBar } from "@/components/stock-lab/StockSearchBar";
import { ComparisonChart } from "@/components/stock-lab/ComparisonChart";
import { ComparisonCards } from "@/components/stock-lab/ComparisonCards";
import { AiBriefing } from "@/components/stock-lab/AiBriefing";
import { BottomTabs } from "@/components/stock-lab/BottomTabs";
import { useStockLab } from "@/hooks/useStockLab";

export default function StockLabPage() {
  const {
    state,
    addStock,
    removeStock,
    setRange,
    requestBriefing,
    loadInvestorTrend,
    loadSectorComparison,
    getIndustry,
  } = useStockLab();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← 홈
          </Link>
          <h1 className="text-xl font-black">
            🔬 <span className="text-blue-400">종목 분석실</span>
          </h1>
          <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
            최대 3종목 비교 · AI 브리핑 · 뉴스
          </span>
        </div>

        {/* 검색 바 — z-20으로 그리드 콘텐츠 위에 배치 */}
        <div className="mb-6 relative z-20">
          <StockSearchBar
            stocks={state.stocks}
            onAdd={addStock}
            onRemove={removeStock}
          />
        </div>

        {/* 에러 */}
        {state.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
            {state.error}
          </div>
        )}

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 왼쪽: 차트 + 카드 (col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <ComparisonChart
              stocks={state.stocks}
              chartDataMap={state.chartDataMap}
              range={state.range}
              onRangeChange={setRange}
              isLoading={state.isLoadingChart}
            />
            <ComparisonCards
              stocks={state.stocks}
              priceMap={state.priceMap}
            />
          </div>

          {/* 오른쪽: AI 브리핑 + 뉴스 (col-span-1) */}
          <div className="lg:col-span-1 space-y-4">
            <AiBriefing
              stockCount={state.stocks.length}
              briefing={state.briefing}
              briefingResult={state.briefingResult}
              isBriefingStreaming={state.isBriefingStreaming}
              onRequest={requestBriefing}
            />
            <BottomTabs
              stocks={state.stocks}
              newsMap={state.newsMap}
              investorMap={state.investorMap}
              sectorPeers={state.sectorPeers}
              sectorPriceMap={state.sectorPriceMap}
              isLoadingInvestor={state.isLoadingInvestor}
              isLoadingSector={state.isLoadingSector}
              getIndustry={getIndustry}
              onLoadInvestor={loadInvestorTrend}
              onLoadSector={loadSectorComparison}
            />
          </div>
        </div>

        {/* 면책조항 */}
        <div className="mt-8 pt-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 font-mono leading-relaxed max-w-xl mx-auto">
            본 서비스는 정보 제공 목적이며 투자 권유·추천이 아닙니다. AI 분석 결과는 참고용이며, 투자 판단과 그에 따른 손익의 책임은 전적으로 이용자 본인에게 있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
