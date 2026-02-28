"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisMode } from "@/types";

const STAGES: Record<AnalysisMode, string[]> = {
  kim: [
    "이미지 스캔 중",
    "포트폴리오 파악 중",
    "6대 섹터 대조 중",
    "팩폭 탄 장전 중",
    "독설 다듬는 중",
    "팩폭 발사 직전",
  ],
  makalong: [
    "차트 이미지 스캔 중",
    "고점·저점 포인트 탐색 중",
    "빗각 채널 작도 중",
    "중앙 라인·패턴 분석 중",
    "S/R Flip·눌림목 판별 중",
    "빗각 분석 결론 정리 직전",
  ],
};

const STAGE_INTERVAL = 1800; // ms

interface Props {
  isLoading: boolean;
  mode?: AnalysisMode;
}

export function AnalysisLoading({ isLoading, mode = "kim" }: Props) {
  const stages = STAGES[mode];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [doneIdx, setDoneIdx] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setCurrentIdx(0);
      setDoneIdx([]);
      return;
    }

    setCurrentIdx(0);
    setDoneIdx([]);

    const interval = setInterval(() => {
      setCurrentIdx((prev) => {
        const next = prev + 1;
        setDoneIdx((d) => [...d, prev]);
        if (next >= stages.length) {
          clearInterval(interval);
          return prev; // 마지막 단계에서 멈춤
        }
        return next;
      });
    }, STAGE_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoading, mode, stages.length]);

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 overflow-hidden"
      >
        {/* 터미널 헤더 */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-black/40 border-b border-gray-200 dark:border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            {mode === "kim" ? "ovision_analysis.sh" : "mcr_strategy.sh"}
          </span>
        </div>

        {/* 터미널 바디 */}
        <div className="px-4 py-3 font-mono text-xs space-y-1.5 min-h-[120px]">
          {stages.map((stage, i) => {
            const isDone = doneIdx.includes(i);
            const isCurrent = i === currentIdx;
            const isPending = i > currentIdx;

            if (isPending) return null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className={`shrink-0 ${isDone ? "text-emerald-500" : "text-kim-red"}`}>
                  {isDone ? "✓" : ">"}
                </span>
                <span
                  className={
                    isDone
                      ? "text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-gray-100"
                  }
                >
                  {stage}
                </span>
                {isCurrent && (
                  <span className="inline-block w-1.5 h-3.5 bg-kim-red animate-type-cursor ml-0.5" />
                )}
                {isDone && (
                  <span className="text-emerald-500 ml-auto text-[10px]">완료</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* 진행 바 */}
        <div className="px-4 pb-3">
          <div className="h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-kim-red rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width: `${Math.min(((currentIdx + 1) / stages.length) * 100, 95)}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400 font-mono">AI 분석 중...</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {Math.min(Math.round(((currentIdx + 1) / stages.length) * 95), 95)}%
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
