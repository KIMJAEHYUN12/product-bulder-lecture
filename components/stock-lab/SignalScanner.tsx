"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SignalScanResponse } from "@/types";

type FilterType = "전체" | "5·20 교차" | "20·60 교차";

interface Props {
  signalData: SignalScanResponse | null;
  isLoading: boolean;
  onLoad: () => void;
  onSelectStock: (symbol: string, name: string) => void;
}

export function SignalScanner({ signalData, isLoading, onLoad, onSelectStock }: Props) {
  const [filter, setFilter] = useState<FilterType>("전체");

  useEffect(() => {
    if (!signalData && !isLoading) onLoad();
  }, [signalData, isLoading, onLoad]);

  const filtered = signalData?.results.filter((s) => {
    if (filter === "전체") return true;
    if (filter === "5·20 교차") return s.crossType === "5_20";
    return s.crossType === "20_60";
  }) || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 mt-2">골든크로스 스캔 중...</p>
        <p className="text-[10px] text-gray-600 mt-1">최대 30초 소요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">골든크로스 + 수급</span>
          {signalData && (
            <span className="text-[10px] text-gray-500">
              {signalData.totalScanned}종목 스캔 · {signalData.results.length}건
            </span>
          )}
        </div>
        <button
          onClick={onLoad}
          className="text-[10px] text-gray-500 hover:text-white transition-colors"
        >
          새로고침
        </button>
      </div>

      <div className="flex gap-1">
        {(["전체", "5·20 교차", "20·60 교차"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
              filter === f
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-gray-500 hover:text-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-500">감지된 신호 없음</p>
          <p className="text-[10px] text-gray-600 mt-1">골든크로스 + 외국인/기관 순매수 조건</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((s, i) => (
              <motion.button
                key={`${s.symbol}-${s.crossType}-${s.crossDate}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectStock(s.symbol, s.name)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{s.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {s.symbol.replace(/\.\w+$/, "")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-white">
                      {s.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        s.changePct >= 0 ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      s.crossType === "5_20"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {s.crossType === "5_20" ? "5/20 GC" : "20/60 GC"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {s.daysAfterCross === 0 ? "오늘" : `${s.daysAfterCross}일 전`}
                  </span>
                  {s.foreignPct > 0 && (
                    <span className="text-[10px] text-gray-500">
                      외인 {s.foreignPct.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] flex-wrap">
                  <span className={s.foreignNet > 0 ? "text-red-400" : "text-blue-400"}>
                    외국인 {s.foreignNet > 0 ? "+" : ""}
                    {s.foreignNet.toLocaleString()}
                  </span>
                  <span className={s.institutionNet > 0 ? "text-red-400" : "text-blue-400"}>
                    기관 {s.institutionNet > 0 ? "+" : ""}
                    {s.institutionNet.toLocaleString()}
                  </span>
                  <span className={s.individualNet < 0 ? "text-blue-400" : "text-red-400"}>
                    개인 {s.individualNet > 0 ? "+" : ""}
                    {s.individualNet.toLocaleString()}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-[9px] text-gray-600 text-center mt-2">
        투자 판단의 참고 자료이며 투자 권유가 아닙니다
      </p>
    </div>
  );
}
