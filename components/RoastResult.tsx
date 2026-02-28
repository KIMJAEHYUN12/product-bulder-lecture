"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StockGradeCard } from "./StockGradeCard";
import type { Grade } from "@/types";
import type { AnalysisMode } from "@/types";

interface Props {
  roast: string | null;
  error: string | null;
  grade: Grade;
  mode?: AnalysisMode;
  isStreaming?: boolean;
}

const SITE_URL = "https://mylen-24263782-5d205.web.app";

async function shareRoast(roast: string, grade: Grade, mode: string): Promise<"copied" | "shared"> {
  const label = mode === "makalong" ? "오비젼 빗각 분석" : "오비젼의 팩폭";
  const preview = roast.slice(0, 80).replace(/\n/g, " ") + "...";
  const text = `[${label}] 등급: ${grade}\n"${preview}"`;
  const shareData = { title: label, text, url: SITE_URL };
  const isMobile = navigator.maxTouchPoints > 0;
  if (isMobile && navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch {
      // 취소 또는 실패 → 클립보드로 fallback
    }
  }
  await navigator.clipboard.writeText(`${text}\n\n👉 ${SITE_URL}`);
  return "copied";
}

export function RoastResult({ roast, error, grade, mode = "kim", isStreaming = false }: Props) {
  const headerLines =
    mode === "makalong"
      ? ["================================", "      오비젼 빗각 분석 리포트       ", "================================"]
      : ["================================", "      오비젼의 팩폭 영수증       ", "================================"];

  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("ko-KR"));
  }, []);

  useEffect(() => {
    if (!roast) {
      setDisplayed("");
      setIsTyping(false);
      wasStreamingRef.current = false;
      return;
    }

    // 스트리밍 중: 텍스트를 바로 표시 (진짜 스트리밍이 곧 타이핑 효과)
    if (isStreaming) {
      wasStreamingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    // 방금 스트리밍이 끝난 경우 → 타이핑 재생 없이 최종 텍스트만 sync
    if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    // 비스트리밍 모드: 기존 타이핑 애니메이션
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayed("");
    setIsTyping(true);

    let i = 0;
    const fullText = roast;

    function typeNext() {
      if (i < fullText.length) {
        setDisplayed(fullText.slice(0, i + 1));
        i++;
        timerRef.current = setTimeout(typeNext, 18);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 18);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roast, isStreaming]);

  return (
    <AnimatePresence>
      {(roast || error) && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-xl border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900 overflow-hidden shadow-xl"
        >
          {/* Receipt header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <pre className="text-xs font-mono text-gray-500 dark:text-gray-400 text-center leading-tight">
              {headerLines.join("\n")}
            </pre>
          </div>

          {/* Grade badge */}
          {grade && (
            <div className="flex justify-center pt-4 pb-2">
              <StockGradeCard grade={grade} />
            </div>
          )}

          {/* Content */}
          <div className="px-5 py-4">
            {error ? (
              <p className="text-red-500 dark:text-red-400 text-sm font-mono">
                ⚠ {error}
              </p>
            ) : (
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                {displayed}
                {(isStreaming || isTyping) && (
                  <span className="inline-block w-0.5 h-4 bg-kim-red ml-0.5 animate-type-cursor" />
                )}
              </p>
            )}
          </div>

          {/* Receipt footer */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <p className="text-xs font-mono text-gray-400 text-center">
              본 분석은 정보 제공 목적이며 투자 권유가 아닙니다 · {dateStr}
            </p>
            {roast && !isStreaming && !isTyping && (
              <button
                onClick={async () => {
                  const result = await shareRoast(roast, grade, mode).catch(() => null);
                  if (result === "copied") {
                    setShareMsg("클립보드에 복사됐어요!");
                    setTimeout(() => setShareMsg(null), 2500);
                  }
                }}
                className="w-full py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-mono text-gray-500 dark:text-gray-400 hover:border-kim-red/50 hover:text-kim-red transition-colors"
              >
                📤 {mode === "makalong" ? "빗각 분석 공유하기" : "팩폭 결과 공유하기"}
              </button>
            )}
            {shareMsg && (
              <p className="text-center text-xs text-green-500 font-mono">{shareMsg}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
