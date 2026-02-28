import type { StockBriefingResponse } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL = `${FIREBASE_HOST}/api/stock-briefing`;

function extractBriefingFromPartial(text: string): string | null {
  const match = text.match(/"briefing"\s*:\s*"((?:[^"\\]|\\.)*)/) ;
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export async function streamStockBriefing(
  stocks: { symbol: string; name: string; chartSummary: string }[],
  news: { stockName: string; headlines: string[] }[],
  mode: "single" | "compare",
  onChunk: (partial: string) => void,
  onComplete: (result: StockBriefingResponse) => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stocks, news, mode }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error || `서버 오류 (${response.status})`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const jsonStr = part.slice(6).trim();
        if (!jsonStr) continue;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (msg.error) throw new Error(msg.error as string);

        if (msg.done && msg.r) {
          completed = true;
          onComplete(msg.r as StockBriefingResponse);
          return;
        }

        if (msg.t) {
          accumulated += msg.t as string;
          const partial = extractBriefingFromPartial(accumulated);
          if (partial !== null) onChunk(partial);
        }
      }
    }

    if (!completed && accumulated) {
      const cleaned = accumulated.trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(cleaned) as StockBriefingResponse;
        onComplete(parsed);
      } catch {
        onComplete({
          briefing: accumulated.slice(0, 500),
          verdict: "관망",
          riskLevel: "medium",
          keyPoints: [],
        });
      }
    }
  } catch (err) {
    onError(err as Error);
  }
}
