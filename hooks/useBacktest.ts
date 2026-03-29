import { useState, useCallback } from "react";
import { fetchStockChart } from "@/lib/stockChartApi";
import type { BacktestStock, BacktestResult, ChartRange, Candle } from "@/types";

function toDateStr(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calculateBacktest(
  stockCandles: Record<string, Candle[]>,
  kospiCandles: Candle[],
  totalAmount: number,
): BacktestResult {
  const symbols = Object.keys(stockCandles);
  const perStock = totalAmount;

  // 날짜 문자열(YYYY-MM-DD) 기준 매핑 — 미장/한국장 시간대 차이로 인한 타임스탬프 불일치 해소
  const stockMap: Record<string, Map<string, number>> = {};
  for (const sym of symbols) {
    const m = new Map<string, number>();
    stockCandles[sym].forEach((c) => m.set(toDateStr(c.time), c.close));
    stockMap[sym] = m;
  }
  const kospiMap = new Map<string, number>();
  kospiCandles.forEach((c) => kospiMap.set(toDateStr(c.time), c.close));

  // 모든 날짜 수집
  const allDates = new Set<string>();
  for (const sym of symbols) {
    for (const key of stockMap[sym].keys()) allDates.add(key);
  }
  for (const key of kospiMap.keys()) allDates.add(key);
  const sortedDates = [...allDates].sort();

  // 모든 종목 + KOSPI가 존재하는 날짜만 필터
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
      finalAmount: totalAmount,
    };
  }

  // 첫째 날 기준 매수 수량
  const firstDate = validDates[0];
  const shares: Record<string, number> = {};
  for (const sym of symbols) {
    const price = stockMap[sym].get(firstDate)!;
    shares[sym] = perStock / price;
  }
  const kospiShares = (totalAmount * symbols.length) / kospiMap.get(firstDate)!;

  // 일별 가치 계산
  const dailyValues: { date: string; value: number }[] = [];
  const kospiValues: { date: string; value: number }[] = [];
  const stockValueArrays: Record<string, { date: string; value: number }[]> = {};
  for (const sym of symbols) stockValueArrays[sym] = [];

  let peak = 0;
  let maxDrawdown = 0;

  for (const dateStr of validDates) {
    // 포트폴리오 가치
    let portfolioValue = 0;
    for (const sym of symbols) {
      const price = stockMap[sym].get(dateStr)!;
      const stockValue = shares[sym] * price;
      portfolioValue += stockValue;
      stockValueArrays[sym].push({ date: dateStr, value: stockValue });
    }
    dailyValues.push({ date: dateStr, value: portfolioValue });

    // KOSPI 가치
    const kospiValue = kospiShares * kospiMap.get(dateStr)!;
    kospiValues.push({ date: dateStr, value: kospiValue });

    // MDD
    if (portfolioValue > peak) peak = portfolioValue;
    const drawdown = (peak - portfolioValue) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const initial = dailyValues[0].value;
  const final = dailyValues[dailyValues.length - 1].value;
  const totalReturnPct = ((final - initial) / initial) * 100;

  const kospiInitial = kospiValues[0].value;
  const kospiFinal = kospiValues[kospiValues.length - 1].value;
  const kospiReturnPct = ((kospiFinal - kospiInitial) / kospiInitial) * 100;

  // CAGR (252 거래일 기준)
  const years = validDates.length / 252;
  const cagrPct = years > 0 ? (Math.pow(final / initial, 1 / years) - 1) * 100 : 0;

  // 개별 종목 수익률
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
    finalAmount: final,
  };
}

export interface CustomPeriod {
  from: string; // YYYY-MM-DD
  to: string;
}

export function useBacktest() {
  const [stocks, setStocks] = useState<BacktestStock[]>([]);
  const [amount, setAmount] = useState(10_000_000);
  const [range, setRange] = useState<ChartRange | "custom">("6mo");
  const [customPeriod, setCustomPeriod] = useState<CustomPeriod>({ from: "", to: "" });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStock = useCallback((stock: BacktestStock) => {
    setStocks((prev) => {
      if (prev.length >= 3 || prev.some((s) => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });
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
      // 커스텀 기간 처리
      let period: { from: number; to: number } | undefined;
      let rangeParam: ChartRange = "6mo";

      if (range === "custom") {
        if (!customPeriod.from || !customPeriod.to) {
          setError("시작일과 종료일을 모두 입력하세요");
          setIsLoading(false);
          return;
        }
        const fromTs = Math.floor(new Date(customPeriod.from).getTime() / 1000);
        const toTs = Math.floor(new Date(customPeriod.to).getTime() / 1000) + 86400; // 종료일 포함
        if (fromTs >= toTs) {
          setError("시작일이 종료일보다 이전이어야 합니다");
          setIsLoading(false);
          return;
        }
        period = { from: fromTs, to: toTs };
      } else {
        rangeParam = range;
      }

      // 종목 + KOSPI 캔들 병렬 fetch
      const [kospiRes, ...stockResults] = await Promise.all([
        fetchStockChart("^KS11", rangeParam, "1d", period),
        ...stocks.map((s) => fetchStockChart(s.symbol, rangeParam, "1d", period)),
      ]);

      const stockCandles: Record<string, Candle[]> = {};
      stocks.forEach((s, i) => {
        stockCandles[s.symbol] = stockResults[i].candles;
      });

      const backtestResult = calculateBacktest(stockCandles, kospiRes.candles, amount);
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "백테스트 실행 실패");
    } finally {
      setIsLoading(false);
    }
  }, [stocks, amount, range, customPeriod]);

  return {
    stocks,
    amount,
    range,
    customPeriod,
    result,
    isLoading,
    error,
    addStock,
    removeStock,
    setAmount,
    setRange: setRange as (r: ChartRange | "custom") => void,
    setCustomPeriod,
    runBacktest,
  };
}
