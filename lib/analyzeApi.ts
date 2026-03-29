import type { AnalyzeRequest, AnalyzeResponse, AnalysisMode } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
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

/** SSE 버퍼를 파싱하여 메시지를 처리하는 공용 헬퍼 */
function processSSEBuffer(
  buffer: string,
  accumulated: string,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
): { buffer: string; accumulated: string; completed: boolean } {
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
      const result = sanitizeResponse(msg.r as AnalyzeResponse);
      onComplete(result);
      return { buffer, accumulated, completed: true };
    }

    if (msg.t) {
      accumulated += msg.t as string;
      const partial = extractRoastFromPartial(accumulated);
      if (partial !== null) onRoastChunk(partial);
    }
  }

  return { buffer, accumulated, completed: false };
}

/** scores 값을 안전하게 숫자로 변환 */
function sanitizeScores(
  scores: Record<string, unknown> | null | undefined,
): AnalyzeResponse["scores"] {
  if (!scores || typeof scores !== "object") return null;
  const keys = ["diversification", "returns", "stability", "momentum", "risk_management"] as const;
  const result: Record<string, number> = {};
  for (const k of keys) {
    const v = scores[k];
    result[k] = typeof v === "number" ? v : (Number(v) || 0);
  }
  return result as unknown as AnalyzeResponse["scores"];
}

/** roast에 JSON 잔해가 섞여 있으면 정제 */
function sanitizeRoast(roast: string): string {
  if (!roast) return roast;
  // roast 안에 JSON 필드명이 보이면 원본 JSON이 그대로 들어온 것
  if (roast.includes('"sector"') || roast.includes('"grade"') || roast.trimStart().startsWith("```")) {
    const match = roast.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match) {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  return roast;
}

/** 응답 데이터 정제 — 타입 안전성 확보 */
function sanitizeResponse(raw: AnalyzeResponse): AnalyzeResponse {
  return {
    ...raw,
    roast: sanitizeRoast(raw.roast),
    scores: sanitizeScores(raw.scores as unknown as Record<string, unknown>),
    grade: raw.grade ?? null,
    sector: raw.sector ?? null,
  };
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

      // done=true 이더라도 value에 남은 데이터가 있을 수 있음
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      if (buffer.includes("\n\n")) {
        const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
        buffer = result.buffer;
        accumulated = result.accumulated;
        if (result.completed) return;
      }

      if (done) break;
    }

    // 버퍼에 남은 마지막 메시지 처리 (trailing \n\n 없는 경우)
    if (!completed && buffer.trim()) {
      buffer += "\n\n";
      const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
      if (result.completed) return;
      accumulated = result.accumulated;
    }

    // 스트림이 끝났는데 done 이벤트를 못 받은 경우 → 수동 파싱 시도
    if (!completed && accumulated) {
      const tryParse = (s: string) => { try { return JSON.parse(s) as AnalyzeResponse; } catch { return null; } };
      // 1) 원본 2) 코드블록 제거 3) { } 추출
      const stripped = accumulated.trim()
        .replace(/^[\s\S]*?```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```[\s\S]*$/, "");
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      const parsed = tryParse(accumulated.trim())
        || tryParse(stripped)
        || (jsonMatch ? tryParse(jsonMatch[0]) : null);

      if (parsed) {
        onComplete(sanitizeResponse(parsed));
      } else {
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || "분석 결과를 파싱하지 못했습니다. 다시 시도해주세요.",
          analysis: "응답 파싱 실패 — 서버 응답이 불완전합니다.",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
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

      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      if (buffer.includes("\n\n")) {
        const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
        buffer = result.buffer;
        accumulated = result.accumulated;
        if (result.completed) return;
      }

      if (done) break;
    }

    // 버퍼에 남은 마지막 메시지 처리
    if (!completed && buffer.trim()) {
      buffer += "\n\n";
      const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
      if (result.completed) return;
      accumulated = result.accumulated;
    }

    if (!completed && accumulated) {
      const tryParse = (s: string) => { try { return JSON.parse(s) as AnalyzeResponse; } catch { return null; } };
      const stripped = accumulated.trim()
        .replace(/^[\s\S]*?```(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*```[\s\S]*$/, "");
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      const parsed = tryParse(accumulated.trim())
        || tryParse(stripped)
        || (jsonMatch ? tryParse(jsonMatch[0]) : null);

      if (parsed) {
        onComplete(sanitizeResponse(parsed));
      } else {
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || "분석 결과를 파싱하지 못했습니다. 다시 시도해주세요.",
          analysis: "응답 파싱 실패",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
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
