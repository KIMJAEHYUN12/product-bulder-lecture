export type Grade = "S" | "A" | "B" | "C" | "D" | "F" | null;

export type KimExpression = "neutral" | "shocked" | "smug" | "angry" | "pity";

export type Sector =
  | "이차전지"
  | "반도체"
  | "전력"
  | "AI"
  | "바이오"
  | "자동차"
  | "혼합"
  | "기타";

export interface PortfolioScores {
  diversification: number;
  returns: number;
  stability: number;
  momentum: number;
  risk_management: number;
}

export interface AnalyzeRequest {
  imageBase64: string;
  mimeType: string;
}

export interface AnalyzeResponse {
  roast: string;
  analysis: string | null;
  grade: Grade;
  sector: Sector | null;
  scores: PortfolioScores | null;
  error?: string;
}

export interface RoastState {
  imageBase64: string | null;
  mimeType: string | null;
  previewUrl: string | null;
  isLoading: boolean;
  roast: string | null;
  analysis: string | null;
  scores: PortfolioScores | null;
  sector: Sector | null;
  error: string | null;
  grade: Grade;
  kimExpression: KimExpression;
}
