"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateOpponent,
  simulateBattle,
  sumStats,
  getBattleAttempts,
  consumeBattleAttempt,
  consumePaidBattleAttempt,
  getWinStreak,
  updateWinStreak,
  getBattleHistory,
  addBattleHistory,
} from "@/lib/battleEngine";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import { grantExp, applyExp } from "@/lib/rpgExp";
import { expForLevel } from "@/lib/rpgConstants";
import { getKSTDateString } from "@/lib/kstDate";
import BattleArena from "@/components/adventure/BattleArena";
import BattleResultView from "@/components/adventure/BattleResultView";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type {
  RpgCharacter,
  RpgStats,
  BattleOpponent,
  BattleResult,
  BattleHistoryEntry,
} from "@/types";

type BattlePhase = "idle" | "matching" | "fighting" | "result";

interface Props {
  character: RpgCharacter;
  totalStats: RpgStats;
  setCharacter: (c: SetCharacterArg) => void;
  onLevelUp: (level: number) => void;
}

export default function BattlePanel({ character, totalStats, setCharacter, onLevelUp }: Props) {
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [opponent, setOpponent] = useState<BattleOpponent | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [attempts, setAttempts] = useState({ used: 0, remaining: 3 });
  const [history, setHistory] = useState<BattleHistoryEntry[]>([]);
  const [streakBonus, setStreakBonus] = useState(0);
  const [matchReveal, setMatchReveal] = useState(0); // 0~4 순차 공개 단계
  const rewardAppliedRef = useRef(false);

  useEffect(() => {
    setAttempts(getBattleAttempts());
    setHistory(getBattleHistory());
  }, []);

  const myCombatPower = sumStats(totalStats);
  const myClass = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;

  // ── 배틀 시작 ──
  const startBattle = useCallback(() => {
    const isFree = attempts.remaining > 0;
    if (!isFree) {
      // 투자석 소모
      if (character.stones < 1) {
        setPhase("idle");
        return;
      }
      consumePaidBattleAttempt();
      setCharacter(prev => ({ ...prev, stones: prev.stones - 1 }));
    } else {
      if (!consumeBattleAttempt()) {
        setPhase("idle");
        return;
      }
    }

    rewardAppliedRef.current = false;
    const opp = generateOpponent(character.level);
    setOpponent(opp);
    setPhase("matching");
    setMatchReveal(0);
    setAttempts(getBattleAttempts());

    // 순차 공개 (0.3s stagger)
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setMatchReveal(step);
      if (step >= 4) {
        clearInterval(interval);
        // 1.5s 후 전투 시작
        setTimeout(() => {
          const result = simulateBattle(totalStats, opp);
          setBattleResult(result);
          setPhase("fighting");
        }, 600);
      }
    }, 300);
  }, [attempts, character, totalStats, setCharacter]);

  // ── 전투 완료 보상 처리 ──
  const handleBattleComplete = useCallback(() => {
    if (rewardAppliedRef.current || !battleResult || !opponent) return;
    rewardAppliedRef.current = true;

    const winner = battleResult.winner;
    const expType = winner === "player" ? "battle_win" : winner === "opponent" ? "battle_lose" : "battle_draw";

    // EXP 부여 (토스트 자동)
    grantExp(expType);

    // 연승 처리
    const { streak, bonusStones } = updateWinStreak(winner === "player");
    void streak;
    setStreakBonus(bonusStones);

    // EXP & 레벨업 적용 — character.exp/level은 함수형 내부에서 참조
    const stoneReward = battleResult.stoneReward + bonusStones;

    setCharacter(prev => {
      const updatedRecord = { ...prev.battleRecord };
      if (winner === "player") updatedRecord.wins++;
      else if (winner === "opponent") updatedRecord.losses++;
      else updatedRecord.draws++;

      const expResult = applyExp(
        prev.exp,
        prev.level,
        battleResult.expReward,
        expForLevel
      );

      if (expResult.leveledUp) {
        onLevelUp(expResult.level);
      }

      return {
        ...prev,
        exp: expResult.exp,
        level: expResult.level,
        stones: prev.stones + stoneReward + expResult.levelsGained,
        battleRecord: updatedRecord,
      };
    });

    // 히스토리 저장
    const entry: BattleHistoryEntry = {
      date: getKSTDateString(),
      winner,
      opponentClassName: opponent.className,
      opponentLevel: opponent.level,
      expReward: battleResult.expReward,
      stoneReward: battleResult.stoneReward + bonusStones,
    };
    addBattleHistory(entry);
    setHistory(getBattleHistory());

    setAttempts(getBattleAttempts());

    setPhase("result");
  }, [battleResult, opponent, setCharacter, onLevelUp]);

  // ── 재시작 / 돌아가기 ──
  const retry = () => {
    const freshAttempts = getBattleAttempts();
    const canRetry = freshAttempts.remaining > 0 || character.stones >= 1;

    if (!canRetry) {
      setBattleResult(null);
      setOpponent(null);
      setStreakBonus(0);
      setPhase("idle");
      setAttempts(freshAttempts);
      setHistory(getBattleHistory());
      return;
    }

    setBattleResult(null);
    setOpponent(null);
    setStreakBonus(0);
    setAttempts(freshAttempts);
    startBattle();
  };

  const goBack = () => {
    setBattleResult(null);
    setOpponent(null);
    setStreakBonus(0);
    setPhase("idle");
    setAttempts(getBattleAttempts());
    setHistory(getBattleHistory());
  };

  const isFreeAvailable = attempts.remaining > 0;
  const canBattle = isFreeAvailable || character.stones >= 1;

  // ── 렌더링 ──
  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        {/* ── idle: 매칭 대기 ── */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* 헤더 */}
            <div className="glass-card rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-black text-white">투자 배틀</h2>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  오늘 전적: {character.battleRecord.wins}승 {character.battleRecord.losses}패
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  남은 횟수: {attempts.remaining}/3
                  {!isFreeAvailable && <span className="text-indigo-400 ml-1">+1석 추가</span>}
                </span>
              </div>
            </div>

            {/* VS 카드 */}
            <div className="glass-card rounded-2xl p-5 mb-3">
              <div className="flex items-center justify-between">
                {/* 나 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                    {myClass.emoji}
                  </div>
                  <span className="text-xs font-bold text-white mt-1.5 max-w-[70px] truncate">
                    {character.nickname}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
                  <span className="text-[10px] text-gray-500 font-mono">전투력 {myCombatPower}</span>
                </div>

                <span className="text-xl font-black text-gray-600">VS</span>

                {/* 상대 (???) */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-gray-600">
                    ?
                  </div>
                  <span className="text-xs font-bold text-gray-600 mt-1.5">???</span>
                  <span className="text-[10px] text-gray-600 font-mono">???</span>
                  <span className="text-[10px] text-gray-600 font-mono">???</span>
                </div>
              </div>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={startBattle}
              disabled={!canBattle}
              className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                canBattle
                  ? "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              {isFreeAvailable
                ? "배틀 시작"
                : character.stones >= 1
                ? "투자석 1개 소모하고 배틀"
                : "투자석 부족"}
            </button>

            {/* 히스토리 */}
            {history.length > 0 && (
              <div className="glass-card rounded-2xl p-5 mt-3">
                <h3 className="text-xs font-bold text-gray-400 mb-2">최근 전적</h3>
                <div className="flex flex-col gap-1">
                  {history.map((h, i) => (
                    <div key={i} className="text-xs font-mono flex items-center gap-1.5">
                      <span
                        className={
                          h.winner === "player"
                            ? "text-green-400"
                            : h.winner === "opponent"
                            ? "text-red-400"
                            : "text-amber-400"
                        }
                      >
                        {h.winner === "player" ? "W" : h.winner === "opponent" ? "L" : "D"}
                      </span>
                      <span className="text-gray-500">
                        vs {h.opponentClassName} Lv.{h.opponentLevel}
                      </span>
                      {h.expReward > 0 && (
                        <span className="text-amber-400/60">+{h.expReward}exp</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── matching: 상대 순차 공개 ── */}
        {phase === "matching" && opponent && (
          <motion.div
            key="matching"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                {/* 나 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
                    {myClass.emoji}
                  </div>
                  <span className="text-xs font-bold text-white mt-1.5 max-w-[70px] truncate">
                    {character.nickname}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
                  <span className="text-[10px] text-gray-500 font-mono">전투력 {myCombatPower}</span>
                </div>

                <motion.span
                  className="text-xl font-black text-red-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  VS
                </motion.span>

                {/* 상대 — 순차 공개 */}
                <div className="flex flex-col items-center">
                  {matchReveal >= 1 ? (
                    <motion.div
                      className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {opponent.emoji}
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-gray-600">
                      ?
                    </div>
                  )}

                  {matchReveal >= 2 ? (
                    <motion.span
                      className="text-xs font-bold text-white mt-1.5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {opponent.className}
                    </motion.span>
                  ) : (
                    <span className="text-xs font-bold text-gray-600 mt-1.5">???</span>
                  )}

                  {matchReveal >= 3 ? (
                    <motion.span
                      className="text-[10px] text-gray-400 font-mono"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Lv.{opponent.level}
                    </motion.span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono">???</span>
                  )}

                  {matchReveal >= 4 ? (
                    <motion.span
                      className="text-[10px] text-gray-400 font-mono"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      전투력 {opponent.combatPower}
                    </motion.span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono">???</span>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-500 font-mono mt-4 animate-pulse">
                상대를 찾는 중...
              </p>
            </div>
          </motion.div>
        )}

        {/* ── fighting: 전투 진행 ── */}
        {phase === "fighting" && battleResult && opponent && (
          <motion.div
            key="fighting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <BattleArena
              playerEmoji={myClass.emoji}
              playerNickname={character.nickname}
              opponentEmoji={opponent.emoji}
              opponentNickname={opponent.nickname}
              turns={battleResult.turns}
              playerMaxHp={sumStats(totalStats) * 10}
              opponentMaxHp={sumStats(opponent.stats) * 10}
              onComplete={handleBattleComplete}
            />
          </motion.div>
        )}

        {/* ── result: 결과 화면 ── */}
        {phase === "result" && battleResult && opponent && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <BattleResultView
              result={battleResult}
              opponent={opponent}
              onRetry={retry}
              onBack={goBack}
              streakBonus={streakBonus}
              battleRecord={character.battleRecord}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
