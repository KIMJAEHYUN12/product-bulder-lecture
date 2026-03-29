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

export type BitgakViewMode = "auto" | "bullish" | "bearish";

export interface BitgakLine {
  type: "channel_top" | "channel_bottom" | "midline" | "support_resistance" | "trend_line";
  label: string;
  style: "solid" | "dashed";
  color: string;
  opacity?: number;
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

export interface BitgakMeta {
  channelDirection: "상승" | "하락" | "횡보" | "판별불가";
  channelPosition: string | null;
  positionPercent: number | null;
  threeThree: { highsMet: boolean; highsCount: number; lowsMet: boolean; lowsCount: number };
  srFlips: string[];
  priceRange: { high: number; low: number; current: number; changePct: number };
  period: { start: string; end: string; candleCount: number };
}

export interface BitgakResult {
  highs: BitgakPivot[];
  lows: BitgakPivot[];
  lines: BitgakLine[];
  summary: string; // 데이터 요약 (Gemini에 넘길 텍스트)
  indicators?: TechIndicators;
  meta?: BitgakMeta;
}

export type ChartRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";

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
export type ChartInterval = "1d" | "1wk" | "1mo";

// ── AI 추천 종목 ──
export interface RecommendedStock {
  symbol: string;
  name: string;
  reason: string;
}

// ── 백테스트 ──
export interface BacktestStock {
  symbol: string;
  name: string;
}

export interface BacktestResult {
  dailyValues: { date: string; value: number }[];
  kospiValues: { date: string; value: number }[];
  stockValues: Record<string, { date: string; value: number }[]>;
  totalReturnPct: number;
  maxDrawdownPct: number;
  cagrPct: number;
  kospiReturnPct: number;
  stockReturns: Record<string, number>;
  finalAmount: number;
}

// ── 수급 신호 스캐너 ──
export interface SignalStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  crossType: "5_20" | "20_60";
  crossDate: string;
  daysAfterCross: number;
  foreignNet: number;
  institutionNet: number;
  individualNet: number;
  foreignPct: number;
}

export interface SignalScanResponse {
  scannedAt: string;
  totalScanned: number;
  results: SignalStock[];
}

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

// ── 투자 RPG ──
export type RpgClassKey = "visionary" | "dealmaker" | "sage" | "strategist" | "hunter" | "observer" | "contrarian" | "explorer";
export type EquipmentGrade = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type EquipmentSlotKey = "weapon" | "armor" | "spellbook" | "accessory";

export interface RpgStats {
  attack: number;
  defense: number;
  intelligence: number;
  stamina: number;
  luck: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  emoji: string;
  grade: EquipmentGrade;
  baseBonus: Partial<RpgStats>;
  bonus: Partial<RpgStats>;
  enhanceLevel: number;
}

export interface BattleRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface BattleOpponent {
  class: RpgClassKey;
  className: string;
  emoji: string;
  nickname: string;
  level: number;
  stats: RpgStats;
  combatPower: number;
}

export type TurnType = "attack" | "intelligence" | "stamina" | "luck" | "final";

export interface TurnResult {
  turn: number;
  type: TurnType;
  label: string;
  playerDmg: number;
  opponentDmg: number;
  playerHp: number;
  opponentHp: number;
  isCritical: boolean;
  flavorText: string;
}

export interface BattleResult {
  turns: TurnResult[];
  winner: "player" | "opponent" | "draw";
  expReward: number;
  stoneReward: number;
}

export interface BattleHistoryEntry {
  date: string;
  winner: "player" | "opponent" | "draw";
  opponentClassName: string;
  opponentLevel: number;
  expReward: number;
  stoneReward: number;
}

export interface RpgCharacter {
  class: RpgClassKey;
  nickname: string;
  level: number;
  exp: number;
  stats: RpgStats;
  equipment: Record<EquipmentSlotKey, EquipmentItem | null>;
  stones: number;
  battleRecord: BattleRecord;
  achievements: string[];
  createdAt: string;
  updatedAt: string;
}
