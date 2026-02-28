"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";

const HELP_SECTIONS = [
  {
    emoji: "🏭",
    title: "포폴 진단",
    desc: "증권앱 보유종목 스크린샷을 업로드하면 AI가 포트폴리오를 팩폭으로 분석해줍니다.",
  },
  {
    emoji: "📐",
    title: "차트 분석",
    desc: "종목을 검색하면 자동으로 빗각 채널을 작도하고, AI가 매매 판단을 내려줍니다.",
  },
  {
    emoji: "🔬",
    title: "종목 분석실",
    desc: "1~3개 종목을 검색하면 수익률 비교 차트, AI 브리핑, 관련 뉴스를 한 화면에서 볼 수 있습니다.",
  },
  {
    emoji: "📰",
    title: "종목 뉴스",
    desc: "종목을 검색하면 관련 최신 뉴스를 한눈에 볼 수 있습니다.",
  },
  {
    emoji: "🎮",
    title: "차트 업다운 게임",
    desc: "종목명을 가린 실제 과거 차트를 보고 올랐는지 내렸는지 맞춰보세요. 연승 기록으로 랭킹 경쟁!",
  },
  {
    emoji: "📈",
    title: "모의투자",
    desc: "가상 1,000만원으로 실제 시세 기반 매매 연습을 할 수 있습니다.",
  },
  {
    emoji: "🧠",
    title: "투자성향 테스트",
    desc: "15문항으로 나의 투자 성향을 분석해보세요.",
  },
  {
    emoji: "📊",
    title: "대시보드",
    desc: "코스피200 선물, 공포탐욕지수, 원자재 시세, 경제캘린더를 실시간으로 확인합니다.",
  },
];

export function HelpModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 플로팅 ? 버튼 */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-kim-red text-white shadow-lg shadow-red-900/40 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="도움말"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* 모달 */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 오버레이 */}
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setOpen(false)}
            />

            {/* 컨테이너 */}
            <motion.div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  오비젼 사용 가이드
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 섹션 목록 */}
              <div className="flex flex-col gap-3">
                {HELP_SECTIONS.map((s) => (
                  <div
                    key={s.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
                  >
                    <span className="text-2xl shrink-0">{s.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {s.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
