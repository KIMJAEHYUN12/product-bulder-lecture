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
}

export function RoastResult({ roast, error, grade, mode = "kim" }: Props) {
  const headerLines = mode === "makalong"
    ? ["================================", "      MC.R 투자 전략 리포트      ", "================================"]
    : ["================================", "      오비젼의 팩폭 영수증       ", "================================"];
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("ko-KR"));
  }, []);

  useEffect(() => {
    if (!roast) {
      setDisplayed("");
      return;
    }

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
  }, [roast]);

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
                {isTyping && (
                  <span className="inline-block w-0.5 h-4 bg-kim-red ml-0.5 animate-type-cursor" />
                )}
              </p>
            )}
          </div>

          {/* Receipt footer */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-mono text-gray-400 text-center">
              이 영수증은 투자 권유가 아닙니다 · {dateStr}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
