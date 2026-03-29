"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RPG_CLASSES } from "@/lib/rpgConstants";
import { INVESTOR_TYPES, type InvestorTypeKey } from "@/lib/investorQuiz";
import type { RpgClassKey } from "@/types";

interface Props {
  onComplete: (classKey: RpgClassKey, nickname: string) => void;
  recommendedClass?: InvestorTypeKey | null;
  isLoggedIn: boolean;
}

const CLASS_KEYS: RpgClassKey[] = [
  "visionary", "dealmaker", "sage", "strategist",
  "hunter", "observer", "contrarian", "explorer",
];

export default function CharacterCreation({ onComplete, recommendedClass, isLoggedIn }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClass, setSelectedClass] = useState<RpgClassKey | null>(null);
  const [nickname, setNickname] = useState("");

  const handleClassSelect = (key: RpgClassKey) => {
    setSelectedClass(key);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!selectedClass) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) return;
    onComplete(selectedClass, trimmed);
  };

  return (
    <div className="glass-card p-5 rounded-2xl">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-lg font-black text-white mb-1">클래스를 선택하세요</h2>
            <p className="text-xs text-gray-400 font-mono mb-4">투자 스타일에 맞는 RPG 클래스를 골라보세요</p>

            {recommendedClass && (
              <div className="mb-4 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                <p className="text-xs text-indigo-300 font-mono">
                  투자성향 테스트 결과 추천: <span className="font-bold text-indigo-200">{RPG_CLASSES[recommendedClass]?.emoji} {RPG_CLASSES[recommendedClass]?.className}</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {CLASS_KEYS.map((key, i) => {
                const cls = RPG_CLASSES[key];
                const isRecommended = key === recommendedClass;
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleClassSelect(key)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isRecommended
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-mono">추천</span>
                    )}
                    <div className="text-2xl mb-1">{cls.emoji}</div>
                    <div className="text-sm font-bold text-white">{cls.className}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cls.subtitle}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {INVESTOR_TYPES[key].character}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <button
              onClick={() => setStep(1)}
              className="text-xs text-gray-400 hover:text-white transition-colors font-mono mb-3"
            >
              ← 클래스 다시 선택
            </button>

            {selectedClass && (
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-3xl">{RPG_CLASSES[selectedClass]?.emoji}</span>
                <div>
                  <div className="text-sm font-bold text-white">{RPG_CLASSES[selectedClass]?.className}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{RPG_CLASSES[selectedClass]?.subtitle}</div>
                </div>
              </div>
            )}

            <h2 className="text-lg font-black text-white mb-1">닉네임을 입력하세요</h2>
            <p className="text-xs text-gray-400 font-mono mb-4">2~12자, 투자 모험에서 사용할 이름입니다</p>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="닉네임 입력..."
              maxLength={12}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none text-sm font-mono"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-500 font-mono">{nickname.trim().length}/12</span>
              {!isLoggedIn && (
                <span className="text-[10px] text-amber-400/80 font-mono">Google 로그인하면 데이터가 저장됩니다</span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={nickname.trim().length < 2}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm transition-colors"
            >
              모험 시작
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
