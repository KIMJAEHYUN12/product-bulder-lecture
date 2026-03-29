// 한눈에 보는 자본시장 대시보드 타입

export interface IndexItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

export interface BondRate {
  name: string;
  code: string;
  rate: number;
  change: number;
}

export interface ExchangeRateItem {
  name: string;
  symbol: string;
  rate: number;
  change: number;
  changePct: number;
}

export interface GlobalIndicatorItem {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePct: number;
  level: "안정" | "경계" | "공포" | null;
}

export interface InvestorTrendDaily {
  date: string;
  foreign: number;
  institution: number;
  individual: number;
}

export interface InvestorTrendData {
  latest: InvestorTrendDaily;
  recent5Sum: { foreign: number; institution: number; individual: number };
  daily: InvestorTrendDaily[];
}

export interface MarketHealthData {
  customerDeposit: number | null;
  creditLoan: number | null;
}

export interface UsTreasuryData {
  yield10Y: number;
  yield13W: number;
  spread: number;
  inverted: boolean;
}

export interface FearGreedData {
  value: number;
  label: string;
  previous: number | null;
}

export interface KospiValuationData {
  per: number | null;
  dividendYield: number | null;
}

export interface ProgramTradingData {
  arbitrage: number;
  nonArbitrage: number;
  total: number;
}

export interface ShortSellingData {
  balance: number;
  ratio: number | null;
}

export interface CapitalMarketData {
  stocks: IndexItem[];
  bonds: BondRate[];
  exchangeRates: ExchangeRateItem[];
  globalIndicators: GlobalIndicatorItem[];
  investorTrend: InvestorTrendData | null;
  marketHealth: MarketHealthData | null;
  usTreasury: UsTreasuryData | null;
  fearGreed: FearGreedData | null;
  kospiValuation: KospiValuationData | null;
  programTrading: ProgramTradingData | null;
  shortSelling: ShortSellingData | null;
  updatedAt: string;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface CapitalMarketSeries {
  label: string;
  unit: string;
  series: SeriesPoint[];
}
