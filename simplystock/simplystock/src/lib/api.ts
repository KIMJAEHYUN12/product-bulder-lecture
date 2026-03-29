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
  if (range === "max" || range === "10y") return 30000;
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

const ALIAS_MAP: Record<string, string> = {
  "타이거": "TIGER",
  "코덱스": "KODEX",
  "킨덱스": "KINDEX",
  "히어로즈": "HEROES",
  "코리아": "KOREA",
  "에이아이": "AI",
  "탑": "TOP",
  "플러스": "PLUS",
  "에스엔피": "SNP",
  "나스닥": "NASDAQ",
};

// 해외 종목 한글→티커 매핑 (프론트에서 병렬 검색용)
const GLOBAL_ALIAS: Record<string, string> = {
  "엔비디아": "NVDA", "앤비디아": "NVDA", "애플": "AAPL", "테슬라": "TSLA",
  "마이크로소프트": "MSFT", "구글": "GOOGL", "알파벳": "GOOGL",
  "아마존": "AMZN", "메타": "META", "넷플릭스": "NFLX",
  "인텔": "INTC", "퀄컴": "QCOM", "브로드컴": "AVGO",
  "어도비": "ADBE", "세일즈포스": "CRM", "팔란티어": "PLTR",
  "스노우플레이크": "SNOW", "코인베이스": "COIN",
  "리비안": "RIVN", "루시드": "LCID", "니오": "NIO",
  "알리바바": "BABA", "바이두": "BIDU", "텐센트": "TCEHY",
  "핀둬둬": "PDD", "비야디": "BYDDY",
  "소파이": "SOFI", "로블록스": "RBLX", "유니티": "U",
  "크라우드스트라이크": "CRWD", "데이터독": "DDOG",
  "마이크론": "MU", "램리서치": "LRCX",
  "버크셔": "BRK-B", "워렌버핏": "BRK-B", "엑손모빌": "XOM",
  "비자": "V", "마스터카드": "MA", "화이자": "PFE",
  "일라이릴리": "LLY", "코스트코": "COST", "월마트": "WMT",
  "스타벅스": "SBUX", "디즈니": "DIS", "나이키": "NKE",
  "맥도날드": "MCD", "보잉": "BA", "슈퍼마이크로": "SMCI",
  "암홀딩스": "ARM",
};

function applyGlobalAlias(q: string): string | null {
  for (const [kr, en] of Object.entries(GLOBAL_ALIAS)) {
    if (q.includes(kr)) return en;
  }
  return null;
}

function applyAlias(q: string): string | null {
  let replaced = q;
  for (const [kr, en] of Object.entries(ALIAS_MAP)) {
    if (replaced.includes(kr)) {
      replaced = replaced.replace(kr, en);
    }
  }
  return replaced !== q ? replaced : null;
}

async function fetchSearch(q: string): Promise<StockSearchResult[]> {
  const res = await fetch(
    `${FIREBASE_HOST}/api/stock-search?q=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) return [];
  return res.json();
}

export async function searchStocks(
  query: string,
): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const aliased = applyAlias(q);
  const globalAliased = applyGlobalAlias(q);

  // 병렬 검색: 원본 + ETF 별칭 + 해외종목 티커
  const fetches: Promise<StockSearchResult[]>[] = [fetchSearch(q)];
  if (aliased) fetches.push(fetchSearch(aliased));
  if (globalAliased) fetches.push(fetchSearch(globalAliased));

  if (fetches.length === 1) return fetches[0];

  const results = await Promise.all(fetches);

  // 해외종목 티커 결과를 맨 앞에 배치 (사용자가 원하는 결과 우선)
  const merged: StockSearchResult[] = [];
  const seen = new Set<string>();

  // globalAliased 결과 먼저 (해외 원본 종목)
  if (globalAliased && results.length >= (aliased ? 3 : 2)) {
    const globalResults = results[results.length - 1];
    for (const r of globalResults) {
      if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
    }
  }

  // 원본 검색 결과 (한국 ETF 등)
  for (const r of results[0]) {
    if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
  }

  // ETF 별칭 결과
  if (aliased && results[1]) {
    for (const r of results[1]) {
      if (!seen.has(r.symbol)) { seen.add(r.symbol); merged.push(r); }
    }
  }

  return merged;
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
  customName?: string;
  addedAt: string;
  folderId?: string;
}

export interface WatchlistFolder {
  id: string;
  name: string;
  order: number;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function watchlistCallRaw(body: Record<string, any>): Promise<{ items: WatchlistItem[]; folders?: WatchlistFolder[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { ...body };
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
      const err: Error & { code?: string; items?: WatchlistItem[] } = new Error(`관심종목은 최대 ${data.limit ?? 50}개까지 추가할 수 있습니다`);
      err.code = "MAX_REACHED";
      err.items = data.items ?? [];
      throw err;
    }
    throw new Error("watchlist API error");
  }
  return { items: data.items ?? [], folders: data.folders };
}

async function watchlistCall(body: Record<string, string>): Promise<WatchlistItem[]> {
  const result = await watchlistCallRaw(body);
  return result.items;
}

export async function fetchWatchlist(): Promise<{ items: WatchlistItem[]; folders: WatchlistFolder[] }> {
  return watchlistCallRaw({ action: "list" }) as Promise<{ items: WatchlistItem[]; folders: WatchlistFolder[] }>;
}

export async function addToWatchlist(symbol: string, name: string): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "add", symbol, name });
}

export async function removeFromWatchlist(symbol: string): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "remove", symbol });
}

export async function renameWatchlistItem(symbol: string, customName: string): Promise<WatchlistItem[]> {
  return watchlistCall({ action: "rename", symbol, customName });
}

export async function reorderWatchlist(symbols: string[]): Promise<WatchlistItem[]> {
  return (await watchlistCallRaw({ action: "reorder", symbols })).items;
}

export async function setWatchlistFolder(symbol: string, folderId: string | null): Promise<WatchlistItem[]> {
  return (await watchlistCallRaw({ action: "set-folder", symbol, folderId: folderId || "" })).items;
}

export async function manageWatchlistFolders(folders: WatchlistFolder[]): Promise<{ items: WatchlistItem[]; folders: WatchlistFolder[] }> {
  const result = await watchlistCallRaw({ action: "manage-folders", folders });
  return { items: result.items, folders: result.folders ?? [] };
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
