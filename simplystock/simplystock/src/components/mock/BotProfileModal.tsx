"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { fetchBotData } from "@/lib/rankingApi";
import { BotBadge } from "./BotBadge";
import { BotTradeLog } from "./BotTradeLog";
import { BotReturnChart } from "./BotReturnChart";
import type { BotFullData } from "@/types";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

interface BotProfileModalProps {
  botId: string;
  onClose: () => void;
}

type Tab = "holdings" | "trades";

export function BotProfileModal({ botId, onClose }: BotProfileModalProps) {
  const [data, setData] = useState<BotFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("holdings");

  useEffect(() => {
    setLoading(true);
    fetchBotData(botId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [botId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[85vh] rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : !data ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            봇 데이터를 불러올 수 없습니다
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="p-5 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{data.profile.emoji}</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {data.profile.nickname}
                </h3>
                <BotBadge botType={data.profile.botType} />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {data.profile.description}
              </p>

              {/* 성과 요약 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-[var(--bg-overlay)] p-2 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">총자산</div>
                  <div className="text-xs font-bold">{fmt(data.totalAsset / 10000)}만</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-overlay)] p-2 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">수익률</div>
                  <div
                    className={`text-xs font-bold ${
                      data.returnPct > 0
                        ? "text-red-400"
                        : data.returnPct < 0
                          ? "text-blue-400"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {data.returnPct > 0 ? "+" : ""}{data.returnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--bg-overlay)] p-2 text-center">
                  <div className="text-[10px] text-[var(--text-muted)]">보유종목</div>
                  <div className="text-xs font-bold">
                    {Object.keys(data.holdings).length}/{data.profile.maxPositions}
                  </div>
                </div>
              </div>

              {/* 수익률 차트 */}
              <BotReturnChart snapshots={data.dailySnapshots} color={data.profile.color} />

              {/* 전략 설명 */}
              <div className="mt-3 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)] px-3 py-2">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">전략</div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {data.profile.strategyDetail}
                </p>
              </div>
            </div>

            {/* 탭 */}
            <div className="flex border-t border-[var(--border-primary)]">
              <button
                type="button"
                onClick={() => setTab("holdings")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === "holdings"
                    ? "text-[var(--text-primary)] border-b-2 border-indigo-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                보유종목 ({Object.keys(data.holdings).length})
              </button>
              <button
                type="button"
                onClick={() => setTab("trades")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === "trades"
                    ? "text-[var(--text-primary)] border-b-2 border-indigo-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                매매일지 ({data.recentTrades.length})
              </button>
            </div>

            {/* 탭 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === "holdings" ? (
                Object.keys(data.holdings).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">
                    보유 종목이 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(data.holdings).map(([symbol, h]) => {
                      const pnl = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
                      return (
                        <div
                          key={symbol}
                          className="flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-medium text-xs">{h.name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-1">
                              {h.qty}주
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-[var(--text-muted)]">
                              평균 {fmt(h.avgPrice)}
                            </div>
                            <div
                              className={`text-[10px] font-medium ${
                                pnl >= 0 ? "text-red-400" : "text-blue-400"
                              }`}
                            >
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <BotTradeLog trades={data.recentTrades} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
