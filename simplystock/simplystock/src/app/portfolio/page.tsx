"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, Camera, ImagePlus, Keyboard, Share2, Shield, Clock, Sparkles, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePortfolioAnalysis } from "@/hooks/usePortfolioAnalysis";
import { CollectionProgress } from "@/components/portfolio/CollectionProgress";
import { PortfolioDashboard } from "@/components/portfolio/PortfolioDashboard";
import { AiInterpretation } from "@/components/portfolio/AiInterpretation";
import type { ViewMode } from "@/components/portfolio/AiInterpretation";
import { DiagnosisCard } from "@/components/portfolio/DiagnosisCard";
import { StockSummaryCard } from "@/components/portfolio/StockSummaryCard";
import { BodyPositionFull, calcPosition, getBodyPart } from "@/components/portfolio/BodyPositionChart";
import { StockReviewList } from "@/components/portfolio/StockReviewList";
import { ManualStockInput } from "@/components/portfolio/ManualStockInput";
import { ShareModal } from "@/components/ShareModal";
import { calcHealthScore } from "@/lib/portfolioShareImage";
import { saveDiagnosis, getLastDiagnosis, type DiagnosisStockRecord } from "@/lib/portfolioDiagnosisDb";
import { generateBodyShareImage } from "@/lib/bodyShareImage";
import { savePortfolioShare, completeKakaoShareApi, checkShareCouponStatus } from "@/lib/portfolioShareDb";
import { kakaoShareFeed } from "@/lib/kakaoShare";
import { auth } from "@/lib/firebase";

/* ── 분석 횟수 쿠폰 유틸 ── */
const LS_ANALYSIS_COUNT = "portfolio_analysis_count";
const LS_ANALYSIS_COUPON = "portfolio_analysis_coupon_until";
const LS_PENDING_SHARE_ID = "portfolio_coupon_pending_share_id";

