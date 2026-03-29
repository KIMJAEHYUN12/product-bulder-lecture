# 포트폴리오 건강검진 — 최종 코드

---

## 파일 구조

```
프론트엔드 (simplystock/simplystock/src/)
├── app/portfolio-test/page.tsx          # 테스트 페이지 (비밀번호 게이트)
├── hooks/usePortfolioAnalysis.ts        # 중앙 상태관리 훅
├── lib/
│   ├── portfolioAnalyzeApi.ts           # API wrapper + SSE 파싱 + 타입
│   └── portfolioInterpret.ts            # 룰 기반 해석 함수
└── components/portfolio/
    ├── CollectionProgress.tsx           # 증거 수집 쇼
    ├── PerGauge.tsx                     # PER 밴드 게이지 + Forward PER
    ├── SupplyBar.tsx                    # 수급 동향 바 차트
    ├── TrendPanel.tsx                   # 추세 스파크라인 + RSI/이평선
    ├── StockDataCard.tsx                # 종목별 데이터 카드 통합
    ├── PortfolioDashboard.tsx           # 포트폴리오 요약 + 상관관계
    ├── SectorDonut.tsx                  # 섹터 도넛 차트
    └── AiInterpretation.tsx             # AI 해석 스트리밍 표시

백엔드 (functions/index.js 내)
├── simplifySector()                     # KRX 업종 → 대분류 매핑
├── ADVICE_PATTERNS + sanitizeInterpretation()  # 투자 조언 후처리 필터
├── pearsonCorrelation()                 # 피어슨 상관계수
└── exports.portfolioAnalyze             # SSE 엔드포인트
```

---

## 1. `src/hooks/usePortfolioAnalysis.ts`

```ts
"use client";

import { useState, useCallback, useRef } from "react";
import {
  startPortfolioAnalysis,
  type OcrStock,
  type PortfolioAnalysisResult,
  type PortfolioSSEMessage,
} from "@/lib/portfolioAnalyzeApi";

export type PageState = "upload" | "ocr" | "confirm" | "collecting" | "result";

export interface CollectionStep {
  stock: string;
  step: string;
  status: "loading" | "done" | "failed";
  preview?: Record<string, unknown>;
}

export function usePortfolioAnalysis() {
  const [ocrStocks, setOcrStocks] = useState<OcrStock[] | null>(null);
  const [unmappedNames, setUnmappedNames] = useState<string[]>([]);
  const [collectionProgress, setCollectionProgress] = useState<CollectionStep[]>([]);
  const [result, setResult] = useState<PortfolioAnalysisResult | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>("upload");
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const handleMessage = useCallback((msg: PortfolioSSEMessage) => {
    switch (msg.type) {
      case "ocr":
        setOcrStocks((msg.stocks as OcrStock[]) || []);
        setUnmappedNames((msg.unmapped as string[]) || []);
        setPageState("confirm");
        break;

      case "progress":
        setPageState((prev) => prev === "confirm" ? "collecting" : prev);
        setCollectionProgress((prev) => {
          const existing = prev.findIndex(
            (p) => p.stock === msg.stock && p.step === msg.step
          );
          const newStep: CollectionStep = {
            stock: msg.stock as string,
            step: msg.step as string,
            status: msg.status as "loading" | "done" | "failed",
            preview: msg.preview as Record<string, unknown>,
          };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newStep;
            return updated;
          }
          return [...prev, newStep];
        });
        break;

      case "analysis":
        break;

      case "interpretation":
        setPageState("result");
        if (msg.t) {
          setInterpretation((prev) => prev + (msg.t as string));
        }
        break;

      case "done":
        setResult(msg.r as PortfolioAnalysisResult);
        setPageState("result");
        setIsStreaming(false);
        break;

      case "error":
        setError(msg.message as string);
        setIsStreaming(false);
        break;
    }
  }, []);

  const analyze = useCallback(async (imageBase64: string, mimeType: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setError(null);
    setOcrStocks(null);
    setUnmappedNames([]);
    setCollectionProgress([]);
    setResult(null);
    setInterpretation("");
    setIsStreaming(true);
    setPageState("ocr");

    try {
      await startPortfolioAnalysis(
        imageBase64,
        mimeType,
        handleMessage,
        abortRef.current.signal
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "분석 실패";
      setError(msg);
      setPageState("upload");
    } finally {
      setIsStreaming(false);
    }
  }, [handleMessage]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPageState("upload");
    setOcrStocks(null);
    setUnmappedNames([]);
    setCollectionProgress([]);
    setResult(null);
    setInterpretation("");
    setError(null);
    setIsStreaming(false);
    setPendingImage(null);
  }, []);

  return {
    analyze,
    ocrStocks,
    unmappedNames,
    collectionProgress,
    result,
    interpretation,
    isStreaming,
    error,
    pageState,
    setPageState,
    pendingImage,
    setPendingImage,
    reset,
  };
}
```

---

## 2. `src/app/portfolio-test/page.tsx`

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { CollectionProgress } from "@/components/portfolio/CollectionProgress";
import { PortfolioDashboard } from "@/components/portfolio/PortfolioDashboard";
import { StockDataCard } from "@/components/portfolio/StockDataCard";
import { AiInterpretation } from "@/components/portfolio/AiInterpretation";

const TEST_PASSWORD = "portfolio2026";

export default function PortfolioTestPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pwInput, setPwInput] = useState("");

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-lg font-bold text-[var(--text-primary)] text-center">
            포트폴리오 건강검진 (테스트)
          </h1>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pwInput === TEST_PASSWORD) setAuthenticated(true);
            }}
            placeholder="비밀번호를 입력하세요"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { if (pwInput === TEST_PASSWORD) setAuthenticated(true); }}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return <PortfolioMain />;
}

