import type { StockRoastResult } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL = `${FIREBASE_HOST}/api/stock-roast`;

export async function fetchStockRoast(
  symbol: string,
  name: string
): Promise<StockRoastResult> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `서버 오류 (${res.status})`);
  }
  return res.json();
}
