"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { BattleResult, BattleOpponent, BattleRecord } from "@/types";

interface Props {
  result: BattleResult;
  opponent: BattleOpponent;
  onRetry: () => void;
  onBack: () => void;
  streakBonus: number;
  battleRecord: BattleRecord;
}

function VictoryParticles() {
  const particles = useMemo(() => {
    const colors = ["bg-amber-400", "bg-yellow-300", "bg-orange-400"];
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random(),
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute w-2 h-2 rounded-full ${p.color}`}
          style={{ left: `${p.x}%` }}
          initial={{ y: -50, opacity: 1 }}
          animate={{ y: 300, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

export default function BattleResultView({
  result,
  opponent,
  onRetry,
  onBack,
  streakBonus,
  battleRecord,
}: Props) {
  const isWin = result.winner === "player";
  const isLose = result.winner === "opponent";
  const isDraw = result.winner === "draw";

  const totalWins = battleRecord.wins;
  const totalLosses = battleRecord.losses;
  const totalGames = totalWins + totalLosses + battleRecord.draws;
  const winPct = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <motion.div
      className="relative"
      animate={isLose ? { x: [0, -5, 5, -3, 3, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* 패배 빨간 flash */}
      {isLose && (
        <motion.div
          className="absolute inset-0 bg-red-500/5 rounded-2xl"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* 승리 파티클 */}
      {isWin && <VictoryParticles />}

      <div className="glass-card rounded-2xl p-6 text-center relative">
        {/* 이모지 */}
        <motion.div
          className="text-5xl mb-2"
          initial={isWin ? { scale: 0.3 } : { scale: 0.8 }}
          animate={
            isLose
              ? { scale: 1, x: [0, -5, 5, -3, 3, 0] }
              : { scale: 1 }
          }
          transition={isWin ? { type: "spring", stiffness: 300, damping: 15 } : { duration: 0.4 }}
        >
          {isWin ? "🏆" : isLose ? "💀" : "⚖️"}
        </motion.div>

        {/* 결과 텍스트 */}
        <h3
          className={`text-xl font-black mb-3 ${
            isWin ? "text-amber-400" : isLose ? "text-gray-400" : "text-amber-400"
          }`}
        >
          {isWin ? "승리!" : isLose ? "패배..." : "무승부"}
        </h3>

        {/* 보상 카드 */}
        {isWin || isDraw ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 font-mono mb-1">EXP</div>
              <div className="text-sm font-black text-amber-300">
                +<AnimatedNumber value={result.expReward} format={(n) => Math.round(n).toString()} />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 font-mono mb-1">투자석</div>
              <div className="text-sm font-black text-indigo-300">
                +<AnimatedNumber value={result.stoneReward} format={(n) => Math.round(n).toString()} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl p-3 text-center mb-3">
            <div className="text-[10px] text-gray-400 font-mono mb-1">EXP</div>
            <div className="text-sm font-black text-amber-300">
              +<AnimatedNumber value={result.expReward} format={(n) => Math.round(n).toString()} />
            </div>
          </div>
        )}

        {/* 연승 보너스 */}
        {streakBonus > 0 && (
          <motion.div
            className="text-xs font-bold text-amber-400 mb-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            3연승 보너스! +{streakBonus} 투자석
          </motion.div>
        )}

        {/* 전적 */}
        <p className="text-xs text-gray-400 font-mono">
          전적: {totalWins}승 {totalLosses}패 ({winPct}%)
        </p>

        {/* 상대 정보 */}
        <p className="text-[10px] text-gray-600 font-mono mt-1">
          vs {opponent.emoji} {opponent.className} Lv.{opponent.level}
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
        >
          다시 배틀
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-all"
        >
          돌아가기
        </button>
      </div>
    </motion.div>
  );
}
