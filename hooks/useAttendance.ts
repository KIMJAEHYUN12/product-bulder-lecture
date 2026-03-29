"use client";

import { useState, useEffect, useCallback } from "react";
import { getKSTDateString } from "@/lib/kstDate";
import type { AttendanceData, DayReward } from "@/types/social";

const STORAGE_KEY = "ovision_attendance";

// 7일 사이클 보상 테이블
export const CYCLE_REWARDS: DayReward[] = [
  { day: 1, exp: 30, label: "30 EXP" },
  { day: 2, exp: 40, label: "40 EXP" },
  { day: 3, exp: 50, stones: 1, label: "50 EXP + 1 투자석" },
  { day: 4, exp: 30, label: "30 EXP" },
  { day: 5, exp: 40, label: "40 EXP" },
  { day: 6, exp: 50, stones: 1, label: "50 EXP + 1 투자석" },
  { day: 7, exp: 100, label: "100 EXP (사이클 완료!)" },
];

function loadAttendance(): AttendanceData {
  if (typeof window === "undefined") {
    return {
      currentDay: 0,
      lastCheckIn: "",
      totalDays: 0,
      checkedToday: false,
      history: [],
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    currentDay: 0,
    lastCheckIn: "",
    totalDays: 0,
    checkedToday: false,
    history: [],
  };
}

function saveAttendance(data: AttendanceData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getKSTDateString(yesterday) === dateStr;
}

export function useAttendance() {
  const [data, setData] = useState<AttendanceData>(loadAttendance);

  // 날짜 변경 시 checkedToday 리셋
  useEffect(() => {
    const today = getKSTDateString();
    const saved = loadAttendance();
    if (saved.lastCheckIn === today) {
      saved.checkedToday = true;
    } else {
      saved.checkedToday = false;
    }
    setData(saved);
  }, []);

  // ovision-daily-checkin 이벤트 수신
  useEffect(() => {
    function handleCheckIn() {
      checkIn();
    }
    window.addEventListener("ovision-daily-checkin", handleCheckIn);
    return () =>
      window.removeEventListener("ovision-daily-checkin", handleCheckIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIn = useCallback((): DayReward | null => {
    const today = getKSTDateString();
    const current = loadAttendance();

    // 이미 오늘 체크인 완료
    if (current.lastCheckIn === today) return null;

    // 연속 여부 판단
    let nextDay: number;
    if (isYesterday(current.lastCheckIn)) {
      // 연속 출석
      nextDay = current.currentDay >= 7 ? 1 : current.currentDay + 1;
    } else {
      // 끊김 → 1일차 리셋
      nextDay = 1;
    }

    const reward = CYCLE_REWARDS[nextDay - 1];
    const history = [...current.history, today].slice(-7);

    const updated: AttendanceData = {
      currentDay: nextDay,
      lastCheckIn: today,
      totalDays: current.totalDays + 1,
      checkedToday: true,
      history,
    };
    saveAttendance(updated);
    setData(updated);

    return reward;
  }, []);

  const isMilestone = data.totalDays > 0 && data.totalDays % 28 === 0;

  return {
    data,
    checkIn,
    rewards: CYCLE_REWARDS,
    isMilestone,
  };
}
