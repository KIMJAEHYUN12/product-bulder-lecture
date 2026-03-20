import type {
  StockChartResponse,
  ChartRange,
  InvestorTrendData,
  StockSearchResult,
} from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";

/** 항상 일봉으로 요청 — 뷰포트 제어는 프론트에서 처리 */
function pickInterval(range: ChartRange): "1d" | "1wk" {
  return "1d";
}

/** 장기 요청은 타임아웃을 넉넉히 */
function pickTimeout(range: ChartRange): number {
  if (range === "max") return 30000;
  if (range === "5y" || range === "2y") return 20000;
  return 10000;
}

export async function fetchStockChart(
  symbol: string,
  range: ChartRange = "6mo",
  interval?: string,
  period?: { from: number; to: number },
): Promise<StockChartResponse> {
  const intv = interval || pickInterval(range);
  const params = new URLSearchParams({ symbol, range, interval: intv });
  if (period) {
    params.set("period1", String(period.from));
    params.set("period2", String(period.to));
  }
  const res = await fetch(
    `${FIREBASE_HOST}/api/stock-chart?${params}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(pickTimeout(range)),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `차트 데이터 조회 실패 (${res.status})`,
    );
  }
  return res.json();
}

/** ChartRange → 필요한 캘린더 일수 */
function rangeToDays(range: ChartRange): number {
  switch (range) {
    case "1mo": return 30;
    case "3mo": return 90;
    case "6mo": return 180;
    case "1y": return 365;
    case "2y": return 730;
    case "5y": return 500;   // 서버 상한(25페이지) 맞춤
    case "max": return 500;
    default: return 180;
  }
}

export async function fetchInvestorTrend(
  symbol: string,
  range: ChartRange = "6mo",
): Promise<InvestorTrendData> {
  const days = rangeToDays(range);
  const timeout = days > 365 ? 20000 : days > 180 ? 15000 : 10000;
  const res = await fetch(`${FIREBASE_HOST}/api/investor-trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, days }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`investor-trend API error: ${res.status}`);
  return res.json();
}

export async function searchStocks(
  query: string,
): Promise<StockSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${FIREBASE_HOST}/api/stock-search?q=${encodeURIComponent(query.trim())}`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) return [];
  return res.json();
}

export interface SignalEntry {
  symbol: string;
  name: string;
  close: number;
  channelBottom: number;
  positionPct: number;
  net3d: number;
  foreignNet3d: number;
  instNet3d: number;
  changeRate: number;
}

export interface SignalsResponse {
  signals: SignalEntry[];
  scannedAt: string;
  totalScanned: number;
}

export async function fetchSignals(): Promise<SignalsResponse> {
  const res = await fetch(`${FIREBASE_HOST}/api/signals`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error("시그널 스캔 실패");
  return res.json();
}

// ── Golden Cross ─────────────────────────────────────────
export interface GoldenSignalEntry {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  crossType: "5_20" | "20_60";
  crossDate: string;
  daysAfterCross: number;
  foreignNet: number;
  institutionNet: number;
  individualNet: number;
  foreignPct: number;
}

export interface GoldenSignalsResponse {
  scannedAt: string;
  totalScanned: number;
  results: GoldenSignalEntry[];
}

export async function fetchGoldenSignals(): Promise<GoldenSignalsResponse> {
  const res = await fetch(`${FIREBASE_HOST}/api/signal-scan`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error("골든크로스 스캔 실패");
  return res.json();
}

// ── B/S (Buy/Sell) Signal ─────────────────────────────────
export interface BSSignalEntry {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  signalType: "buy" | "sell";
  strength: number; // 2~4
  indicators: string[]; // e.g. ["RSI", "MACD", "BB", "Stoch"]
  rsi: number;
  macdCross: boolean;
  bbPosition: string;
  stochK: number;
}

export interface BSSignalsResponse {
  scannedAt: string;
  totalScanned: number;
  results: BSSignalEntry[];
}

export async function fetchBSSignals(): Promise<BSSignalsResponse> {
  const res = await fetch(`${FIREBASE_HOST}/api/bs-signals`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error("B/S 신호 스캔 실패");
  return res.json();
}

// ── Golden History ────────────────────────────────────────
export interface GoldenHistoryRecord {
  symbol: string;
  name: string;
  crossType: string;
  crossDate: string;
  priceAtCross: number;
  priceD1?: number | null;
  priceD3?: number | null;
  priceD5?: number | null;
  priceD10?: number | null;
  returnD1?: number | null;
  returnD3?: number | null;
  returnD5?: number | null;
  returnD10?: number | null;
  kospiReturnD3?: number | null;
  kospiReturnD5?: number | null;
}

export interface GoldenHistoryStats {
  total: number;
  d3Positive: number;
  d3Rate: number;
  avgReturnD3: number;
  avgReturnD5: number;
  avgKospiD3: number;
  avgKospiD5: number;
  alphaD3: number;
  alphaD5: number;
  sampleDays: number;
  dataStart: string;
}

export interface GoldenHistoryResponse {
  records: GoldenHistoryRecord[];
  stats: GoldenHistoryStats;
  updatedAt: string;
}

export async function fetchGoldenHistory(days = 30): Promise<GoldenHistoryResponse> {
  const res = await fetch(`${FIREBASE_HOST}/api/golden-history?days=${days}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("골든크로스 이력 조회 실패");
  return res.json();
}

