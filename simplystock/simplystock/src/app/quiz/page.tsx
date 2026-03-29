"use client";

import { useState } from "react";
import { TrendingUp, ArrowLeft, RotateCcw, ChevronRight, Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareModal } from "@/components/ShareModal";
import { generateQuizShareImage } from "@/lib/quizShareImage";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  type InvestorTypeKey,
  type InvestorType,
} from "@/lib/investorQuiz";

type Phase = "intro" | "quiz" | "result";

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | undefined>();

  const total = QUIZ_QUESTIONS.length;

  const handleAnswer = (type: InvestorTypeKey, idx: number) => {
    if (selected !== null) return;
    setSelected(idx);

    setTimeout(() => {
      const newAnswers = [...answers, type];
      setAnswers(newAnswers);
      setSelected(null);

      if (current + 1 >= total) {
        const r = calcInvestorType(newAnswers);
        setResult(r);
        setPhase("result");
      } else {
        setCurrent(current + 1);
      }
    }, 300);
  };

  const handleShare = async () => {
    if (!result) return;
    const img = await generateQuizShareImage(result);
    setShareImage(img);
    setShareOpen(true);
  };

  const restart = () => {
    setPhase("intro");
    setCurrent(0);
    setAnswers([]);
    setResult(null);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <a href="/" className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-semibold tracking-tight">SimplyStock</span>
          </a>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Intro */}
        {phase === "intro" && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 text-4xl">
              🧠
            </div>
            <h1 className="text-2xl font-bold mb-2">투자성향 테스트</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              20개의 질문으로 나의 투자 유형을 알아보세요
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-8">
              8가지 투자자 유형 중 당신에게 맞는 유형은?
            </p>
            <button
              type="button"
              onClick={() => setPhase("quiz")}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
            >
              시작하기
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Quiz */}
        {phase === "quiz" && (
          <div>
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-muted)]">
                  {current + 1} / {total}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {Math.round(((current + 1) / total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-overlay)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${((current + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="mb-6">
              <h2 className="text-base font-semibold leading-relaxed">
                Q{current + 1}. {QUIZ_QUESTIONS[current].q}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {QUIZ_QUESTIONS[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnswer(opt.type, idx)}
                  className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${
                    selected === idx
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                      : "border-[var(--border-primary)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
                  }`}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-primary)] text-[10px] font-medium text-[var(--text-muted)]">
                    {idx + 1}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {phase === "result" && result && (
          <div className="py-4">
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-6">
              {/* 유형 헤더 */}
              <div className="mb-6 text-center">
                <div className="mb-3 text-5xl">{result.emoji}</div>
                <h2 className="text-xl font-bold mb-1">{result.name}</h2>
                <p className="text-sm text-indigo-400">{result.subtitle}</p>
              </div>

              {/* 설명 */}
              <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
                {result.description}
              </p>

              {/* 특성 */}
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold">투자 특성</h3>
                <ul className="space-y-1.5">
                  {result.traits.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 강점 */}
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold text-emerald-400">강점</h3>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 주의사항 */}
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold text-amber-400">주의사항</h3>
                <ul className="space-y-1.5">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 어울리는 자산 */}
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-semibold">어울리는 자산</h3>
                <div className="flex flex-wrap gap-2">
                  {result.assets.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* 한마디 */}
              <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-primary)] p-4">
                <p className="text-sm italic text-[var(--text-muted)] leading-relaxed">
                  &ldquo;{result.comment}&rdquo;
                </p>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                결과 공유
              </button>
              <button
                type="button"
                onClick={restart}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                다시하기
              </button>
              <a
                href="/"
                className="flex items-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
              >
                차트 분석으로
              </a>
            </div>

            <ShareModal
              open={shareOpen}
              onClose={() => { setShareOpen(false); setShareImage(undefined); }}
              imageDataUrl={shareImage}
              shareText={`[SimplyStock 투자성향] 나는 "${result.name}"! ${result.subtitle}`}
              shareUrl="https://simplystock.co.kr/quiz"
              imageFileName="simplystock-quiz-result.png"
              kakaoTitle={`나의 투자성향: ${result.name}`}
              kakaoDescription={result.subtitle}
              kakaoButtonTitle="나도 테스트하기"
            />
          </div>
        )}
      </main>
    </div>
  );
}
