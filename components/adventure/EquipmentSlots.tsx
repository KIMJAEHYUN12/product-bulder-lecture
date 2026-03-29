"use client";

import { motion } from "framer-motion";
import { SLOT_LABELS, GRADE_COLORS, GRADE_BG_COLORS, GRADE_LABELS } from "@/lib/rpgConstants";
import type { EquipmentSlotKey, EquipmentItem } from "@/types";

interface Props {
  equipment?: Record<EquipmentSlotKey, EquipmentItem | null> | null;
}

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

export default function EquipmentSlots({ equipment }: Props) {
  if (!equipment) return null;
  return (
    <div className="glass-card p-5 rounded-2xl">
      <h3 className="text-sm font-black text-white mb-3">장비</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {SLOTS.map((slot, i) => {
          const item = equipment[slot];
          const slotInfo = SLOT_LABELS[slot];

          return (
            <motion.div
              key={slot}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`p-3 rounded-xl border ${
                item ? GRADE_BG_COLORS[item.grade] : "border-white/10 bg-white/5"
              }`}
            >
              {item ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.name}</div>
                      <div className={`text-[10px] font-mono ${GRADE_COLORS[item.grade]}`}>
                        {GRADE_LABELS[item.grade]}
                        {item.enhanceLevel > 0 && ` +${item.enhanceLevel}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {Object.entries(item.bonus).map(([k, v]) => (
                      v ? <span key={k} className="mr-1.5">{k === "attack" ? "공" : k === "defense" ? "방" : k === "intelligence" ? "지" : k === "stamina" ? "체" : "운"}+{v}</span> : null
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-gray-600">
                  <span className="text-lg">{slotInfo.emoji}</span>
                  <span className="text-[10px] font-mono mt-1">{slotInfo.label} · 비어있음</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