// ── Earnings Calendar ─────────────────────────────────────
export interface EarningsItem {
  symbol: string;
  stockCode: string;
  name: string;
  reportName: string;
  receiptDate: string;
  receiptNo: string;
}

export interface EarningsCalendarResponse {
  earnings: EarningsItem[];
  scannedAt: string;
  dateRange: { from: string; to: string };
}

export async function fetchEarnings(): Promise<EarningsCalendarResponse> {
  const res = await fetch(`${FIREBASE_HOST}/api/earnings-calendar`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("실적 공시 조회 실패");
  return res.json();
}

// ── Watchlist ──────────────────────────────────────────────
export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: string;
}

export function getDeviceId(): string {
  const KEY = "ss_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

let _userId: string | null = null;
export function setWatchlistUserId(uid: string | null) {
  _userId = uid;
}

async function watchlistCall(body: Record<string, string>): Promise<WatchlistItem[]> {
  const payload: Record<string, string> = { ...body };
  if (_userId) payload.userId = _userId;
  else payload.deviceId = getDeviceId();
  const res = await fetch(`${FIREBASE_HOST}/api/ss-watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.error === "MAX_REACHED") {
      const err: Error & { code?: string; items?: WatchlistItem[] } = new Error(`관심종목은 최대 ${data.limit ?? 30}개까지 추가할 수 있습니다`);
      err.code = "MAX_REACHED";
      err.items = data.items ?? [];
      throw err;
    }
    throw new Error("watchlist API error");
  }
  return data.items ?? [];
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "list" });
}

export async function addToWatchlist(symbol: string, name: string): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "add", symbol, name });
}

export async function removeFromWatchlist(symbol: string): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "remove", symbol });
}

export async function migrateWatchlist(userId: string): Promise<WatchlistItem[]> {
  const res = await fetch(`${FIREBASE_HOST}/api/ss-watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "migrate", userId, deviceId: getDeviceId() }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("watchlist migrate error");
  const data = await res.json();
  return data.items ?? [];
}

// ── Commodities ──────────────────────────────────────────
export interface CommodityItem {
  key: string;
  name: string;
  price: number;
  changePct: number;
  currency: string;
  note: string;
}

export async function fetchCommodities(): Promise<CommodityItem[]> {
  const res = await fetch(`${FIREBASE_HOST}/api/market`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.commodities ?? [];
}

// ── Commodity Prices (individual) ─────────────────────────
export interface CommodityPriceData {
  price: number;
  changePct: number;
  currency: string;
}

export async function fetchCommodityPrices(
  symbols: string[],
): Promise<Record<string, CommodityPriceData>> {
  const res = await fetch(`${FIREBASE_HOST}/api/commodity-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};
  return res.json();
}

// ── News ──────────────────────────────────────────────────
export interface NewsItem {
  title: string;
  url: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(`${FIREBASE_HOST}/api/market`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.news ?? [];
}

// ── KOSPI200 선물 ────────────────────────────────────────
export interface FuturesBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FuturesData {
  name: string;
  code: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  basis: number;
  updatedAt?: number;
  bars?: FuturesBar[];
}

export async function fetchKospiFutures(type?: "day" | "night"): Promise<FuturesData> {
  const params = type ? `?type=${type}` : "";
  const res = await fetch(`${FIREBASE_HOST}/api/kospi-futures${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("선물 데이터 조회 실패");
  return res.json();
}

// ── Stock Report (AI 분석 리포트) ────────────────────────
import type { StockReportData } from "@/types/stockReport";
export type { StockReportData };

export async function fetchStockReport(symbol: string): Promise<StockReportData> {
  const res = await fetch(
    `${FIREBASE_HOST}/api/stock-report?symbol=${encodeURIComponent(symbol)}`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `리포트 생성 실패 (${res.status})`,
    );
  }
  return res.json();
}

// ── PER Band ─────────────────────────────────────────────
import type { StockPrice, PerBandData } from "@/types";
export type { StockPrice, PerBandData };

export async function fetchPerBand(symbol: string): Promise<PerBandData> {
  const res = await fetch(
    `${FIREBASE_HOST}/api/per-band?symbol=${encodeURIComponent(symbol)}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `PER 밴드 조회 실패 (${res.status})`,
    );
  }
  return res.json();
}

// ── Stock Prices ──────────────────────────────────────────

export async function fetchStockPrices(
  symbols: string[],
): Promise<Record<string, StockPrice>> {
  const res = await fetch(`${FIREBASE_HOST}/api/stock-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`stock-prices API error: ${res.status}`);
  return res.json();
}
