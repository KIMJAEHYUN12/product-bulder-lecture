"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchTopRankings,
  fetchMyRank,
  isBotUser,
  getBotType,
  getBotEmoji,
  type RankingEntry,
} from "@/lib/rankingApi";
import { BotBadge } from "./BotBadge";

interface RankingBoardProps {
  myUserId: string | null;
  refreshTrigger?: number;
  onBotClick?: (botId: string) => void;
  onUserClick?: (userId: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const INITIAL_VISIBLE = 10;
const LOAD_MORE_STEP = 50;

export function RankingBoard({ myUserId, refreshTrigger, onBotClick, onUserClick }: RankingBoardProps) {
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
      setAllRankings(data);

      if (myUserId) {
        const inList = data.findIndex((e) => e.userId === myUserId);
        if (inList >= 0) {
          setMyRank({ rank: inList + 1, entry: data[inList] });
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

  useEffect(() => {
    load().catch(() => {});
  }, [load, refreshTrigger]);

  // 봇 엔트리 + 순위
  const botEntries = useMemo(() => {
    return allRankings
      .map((e, i) => ({ entry: e, rank: i + 1 }))
      .filter(({ entry }) => isBotUser(entry.userId));
  }, [allRankings]);

  // 검색 필터링
  const displayRankings = useMemo(() => {
    if (!searchMode || !searchTerm.trim()) return allRankings;
    const term = searchTerm.trim().toLowerCase();
    return allRankings.filter(
      (e) => e.nickname?.toLowerCase().includes(term)
    );
  }, [allRankings, searchMode, searchTerm]);

  // 표시할 랭킹
  const visibleRankings = useMemo(() => {
    if (searchMode && searchTerm.trim()) return displayRankings;
    return displayRankings.slice(0, visibleCount);
  }, [displayRankings, visibleCount, searchMode, searchTerm]);

  const hasMore = !searchMode && visibleCount < allRankings.length;
  const meInVisible = visibleRankings.some((r) => r.userId === myUserId);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            수익률 랭킹
          </h2>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
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
                ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--text-muted)]"
            }`}
          >
            🔍
          </button>
          <button
            onClick={() => load().catch(() => {})}
            disabled={loading}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono border border-[var(--border-primary)] hover:border-[var(--text-muted)] px-2 py-1 rounded transition-colors disabled:opacity-40"
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
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />
          {searchTerm.trim() && (
            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
              {displayRankings.length}명 검색됨
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-full animate-pulse rounded-lg bg-[var(--bg-card)]"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-[var(--text-muted)] font-mono text-center py-6">
          랭킹을 불러오지 못했습니다
        </div>
      ) : allRankings.length === 0 ? (
        <div className="text-xs text-[var(--text-muted)] font-mono text-center py-6">
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
                  const botType = getBotType(entry.userId);
                  const botEmoji = getBotEmoji(entry.userId);
                  const returnPct = entry.returnPct ?? 0;
                  return (
                    <div
                      key={entry.userId}
                      onClick={() => onBotClick?.(entry.userId)}
                      className="px-3 py-2 hover:bg-indigo-500/5 cursor-pointer transition-colors"
                    >
                      <div className="grid grid-cols-12 items-center text-xs font-mono">
                        <span className="col-span-1 text-[var(--text-muted)]">{rank}</span>
                        <div className="col-span-5 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm shrink-0">{botEmoji}</span>
                            <span className="truncate font-semibold text-[var(--text-primary)]">
                              {entry.nickname?.trim() || "익명"}
                            </span>
                            {botType && <BotBadge botType={botType} />}
                          </div>
                        </div>
                        <span
                          className={`col-span-3 text-right font-bold ${
                            returnPct > 0 ? "text-red-400" : returnPct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {returnPct > 0 ? "+" : ""}
                          {returnPct.toFixed(2)}%
                        </span>
                        <span className="col-span-3 text-right text-[var(--text-muted)]">
                          {fmt(Math.round(entry.totalAsset / 10000))}만
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 섹션 B: 수익률 랭킹 헤더 */}
          <div className="grid grid-cols-12 text-[10px] text-[var(--text-muted)] font-mono px-2 pb-1 border-b border-[var(--border-primary)]">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">수익률</span>
            <span className="col-span-3 text-right">총자산</span>
          </div>

          {/* 랭킹 행 */}
          {visibleRankings.map((entry) => {
            const rank = allRankings.indexOf(entry) + 1;
            const isMe = entry.userId === myUserId;
            const isBot = isBotUser(entry.userId);
            const botType = getBotType(entry.userId);
            const botEmoji = getBotEmoji(entry.userId);
            const returnPct = entry.returnPct ?? 0;

            return (
              <div
                key={entry.userId}
                onClick={() => {
                  if (isBot && onBotClick) onBotClick(entry.userId);
                  else if (!isBot && !isMe && onUserClick) onUserClick(entry.userId);
                }}
                className={`px-2 py-2 rounded-lg transition-colors ${
                  isMe
                    ? "bg-indigo-500/10 border border-indigo-500/30"
                    : "hover:bg-[var(--bg-card)] cursor-pointer"
                }`}
              >
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-[var(--text-muted)]">
                    {rank <= 3 ? MEDALS[rank - 1] : `${rank}`}
                  </span>
                  <div className="col-span-5 min-w-0">
                    <div className="flex items-center gap-1">
                      {isBot && (
                        <span className="text-sm shrink-0">{botEmoji}</span>
                      )}
                      <span
                        className={`truncate font-semibold ${isMe ? "text-indigo-400" : "text-[var(--text-primary)]"}`}
                      >
                        {entry.nickname?.trim() || "익명"}
                      </span>
                      {isMe && (
                        <span className="ml-0.5 text-[10px] text-indigo-400/70 shrink-0">
                          나
                        </span>
                      )}
                      {isBot && botType && (
                        <BotBadge botType={botType} />
                      )}
                    </div>
                  </div>
                  <span
                    className={`col-span-3 text-right font-bold ${
                      returnPct > 0
                        ? "text-red-400"
                        : returnPct < 0
                          ? "text-blue-400"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {returnPct > 0 ? "+" : ""}
                    {returnPct.toFixed(2)}%
                  </span>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">
                    {fmt(Math.round(entry.totalAsset / 10000))}만
                  </span>
                </div>
              </div>
            );
          })}

          {/* 더보기 버튼 */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, allRankings.length))}
              className="mt-2 w-full text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--text-muted)] py-2 rounded-lg transition-colors"
            >
              더보기 ({visibleCount}/{allRankings.length})
            </button>
          )}

          {/* 내 순위 — 현재 목록에 없을 때만 */}
          {myRank && !meInVisible && (
            <>
              <div className="flex items-center gap-2 py-1 px-2">
                <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
                <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                  내 순위
                </span>
                <div className="flex-1 border-t border-dashed border-[var(--border-primary)]" />
              </div>
              <div className="px-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-[var(--text-muted)]">
                    {myRank.rank}
                  </span>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate font-semibold text-indigo-400">
                      {myRank.entry.nickname}
                      <span className="ml-1 text-[10px] text-indigo-400/70">
                        나
                      </span>
                    </div>
                  </div>
                  <span
                    className={`col-span-3 text-right font-bold ${
                      (myRank.entry.returnPct ?? 0) > 0
                        ? "text-red-400"
                        : (myRank.entry.returnPct ?? 0) < 0
                          ? "text-blue-400"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {(myRank.entry.returnPct ?? 0) > 0 ? "+" : ""}
                    {(myRank.entry.returnPct ?? 0).toFixed(2)}%
                  </span>
                  <span className="col-span-3 text-right text-[var(--text-muted)]">
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
