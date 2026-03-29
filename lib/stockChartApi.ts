import type { StockChartResponse, ChartRange, ChartInterval } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_CHART_API_URL ||
  `${FIREBASE_HOST}/api/stock-chart`;

export async function fetchStockChart(
  symbol: string,
  range: ChartRange = "6mo",
  interval: ChartInterval = "1d",
  period?: { from: number; to: number },
): Promise<StockChartResponse> {
  const params = new URLSearchParams({ symbol, interval });
  if (period) {
    params.set("period1", String(period.from));
    params.set("period2", String(period.to));
  } else {
    params.set("range", range);
  }
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
