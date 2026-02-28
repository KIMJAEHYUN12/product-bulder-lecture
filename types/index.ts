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

export type AnalysisMode = "kim" | "makalong";

export interface AnalyzeRequest {
  imageBase64: string;
  mimeType: string;
  mode?: AnalysisMode;
}

export interface ChartPoint {
  x: number; // 이미지 너비 대비 % (0~100)
  y: number; // 이미지 높이 대비 % (0~100)
}

export interface ChartLine {
  type: "channel_top" | "channel_bottom" | "midline" | "support" | "resistance" | "trendline";
  label: string;
  points: ChartPoint[];
  style?: "solid" | "dashed";
}

export interface AnalyzeResponse {
  roast: string;
  analysis: string | null;
  grade: Grade;
  sector: Sector | null;
  scores: PortfolioScores | null;
  chartLines?: ChartLine[] | null;
  error?: string;
}

export interface StockNewsItem {
  title: string;
  url: string;
}

export interface StockRoastResult {
  news: StockNewsItem[];
}

// ── 빗각 차트 관련 타입 ──
export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockChartResponse {
  symbol: string;
  name: string;
  currency: string;
  candles: Candle[];
}

export interface BitgakLine {
  type: "channel_top" | "channel_bottom" | "midline" | "support_resistance";
  label: string;
  style: "solid" | "dashed";
  color: string;
  /** Array of {time, value} for lightweight-charts LineSeries */
  points: { time: number; value: number }[];
}

export interface BitgakPivot {
  index: number;
  time: number;
  price: number;
  type: "high" | "low";
}

export interface TechIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" };
  bb: { upper: number; middle: number; lower: number; position: "above" | "inside" | "below" };
  ma5: number;
  ma20: number;
  ma60: number;
}

export interface AnalysisHistoryItem {
  symbol: string;
  name: string;
  date: string;
  channelDir: string;
  position: string;
  rsi: number;
}

export interface BitgakResult {
  highs: BitgakPivot[];
  lows: BitgakPivot[];
  lines: BitgakLine[];
  summary: string; // 데이터 요약 (Gemini에 넘길 텍스트)
  indicators?: TechIndicators;
}

export type ChartRange = "1mo" | "3mo" | "6mo" | "1y";

// ── 차트 업다운 게임 ──
export type GamePhase = "intro" | "loading" | "guessing" | "revealing" | "result" | "gameover";

export interface GameCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GameRound {
  roundId: string;
  visibleCandles: GameCandle[];
  hiddenCandles: GameCandle[];
  direction: "up" | "down";
  changePct: number;
  stockName: string;
  stockSymbol: string;
}

export interface ChartGameRankingEntry {
  userId: string;
  nickname: string;
  bestStreak: number;
  totalGames: number;
  totalCorrect: number;
  updatedAt: string;
}
export type ChartInterval = "1d" | "1wk";

// ── 종목 분석실 ──
export interface StockBriefingResponse {
  briefing: string;
  verdict: string;
  riskLevel: "low" | "medium" | "high";
  keyPoints: string[];
}

export interface InvestorTrendDaily {
  date: string;
  foreign: number;
  institution: number;
  individual: number;
}

export interface InvestorTrendData {
  symbol: string;
  summary: { foreign: number; institution: number; individual: number };
  daily: InvestorTrendDaily[];
}

export interface SectorStock {
  symbol: string;
  name: string;
  industry: string;
}

export interface RoastState {
  imageBase64: string | null;
  mimeType: string | null;
  previewUrl: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  roast: string | null;
  analysis: string | null;
  scores: PortfolioScores | null;
  sector: Sector | null;
  chartLines: ChartLine[] | null;
  error: string | null;
  grade: Grade;
  kimExpression: KimExpression;
}
