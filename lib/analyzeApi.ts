import type { AnalyzeRequest, AnalyzeResponse, AnalysisMode } from "@/types";

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  `${FIREBASE_HOST}/api/analyze`;

// 부분적으로 쌓인 JSON 텍스트에서 roast 필드를 추출
function extractRoastFromPartial(text: string): string | null {
  const match = text.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)/) ;
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export async function analyzePortfolioStream(
  req: AnalyzeRequest,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, mode: req.mode ?? "kim" }),
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

        if (msg.error) {
          throw new Error(msg.error as string);
        }

        if (msg.done && msg.r) {
          completed = true;
          onComplete(msg.r as AnalyzeResponse);
          return;
        }

        if (msg.t) {
          accumulated += msg.t as string;
          const partial = extractRoastFromPartial(accumulated);
          if (partial !== null) onRoastChunk(partial);
        }
      }
    }

    // 스트림이 끝났는데 done 이벤트를 못 받은 경우 → 수동 파싱 시도
    if (!completed && accumulated) {
      const cleaned = accumulated.trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(cleaned) as AnalyzeResponse;
        onComplete(parsed);
      } catch {
        // JSON 파싱도 실패하면 roast만이라도 보여줌
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || accumulated.slice(0, 500),
          analysis: "응답 파싱 실패 — 서버 응답이 불완전합니다.",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err as Error);
  }
}

// 텍스트 기반 MC.R 빗각 분석 (이미지 없이 데이터 요약으로 분석)
export async function analyzeBitgakStream(
  textSummary: string,
  stockName: string,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "makalong" as AnalysisMode, textSummary, stockName }),
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
        try { msg = JSON.parse(jsonStr); } catch { continue; }

        if (msg.error) throw new Error(msg.error as string);

        if (msg.done && msg.r) {
          completed = true;
          onComplete(msg.r as AnalyzeResponse);
          return;
        }

        if (msg.t) {
          accumulated += msg.t as string;
          const partial = extractRoastFromPartial(accumulated);
          if (partial !== null) onRoastChunk(partial);
        }
      }
    }

    if (!completed && accumulated) {
      const cleaned = accumulated.trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
      try {
        const parsed = JSON.parse(cleaned) as AnalyzeResponse;
        onComplete(parsed);
      } catch {
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || accumulated.slice(0, 500),
          analysis: "응답 파싱 실패",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err as Error);
  }
}

// 레거시 non-streaming (호환성 유지)
export async function analyzePortfolio(
  req: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, mode: req.mode ?? "kim" }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await response.json();

  if (!response.ok) {
    throw new Error(raw.error || `서버 오류 (${response.status})`);
  }

  if (raw.text && !raw.roast) {
    return { roast: raw.text, analysis: null, grade: null, sector: null, scores: null };
  }

  return raw as AnalyzeResponse;
}
