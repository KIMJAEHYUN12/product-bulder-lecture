export interface StockReportScores {
  technical: number;
  financial: number;
  supply: number;
  valuation: number;
  overall: number;
}

export interface TechnicalAnalysis {
  trend: string;
  maStatus: string;
  rsi: number | null;
  rsiComment: string;
  macd: number | null;
  macdCross: string;
  bollinger: string;
  bbPosition: number | null;
  volumeRatio: number | null;
  volumeComment: string;
  keyLevels: { support: number; resistance: number };
  summary: string;
}

export interface FinancialYear {
  year: number;
  netIncome: number | null;
  equity: number | null;
}

export interface DisclosureItem {
  title: string;
  date: string;
  receiptNo: string;
}

export interface FinancialAnalysis {
  revenue: FinancialYear[];
  per: number | null;
  forwardPer: number | null;
  revenueComment: string;
  perComment: string;
  roeComment: string;
  disclosureComment: string;
  recentDisclosures: DisclosureItem[];
  summary: string;
}

export interface SupplyAnalysis {
  foreignNet30d: number | null;
  institutionNet30d: number | null;
  foreignStreak: number | null;
  foreignPct: number | null;
  foreignComment: string;
  institutionComment: string;
  flowComment: string;
  summary: string;
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface StockReportData {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  grade: "S" | "A" | "B" | "C" | "D";
  gradeLabel: string;
  scores: StockReportScores;
  technical: TechnicalAnalysis;
  financial: FinancialAnalysis;
  supply: SupplyAnalysis;
  opinion: string;
  checklist: ChecklistItem[];
  updatedAt: string;
}
