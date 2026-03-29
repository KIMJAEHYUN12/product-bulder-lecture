"use client";

import { useState, useEffect } from "react";
import { interpretForeignBuy, formatVolume } from "@/lib/portfolioInterpret";

interface Props {
  foreignNet: number;
  institutionNet: number;
  individualNet: number;
  foreignStreak: number;
  asOf?: string;
}

export function SupplyBar({ foreignNet, institutionNet, individualNet, foreignStreak, asOf }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const maxAbs = Math.max(
    Math.abs(foreignNet), Math.abs(institutionNet), Math.abs(individualNet), 1
  );

  const bars = [
    { label: "외국인", value: foreignNet, color: "bg-blue-500" },
    { label: "기관", value: institutionNet, color: "bg-amber-500" },
    { label: "개인", value: individualNet, color: "bg-gray-400" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>수급 동향 (30일)</span>
        <span className="text-[9px]">KIS{asOf ? ` · ${asOf}` : ""}</span>
      </div>

      {/* 중앙 기준 라벨 */}
      <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] px-12">
        <span>매도</span>
        <span>매수</span>
      </div>

      <div className="space-y-2">
        {bars.map(({ label, value, color }) => {
          const width = (Math.abs(value) / maxAbs) * 100;
          const isPositive = value >= 0;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] w-10 text-[var(--text-muted)]">{label}</span>
              <div className="flex-1 flex items-center">
                <div className="w-full h-[3px] rounded-full bg-[var(--bg-overlay)] relative">
                  <div
                    className={`absolute h-full rounded-full ${color} transition-all duration-700 ease-out ${isPositive ? "left-1/2" : "right-1/2"}`}
                    style={{ width: animated ? `${width * 50 / 100}%` : "0%" }}
                  />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2 bg-[var(--text-muted)] opacity-40" />
                </div>
              </div>
              <span className={`text-[10px] w-20 text-right font-medium ${
                value > 0 ? "text-red-400" : value < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
              }`}>
                {value > 0 ? "+" : ""}{formatVolume(value)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        {interpretForeignBuy(foreignNet, foreignStreak)}
      </p>
    </div>
  );
}
