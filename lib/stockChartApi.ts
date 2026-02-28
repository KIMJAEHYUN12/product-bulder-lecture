import type { StockChartResponse, ChartRange, ChartInterval } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_CHART_API_URL ||
  `${FIREBASE_HOST}/api/stock-chart`;

export async function fetchStockChart(
  symbol: string,
  range: ChartRange = "6mo",
  interval: ChartInterval = "1d",
): Promise<StockChartResponse> {
  const params = new URLSearchParams({ symbol, range, interval });
  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `차트 데이터 조회 실패 (${res.status})`);
  }

  return res.json();
}
