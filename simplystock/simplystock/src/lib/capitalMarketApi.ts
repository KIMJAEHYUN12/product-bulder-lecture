import type { CapitalMarketData, CapitalMarketSeries } from "@/types/capitalMarket";

export async function fetchCapitalMarket(): Promise<CapitalMarketData> {
  const res = await fetch("/api/capital-market", {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`capital-market ${res.status}`);
  return res.json();
}

export async function fetchCapitalMarketSeries(
  type: string,
  key: string,
): Promise<CapitalMarketSeries> {
  const params = new URLSearchParams({ type, key });
  const res = await fetch(`/api/capital-market-series?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`capital-market-series ${res.status}`);
  return res.json();
}
