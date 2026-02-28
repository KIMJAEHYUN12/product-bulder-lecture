"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GameChart } from "@/components/chart-game/GameChart";
import { GameControls } from "@/components/chart-game/GameControls";
import { StreakCounter } from "@/components/chart-game/StreakCounter";
import { NicknameModal } from "@/components/mock/NicknameModal";
import { fetchGameRound } from "@/lib/chartGameApi";
import {
  fetchChartGameRankings,
  upsertChartGameRanking,
  fetchMyChartGameRank,
} from "@/lib/chartGameRankingApi";
import { useAuth } from "@/hooks/useAuth";
import type { GamePhase, GameRound, ChartGameRankingEntry } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ChartGamePage() {
  const { user, signInWithGoogle } = useAuth();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [streak, setStreak] = useState(0);
  const [userGuess, setUserGuess] = useState<"up" | "down" | null>(null);
  const [roundHistory, setRoundHistory] = useState<string[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Ranking
  const [rankings, setRankings] = useState<ChartGameRankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [myRank, setMyRank] = useState<{ rank: number; entry: ChartGameRankingEntry } | null>(null);

  // Nickname modal
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Load rankings
  const loadRankings = useCallback(async (n = 20) => {
    setRankingsLoading(true);
    try {
      const data = await fetchChartGameRankings(n);
      setRankings(data);
      if (user) {
        const my = await fetchMyChartGameRank(user.uid).catch(() => null);
        setMyRank(my);
      }
    } catch {
      // ignore
    } finally {
      setRankingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRankings(5);
  }, [loadRankings]);

  // Load a new round
  const loadRound = useCallback(async (history: string[]) => {
    setPhase("loading");
    setError(null);
    setUserGuess(null);
    try {
      const round = await fetchGameRound(history);
      setCurrentRound(round);
      setRoundHistory((prev) => [...prev, round.stockSymbol]);
      setPhase("guessing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
      setPhase("intro");
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setStreak(0);
    setTotalCorrect(0);
    setTotalGames(0);
    setRoundHistory([]);
    setCurrentRound(null);
    setUserGuess(null);
    setError(null);
    setPhase("loading");
    // Directly call loadRound with empty history
    fetchGameRound([])
      .then((round) => {
        setCurrentRound(round);
        setRoundHistory([round.stockSymbol]);
        setPhase("guessing");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "로드 실패");
        setPhase("intro");
      });
  }, []);

  // Handle guess
  const handleGuess = useCallback((guess: "up" | "down") => {
    if (phase !== "guessing" || !currentRound) return;
    setUserGuess(guess);
    setPhase("revealing");
  }, [phase, currentRound]);

  // After reveal animation finishes
  const handleRevealComplete = useCallback(() => {
    if (!currentRound || !userGuess) return;
    const correct = userGuess === currentRound.direction;
    setTotalGames((g) => g + 1);

    if (correct) {
      setStreak((s) => s + 1);
      setTotalCorrect((c) => c + 1);
      setPhase("result");
    } else {
      setPhase("result");
      setTimeout(() => setPhase("gameover"), 1800);
    }
  }, [currentRound, userGuess]);

  const isCorrect = currentRound && userGuess ? userGuess === currentRound.direction : false;

  // Next round
  const nextRound = useCallback(() => {
    setCurrentRound(null);
    setUserGuess(null);
    loadRound(roundHistory);
  }, [loadRound, roundHistory]);

  // Save ranking
  const saveRanking = useCallback(async (nickname: string) => {
    if (!user) return;
    setShowNicknameModal(false);
    setPendingSave(true);

    try {
      const existing = await fetchMyChartGameRank(user.uid).catch(() => null);
      const bestStreak = Math.max(streak, existing?.entry.bestStreak ?? 0);
      const prevTotal = existing?.entry.totalGames ?? 0;
      const prevCorrect = existing?.entry.totalCorrect ?? 0;

      await upsertChartGameRanking({
        userId: user.uid,
        nickname,
        bestStreak,
        totalGames: prevTotal + totalGames,
        totalCorrect: prevCorrect + totalCorrect,
        updatedAt: new Date().toISOString(),
      });

      localStorage.setItem(`ovision_chart_nick_${user.uid}`, nickname);
      await loadRankings(20);
    } catch {
      // ignore
    } finally {
      setPendingSave(false);
    }
  }, [user, streak, totalGames, totalCorrect, loadRankings]);

  // Share
  const handleShare = useCallback(() => {
    const text = `오비젼 차트 업다운 게임에서 ${streak}연승! 🔥\n도전해봐 👉 https://mylen-24263782-5d205.web.app/chart-game`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => alert("복사되었습니다!")).catch(() => {});
    }
  }, [streak]);

  const savedNickname = typeof window !== "undefined" && user
    ? localStorage.getItem(`ovision_chart_nick_${user.uid}`) ?? undefined
    : undefined;

  // Should show chart? (once a round is loaded, keep it visible through revealing/result/gameover)
  const showChart = !!currentRound && (phase === "guessing" || phase === "revealing" || phase === "result" || phase === "gameover");
  // Map phase for chart component
  const chartPhase = (phase === "guessing" || phase === "revealing" || phase === "result" || phase === "gameover") ? phase : "guessing";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
          >
            ← 홈
          </Link>
          <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
            📊 차트 업다운
          </h1>
          <StreakCounter streak={streak} />
        </div>

        {/* ── Chart: stays mounted across phases ── */}
        {showChart && currentRound && (
          <div className="mb-4">
            <GameChart
              visibleCandles={currentRound.visibleCandles}
              hiddenCandles={currentRound.hiddenCandles}
              phase={chartPhase}
              onRevealComplete={handleRevealComplete}
            />
          </div>
        )}

        {/* ── Phase-specific UI ── */}
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-xl font-black mb-2">차트 업다운 게임</h2>
                <p className="text-sm text-gray-400 font-mono leading-relaxed max-w-sm mx-auto">
                  실제 주식 차트를 보고 올랐는지 내렸는지 맞춰보세요!<br />
                  종목명은 숨겨져 있습니다.
                </p>
              </div>

              {error && (
                <div className="text-xs text-red-400 font-mono text-center">{error}</div>
              )}

              <motion.button
                onClick={startGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-lg shadow-lg shadow-red-900/40"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                🎮 게임 시작
              </motion.button>

              <RankingPreview
                rankings={rankings}
                loading={rankingsLoading}
                myUserId={user?.uid ?? null}
                myRank={myRank}
                limit={5}
              />
            </motion.div>
          )}

          {/* LOADING */}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <motion.div
                className="text-4xl"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                📊
              </motion.div>
              <p className="text-sm text-gray-500 font-mono">차트 불러오는 중...</p>
            </motion.div>
          )}

          {/* GUESSING (controls only — chart is above) */}
          {phase === "guessing" && currentRound && (
            <motion.div
              key="guessing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center">
                <p className="text-sm font-bold text-orange-400 mb-1">
                  이후 {currentRound.hiddenCandles.length}거래일 후, 올랐을까? 내렸을까?
                </p>
              </div>
              <GameControls onGuess={handleGuess} />
            </motion.div>
          )}

          {/* REVEALING */}
          {phase === "revealing" && currentRound && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="text-center text-sm text-gray-500 font-mono">
                나의 선택: {userGuess === "up" ? "📈 올랐다" : "📉 내렸다"}
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === "result" && currentRound && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-4"
            >
              <motion.div
                className={`text-center p-4 rounded-xl border ${
                  isCorrect
                    ? "bg-green-900/20 border-green-500/30"
                    : "bg-red-900/20 border-red-500/30"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-3xl mb-2">{isCorrect ? "🎉" : "💀"}</div>
                <div className="text-lg font-black mb-1">
                  {isCorrect ? "정답!" : "오답..."}
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  {currentRound.stockName} ·{" "}
                  <span className={currentRound.direction === "up" ? "text-red-400" : "text-blue-400"}>
                    {currentRound.direction === "up" ? "+" : ""}
                    {currentRound.changePct}%
                  </span>
                </div>
              </motion.div>

              {isCorrect && (
                <motion.button
                  onClick={nextRound}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  다음 라운드 →
                </motion.button>
              )}
            </motion.div>
          )}

          {/* GAMEOVER */}
          {phase === "gameover" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center py-4">
                <motion.div
                  className="text-2xl font-black text-gray-500 tracking-widest mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  GAME OVER
                </motion.div>
                <motion.div
                  className="text-4xl font-black text-orange-400"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                >
                  🔥 {streak} 연승
                </motion.div>
                {currentRound && (
                  <div className="text-xs text-gray-500 font-mono mt-2">
                    마지막: {currentRound.stockName} ·{" "}
                    <span className={currentRound.direction === "up" ? "text-red-400" : "text-blue-400"}>
                      {currentRound.direction === "up" ? "+" : ""}
                      {currentRound.changePct}%
                    </span>
                  </div>
                )}
              </div>

              {user && streak > 0 && !pendingSave && (
                <motion.button
                  onClick={() => setShowNicknameModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  🏆 랭킹 등록
                </motion.button>
              )}

              {!user && streak > 0 && (
                <motion.button
                  onClick={() => signInWithGoogle().then(() => setShowNicknameModal(true)).catch(() => {})}
                  className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-sm hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Google 로그인하고 랭킹 등록
                </motion.button>
              )}

              {pendingSave && (
                <div className="text-center text-xs text-gray-500 font-mono">저장 중...</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={startGame}
                  className="py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  다시 도전
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-sm hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  📤 공유하기
                </motion.button>
              </div>

              <RankingPreview
                rankings={rankings}
                loading={rankingsLoading}
                myUserId={user?.uid ?? null}
                myRank={myRank}
                limit={20}
                onRefresh={() => loadRankings(20)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nickname Modal */}
      {showNicknameModal && (
        <NicknameModal
          onConfirm={(nickname) => saveRanking(nickname)}
          onClose={() => setShowNicknameModal(false)}
          defaultNickname={savedNickname}
          defaultStrategy=""
        />
      )}
    </main>
  );
}

// ── Ranking Preview ──
function RankingPreview({
  rankings,
  loading,
  myUserId,
  myRank,
  limit,
  onRefresh,
}: {
  rankings: ChartGameRankingEntry[];
  loading: boolean;
  myUserId: string | null;
  myRank: { rank: number; entry: ChartGameRankingEntry } | null;
  limit: number;
  onRefresh?: () => void;
}) {
  const displayed = rankings.slice(0, limit);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-black">🏆 연승 랭킹</h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">TOP {limit}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[10px] text-gray-500 hover:text-white font-mono border border-white/10 hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
          >
            새로고침
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-4">
          아직 등록된 기록이 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-2 pb-1 border-b border-white/10">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">연승</span>
            <span className="col-span-3 text-right">정답률</span>
          </div>

          {displayed.map((entry, i) => {
            const isMe = entry.userId === myUserId;
            const accuracy = entry.totalGames > 0
              ? Math.round((entry.totalCorrect / entry.totalGames) * 100)
              : 0;

            return (
              <div
                key={entry.userId}
                className={`px-2 py-1.5 rounded-lg transition-colors ${
                  isMe ? "bg-orange-500/10 border border-orange-500/30" : "hover:bg-white/5"
                }`}
              >
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">
                    {i < 3 ? MEDALS[i] : `${i + 1}`}
                  </span>
                  <div className="col-span-5 min-w-0">
                    <div className={`truncate font-semibold ${isMe ? "text-orange-400" : "text-white"}`}>
                      {entry.nickname}
                      {isMe && <span className="ml-1 text-[9px] text-orange-400/70">나</span>}
                    </div>
                  </div>
                  <span className="col-span-3 text-right font-bold text-orange-400">
                    🔥 {entry.bestStreak}
                  </span>
                  <span className="col-span-3 text-right text-gray-500">
                    {accuracy}%
                  </span>
                </div>
              </div>
            );
          })}

          {myRank && !displayed.some((r) => r.userId === myUserId) && (
            <>
              <div className="flex items-center gap-2 py-1 px-2">
                <div className="flex-1 border-t border-dashed border-white/10" />
                <span className="text-[10px] text-gray-400 font-mono shrink-0">내 순위</span>
                <div className="flex-1 border-t border-dashed border-white/10" />
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">{myRank.rank}</span>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate font-semibold text-orange-400">
                      {myRank.entry.nickname}
                      <span className="ml-1 text-[9px] text-orange-400/70">나</span>
                    </div>
                  </div>
                  <span className="col-span-3 text-right font-bold text-orange-400">
                    🔥 {myRank.entry.bestStreak}
                  </span>
                  <span className="col-span-3 text-right text-gray-500">
                    {myRank.entry.totalGames > 0
                      ? Math.round((myRank.entry.totalCorrect / myRank.entry.totalGames) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
