import type { GameRound } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_CHART_GAME_API_URL ||
  `${FIREBASE_HOST}/api/chart-game`;

export async function fetchGameRound(exclude: string[] = []): Promise<GameRound> {
  const params = new URLSearchParams();
  if (exclude.length > 0) params.set("exclude", exclude.join(","));

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `게임 데이터 로드 실패 (${res.status})`);
  }

  return res.json();
}
