"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStocks } from "@/lib/stockSearchApi";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  onAdd: (stock: { symbol: string; name: string }) => void;
  onRemove: (symbol: string) => void;
}

export function StockSearchBar({ stocks, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = stocks.length >= 3;

  useEffect(() => {
    if (!query.trim() || query.trim().length < 1 || isFull) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        const filtered = results.filter(
          (r) => !stocks.some((s) => s.symbol === r.symbol)
        );
        setSuggestions(filtered.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isFull, stocks]);

  const selectStock = (stock: { symbol: string; name: string }) => {
    onAdd(stock);
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative z-50">
      {/* 선택된 종목 태그 + 검색 입력 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-blue-500/50 transition-colors">
        {stocks.map((s, i) => (
          <motion.span
            key={s.symbol}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white max-w-[140px]"
            style={{ backgroundColor: STOCK_COLORS[i] + "cc" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STOCK_COLORS[i] }}
            />
            <span className="truncate">{s.name}</span>
            <button
              onClick={() => onRemove(s.symbol)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </motion.span>
        ))}
        {!isFull ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={stocks.length === 0 ? "종목명 검색 (최대 3개)" : "종목 추가..."}
            className="flex-1 min-w-[100px] bg-transparent text-sm font-mono text-white placeholder:text-gray-500 focus:outline-none"
          />
        ) : (
          <span className="text-[10px] text-gray-500 font-mono px-1">최대 3종목</span>
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-gray-900 border border-white/15 rounded-lg shadow-xl overflow-hidden max-h-[280px] overflow-y-auto"
          >
            {suggestions.map((s) => (
              <button
                key={s.symbol}
                onClick={() => selectStock(s)}
                className="w-full px-4 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">{s.symbol}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
