"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAttendance, CYCLE_REWARDS } from "@/hooks/useAttendance";
import { grantExpDynamic } from "@/lib/rpgExp";

export function AttendanceCalendar() {
  const { data, checkIn, isMilestone } = useAttendance();
  const [rewardPopup, setRewardPopup] = useState<string | null>(null);
  const [milestoneShow, setMilestoneShow] = useState(false);

  // 마일스톤 표시
  useEffect(() => {
    if (isMilestone && data.checkedToday) {
      setMilestoneShow(true);
      const t = setTimeout(() => setMilestoneShow(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isMilestone, data.checkedToday]);

  function handleCheckIn() {
    const reward = checkIn();
    if (!reward) return;

    // 기본 출석 EXP(30)는 daily_login으로 이미 지급됨
    // 30 초과분만 attendance_bonus로 추가 지급
    const extraExp = reward.exp - 30;
    if (extraExp > 0) {
      grantExpDynamic(
        "attendance_bonus",
        extraExp,
        `출석 ${reward.day}일차 보너스`
      );
    }

    setRewardPopup(reward.label);
    setTimeout(() => setRewardPopup(null), 3000);
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">
            출석 체크
          </h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {data.totalDays}일 누적 출석
          </p>
        </div>
        {!data.checkedToday && (
          <button
            onClick={handleCheckIn}
            className="px-3 py-1.5 rounded-lg bg-kim-red text-white text-xs font-bold hover:bg-red-600 transition-colors"
          >
            출석하기
          </button>
        )}
        {data.checkedToday && (
          <span className="text-[10px] text-green-600 dark:text-green-400 font-mono font-bold">
            출석 완료
          </span>
        )}
      </div>

      {/* 7일 사이클 */}
      <div className="grid grid-cols-7 gap-1.5">
        {CYCLE_REWARDS.map((reward) => {
          const isCompleted = data.currentDay >= reward.day && data.checkedToday;
          const isPast =
            reward.day < data.currentDay ||
            (reward.day === data.currentDay && data.checkedToday);
          const isCurrent =
            reward.day === data.currentDay + 1 && !data.checkedToday;
          const isCurrentDone =
            reward.day === data.currentDay && data.checkedToday;

          return (
            <div
              key={reward.day}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border text-center transition-colors ${
                isCurrentDone
                  ? "border-green-500/50 bg-green-500/10"
                  : isCurrent
                  ? "border-kim-red/50 bg-kim-red/10"
                  : isPast
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <span className="text-[10px] font-mono text-gray-500">
                {reward.day}일
              </span>
              <div className="text-sm">
                {isPast || isCompleted ? (
                  <span className="text-green-500">&#10003;</span>
                ) : reward.stones ? (
                  <span>&#128142;</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-600">
                    &#9675;
                  </span>
                )}
              </div>
              <span className="text-[8px] font-mono text-gray-400 dark:text-gray-600 leading-tight">
                {reward.exp}
              </span>
            </div>
          );
        })}
      </div>

      {/* 보상 팝업 */}
      <AnimatePresence>
        {rewardPopup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 text-center text-xs font-mono text-kim-red font-bold bg-kim-red/10 rounded-lg py-2"
          >
            {rewardPopup}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 28일 마일스톤 */}
      <AnimatePresence>
        {milestoneShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mt-2 text-center text-xs font-mono text-amber-500 font-bold bg-amber-500/10 border border-amber-500/30 rounded-lg py-2"
          >
            28일 출석 마일스톤 달성!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
