"use client";

import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { useCapitalMarket, useCapitalMarketSeries } from "@/hooks/useCapitalMarket";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarketInterpretBanner } from "@/components/capital-market/MarketInterpretBanner";
import { StockMarketSection } from "@/components/capital-market/StockMarketSection";
import { BondMarketSection } from "@/components/capital-market/BondMarketSection";
import { ExchangeRateSection } from "@/components/capital-market/ExchangeRateSection";
import { InvestorTrendSection } from "@/components/capital-market/InvestorTrendSection";
import { MarketHealthSection } from "@/components/capital-market/MarketHealthSection";
import { UsTreasurySection } from "@/components/capital-market/UsTreasurySection";
import { FearGreedSection } from "@/components/capital-market/FearGreedSection";
import { MarketValuationSection } from "@/components/capital-market/MarketValuationSection";
import { ProgramTradingSection } from "@/components/capital-market/ProgramTradingSection";
import { ShortSellingSection } from "@/components/capital-market/ShortSellingSection";
import { DetailModal } from "@/components/capital-market/DetailModal";

export default function CapitalMarketDashboard() {
  const { data, loading, error, reload } = useCapitalMarket();
  const { series, loading: seriesLoading, error: seriesError, load: loadSeries, clear: clearSeries } = useCapitalMarketSeries();

  const handleDetail = (type: string, key: string) => {
    loadSeries(type, key);
  };

  const handleCloseDetail = () => {
    clearSeries();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <h1 className="text-base font-bold text-[var(--text-primary)]">한눈에 보는 자본시장</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* 로딩 */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        )}

        {/* 에러 */}
        {error && !data && (
          <div className="py-12 text-center">
            <p className="text-sm text-rose-400 mb-3">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* 해석 배너 */}
            <MarketInterpretBanner data={data} />

            {/* 3컬럼 그리드 (PC), 1컬럼 (모바일) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StockMarketSection stocks={data.stocks} onDetail={handleDetail} />
              <BondMarketSection bonds={data.bonds} onDetail={handleDetail} />
              <ExchangeRateSection
                exchangeRates={data.exchangeRates ?? []}
                globalIndicators={data.globalIndicators ?? []}
                onDetail={handleDetail}
              />
            </div>

            {/* 신규 3컬럼: 미국 국채 / Fear&Greed / KOSPI 밸류에이션 */}
            {(data.usTreasury || data.fearGreed || data.kospiValuation) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.usTreasury && <UsTreasurySection data={data.usTreasury} />}
                {data.fearGreed && <FearGreedSection data={data.fearGreed} />}
                {data.kospiValuation && <MarketValuationSection data={data.kospiValuation} />}
              </div>
            )}

            {/* 투자자 동향 (풀와이드) */}
            {data.investorTrend && (
              <InvestorTrendSection data={data.investorTrend} />
            )}

            {/* 프로그램 매매 / 공매도 (2컬럼) */}
            {(data.programTrading || data.shortSelling) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.programTrading && <ProgramTradingSection data={data.programTrading} />}
                {data.shortSelling && <ShortSellingSection data={data.shortSelling} />}
              </div>
            )}

            {/* 시장 온도계 (조건부) */}
            {data.marketHealth && (
              <MarketHealthSection data={data.marketHealth} />
            )}

            {/* 업데이트 시각 */}
            <p className="text-center text-xs text-[var(--text-faint)]">
              {new Date(data.updatedAt).toLocaleString("ko-KR")} 기준
            </p>
          </div>
        )}
      </main>

      {/* 시계열 상세 모달 */}
      {(series || seriesLoading) && (
        <DetailModal
          series={series}
          loading={seriesLoading}
          error={seriesError}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
