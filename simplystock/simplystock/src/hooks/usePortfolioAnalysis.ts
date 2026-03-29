"use client";

import { useState, useCallback, useRef } from "react";
import {
  startPortfolioOcr,
  startPortfolioAnalysis,
  type OcrStock,
  type OcrSSEMessage,
  type PortfolioAnalysisResult,
  type PortfolioSSEMessage,
} from "@/lib/portfolioAnalyzeApi";

export type PageState = "upload" | "review" | "collecting" | "result";

export type AnalysisPhase = "ocr" | "dart" | "chart" | "valuation" | "ai" | null;

export interface CollectionStep {
  stock: string;
  step: string;
  status: "loading" | "done" | "failed";
  preview?: Record<string, unknown>;
}

const STEP_KEYS = ["perBand", "investorTrend", "chart"];

export function usePortfolioAnalysis() {
  const [pageState, setPageState] = useState<PageState>("upload");
  const [ocrImages, setOcrImages] = useState<{ base64: string; mimeType: string }[]>([]);
  const [ocrProgress, setOcrProgress] = useState<{ index: number; total: number; status: string } | null>(null);
  const [editableStocks, setEditableStocks] = useState<OcrStock[]>([]);
  const [unmappedNames, setUnmappedNames] = useState<string[]>([]);
  const [collectionProgress, setCollectionProgress] = useState<CollectionStep[]>([]);
  const [currentPhase, setCurrentPhase] = useState<AnalysisPhase>(null);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState<PortfolioAnalysisResult | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSimTimer = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const MAX_WIDTH = 1200;
    const JPEG_QUALITY = 0.85;

    async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          // 이미 작은 이미지는 리사이즈 불필요
          if (img.width <= MAX_WIDTH) {
            const reader = new FileReader();
            reader.onload = () => resolve({
              base64: (reader.result as string).split(",")[1],
              mimeType: file.type || "image/png",
            });
            reader.readAsDataURL(file);
            return;
          }
          const scale = MAX_WIDTH / img.width;
          const canvas = document.createElement("canvas");
          canvas.width = MAX_WIDTH;
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
          resolve({
            base64: dataUrl.split(",")[1],
            mimeType: "image/jpeg",
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          // 압축 실패 시 원본 base64로 폴백
          const reader = new FileReader();
          reader.onload = () => resolve({
            base64: (reader.result as string).split(",")[1],
            mimeType: file.type || "image/png",
          });
          reader.readAsDataURL(file);
        };
        img.src = url;
      });
    }

    const newImages: { base64: string; mimeType: string }[] = [];
    for (const file of imageFiles) {
      const compressed = await compressImage(file);
      newImages.push(compressed);
    }

    setOcrImages((prev) => [...prev, ...newImages]);
    setError(null);
    setPageState("review");
    setOcrLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const handleOcrMessage = (msg: OcrSSEMessage) => {
        switch (msg.type) {
          case "ocr-progress":
            setOcrProgress({
              index: msg.index ?? 0,
              total: msg.total ?? 1,
              status: msg.status ?? "processing",
            });
            break;
          case "ocr-done":
            if (msg.stocks) {
              setEditableStocks((prev) => {
                const existing = new Set(prev.map((s) => s.symbol));
                const newOnes = msg.stocks!.filter((s) => !existing.has(s.symbol));
                return [...prev, ...newOnes];
              });
            }
            if (msg.unmapped) {
              setUnmappedNames((prev) => [...new Set([...prev, ...msg.unmapped!])]);
            }
            break;
          case "error":
            setError(msg.message ?? "OCR 실패");
            break;
        }
      };

      await startPortfolioOcr(newImages, handleOcrMessage, abortRef.current.signal);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "OCR 실패");
      }
    } finally {
      setIsStreaming(false);
      setOcrLoading(false);
      setOcrProgress(null);
    }
  }, []);

  const addManualStock = useCallback((stock: OcrStock) => {
    setEditableStocks((prev) => {
      if (prev.some((s) => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });
    if (pageState === "upload") setPageState("review");
  }, [pageState]);

  const removeStock = useCallback((index: number) => {
    setEditableStocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStock = useCallback((index: number, updates: Partial<OcrStock>) => {
    setEditableStocks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }, []);

  const handleAnalysisMessage = useCallback((msg: PortfolioSSEMessage) => {
    switch (msg.type) {
      case "ocr":
        break;

      case "phase":
        // 실제 서버 phase가 오면 타이머 phase를 덮어씀
        setCurrentPhase(msg.phase as AnalysisPhase);
        setPhaseLabel(msg.label ?? "");
        break;

      case "progress":
        // 실제 데이터 도착 → 타이머 시뮬레이션 덮어씀 (preview 포함)
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
        clearSimTimer();
        setPageState("result");
        setCurrentPhase(null);
        if (msg.t) {
          setInterpretation((prev) => prev + (msg.t as string));
        }
        break;

      case "done":
        clearSimTimer();
        setResult(msg.r as PortfolioAnalysisResult);
        setPageState("result");
        setCurrentPhase(null);
        setIsStreaming(false);
        break;

      case "error":
        clearSimTimer();
        setError(msg.message as string);
        setIsStreaming(false);
        break;
    }
  }, [clearSimTimer]);

  const startAnalysis = useCallback(async () => {
    if (editableStocks.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    clearSimTimer();

    // 320초 타임아웃 (백엔드 300초 + 여유 20초)
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      abortRef.current?.abort();
    }, 320_000);

    setError(null);
    setResult(null);
    setInterpretation("");
    setIsStreaming(true);
    setPageState("collecting");
    setCurrentPhase("dart");
    setPhaseLabel("데이터 수집 준비 중...");

    // 모든 종목 x 3 step을 loading으로 초기화
    const stockNames = editableStocks.map((s) => s.name || s.symbol);
    const allSteps: CollectionStep[] = stockNames.flatMap((name) =>
      STEP_KEYS.map((step) => ({ stock: name, step, status: "loading" as const }))
    );
    setCollectionProgress(allSteps);

    // 시뮬레이션 타이머: 2.5초마다 한 항목씩 "done"으로 전환
    const totalSim = allSteps.length;
    let simIdx = 0;

    const phaseSchedule = [
      { at: 0, phase: "dart" as AnalysisPhase, label: "DART 전자공시 조회 중..." },
      { at: Math.max(1, Math.floor(totalSim * 0.35)), phase: "valuation" as AnalysisPhase, label: "밸류에이션 계산 중..." },
      { at: Math.max(2, Math.floor(totalSim * 0.75)), phase: "ai" as AnalysisPhase, label: "AI 종합 분석 중..." },
    ];

    simTimerRef.current = setInterval(() => {
      if (simIdx >= totalSim) {
        // 모든 시뮬레이션 완료 → AI 분석 대기
        setCurrentPhase("ai");
        setPhaseLabel("AI 종합 분석 중...");
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        simTimerRef.current = null;
        return;
      }

      // phase 전환 체크
      const phaseChange = phaseSchedule.find((p) => p.at === simIdx);
      if (phaseChange) {
        setCurrentPhase(phaseChange.phase);
        setPhaseLabel(phaseChange.label);
      }

      // 현재 항목을 done으로 (실제 데이터가 이미 왔으면 건너뜀)
      const targetIdx = simIdx;
      setCollectionProgress((prev) => {
        const updated = [...prev];
        if (updated[targetIdx] && updated[targetIdx].status === "loading") {
          updated[targetIdx] = { ...updated[targetIdx], status: "done" };
        }
        return updated;
      });

      simIdx++;
    }, 2500);

    try {
      await startPortfolioAnalysis(
        { stocks: editableStocks },
        handleAnalysisMessage,
        abortRef.current.signal,
      );
    } catch (err) {
      clearSimTimer();
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        if (timedOut) {
          setError("분석에 시간이 걸리고 있습니다. 아래 버튼으로 다시 시도해주세요.");
        }
        // 사용자 취소는 에러 표시 안함
      } else {
        setError((err as Error).message || "분석 중 연결이 끊겼습니다. 다시 시도해주세요.");
      }
      // 결과가 없으면 review로 복귀 (종목 목록 유지)
      if (!result) setPageState("review");
    } finally {
      clearTimeout(timeoutId);
      setIsStreaming(false);
    }
  }, [editableStocks, handleAnalysisMessage, clearSimTimer]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearSimTimer();
    setPageState("upload");
    setOcrImages([]);
    setOcrProgress(null);
    setOcrLoading(false);
    setEditableStocks([]);
    setUnmappedNames([]);
    setCollectionProgress([]);
    setCurrentPhase(null);
    setPhaseLabel("");
    setResult(null);
    setInterpretation("");
    setError(null);
    setIsStreaming(false);
  }, [clearSimTimer]);

  const backToReview = useCallback(() => {
    abortRef.current?.abort();
    clearSimTimer();
    setPageState("review");
    setCollectionProgress([]);
    setCurrentPhase(null);
    setPhaseLabel("");
    setResult(null);
    setInterpretation("");
    setIsStreaming(false);
  }, [clearSimTimer]);

  return {
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
  };
}
