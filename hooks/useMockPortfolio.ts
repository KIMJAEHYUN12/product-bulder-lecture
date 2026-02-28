"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockPrices, StockPrice } from "@/lib/stockPricesApi";
import { loadPortfolioFromDb, savePortfolioToDb } from "@/lib/portfolioDb";

const STORAGE_KEY = "ovision_mock_portfolio";
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
}

function defaultPortfolio(): Portfolio {
  return { cash: INITIAL_CASH, holdings: {}, settledAt: null, history: [] };
}

function loadLocalPortfolio(): Portfolio {
  if (typeof window === "undefined") return defaultPortfolio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPortfolio();
    const p = JSON.parse(raw) as Portfolio;
    if ("pendingOrders" in p) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldPending: Array<{ type: string }> = (p as any).pendingOrders ?? [];
      if (oldPending.some((o) => o.type === "buy") && Object.keys(p.holdings ?? {}).length === 0) {
        p.cash = INITIAL_CASH;
      }
      delete (p as Record<string, unknown>).pendingOrders;
    }
    for (const [sym, h] of Object.entries(p.holdings ?? {})) {
      if (!h.currentPrice) p.holdings[sym] = { ...h, currentPrice: h.avgPrice };
    }
    return p;
  } catch {
    return defaultPortfolio();
  }
}

function saveLocalPortfolio(p: Portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function todayKST(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    .toISOString()
    .slice(0, 10);
}

function isSettlementTime(): boolean {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).getHours() >= 18;
}

export function useMockPortfolio(userId?: string | null) {
  const [portfolio, setPortfolioState] = useState<Portfolio>(defaultPortfolio);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // 저장 (로그인 여부에 따라 Firestore 또는 localStorage)
  const setPortfolio = useCallback((p: Portfolio) => {
    setPortfolioState(p);
    if (userId) {
      savePortfolioToDb(userId, p).catch(() => saveLocalPortfolio(p));
    } else {
      saveLocalPortfolio(p);
    }
  }, [userId]);

  // 포트폴리오 로드 (userId 바뀔 때마다 재실행)
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    setInitialized(false);

    if (userId) {
      // 로그인 상태: Firestore에서 로드, 없으면 신규 포트폴리오 초기화
      loadPortfolioFromDb(userId).then((dbPortfolio) => {
        if (dbPortfolio) {
          // Firestore 문서에 필드 누락 방어
          setPortfolioState({
            ...defaultPortfolio(),
            ...dbPortfolio,
            holdings: dbPortfolio.holdings ?? {},
            history: dbPortfolio.history ?? [],
          });
        } else {
          // 신규 계정: 항상 빈 포트폴리오로 시작 (다른 계정 localStorage 오염 방지)
          const fresh = defaultPortfolio();
          setPortfolioState(fresh);
          savePortfolioToDb(userId, fresh).catch(() => {});
        }
        setInitialized(true);
      }).catch(() => {
        setPortfolioState(defaultPortfolio());
        setInitialized(true);
      });
    } else {
      // 비로그인: localStorage
      setPortfolioState(loadLocalPortfolio());
      setInitialized(true);
    }
  }, [userId]);

  const refreshPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setPricesLoading(true);
    try {
      const data = await fetchStockPrices(symbols);
      setPrices((prev) => ({ ...prev, ...data }));
    } catch {
      // 시세 로드 실패 — 조용히 무시 (unhandled rejection 방지)
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // 18시 정산
  const runSettlement = useCallback(async (p: Portfolio): Promise<Portfolio> => {
    const symbols = Object.keys(p.holdings);
    if (symbols.length === 0) return { ...p, settledAt: todayKST() };
    let priceData: Record<string, StockPrice> = {};
    try { priceData = await fetchStockPrices(symbols); } catch { return p; }
    const holdings = { ...p.holdings };
    for (const [symbol, holding] of Object.entries(holdings)) {
      const stock = priceData[symbol];
      if (stock) holdings[symbol] = { ...holding, currentPrice: Math.round(stock.price) };
    }
    return { ...p, holdings, settledAt: todayKST() };
  }, []);

  // 18시 이후 자동 정산
  useEffect(() => {
    if (!initialized) return;
    const p = userId ? portfolio : loadLocalPortfolio();
    const today = todayKST();
    if (p.settledAt !== today && isSettlementTime() && Object.keys(p.holdings).length > 0) {
      setSettling(true);
      runSettlement(p).then((updated) => {
        setPortfolio(updated);
        setSettling(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // 30초마다 보유 종목 시세 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      const heldSymbols = Object.keys(portfolio.holdings);
      if (heldSymbols.length > 0) refreshPrices(heldSymbols);
    }, 30000);
    return () => clearInterval(interval);
  }, [portfolio.holdings, refreshPrices]);

  // 즉시 체결
  const placeOrder = useCallback(
    (symbol: string, name: string, type: "buy" | "sell", qty: number) => {
      const currentPrice = prices[symbol]?.price;
      if (!currentPrice) throw new Error("현재가를 불러올 수 없습니다.");
      const price = Math.round(currentPrice);
      const p = { ...portfolio, holdings: { ...portfolio.holdings } };

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
    [prices, portfolio, setPortfolio]
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
    settling,
    initialized,
    holdingsValue,
    totalAsset,
    returnPct,
    refreshPrices,
    placeOrder,
    resetPortfolio,
  };
}
