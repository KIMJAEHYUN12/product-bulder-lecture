"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockPrices, type StockPrice } from "@/lib/stockPricesApi";
import { loadWatchlistFromDb, saveWatchlistToDb } from "@/lib/watchlistDb";

const STORAGE_KEY = "ovision_watchlist";
const MAX_ITEMS = 50;
const REFRESH_INTERVAL = 60_000; // 1분

export interface WatchlistItem {
  symbol: string;
  name: string;
}

function loadLocal(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLocal(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** 두 리스트를 병합 (중복 symbol 제거, Firestore 우선) */
function mergeItems(dbItems: WatchlistItem[], localItems: WatchlistItem[]): WatchlistItem[] {
  const map = new Map<string, WatchlistItem>();
  for (const item of dbItems) map.set(item.symbol, item);
  for (const item of localItems) {
    if (!map.has(item.symbol)) map.set(item.symbol, item);
  }
  return Array.from(map.values()).slice(0, MAX_ITEMS);
}

export function useWatchlist(userId?: string | null) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  // 초기 로드: 로그인 → Firestore + localStorage 병합, 비로그인 → localStorage
  useEffect(() => {
    initializedRef.current = false;
    let cancelled = false;

    async function init() {
      if (userId) {
        try {
          const [dbItems, localItems] = await Promise.all([
            loadWatchlistFromDb(userId),
            Promise.resolve(loadLocal()),
          ]);
          if (cancelled) return;
          const merged = mergeItems(dbItems, localItems);
          setItems(merged);
          // localStorage에만 있던 항목이 있으면 Firestore에 병합 저장
          if (localItems.length > 0 && merged.length !== dbItems.length) {
            await saveWatchlistToDb(userId, merged);
          }
          // localStorage도 병합 결과로 동기화 (캐시 역할)
          saveLocal(merged);
        } catch {
          // Firestore 실패 시 localStorage 폴백
          if (!cancelled) setItems(loadLocal());
        }
      } else {
        setItems(loadLocal());
      }
      if (!cancelled) initializedRef.current = true;
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  // 가격 조회
  const refreshPrices = useCallback(async (list: WatchlistItem[]) => {
    if (list.length === 0) return;
    setLoading(true);
    try {
      const symbols = list.map((i) => i.symbol);
      const data = await fetchStockPrices(symbols);
      setPrices(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // items 변경 시 가격 갱신 + 주기적 갱신
  useEffect(() => {
    refreshPrices(items);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (items.length > 0) {
      intervalRef.current = setInterval(() => refreshPrices(items), REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items, refreshPrices]);

  // 저장 헬퍼: localStorage는 항상 캐시로 유지
  const persist = useCallback((next: WatchlistItem[]) => {
    saveLocal(next);
    if (userId) {
      saveWatchlistToDb(userId, next).catch(() => {});
    }
  }, [userId]);

  const addItem = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) return prev;
      if (prev.some((i) => i.symbol === item.symbol)) return prev;
      const next = [...prev, item];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeItem = useCallback((symbol: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.symbol !== symbol);
      persist(next);
      return next;
    });
  }, [persist]);

  return { items, prices, loading, addItem, removeItem, isFull: items.length >= MAX_ITEMS };
}
