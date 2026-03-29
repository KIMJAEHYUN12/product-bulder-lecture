import krStocksRaw from "@/data/krStocks.json";

const FIREBASE_HOST = "https://bitgak.co.kr";
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
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);
}

// 초성 배열 (가~힣 유니코드 순서)
const CHOSUNG = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
];

function getChosung(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHOSUNG[Math.floor((code - 0xAC00) / 588)];
  }
  return ch;
}

function matchKorean(name: string, query: string): boolean {
  // 1. 일반 포함 검색
  if (name.includes(query)) return true;

  // 2. 초성 검색: 쿼리의 각 글자를 초성으로 변환하여 비교
  const qChars = [...query];
  const isAllChosung = qChars.every((c) => /[ㄱ-ㅎ]/.test(c));

  if (isAllChosung) {
    // 순수 초성 입력 (ㅅㅈ → 삼성전자)
    const nameChosungs = [...name].map(getChosung);
    for (let i = 0; i <= nameChosungs.length - qChars.length; i++) {
      if (qChars.every((c, j) => nameChosungs[i + j] === c)) return true;
    }
    return false;
  }

  // 3. 혼합 입력 (삼ㅅ → 삼성): 완성 글자는 직접 비교, 마지막 자음은 초성 비교
  const lastChar = qChars[qChars.length - 1];
  if (/[ㄱ-ㅎ]/.test(lastChar)) {
    const prefix = query.slice(0, -1);
    if (prefix && name.startsWith(prefix)) {
      const nextChar = name[prefix.length];
      if (nextChar && getChosung(nextChar) === lastChar) return true;
    }
  }

  return false;
}

export async function searchStocks(
  query: string
): Promise<StockSearchResult[]> {
  if (!query.trim()) return [];

  const q = query.trim();

  // 한글 입력 → 로컬 매핑 우선 (초성 검색 지원)
  if (isKorean(q)) {
    const local = KR_STOCKS.filter((s) => matchKorean(s.name, q)).slice(0, 12);
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
