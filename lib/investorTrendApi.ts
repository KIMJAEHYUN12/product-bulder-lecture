import type { InvestorTrendData } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_TREND_API_URL ||
  `${FIREBASE_HOST}/api/investor-trend`;

export async function fetchInvestorTrend(
  symbol: string
): Promise<InvestorTrendData> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`investor-trend API error: ${res.status}`);
  return res.json();
}
