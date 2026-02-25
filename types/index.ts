export type Grade = "S" | "A" | "B" | "C" | "D" | "F" | null;

export type KimExpression = "neutral" | "shocked" | "smug" | "angry" | "pity";

export interface PortfolioScores {
  diversification: number;  // 분산도
  returns: number;          // 수익률
  stability: number;        // 안정성
  momentum: number;         // 모멘텀
  risk_management: number;  // 리스크 관리
}

export interface AnalyzeRequest {
  imageBase64: string;
  mimeType: string;
}

export interface AnalyzeResponse {
  roast: string;
  analysis: string | null;
  grade: Grade;
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
  error: string | null;
  grade: Grade;
  kimExpression: KimExpression;
}
