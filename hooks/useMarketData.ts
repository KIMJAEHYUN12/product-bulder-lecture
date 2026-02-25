"use client";

import { useState, useEffect } from "react";

export interface FearGreedData {
  value: number;
  label: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

export interface EconEvent {
  date: string;
  event: string;
  tag: string;
  hot: boolean;
}

export interface MarketData {
  fearGreed: FearGreedData | null;
  news: string[];
  econCalendar: EconEvent[];
  isLoading: boolean;
}

const MARKET_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  "https://market-cryqnhf6fq-uc.a.run.app";

export function useMarketData(): MarketData {
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [news, setNews] = useState<string[]>([]);
  const [econCalendar, setEconCalendar] = useState<EconEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(MARKET_URL)
      .then((r) => r.json())
      .then((d) => {
        if (d.fearGreed) setFearGreed(d.fearGreed);
        if (d.news?.length > 0) setNews(d.news);
        if (d.econCalendar?.length > 0) setEconCalendar(d.econCalendar);
      })
      .catch((err) => console.warn("Market data fetch failed:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return { fearGreed, news, econCalendar, isLoading };
}
