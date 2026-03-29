import type { RecommendedStock } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_RECOMMEND_API_URL ||
  `${FIREBASE_HOST}/api/investor-recommend`;

export async function fetchInvestorRecommend(
  investorType: string,
): Promise<RecommendedStock[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ investorType }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `추천 종목 조회 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.stocks ?? [];
}
