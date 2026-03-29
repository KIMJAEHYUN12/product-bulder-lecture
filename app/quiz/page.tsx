"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  InvestorType,
  InvestorTypeKey,
} from "@/lib/investorQuiz";
import { generateInvestorShareImage } from "@/components/mock/InvestorShareCard";
import { ShareModal } from "@/components/ShareModal";
import { grantExp } from "@/lib/rpgExp";
import { claimQuizStone } from "@/lib/stoneReward";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { LoginButton } from "@/components/mock/LoginButton";
import { useAuth } from "@/hooks/useAuth";
import type { RecommendedStock } from "@/types";
import { fetchInvestorRecommend } from "@/lib/investorRecommendApi";

const SITE_URL = "https://bitgak.co.kr/quiz";

interface SharePreview {
  dataUrl: string;
  text: string;
  imageCopied: boolean;
}

/* ── 투자 격언 카드 ── */
const INVESTMENT_QUOTES = [
  { text: "시장은 단기적으로 투표 기계이고, 장기적으로 저울이다.", author: "벤저민 그레이엄" },
  { text: "남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워져라.", author: "워런 버핏" },
  { text: "주식 시장은 인내심 없는 사람의 돈을 인내심 있는 사람에게 옮기는 장치다.", author: "워런 버핏" },
  { text: "위험은 자신이 무엇을 하고 있는지 모르는 데서 온다.", author: "워런 버핏" },
  { text: "가장 좋은 투자는 자기 자신에게 하는 투자다.", author: "워런 버핏" },
  { text: "시장이 비이성적인 상태는 당신이 지불능력을 유지할 수 있는 기간보다 오래 지속될 수 있다.", author: "존 메이너드 케인스" },
  { text: "복리는 세계 8번째 불가사의다. 이해하는 사람은 이자를 벌고, 모르는 사람은 이자를 낸다.", author: "알버트 아인슈타인" },
  { text: "주식을 10년 보유할 생각이 없다면 10분도 갖고 있지 마라.", author: "워런 버핏" },
  { text: "돈을 잃는 것은 괜찮다. 하지만 기회를 잃는 것은 치명적이다.", author: "잭 마" },
  { text: "투자의 첫 번째 규칙은 돈을 잃지 않는 것이고, 두 번째 규칙은 첫 번째 규칙을 잊지 않는 것이다.", author: "워런 버핏" },
  { text: "10월은 주식 투자에 위험한 달 중 하나다. 나머지는 7월, 1월, 9월...", author: "마크 트웨인" },
  { text: "아는 것에 투자하라.", author: "피터 린치" },
  { text: "중요한 것은 옳고 그름이 아니라, 옳을 때 얼마나 버는가와 틀릴 때 얼마나 잃는가이다.", author: "조지 소로스" },
  { text: "좋은 기업을 적정 가격에 사는 것이, 적정 기업을 좋은 가격에 사는 것보다 훨씬 낫다.", author: "워런 버핏" },
  { text: "분산 투자는 무지에 대한 보호장치다.", author: "워런 버핏" },
];

/* ── 레이더 프리뷰 (순수 SVG) ── */
const RADAR_LABELS: { key: InvestorTypeKey; label: string }[] = [
  { key: "visionary", label: "혁신가" },
  { key: "dealmaker", label: "딜메이커" },
  { key: "sage", label: "현인" },
  { key: "strategist", label: "전략가" },
  { key: "hunter", label: "사냥꾼" },
  { key: "observer", label: "관찰자" },
  { key: "contrarian", label: "역발상가" },
  { key: "explorer", label: "탐험가" },
];

