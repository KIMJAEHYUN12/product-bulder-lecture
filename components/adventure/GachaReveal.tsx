"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GRADE_COLORS } from "@/lib/rpgConstants";
import type { GachaItem } from "@/lib/gachaPool";
import type { EquipmentGrade } from "@/types";

interface Props {
  items: GachaItem[];
  onComplete: () => void;
}

const GRADE_PRIORITY: Record<EquipmentGrade, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const FLASH_COLORS: Partial<Record<EquipmentGrade, string>> = {
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-amber-500",
};

const RING_HEX: Record<EquipmentGrade, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#a78bfa",
  legendary: "#fbbf24",
};

const GRADE_DURATION: Record<EquipmentGrade, number> = {
  common: 600,
  uncommon: 800,
  rare: 1200,
  epic: 1800,
  legendary: 2500,
};

export default function GachaReveal({ items, onComplete }: Props) {
  const completedRef = useRef(false);
  const safeComplete = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };
  const isMulti = items.length > 1;

  // 5연뽑: 등급순 정렬 (common → legendary)
  const sorted = useMemo(() => {
    if (!isMulti) return items;
    return [...items].sort((a, b) => GRADE_PRIORITY[a.grade] - GRADE_PRIORITY[b.grade]);
  }, [items, isMulti]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardPhase, setCardPhase] = useState<"wait" | "shake" | "flash" | "flip" | "done">("wait");

  const currentItem = sorted[currentIdx];
  const isLastCard = currentIdx === sorted.length - 1;
  const useFullAnimation = !isMulti || isLastCard;
  const grade = currentItem.grade;

  // 각 카드 연출 타이머
  useEffect(() => {
    if (!currentItem) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (!useFullAnimation) {
      // 간소화: flip만
      setCardPhase("flip");
      timers.push(setTimeout(() => {
        setCardPhase("done");
        timers.push(setTimeout(() => {
          if (currentIdx < sorted.length - 1) {
            setCurrentIdx((prev) => prev + 1);
            setCardPhase("wait");
          }
        }, 200));
      }, 500));
    } else {
      // 풀 연출
      let elapsed = 0;

      if (grade === "legendary") {
        setCardPhase("shake");
        timers.push(setTimeout(() => setCardPhase("flash"), 400));
        elapsed = 400;
      } else if (grade === "epic" || grade === "rare") {
        setCardPhase("flash");
      } else {
        setCardPhase("flip");
      }

      if (grade === "legendary" || grade === "epic" || grade === "rare") {
        timers.push(setTimeout(() => setCardPhase("flip"), elapsed + 300));
      }

      const totalDuration = GRADE_DURATION[grade];
      timers.push(setTimeout(() => {
        setCardPhase("done");
        timers.push(setTimeout(() => {
          if (currentIdx < sorted.length - 1) {
            setCurrentIdx((prev) => prev + 1);
            setCardPhase("wait");
          } else {
            safeComplete();
          }
        }, 300));
      }, totalDuration));
    }

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, currentItem, grade, useFullAnimation, sorted.length]);

  // 5연뽑 간소화 카드의 마지막 전 카드가 끝나면 다음으로 이동 처리는 위에서 함
  // 마지막 카드 연출 후 onComplete 호출도 위에서 함

  const showFlash = (cardPhase === "flash" || cardPhase === "flip" || cardPhase === "done") && FLASH_COLORS[grade] && useFullAnimation;
  const showRings = (cardPhase === "flip" || cardPhase === "done") && GRADE_PRIORITY[grade] >= 2 && useFullAnimation;
  const showParticles = (cardPhase === "flip" || cardPhase === "done") && GRADE_PRIORITY[grade] >= 3 && useFullAnimation;
  const particleCount = grade === "legendary" ? 12 : 8;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 멀티 진행 표시 */}
      {isMulti && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1.5">
          {sorted.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx < currentIdx ? "bg-white/30" : idx === currentIdx ? "bg-indigo-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      )}

      {/* 배경 flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key={`flash-${currentIdx}`}
            className={`fixed inset-0 ${FLASH_COLORS[grade]}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* 화면 shake 컨테이너 */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={
          cardPhase === "shake" && grade === "legendary"
            ? { x: [0, -4, 4, -4, 4, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.4 }}
      >
        {/* Ring pulse */}
        <AnimatePresence>
          {showRings && (
            <>
              {[0, 1].map((i) => (
                <motion.div
                  key={`ring-${currentIdx}-${i}`}
                  className="absolute w-32 h-44 rounded-2xl border-2 pointer-events-none"
                  style={{ borderColor: RING_HEX[grade] }}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.3, repeat: 1 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* 파티클 */}
        {showParticles && (
          <Particles count={particleCount} color={RING_HEX[grade]} />
        )}

        {/* 카드 */}
        <div className="relative" style={{ perspective: 600 }}>
          <motion.div
            key={`card-${currentIdx}`}
            className="w-32 h-44 relative"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotateY: 180 }}
            animate={{
              rotateY: cardPhase === "flip" || cardPhase === "done" ? 0 : 180,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* 앞면 */}
            <div
              className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center gap-2 backface-hidden ${gradeCardBg(grade)}`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <span className="text-4xl">{currentItem.emoji}</span>
              <span className="text-xs font-black text-white text-center px-2 leading-tight">
                {currentItem.name}
              </span>
              <span className={`text-[10px] font-mono ${GRADE_COLORS[grade]}`}>
                {gradeLabel(grade)}
              </span>
            </div>
            {/* 뒷면 */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-900 to-gray-900 border border-white/10 flex items-center justify-center backface-hidden"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="text-4xl text-white/20 font-black">?</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 탭해서 스킵 */}
      <button
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 font-mono"
        onClick={safeComplete}
      >
        탭해서 스킵
      </button>
    </motion.div>
  );
}

// ── 파티클 ──
function Particles({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (360 / count) * i + (Math.random() * 30 - 15);
      const distance = 60 + Math.random() * 40;
      const rad = (angle * Math.PI) / 180;
      return { x: Math.cos(rad) * distance, y: Math.sin(rad) * distance };
    });
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ backgroundColor: color }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ── 등급별 카드 배경 ──
function gradeCardBg(grade: EquipmentGrade): string {
  switch (grade) {
    case "common": return "border-gray-600 bg-gray-800";
    case "uncommon": return "border-green-600 bg-green-900/60";
    case "rare": return "border-blue-600 bg-blue-900/60";
    case "epic": return "border-purple-600 bg-purple-900/60";
    case "legendary": return "border-amber-500 bg-amber-900/60";
  }
}

function gradeLabel(grade: EquipmentGrade): string {
  const labels: Record<EquipmentGrade, string> = {
    common: "일반",
    uncommon: "고급",
    rare: "희귀",
    epic: "영웅",
    legendary: "전설",
  };
  return labels[grade];
}
