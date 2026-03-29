import type { SignalScanResponse } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL = `${FIREBASE_HOST}/api/signal-scan`;

export async function fetchSignalScan(): Promise<SignalScanResponse> {
  const res = await fetch(API_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `신호 스캔 실패 (${res.status})`);
  }
  return res.json();
}
