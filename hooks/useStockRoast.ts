"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchStockRoast } from "@/lib/stockRoastApi";
import { searchStocks } from "@/lib/stockSearchApi";
import type { StockRoastResult } from "@/types";

export interface StockOption {
  symbol: string;
  name: string;
}

export function useStockRoast() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StockOption | null>(null);
  const [suggestions, setSuggestions] = useState<StockOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StockRoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 API 검색
  useEffect(() => {
    if (selected || !query.trim() || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        setSuggestions(results.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const selectStock = useCallback((stock: StockOption) => {
    setSelected(stock);
    setQuery(stock.name);
    setResult(null);
    setError(null);
  }, []);

  // 종목 선택 시 자동으로 시세+뉴스 로딩
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setResult(null);

    fetchStockRoast(selected.symbol, selected.name)
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "조회 실패"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [selected]);

  const reset = useCallback(() => {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    selected,
    selectStock,
    isLoading,
    result,
    error,
    reset,
  };
}