function PortfolioMain() {
  const {
    analyze,
    ocrStocks,
    unmappedNames,
    collectionProgress,
    result,
    interpretation,
    isStreaming,
    error,
    pageState,
    setPageState,
    reset,
    pendingImage,
    setPendingImage,
  } = usePortfolioAnalysis();

  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<{ base64: string; mimeType: string } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      fileRef.current = { base64, mimeType: file.type };
      analyze(base64, file.type);
    };
    reader.readAsDataURL(file);
  }, [analyze]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const stockNames = ocrStocks?.map((s) => s.name) || [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-bold">포트폴리오 건강검진 (TEST)</h1>
          </div>
          {pageState !== "upload" && (
            <button
              onClick={reset}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              다시 분석
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {/* Phase 1: 업로드 */}
        {pageState === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-[var(--border-primary)] bg-[var(--bg-card)]"
            }`}
          >
            <div className="space-y-3">
              <div className="text-3xl">📊</div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                증권사 앱의 보유종목 화면을<br />스크린샷으로 찍어 업로드해 주세요
              </div>
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                <p>지원: 키움, 토스, 미래에셋, 삼성, 나무, NH 등 주요 증권사 앱</p>
                <p>※ 이미지는 분석 후 즉시 삭제됩니다. 서버에 저장되지 않습니다.</p>
              </div>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <span className="inline-block px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors">
                  사진 선택 / 촬영
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Phase 1.5: OCR 분석 중 */}
        {pageState === "ocr" && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-8 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              이미지에서 종목을 인식하고 있습니다...
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              잠시만 기다려 주세요
            </div>
          </div>
        )}

        {/* Phase 2: OCR 확인 (confirm) */}
        {pageState === "confirm" && ocrStocks && ocrStocks.length > 0 && (
          <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-4">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              다음 종목이 인식되었습니다:
            </div>

            <div className="space-y-2">
              {ocrStocks.map((s, i) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-overlay)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)] w-4">{i + 1}.</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{s.symbol}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[var(--text-secondary)]">{s.qty}주</span>
                    {s.avgPrice > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)] ml-2">
                        평단가 {Math.round(s.avgPrice).toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {unmappedNames.length > 0 && (
              <div className="text-[11px] text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                인식되었으나 매핑 불가: {unmappedNames.join(", ")}
                <br />
                (해외주식, ETF 등은 현재 미지원)
              </div>
            )}

            {ocrStocks.length >= 7 && (
              <div className="text-[11px] text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                {ocrStocks.length}종목 분석은 1~2분 정도 소요될 수 있습니다.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPageState("collecting")}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
              >
                분석 시작 ({ocrStocks.length}종목)
              </button>
              <button
                onClick={reset}
                className="px-4 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)]"
              >
                다시 촬영
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: 데이터 수집 (증거 수집 쇼) */}
        {pageState === "collecting" && (
          <CollectionProgress progress={collectionProgress} stockNames={stockNames} />
        )}

        {/* Phase 4: 결과 */}
        {pageState === "result" && result && (
          <>
            <PortfolioDashboard portfolio={result.portfolio} />

            {result.stocks.map((stock) => (
              <StockDataCard key={stock.symbol} stock={stock} />
            ))}

            <AiInterpretation text={interpretation} isStreaming={isStreaming} />

            {/* 면책 고지 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 text-xs text-[var(--text-muted)]">
              {result.disclaimer}
            </div>
          </>
        )}

        {/* 에러 */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
            <button onClick={reset} className="ml-2 underline">
              다시 시도
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## 3. `src/lib/portfolioAnalyzeApi.ts`

```ts
const FIREBASE_HOST = "https://bitgak.co.kr";

export interface PortfolioSSEMessage {
  type: "ocr" | "progress" | "analysis" | "interpretation" | "done" | "error";
  stocks?: OcrStock[];
  unmapped?: string[];
  stock?: string;
  step?: string;
  status?: string;
  preview?: Record<string, unknown>;
  t?: string;
  r?: PortfolioAnalysisResult;
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
  sparkline: number[];
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
}

export interface PortfolioAnalysisResult {
  portfolio: PortfolioSummary;
  stocks: PortfolioStockData[];
  interpretation: string;
  disclaimer: string;
}

export async function startPortfolioAnalysis(
  imageBase64: string,
  mimeType: string,
  onMessage: (msg: PortfolioSSEMessage) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`${FIREBASE_HOST}/api/portfolio-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`서버 오류 (${response.status})`);
  }

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
        const msg = JSON.parse(jsonStr) as PortfolioSSEMessage;
        onMessage(msg);
      } catch { /* skip */ }
    }

    if (done) break;
  }
}
```

---

## 4. `src/lib/portfolioInterpret.ts`

```ts
export function interpretPerPosition(pos: number): string {
  if (pos > 80) return '과거 10년 기준 "비싼 편"입니다';
  if (pos > 60) return '과거 10년 기준 "약간 비싼" 수준입니다';
  if (pos > 40) return '과거 10년 기준 "중간 정도" 가격입니다';
  if (pos > 20) return '과거 10년 기준 "저렴한 편"입니다';
  return '과거 10년 기준 "매우 저렴한" 구간입니다';
}

export function interpretRSI(rsi: number | null): string {
  if (rsi == null) return "데이터 부족";
  if (rsi > 70) return "과열 신호가 감지되고 있습니다";
  if (rsi > 60) return "약간 뜨거운 상태입니다";
  if (rsi > 40) return "과열도 과냉도 아닌 보통 상태입니다";
  if (rsi > 30) return "약간 차가운 상태입니다";
  return "과매도 신호가 감지되고 있습니다";
}

export function interpretForeignBuy(amount: number, streak: number): string {
  if (amount > 0 && streak >= 10) return "외국인이 꾸준히 사들이고 있습니다";
  if (amount > 0 && streak >= 5) return "외국인 매수세가 이어지고 있습니다";
  if (amount > 0) return "외국인이 최근 순매수로 전환했습니다";
  if (amount < 0 && Math.abs(streak) >= 10) return "외국인이 지속적으로 팔고 있습니다";
  if (amount < 0) return "외국인 매도세가 관찰됩니다";
  return "외국인 매매가 균형 상태입니다";
}

export function interpretMA(status: string): string {
  if (status === "정배열") return "단기 > 중기 > 장기 이동평균 순서 (상승 흐름)";
  if (status === "역배열") return "장기 > 중기 > 단기 이동평균 순서 (하락 흐름)";
  return "이동평균선이 혼조세를 보이고 있습니다";
}

export function interpretDiversification(score: number): string {
  if (score >= 70) return "여러 섹터에 걸쳐 잘 분산되어 있습니다";
  if (score >= 50) return "보통 수준의 분산 구조입니다";
  if (score >= 30) return "특정 섹터에 집중된 구조입니다";
  return "매우 집중된 포트폴리오 구조입니다";
}

export function formatVolume(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}
```

---

## 5. `src/components/portfolio/CollectionProgress.tsx`

```tsx
"use client";

import type { CollectionStep } from "@/hooks/usePortfolioAnalysis";

interface Props {
  progress: CollectionStep[];
  stockNames: string[];
}

const STEP_CONFIG: { key: string; label: string; icon: string }[] = [
  { key: "perBand", label: "밸류에이션", icon: "P" },
  { key: "investorTrend", label: "수급 분석", icon: "S" },
  { key: "chart", label: "차트/기술지표", icon: "C" },
];

function formatPreview(step: string, preview?: Record<string, unknown>): string | null {
  if (!preview) return null;
  switch (step) {
    case "perBand": {
      const pos = preview.perPosition as number | undefined;
      const per = preview.currentPer as number | undefined;
      if (pos != null && per != null) {
        const label = pos > 75 ? "고평가" : pos > 50 ? "보통" : pos > 25 ? "저평가" : "매우 저평가";
        return `PER ${per.toFixed(1)}배 (${label} 구간)`;
      }
      return null;
    }
    case "investorTrend": {
      const fNet = (preview.foreignNet30 ?? preview.foreignNet) as number | undefined;
      if (fNet != null) {
        const abs = Math.abs(fNet);
        const sign = fNet >= 0 ? "순매수" : "순매도";
        const vol = abs >= 100000000 ? `${(abs / 100000000).toFixed(1)}억` : abs >= 10000 ? `${(abs / 10000).toFixed(0)}만` : abs.toLocaleString();
        return `외국인 30일 ${vol}원 ${sign}`;
      }
      return null;
    }
    case "chart": {
      const rsi = preview.rsi as number | undefined;
      const trend = preview.trend as string | undefined;
      if (rsi != null && trend) {
        return `RSI ${rsi.toFixed(0)} / 추세 ${trend}`;
      }
      return null;
    }
    default:
      return null;
  }
}

export function CollectionProgress({ progress, stockNames }: Props) {
  const totalSteps = stockNames.length * STEP_CONFIG.length;
  const doneSteps = progress.filter((p) => p.status === "done").length;
  const overallPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 전체 진행률 */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            증거 수집 중
          </span>
          <span className="text-xs font-bold text-indigo-400">
            {overallPct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
          {stockNames.length}종목 x {STEP_CONFIG.length}단계 = {totalSteps}건 중 {doneSteps}건 완료
        </p>
      </div>

      {/* 종목별 카드 */}
      {stockNames.map((name) => {
        const steps = progress.filter((p) => p.stock === name);
        const allDone = STEP_CONFIG.every((sc) =>
          steps.some((s) => s.step === sc.key && s.status === "done")
        );

        return (
          <div
            key={name}
            className={`rounded-xl border bg-[var(--bg-card)] p-3 transition-colors ${
              allDone
                ? "border-emerald-500/40"
                : "border-[var(--border-primary)]"
            }`}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                allDone
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-indigo-500/20 text-indigo-400"
              }`}>
                {allDone ? "V" : "..."}
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">{name}</span>
            </div>

            <div className="space-y-1.5">
              {STEP_CONFIG.map((sc) => {
                const step = steps.find((s) => s.step === sc.key);
                const isDone = step?.status === "done";
                const isFailed = step?.status === "failed";
                const isLoading = step?.status === "loading";
                const previewText = isDone ? formatPreview(sc.key, step?.preview) : null;

                return (
                  <div key={sc.key} className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold ${
                      isDone ? "bg-emerald-500/20 text-emerald-400" :
                      isFailed ? "bg-red-500/20 text-red-400" :
                      isLoading ? "bg-indigo-500/20 text-indigo-400 animate-pulse" :
                      "bg-[var(--bg-overlay)] text-[var(--text-muted)]"
                    }`}>
                      {isDone ? "V" : isFailed ? "X" : isLoading ? "~" : sc.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] ${
                        isDone ? "text-[var(--text-primary)]" :
                        isFailed ? "text-red-400" :
                        isLoading ? "text-indigo-400" :
                        "text-[var(--text-muted)]"
                      }`}>
                        {sc.label}
                        {isLoading && <span className="animate-pulse ml-1">...</span>}
                      </span>

                      {previewText && (
                        <p className="text-[10px] text-emerald-400/80 mt-0.5">
                          {previewText}
                        </p>
                      )}
                      {isFailed && (
                        <p className="text-[10px] text-red-400/80 mt-0.5">
                          수집 실패 (분석에 제외됩니다)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {overallPct < 100 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] text-[var(--text-muted)]">
            데이터를 수집하고 있습니다...
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## 6. `src/components/portfolio/PerGauge.tsx`

```tsx
"use client";

import { interpretPerPosition } from "@/lib/portfolioInterpret";

interface Props {
  position: number;
  currentPer: number | null;
  forwardPer?: number | null;
  bands: { min: number; p25: number; median: number; p75: number; max: number };
}

export function PerGauge({ position, currentPer, forwardPer, bands }: Props) {
  const label = interpretPerPosition(position);
  const color =
    position > 75 ? "text-red-400" :
    position > 50 ? "text-amber-400" :
    position > 25 ? "text-emerald-400" : "text-blue-400";

  const forwardLabel = (() => {
    if (forwardPer == null || currentPer == null) return null;
    const diff = ((forwardPer - currentPer) / currentPer) * 100;
    if (diff < -20) return { text: "실적 개선 기대", color: "text-emerald-400" };
    if (diff < -5) return { text: "소폭 개선 전망", color: "text-emerald-400" };
    if (diff > 20) return { text: "실적 둔화 전망", color: "text-red-400" };
    if (diff > 5) return { text: "소폭 둔화 전망", color: "text-amber-400" };
    return { text: "현 수준 유지 전망", color: "text-[var(--text-muted)]" };
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>PER 밴드 (10년)</span>
        <span className="text-[10px]">[DART]</span>
      </div>

      <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-50% via-amber-500 to-red-500 opacity-30">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 shadow-lg"
          style={{ left: `${Math.min(Math.max(position, 2), 98)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>{bands.min?.toFixed(1)}배</span>
        <span className={`text-xs font-bold ${color}`}>
          {currentPer?.toFixed(1) ?? "N/A"}배 ({position}%)
        </span>
        <span>{bands.max?.toFixed(1)}배</span>
      </div>

      {forwardPer != null && currentPer != null && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-overlay)]">
          <div className="flex-1 grid grid-cols-2 gap-2 text-[10px]">
            <div className="text-center">
              <div className="text-[var(--text-muted)]">Trailing PER</div>
              <div className={`font-bold ${color}`}>{currentPer.toFixed(1)}배</div>
            </div>
            <div className="text-center">
              <div className="text-[var(--text-muted)]">Forward PER</div>
              <div className="font-bold text-[var(--text-primary)]">{forwardPer.toFixed(1)}배</div>
            </div>
          </div>
          {forwardLabel && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${forwardLabel.color} bg-[var(--bg-card)]`}>
              {forwardLabel.text}
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
```

---

## 7. `src/components/portfolio/SupplyBar.tsx`

```tsx
"use client";

import { interpretForeignBuy, formatVolume } from "@/lib/portfolioInterpret";

interface Props {
  foreignNet: number;
  institutionNet: number;
  individualNet: number;
  foreignStreak: number;
}

export function SupplyBar({ foreignNet, institutionNet, individualNet, foreignStreak }: Props) {
  const maxAbs = Math.max(
    Math.abs(foreignNet), Math.abs(institutionNet), Math.abs(individualNet), 1
  );

  const bars = [
    { label: "외국인", value: foreignNet, color: "bg-blue-500" },
    { label: "기관", value: institutionNet, color: "bg-amber-500" },
    { label: "개인", value: individualNet, color: "bg-gray-400" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>수급 동향 (30일)</span>
        <span className="text-[10px]">[KIS]</span>
      </div>

      <div className="space-y-1.5">
        {bars.map(({ label, value, color }) => {
          const width = (Math.abs(value) / maxAbs) * 100;
          const isPositive = value >= 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] w-10 text-[var(--text-muted)]">{label}</span>
              <div className="flex-1 flex items-center">
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-overlay)] relative">
                  <div
                    className={`absolute h-full rounded-full ${color} ${isPositive ? "left-1/2" : "right-1/2"}`}
                    style={{ width: `${width / 2}%` }}
                  />
                  <div className="absolute left-1/2 top-0 w-px h-full bg-[var(--text-muted)] opacity-30" />
                </div>
              </div>
              <span className={`text-[10px] w-16 text-right font-medium ${
                value > 0 ? "text-blue-400" : value < 0 ? "text-red-400" : "text-[var(--text-muted)]"
              }`}>
                {value > 0 ? "+" : ""}{formatVolume(value)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        {interpretForeignBuy(foreignNet, foreignStreak)}
      </p>
    </div>
  );
}
```

---

## 8. `src/components/portfolio/TrendPanel.tsx`

```tsx
"use client";

import { interpretRSI, interpretMA } from "@/lib/portfolioInterpret";

interface Props {
  rsi: number | null;
  maStatus: string;
  trend: string;
  sparkline: number[];
}

export function TrendPanel({ rsi, maStatus, trend, sparkline }: Props) {
  const trendColor =
    trend === "상승" ? "text-emerald-400" :
    trend === "하락" ? "text-red-400" : "text-[var(--text-muted)]";
  const trendArrow =
    trend === "상승" ? "^" :
    trend === "하락" ? "v" : "-";

  const svgWidth = 80;
  const svgHeight = 24;
  let sparkPath = "";
  if (sparkline.length >= 2) {
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    sparkPath = sparkline
      .map((v, i) => {
        const x = (i / (sparkline.length - 1)) * svgWidth;
        const y = svgHeight - ((v - min) / range) * svgHeight;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const sparkColor = sparkline.length >= 2 && sparkline[sparkline.length - 1] >= sparkline[0]
    ? "#34d399" : "#f87171";

  const sparkChange = sparkline.length >= 2
    ? ((sparkline[sparkline.length - 1] - sparkline[0]) / sparkline[0] * 100)
    : null;

  const fmtPrice = (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    return n.toLocaleString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>추세 (6개월)</span>
        <span className="text-[10px]">[Yahoo]</span>
      </div>

      {sparkPath && sparkline.length >= 2 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[var(--text-muted)]">
              {fmtPrice(sparkline[0])}
            </span>
          </div>
          <svg width={svgWidth} height={svgHeight} className="shrink-0">
            <path d={sparkPath} fill="none" stroke={sparkColor} strokeWidth="1.5" />
          </svg>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[var(--text-muted)]">
              {fmtPrice(sparkline[sparkline.length - 1])}
            </span>
          </div>
          {sparkChange != null && (
            <span className={`text-[10px] font-bold ${sparkChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {sparkChange > 0 ? "+" : ""}{sparkChange.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div className="text-center">
          <div className="text-[var(--text-muted)]">추세</div>
          <div className={`font-bold ${trendColor}`}>{trendArrow} {trend}</div>
        </div>
        <div className="text-center">
          <div className="text-[var(--text-muted)]">RSI(14)</div>
          <div className={`font-bold ${
            rsi != null && rsi > 70 ? "text-red-400" :
            rsi != null && rsi < 30 ? "text-blue-400" : "text-[var(--text-primary)]"
          }`}>
            {rsi?.toFixed(0) ?? "N/A"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[var(--text-muted)]">이평선</div>
          <div className={`font-bold ${
            maStatus === "정배열" ? "text-emerald-400" :
            maStatus === "역배열" ? "text-red-400" : "text-[var(--text-primary)]"
          }`}>
            {maStatus}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        {interpretRSI(rsi)} / {interpretMA(maStatus)}
      </p>
    </div>
  );
}
```

---

## 9. `src/components/portfolio/StockDataCard.tsx`

```tsx
"use client";

import { PerGauge } from "./PerGauge";
import { SupplyBar } from "./SupplyBar";
import { TrendPanel } from "./TrendPanel";
import type { PortfolioStockData } from "@/lib/portfolioAnalyzeApi";

interface Props {
  stock: PortfolioStockData;
}

export function StockDataCard({ stock }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{stock.name}</h3>
          <span className="text-[10px] text-[var(--text-muted)]">{stock.symbol} · {stock.sector}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-muted)]">{stock.qty}주</div>
          {stock.returnPct != null && (
            <div className={`text-sm font-bold ${stock.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stock.returnPct > 0 ? "+" : ""}{stock.returnPct.toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {stock.perBand && (
          <PerGauge
            position={stock.perBand.perPosition}
            currentPer={stock.perBand.currentPer}
            forwardPer={stock.perBand.forwardPer}
            bands={stock.perBand.bands}
          />
        )}

        {stock.supply && (
          <SupplyBar
            foreignNet={stock.supply.foreignNet30}
            institutionNet={stock.supply.institutionNet30}
            individualNet={stock.supply.individualNet30}
            foreignStreak={stock.supply.foreignStreak}
          />
        )}

        {stock.technicals && (
          <TrendPanel
            rsi={stock.technicals.rsi}
            maStatus={stock.technicals.maStatus}
            trend={stock.technicals.trend}
            sparkline={stock.sparkline}
          />
        )}

        {!stock.perBand && !stock.supply && !stock.technicals && (
          <p className="text-xs text-[var(--text-muted)] text-center py-2">
            이 종목은 데이터를 수집할 수 없었습니다
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 10. `src/components/portfolio/PortfolioDashboard.tsx`

```tsx
"use client";

import { SectorDonut } from "./SectorDonut";
import { interpretDiversification, formatVolume } from "@/lib/portfolioInterpret";
import type { PortfolioSummary } from "@/lib/portfolioAnalyzeApi";

interface Props {
  portfolio: PortfolioSummary;
}

export function PortfolioDashboard({ portfolio }: Props) {
  const score = portfolio.diversificationScore;
  const scoreColor = score >= 50 ? "text-emerald-400" : score >= 30 ? "text-amber-400" : "text-red-400";
  const retColor = portfolio.totalReturn >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">총 평가액</div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {formatVolume(portfolio.totalValue)}원
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">총 수익률</div>
            <div className={`text-sm font-bold ${retColor}`}>
              {portfolio.totalReturn > 0 ? "+" : ""}{portfolio.totalReturn.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--text-muted)]">분산도</div>
            <div className={`text-sm font-bold ${scoreColor}`}>
              {score}점
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
          {interpretDiversification(score)} ({portfolio.stockCount}종목)
        </p>
      </div>

      {portfolio.sectorWeights.length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
          <SectorDonut sectorWeights={portfolio.sectorWeights} />
        </div>
      )}

      {Object.keys(portfolio.correlationMatrix).length > 0 && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">종목 간 상관관계</div>
          <div className="space-y-1">
            {Object.entries(portfolio.correlationMatrix)
              .filter(([, v]) => Math.abs(v) > 0.5)
              .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
              .slice(0, 5)
              .map(([key, v]) => {
                const [a, b] = key.split("_");
                return (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-secondary)]">{a} - {b}</span>
                    <span className={`font-medium ${
                      Math.abs(v) > 0.7 ? "text-red-400" : "text-amber-400"
                    }`}>
                      {v > 0 ? "+" : ""}{v.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            {Object.values(portfolio.correlationMatrix).filter((v) => Math.abs(v) > 0.5).length === 0 && (
              <p className="text-[11px] text-[var(--text-muted)]">유의미한 상관관계 없음</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 11. `src/components/portfolio/SectorDonut.tsx`

```tsx
"use client";

interface Props {
  sectorWeights: { sector: string; weight: number }[];
}

const COLORS = [
  "#818cf8", "#f472b6", "#34d399", "#fbbf24",
  "#60a5fa", "#f87171", "#a78bfa", "#fb923c",
];

export function SectorDonut({ sectorWeights }: Props) {
  let cumPercent = 0;
  const gradientStops = sectorWeights.map((s, i) => {
    const start = cumPercent;
    cumPercent += s.weight;
    const color = COLORS[i % COLORS.length];
    return `${color} ${start}% ${cumPercent}%`;
  });

  const gradient = `conic-gradient(${gradientStops.join(", ")})`;

  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--text-muted)]">섹터 구성</div>

      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <div
            className="w-full h-full rounded-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-3 rounded-full bg-[var(--bg-primary)]" />
        </div>

        <div className="flex-1 space-y-1">
          {sectorWeights.slice(0, 6).map((s, i) => (
            <div key={s.sector} className="flex items-center gap-1.5 text-[11px]">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-[var(--text-secondary)] truncate max-w-[100px]">{s.sector}</span>
              <span className="text-[var(--text-muted)] ml-auto">{s.weight}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 12. `src/components/portfolio/AiInterpretation.tsx`

```tsx
"use client";

interface Props {
  text: string;
  isStreaming: boolean;
}

export function AiInterpretation({ text, isStreaming }: Props) {
  if (!text) return null;

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-indigo-400">AI</span>
        </div>
        <span className="text-xs font-medium text-[var(--text-primary)]">
          종합 해석
        </span>
        {isStreaming && (
          <span className="text-[10px] text-indigo-400 animate-pulse">분석 중...</span>
        )}
      </div>

      <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
        {text}
        {isStreaming && <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5" />}
      </div>
    </div>
  );
}
```

---

## 13. 백엔드: `functions/index.js` (변경 부분만)

### simplifySector (L5549-5573)

```js
function simplifySector(industry) {
  if (!industry) return "기타";
  const rules = [
    [["반도체", "전자부품", "Semiconductor"], "반도체"],
    [["소프트웨어", "컴퓨터", "정보통신", "정보 서비스", "게임", "인터넷", "IT", "Software", "Technology", "기록매체"], "IT"],
    [["자동차", "차체", "자동차부품", "Auto"], "자동차"],
    [["의약", "제약", "바이오", "의료", "헬스", "Biotech", "Pharma"], "바이오/제약"],
    [["금융", "은행", "증권", "보험", "투자", "캐피탈", "Financial", "리스"], "금융"],
    [["화학", "비료", "플라스틱", "고무", "비금속", "유리", "세라믹", "Chemical"], "화학/소재"],
    [["철강", "비철금속", "금속", "주조", "Materials"], "금속/철강"],
    [["석유", "가스", "에너지", "전기업", "Energy"], "에너지"],
    [["식품", "음료", "식료", "곡물", "과실", "낙농", "도축", "담배", "소매", "도매", "상품", "유통", "Consumer"], "유통/소비재"],
    [["건설", "건물", "시설물", "기반조성", "토목", "기계", "산업용", "운송장비", "조선", "Industrial"], "건설/산업재"],
    [["방송", "통신", "미디어", "영화", "광고", "출판", "Communication"], "미디어/통신"],
    [["섬유", "의복", "가죽", "가구", "종이"], "생활/소비재"],
    [["운송", "해운", "항공", "물류", "창고", "육상"], "운송"],
  ];
  for (const [keywords, sector] of rules) {
    for (const kw of keywords) {
      if (industry.includes(kw)) return sector;
    }
  }
  return "기타";
}
```

### 투자 조언 후처리 필터 (L5575-5598)

```js
const ADVICE_PATTERNS = [
  /(?:매수|매도|손절|홀드|추가\s*매수|비중\s*축소|비중\s*확대|비중\s*조[정절]|물타기|분할\s*매[수도]).*(?:하세요|하십시오|하시기|합시다|바랍니다)/,
  /(?:권합니다|권해\s*드립니다|추천합니다|제안합니다|권고합니다)/,
  /(?:손절|물타기|매수|매도|비중\s*조정|비중\s*축소|비중\s*확대|포지션|리밸런싱).*(?:필요|해야|검토|고려|판단)/,
  /(?:매수|매도|진입|이탈).*(?:대기|관망|기다리|지켜보)/,
  /(?:수익|이익|차익).*(?:보장|확실|기대됩니다)/,
  /(?:좋은\s*기회|절호의\s*기회|적기|매력적인\s*구간)/,
];

function sanitizeInterpretation(text) {
  return text
    .split(/(?<=[.!?]\s)/)
    .filter((sentence) => {
      for (const pattern of ADVICE_PATTERNS) {
        if (pattern.test(sentence)) {
          console.warn("[투자조언 필터 차단]:", sentence.trim());
          return false;
        }
      }
      return true;
    })
    .join("");
}
```

### 피어슨 상관계수 (L5600-5618)

```js
function pearsonCorrelation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 20) return 0;
  const ra = [], rb = [];
  for (let i = 1; i < n; i++) {
    ra.push((a[i] - a[i - 1]) / a[i - 1]);
    rb.push((b[i] - b[i - 1]) / b[i - 1]);
  }
  const meanA = ra.reduce((s, v) => s + v, 0) / ra.length;
  const meanB = rb.reduce((s, v) => s + v, 0) / rb.length;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < ra.length; i++) {
    const da = ra[i] - meanA, db = rb[i] - meanB;
    cov += da * db; varA += da * da; varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : Math.round((cov / denom) * 100) / 100;
}
```

### portfolioAnalyze 엔드포인트 (L5620-6024)

```js
exports.portfolioAnalyze = onRequest(
  {
    secrets: [geminiApiKey, dartApiKey],
    cors: true,
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64가 필요합니다." });
      return;
    }

    // SSE 헤더
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sse = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const dartKey = dartApiKey.value();

      // ── Phase A: OCR ──
      const ocrPrompt = `이 증권사 앱 스크린샷에서 보유 종목 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만:

{
  "stocks": [
    {
      "name": "종목명 (한글)",
      "qty": 보유수량,
      "avgPrice": 평균매입가,
      "currentPrice": 현재가 또는 null,
      "returnPct": 수익률 또는 null
    }
  ]
}

규칙:
- 종목명은 정확히 표시된 대로 추출
- 수량, 가격에서 쉼표 제거하고 숫자만
- 현재가나 수익률이 보이지 않으면 null
- ETF, 펀드도 포함
- 최대 20종목까지`;

      const ocrResult = await model.generateContent([
        ocrPrompt,
        { inlineData: { mimeType: mimeType || "image/png", data: imageBase64 } },
      ]);
      const ocrText = ocrResult.response.text();

      // JSON 파싱 (4단계 폴백)
      let ocrParsed;
      try {
        ocrParsed = JSON.parse(ocrText);
      } catch {
        try {
          const cleaned = ocrText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          ocrParsed = JSON.parse(cleaned);
        } catch {
          const match = ocrText.match(/\{[\s\S]*\}/);
          if (match) ocrParsed = JSON.parse(match[0]);
          else throw new Error("OCR 결과 파싱 실패");
        }
      }

      if (!ocrParsed?.stocks?.length) {
        sse({ type: "error", message: "종목을 인식할 수 없습니다. 다른 스크린샷을 시도해주세요." });
        res.end();
        return;
      }

      // 종목명 → 코드 매핑
      const mappedStocks = ocrParsed.stocks.map((stock) => {
        const match = krStocksRaw.find((s) => s.n === stock.name);
        return {
          ...stock,
          symbol: match ? match.s.replace(".KS", "").replace(".KQ", "") : null,
          fullSymbol: match ? match.s : null,
          sector: match ? match.i : null,
          market: match ? match.m : null,
        };
      }).filter((s) => s.symbol);

      const unmapped = ocrParsed.stocks.filter((stock) => !krStocksRaw.find((s) => s.n === stock.name));

      sse({
        type: "ocr",
        stocks: mappedStocks,
        unmapped: unmapped.map((s) => s.name),
      });

      if (mappedStocks.length === 0) {
        sse({ type: "error", message: "인식된 종목 중 매핑 가능한 한국 주식이 없습니다." });
        res.end();
        return;
      }

      // ── Phase B: 데이터 수집 (2개씩 배치 병렬) ──
      const collectedData = [];
      const BATCH_SIZE = 2;

      for (let i = 0; i < mappedStocks.length; i += BATCH_SIZE) {
        const batch = mappedStocks.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (stock) => {
            const code = stock.symbol;
            const fullSym = stock.fullSymbol;

            sse({ type: "progress", stock: stock.name, step: "start", status: "loading" });

            const [perBandResult, trendResult, chartResult] =
              await Promise.allSettled([
                fetchPerBandInternal(code, dartKey),
                fetchInvestorTrendInternal(fullSym, 60),
                fetchStockChartInternal(fullSym, "6mo", "1d"),
              ]);

            const stockData = {
              name: stock.name,
              symbol: code,
              fullSymbol: fullSym,
              qty: stock.qty,
              avgPrice: stock.avgPrice,
              currentPrice: stock.currentPrice,
              returnPct: stock.returnPct,
              sector: stock.sector,
            };

            // PER 밴드
            if (perBandResult.status === "fulfilled" && perBandResult.value) {
              const pb = perBandResult.value;
              stockData.perBand = {
                currentPer: pb.currentPer,
                perPosition: pb.perPosition,
                bands: pb.perBands,
                forwardPer: pb.forwardPer,
              };
              sse({
                type: "progress", stock: stock.name, step: "perBand", status: "done",
                preview: { currentPer: pb.currentPer, perPosition: pb.perPosition },
              });
            } else {
              stockData.perBand = null;
              sse({ type: "progress", stock: stock.name, step: "perBand", status: "failed" });
            }

            // 수급
            if (trendResult.status === "fulfilled" && trendResult.value) {
              const daily = trendResult.value.daily || [];
              const recent30 = daily.slice(-30);
              const foreignNet30 = recent30.reduce((s, d) => s + (d.foreign || 0), 0);
              const instNet30 = recent30.reduce((s, d) => s + (d.institution || 0), 0);
              const indivNet30 = recent30.reduce((s, d) => s + (d.individual || 0), 0);
              const foreignStreak = calcStreak(daily, "foreign");
              stockData.supply = { foreignNet30, institutionNet30: instNet30, individualNet30: indivNet30, foreignStreak };
              sse({
                type: "progress", stock: stock.name, step: "investorTrend", status: "done",
                preview: { foreignNet30, foreignStreak },
              });
            } else {
              stockData.supply = null;
              sse({ type: "progress", stock: stock.name, step: "investorTrend", status: "failed" });
            }

            // 차트 + 기술지표
            if (chartResult.status === "fulfilled" && chartResult.value) {
              const candles = chartResult.value.candles;
              stockData.technicals = calcTechnicalIndicators(candles);
              stockData.sparkline = candles.slice(-20).map((c) => c.close);
              if (!stockData.currentPrice && candles.length > 0) {
                stockData.currentPrice = candles[candles.length - 1].close;
              }
              sse({
                type: "progress", stock: stock.name, step: "chart", status: "done",
                preview: stockData.technicals ? {
                  rsi: stockData.technicals.rsi,
                  maStatus: stockData.technicals.maStatus,
                  trend: stockData.technicals.trend,
                } : null,
              });
            } else {
              stockData.technicals = null;
              stockData.sparkline = [];
              sse({ type: "progress", stock: stock.name, step: "chart", status: "failed" });
            }

            collectedData.push(stockData);
          })
        );
      }

      // ── Phase C: 포트폴리오 레벨 계산 ──
      sse({ type: "analysis", status: "calculating" });

      let totalValue = 0;
      const sectorMap = {};
      for (const s of collectedData) {
        const val = (s.currentPrice || s.avgPrice) * s.qty;
        totalValue += val;
        const sector = simplifySector(s.sector);
        sectorMap[sector] = (sectorMap[sector] || 0) + val;
      }
      const sectorWeights = Object.entries(sectorMap)
        .map(([sector, value]) => ({ sector, value, weight: Math.round((value / (totalValue || 1)) * 100) }))
        .sort((a, b) => b.weight - a.weight);

      const correlationMatrix = {};
      for (let i = 0; i < collectedData.length; i++) {
        for (let j = i + 1; j < collectedData.length; j++) {
          const a = collectedData[i].sparkline || [];
          const b = collectedData[j].sparkline || [];
          if (a.length >= 10 && b.length >= 10) {
            correlationMatrix[`${collectedData[i].symbol}_${collectedData[j].symbol}`] =
              pearsonCorrelation(a, b);
          }
        }
      }

      const hhi = sectorWeights.reduce((sum, s) => sum + (s.weight / 100) ** 2, 0);
      let diversificationScore = Math.round((1 - hhi) * 100);
      const highCorr = Object.values(correlationMatrix).filter((c) => Math.abs(c) > 0.7);
      diversificationScore = Math.max(0, Math.min(100, diversificationScore - highCorr.length * 10));

      let totalReturn = 0;
      if (totalValue > 0) {
        let totalCost = 0;
        for (const s of collectedData) {
          totalCost += s.avgPrice * s.qty;
        }
        totalReturn = totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10 : 0;
      }

      const portfolioSummary = {
        totalValue,
        totalReturn,
        stockCount: collectedData.length,
        sectorWeights,
        diversificationScore,
        correlationMatrix,
        dataTimestamp: new Date().toISOString(),
      };

      // ── Phase D: AI 종합 해석 ──
      sse({ type: "analysis", status: "interpreting" });

      const stocksSummaryText = collectedData.map((s) => {
        const ret = s.returnPct != null ? `수익률 ${s.returnPct > 0 ? "+" : ""}${s.returnPct}%` : "";
        return `- ${s.name} ${s.qty}주 (평단가 ${Math.round(s.avgPrice).toLocaleString()}원${ret ? ", " + ret : ""})`;
      }).join("\n");

      const stocksDetailText = collectedData.map((s) => {
        let text = `## ${s.name} (${s.symbol})\n`;
        if (s.perBand) {
          text += `### 밸류에이션 (DART 기준)\n`;
          text += `- 현재 PER: ${s.perBand.currentPer ?? "N/A"}배\n`;
          text += `- PER 밴드 위치: ${s.perBand.perPosition}% (10년 기준)\n`;
          if (s.perBand.bands) text += `- PER 범위: ${s.perBand.bands.min?.toFixed(1)}~${s.perBand.bands.max?.toFixed(1)}배\n`;
        }
        if (s.supply) {
          const fs = s.supply.foreignStreak;
          text += `### 수급 (KIS 30일)\n`;
          text += `- 외국인: ${s.supply.foreignNet30 > 0 ? "+" : ""}${s.supply.foreignNet30.toLocaleString()} (${fs > 0 ? fs + "일 연속 매수" : Math.abs(fs) + "일 연속 매도"})\n`;
          text += `- 기관: ${s.supply.institutionNet30 > 0 ? "+" : ""}${s.supply.institutionNet30.toLocaleString()}\n`;
        }
        if (s.technicals) {
          text += `### 추세 (Yahoo Finance OHLCV)\n`;
          text += `- 이동평균: ${s.technicals.maStatus}\n`;
          text += `- RSI(14): ${s.technicals.rsi}\n`;
          text += `- MACD: ${s.technicals.macd > 0 ? "양" : "음"}수 (${s.technicals.macdCross})\n`;
          text += `- 볼린저 밴드: ${s.technicals.bbPosition}% 위치\n`;
        }
        return text;
      }).join("\n");

      const sectorText = sectorWeights.map((s) => `${s.sector} ${s.weight}%`).join(", ");
      const correlationText = Object.entries(correlationMatrix)
        .filter(([, v]) => Math.abs(v) > 0.5)
        .map(([key, v]) => {
          const [a, b] = key.split("_");
          const nameA = collectedData.find((s) => s.symbol === a)?.name || a;
          const nameB = collectedData.find((s) => s.symbol === b)?.name || b;
          return `- ${nameA} <-> ${nameB}: 상관계수 ${v}`;
        }).join("\n") || "- 유의미한 상관관계 없음";

      const interpretPrompt = `[페르소나]
당신은 증권사 리서치센터의 데이터 분석가입니다.
주식 초보자도 이해할 수 있도록 데이터를 쉽게 풀어서 설명합니다.

[말투 규칙]
1. 존칭을 사용합니다. "~입니다", "~있습니다", "~됩니다"로 끝냅니다.
2. 캐주얼 표현 금지: ㅎㅎ, ㅋㅋ, ~네요, ~죠, ~거든요
3. 감탄이나 주관적 감정 금지: "놀랍게도", "안타깝게도"
4. 전문 용어는 반드시 괄호로 쉬운 풀이를 붙입니다.
   예: "RSI 75 (과열, 즉 단기간에 많이 올랐다는 신호)"
   예: "PER 밴드 상위 80% (과거 10년 중 비싼 편에 해당)"
   예: "외국인 연속 15일 순매수 (한 방향으로 지속적으로 사들이는 중)"
5. 모든 수치에는 출처를 명시합니다: "(DART 기준)", "(KIS 30일 데이터)"
6. 문단은 짧게 유지합니다 (3~4문장).
7. 단순 나열이 아닌, 지표 간 교차 해석을 합니다.

[절대 금지]
- 모든 문장을 관찰문으로만 씁니다. 동사형 지시 금지.
- "매수", "매도", "홀드", "손절", "물타기" 등 투자 행동 용어 금지.
- "~하세요", "~검토", "~고려", "~대기", "~관망" 등 행동 유도 표현 금지.
- "~필요합니다", "~바람직합니다" 등 판단 유도 표현 금지.
- 행동 옵션 나열 금지 ("A 또는 B 판단 필요" 등).
- 종합 등급(S/A/B/C/D) 매기기 금지.

[데이터]
## 포트폴리오 구성
${stocksSummaryText}

## 포트폴리오 구조
- 총 평가액: ${Math.round(totalValue).toLocaleString()}원
- 총 수익률: ${totalReturn > 0 ? "+" : ""}${totalReturn}%
- 섹터 구성: ${sectorText}
- 분산도 점수: ${diversificationScore}/100 (HHI 기반)

${stocksDetailText}

## 종목 간 상관관계
${correlationText}

[해석 요청]
초보 투자자가 자신의 포트폴리오 상태를 이해할 수 있도록 다음 구조로 설명하세요:

1. **한눈에 보는 포트폴리오** (2~3문장)
   - 몇 개 종목, 어떤 분야에 집중되어 있는지
   - 분산이 잘 되어 있는지 아닌지를 쉬운 말로

2. **종목별 교차 해석** (종목당 2~3문장)
   - 각 종목의 데이터를 따로 나열하지 말고, 서로 다른 지표가 같은 방향인지 다른 방향인지 교차 분석
   - 예: "PER은 저평가 구간인데, 주가 추세는 하락 중이어서 아직 반등 신호는 보이지 않는 상태입니다"
   - 예: "외국인이 꾸준히 매수 중이고, RSI도 아직 과열이 아니어서 수급 흐름과 기술 지표가 같은 방향입니다"

3. **이런 점이 눈에 띕니다** (2~3개)
   - 종목 간 상관관계가 높아 같이 움직일 가능성
   - 한 종목에서 지표끼리 상반된 신호가 나오는 경우
   - 포트폴리오 전체의 구조적 특징 (편중, 상관관계 등)

JSON이 아닌 자연어 텍스트로 응답하세요.`;

      const streamResult = await model.generateContentStream(interpretPrompt);
      let fullInterpretation = "";

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          fullInterpretation += text;
          sse({ type: "interpretation", t: text });
        }
      }

      fullInterpretation = sanitizeInterpretation(fullInterpretation);

      // ── Phase E: 완료 ──
      const disclaimer = "본 분석은 공개된 데이터(DART, KIS, Yahoo Finance)를 기반으로 한 현황 정리이며, 투자 자문이 아닙니다. 투자 판단의 책임은 본인에게 있습니다.";

      const finalResult = {
        portfolio: portfolioSummary,
        stocks: collectedData.map((s) => ({
          name: s.name,
          symbol: s.symbol,
          qty: s.qty,
          avgPrice: s.avgPrice,
          currentPrice: s.currentPrice,
          returnPct: s.returnPct,
          sector: simplifySector(s.sector),
          perBand: s.perBand,
          supply: s.supply,
          technicals: s.technicals,
          sparkline: s.sparkline || [],
          disclosures: [],
        })),
        interpretation: fullInterpretation,
        disclaimer,
      };

      sse({ type: "done", r: finalResult });
      res.end();
    } catch (err) {
      console.error("[portfolio] Error:", err);
      sse({ type: "error", message: err.message || "분석 중 오류가 발생했습니다." });
      res.end();
    }
  }
);
```

---

## firebase.json rewrite 추가

```json
{ "source": "/api/portfolio-analyze", "function": "portfolioAnalyze" }
```
