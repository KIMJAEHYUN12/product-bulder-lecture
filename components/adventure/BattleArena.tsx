"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TurnResult } from "@/types";

interface Props {
  playerEmoji: string;
  playerNickname: string;
  opponentEmoji: string;
  opponentNickname: string;
  turns: TurnResult[];
  playerMaxHp: number;
  opponentMaxHp: number;
  onComplete: () => void;
}

function hpColor(pct: number): string {
  if (pct > 60) return "bg-green-500";
  if (pct > 30) return "bg-amber-500";
  return "bg-red-500";
}

export default function BattleArena({
  playerEmoji,
  playerNickname,
  opponentEmoji,
  opponentNickname,
  turns,
  playerMaxHp,
  opponentMaxHp,
  onComplete,
}: Props) {
  const [currentTurnIdx, setCurrentTurnIdx] = useState(-1);
  const [subPhase, setSubPhase] = useState<"clash" | "damage" | "hp" | "flavor" | "ko">("clash");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const turn = currentTurnIdx >= 0 && currentTurnIdx < turns.length ? turns[currentTurnIdx] : null;
  const prevTurn = currentTurnIdx > 0 ? turns[currentTurnIdx - 1] : null;

  const playerHp = turn ? turn.playerHp : playerMaxHp;
  const opponentHp = turn ? turn.opponentHp : opponentMaxHp;
  const displayPlayerHp = subPhase === "clash" || subPhase === "damage"
    ? (prevTurn ? prevTurn.playerHp : playerMaxHp)
    : playerHp;
  const displayOpponentHp = subPhase === "clash" || subPhase === "damage"
    ? (prevTurn ? prevTurn.opponentHp : opponentMaxHp)
    : opponentHp;

  const isKo = turn && (turn.playerHp <= 0 || turn.opponentHp <= 0);
  const playerLost = turn ? turn.playerHp <= 0 : false;
  const opponentLost = turn ? turn.opponentHp <= 0 : false;

  useEffect(() => {
    // 첫 턴 시작
    timerRef.current = setTimeout(() => {
      setCurrentTurnIdx(0);
      setSubPhase("clash");
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentTurnIdx < 0) return;
    if (currentTurnIdx >= turns.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }

    const t = turns[currentTurnIdx];

    // 턴 진행 타이밍: clash(0.3s) → damage(0.5s) → hp(0.3s) → flavor(0.3s) → next(0.8s)
    if (subPhase === "clash") {
      timerRef.current = setTimeout(() => setSubPhase("damage"), 300);
    } else if (subPhase === "damage") {
      timerRef.current = setTimeout(() => setSubPhase("hp"), 500);
    } else if (subPhase === "hp") {
      timerRef.current = setTimeout(() => setSubPhase("flavor"), 300);
    } else if (subPhase === "flavor") {
      if (t.playerHp <= 0 || t.opponentHp <= 0) {
        timerRef.current = setTimeout(() => setSubPhase("ko"), 300);
      } else {
        timerRef.current = setTimeout(() => {
          setCurrentTurnIdx((prev) => prev + 1);
          setSubPhase("clash");
        }, 800);
      }
    } else if (subPhase === "ko") {
      timerRef.current = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, 800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentTurnIdx, subPhase, turns, onComplete]);

  const playerHpPct = Math.max(0, (displayPlayerHp / playerMaxHp) * 100);
  const opponentHpPct = Math.max(0, (displayOpponentHp / opponentMaxHp) * 100);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      {/* Round 표시 */}
      {turn && (
        <div className="text-center mb-4">
          <span className="text-xs text-gray-400 font-mono">
            Round {turn.turn} — {turn.label}
          </span>
        </div>
      )}

      {/* 이모지 배틀 영역 */}
      <div className="flex items-center justify-between mb-4 px-4">
        {/* 플레이어 */}
        <motion.div
          className="flex flex-col items-center"
          animate={
            subPhase === "clash"
              ? { x: [0, 20, 0] }
              : playerLost && subPhase === "ko"
              ? { opacity: 0.3, scale: 0.8, rotate: 15 }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
            {playerEmoji}
          </div>
          <span className="text-[10px] text-gray-400 font-mono mt-1 max-w-[60px] truncate">
            {playerNickname}
          </span>
        </motion.div>

        {/* VS / KO */}
        <AnimatePresence mode="wait">
          {subPhase === "ko" && isKo ? (
            <motion.span
              key="ko"
              className="text-2xl font-black text-red-400"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              K.O.
            </motion.span>
          ) : (
            <span key="vs" className="text-sm font-black text-gray-600">VS</span>
          )}
        </AnimatePresence>

        {/* 상대 */}
        <motion.div
          className="flex flex-col items-center"
          animate={
            subPhase === "clash"
              ? { x: [0, -20, 0] }
              : opponentLost && subPhase === "ko"
              ? { opacity: 0.3, scale: 0.8, rotate: -15 }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">
            {opponentEmoji}
          </div>
          <span className="text-[10px] text-gray-400 font-mono mt-1 max-w-[60px] truncate">
            {opponentNickname}
          </span>
        </motion.div>
      </div>

      {/* 데미지 숫자 */}
      <div className="flex items-center justify-between px-8 h-8 mb-2">
        <AnimatePresence>
          {turn && (subPhase === "damage" || subPhase === "hp" || subPhase === "flavor") && (
            <motion.span
              key={`pdmg-${currentTurnIdx}`}
              className={`font-black ${
                turn.isCritical ? "text-amber-400 text-lg" : "text-white text-sm"
              }`}
              initial={{ opacity: 1, y: 0, scale: turn.isCritical ? 1.3 : 1 }}
              animate={{ opacity: 0, y: -30, scale: 1 }}
              transition={{ duration: turn.isCritical ? 1 : 0.8 }}
            >
              -{turn.playerDmg}
              {turn.isCritical && <span className="text-xs ml-0.5">CRITICAL!</span>}
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {turn && (subPhase === "damage" || subPhase === "hp" || subPhase === "flavor") && (
            <motion.span
              key={`odmg-${currentTurnIdx}`}
              className={`font-black ${
                turn.isCritical ? "text-amber-400 text-lg" : "text-white text-sm"
              }`}
              initial={{ opacity: 1, y: 0, scale: turn.isCritical ? 1.3 : 1 }}
              animate={{ opacity: 0, y: -30, scale: 1 }}
              transition={{ duration: turn.isCritical ? 1 : 0.8 }}
            >
              -{turn.opponentDmg}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* HP 바 */}
      <div className="flex gap-3 items-center mb-2">
        {/* 플레이어 HP — 오른쪽 정렬 */}
        <div className="flex-1">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex justify-end">
            <motion.div
              className={`h-full rounded-full ${hpColor(playerHpPct)}`}
              animate={{ width: `${playerHpPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono">{playerNickname}</span>
            <span className="text-[10px] text-gray-500 font-mono">{Math.max(0, displayPlayerHp)}</span>
          </div>
        </div>

        {/* 상대 HP — 왼쪽 정렬 */}
        <div className="flex-1">
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${hpColor(opponentHpPct)}`}
              animate={{ width: `${opponentHpPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500 font-mono">{Math.max(0, displayOpponentHp)}</span>
            <span className="text-[10px] text-gray-500 font-mono">{opponentNickname}</span>
          </div>
        </div>
      </div>

      {/* 플레이버 텍스트 */}
      <AnimatePresence mode="wait">
        {turn && (subPhase === "flavor" || subPhase === "ko") && (
          <motion.p
            key={`flavor-${currentTurnIdx}`}
            className="text-xs text-gray-300 italic text-center mt-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            &ldquo;{turn.flavorText}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
