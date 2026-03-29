"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getPortfolioShare, visitShareApi, type PortfolioShareDoc } from "@/lib/portfolioShareDb";
import { BODY_PARTS, getBodyPart, BodySvg, pctToY, type StockItem } from "@/components/portfolio/BodyPositionChart";

export default function PortfolioSharePage() {
  return (
    <Suspense fallback={<ShareSkeleton />}>
      <ShareGame />
    </Suspense>
  );
}

function ShareGame() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [data, setData] = useState<PortfolioShareDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }
    // 쿠폰 visit API (fire-and-forget)
    visitShareApi(id);
    (async () => {
      const doc = await getPortfolioShare(id);
      if (!doc) {
        // gate 공유이거나 유효하지 않은 링크 → CTA 페이지 표시
        setData(null);
      } else {
        setData(doc);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSelect = useCallback((label: string) => {
    if (revealed) return;
    setSelected(label);
  }, [revealed]);

  const handleReveal = useCallback(() => {
    if (!selected) return;
    setRevealed(true);
  }, [selected]);

  if (loading) return <ShareSkeleton />;

  if (error && !id) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold">공유 링크가 올바르지 않습니다</p>
          <p className="text-sm text-[var(--text-muted)]">링크가 만료되었거나 잘못된 주소입니다</p>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            내 포트폴리오 검진하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // gate 공유 또는 데이터 없는 경우 → CTA 페이지
  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4">
        <div className="text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/15 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-indigo-400" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold">포트폴리오 AI 건강검진</p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              내 보유 종목을 AI로 진단해보세요
            </p>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors"
          >
            나도 검진하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isCorrect = selected === data.bodyPart;
  const avgPart = getBodyPart(data.avgPosition);

  // 정답 공개 시 종목 표시 (이름 마스킹)
  const maskedItems: StockItem[] = data.stocks.map((s, i) => ({
    name: `종목${String.fromCharCode(65 + i)}`,
    symbol: `stock_${i}`,
    pct: s.position,
    part: getBodyPart(s.position),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-base font-bold">매수 위치 맞추기</h1>
          <Link href="/portfolio" className="text-xs text-indigo-400 hover:text-indigo-300">
            나도 검진하기
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {!revealed ? (
          <>
            {/* 질문 */}
            <div className="text-center space-y-2">
              <p className="text-lg font-bold">{data.ownerName}님의</p>
              <p className="text-lg font-bold">매수 위치를 맞춰보세요!</p>
              <p className="text-xs text-[var(--text-muted)]">
                {data.stockCount}개 종목의 평균 매수 위치는 어디일까요?
              </p>
            </div>

            {/* 인체 실루엣 (마커 없음) */}
            <div className="flex justify-center">
              <svg viewBox="0 0 200 450" className="w-[120px] text-[var(--text-primary)]">
                <g opacity="0.15">
                  <ellipse cx="100" cy="52" rx="28" ry="32" fill="currentColor" />
                  <rect x="88" y="82" width="24" height="16" rx="6" fill="currentColor" />
                  <path d="M56,98 C56,98 48,108 48,120 L48,230 C48,238 54,244 62,244 L138,244 C146,244 152,238 152,230 L152,120 C152,108 144,98 144,98 Z" fill="currentColor" />
                  <path d="M48,108 C36,112 24,130 20,160 C16,190 22,210 28,220 C34,228 40,224 42,218 L48,170" fill="currentColor" />
                  <path d="M152,108 C164,112 176,130 180,160 C184,190 178,210 172,220 C166,228 160,224 158,218 L152,170" fill="currentColor" />
                  <path d="M62,244 L58,310 C56,340 56,370 58,400 C58,410 62,418 68,420 L82,422 C86,422 88,418 86,414 L80,400 C78,380 78,340 80,310 L88,244" fill="currentColor" />
                  <path d="M138,244 L142,310 C144,340 144,370 142,400 C142,410 138,418 132,420 L118,422 C114,422 112,418 114,414 L120,400 C122,380 122,340 120,310 L112,244" fill="currentColor" />
                </g>
                {BODY_PARTS.map((p) => (
                  <line key={p.label} x1="30" y1={pctToY(p.max)} x2="170" y2={pctToY(p.max)} stroke={p.hex} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
                ))}
                {/* 물음표 마커 */}
                <circle cx="100" cy="225" r="18" fill="rgba(129,140,248,0.2)" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4,3" />
                <text x="100" y="230" fill="#818cf8" fontSize="18" fontWeight="bold" textAnchor="middle">?</text>
              </svg>
            </div>

            {/* 6개 부위 버튼 (3x2) */}
            <div className="grid grid-cols-3 gap-2">
              {BODY_PARTS.map((part) => (
                <button
                  key={part.label}
                  onClick={() => handleSelect(part.label)}
                  className={`py-3.5 rounded-xl text-sm font-bold transition-all border ${
                    selected === part.label
                      ? "border-indigo-500 bg-indigo-500/20 text-white scale-[1.02]"
                      : "border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-indigo-500/30"
                  }`}
                >
                  <span style={{ color: selected === part.label ? part.hex : undefined }}>
                    {part.label}
                  </span>
                </button>
              ))}
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={handleReveal}
              disabled={!selected}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              정답 확인하기
            </button>
          </>
        ) : (
          <>
            {/* 정답/오답 표시 */}
            <div className={`text-center py-4 rounded-xl border ${
              isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}>
              <p className={`text-2xl font-black ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                {isCorrect ? "정답!" : "오답!"}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {isCorrect
                  ? `${data.ownerName}님의 매수 위치를 맞추셨습니다`
                  : `정답은 "${data.bodyPart}" 입니다`}
              </p>
            </div>

            {/* 인체에 마커 표시 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
                {data.ownerName}님의 매수 위치
              </h3>
              <div className="flex items-stretch gap-3">
                <BodySvg items={maskedItems} avgPosition={data.avgPosition} />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                  {/* 평균 위치 정보 */}
                  <div className={`rounded-lg px-3 py-2.5 ${avgPart.bg}`}>
                    <p style={{ color: avgPart.hex }} className="text-xs font-bold">
                      평균: {avgPart.label} ({data.avgPosition.toFixed(0)}%)
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {data.avgPosition >= 70
                        ? "고점 부근에서 매수한 종목이 많습니다"
                        : data.avgPosition >= 40
                          ? "중간 정도 위치에서 매수했습니다"
                          : "저점 부근에서 매수한 종목이 많습니다"}
                    </p>
                  </div>
                  {/* 종목 수 */}
                  <p className="text-[11px] text-[var(--text-muted)] px-1">
                    총 {data.stockCount}개 종목 분석 결과
                  </p>
                  {/* 마스킹된 종목 목록 */}
                  <div className="flex flex-wrap gap-1">
                    {maskedItems.map((item) => (
                      <span
                        key={item.symbol}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-overlay)] text-[var(--text-muted)]"
                      >
                        {item.name}
                        <span className="ml-0.5" style={{ color: item.part.hex }}>{item.pct.toFixed(0)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
                발에 가까울수록 저점 매수, 머리에 가까울수록 고점 매수
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/portfolio"
              className="block w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold text-center hover:bg-indigo-500 transition-colors"
            >
              나도 검진하기
              <ArrowRight className="inline h-4 w-4 ml-1" />
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

function ShareSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
