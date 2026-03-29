"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SLOT_LABELS,
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
  STAT_LABELS,
} from "@/lib/rpgConstants";
import {
  getEnhanceCost,
  getSuccessRate,
  canEnhance,
  executeEnhance,
  MAX_ENHANCE_LEVEL,
} from "@/lib/enhanceEngine";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentSlotKey } from "@/types";

interface Props {
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
}

interface EnhanceLog {
  id: number;
  message: string;
  success: boolean;
}

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

let logId = 0;

export default function EnhancePanel({ character, setCharacter }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlotKey>("weapon");
  const [logs, setLogs] = useState<EnhanceLog[]>([]);
  const [animState, setAnimState] = useState<"idle" | "shaking" | "success" | "fail">("idle");

  const item = character.equipment?.[selectedSlot] ?? null;

  const handleEnhance = useCallback(() => {
    if (!item || !canEnhance(item)) return;
    const cost = getEnhanceCost(item.enhanceLevel);
    if (character.stones < cost) return;

    // 진동 애니메이션 시작
    setAnimState("shaking");

    setTimeout(() => {
      const result = executeEnhance(item);
      setCharacter(prev => ({
        ...prev,
        stones: prev.stones - cost,
        equipment: {
          ...(prev.equipment ?? {}),
          [selectedSlot]: {
            ...item,
            enhanceLevel: result.newLevel,
            bonus: result.newBonus,
          },
        },
      }));
      setAnimState(result.success ? "success" : "fail");
      setLogs((prev) => [
        { id: ++logId, message: `${item.name} ${result.message}`, success: result.success },
        ...prev.slice(0, 4),
      ]);

      setTimeout(() => setAnimState("idle"), 600);
    }, 800);
  }, [item, selectedSlot, setCharacter]);

  const cost = item ? getEnhanceCost(item.enhanceLevel) : 0;
  const rate = item ? getSuccessRate(item.enhanceLevel) : 0;
  const isMaxed = item ? !canEnhance(item) : false;
  const canAfford = character.stones >= cost;

  // 실패 페널티 설명
  const penaltyText = !item
    ? ""
    : item.enhanceLevel <= 3
      ? "실패 시 레벨 유지"
      : item.enhanceLevel <= 6
        ? "실패 시 50% 확률로 -1"
        : "실패 시 -1 확정";

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

      {/* 슬롯 선택 탭 */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5">
        {SLOTS.map((slot) => {
          const slotInfo = SLOT_LABELS[slot];
          const slotItem = character.equipment?.[slot];
          return (
            <button
              key={slot}
              onClick={() => setSelectedSlot(slot)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                selectedSlot === slot ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {selectedSlot === slot && (
                <motion.div
                  layoutId="enhance-slot"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative text-base">{slotInfo.emoji}</span>
              <span className="relative text-[10px] font-bold">{slotInfo.label}</span>
              {slotItem && slotItem.enhanceLevel > 0 && (
                <span className="relative text-[10px] font-mono text-indigo-400">+{slotItem.enhanceLevel}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 장비 카드 */}
      {item && (
        <motion.div
          animate={
            animState === "shaking"
              ? { x: [0, -3, 3, -3, 3, -2, 2, 0], transition: { duration: 0.8, repeat: Infinity } }
              : animState === "success"
                ? { scale: [1, 1.05, 1], transition: { duration: 0.4 } }
                : animState === "fail"
                  ? { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.4 } }
                  : { x: 0, scale: 1 }
          }
          className={`glass-card p-5 rounded-2xl border transition-shadow ${GRADE_BG_COLORS[item.grade]} ${
            animState === "success" ? "shadow-lg" : ""
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white truncate">{item.name}</div>
              <div className={`text-xs font-mono ${GRADE_COLORS[item.grade]}`}>
                {GRADE_LABELS[item.grade]}
                {item.enhanceLevel > 0 && (
                  <span className="text-indigo-400 ml-1">+{item.enhanceLevel}</span>
                )}
                {isMaxed && <span className="text-amber-400 ml-1">(MAX)</span>}
              </div>
            </div>
          </div>

          {/* 보너스 스탯 */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(item.bonus).map(([k, v]) =>
              v ? (
                <span
                  key={k}
                  className={`text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 ${
                    STAT_LABELS[k as keyof typeof STAT_LABELS]?.color ?? "text-gray-400"
                  }`}
                >
                  {STAT_LABELS[k as keyof typeof STAT_LABELS]?.label ?? k} +{v}
                </span>
              ) : null
            )}
          </div>
        </motion.div>
      )}

      {/* 강화 미리보기 */}
      {item && !isMaxed && (
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">강화 비용</span>
            <span className={`font-mono font-bold ${canAfford ? "text-indigo-400" : "text-red-400"}`}>
              💎 {cost}개
              {!canAfford && <span className="text-red-400 ml-1">(부족)</span>}
            </span>
          </div>

          {/* 성공률 바 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">성공률</span>
              <span className={`font-mono font-bold ${
                rate >= 70 ? "text-green-400" : rate >= 40 ? "text-amber-400" : "text-red-400"
              }`}>
                {rate}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono">{penaltyText}</div>
        </div>
      )}

      {/* 강화 버튼 */}
      {item && (
        <button
          onClick={handleEnhance}
          disabled={isMaxed || !canAfford || animState !== "idle"}
          className={`w-full py-3.5 rounded-xl text-sm font-black transition-all ${
            isMaxed
              ? "bg-amber-500/20 text-amber-400 cursor-default"
              : !canAfford || animState !== "idle"
                ? "bg-white/5 text-gray-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]"
          }`}
        >
          {animState === "shaking" ? (
            <span className="animate-pulse">강화 중...</span>
          ) : isMaxed ? (
            "최대 강화 달성"
          ) : !canAfford ? (
            "투자석 부족"
          ) : (
            `+${item.enhanceLevel} → +${item.enhanceLevel + 1} 강화하기`
          )}
        </button>
      )}

      {/* 강화 로그 */}
      <AnimatePresence>
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-1"
          >
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg ${
                  log.success
                    ? "bg-indigo-500/10 text-indigo-300"
                    : "bg-red-500/10 text-red-300"
                }`}
              >
                {log.success ? "✓" : "✗"} {log.message}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
