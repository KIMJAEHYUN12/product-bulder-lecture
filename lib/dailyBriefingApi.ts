const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_DAILY_BRIEFING_API_URL ||
  `${FIREBASE_HOST}/api/daily-briefing`;

export interface DailyBriefingData {
  briefing: string;
  sentiment: "positive" | "neutral" | "negative";
  highlights: string[];
  cachedAt: string;
}

export async function fetchDailyBriefing(): Promise<DailyBriefingData | null> {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
