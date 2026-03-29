"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GRADE_COLORS,
  GRADE_BG_COLORS,
  GRADE_LABELS,
  SLOT_LABELS,
  STAT_LABELS,
} from "@/lib/rpgConstants";
import { gachaItemToEquipment, compareWithCurrent, type StatDiff } from "@/lib/gachaEngine";
import type { GachaItem } from "@/lib/gachaPool";
import type { SetCharacterArg } from "@/hooks/useRpgCharacter";
import type { RpgCharacter, EquipmentItem } from "@/types";

interface Props {
  items: GachaItem[];
  character: RpgCharacter;
  setCharacter: (c: SetCharacterArg) => void;
  onClose: () => void;
}

const GRADE_GLOW: Record<string, string> = {
  common: "",
  uncommon: "shadow-[0_0_20px_rgba(34,197,94,0.15)]",
  rare: "shadow-[0_0_30px_rgba(59,130,246,0.2)]",
  epic: "shadow-[0_0_40px_rgba(168,85,247,0.2)]",
  legendary: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
};

export default function GachaResult({ items, character, setCharacter, onClose }: Props) {
  const isSingle = items.length === 1;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(isSingle ? 0 : null);
  const [handled, setHandled] = useState<Set<number>>(new Set());

  const selectedItem = selectedIdx !== null ? items[selectedIdx] : null;
  const equipment = selectedItem ? gachaItemToEquipment(selectedItem) : null;
  const currentEquipped = selectedItem ? character.equipment?.[selectedItem.slot] ?? null : null;
  const diffs = equipment ? compareWithCurrent(currentEquipped, equipment) : [];

  const handleEquip = useCallback((item: GachaItem, idx: number) => {
    const eq = gachaItemToEquipment(item);
    setCharacter(prev => ({
      ...prev,
      equipment: { ...(prev.equipment ?? {}), [item.slot]: eq },
    }));
    const next = new Set(handled);
    next.add(idx);
    setHandled(next);

    if (isSingle) {
      onClose();
    } else {
      setSelectedIdx(null);
    }
  }, [setCharacter, handled, isSingle, onClose]);

  const handleKeep = useCallback((idx: number) => {
    const next = new Set(handled);
    next.add(idx);
    setHandled(next);

    if (isSingle) {
      onClose();
    } else {
      setSelectedIdx(null);
    }
  }, [handled, isSingle, onClose]);

  const allHandled = handled.size === items.length;

  // ── 1회 뽑기 결과 ──
  if (isSingle && selectedItem && equipment) {
    return (
      <SingleResult
        item={selectedItem}
        equipment={equipment}
        currentEquipped={currentEquipped}
        diffs={diffs}
        onEquip={() => handleEquip(selectedItem, 0)}
        onKeep={() => handleKeep(0)}
      />
    );
  }

  // ── 5회 뽑기 결과 ──
  return (
    <div className="flex flex-col gap-3">
      <div className="glass-card p-5 rounded-2xl">
        <p className="text-sm font-bold text-white text-center mb-4">5회 뽑기 결과</p>

        {/* 미니 카드 가로 배열 */}
        <div className="flex gap-2 justify-center overflow-x-auto pb-2">
          {items.map((item, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              onClick={() => !handled.has(idx) && setSelectedIdx(idx)}
              className={`w-14 h-20 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all ${
                GRADE_BG_COLORS[item.grade]
              } ${
                handled.has(idx) ? "opacity-30" : selectedIdx === idx ? "ring-2 ring-indigo-400 scale-105" : "hover:scale-105"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[8px] font-mono ${GRADE_COLORS[item.grade]}`}>
                {GRADE_LABELS[item.grade]}
              </span>
            </motion.button>
          ))}
        </div>

        {selectedIdx === null && !allHandled && (
          <p className="text-[10px] text-gray-500 text-center mt-2 font-mono">
            탭해서 상세 보기
          </p>
        )}
      </div>

      {/* 선택된 아이템 상세 */}
      <AnimatePresence mode="wait">
        {selectedIdx !== null && selectedItem && equipment && (
          <motion.div
            key={`detail-${selectedIdx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SingleResult
              item={selectedItem}
              equipment={equipment}
              currentEquipped={currentEquipped}
              diffs={diffs}
              onEquip={() => handleEquip(selectedItem, selectedIdx)}
              onKeep={() => handleKeep(selectedIdx)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 닫기 버튼 (전부 처리 완료 시) */}
      {allHandled && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
        >
          닫기
        </motion.button>
      )}

      {/* 남은 것 전부 보관 */}
      {!allHandled && handled.size > 0 && selectedIdx === null && (
        <button
          onClick={() => {
            const next = new Set(handled);
            items.forEach((_, idx) => next.add(idx));
            setHandled(next);
          }}
          className="w-full py-2.5 rounded-xl text-xs font-mono text-gray-500 hover:text-gray-400 transition-colors"
        >
          나머지 전부 보관하기
        </button>
      )}
    </div>
  );
}

// ── 단일 결과 카드 ──
function SingleResult({
  item,
  equipment,
  currentEquipped,
  diffs,
  onEquip,
  onKeep,
}: {
  item: GachaItem;
  equipment: EquipmentItem;
  currentEquipped: EquipmentItem | null;
  diffs: StatDiff[];
  onEquip: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`glass-card rounded-2xl p-6 ${GRADE_GLOW[item.grade]}`}>
        {/* 등급 제목 */}
        <p className={`text-sm font-bold text-center mb-3 ${GRADE_COLORS[item.grade]}`}>
          새로운 장비!
        </p>

        {/* 이모지 + 이름 */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <motion.span
            className="text-5xl"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {item.emoji}
          </motion.span>
          <span className="text-base font-black text-white">{item.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${GRADE_COLORS[item.grade]}`}>
              {GRADE_LABELS[item.grade]}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {SLOT_LABELS[item.slot]?.label}
            </span>
          </div>
        </div>

        {/* 스탯 카드 */}
        <div className={`rounded-xl border p-3 mb-4 ${GRADE_BG_COLORS[item.grade]}`}>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(equipment.bonus).map(([k, v]) =>
              v ? (
                <span
                  key={k}
                  className={`text-xs font-mono ${
                    STAT_LABELS[k as keyof typeof STAT_LABELS]?.color ?? "text-gray-400"
                  }`}
                >
                  {STAT_LABELS[k as keyof typeof STAT_LABELS]?.label ?? k} +{v}
                </span>
              ) : null
            )}
          </div>
        </div>

        {/* 현재 장비 비교 */}
        {currentEquipped && (
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-mono">
                현재 {SLOT_LABELS[item.slot]?.label}: {currentEquipped.name}
                {currentEquipped.enhanceLevel > 0 && ` +${currentEquipped.enhanceLevel}`}
              </span>
            </div>
            {diffs.map((d) => (
              <div key={d.stat} className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className={STAT_LABELS[d.stat]?.color ?? "text-gray-400"}>
                  {STAT_LABELS[d.stat]?.label}
                </span>
                <span className="text-gray-500">{d.current}</span>
                <span className="text-gray-600">→</span>
                <span className="text-white">{d.incoming}</span>
                <span className={d.diff > 0 ? "text-green-400" : d.diff < 0 ? "text-red-400" : "text-gray-500"}>
                  ({d.diff > 0 ? "+" : ""}{d.diff})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 강화 경고 */}
        {currentEquipped && currentEquipped.enhanceLevel > 0 && (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-[10px] text-amber-400 font-mono">
              현재 장비가 +{currentEquipped.enhanceLevel} 강화 상태입니다. 교체 시 초기화됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onEquip}
          className="flex-1 py-2.5 px-6 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98] transition-all"
        >
          장착하기
        </button>
        <button
          onClick={onKeep}
          className="flex-1 py-2.5 px-6 rounded-xl text-sm bg-white/10 hover:bg-white/15 text-gray-300 active:scale-[0.98] transition-all"
        >
          보관하기
        </button>
      </div>
    </div>
  );
}
