"use client";

import { useState } from "react";
import { Portfolio } from "@/hooks/useMockPortfolio";

interface InvestorProfile {
  type: string;
  emoji: string;
  description: string;
  traits: string[];
  strength: string;
  weakness: string;
  kimComment: string;
}

interface Props {
  portfolio: Portfolio;
  returnPct: number;
  totalAsset: number;
  onClose: () => void;
}

const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_PROFILE_API_URL ||
  "/api/investor-profile";

export function InvestorProfileModal({ portfolio, returnPct, totalAsset, onClose }: Props) {
  const [mbti, setMbti] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestorProfile | null>(null);
  const [error, setError] = useState(false);

  const hasHistory = portfolio.history.length > 0;

  async function analyze() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbti: mbti.trim().toUpperCase(),
          history: portfolio.history,
          holdings: portfolio.holdings,
          returnPct,
          totalAsset,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResult(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/15 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white">🧠 내 투자 성향 분석</h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {hasHistory
                ? `거래 ${portfolio.history.length}건 기반 AI 분석`
                : "MBTI 기반 간이 분석"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {!result ? (
            <div className="flex flex-col gap-4">
              {/* MBTI 입력 */}
              <div>
                <label className="text-xs text-gray-500 font-mono mb-1.5 block">
                  MBTI <span className="text-gray-400">(선택사항)</span>
                </label>
                <input
                  type="text"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="예: INTJ"
                  maxLength={4}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50 uppercase tracking-widest"
                />
              </div>

              {/* 거래 없을 때 안내 */}
              {!hasHistory && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-[11px] text-yellow-600 dark:text-yellow-400 font-mono">
                  아직 거래 내역이 없어요. MBTI만으로 투자 성향을 예측합니다.
                </div>
              )}

              {/* 거래 있을 때 요약 */}
              {hasHistory && (
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] text-gray-500 font-mono mb-2">분석에 사용될 데이터</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                        {portfolio.history.length}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">총 거래</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                        {Object.keys(portfolio.holdings).length}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">보유 종목</div>
                    </div>
                    <div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          returnPct > 0
                            ? "text-red-500 dark:text-red-400"
                            : returnPct < 0
                            ? "text-blue-500 dark:text-blue-400"
                            : "text-gray-500"
                        }`}
                      >
                        {returnPct > 0 ? "+" : ""}
                        {returnPct.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">수익률</div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-[11px] text-red-500 font-mono text-center">
                  분석에 실패했습니다. 다시 시도해주세요.
                </div>
              )}

              <button
                onClick={analyze}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-kim-red text-white font-bold text-sm hover:bg-kim-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI 분석 중...
                  </span>
                ) : (
                  "AI 성향 분석하기"
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* 유형 카드 */}
              <div className="text-center py-5 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="text-5xl mb-2">{result.emoji}</div>
                <div className="text-lg font-black text-gray-900 dark:text-white mb-1">
                  {result.type}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono leading-relaxed px-3">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div className="flex flex-col gap-1.5">
                {result.traits.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                    <span className="text-gray-700 dark:text-gray-300">{t}</span>
                  </div>
                ))}
              </div>

              {/* 강점 / 약점 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mb-1">
                    💪 강점
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                    {result.strength}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-2.5">
                  <div className="text-[10px] text-red-500 dark:text-red-400 font-mono mb-1">
                    ⚠️ 약점
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                    {result.weakness}
                  </div>
                </div>
              </div>

              {/* 오비젼의 한마디 */}
              <div className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-500 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                  💬 &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono py-1 transition-colors text-center"
              >
                다시 분석하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
