"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/Skeleton";
import { StaggerContainer } from "@/components/StaggerContainer";
import { fetchPopularStocks, type PopularStockEntry } from "@/lib/popularStocksApi";

interface Props {
  onSelect: (stock: { symbol: string; name: string }) => void;
}

export function PopularStocks({ onSelect }: Props) {
  const [stocks, setStocks] = useState<PopularStockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPopularStocks()
      .then(setStocks)
      .catch(() => setStocks([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔥</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">인기 분석 종목</h3>
        <span className="text-[10px] text-gray-400 font-mono">오늘 TOP 5</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <p className="text-xs text-gray-400 font-mono py-2">아직 분석된 종목이 없습니다</p>
      ) : (
        <StaggerContainer className="space-y-1.5">
          {stocks.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => onSelect({ symbol: s.symbol, name: s.name })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <span className={`text-xs font-black w-5 text-center ${
                i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-500"
              }`}>
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate max-w-[140px]">
                {s.name}
              </span>
              <span className="text-[10px] text-gray-400 font-mono ml-auto shrink-0">
                {s.count}회
              </span>
            </button>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}
