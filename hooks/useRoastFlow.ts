"use client";

import { useState, useCallback, useRef } from "react";
import type { RoastState, Grade, KimExpression, AnalysisMode } from "@/types";
import { analyzePortfolioStream, analyzeBitgakStream } from "@/lib/analyzeApi";

function deriveExpression(grade: Grade): KimExpression {
  switch (grade) {
    case "S":
    case "A":
      return "smug";
    case "B":
    case "C":
      return "neutral";
    case "D":
      return "pity";
    case "F":
      return "angry";
    default:
      return "neutral";
  }
}

const initialState: RoastState = {
  imageBase64: null,
  mimeType: null,
  previewUrl: null,
  isLoading: false,
  isStreaming: false,
  roast: null,
  analysis: null,
  scores: null,
  sector: null,
  chartLines: null,
  error: null,
  grade: null,
  kimExpression: "neutral",
};

export function useRoastFlow() {
  const [state, setState] = useState<RoastState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setState((prev) => ({
        ...prev,
        imageBase64: base64,
        mimeType: file.type,
        previewUrl: dataUrl,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        grade: null,
        isStreaming: false,
        kimExpression: "neutral",
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const startRoast = useCallback(
    async (mode: AnalysisMode = "kim", imageBase64: string, mimeType: string) => {
      if (!imageBase64 || !mimeType) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: false,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        kimExpression: "shocked",
      }));

      await analyzePortfolioStream(
        { imageBase64, mimeType, mode },

        // 스트리밍 청크: roast 텍스트가 조금씩 쌓임
        (partial) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: true,
            roast: partial,
          }));
        },

        // 완료: 전체 결과 세팅
        (data) => {
          const kimExpression = deriveExpression(data.grade);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            roast: data.roast,
            analysis: data.analysis,
            scores: data.scores,
            sector: data.sector ?? null,
            chartLines: data.chartLines ?? null,
            grade: data.grade,
            kimExpression,
          }));
        },

        // 오류
        (err) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error: err.message,
            kimExpression: "shocked",
          }));
        }
      );
    },
    []
  );

  const startBitgakRoast = useCallback(
    async (textSummary: string, stockName: string) => {
      if (!textSummary) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: false,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        kimExpression: "shocked",
      }));

      await analyzeBitgakStream(
        textSummary,
        stockName,
        (partial) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: true,
            roast: partial,
          }));
        },
        (data) => {
          const kimExpression = deriveExpression(data.grade);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            roast: data.roast,
            analysis: data.analysis,
            scores: data.scores,
            sector: data.sector ?? null,
            chartLines: null,
            grade: data.grade,
            kimExpression,
          }));
        },
        (err) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error: err.message,
            kimExpression: "shocked",
          }));
        }
      );
    },
    []
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      roast: null,
      analysis: null,
      scores: null,
      sector: null,
      chartLines: null,
      error: null,
      grade: null,
      kimExpression: "neutral",
    }));
  }, []);

  return { state, loadImage, startRoast, startBitgakRoast, reset, clearResult };
}
