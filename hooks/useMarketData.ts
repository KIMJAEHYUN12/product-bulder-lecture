"use client";

import { useState, useEffect } from "react";

export interface FearGreedData {
  value: number;
  label: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

export interface MarketData {
  fearGreed: FearGreedData | null;
  news: string[];
  isLoading: boolean;
}

const MARKET_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  "https://market-cryqnhf6fq-uc.a.run.app";

export function useMarketData(): MarketData {
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [news, setNews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(MARKET_URL)
      .then((r) => r.json())
      .then((d) => {
        if (d.fearGreed) setFearGreed(d.fearGreed);
        if (d.news?.length > 0) setNews(d.news);
      })
      .catch((err) => console.warn("Market data fetch failed:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return { fearGreed, news, isLoading };
}
