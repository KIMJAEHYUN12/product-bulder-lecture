export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockChartResponse {
  symbol: string;
  name: string;
  currency: string;
  candles: Candle[];
}

export interface InvestorTrendDaily {
  date: string;
  close?: number;
  priceChange?: number;
  changeRate?: number;
  volume?: number;
  foreign: number;
  institution: number;
  individual: number;
  foreignTotal?: number;
  foreignPct?: number;
}

export interface InvestorTrendData {
  symbol: string;
  summary: { foreign: number; institution: number; individual: number };
  daily: InvestorTrendDaily[];
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  industry?: string;
}

export type ChartRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "max";

export type InvestMode = "lump" | "monthly" | "daily";

export interface BacktestStock {
  symbol: string;
  name: string;
}

export interface BacktestResult {
  dailyValues: { date: string; value: number }[];
  kospiValues: { date: string; value: number }[];
  stockValues: Record<string, { date: string; value: number }[]>;
  totalReturnPct: number;
  maxDrawdownPct: number;
  cagrPct: number;
  kospiReturnPct: number;
  stockReturns: Record<string, number>;
  finalAmount: number;
  investMode: InvestMode;
  totalInvested: number;
  investedValues: { date: string; value: number }[];
}

export interface StockPrice {
  price: number;
  changePct: number;
  name: string;
  currency: string;
}

// ── AI 봇 모의투자 타입 ──────────────────────────────────────────

export type BotType = "signal" | "golden" | "ant";

export interface BotProfile {
  botType: BotType;
  nickname: string;
  emoji: string;
  color: string;
  description: string;
  strategyDetail: string;
  maxPositions: number;
}

export interface BotTradeEntry {
  date: string;
  type: "buy" | "sell" | "thinking";
  symbol?: string;
  name?: string;
  qty?: number;
  price?: number;
  reason: string;
  signal?: string;
  sentiment?: string;
  timestamp?: number;
}

export interface BotDailySnapshot {
  date: string;
  totalAsset: number;
  returnPct: number;
  cash: number;
  holdingsCount: number;
}

export interface BotHolding {
  qty: number;
  avgPrice: number;
  currentPrice: number;
  name: string;
}

export interface BotFullData {
  profile: BotProfile;
  totalAsset: number;
  returnPct: number;
  cash: number;
  holdings: Record<string, BotHolding>;
  recentTrades: BotTradeEntry[];
  dailySnapshots: BotDailySnapshot[];
}

export interface PerBandData {
  symbol: string;
  name: string;
  currency: string;
  currentPer: number | null;
  forwardPer: number | null;
  avgPer: number;
  perPosition: number;
  latestEps: number;
  lossYears: number;
  bandReliability?: "high" | "low";
  sector?: string | null;
  industry?: string | null;
  epsHistory: { year: number; eps: number }[];
  perBands: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
  };
  bandChart: {
    date: string;
    close: number;
    bandMin: number;
    band25: number;
    bandMed: number;
    band75: number;
    bandMax: number;
    eps: number;
    per: number;
  }[];
  // Forward PER 밴드
  forwardPerBands?: {
    min: number; p25: number; median: number; p75: number; max: number;
  };
  forwardBandChart?: {
    date: string;
    close: number;
    bandMin: number; band25: number; bandMed: number; band75: number; bandMax: number;
    eps: number;
    per: number;
  }[];
  currentForwardPer?: number | null;
  avgForwardPer?: number;
  forwardPerPosition?: number;
  forwardEpsEstimate?: number | null;
  forwardEpsYear?: number | null;
  forwardBandReliability?: "high" | "low";

  // PBR 밴드
  currentPbr?: number | null;
  avgPbr?: number;
  pbrPosition?: number;
  latestBps?: number;
  pbrBands?: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
  };
  pbrBandChart?: {
    date: string;
    close: number;
    bandMin: number;
    band25: number;
    bandMed: number;
    band75: number;
    bandMax: number;
    bps: number;
    pbr: number;
  }[];
  pbrBandReliability?: "high" | "low";

  // 증권사 컨센서스
  analystData?: {
    targetMeanPrice: number | null;
    targetHighPrice: number | null;
    targetLowPrice: number | null;
    recommendationMean: number | null;
    numberOfAnalystOpinions: number | null;
  } | null;

  // 데이터 출처
  dataSources?: {
    price: string;
    earnings: string;
    currentPer: string;
    forwardEps: string | null;
  };
}
