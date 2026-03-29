"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/Skeleton";
import { fetchTopRankings, fetchMyRank, deleteRanking, RankingEntry } from "@/lib/rankingApi";
import { isAdmin } from "@/lib/adminConfig";

interface RankingBoardProps {
  myUserId: string | null;
  refreshTrigger?: number;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtPnl(amount: number) {
  const man = amount / 10000;
  const abs = Math.abs(man);
  const str = abs >= 10000 ? `${(abs / 10000).toFixed(1)}억` : `${Math.round(abs)}만`;
  return amount >= 0 ? `+${str}` : `-${str}`;
}

function pnlColor(amount: number) {
  if (amount > 0) return "text-red-500 dark:text-red-400";
  if (amount < 0) return "text-blue-500 dark:text-blue-400";
  return "text-gray-500";
}

function deltaLabel(current: number, prev?: number) {
  if (prev === undefined) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.005) return null;
  const arrow = diff > 0 ? "\u25B2" : "\u25BC";
  const color = diff > 0 ? "text-red-400" : "text-blue-400";
  return { text: `${arrow}${Math.abs(diff).toFixed(1)}%p`, color };
}

const MEDALS = ["🥇", "🥈", "🥉"];
const BOT_META: Record<string, { emoji: string; label: string }> = {
  bot_signal: { emoji: "📡", label: "시그널봇" },
  bot_gold: { emoji: "✨", label: "골드봇" },
  bot_ant: { emoji: "🐜", label: "개미봇" },
};
const INITIAL_VISIBLE = 10;
const LOAD_MORE_STEP = 50;

