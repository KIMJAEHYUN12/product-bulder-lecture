"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { searchStocks } from "@/lib/api";
import type { StockSearchResult } from "@/types";
import type { OcrStock } from "@/lib/portfolioAnalyzeApi";

interface Props {
  onAdd: (stock: OcrStock) => void;
}

export function ManualStockInput({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [selected, setSelected] = useState<StockSearchResult | null>(null);
  const [qty, setQty] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchStocks(query);
        setResults(res.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, selected]);

  const handleSelect = useCallback((item: StockSearchResult) => {
    setSelected(item);
    setQuery(item.name);
    setResults([]);
  }, []);

  const handleAdd = useCallback(() => {
    if (!selected || !qty) return;
    const symbol = selected.symbol.replace(".KS", "").replace(".KQ", "");
    onAdd({
      name: selected.name,
      symbol,
      fullSymbol: selected.symbol,
      qty: parseInt(qty, 10) || 1,
      avgPrice: parseInt(avgPrice, 10) || 0,
      currentPrice: null,
      returnPct: null,
      sector: selected.industry || null,
      market: selected.exchange === "KSE" ? "KOSPI" : "KOSDAQ",
    });
    setQuery("");
    setSelected(null);
    setQty("");
    setAvgPrice("");
  }, [selected, qty, avgPrice, onAdd]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            placeholder="종목명 검색 (예: 삼성전자)"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {searching && (
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-lg overflow-hidden">
            {results.map((item) => (
              <button
                key={item.symbol}
                onClick={() => handleSelect(item)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-overlay)] transition-colors flex items-center justify-between"
              >
                <span className="text-[var(--text-primary)]">{item.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {item.symbol.replace(".KS", "").replace(".KQ", "")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">수량</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="10"
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-[var(--text-muted)] mb-0.5 block">평균매입가</label>
            <input
              type="number"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="50000"
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!qty}
            className="shrink-0 p-2 rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
