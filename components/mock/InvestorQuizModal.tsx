"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  InvestorType,
  InvestorTypeKey,
} from "@/lib/investorQuiz";
import { generateInvestorShareImage } from "./InvestorShareCard";

const SITE_URL = "https://mylen-24263782-5d205.web.app/mock-investment";

interface Props {
  onComplete: (result: InvestorType) => void;
  onClose: () => void;
}

interface SharePreview {
  dataUrl: string;
  blob: Blob;
  text: string;
  imageCopied: boolean;
}

export function InvestorQuizModal({ onComplete, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [selected, setSelected] = useState<InvestorTypeKey | null>(null);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const question = QUIZ_QUESTIONS[currentIdx];
  const progress = (currentIdx / QUIZ_QUESTIONS.length) * 100;
  const isLast = currentIdx === QUIZ_QUESTIONS.length - 1;

  function handleSelect(type: InvestorTypeKey) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => {
      const newAnswers = [...answers, type];
      if (isLast) {
        setResult(calcInvestorType(newAnswers));
      } else {
        setAnswers(newAnswers);
        setCurrentIdx((i) => i + 1);
        setSelected(null);
      }
    }, 420);
  }

  function handleConfirm() {
    if (!result) return;
    onComplete(result);
    onClose();
  }

  async function handleShare() {
    if (!result || sharingLoading) return;
    setSharingLoading(true);

    try {
      const blob = await generateInvestorShareImage(result);
      const friendlyText =
        `나 ${result.name}래 ㅋㅋ\n` +
        `"${result.kimComment.slice(0, 45)}..."\n\n` +
        `오비젼 투자성향 테스트 해봐 👇`;

      const isMobile = navigator.maxTouchPoints > 0;

      // ── 모바일: Web Share API로 이미지 파일 공유 ──
      if (isMobile && navigator.share) {
        try {
          if (blob && typeof navigator.canShare === "function") {
            const file = new File([blob], "ovision-investor-type.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], text: friendlyText });
              return;
            }
          }
          await navigator.share({ title: "오비젼 투자성향 테스트", text: friendlyText, url: SITE_URL });
          return;
        } catch {
          // 취소 or 실패 → PC 방식으로 fallback
        }
      }

      // ── PC (또는 모바일 fallback): 클립보드 이미지 복사 + 미리보기 모달 ──
      if (blob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // 이미지를 클립보드에 직접 복사 (Chrome/Edge/Safari 지원)
        let imageCopied = false;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          imageCopied = true;
        } catch {
          // 클립보드 이미지 미지원 → 모달에서 직접 저장 유도
        }

        setSharePreview({ dataUrl, blob, text: friendlyText, imageCopied });
      }
    } finally {
      setSharingLoading(false);
    }
  }

  function downloadImage() {
    if (!sharePreview) return;
    const a = document.createElement("a");
    a.href = sharePreview.dataUrl;
    a.download = "ovision-investor-type.png";
    a.click();
  }

  async function copyText() {
    if (!sharePreview) return;
    await navigator.clipboard.writeText(`${sharePreview.text}\n\n👉 ${SITE_URL}`).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">

          {!result ? (
            <>
              {/* 헤더 */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-gray-400 font-mono">
                    {currentIdx + 1} / {QUIZ_QUESTIONS.length}
                  </span>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* 진행 바 */}
                <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-kim-red rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* 질문 */}
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed min-h-[48px]"
                  >
                    Q{currentIdx + 1}. {question.q}
                  </motion.h2>
                </AnimatePresence>
              </div>

              {/* 선택지 */}
              <div className="px-5 pb-5 flex flex-col gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-2"
                  >
                    {question.options.map((opt, i) => {
                      const isChosen = selected === opt.type;
                      const isDimmed = selected !== null && selected !== opt.type;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleSelect(opt.type)}
                          disabled={selected !== null}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: isDimmed ? 0.35 : 1, x: 0, scale: isChosen ? 1.01 : 1 }}
                          transition={{ duration: 0.15, delay: i * 0.05 }}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-mono transition-colors ${
                            isChosen
                              ? "bg-kim-red border-kim-red text-white"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-kim-red/50 hover:bg-kim-red/5"
                          } disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* 결과 화면 */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring" }}
              className="p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              {/* 유형 카드 */}
              <div className="text-center py-5 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="text-5xl mb-3">{result.emoji}</div>
                <div className="text-xl font-black text-gray-900 dark:text-white mb-1">
                  {result.name}
                </div>
                <p className="text-xs text-gray-500 font-mono leading-relaxed px-3">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div>
                <p className="text-[10px] text-gray-400 font-mono mb-2">투자 성향</p>
                <div className="flex flex-col gap-1.5">
                  {result.traits.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                      <span className="text-gray-700 dark:text-gray-300">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강점 / 주의점 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-mono font-bold mb-1.5">💪 강점</p>
                  <div className="flex flex-col gap-1">
                    {result.strengths.map((s, i) => (
                      <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-orange-500 font-mono font-bold mb-1.5">⚠️ 주의</p>
                  <div className="flex flex-col gap-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 font-mono leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오비젼 한마디 */}
              <div className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-400 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                  💬 &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                disabled={sharingLoading}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sharingLoading ? "⏳ 이미지 생성 중..." : "🖼️ 결과 이미지 공유하기"}
              </button>

              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-kim-red text-white font-bold text-sm hover:bg-kim-red/90 transition-colors"
              >
                저장하고 닫기
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* PC 공유 미리보기 모달 */}
      <AnimatePresence>
        {sharePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
            onClick={() => setSharePreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
            >
              {/* 미리보기 이미지 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharePreview.dataUrl}
                alt="투자성향 결과 카드"
                className="w-full block"
              />

              {/* 액션 버튼들 */}
              <div className="p-4 flex flex-col gap-2">
                {sharePreview.imageCopied ? (
                  /* 이미지 클립보드 복사 성공 */
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                    <p className="text-green-400 font-bold text-sm mb-0.5">✓ 이미지가 클립보드에 복사됐어요!</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      카카오톡 · 메시지 등에서 <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl+V</kbd> 로 바로 붙여넣기 하세요
                    </p>
                  </div>
                ) : (
                  /* 클립보드 미지원 → 저장 유도 */
                  <p className="text-[11px] text-gray-500 font-mono text-center">
                    이미지를 저장하거나 텍스트를 복사해서 공유하세요
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={downloadImage}
                    className="flex-1 py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                  >
                    💾 이미지 저장
                  </button>
                  <button
                    onClick={copyText}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      copyDone
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-gray-200 hover:bg-white/20"
                    }`}
                  >
                    {copyDone ? "✓ 복사됨!" : "📋 텍스트 복사"}
                  </button>
                </div>
                <button
                  onClick={() => setSharePreview(null)}
                  className="w-full py-2 text-xs text-gray-600 font-mono hover:text-gray-400 transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
