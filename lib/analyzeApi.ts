import type { AnalyzeRequest, AnalyzeResponse } from "@/types";

export async function analyzePortfolio(
  req: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://analyze-cryqnhf6fq-uc.a.run.app";

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await response.json();

  if (!response.ok) {
    throw new Error(raw.error || `서버 오류 (${response.status})`);
  }

  // 구버전 백엔드 호환 (returns { text } instead of { roast, analysis, grade, scores })
  if (raw.text && !raw.roast) {
    return {
      roast: raw.text,
      analysis: null,
      grade: null,
      sector: null,
      scores: null,
    };
  }

  return raw as AnalyzeResponse;
}
