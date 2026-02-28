"use client";

import type { StockPrice } from "@/lib/stockPricesApi";
import type { StockSearchResult } from "@/lib/stockSearchApi";

interface Props {
  stocks: { symbol: string; name: string }[];
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoading: boolean;
  getIndustry: (symbol: string) => string;
  onLoad: (symbol: string) => void;
}

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

export function SectorCompare({
  stocks,
  sectorPeers,
  sectorPriceMap,
  isLoading,
  getIndustry,
  onLoad,
}: Props) {
  if (stocks.length === 0) {
    return (
      <div className="text-xs text-gray-500 font-mono py-8 text-center">
        종목을 선택하면 같은 업종 경쟁사를 비교할 수 있습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stocks.map((stock, idx) => {
        const industry = getIndustry(stock.symbol);
        const peers = sectorPeers[stock.symbol];
        const loaded = peers !== undefined;

        if (!loaded) {
          return (
            <div key={stock.symbol} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STOCK_COLORS[idx] }}
                />
                <span className="text-sm font-bold text-white">{stock.name}</span>
                {industry && (
                  <span className="text-[10px] text-gray-500 font-mono">{industry}</span>
                )}
              </div>
              <button
                onClick={() => onLoad(stock.symbol)}
                className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                경쟁사 비교 불러오기
              </button>
            </div>
          );
        }

        if (peers.length === 0) {
          return (
            <div key={stock.symbol} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STOCK_COLORS[idx] }}
                />
                <span className="text-sm font-bold text-white">{stock.name}</span>
                {industry && (
                  <span className="text-[10px] text-gray-500 font-mono">{industry}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono text-center py-3">
                같은 업종 종목이 없습니다
              </p>
            </div>
          );
        }

        return (
          <div key={stock.symbol} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: STOCK_COLORS[idx] }}
              />
              <span className="text-sm font-bold text-white">{stock.name}</span>
              {industry && (
                <span className="text-[10px] text-gray-500 font-mono truncate max-w-[140px]">
                  {industry}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {peers.map((peer) => {
                const price = sectorPriceMap[peer.symbol];
                return (
                  <div
                    key={peer.symbol}
                    className="rounded-lg bg-white/5 border border-white/10 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{peer.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{peer.exchange}</p>
                      </div>
                      {price ? (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-white">
                            {price.price.toLocaleString()}
                          </p>
                          <p
                            className={`text-[10px] font-mono ${
                              price.changePct >= 0 ? "text-red-400" : "text-blue-400"
                            }`}
                          >
                            {price.changePct >= 0 ? "+" : ""}
                            {price.changePct.toFixed(2)}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-600">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="text-xs text-gray-500 font-mono text-center py-2 animate-pulse">
          섹터 데이터 로딩 중...
        </div>
      )}
    </div>
  );
}
