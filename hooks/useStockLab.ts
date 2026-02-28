"use client";

import { useState, useCallback, useRef } from "react";
import { fetchStockChart } from "@/lib/stockChartApi";
import { fetchStockPrices, type StockPrice } from "@/lib/stockPricesApi";
import { fetchStockRoast } from "@/lib/stockRoastApi";
import { streamStockBriefing } from "@/lib/stockBriefingApi";
import { fetchInvestorTrend } from "@/lib/investorTrendApi";
import { findSectorPeers, getIndustry, type StockSearchResult } from "@/lib/stockSearchApi";
import type {
  StockChartResponse,
  StockNewsItem,
  StockBriefingResponse,
  InvestorTrendData,
  ChartRange,
  Candle,
} from "@/types";

export interface StockLabStock {
  symbol: string;
  name: string;
}

export interface StockLabState {
  stocks: StockLabStock[];
  chartDataMap: Record<string, StockChartResponse>;
  priceMap: Record<string, StockPrice>;
  newsMap: Record<string, StockNewsItem[]>;
  range: ChartRange;
  briefing: string | null;
  briefingResult: StockBriefingResponse | null;
  isBriefingStreaming: boolean;
  isLoadingChart: boolean;
  investorMap: Record<string, InvestorTrendData>;
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoadingInvestor: boolean;
  isLoadingSector: boolean;
  error: string | null;
}

function buildChartSummary(candles: Candle[], name: string): string {
  if (candles.length === 0) return `${name}: 데이터 없음`;
  const first = candles[0];
  const last = candles[candles.length - 1];
  const changePct = ((last.close - first.close) / first.close * 100).toFixed(1);
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const recent5 = candles.slice(-5);
  const recentTrend = recent5.length > 1
    ? recent5[recent5.length - 1].close > recent5[0].close ? "상승" : "하락"
    : "N/A";
  return `${name}: 현재가 ${last.close.toLocaleString()}원, 기간등락률 ${changePct}%, 고가 ${high.toLocaleString()}, 저가 ${low.toLocaleString()}, 최근5일 ${recentTrend}`;
}

