
export interface PortfolioSSEMessage {
  type: "ocr" | "progress" | "analysis" | "interpretation" | "done" | "error" | "phase";
  // ocr
  stocks?: OcrStock[];
  unmapped?: string[];
  // progress
  stock?: string;
  step?: string;
  status?: string;
  preview?: Record<string, unknown>;
  // interpretation
  t?: string;
  // done
  r?: PortfolioAnalysisResult;
  // error
  message?: string;
  // phase
  phase?: string;
  label?: string;
}

export interface OcrSSEMessage {
  type: "ocr-progress" | "ocr-done" | "error";
  index?: number;
  total?: number;
  status?: string;
  stocks?: OcrStock[];
  unmapped?: string[];
  message?: string;
}

export interface OcrStock {
  name: string;
  symbol: string;
  fullSymbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number | null;
  returnPct: number | null;
  sector: string | null;
  market: string | null;
}

export interface PortfolioStockData {
  name: string;
  symbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number | null;
  returnPct: number | null;
  sector: string | null;
  perBand: {
    currentPer: number | null;
    perPosition: number;
    bands: { min: number; p25: number; median: number; p75: number; max: number };
    forwardPer: number | null;
  } | null;
  supply: {
    foreignNet30: number;
    foreignStreak: number;
    institutionNet30: number;
    individualNet30: number;
    asOf?: string | null;
  } | null;
  technicals: {
    currentPrice: number;
    rsi: number | null;
    maStatus: string;
    macd: number | null;
    macdCross: string;
    bbPosition: number | null;
    trend: string;
  } | null;
  earnings: {
    period: string;
    revenue: number | null;
    revenueYoY: number | null;
    opIncome: number | null;
    opIncomeYoY: number | null;
  } | null;
  dividendYield: number | null;
  dividendPerShare: number | null;
  sparkline: number[];
  priceRange3y: { high3y: number; low3y: number } | null;
  disclosures: { date: string; title: string; receiptNo?: string }[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalReturn: number;
  stockCount: number;
  sectorWeights: { sector: string; value: number; weight: number }[];
  diversificationScore: number;
  correlationMatrix: Record<string, number>;
  dataTimestamp: string;
  dataAsOf?: {
    price: string | null;
    supply: string | null;
    chart: string | null;
    dart: string | null;
  };
}

export type ViewSignal = "danger" | "warning" | "caution" | "good" | "strong";

export interface KeyFinding {
  icon: "conflict" | "momentum" | "risk" | "positive";
  title: string;
  body: string;
  stocks: string[];
  severity: "high" | "medium" | "low";
}

export interface ActionGuideItem {
  target: string;
  action: string;
  reason: string;
}

export interface PortfolioDiagnosisView {
  overall_signal: ViewSignal;
  overall_summary: string;
  key_findings: KeyFinding[];
  action_guide: ActionGuideItem[];
}

export interface StockAnalysisView {
  signal: ViewSignal;
  one_line: string;
  key_insight: string;
  tags: string[];
  detail_analysis: string;
}

export interface DualViewStockAnalysis {
  code: string;
  name: string;
  trailing: StockAnalysisView;
  forward: StockAnalysisView;
}

export interface AiAnalysis {
  portfolio_diagnosis: {
    trailing: PortfolioDiagnosisView;
    forward: PortfolioDiagnosisView;
  };
  stocks: DualViewStockAnalysis[];
}

export interface PortfolioAnalysisResult {
  portfolio: PortfolioSummary;
  stocks: PortfolioStockData[];
  interpretation: string;
  aiAnalysis: AiAnalysis | null;
  disclaimer: string;
}

async function readSSE<T>(
  response: Response,
  onMessage: (msg: T) => void,
) {
  if (!response.body) throw new Error("응답 본문이 없습니다.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });

    while (buffer.includes("\n\n")) {
      const idx = buffer.indexOf("\n\n");
      const message = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      if (!message.startsWith("data: ")) continue;
      const jsonStr = message.slice(6).trim();
      if (!jsonStr) continue;

      try {
        onMessage(JSON.parse(jsonStr) as T);
      } catch { /* skip */ }
    }

    if (done) break;
  }
}

/** 멀티 이미지 OCR (별도 엔드포인트) */
export async function startPortfolioOcr(
  images: { base64: string; mimeType: string }[],
  onMessage: (msg: OcrSSEMessage) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/portfolio-ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
    signal,
  });

  if (!response.ok) throw new Error(`서버 오류 (${response.status})`);
  await readSSE(response, onMessage);
}

/** 포트폴리오 분석 (stocks 직접 전달 또는 이미지) */
export async function startPortfolioAnalysis(
  params: { stocks: OcrStock[] } | { imageBase64: string; mimeType: string },
  onMessage: (msg: PortfolioSSEMessage) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/portfolio-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) throw new Error(`서버 오류 (${response.status})`);
  await readSSE(response, onMessage);
}
