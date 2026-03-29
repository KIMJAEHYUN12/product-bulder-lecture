"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { fetchUserPortfolio, type UserPortfolioData } from "@/lib/rankingApi";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

type Tab = "holdings" | "trades";

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [data, setData] = useState<UserPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("holdings");

  useEffect(() => {
    setLoading(true);
    fetchUserPortfolio(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

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
            포트폴리오를 불러올 수 없습니다
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="p-5 pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-3">
                {data.nickname}
              </h3>

              {/* 성과 요약 */}
              <div className="grid grid-cols-3 gap-2">
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
                    {Object.keys(data.holdings).length}
                  </div>
                </div>
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
                거래내역 ({data.history.length})
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
                data.history.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">
                    거래 내역이 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...data.history].reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium ${
                              h.type === "buy"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-blue-500/10 text-blue-400"
                            }`}
                          >
                            {h.type === "buy" ? "매수" : "매도"}
                          </span>
                          <span className="text-[var(--text-secondary)]">{h.name}</span>
                        </div>
                        <div className="text-right text-[var(--text-muted)]">
                          <span>{h.qty}주 @ {fmt(h.price)}</span>
                          <span className="ml-2">{h.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
