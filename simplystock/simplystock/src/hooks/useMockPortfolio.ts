"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockPrices } from "@/lib/api";
import { loadPortfolioFromDb, savePortfolioToDb, VersionConflictError } from "@/lib/portfolioDb";
import type { StockPrice } from "@/types";

const INITIAL_CASH = 10_000_000;

export interface Holding {
  qty: number;
  avgPrice: number;
  currentPrice: number;
  name: string;
}

export interface HistoryEntry {
  date: string;
  type: "buy" | "sell";
  symbol: string;
  name: string;
  qty: number;
  price: number;
}

export interface Portfolio {
  cash: number;
  holdings: Record<string, Holding>;
  settledAt: string | null;
  history: HistoryEntry[];
  version?: number;
}

function defaultPortfolio(): Portfolio {
  return { cash: INITIAL_CASH, holdings: {}, settledAt: null, history: [], version: 0 };
}

function todayKST(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    .toISOString()
    .slice(0, 10);
}

function isSettlementTime(): boolean {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).getHours() >= 18;
}

async function saveWithRetry(
  userId: string,
  portfolio: Portfolio,
  maxRetries: number,
  onConflict: (latest: Portfolio) => void,
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await savePortfolioToDb(userId, portfolio);
      return true;
    } catch (err) {
      if (err instanceof VersionConflictError) {
        onConflict(err.latestPortfolio);
        return false;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return false;
}

export function useMockPortfolio(userId: string | null) {
  const [portfolio, setPortfolioState] = useState<Portfolio>(defaultPortfolio);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const isSettlingRef = useRef(false);
  const portfolioRef = useRef(portfolio);
  portfolioRef.current = portfolio;

  const setPortfolio = useCallback((p: Portfolio) => {
    if (!userIdRef.current) return;
    setPortfolioState(p);
    setSaveFailed(false);
    saveWithRetry(
      userIdRef.current,
      p,
      2,
      (latest) => {
        setPortfolioState(latest);
      },
    ).then((ok) => {
      if (!ok) setSaveFailed(true);
    });
  }, []);

  // Firestore에서 로드
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await loadPortfolioFromDb(userId);
        if (cancelled) return;
        if (saved) {
          for (const [sym, h] of Object.entries(saved.holdings ?? {})) {
            if (!h.currentPrice) saved.holdings[sym] = { ...h, currentPrice: h.avgPrice };
          }
          setPortfolioState(saved);
        } else {
          const fresh = defaultPortfolio();
          setPortfolioState(fresh);
          await savePortfolioToDb(userId, fresh);
        }
      } catch {
        setPortfolioState(defaultPortfolio());
      }
      if (!cancelled) setInitialized(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const refreshPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setPricesLoading(true);
    try {
      const data = await fetchStockPrices(symbols);
      setPrices((prev) => ({ ...prev, ...data }));
    } catch {
      // silent
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // 18시 정산
  useEffect(() => {
    if (!initialized) return;
    const p = portfolioRef.current;
    const today = todayKST();
    if (p.settledAt !== today && isSettlementTime() && Object.keys(p.holdings).length > 0) {
      isSettlingRef.current = true;
      const symbols = Object.keys(p.holdings);

      const settle = async () => {
        try {
          let priceData = await fetchStockPrices(symbols);
          const missing = symbols.filter((s) => !priceData[s]);
          if (missing.length > 0) {
            await new Promise((r) => setTimeout(r, 3000));
            const retry = await fetchStockPrices(missing);
            priceData = { ...priceData, ...retry };
          }

          const holdings = { ...p.holdings };
          for (const [symbol, holding] of Object.entries(holdings)) {
            const stock = priceData[symbol];
            if (stock) holdings[symbol] = { ...holding, currentPrice: Math.round(stock.price) };
          }
          setPortfolio({ ...p, holdings, settledAt: today });
        } catch {
          // silent
        } finally {
          isSettlingRef.current = false;
        }
      };
      settle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // 30초마다 시세 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSettlingRef.current) return;
      const heldSymbols = Object.keys(portfolio.holdings);
      if (heldSymbols.length > 0) refreshPrices(heldSymbols);
    }, 30000);
    return () => clearInterval(interval);
  }, [portfolio.holdings, refreshPrices]);

  const placeOrder = useCallback(
    (symbol: string, name: string, type: "buy" | "sell", qty: number, orderPrice: number) => {
      const price = Math.round(orderPrice);
      const p = { ...portfolioRef.current, holdings: { ...portfolioRef.current.holdings } };

      if (type === "buy") {
        const cost = price * qty;
        if (p.cash < cost) throw new Error("잔액이 부족합니다.");
        p.cash -= cost;
        const existing = p.holdings[symbol];
        if (existing) {
          const totalQty = existing.qty + qty;
          const avgPrice = Math.round((existing.avgPrice * existing.qty + price * qty) / totalQty);
          p.holdings[symbol] = { qty: totalQty, avgPrice, currentPrice: price, name };
        } else {
          p.holdings[symbol] = { qty, avgPrice: price, currentPrice: price, name };
        }
      } else {
        const existing = p.holdings[symbol];
        if (!existing || existing.qty < qty) throw new Error("보유 수량이 부족합니다.");
        p.cash += price * qty;
        const remaining = existing.qty - qty;
        if (remaining === 0) delete p.holdings[symbol];
        else p.holdings[symbol] = { ...existing, qty: remaining };
      }

      p.history = [...(p.history ?? []), { date: todayKST(), type, symbol, name, qty, price }];
      setPortfolio(p);
    },
    [setPortfolio],
  );

  const resetPortfolio = useCallback(() => {
    const fresh = defaultPortfolio();
    setPortfolio(fresh);
    setPrices({});
  }, [setPortfolio]);

  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [symbol, h]) => {
    const px = prices[symbol]?.price ?? h.currentPrice;
    return sum + px * h.qty;
  }, 0);
  const totalAsset = portfolio.cash + holdingsValue;
  const returnPct = ((totalAsset - INITIAL_CASH) / INITIAL_CASH) * 100;

  return {
    portfolio,
    prices,
    pricesLoading,
    initialized,
    saveFailed,
    holdingsValue,
    totalAsset,
    returnPct,
    refreshPrices,
    placeOrder,
    resetPortfolio,
  };
}
