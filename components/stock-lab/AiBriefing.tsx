"use client";

import { motion } from "framer-motion";
import type { StockBriefingResponse } from "@/types";

interface Props {
  stockCount: number;
  briefing: string | null;
  briefingResult: StockBriefingResponse | null;
  isBriefingStreaming: boolean;
  onRequest: () => void;
}

export function AiBriefing({ stockCount, briefing, briefingResult, isBriefingStreaming, onRequest }: Props) {
  if (stockCount === 0) return null;

  const buttonLabel = stockCount === 1 ? "🔬 이 종목 어때?" : "🔬 어떤 게 낫나?";
  const showButton = !briefingResult && !isBriefingStreaming;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-black text-white mb-3">AI 브리핑</h3>

      {/* 분석 요청 버튼 */}
      {showButton && (
        <motion.button
          onClick={onRequest}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold hover:from-blue-500 hover:to-purple-500 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {buttonLabel}
        </motion.button>
      )}

      {/* 스트리밍 중 */}
      {isBriefingStreaming && briefing && (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">
          {briefing}
          <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
        </div>
      )}

      {isBriefingStreaming && !briefing && (
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono py-4">
          <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          오비젼이 분석 중...
        </div>
      )}

      {/* 결과 */}
      {briefingResult && !isBriefingStreaming && (
        <div className="space-y-3">
          {/* 브리핑 텍스트 */}
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {briefingResult.briefing}
          </p>

          {/* verdict + riskLevel 배지 */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black ${
                briefingResult.verdict === "매수"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : briefingResult.verdict === "매도"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              }`}
            >
              {briefingResult.verdict}
            </span>
            <span
              className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                briefingResult.riskLevel === "low"
                  ? "bg-green-500/15 text-green-400"
                  : briefingResult.riskLevel === "high"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-yellow-500/15 text-yellow-400"
              }`}
            >
              위험도 {briefingResult.riskLevel === "low" ? "낮음" : briefingResult.riskLevel === "high" ? "높음" : "보통"}
            </span>
          </div>

          {/* keyPoints */}
          {briefingResult.keyPoints.length > 0 && (
            <ul className="space-y-1">
              {briefingResult.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* 다시 분석 */}
          <button
            onClick={onRequest}
            className="text-[10px] text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
          >
            다시 분석
          </button>
        </div>
      )}
    </div>
  );
}
