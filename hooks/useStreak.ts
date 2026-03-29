"use client";

import { useState, useEffect } from "react";
import { getKSTDateString } from "@/lib/kstDate";
import { grantExp } from "@/lib/rpgExp";

const STORAGE_KEY = "ovision_streak";

interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastVisitDate: string;
}

function loadStreak(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, maxStreak: 0, lastVisitDate: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { currentStreak: 0, maxStreak: 0, lastVisitDate: "" };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    maxStreak: 0,
    lastVisitDate: "",
  });

  useEffect(() => {
    const today = getKSTDateString();
    const saved = loadStreak();

    if (saved.lastVisitDate === today) {
      // 오늘 이미 방문함
      setStreak(saved);
      return;
    }

    // 어제 방문했는지 확인
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKSTDateString(yesterday);

    let newStreak: StreakData;
    if (saved.lastVisitDate === yesterdayStr) {
      // 연속 방문
      const current = saved.currentStreak + 1;
      newStreak = {
        currentStreak: current,
        maxStreak: Math.max(saved.maxStreak, current),
        lastVisitDate: today,
      };
    } else {
      // 연속 끊김 또는 첫 방문
      newStreak = {
        currentStreak: 1,
        maxStreak: Math.max(saved.maxStreak, 1),
        lastVisitDate: today,
      };
    }

    saveStreak(newStreak);
    setStreak(newStreak);
    grantExp("daily_login");
    window.dispatchEvent(new CustomEvent("ovision-daily-checkin"));
  }, []);

  return streak;
}
