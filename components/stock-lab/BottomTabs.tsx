"use client";

import { useState, useEffect } from "react";
import { SectorCompare } from "./SectorCompare";
import { InvestorTrend } from "./InvestorTrend";
import { NewsPanel } from "./NewsPanel";
import type { StockPrice } from "@/lib/stockPricesApi";
import type { StockSearchResult } from "@/lib/stockSearchApi";
import type { InvestorTrendData, StockNewsItem } from "@/types";

const TABS = ["비교", "수급", "뉴스"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  stocks: { symbol: string; name: string }[];
  newsMap: Record<string, StockNewsItem[]>;
  investorMap: Record<string, InvestorTrendData>;
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoadingInvestor: boolean;
  isLoadingSector: boolean;
  getIndustry: (symbol: string) => string;
  onLoadInvestor: (symbol: string) => void;
  onLoadSector: (symbol: string) => void;
}

export function BottomTabs({
  stocks,
  newsMap,
  investorMap,
  sectorPeers,
  sectorPriceMap,
  isLoadingInvestor,
  isLoadingSector,
  getIndustry,
  onLoadInvestor,
  onLoadSector,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("뉴스");

  useEffect(() => {
    if (stocks.length === 0) return;
    const lastSymbol = stocks[stocks.length - 1].symbol;

    if (activeTab === "수급") {
      onLoadInvestor(lastSymbol);
    } else if (activeTab === "비교") {
      onLoadSector(lastSymbol);
    }
  }, [activeTab, stocks, onLoadInvestor, onLoadSector]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-white/15 text-white"
                : "bg-white/5 text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "비교" && (
        <SectorCompare
          stocks={stocks}
          sectorPeers={sectorPeers}
          sectorPriceMap={sectorPriceMap}
          isLoading={isLoadingSector}
          getIndustry={getIndustry}
          onLoad={onLoadSector}
        />
      )}

      {activeTab === "수급" && (
        <InvestorTrend
          stocks={stocks}
          investorMap={investorMap}
          isLoading={isLoadingInvestor}
          onLoad={onLoadInvestor}
        />
      )}

      {activeTab === "뉴스" && (
        <NewsPanel stocks={stocks} newsMap={newsMap} />
      )}
    </div>
  );
}
