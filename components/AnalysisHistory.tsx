"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalysisHistoryItem } from "@/types";

const STORAGE_KEY = "ovision_bitgak_history";
const MAX_ITEMS = 10;

function loadHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: AnalysisHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // storage full
  }
}

export function addToHistory(item: AnalysisHistoryItem) {
  const prev = loadHistory().filter((h) => !(h.symbol === item.symbol && h.date === item.date));
  saveHistory([item, ...prev]);
}

interface Props {
  onSelect: (stock: { symbol: string; name: string }) => void;
}

export function AnalysisHistory({ onSelect }: Props) {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());

    const handler = () => setHistory(loadHistory());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const refresh = useCallback(() => setHistory(loadHistory()), []);

  // 외부에서 addToHistory 호출 후 새로고침할 수 있도록
  useEffect(() => {
    const id = window.setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">분석 히스토리</h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-gray-400 hover:text-red-400 font-mono transition-colors"
          >
            전체 삭제
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-gray-400 font-mono py-2">분석 기록이 없습니다</p>
      ) : (
        <div className="space-y-1">
          {history.map((h, i) => (
            <button
              key={`${h.symbol}-${h.date}-${i}`}
              onClick={() => onSelect({ symbol: h.symbol, name: h.name })}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate max-w-[100px]">
                    {h.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                    h.channelDir === "상승" ? "bg-red-500/10 text-red-500"
                    : h.channelDir === "하락" ? "bg-blue-500/10 text-blue-500"
                    : "bg-gray-500/10 text-gray-400"
                  }`}>
                    {h.channelDir}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 font-mono">{h.date}</span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold ${
                  h.rsi >= 70 ? "text-red-500" : h.rsi <= 30 ? "text-blue-500" : "text-gray-400"
                }`}>
                  RSI {h.rsi}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