function RadarPreview({ answers }: { answers: InvestorTypeKey[] }) {
  const scores = useMemo(() => {
    const map: Record<InvestorTypeKey, number> = {
      visionary: 0, dealmaker: 0, sage: 0, strategist: 0,
      hunter: 0, observer: 0, contrarian: 0, explorer: 0,
    };
    answers.forEach((a) => map[a]++);
    return map;
  }, [answers]);

  const maxScore = Math.max(1, ...Object.values(scores));
  const cx = 120, cy = 120, r = 80;
  const n = RADAR_LABELS.length;

  function vertex(i: number, ratio: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  }

  function polygon(ratio: number) {
    return RADAR_LABELS.map((_, i) => vertex(i, ratio))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  }

  const dataPoints = RADAR_LABELS.map((item, i) => {
    const ratio = scores[item.key] / maxScore;
    return vertex(i, Math.max(ratio, 0.05));
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[220px]">
        {/* 동심 팔각형 그리드 */}
        {[0.33, 0.66, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={polygon(ratio)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {/* 축 선 */}
        {RADAR_LABELS.map((_, i) => {
          const p = vertex(i, 1);
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        {/* 데이터 영역 */}
        <motion.polygon
          points={dataPolygon}
          fill="rgba(79,70,229,0.2)"
          stroke="#4f46e5"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {/* 꼭짓점 점 */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" />
        ))}
        {/* 라벨 */}
        {RADAR_LABELS.map((item, i) => {
          const p = vertex(i, 1.22);
          return (
            <text
              key={i}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-500 text-[10px] font-mono"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
      <p className="text-[10px] text-gray-600 font-mono mt-1">실시간 유형 분석</p>
    </div>
  );
}

export default function QuizPage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [selected, setSelected] = useState<InvestorTypeKey | null>(null);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const [recStocks, setRecStocks] = useState<RecommendedStock[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const question = QUIZ_QUESTIONS[currentIdx];
  const total = QUIZ_QUESTIONS.length;
  const isLast = currentIdx === total - 1;

  // 격언 인덱스 (결정적)
  const quoteIdx = (currentIdx * 7 + 3) % INVESTMENT_QUOTES.length;
  const quote = INVESTMENT_QUOTES[quoteIdx];

  // AI 추천 종목 fetch
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setRecLoading(true);
    setRecError(null);
    fetchInvestorRecommend(result.key)
      .then((data) => {
        if (!cancelled) setRecStocks(data);
      })
      .catch((err) => {
        if (!cancelled) setRecError(err instanceof Error ? err.message : "추천 종목 로드 실패");
      })
      .finally(() => {
        if (!cancelled) setRecLoading(false);
      });
    return () => { cancelled = true; };
  }, [result]);

  function handleSelect(type: InvestorTypeKey) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => {
      const newAnswers = [...answers, type];
      if (isLast) {
        setAnswers(newAnswers);
        setResult(calcInvestorType(newAnswers));
        grantExp("quiz_complete");
        claimQuizStone();
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
    setRecStocks(null);
    setRecLoading(false);
    setRecError(null);
  }

  async function handleShare() {
    if (!result || sharingLoading) return;
    setSharingLoading(true);
    const friendlyText =
      `나 ${result.character}(${result.name})래 ㅋㅋ\n` +
      `"${result.kimComment.slice(0, 45)}..."\n\n` +
      `오비젼 투자성향 테스트 해봐`;

    try {
      const blob = await generateInvestorShareImage(result);
      if (!blob) return;

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

      setSharePreview({ dataUrl, text: friendlyText, imageCopied });
    } finally {
      setSharingLoading(false);
    }
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
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {!result ? (
            <>
              {/* 진행 도트 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono">
                    {currentIdx + 1} / {total}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {Math.round(((currentIdx + (selected ? 1 : 0)) / total) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: total }, (_, i) => {
                    const isDone = i < currentIdx || (i === currentIdx && selected);
                    const isCurrent = i === currentIdx && !selected;
                    return (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          isDone
                            ? "bg-kim-red"
                            : isCurrent
                              ? "bg-kim-red animate-pulse scale-[1.3]"
                              : "bg-white/10"
                        }`}
                      />
                    );
                  })}
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

              {/* 레이더 프리뷰 + 격언 */}
              {answers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="mt-8 flex flex-col gap-4"
                >
                  <RadarPreview answers={answers} />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center"
                    >
                      <p className="text-xs text-gray-400 font-mono leading-relaxed">
                        &ldquo;{quote.text}&rdquo;
                      </p>
                      <p className="text-[10px] text-gray-600 font-mono mt-1">— {quote.author}</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
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
                <div className="mx-auto mb-4 w-28 h-28 rounded-full overflow-hidden border-2 border-kim-red/40 shadow-lg shadow-kim-red/20">
                  <img
                    src={result.image}
                    alt={result.character}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-kim-red font-black tracking-wide mb-1">
                  {result.character}
                </p>
                <div className="text-2xl font-black text-white mb-1">
                  {result.name}
                </div>
                <p className="text-xs text-gray-400 font-mono mb-3">
                  {result.subtitle}
                </p>
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
                      <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-orange-400 font-mono font-bold mb-2">주의</p>
                  <div className="flex flex-col gap-1.5">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 추천 자산 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-mono mb-2">어울리는 자산</p>
                <div className="flex flex-wrap gap-2">
                  {result.assets.map((a, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-kim-red/10 border border-kim-red/20 text-xs font-mono text-kim-red"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI 추천 종목 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-mono mb-3">AI 추천 종목</p>
                {recLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : recError ? (
                  <p className="text-xs text-gray-500 font-mono text-center py-4">{recError}</p>
                ) : recStocks && recStocks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {recStocks.map((stock, i) => (
                      <Link
                        key={stock.symbol}
                        href={`/stock-lab?symbol=${stock.symbol}`}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm font-black text-kim-red shrink-0 w-5 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{stock.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{stock.symbol}</span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono leading-relaxed mt-0.5">{stock.reason}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">→</span>
                      </Link>
                    ))}
                    <p className="text-[10px] text-gray-600 font-mono text-center mt-2">
                      AI 추천은 참고용이며 투자 권유가 아닙니다
                    </p>
                  </div>
                ) : null}
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
                  <span className="text-xs font-bold">종목 진단</span>
                </Link>
                <Link
                  href="/"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"
                >
                  <span className="text-lg">🏭</span>
                  <span className="text-xs font-bold">포트폴리오</span>
                </Link>
                <Link
                  href="/mock-investment"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  <span className="text-lg">📈</span>
                  <span className="text-xs font-bold">모의투자</span>
                </Link>
              </div>

              {/* 다시하기 */}
              <button
                onClick={handleRetry}
                className="w-full py-2 text-xs text-gray-500 font-mono hover:text-gray-300 transition-colors underline underline-offset-2"
              >
                다시 테스트하기
              </button>

              <AdSlot />

              <CrossNavigation currentPath="/quiz" />
            </motion.div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div className="py-4 text-center text-xs text-gray-600 font-mono">
        © 2026 오비젼
      </div>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl={SITE_URL}
        imageFileName="ovision-investor-type.png"
      />
    </main>
  );
}
