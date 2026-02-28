"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchTopRankings, fetchMyRank, deleteRanking, RankingEntry } from "@/lib/rankingApi";
import { isAdmin } from "@/lib/adminConfig";

interface RankingBoardProps {
  myUserId: string | null;
  refreshTrigger?: number;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function RankingBoard({ myUserId, refreshTrigger }: RankingBoardProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; entry: RankingEntry } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchTopRankings(20);
      setRankings(data);
      if (myUserId) {
        const my = await fetchMyRank(myUserId).catch(() => null);
        setMyRank(my);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  useEffect(() => { load().catch(() => {}); }, [load, refreshTrigger]);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">🏆 수익률 랭킹</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">TOP 20 · 실시간</p>
        </div>
        <button
          onClick={() => load().catch(() => {})}
          disabled={loading}
          className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-mono border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          랭킹을 불러오지 못했습니다
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 등록된 참가자가 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* 헤더 */}
          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-2 pb-1 border-b border-gray-200 dark:border-white/10">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">수익률</span>
            <span className="col-span-3 text-right">총자산</span>
          </div>

          {rankings.map((entry, i) => {
            const isMe = entry.userId === myUserId;
            const returnPct = entry.returnPct ?? 0;
            const canDelete = isAdmin(myUserId) && !isMe;

            return (
              <div
                key={entry.userId}
                className={`group px-2 py-2 rounded-lg transition-colors ${
                  isMe
                    ? "bg-kim-red/10 border border-kim-red/30"
                    : "hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  {/* 순위 */}
                  <span className="col-span-1 text-gray-500">
                    {i < 3 ? MEDALS[i] : `${i + 1}`}
                  </span>

                  {/* 닉네임 */}
                  <div className="col-span-5 min-w-0">
                    <div className={`truncate font-semibold ${isMe ? "text-kim-red" : "text-gray-900 dark:text-white"}`}>
                      {entry.nickname}
                      {isMe && <span className="ml-1 text-[9px] text-kim-red/70">나</span>}
                    </div>
                    {entry.investorType && (
                      <div className="text-[9px] text-gray-400 font-mono truncate">
                        {entry.investorType}
                      </div>
                    )}
                  </div>

                  {/* 수익률 */}
                  <span
                    className={`col-span-3 text-right font-bold ${
                      returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
                    }`}
                  >
                    {returnPct > 0 ? "+" : ""}
                    {returnPct.toFixed(2)}%
                  </span>

                  {/* 총자산 + 관리자 삭제 */}
                  <div className="col-span-3 flex items-center justify-end gap-1">
                    <span className="text-gray-500">
                      {fmt(Math.round(entry.totalAsset / 10000))}만
                    </span>
                    {canDelete && (
                      <button
                        onClick={async () => {
                          if (!confirm(`${entry.nickname} 랭킹을 삭제하시겠습니까?`)) return;
                          try {
                            await deleteRanking(entry.userId);
                            load().catch(() => {});
                          } catch { /* ignore */ }
                        }}
                        className="hidden group-hover:inline-block text-[9px] text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                        title="삭제 (관리자)"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 한줄 전략 */}
                {entry.strategy && (
                  <div className="mt-0.5 ml-6 text-[11px] text-gray-500 font-mono truncate">
                    💬 &ldquo;{entry.strategy}&rdquo;
                  </div>
                )}
              </div>
            );
          })}

          {/* 내 순위 — TOP 20 밖일 때만 표시 */}
          {myRank && !rankings.some(r => r.userId === myUserId) && (
            <>
              <div className="flex items-center gap-2 py-1 px-2">
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
                <span className="text-[10px] text-gray-400 font-mono shrink-0">내 순위</span>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
              </div>
              <div className="px-2 py-2 rounded-lg bg-kim-red/10 border border-kim-red/30">
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">{myRank.rank}</span>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate font-semibold text-kim-red">
                      {myRank.entry.nickname}
                      <span className="ml-1 text-[9px] text-kim-red/70">나</span>
                    </div>
                    {myRank.entry.investorType && (
                      <div className="text-[9px] text-gray-400 font-mono truncate">
                        {myRank.entry.investorType}
                      </div>
                    )}
                  </div>
                  <span className={`col-span-3 text-right font-bold ${
                    (myRank.entry.returnPct ?? 0) > 0 ? "text-red-500 dark:text-red-400"
                    : (myRank.entry.returnPct ?? 0) < 0 ? "text-blue-500 dark:text-blue-400"
                    : "text-gray-500"
                  }`}>
                    {(myRank.entry.returnPct ?? 0) > 0 ? "+" : ""}
                    {(myRank.entry.returnPct ?? 0).toFixed(2)}%
                  </span>
                  <span className="col-span-3 text-right text-gray-500">
                    {fmt(Math.round(myRank.entry.totalAsset / 10000))}만
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
