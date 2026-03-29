"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { searchStocks, type StockSearchResult } from "@/lib/stockSearchApi";

export function Watchlist() {
  const { user } = useAuth();
  const { items, prices, loading, addItem, removeItem, isFull } = useWatchlist(user?.uid);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색 디바운스
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchStocks(query);
      setResults(res.slice(0, 6));
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
        setQuery("");
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="glass-card p-3 relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <span className="text-yellow-500">★</span>
          관심 종목
          <span className="text-[10px] font-mono text-gray-400">
            {items.length}/5
          </span>
        </h3>
        {!isFull && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="text-[10px] text-kim-red hover:underline font-mono"
          >
            {showSearch ? "닫기" : "+ 추가"}
          </button>
        )}
      </div>

      {/* 검색 영역 */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) {
                  e.preventDefault();
                  const first = results[0];
                  const alreadyAdded = items.some((i) => i.symbol === first.symbol);
                  if (!alreadyAdded && !isFull) {
                    addItem({ symbol: first.symbol, name: first.name });
                    setQuery("");
                    setResults([]);
                    setShowSearch(false);
                  }
                }
              }}
              placeholder="종목명 검색..."
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50"
              autoFocus
            />
            {searching && (
              <p className="text-[10px] text-gray-400 mt-1 font-mono">검색 중...</p>
            )}
            {results.length > 0 && (
              <div className="relative z-10 mt-1 max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900">
                {results.map((r) => {
                  const alreadyAdded = items.some((i) => i.symbol === r.symbol);
                  return (
                    <button
                      key={r.symbol}
                      disabled={alreadyAdded || isFull}
                      onClick={() => {
                        addItem({ symbol: r.symbol, name: r.name });
                        setQuery("");
                        setResults([]);
                        setShowSearch(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 flex justify-between items-center"
                    >
                      <span className="text-gray-900 dark:text-white truncate max-w-[140px]">
                        {r.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono ml-2 shrink-0">
                        {alreadyAdded ? "추가됨" : r.exchange}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 종목 리스트 */}
      {items.length === 0 ? (
        <p className="text-[10px] text-gray-400 font-mono text-center py-3">
          관심 종목을 추가해보세요
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const p = prices[item.symbol];
            const isUp = p && p.changePct > 0;
            const isDown = p && p.changePct < 0;
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => removeItem(item.symbol)}
                    className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="삭제"
                  >
                    ×
                  </button>
                  <span className="text-xs text-gray-900 dark:text-white truncate max-w-[100px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {loading && !p ? (
                    <span className="text-[10px] text-gray-400 font-mono">...</span>
                  ) : p ? (
                    <>
                      <span className="text-xs font-mono text-gray-900 dark:text-white">
                        {p.price.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-400"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {p.changePct.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
