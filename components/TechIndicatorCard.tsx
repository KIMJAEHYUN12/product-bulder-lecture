"use client";

import type { TechIndicators } from "@/types";

interface Props {
  indicators: TechIndicators;
}

function getRsiColor(rsi: number): string {
  if (rsi >= 70) return "text-red-500";
  if (rsi <= 30) return "text-blue-500";
  return "text-gray-400";
}

function getRsiLabel(rsi: number): string {
  if (rsi >= 80) return "극단적 과매수";
  if (rsi >= 70) return "과매수 구간";
  if (rsi <= 20) return "극단적 과매도";
  if (rsi <= 30) return "과매도 구간";
  if (rsi >= 50) return "매수 우위";
  return "매도 우위";
}

function getMaAlignment(ma5: number, ma20: number, ma60: number): { label: string; color: string } {
  if (ma5 > ma20 && ma20 > ma60) return { label: "정배열 (강세)", color: "text-red-500" };
  if (ma5 < ma20 && ma20 < ma60) return { label: "역배열 (약세)", color: "text-blue-500" };
  return { label: "혼합 (횡보)", color: "text-gray-400" };
}

export function TechIndicatorCard({ indicators }: Props) {
  const { rsi, macd, bb, ma5, ma20, ma60 } = indicators;
  const maInfo = getMaAlignment(ma5, ma20, ma60);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📊</span>
        <h3 className="text-sm font-black text-gray-900 dark:text-white">기술지표 요약</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* RSI */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">RSI(14)</span>
            <span className={`text-sm font-black ${getRsiColor(rsi)}`}>{rsi}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                rsi >= 70 ? "bg-red-500" : rsi <= 30 ? "bg-blue-500" : "bg-gray-400"
              }`}
              style={{ width: `${rsi}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-blue-400 font-mono">30</span>
            <span className={`text-[9px] font-mono ${getRsiColor(rsi)}`}>{getRsiLabel(rsi)}</span>
            <span className="text-[9px] text-red-400 font-mono">70</span>
          </div>
        </div>

        {/* MACD */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">MACD</span>
            <span className={`text-[10px] font-bold ${macd.trend === "bullish" ? "text-red-500" : "text-blue-500"}`}>
              {macd.trend === "bullish" ? "골든크로스" : "데드크로스"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 dark:text-gray-400">
            <span>MACD: {macd.macd}</span>
            <span>Signal: {macd.signal}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] text-gray-400 font-mono">히스토그램:</span>
            <span className={`text-[10px] font-bold ${macd.histogram > 0 ? "text-red-500" : "text-blue-500"}`}>
              {macd.histogram > 0 ? "+" : ""}{macd.histogram}
            </span>
          </div>
        </div>

        {/* 볼린저 밴드 */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">볼린저 밴드</span>
            <span className={`text-[10px] font-bold ${
              bb.position === "above" ? "text-red-500" : bb.position === "below" ? "text-blue-500" : "text-gray-400"
            }`}>
              {bb.position === "above" ? "상단 이탈" : bb.position === "below" ? "하단 이탈" : "밴드 내"}
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 space-y-0.5">
            <div className="flex justify-between">
              <span>상단</span><span className="text-red-400">{bb.upper.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>중간</span><span>{bb.middle.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>하단</span><span className="text-blue-400">{bb.lower.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 이동평균 배열 */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-mono">이동평균</span>
            <span className={`text-[10px] font-bold ${maInfo.color}`}>{maInfo.label}</span>
          </div>
          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-amber-400">MA5</span><span>{ma5.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">MA20</span><span>{ma20.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">MA60</span><span>{ma60.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
