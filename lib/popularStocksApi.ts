const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL = process.env.NEXT_PUBLIC_POPULAR_STOCKS_API_URL || `${FIREBASE_HOST}/api/popular-stocks`;

export interface PopularStockEntry {
  symbol: string;
  name: string;
  count: number;
}

export async function incrementAnalysisCount(symbol: string, name: string): Promise<void> {
  try {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment", symbol, name }),
    }).catch(() => {});
  } catch {
    // fire-and-forget
  }
}

let cachedResult: { data: PopularStockEntry[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function fetchPopularStocks(): Promise<PopularStockEntry[]> {
  if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL) {
    return cachedResult.data;
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("인기 종목 조회 실패");
  const data: PopularStockEntry[] = await res.json();
  cachedResult = { data, fetchedAt: Date.now() };
  return data;
}
