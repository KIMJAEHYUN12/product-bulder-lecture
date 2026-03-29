"use client";

import { useState, useCallback } from "react";
import { fetchStockChart } from "@/lib/api";
import type { BacktestStock, BacktestResult, ChartRange, Candle, InvestMode } from "@/types";

function toDateStr(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calculateBacktest(
  stockCandles: Record<string, Candle[]>,
  kospiCandles: Candle[],
  amount: number,
  investMode: InvestMode,
): BacktestResult {
  const symbols = Object.keys(stockCandles);
  const perStock = amount / symbols.length;

  // 날짜 문자열(YYYY-MM-DD) 기준 매핑 — 미장/한국장 시간대 차이로 인한 타임스탬프 불일치 해소
  const stockMap: Record<string, Map<string, number>> = {};
  for (const sym of symbols) {
    const m = new Map<string, number>();
    stockCandles[sym].forEach((c) => m.set(toDateStr(c.time), c.close));
    stockMap[sym] = m;
  }
  const kospiMap = new Map<string, number>();
  kospiCandles.forEach((c) => kospiMap.set(toDateStr(c.time), c.close));

  const allDates = new Set<string>();
  for (const sym of symbols) {
    for (const key of stockMap[sym].keys()) allDates.add(key);
  }
  for (const key of kospiMap.keys()) allDates.add(key);
  const sortedDates = [...allDates].sort();

  const validDates = sortedDates.filter((d) => {
    if (!kospiMap.has(d)) return false;
    return symbols.every((sym) => stockMap[sym].has(d));
  });

  if (validDates.length < 2) {
    return {
      dailyValues: [],
      kospiValues: [],
      stockValues: {},
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      cagrPct: 0,
      kospiReturnPct: 0,
      stockReturns: {},
      finalAmount: amount,
      investMode,
      totalInvested: amount,
      investedValues: [],
    };
  }

  // ── Lump sum (기존 방식) ──
  if (investMode === "lump") {
    const firstDate = validDates[0];
    const shares: Record<string, number> = {};
    for (const sym of symbols) {
      shares[sym] = perStock / stockMap[sym].get(firstDate)!;
    }
    const kospiShares = amount / kospiMap.get(firstDate)!;

    const dailyValues: { date: string; value: number }[] = [];
    const kospiValues: { date: string; value: number }[] = [];
    const stockValueArrays: Record<string, { date: string; value: number }[]> = {};
    for (const sym of symbols) stockValueArrays[sym] = [];

    let peak = 0;
    let maxDrawdown = 0;

    for (const dateStr of validDates) {
      let portfolioValue = 0;
      for (const sym of symbols) {
        const price = stockMap[sym].get(dateStr)!;
        const stockValue = shares[sym] * price;
        portfolioValue += stockValue;
        stockValueArrays[sym].push({ date: dateStr, value: stockValue });
      }
      dailyValues.push({ date: dateStr, value: portfolioValue });
      const kospiValue = kospiShares * kospiMap.get(dateStr)!;
      kospiValues.push({ date: dateStr, value: kospiValue });
      if (portfolioValue > peak) peak = portfolioValue;
      const drawdown = (peak - portfolioValue) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const initial = dailyValues[0].value;
    const final_ = dailyValues[dailyValues.length - 1].value;
    const totalReturnPct = ((final_ - initial) / initial) * 100;
    const kospiInitial = kospiValues[0].value;
    const kospiFinal = kospiValues[kospiValues.length - 1].value;
    const kospiReturnPct = ((kospiFinal - kospiInitial) / kospiInitial) * 100;
    const years = validDates.length / 252;
    const cagrPct = years > 0 ? (Math.pow(final_ / initial, 1 / years) - 1) * 100 : 0;

    const stockReturns: Record<string, number> = {};
    for (const sym of symbols) {
      const arr = stockValueArrays[sym];
      if (arr.length >= 2) {
        stockReturns[sym] = ((arr[arr.length - 1].value - arr[0].value) / arr[0].value) * 100;
      } else {
        stockReturns[sym] = 0;
      }
    }

    return {
      dailyValues,
      kospiValues,
      stockValues: stockValueArrays,
      totalReturnPct,
      maxDrawdownPct: maxDrawdown * 100,
      cagrPct,
      kospiReturnPct,
      stockReturns,
      finalAmount: final_,
      investMode,
      totalInvested: amount,
      investedValues: [],
    };
  }

  // ── DCA (monthly / daily) ──
  const shares: Record<string, number> = {};
  for (const sym of symbols) shares[sym] = 0;
  let kospiShares = 0;
  let totalInvested = 0;
  let lastMonth = "";

  const dailyValues: { date: string; value: number }[] = [];
  const kospiValues: { date: string; value: number }[] = [];
  const investedValues: { date: string; value: number }[] = [];
  const stockValueArrays: Record<string, { date: string; value: number }[]> = {};
  for (const sym of symbols) stockValueArrays[sym] = [];

  // Modified Dietz용 캐시플로우 기록
  const cashflows: { dayIndex: number; amount: number }[] = [];
  // 종목별 누적 투입금 추적
  const stockInvested: Record<string, number> = {};
  for (const sym of symbols) stockInvested[sym] = 0;

  let peak = 0;
  let maxDrawdown = 0;

  for (let i = 0; i < validDates.length; i++) {
    const dateStr = validDates[i];
    const currentMonth = dateStr.slice(0, 7);

    // 매수 조건 판단
    let shouldBuy = false;
    if (investMode === "daily") {
      shouldBuy = true;
    } else if (investMode === "monthly") {
      if (currentMonth !== lastMonth) {
        shouldBuy = true;
        lastMonth = currentMonth;
      }
    }

    if (shouldBuy) {
      for (const sym of symbols) {
        const price = stockMap[sym].get(dateStr)!;
        shares[sym] += perStock / price;
        stockInvested[sym] += perStock;
      }
      const kospiPrice = kospiMap.get(dateStr)!;
      kospiShares += amount / kospiPrice;
      totalInvested += amount;
      cashflows.push({ dayIndex: i, amount });
    }

    // 포트폴리오 평가
    let portfolioValue = 0;
    for (const sym of symbols) {
      const price = stockMap[sym].get(dateStr)!;
      const stockValue = shares[sym] * price;
      portfolioValue += stockValue;
      stockValueArrays[sym].push({ date: dateStr, value: stockValue });
    }
    dailyValues.push({ date: dateStr, value: portfolioValue });
    investedValues.push({ date: dateStr, value: totalInvested });

    const kospiValue = kospiShares * kospiMap.get(dateStr)!;
    kospiValues.push({ date: dateStr, value: kospiValue });

    if (portfolioValue > peak) peak = portfolioValue;
    if (peak > 0) {
      const drawdown = (peak - portfolioValue) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  const final_ = dailyValues[dailyValues.length - 1].value;
  const totalReturnPct = totalInvested > 0 ? ((final_ - totalInvested) / totalInvested) * 100 : 0;

  // KOSPI도 동일 방식
  const kospiFinal = kospiValues[kospiValues.length - 1].value;
  const kospiInvested = totalInvested; // 동일 금액 투입
  const kospiReturnPct = kospiInvested > 0 ? ((kospiFinal - kospiInvested) / kospiInvested) * 100 : 0;

  // Modified Dietz CAGR
  const totalDays = validDates.length;
  const years = totalDays / 252;
  let cagrPct = 0;
  if (years > 0 && totalInvested > 0) {
    let weightedInvested = 0;
    for (const cf of cashflows) {
      const weight = (totalDays - cf.dayIndex) / totalDays;
      weightedInvested += cf.amount * weight;
    }
    if (weightedInvested > 0) {
      const modifiedReturn = (final_ - totalInvested) / weightedInvested;
      cagrPct = (Math.pow(1 + modifiedReturn, 1 / years) - 1) * 100;
    }
  }

  // 종목별 수익률 (투입 대비)
  const stockReturns: Record<string, number> = {};
  for (const sym of symbols) {
    const arr = stockValueArrays[sym];
    const invested = stockInvested[sym];
    if (arr.length > 0 && invested > 0) {
      stockReturns[sym] = ((arr[arr.length - 1].value - invested) / invested) * 100;
    } else {
      stockReturns[sym] = 0;
    }
  }

  return {
    dailyValues,
    kospiValues,
    stockValues: stockValueArrays,
    totalReturnPct,
    maxDrawdownPct: maxDrawdown * 100,
    cagrPct,
    kospiReturnPct,
    stockReturns,
    finalAmount: final_,
    investMode,
    totalInvested,
    investedValues,
  };
}

export interface CustomPeriod {
  from: string;
  to: string;
}

export function useBacktest() {
  const [stocks, setStocks] = useState<BacktestStock[]>([]);
  const [amount, setAmount] = useState(10_000_000);
  const [range, setRange] = useState<ChartRange | "custom">("6mo");
  const [customPeriod, setCustomPeriod] = useState<CustomPeriod>({ from: "", to: "" });
  const [investMode, setInvestMode] = useState<InvestMode>("lump");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStock = useCallback((stock: BacktestStock) => {
    setStocks((prev) => {
      if (prev.length >= 3 || prev.some((s) => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });
    setResult(null);
  }, []);

  const removeStock = useCallback((symbol: string) => {
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    setResult(null);
  }, []);

  const runBacktest = useCallback(async () => {
    if (stocks.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let period: { from: number; to: number } | undefined;
      let rangeParam: ChartRange = "6mo";

      if (range === "custom") {
        if (!customPeriod.from || !customPeriod.to) {
          setError("시작일과 종료일을 모두 입력하세요");
          setIsLoading(false);
          return;
        }
        const fromTs = Math.floor(new Date(customPeriod.from).getTime() / 1000);
        const toTs = Math.floor(new Date(customPeriod.to).getTime() / 1000) + 86400;
        if (fromTs >= toTs) {
          setError("시작일이 종료일보다 이전이어야 합니다");
          setIsLoading(false);
          return;
        }
        period = { from: fromTs, to: toTs };
      } else {
        rangeParam = range;
      }

      const [kospiRes, ...stockResults] = await Promise.all([
        fetchStockChart("^KS11", rangeParam, "1d", period),
        ...stocks.map((s) => fetchStockChart(s.symbol, rangeParam, "1d", period)),
      ]);

      const stockCandles: Record<string, Candle[]> = {};
      stocks.forEach((s, i) => {
        stockCandles[s.symbol] = stockResults[i].candles;
      });

      const backtestResult = calculateBacktest(stockCandles, kospiRes.candles, amount, investMode);
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "백테스트 실행 실패");
    } finally {
      setIsLoading(false);
    }
  }, [stocks, amount, range, customPeriod, investMode]);

  return {
    stocks,
    amount,
    range,
    customPeriod,
    investMode,
    result,
    isLoading,
    error,
    addStock,
    removeStock,
    setAmount,
    setRange: setRange as (r: ChartRange | "custom") => void,
    setCustomPeriod,
    setInvestMode,
    runBacktest,
  };
}