function getAnalysisCount(): number {
  try { return parseInt(localStorage.getItem(LS_ANALYSIS_COUNT) || "0", 10); } catch { return 0; }
}
function incrementAnalysisCount(): void {
  try { localStorage.setItem(LS_ANALYSIS_COUNT, String(getAnalysisCount() + 1)); } catch {}
}
function hasAnalysisCoupon(): boolean {
  try {
    const until = localStorage.getItem(LS_ANALYSIS_COUPON);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch { return false; }
}
function grantAnalysisCoupon(): void {
  try { localStorage.setItem(LS_ANALYSIS_COUPON, String(Date.now() + 24 * 60 * 60 * 1000)); } catch {}
}
function getCouponRemaining(): string | null {
  try {
    const until = localStorage.getItem(LS_ANALYSIS_COUPON);
    if (!until) return null;
    const ms = parseInt(until, 10) - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}시간 ${m}분`;
  } catch { return null; }
}

const SIGNAL_LABELS: Record<string, string> = {
  danger: "위험",
  warning: "경고",
  caution: "주의",
  good: "양호",
  strong: "강세",
};

const SIGNAL_ORDER: Record<string, number> = {
  danger: 0,
  warning: 1,
  caution: 2,
  good: 3,
  strong: 4,
};

export default function PortfolioTestPage() {
  // ref 파라미터 로깅 (유입 경로 추적)
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      console.log("portfolio_entry_ref:", ref);
    }
  }, []);

  return <PortfolioMain />;
}

function PortfolioMain() {
  const {
    pageState,
    ocrImages,
    ocrProgress,
    ocrLoading,
    editableStocks,
    unmappedNames,
    collectionProgress,
    currentPhase,
    phaseLabel,
    result,
    interpretation,
    isStreaming,
    error,
    addImages,
    addManualStock,
    removeStock,
    updateStock,
    startAnalysis,
    backToReview,
    reset,
  } = usePortfolioAnalysis();

  const [dragActive, setDragActive] = useState(false);
  const [inputTab, setInputTab] = useState<"image" | "manual">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [globalViewMode, setGlobalViewMode] = useState<ViewMode>("trailing");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | undefined>();
  const [shareScore, setShareScore] = useState(0);
  const [shareUrl, setShareUrl] = useState("https://simplystock.co.kr/portfolio");
  const [analysisGateOpen, setAnalysisGateOpen] = useState(false);
  const [couponPending, setCouponPending] = useState(false);
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [prevBanner, setPrevBanner] = useState<string | null>(null);
  const savedRef = useRef(false);

  // 결과 저장 + 이전 검진 비교
  useEffect(() => {
    if (!result?.aiAnalysis || savedRef.current) return;
    savedRef.current = true;

    const ai = result.aiAnalysis;
    const diagnosis = ai.portfolio_diagnosis.trailing;
    const stockRecords: DiagnosisStockRecord[] = ai.stocks.map((s) => ({
      code: s.code,
      name: s.name,
      signal: s.trailing.signal,
      returnPct: result.stocks.find((st) => st.symbol === s.code)?.returnPct ?? null,
      perPosition: result.stocks.find((st) => st.symbol === s.code)?.perBand?.perPosition ?? null,
    }));

    // 이전 검진 조회 후 저장
    (async () => {
      try {
        const prev = await getLastDiagnosis();
        if (prev) {
          const changes: string[] = [];
          const d = new Date(prev.createdAt);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          for (const ps of prev.stocks) {
            const current = ai.stocks.find((s) => s.code === ps.code);
            if (current && current.trailing.signal !== ps.signal) {
              changes.push(`${ps.name} ${SIGNAL_LABELS[ps.signal]}→${SIGNAL_LABELS[current.trailing.signal]}`);
            }
          }
          if (changes.length > 0) {
            setPrevBanner(`지난 검진(${dateStr}) 대비: ${changes.slice(0, 3).join(" | ")}`);
          }
        }
      } catch { /* 조회 실패 무시 */ }

      try {
        await saveDiagnosis(
          {
            totalValue: result.portfolio.totalValue,
            totalReturn: result.portfolio.totalReturn,
            signal: diagnosis.overall_signal,
            stockCount: result.portfolio.stockCount,
          },
          stockRecords,
        );
      } catch { /* 저장 실패 무시 */ }
    })();
  }, [result]);

  /* ── 공유 쿠폰 pending 복원 + 폴링 ── */
  const startCouponPolling = useCallback((shareId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const { couponStatus } = await checkShareCouponStatus(shareId);
        if (couponStatus === "activated") {
          grantAnalysisCoupon();
          try { localStorage.removeItem(LS_PENDING_SHARE_ID); } catch {}
          setPendingShareId(null);
          setCouponPending(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          alert("쿠폰 활성화! 24시간 무제한 분석할 수 있어요.");
        }
      } catch { /* 폴링 실패 무시 */ }
    }, 30000);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_PENDING_SHARE_ID);
      if (!saved) return;
      setPendingShareId(saved);
      setCouponPending(true);
      // 즉시 상태 확인
      (async () => {
        try {
          const { couponStatus } = await checkShareCouponStatus(saved);
          if (couponStatus === "activated") {
            grantAnalysisCoupon();
            localStorage.removeItem(LS_PENDING_SHARE_ID);
            setPendingShareId(null);
            setCouponPending(false);
          } else if (couponStatus === "pending") {
            startCouponPolling(saved);
          } else {
            // not_found 등 → 클리어
            localStorage.removeItem(LS_PENDING_SHARE_ID);
            setPendingShareId(null);
            setCouponPending(false);
          }
        } catch {
          startCouponPolling(saved);
        }
      })();
    } catch {}
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [startCouponPolling]);

  /* ── 분석 시작 (게이트 체크) ── */
  const handleStartAnalysis = useCallback(() => {
    const count = getAnalysisCount();
    if (count >= 2 && !hasAnalysisCoupon()) {
      setAnalysisGateOpen(true);
      return;
    }
    incrementAnalysisCount();
    startAnalysis();
  }, [startAnalysis]);

  const handleGateKakaoShare = useCallback(async () => {
    try {
      const { shareId } = await completeKakaoShareApi();
      await kakaoShareFeed({
        title: "포트폴리오 AI 건강검진",
        description: "내 보유 종목을 AI가 진단합니다 — 무료로 검진해보세요!",
        shareUrl: `https://simplystock.co.kr/portfolio/share?id=${shareId}`,
        buttonTitle: "나도 검진하기",
      });
      try { localStorage.setItem(LS_PENDING_SHARE_ID, shareId); } catch {}
      setPendingShareId(shareId);
      setCouponPending(true);
      setAnalysisGateOpen(false);
      startCouponPolling(shareId);
    } catch {
      // API 실패 시 기존 동작 (즉시 쿠폰 발급)
      await kakaoShareFeed({
        title: "포트폴리오 AI 건강검진",
        description: "내 보유 종목을 AI가 진단합니다 — 무료로 검진해보세요!",
        shareUrl: "https://simplystock.co.kr/portfolio",
        buttonTitle: "나도 검진하기",
      });
      grantAnalysisCoupon();
      setAnalysisGateOpen(false);
      incrementAnalysisCount();
      startAnalysis();
    }
  }, [startAnalysis, startCouponPolling]);

  /* ── 공유 (게이트 없음, 자유 공유) ── */
  const handleShare = useCallback(async () => {
    if (!result?.aiAnalysis) return;

    // 건강점수 계산
    const aiStocks = result.aiAnalysis.stocks;
    const stockSignals = result.stocks.map((s) => {
      const ai = aiStocks.find((a) => a.code === s.symbol);
      const signal = ai ? ai[globalViewMode].signal : ("caution" as const);
      const value = s.currentPrice ? s.qty * s.currentPrice : 0;
      return { signal, weight: value };
    });
    const healthScore = calcHealthScore(stockSignals);
    setShareScore(healthScore);

    // 종목별 position 계산 (투자금액 포함)
    const validStocks = result.stocks.filter((s) => s.avgPrice > 0 && s.priceRange3y);
    const stockPositions = validStocks.map((s) => ({
      name: s.name,
      position: calcPosition(s.avgPrice, s.priceRange3y!),
      invested: s.qty * s.avgPrice,
    }));

    // 투자금액 가중평균
    const totalInvested = stockPositions.reduce((sum, s) => sum + s.invested, 0);
    const avgPosition = totalInvested > 0
      ? stockPositions.reduce((sum, s) => sum + s.position * s.invested, 0) / totalInvested
      : stockPositions.length > 0
        ? stockPositions.reduce((sum, s) => sum + s.position, 0) / stockPositions.length
        : 50;

    // 이미지 생성
    let img: string | undefined;
    if (stockPositions.length > 0) {
      try {
        img = generateBodyShareImage({ stocks: stockPositions, avgPosition });
      } catch (e) {
        console.error("[share] image generation failed:", e);
      }
    }
    setShareImage(img);

    // Firestore 저장 (백그라운드)
    if (stockPositions.length > 0) {
      const avgPart = getBodyPart(avgPosition);
      const ownerName = auth.currentUser?.displayName || "익명 투자자";
      savePortfolioShare({
        ownerName,
        avgPosition,
        bodyPart: avgPart.label,
        stocks: stockPositions,
      })
        .then((shareId) => {
          setShareUrl(`https://simplystock.co.kr/portfolio/share?id=${shareId}`);
        })
        .catch((e) => {
          console.error("[share] Firestore save failed:", e);
        });
    }

    setShareOpen(true);
  }, [result, globalViewMode]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    addImages(Array.from(files));
  }, [addImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-bold">포트폴리오 AI 건강검진</h1>
          </div>
          <div className="flex items-center gap-2">
            {pageState === "result" && result?.aiAnalysis && (
              <button
                onClick={handleShare}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1"
              >
                <Share2 className="h-3 w-3" />
                공유
              </button>
            )}
            {pageState !== "upload" && (
              <button
                onClick={reset}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                처음부터
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        {/* Upload */}
        {pageState === "upload" && (
          <>
            {/* 히어로 섹션 */}
            <div className="text-center pt-4 pb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-400 font-medium mb-4">
                <Sparkles className="h-3 w-3" />
                AI 기반 포트폴리오 분석
              </div>
              <h2 className="text-xl font-black text-[var(--text-primary)] mb-2 leading-tight">
                내 포트폴리오,<br />AI가 진단합니다
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                보유 종목의 밸류에이션, 수급, 기술적 지표를<br />종합 분석하여 건강 상태를 알려드립니다
              </p>
            </div>

            {/* 신뢰 포인트 */}
            <div className="flex items-center justify-center gap-4 py-2">
              {[
                { icon: Clock, text: "30초 완료" },
                { icon: Sparkles, text: "완전 무료" },
                { icon: Shield, text: "이미지 즉시 삭제" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                  <item.icon className="h-3 w-3 text-indigo-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* 입력 방법 카드 2개 */}
            <div className="space-y-3 pt-2">
              {/* 스크린샷 카드 */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`rounded-xl border p-5 transition-all cursor-pointer group ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/10"
                    : inputTab === "image"
                      ? "border-indigo-500/50 bg-indigo-500/5"
                      : "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-indigo-500/30"
                }`}
                onClick={() => setInputTab("image")}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
                    <Camera className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">스크린샷으로 자동 인식</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-medium">추천</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                      증권사 앱의 보유종목 화면을 캡처해서 올리면<br />종목명, 수량, 평균가를 AI가 자동 인식합니다
                    </p>
                    <label className="inline-block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                      <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors">
                        <Camera className="h-4 w-4" />
                        사진 선택 / 촬영
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 직접 입력 카드 */}
              <div
                className={`rounded-xl border p-5 transition-all cursor-pointer ${
                  inputTab === "manual"
                    ? "border-indigo-500/50 bg-indigo-500/5"
                    : "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-indigo-500/30"
                }`}
                onClick={() => setInputTab("manual")}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-overlay)]">
                    <Keyboard className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">직접 입력</h3>
                      <ChevronRight className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${inputTab === "manual" ? "rotate-90" : ""}`} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      종목을 검색해서 수량과 평균매입가를 직접 입력합니다
                    </p>
                  </div>
                </div>
                {inputTab === "manual" && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-secondary)]" onClick={(e) => e.stopPropagation()}>
                    <ManualStockInput onAdd={addManualStock} />
                  </div>
                )}
              </div>
            </div>

            {/* 지원 증권사 */}
            <div className="pt-2">
              <p className="text-[11px] text-[var(--text-faint)] text-center mb-2">지원 증권사</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {["키움", "토스", "미래에셋", "삼성", "나무(NH)", "KB", "한투", "카카오페이"].map((name) => (
                  <span key={name} className="px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-secondary)] text-[11px] text-[var(--text-muted)]">
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-faint)] text-center mt-2">
                여러 장 동시 선택 가능 (스크롤해서 추가 촬영)
              </p>
            </div>

            {/* OCR 진행 표시 */}
            {isStreaming && ocrProgress && (
              <div className="rounded-xl border border-indigo-500/40 bg-[var(--bg-card)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-[var(--text-primary)]">
                    이미지 인식 중 ({ocrProgress.index + 1}/{ocrProgress.total})
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${Math.round(((ocrProgress.index + (ocrProgress.status === "done" ? 1 : 0.5)) / ocrProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Review */}
        {pageState === "review" && (
          <>
            {/* OCR 로딩 */}
            {ocrLoading && <OcrLoadingSkeleton ocrProgress={ocrProgress} />}

            {/* OCR 완료 → 종목 리스트 + 수동 추가 + 분석 버튼 */}
            {!ocrLoading && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    인식된 종목 ({editableStocks.length}개)
                  </h2>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      <ImagePlus className="h-3 w-3" />
                      이미지 추가
                    </span>
                  </label>
                </div>

                <StockReviewList
                  stocks={editableStocks}
                  unmapped={unmappedNames}
                  onRemove={removeStock}
                  onUpdate={updateStock}
                />

                {/* 수동 추가 */}
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-3 space-y-2">
                  <span className="text-[11px] text-[var(--text-muted)]">종목 수동 추가</span>
                  <ManualStockInput onAdd={addManualStock} />
                </div>

                {/* 분석 시작 버튼 */}
                <div className="sticky bottom-4 pt-2">
                  {getCouponRemaining() && (
                    <p className="text-center text-[11px] text-indigo-400 mb-1.5">
                      무제한 분석 쿠폰: {getCouponRemaining()} 남음
                    </p>
                  )}
                  <button
                    onClick={handleStartAnalysis}
                    disabled={editableStocks.length === 0 || isStreaming}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    {editableStocks.length > 0
                      ? `${editableStocks.length}개 종목 분석 시작`
                      : "종목을 추가해주세요"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Collecting */}
        {pageState === "collecting" && (
          <CollectionProgress
            stocks={editableStocks}
            progress={collectionProgress}
            currentPhase={currentPhase}
            phaseLabel={phaseLabel}
          />
        )}

        {/* Result */}
        {pageState === "result" && result && (() => {
          const stockNameMap = Object.fromEntries(result.stocks.map((s) => [s.symbol, s.name]));
          const ai = result.aiAnalysis;
          const hasAnyForward = result.stocks.some((s) => s.perBand?.forwardPer != null);
          const diagnosis = ai?.portfolio_diagnosis?.[globalViewMode] ?? null;
          return (
            <>
              {/* 이전 검진 비교 배너 */}
              {prevBanner && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-[11px] text-indigo-300">
                  {prevBanner}
                </div>
              )}

              {/* 종합 진단 카드 (첫 화면) */}
              {diagnosis && (
                <DiagnosisCard
                  totalValue={result.portfolio.totalValue}
                  totalReturn={result.portfolio.totalReturn}
                  stockCount={result.portfolio.stockCount}
                  sectorCount={result.portfolio.sectorWeights.length}
                  diagnosis={diagnosis}
                />
              )}

              <PortfolioDashboard
                portfolio={result.portfolio}
                stockNameMap={stockNameMap}
                stocks={result.stocks}
                hasDiagnosis={!!diagnosis}
              />

              {/* 글로벌 Trailing/Forward 토글 */}
              {ai && hasAnyForward && (
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-1 flex">
                  {(["trailing", "forward"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGlobalViewMode(mode)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        globalViewMode === mode
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
                      }`}
                    >
                      {mode === "trailing" ? "Trailing PER 기준" : "Forward PER 기준"}
                    </button>
                  ))}
                </div>
              )}

              {/* 매수 위치 인체 시각화 */}
              <BodyPositionFull stocks={result.stocks} />

              {/* 종목 카드 (신호 위험도순 정렬) */}
              {[...result.stocks]
                .sort((a, b) => {
                  const aSignal = ai?.stocks.find((s) => s.code === a.symbol)?.[globalViewMode]?.signal || "caution";
                  const bSignal = ai?.stocks.find((s) => s.code === b.symbol)?.[globalViewMode]?.signal || "caution";
                  const orderDiff = (SIGNAL_ORDER[aSignal] ?? 2) - (SIGNAL_ORDER[bSignal] ?? 2);
                  if (orderDiff !== 0) return orderDiff;
                  const aVal = (a.currentPrice || a.avgPrice) * a.qty;
                  const bVal = (b.currentPrice || b.avgPrice) * b.qty;
                  return bVal - aVal;
                })
                .map((stock, i) => {
                  const stockAi = ai?.stocks.find((s) => s.code === stock.symbol) ?? null;
                  const aiView = stockAi?.[globalViewMode] ?? null;
                  return (
                    <StockSummaryCard
                      key={stock.symbol}
                      stock={stock}
                      aiView={aiView}
                      index={i}
                      dataAsOf={result.portfolio.dataAsOf}
                    />
                  );
                })}

              {/* AI 상세 분석 */}
              <AiInterpretation
                aiAnalysis={ai}
                interpretation={interpretation}
                isStreaming={isStreaming}
                viewMode={globalViewMode}
                stockNameMap={stockNameMap}
              />

              <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 text-xs text-[var(--text-muted)]">
                {result.disclaimer}
              </div>

              <ShareModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                imageDataUrl={shareImage}
                shareText={`내 포트폴리오 매수 위치를 맞춰보세요! ${diagnosis ? `${SIGNAL_LABELS[diagnosis.overall_signal]} 등급` : ""}`}
                shareUrl={shareUrl}
                imageFileName="portfolio-body-share.png"
                kakaoTitle="내 매수 위치를 맞춰보세요!"
                kakaoDescription={`${diagnosis ? `${SIGNAL_LABELS[diagnosis.overall_signal]} 등급` : ""} 포트폴리오 — 어디에서 샀을까?`}
                kakaoButtonTitle="맞춰보기"
              />
            </>
          );
        })()}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
            <button onClick={reset} className="ml-2 underline">
              다시 시도
            </button>
          </div>
        )}
      </main>

      {/* 분석 게이트 모달 (3회째부터) */}
      {analysisGateOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={() => setAnalysisGateOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAnalysisGateOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)]"
            >
              <X className="h-5 w-5" />
            </button>

            {!couponPending ? (
              <>
                <div className="text-center space-y-3 pt-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/15 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-bold">카카오톡 공유로 잠금 해제</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    카카오톡으로 한 번 공유하면<br />24시간 동안 무제한 분석할 수 있어요
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={handleGateKakaoShare}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#3C1E1E] hover:bg-[#FDD835] transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.9 3.33c-.08.3.26.54.52.37l3.87-2.57c.6.08 1.22.13 1.85.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z" />
                    </svg>
                    카카오톡으로 공유하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisGateOpen(false)}
                    className="w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-3 pt-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold">공유 대기 중</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    친구가 링크를 열면 쿠폰이 활성화돼요
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
                    대기 중...
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={handleGateKakaoShare}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#3C1E1E] hover:bg-[#FDD835] transition-colors"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.9 3.33c-.08.3.26.54.52.37l3.87-2.57c.6.08 1.22.13 1.85.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z" />
                    </svg>
                    다시 공유하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
                      try { localStorage.removeItem(LS_PENDING_SHARE_ID); } catch {}
                      setPendingShareId(null);
                      setCouponPending(false);
                    }}
                    className="w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    초기화
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 쿠폰 대기 중 배너 (게이트 닫혀도 표시) */}
      {couponPending && !analysisGateOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
          <div className="rounded-xl border border-amber-500/30 bg-[var(--bg-secondary)] px-4 py-3 text-center text-sm text-amber-400 shadow-lg">
            쿠폰 대기 중 — 친구가 공유 링크를 열면 활성화돼요
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── OCR 로딩 스켈레톤 ─── */

const OCR_STATUS_MESSAGES = [
  "종목 인식 중...",
  "포트폴리오 구성 분석 중...",
  "데이터 수집 준비 중...",
];

function OcrLoadingSkeleton({ ocrProgress }: { ocrProgress: { index: number; total: number; status?: string } | null }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % OCR_STATUS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSlowHint(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const progressText = ocrProgress
    ? `(${ocrProgress.index + 1}/${ocrProgress.total})`
    : "";

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes indeterminate{0%{left:-40%;width:40%}50%{left:30%;width:50%}100%{left:100%;width:40%}}
        @keyframes fadeMsg{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-4px)}}
        @keyframes skeletonIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* 프로그레스 카드 */}
      <div className="rounded-xl border border-indigo-500/40 bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="relative h-5 overflow-hidden flex-1">
            <span
              key={msgIdx}
              className="absolute text-sm font-medium text-[var(--text-primary)] animate-[fadeMsg_2s_ease-in-out]"
            >
              {OCR_STATUS_MESSAGES[msgIdx]} {progressText}
            </span>
          </div>
        </div>
        {/* indeterminate 프로그레스 바 */}
        <div className="h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden relative">
          <div className="absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[indeterminate_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* skeleton 카드 3개 — stagger 등장 */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3 animate-[skeletonIn_0.4s_ease-out_both]"
          style={{ animationDelay: `${300 + i * 300}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-[var(--bg-overlay)] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" />
              </div>
              <div className="h-2.5 w-16 rounded bg-[var(--bg-overlay)] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
            <div className="h-3 w-10 rounded bg-[var(--bg-overlay)] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" style={{ animationDelay: "0.6s" }} />
            </div>
          </div>
        </div>
      ))}

      {/* 안내 텍스트 */}
      <p className="text-center text-xs text-[var(--text-muted)] py-1">
        잠시만 기다려주세요
      </p>

      {/* 10초+ 지연 안내 */}
      {showSlowHint && (
        <p className="text-center text-[11px] text-[var(--text-muted)] animate-[skeletonIn_0.5s_ease-out]">
          데이터가 많으면 시간이 좀 걸릴 수 있어요
        </p>
      )}
    </div>
  );
}
