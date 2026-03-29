"use client";

import { motion } from "framer-motion";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import type { RpgCharacter, RpgStats } from "@/types";

interface Props {
  character: RpgCharacter;
  totalStats: RpgStats;
  levelTitle: string;
  expNeeded: number;
}

export default function CharacterProfile({ character, totalStats, levelTitle, expNeeded }: Props) {
  const classInfo = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;
  const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
  const expPct = expNeeded > 0 ? Math.min((character.exp / expNeeded) * 100, 100) : 0;
  return (
    <div className="glass-card p-5 rounded-2xl">
      {/* 클래스 + 기본 정보 */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl"
        >
          {classInfo.emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">{levelTitle}</span>
            <span className="text-[10px] text-gray-500 font-mono">Lv.{character.level}</span>
          </div>
          <h3 className="text-base font-black text-white mt-0.5 truncate">{character.nickname}</h3>
          <p className="text-[10px] text-gray-400 font-mono">{classInfo.className} · {classInfo.subtitle}</p>
        </div>
      </div>

      {/* EXP 바 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-gray-400">EXP</span>
          <span className="text-gray-500">{character.exp} / {expNeeded}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${expPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>
      </div>

      {/* 전투력 + 투자석 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2.5 rounded-xl bg-white/5 text-center">
          <div className="text-[10px] text-gray-500 font-mono">전투력</div>
          <div className="text-sm font-black text-white mt-0.5">{combatPower}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 text-center">
          <div className="text-[10px] text-gray-500 font-mono">투자석</div>
          <div className="text-sm font-black text-amber-400 mt-0.5">{character.stones}</div>
        </div>
      </div>
    </div>
  );
}
