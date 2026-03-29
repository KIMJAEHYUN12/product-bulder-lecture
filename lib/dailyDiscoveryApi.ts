const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_DAILY_DISCOVERY_API_URL ||
  `${FIREBASE_HOST}/api/daily-discovery`;

export interface DailyDiscoveryData {
  fact: string;
  category: string;
  source: string;
  cachedAt: string;
}

export async function fetchDailyDiscovery(): Promise<DailyDiscoveryData | null> {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
