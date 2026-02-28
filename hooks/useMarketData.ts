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
  url?: string;
}

export interface CommodityItem {
  key: string;
  name: string;
  price: number;
  changePct: number;
  currency: string;
  note: string;
}

export interface NewsItem {
  title: string;
  url: string;
}

export interface MarketData {
  fearGreed: FearGreedData | null;
  news: NewsItem[];
  econCalendar: EconEvent[];
  commodities: CommodityItem[];
  kimComment: string;
  isLoading: boolean;
}

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const MARKET_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  `${FIREBASE_HOST}/api/market`;

export function useMarketData(): MarketData {
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [econCalendar, setEconCalendar] = useState<EconEvent[]>([]);
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [kimComment, setKimComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    fetch(MARKET_URL, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.fearGreed) setFearGreed(d.fearGreed);
        if (d.news?.length > 0) setNews(d.news);
        if (d.econCalendar?.length > 0) setEconCalendar(d.econCalendar);
        if (d.commodities?.length > 0) setCommodities(d.commodities);
        if (d.kimComment) setKimComment(d.kimComment);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return { fearGreed, news, econCalendar, commodities, kimComment, isLoading };
}
