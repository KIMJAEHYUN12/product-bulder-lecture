"use client";

import { useState, useEffect, useCallback } from "react";
import type { CapitalMarketData, CapitalMarketSeries } from "@/types/capitalMarket";
import { fetchCapitalMarket, fetchCapitalMarketSeries } from "@/lib/capitalMarketApi";

export function useCapitalMarket() {
  const [data, setData] = useState<CapitalMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCapitalMarket();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useCapitalMarketSeries() {
  const [series, setSeries] = useState<CapitalMarketSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (type: string, key: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCapitalMarketSeries(type, key);
      setSeries(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "시계열 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSeries(null);
    setError(null);
  }, []);

  return { series, loading, error, load, clear };
}
