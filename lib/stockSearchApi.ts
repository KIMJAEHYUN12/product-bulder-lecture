import krStocksRaw from "@/data/krStocks.json";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_SEARCH_API_URL ||
  `${FIREBASE_HOST}/api/stock-search`;

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  industry?: string;
}

interface KrStockEntry {
  s: string;
  n: string;
  m: string;
  i?: string;
}

const KR_STOCKS: StockSearchResult[] = (krStocksRaw as KrStockEntry[]).map(
  (r) => ({
    symbol: r.s,
    name: r.n,
    exchange: r.m === "P" ? "코스피" : "코스닥",
    type: "Equity",
    industry: r.i || "",
  })
);

export function findSectorPeers(
  symbol: string,
  limit = 5
): StockSearchResult[] {
  const target = KR_STOCKS.find((s) => s.symbol === symbol);
  if (!target || !target.industry) return [];
  return KR_STOCKS.filter(
    (s) => s.industry === target.industry && s.symbol !== symbol
  ).slice(0, limit);
}

export function getIndustry(symbol: string): string {
  return KR_STOCKS.find((s) => s.symbol === symbol)?.industry || "";
}

function isKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

export async function searchStocks(
  query: string
): Promise<StockSearchResult[]> {
  if (!query.trim()) return [];

  const q = query.trim();

  // 한글 입력 → 로컬 매핑 우선
  if (isKorean(q)) {
    const local = KR_STOCKS.filter((s) => s.name.includes(q)).slice(0, 12);
    if (local.length > 0) return local;
  }

  // 영문/숫자/로컬 미매칭 → API 호출
  try {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const results: StockSearchResult[] = await res.json();

    // API 결과에 한글명 매핑
    return results.map((r) => {
      const mapped = KR_STOCKS.find((s) => s.symbol === r.symbol);
      return mapped ? { ...r, name: mapped.name } : r;
    });
  } catch {
    return [];
  }
}