export function useStockLab() {
  const [state, setState] = useState<StockLabState>({
    stocks: [],
    chartDataMap: {},
    priceMap: {},
    newsMap: {},
    range: "3mo",
    briefing: null,
    briefingResult: null,
    isBriefingStreaming: false,
    isLoadingChart: false,
    investorMap: {},
    sectorPeers: {},
    sectorPriceMap: {},
    isLoadingInvestor: false,
    isLoadingSector: false,
    error: null,
  });

  const loadingRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addStock = useCallback(async (stock: StockLabStock) => {
    setState((prev) => {
      if (prev.stocks.length >= 3) return prev;
      if (prev.stocks.some((s) => s.symbol === stock.symbol)) return prev;
      return {
        ...prev,
        stocks: [...prev.stocks, stock],
        isLoadingChart: true,
        error: null,
        briefing: null,
        briefingResult: null,
      };
    });

    try {
      const [chartData, priceData, newsData] = await Promise.all([
        fetchStockChart(stock.symbol, state.range),
        fetchStockPrices([stock.symbol]),
        fetchStockRoast(stock.symbol, stock.name),
      ]);

      setState((prev) => ({
        ...prev,
        chartDataMap: { ...prev.chartDataMap, [stock.symbol]: chartData },
        priceMap: { ...prev.priceMap, ...priceData },
        newsMap: { ...prev.newsMap, [stock.symbol]: newsData.news },
        isLoadingChart: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingChart: false,
        error: err instanceof Error ? err.message : "데이터 로딩 실패",
      }));
    }
  }, [state.range]);

  const removeStock = useCallback((symbol: string) => {
    setState((prev) => {
      const { [symbol]: _chart, ...restChart } = prev.chartDataMap;
      const { [symbol]: _price, ...restPrice } = prev.priceMap;
      const { [symbol]: _news, ...restNews } = prev.newsMap;
      const { [symbol]: _inv, ...restInv } = prev.investorMap;
      const { [symbol]: _sec, ...restSec } = prev.sectorPeers;
      return {
        ...prev,
        stocks: prev.stocks.filter((s) => s.symbol !== symbol),
        chartDataMap: restChart,
        priceMap: restPrice,
        newsMap: restNews,
        investorMap: restInv,
        sectorPeers: restSec,
        briefing: null,
        briefingResult: null,
      };
    });
  }, []);

  const setRange = useCallback(async (range: ChartRange) => {
    setState((prev) => ({ ...prev, range, isLoadingChart: true, error: null }));

    // Need to read current stocks from state
    setState((prev) => {
      const stocks = prev.stocks;
      if (stocks.length === 0) return { ...prev, isLoadingChart: false };

      // Fire off fetch in a microtask
      Promise.all(
        stocks.map((s) => fetchStockChart(s.symbol, range))
      ).then((results) => {
        setState((p) => {
          const chartDataMap = { ...p.chartDataMap };
          stocks.forEach((s, i) => {
            chartDataMap[s.symbol] = results[i];
          });
          return { ...p, chartDataMap, isLoadingChart: false };
        });
      }).catch((err) => {
        setState((p) => ({
          ...p,
          isLoadingChart: false,
          error: err instanceof Error ? err.message : "차트 로딩 실패",
        }));
      });

      return prev;
    });
  }, []);

  const requestBriefing = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setState((prev) => ({
      ...prev,
      briefing: null,
      briefingResult: null,
      isBriefingStreaming: true,
      error: null,
    }));

    // stateRef에서 현재 상태 직접 읽기 (React 18 batching 안전)
    const { stocks: currentStocks, chartDataMap: currentChartDataMap, newsMap: currentNewsMap } = stateRef.current;

    const stocksPayload = currentStocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      chartSummary: currentChartDataMap[s.symbol]
        ? buildChartSummary(currentChartDataMap[s.symbol].candles, s.name)
        : "",
    }));

    const newsPayload = currentStocks.map((s) => ({
      stockName: s.name,
      headlines: (currentNewsMap[s.symbol] || []).map((n) => n.title),
    }));

    const mode = currentStocks.length === 1 ? "single" : "compare";

    await streamStockBriefing(
      stocksPayload,
      newsPayload,
      mode,
      (partial) => {
        setState((prev) => ({ ...prev, briefing: partial }));
      },
      (result) => {
        setState((prev) => ({
          ...prev,
          briefingResult: result,
          briefing: result.briefing,
          isBriefingStreaming: false,
        }));
        loadingRef.current = false;
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          isBriefingStreaming: false,
          error: err.message,
        }));
        loadingRef.current = false;
      },
    );
  }, []);

  const loadInvestorTrend = useCallback(async (symbol: string) => {
    if (stateRef.current.investorMap[symbol]) return;
    setState((prev) => ({ ...prev, isLoadingInvestor: true }));
    try {
      const data = await fetchInvestorTrend(symbol);
      setState((prev) => ({
        ...prev,
        investorMap: { ...prev.investorMap, [symbol]: data },
        isLoadingInvestor: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingInvestor: false,
        error: err instanceof Error ? err.message : "투자자 데이터 로딩 실패",
      }));
    }
  }, []);

  const loadSectorComparison = useCallback(async (symbol: string) => {
    if (stateRef.current.sectorPeers[symbol]) return;
    setState((prev) => ({ ...prev, isLoadingSector: true }));
    try {
      const peers = findSectorPeers(symbol, 5);
      if (peers.length === 0) {
        setState((prev) => ({
          ...prev,
          sectorPeers: { ...prev.sectorPeers, [symbol]: [] },
          isLoadingSector: false,
        }));
        return;
      }
      const peerSymbols = peers.map((p) => p.symbol);
      const prices = await fetchStockPrices(peerSymbols);
      setState((prev) => ({
        ...prev,
        sectorPeers: { ...prev.sectorPeers, [symbol]: peers },
        sectorPriceMap: { ...prev.sectorPriceMap, ...prices },
        isLoadingSector: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingSector: false,
        error: err instanceof Error ? err.message : "섹터 데이터 로딩 실패",
      }));
    }
  }, []);

  return {
    state,
    addStock,
    removeStock,
    setRange,
    requestBriefing,
    loadInvestorTrend,
    loadSectorComparison,
    getIndustry,
  };
}
