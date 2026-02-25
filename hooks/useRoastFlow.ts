"use client";

import { useState, useCallback, useRef } from "react";
import type { RoastState, Grade, KimExpression } from "@/types";
import { analyzePortfolio } from "@/lib/analyzeApi";

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
  roast: null,
  analysis: null,
  scores: null,
  sector: null,
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
        kimExpression: "neutral",
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const startRoast = useCallback(async () => {
    const { imageBase64, mimeType } = stateRef.current;
    if (!imageBase64 || !mimeType) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      roast: null,
      analysis: null,
      scores: null,
      sector: null,
      error: null,
      kimExpression: "shocked",
    }));

    try {
      const data = await analyzePortfolio({ imageBase64, mimeType });
      const kimExpression = deriveExpression(data.grade);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        roast: data.roast,
        analysis: data.analysis,
        scores: data.scores,
        sector: data.sector ?? null,
        grade: data.grade,
        kimExpression,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: (err as Error).message,
        kimExpression: "shocked",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { state, loadImage, startRoast, reset };
}
