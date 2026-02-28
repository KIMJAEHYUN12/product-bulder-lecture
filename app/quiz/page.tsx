"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  InvestorType,
  InvestorTypeKey,
} from "@/lib/investorQuiz";
import { generateInvestorShareImage } from "@/components/mock/InvestorShareCard";

const SITE_URL = "https://mylen-24263782-5d205.web.app/quiz";

interface SharePreview {
  dataUrl: string;
  blob: Blob;
  text: string;
  imageCopied: boolean;
}

export default function QuizPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [selected, setSelected] = useState<InvestorTypeKey | null>(null);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const question = QUIZ_QUESTIONS[currentIdx];
  const progress = ((currentIdx + (result ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100;
  const isLast = currentIdx === QUIZ_QUESTIONS.length - 1;

  function handleSelect(type: InvestorTypeKey) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => {
      const newAnswers = [...answers, type];
      if (isLast) {
        setAnswers(newAnswers);
        setResult(calcInvestorType(newAnswers));
      } else {
        setAnswers(newAnswers);
        setCurrentIdx((i) => i + 1);
        setSelected(null);
      }
    }, 420);
  }

  function handleRetry() {
    setCurrentIdx(0);
    setAnswers([]);
    setSelected(null);
    setResult(null);
    setSharePreview(null);
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
        } catch { /* fallback to PC */ }
      }

      if (blob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        let imageCopied = false;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          imageCopied = true;
        } catch { /* clipboard image not supported */ }

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
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-white transition-colors font-mono"
          >
            ← 오비젼 홈
          </Link>
          <h1 className="text-sm font-black">🧠 투자성향 테스트</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {!result ? (
            <>
              {/* 진행 바 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500 font-mono">
                    {currentIdx + 1} / {QUIZ_QUESTIONS.length}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-kim-red rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* 질문 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-lg font-bold text-white leading-relaxed mb-6">
                    Q{currentIdx + 1}. {question.q}
                  </h2>

                  <div className="flex flex-col gap-3">
                    {question.options.map((opt, i) => {
                      const isChosen = selected === opt.type;
                      const isDimmed = selected !== null && selected !== opt.type;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleSelect(opt.type)}
                          disabled={selected !== null}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: isDimmed ? 0.3 : 1, x: 0, scale: isChosen ? 1.02 : 1 }}
                          transition={{ duration: 0.15, delay: i * 0.06 }}
                          className={`w-full text-left px-5 py-4 rounded-xl border text-sm font-mono transition-colors ${
                            isChosen
                              ? "bg-kim-red border-kim-red text-white"
                              : "bg-white/5 border-white/10 text-gray-300 hover:border-kim-red/50 hover:bg-kim-red/5"
                          } disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            /* 결과 화면 */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring" }}
              className="flex flex-col gap-5"
            >
              {/* 유형 카드 */}
              <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-6xl mb-4">{result.emoji}</div>
                <div className="text-2xl font-black text-white mb-2">
                  {result.name}
                </div>
                <p className="text-xs text-gray-400 font-mono leading-relaxed px-6 max-w-sm mx-auto">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div>
                <p className="text-[10px] text-gray-500 font-mono mb-2">투자 성향</p>
                <div className="flex flex-col gap-2">
                  {result.traits.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm font-mono">
                      <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                      <span className="text-gray-300">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강점 / 주의점 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-green-400 font-mono font-bold mb-2">강점</p>
                  <div className="flex flex-col gap-1.5">
                    {result.strengths.map((s, i) => (
                      <p key={i} className="text-[11px] text-gray-400 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-orange-400 font-mono font-bold mb-2">주의</p>
                  <div className="flex flex-col gap-1.5">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-gray-400 font-mono leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오비젼 한마디 */}
              <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-500 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-sm text-gray-300 font-mono">
                  &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                disabled={sharingLoading}
                className="w-full py-3 rounded-xl bg-white/10 text-gray-200 font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sharingLoading ? "이미지 생성 중..." : "결과 이미지 공유하기"}
              </button>

              {/* CTA 3개 */}
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-kim-red/15 border border-kim-red/30 text-kim-red hover:bg-kim-red/25 transition-colors"
                >
                  <span className="text-lg">🔍</span>
                  <span className="text-[11px] font-bold">종목 진단</span>
                </Link>
                <Link
                  href="/"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"
                >
                  <span className="text-lg">🏭</span>
                  <span className="text-[11px] font-bold">포트폴리오</span>
                </Link>
                <Link
                  href="/mock-investment"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  <span className="text-lg">📈</span>
                  <span className="text-[11px] font-bold">모의투자</span>
                </Link>
              </div>

              {/* 다시하기 */}
              <button
                onClick={handleRetry}
                className="w-full py-2 text-xs text-gray-500 font-mono hover:text-gray-300 transition-colors underline underline-offset-2"
              >
                다시 테스트하기
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div className="py-4 text-center text-[11px] text-gray-600 font-mono">
        © 2026 오비젼
      </div>

      {/* 공유 미리보기 모달 */}
      <AnimatePresence>
        {sharePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sharePreview.dataUrl}
                alt="투자성향 결과 카드"
                className="w-full block"
              />
              <div className="p-4 flex flex-col gap-2">
                {sharePreview.imageCopied ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                    <p className="text-green-400 font-bold text-sm mb-0.5">이미지가 클립보드에 복사됐어요!</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl+V</kbd>로 붙여넣기
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 font-mono text-center">
                    이미지를 저장하거나 텍스트를 복사해서 공유하세요
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={downloadImage}
                    className="flex-1 py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                  >
                    이미지 저장
                  </button>
                  <button
                    onClick={copyText}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                      copyDone
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-gray-200 hover:bg-white/20"
                    }`}
                  >
                    {copyDone ? "복사됨!" : "텍스트 복사"}
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
    </main>
  );
}
