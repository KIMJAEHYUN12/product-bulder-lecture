"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
} from "@/lib/rpgConstants";
import {
  GRADE_RATES,
  SINGLE_COST,
  MULTI_COST,
  MULTI_COUNT,
  pullGacha,
} from "@/lib/gachaEngine";
import GachaReveal from "./GachaReveal";
import GachaResult from "./GachaResult";
import type { GachaItem } from "@/lib/gachaPool";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentGrade } from "@/types";

interface Props {
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
}

type Phase = "idle" | "revealing" | "result";

const GRADE_ORDER: EquipmentGrade[] = ["common", "uncommon", "rare", "epic", "legendary"];
const HISTORY_KEY = "ovision_gacha_history";
const MAX_HISTORY = 20;
const DISPLAY_HISTORY = 10;

interface HistoryEntry {
  emoji: string;
  grade: EquipmentGrade;
  name: string;
}

export default function GachaPanel({ character, setCharacter }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<GachaItem[]>([]);
  const [showRates, setShowRates] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // localStorage에서 히스토리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveHistory = useCallback((newItems: GachaItem[]) => {
    const entries: HistoryEntry[] = newItems.map((item) => ({
      emoji: item.emoji,
      grade: item.grade,
      name: item.name,
    }));
    setHistory((prev) => {
      const updated = [...entries, ...prev].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const canAffordSingle = character.stones >= SINGLE_COST;
  const canAffordMulti = character.stones >= MULTI_COST;

  const handlePull = useCallback((count: 1 | 5) => {
    if (phase !== "idle") return;
    const cost = count === 1 ? SINGLE_COST : MULTI_COST;
    if (character.stones < cost) return;

    setCharacter(prev => ({ ...prev, stones: prev.stones - cost }));
    const items = pullGacha(count);
    setResults(items);
    setPhase("revealing");
  }, [phase, character.stones, setCharacter]);

  const handleRevealComplete = useCallback(() => {
    saveHistory(results);
    setPhase("result");
  }, [results, saveHistory]);

  const handleResultClose = useCallback(() => {
    setPhase("idle");
    setResults([]);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* 투자석 잔고 */}
      <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💎</span>
          <span className="text-sm font-bold text-white">투자석</span>
        </div>
        <span className="text-lg font-black text-indigo-400 font-mono">{character.stones}</span>
      </div>

      {/* 뽑기 버튼 / 확률표 / 히스토리 (idle 시) */}
      {phase === "idle" && (
        <>
          {/* 뽑기 버튼 2개 */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePull(1)}
                disabled={!canAffordSingle}
                className={`py-4 rounded-xl text-sm font-black transition-all ${
                  canAffordSingle
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                <div>🎰 1회 뽑기</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-70">💎 {SINGLE_COST}</div>
              </button>
              <button
                onClick={() => handlePull(5)}
                disabled={!canAffordMulti}
                className={`py-4 rounded-xl text-sm font-black transition-all ${
                  canAffordMulti
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white active:scale-[0.98]"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                <div>🎰 {MULTI_COUNT}회 뽑기</div>
                <div className="text-[10px] font-mono mt-0.5 opacity-70">
                  💎 <span className="line-through text-gray-500">{SINGLE_COST * MULTI_COUNT}</span>{" "}
                  <span className="text-white font-bold">{MULTI_COST}</span>
                </div>
              </button>
            </div>

            {/* 확률표 토글 */}
            <div className="mt-3">
              <button
                onClick={() => setShowRates(!showRates)}
                className="w-full flex items-center justify-between text-[10px] text-gray-500 hover:text-gray-400 transition-colors font-mono"
              >
                <span>확률표 보기</span>
                <span className={`transition-transform ${showRates ? "rotate-180" : ""}`}>▼</span>
              </button>
              <AnimatePresence>
                {showRates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/5 rounded-xl p-3 mt-2 space-y-1">
                      {GRADE_ORDER.map((grade) => (
                        <div key={grade} className="flex items-center justify-between text-[10px] font-mono">
                          <span className={GRADE_COLORS[grade]}>{GRADE_LABELS[grade]}</span>
                          <span className="text-gray-500">{GRADE_RATES[grade]}%</span>
                        </div>
                      ))}
                      <p className="text-[9px] text-gray-600 font-mono pt-1">
                        {MULTI_COUNT}연뽑: 고급 이상 1개 보장
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 최근 획득 히스토리 */}
          {history.length > 0 && (
            <div className="glass-card p-5 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-mono mb-2">최근 획득</p>
              <div className="overflow-x-auto flex gap-1.5">
                {history.slice(0, DISPLAY_HISTORY).map((entry, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${GRADE_BG_COLORS[entry.grade]}`}
                    title={entry.name}
                  >
                    <span className="text-base">{entry.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 연출 오버레이 */}
      <AnimatePresence>
        {phase === "revealing" && results.length > 0 && (
          <GachaReveal items={results} onComplete={handleRevealComplete} />
        )}
      </AnimatePresence>

      {/* 결과 카드 */}
      {phase === "result" && results.length > 0 && (
        <GachaResult
          items={results}
          character={character}
          setCharacter={setCharacter}
          onClose={handleResultClose}
        />
      )}
    </div>
  );
}