function RankingRow({
  entry,
  rank,
  isMe,
  canDelete,
  onDelete,
}: {
  entry: RankingEntry;
  rank: number;
  isMe: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const returnPct = entry.returnPct ?? 0;
  const pnl = entry.pnlAmount ?? Math.round(entry.totalAsset - 10_000_000);
  const delta = deltaLabel(returnPct, entry.prevReturnPct);
  const holdingExtra = (entry.holdingCount ?? 0) > 1 ? ` 외 ${(entry.holdingCount ?? 0) - 1}` : "";
  const holdingText = entry.topHolding ? `${entry.topHolding}${holdingExtra}` : "";

  return (
    <div
      className={`group px-2 py-2 rounded-lg transition-colors ${
        isMe
          ? "bg-kim-red/10 border border-kim-red/30"
          : "hover:bg-gray-50 dark:hover:bg-white/5"
      }`}
    >
      <div className="grid grid-cols-12 items-center text-xs font-mono">
        <span className="col-span-1 text-gray-500">
          {rank <= 3 ? MEDALS[rank - 1] : `${rank}`}
        </span>
        <div className="col-span-5 min-w-0">
          <div className={`truncate font-semibold ${isMe ? "text-kim-red" : "text-gray-900 dark:text-white"}`}>
            {entry.nickname?.trim() || "익명"}
            {isMe && <span className="ml-1 text-[10px] text-kim-red/70">나</span>}
            {entry.userId.startsWith("bot_") && (
              <span className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded font-mono">AI</span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 font-mono truncate flex items-center gap-1">
            {entry.investorType && <span>{entry.investorType}</span>}
            {entry.investorType && holdingText && <span>·</span>}
            {holdingText && <span>{holdingText}</span>}
          </div>
        </div>
        <div className="col-span-3 text-right">
          <span
            className={`font-bold ${
              returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
            }`}
          >
            {returnPct > 0 ? "+" : ""}
            {returnPct.toFixed(2)}%
          </span>
          {delta && (
            <div className={`text-[10px] ${delta.color}`}>{delta.text}</div>
          )}
        </div>
        <div className="col-span-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className={`font-bold ${pnl === 0 ? "text-gray-500" : pnlColor(pnl)}`}>
              {fmtPnl(pnl)}
            </span>
            {canDelete && (
              <button
                onClick={onDelete}
                className="hidden group-hover:inline-block text-[10px] text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                title="삭제 (관리자)"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[10px] text-gray-500">
            {fmt(Math.round(entry.totalAsset / 10000))}만
          </div>
        </div>
      </div>
      {entry.strategy && (
        <div className="mt-0.5 ml-6 text-xs text-gray-500 font-mono truncate">
          💬 &ldquo;{entry.strategy}&rdquo;
        </div>
      )}
    </div>
  );
}

export function RankingBoard({ myUserId, refreshTrigger }: RankingBoardProps) {
  const [allRankings, setAllRankings] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; entry: RankingEntry } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchTopRankings(200);
      const filtered = data.filter(
        (e) => e.nickname?.trim() || e.userId.startsWith("bot_") || Math.abs(e.returnPct ?? 0) > 0.001
      );
      setAllRankings(filtered);

      if (myUserId) {
        const inList = filtered.findIndex((e) => e.userId === myUserId);
        if (inList >= 0) {
          setMyRank({ rank: inList + 1, entry: filtered[inList] });
        } else {
          const my = await fetchMyRank(myUserId).catch(() => null);
          setMyRank(my);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  useEffect(() => { load().catch(() => {}); }, [load, refreshTrigger]);

  // 봇 엔트리 + 순위 (allRankings에서 추출)
  const botEntries = useMemo(() => {
    return allRankings
      .map((e, i) => ({ entry: e, rank: i + 1 }))
      .filter(({ entry }) => entry.userId.startsWith("bot_"));
  }, [allRankings]);

  // 검색 필터링
  const displayRankings = useMemo(() => {
    if (!searchMode || !searchTerm.trim()) return allRankings;
    const term = searchTerm.trim().toLowerCase();
    return allRankings.filter(
      (e) =>
        (e.nickname?.toLowerCase().includes(term)) ||
        (e.userId.startsWith("bot_") && BOT_META[e.userId]?.label.toLowerCase().includes(term))
    );
  }, [allRankings, searchMode, searchTerm]);

  // 표시할 랭킹 (검색 중이면 전부, 아니면 visibleCount만큼)
  const visibleRankings = useMemo(() => {
    if (searchMode && searchTerm.trim()) return displayRankings;
    return displayRankings.slice(0, visibleCount);
  }, [displayRankings, visibleCount, searchMode, searchTerm]);

  const hasMore = !searchMode && visibleCount < allRankings.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, allRankings.length));
  };

  const handleDelete = async (entry: RankingEntry) => {
    if (!confirm(`${entry.nickname} 랭킹을 삭제하시겠습니까?`)) return;
    try {
      await deleteRanking(entry.userId);
      load().catch(() => {});
    } catch { /* ignore */ }
  };

  // 내 순위가 현재 표시 목록에 있는지
  const meInVisible = visibleRankings.some((r) => r.userId === myUserId);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">🏆 수익률 랭킹</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            TOP {allRankings.length} · 실시간
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSearchMode((v) => !v);
              if (searchMode) setSearchTerm("");
            }}
            className={`text-[10px] font-mono border px-2 py-1 rounded transition-colors ${
              searchMode
                ? "text-kim-red border-kim-red/30 bg-kim-red/10"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30"
            }`}
          >
            🔍
          </button>
          <button
            onClick={() => load().catch(() => {})}
            disabled={loading}
            className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-mono border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 검색 입력 */}
      {searchMode && (
        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="닉네임 검색..."
            autoFocus
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-kim-red/50 focus:ring-1 focus:ring-kim-red/20"
          />
          {searchTerm.trim() && (
            <p className="text-[10px] text-gray-400 font-mono mt-1">
              {displayRankings.length}명 검색됨
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          랭킹을 불러오지 못했습니다
        </div>
      ) : allRankings.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 등록된 참가자가 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* 섹션 A: AI 봇 고정 영역 */}
          {!searchMode && botEntries.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-indigo-400 font-mono font-bold mb-1.5 px-2 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                AI 투자봇
              </div>
              <div className="border border-indigo-500/20 rounded-lg bg-indigo-500/5 divide-y divide-indigo-500/10">
                {botEntries.map(({ entry, rank }) => {
                  const meta = BOT_META[entry.userId];
                  const returnPct = entry.returnPct ?? 0;
                  const pnl = entry.pnlAmount ?? Math.round(entry.totalAsset - 10_000_000);
                  return (
                    <div key={entry.userId} className="px-3 py-2">
                      <div className="grid grid-cols-12 items-center text-xs font-mono">
                        <span className="col-span-1 text-gray-500">{rank}</span>
                        <div className="col-span-5 min-w-0">
                          <div className="truncate font-semibold text-gray-900 dark:text-white">
                            {meta?.emoji} {meta?.label || entry.nickname}
                            <span className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded">AI</span>
                          </div>
                        </div>
                        <div className="col-span-3 text-right">
                          <span
                            className={`font-bold ${
                              returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
                            }`}
                          >
                            {returnPct > 0 ? "+" : ""}
                            {returnPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className={`font-bold ${pnl === 0 ? "text-gray-500" : pnlColor(pnl)}`}>
                            {fmtPnl(pnl)}
                          </span>
                          <div className="text-[10px] text-gray-500">
                            {fmt(Math.round(entry.totalAsset / 10000))}만
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 섹션 B: 수익률 랭킹 테이블 헤더 */}
          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-2 pb-1 border-b border-gray-200 dark:border-white/10">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">수익률</span>
            <span className="col-span-3 text-right">평가손익</span>
          </div>

          {/* 랭킹 행 */}
          {visibleRankings.map((entry) => {
            const rank = allRankings.indexOf(entry) + 1;
            const isMe = entry.userId === myUserId;
            const canDelete = isAdmin(myUserId) && !isMe;
            return (
              <RankingRow
                key={entry.userId}
                entry={entry}
                rank={rank}
                isMe={isMe}
                canDelete={canDelete}
                onDelete={() => handleDelete(entry)}
              />
            );
          })}

          {/* 더보기 버튼 */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="mt-2 w-full text-[11px] font-mono text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 py-2 rounded-lg transition-colors"
            >
              더보기 ({visibleCount}/{allRankings.length})
            </button>
          )}

          {/* 내 순위 — 현재 목록에 없을 때만 */}
          {myRank && !meInVisible && (() => {
            const me = myRank.entry;
            const myReturnPct = me.returnPct ?? 0;
            const myPnl = me.pnlAmount ?? Math.round(me.totalAsset - 10_000_000);
            const myDelta = deltaLabel(myReturnPct, me.prevReturnPct);
            const myHoldingExtra = (me.holdingCount ?? 0) > 1 ? ` 외 ${(me.holdingCount ?? 0) - 1}` : "";
            const myHoldingText = me.topHolding ? `${me.topHolding}${myHoldingExtra}` : "";
            return (
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
                      {me.nickname}
                      <span className="ml-1 text-[10px] text-kim-red/70">나</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono truncate flex items-center gap-1">
                      {me.investorType && <span>{me.investorType}</span>}
                      {me.investorType && myHoldingText && <span>·</span>}
                      {myHoldingText && <span>{myHoldingText}</span>}
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`font-bold ${
                      myReturnPct > 0 ? "text-red-500 dark:text-red-400"
                      : myReturnPct < 0 ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-500"
                    }`}>
                      {myReturnPct > 0 ? "+" : ""}
                      {myReturnPct.toFixed(2)}%
                    </span>
                    {myDelta && (
                      <div className={`text-[10px] ${myDelta.color}`}>{myDelta.text}</div>
                    )}
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`font-bold ${myPnl === 0 ? "text-gray-500" : pnlColor(myPnl)}`}>
                      {fmtPnl(myPnl)}
                    </span>
                    <div className="text-[10px] text-gray-500">
                      {fmt(Math.round(me.totalAsset / 10000))}만
                    </div>
                  </div>
                </div>
              </div>
            </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
