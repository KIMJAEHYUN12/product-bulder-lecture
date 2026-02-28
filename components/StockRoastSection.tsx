"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStockRoast } from "@/hooks/useStockRoast";

export function StockRoastSection() {
  const {
    query,
    setQuery,
    suggestions,
    selected,
    selectStock,
    isLoading,
    result,
    error,
    reset,
  } = useStockRoast();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // suggestions가 비면 자연히 닫힘
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleShare() {
    if (!result || !selected) return;
    const newsText = result.news.slice(0, 3).map((n) => `- ${n.title}`).join("\n");
    const text =
      `[오비젼] ${selected.name} 관련 뉴스\n\n${newsText}\n\n` +
      `👉 https://mylen-24263782-5d205.web.app`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  const showDropdown = suggestions.length > 0;

  return (
    <div className="glass-card rounded-xl p-4 relative z-20 overflow-visible">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔍</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">종목 뉴스</h3>
        <span className="text-[10px] text-gray-400 font-mono">종목 검색 → 관련 뉴스</span>
      </div>

      {/* 검색창 */}
      <div className="relative z-50" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) {
                reset();
                setQuery(e.target.value);
              }
            }}
            placeholder="종목명 검색 (예: 삼성전자, SK하이닉스)"
            className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-kim-red/50 focus:ring-1 focus:ring-kim-red/30 transition-colors pr-8"
          />
          {selected && (
            <button
              onClick={reset}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
            >
              {suggestions.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => selectStock({ symbol: s.symbol, name: s.name })}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 font-mono">
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-kim-red rounded-full animate-spin" />
          뉴스 조회 중...
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* 결과 카드 */}
      <AnimatePresence>
        {result && selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-3"
          >
            {/* 종목명 */}
            <div className="px-1 mb-2">
              <span className="text-base font-black text-gray-900 dark:text-white">{selected.name}</span>
            </div>

            {/* 뉴스 */}
            {result.news.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] text-gray-400 font-mono px-1">관련 뉴스</div>
                {result.news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5 text-xs group-hover:text-kim-red transition-colors">▸</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 font-mono text-center py-3">
                관련 뉴스가 없습니다
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleShare}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                공유
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                다른 종목
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
