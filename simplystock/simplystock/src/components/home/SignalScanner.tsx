"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Star, Trophy, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import type { SignalEntry, GoldenSignalEntry, BSSignalEntry, WatchlistItem, GoldenHistoryResponse } from "@/lib/api";

interface SignalScannerProps {
  signals: SignalEntry[];
  signalsLoading: boolean;
  signalsScannedAt: string;
  goldenSignals: GoldenSignalEntry[];
  goldenSignalsLoading: boolean;
  goldenScannedAt: string;
  goldenHistory: GoldenHistoryResponse | null;
  goldenHistoryLoading: boolean;
  bsSignals: BSSignalEntry[];
  bsSignalsLoading: boolean;
  bsScannedAt: string;
  watchlist: WatchlistItem[];
  isAdmin?: boolean;
  onSelectSignal: (stock: { symbol: string; name: string; exchange: string; type: string }) => void;
  onToggleWatchlist: (symbol: string, name: string, e?: React.MouseEvent) => void;
  onOpenChange?: (open: boolean) => void;
}

function formatScannedAt(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi} 기준`;
}

function formatVolume(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1000000) return `${(v / 1000000).toFixed(1)}백만`;
  if (abs >= 10000) return `${(v / 10000).toFixed(1)}만`;
  return v.toLocaleString();
}

export function SignalScanner({
  signals,
  signalsLoading,
  signalsScannedAt,
  goldenSignals,
  goldenSignalsLoading,
  goldenScannedAt,
  goldenHistory,
  goldenHistoryLoading,
  bsSignals,
  bsSignalsLoading,
  bsScannedAt,
  watchlist,
  isAdmin = false,
  onSelectSignal,
  onToggleWatchlist,
  onOpenChange,
}: SignalScannerProps) {
  const [signalsOpen, setSignalsOpen] = useState(false);
  const toggleOpen = () => {
    const next = !signalsOpen;
    setSignalsOpen(next);
    onOpenChange?.(next);
  };
  type SignalTab = "supply" | "golden" | "history" | "bs";
  const [signalTab, setSignalTab] = useState<SignalTab>("supply");
  const visibleTabs: SignalTab[] = isAdmin
    ? ["supply", "golden", "history", "bs"]
    : ["supply", "golden"];
  const [signalFilter, setSignalFilter] = useState<"all" | "kospi" | "kosdaq">("all");
  const [goldenFilter, setGoldenFilter] = useState<"all" | "5_20" | "20_60">("all");
  const [bsFilter, setBsFilter] = useState<"all" | "buy" | "sell">("all");

  const isInWatchlist = useCallback(
    (symbol: string) => watchlist.some((w) => w.symbol === symbol),
    [watchlist],
  );

  const handleSignalClick = (sig: SignalEntry) => {
    onSelectSignal({ symbol: sig.symbol, name: sig.name, exchange: "KSE", type: "equity" });
  };

  if (signalsLoading && goldenSignalsLoading) {
    return (
      <div className="mt-5">
        <div className="h-10 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
      </div>
    );
  }

  if (signals.length === 0 && goldenSignals.length === 0 && (isAdmin ? bsSignals.length === 0 : true)) return null;

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-card)]"
      >
        <span className="text-[var(--text-muted)] font-medium">
          종목 스캐너 <span className="text-indigo-400">{signals.length + goldenSignals.length + (isAdmin ? bsSignals.length : 0)}종목</span>
          <span className="text-[10px] text-[var(--text-faint)] ml-1.5">전일 마감 기준</span>
        </span>
        {signalsOpen ? (
          <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
        )}
      </button>

      {signalsOpen && (
        <div className="mt-2">
          {/* 수급 스캔 / 골든크로스 / 성적표 탭 */}
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSignalTab(tab)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  signalTab === tab
                    ? tab === "bs"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] border border-transparent"
                }`}
              >
                {tab === "supply" ? `수급 스캔 (${signals.length})` : tab === "golden" ? `골든크로스 (${goldenSignals.length})` : tab === "bs" ? `기술적 신호 (${bsSignals.length})` : "성적표"}
              </button>
            ))}
          </div>

          {/* 수급 스캔 탭 */}
          {signalTab === "supply" && (
            <>
              <p className="mb-2 text-[10px] text-[var(--text-faint)] leading-relaxed">
                채널 하단 + 외인/기관 수급 조건 충족 종목을 기계적으로 필터링한 결과이며, 매수·매도를 권유하지 않습니다.
              </p>
              <div className="mb-2 flex items-center gap-1.5">
                {(["all", "kospi", "kosdaq"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSignalFilter(tab)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      signalFilter === tab
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    }`}
                  >
                    {tab === "all" ? "전체" : tab === "kospi" ? "코스피" : "코스닥"}
                  </button>
                ))}
                {signalsScannedAt && (
                  <span className="ml-auto text-[10px] text-[var(--text-faint)]">{formatScannedAt(signalsScannedAt)}</span>
                )}
              </div>

              {signalsLoading ? (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 sm:w-48 sm:shrink-0 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2">
                  {signals
                    .filter((s) => {
                      if (signalFilter === "kospi") return s.symbol.endsWith(".KS");
                      if (signalFilter === "kosdaq") return s.symbol.endsWith(".KQ");
                      return true;
                    })
                    .map((sig) => (
                      <div
                        key={sig.symbol}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSignalClick(sig)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSignalClick(sig); }}
                        className="sm:w-48 sm:shrink-0 rounded-lg border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 p-3 text-left transition-colors hover:border-indigo-500/40 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[80px]">{sig.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => onToggleWatchlist(sig.symbol, sig.name, e)}
                              className="p-0.5 transition-colors hover:scale-110"
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  isInWatchlist(sig.symbol)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-[var(--text-faint)] hover:text-amber-400/60"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-medium ${sig.changeRate < 0 ? "text-blue-400" : sig.changeRate > 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                              {sig.changeRate > 0 ? "+" : ""}{sig.changeRate.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between sm:block">
                          <div className="text-base font-semibold">
                            {sig.close.toLocaleString()}원
                          </div>
                          <div className="text-[11px] text-emerald-400/80 sm:mt-0.5">
                            외인+기관 3일 +{formatVolume(sig.net3d)}주
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-[var(--text-muted)] sm:mt-1.5">
                          채널하단 {sig.channelBottom.toLocaleString()} ({sig.positionPct <= -50 ? "크게 이탈" : sig.positionPct <= 0 ? `${sig.positionPct}%` : `+${sig.positionPct}%`})
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* 골든크로스 탭 */}
          {signalTab === "golden" && (
            <>
              <p className="mb-2 text-[10px] text-[var(--text-faint)] leading-relaxed">
                이동평균선 교차 조건을 기계적으로 필터링한 결과이며, 매수·매도를 권유하지 않습니다.
              </p>
              <div className="mb-2 flex items-center gap-1.5">
                {(["all", "5_20", "20_60"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setGoldenFilter(tab)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      goldenFilter === tab
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    }`}
                  >
                    {tab === "all" ? "전체" : tab === "5_20" ? "5·20 교차" : "20·60 교차"}
                  </button>
                ))}
                {goldenScannedAt && (
                  <span className="ml-auto text-[10px] text-[var(--text-faint)]">{formatScannedAt(goldenScannedAt)}</span>
                )}
              </div>

              {goldenSignalsLoading ? (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 sm:w-52 sm:shrink-0 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2">
                  {goldenSignals
                    .filter((g) => {
                      if (goldenFilter === "5_20") return g.crossType === "5_20";
                      if (goldenFilter === "20_60") return g.crossType === "20_60";
                      return true;
                    })
                    .map((g) => (
                      <div
                        key={`${g.symbol}_${g.crossType}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectSignal({ symbol: g.symbol, name: g.name, exchange: "KSE", type: "equity" })}
                        onKeyDown={(e) => { if (e.key === "Enter") onSelectSignal({ symbol: g.symbol, name: g.name, exchange: "KSE", type: "equity" }); }}
                        className="sm:w-52 sm:shrink-0 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-3 text-left transition-colors hover:border-amber-500/40 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[90px]">{g.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => onToggleWatchlist(g.symbol, g.name, e)}
                              className="p-0.5 transition-colors hover:scale-110"
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  isInWatchlist(g.symbol)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-[var(--text-faint)] hover:text-amber-400/60"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-medium ${g.changePct < 0 ? "text-blue-400" : g.changePct > 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                              {g.changePct > 0 ? "+" : ""}{g.changePct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between sm:block">
                          <div className="text-base font-semibold">
                            {g.price.toLocaleString()}원
                          </div>
                          <div className="flex items-center gap-1.5 sm:mt-0.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              g.crossType === "5_20"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-orange-500/20 text-orange-300"
                            }`}>
                              {g.crossType === "5_20" ? "5/20 GC" : "20/60 GC"}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {g.crossDate.slice(4, 6).replace(/^0/, "")}/{g.crossDate.slice(6, 8)} 교차
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                          <span className={g.foreignNet > 0 ? "text-red-400/80" : "text-blue-400/80"}>
                            외인 {g.foreignNet > 0 ? "+" : ""}{formatVolume(g.foreignNet)}
                          </span>
                          <span className={g.institutionNet > 0 ? "text-red-400/80" : "text-blue-400/80"}>
                            기관 {g.institutionNet > 0 ? "+" : ""}{formatVolume(g.institutionNet)}
                          </span>
                          <span className={g.individualNet > 0 ? "text-red-400/80" : "text-blue-400/80"}>
                            개인 {g.individualNet > 0 ? "+" : ""}{formatVolume(g.individualNet)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* 성적표 탭 */}
          {signalTab === "history" && (
            <>
              {goldenHistoryLoading ? (
                <div className="space-y-3">
                  <div className="h-32 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                  <div className="h-20 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                </div>
              ) : !goldenHistory || goldenHistory.stats.total === 0 ? (
                <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-6 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-[var(--text-faint)] mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">데이터 축적 중</p>
                  <p className="text-[11px] text-[var(--text-faint)] mt-1">골든크로스 종목이 스캔되면 이후 수익률을 자동 추적합니다</p>
                </div>
              ) : (
                <>
                  {/* 성적표 카드 */}
                  <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">골든크로스 성적표</span>
                      <span className="text-[10px] text-[var(--text-faint)]">최근 {goldenHistory.stats.sampleDays}일</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-[var(--text-faint)]">전체 건수</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{goldenHistory.stats.total}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-faint)]">D+3 양전율</p>
                        {goldenHistory.stats.total >= 30 ? (
                          <p className={`text-lg font-bold ${goldenHistory.stats.d3Rate >= 50 ? "text-red-400" : "text-blue-400"}`}>
                            {goldenHistory.stats.d3Rate}%
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] mt-1">축적 중</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-faint)]">평균 수익률 D+3</p>
                        {goldenHistory.stats.total >= 30 ? (
                          <p className={`text-lg font-bold ${goldenHistory.stats.avgReturnD3 >= 0 ? "text-red-400" : "text-blue-400"}`}>
                            {goldenHistory.stats.avgReturnD3 > 0 ? "+" : ""}{goldenHistory.stats.avgReturnD3}%
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] mt-1">축적 중</p>
                        )}
                      </div>
                    </div>

                    {goldenHistory.stats.total >= 30 && (
                      <div className="mt-3 pt-3 border-t border-emerald-500/10 grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                          <div>
                            <p className="text-[10px] text-[var(--text-faint)]">코스피 대비 D+3</p>
                            <p className={`text-sm font-semibold ${goldenHistory.stats.alphaD3 >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {goldenHistory.stats.alphaD3 > 0 ? "+" : ""}{goldenHistory.stats.alphaD3}%p
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                          <div>
                            <p className="text-[10px] text-[var(--text-faint)]">코스피 대비 D+5</p>
                            <p className={`text-sm font-semibold ${goldenHistory.stats.alphaD5 >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {goldenHistory.stats.alphaD5 > 0 ? "+" : ""}{goldenHistory.stats.alphaD5}%p
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 종목별 이력 */}
                  {goldenHistory.records.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-[var(--text-faint)] mb-2">종목별 이력</p>
                      <div className="overflow-x-auto pb-2">
                        <table className="w-full min-w-[480px] text-xs">
                          <thead>
                            <tr className="text-[10px] text-[var(--text-faint)] border-b border-[var(--border-primary)]">
                              <th className="text-left py-1.5 pr-2">종목</th>
                              <th className="text-center px-1">타입</th>
                              <th className="text-center px-1">교차일</th>
                              <th className="text-right px-1">D+1</th>
                              <th className="text-right px-1">D+3</th>
                              <th className="text-right px-1">D+5</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {goldenHistory.records.map((r) => (
                              <tr
                                key={`${r.crossDate}_${r.symbol}`}
                                className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-overlay)] cursor-pointer transition-colors"
                                onClick={() => onSelectSignal({ symbol: r.symbol, name: r.name, exchange: "KSE", type: "equity" })}
                              >
                                <td className="py-2 pr-2 font-medium truncate max-w-[100px]">{r.name}</td>
                                <td className="text-center px-1">
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    r.crossType === "5_20"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-orange-500/20 text-orange-300"
                                  }`}>
                                    {r.crossType === "5_20" ? "5/20" : "20/60"}
                                  </span>
                                </td>
                                <td className="text-center px-1 text-[var(--text-muted)]">
                                  {r.crossDate.slice(4, 6).replace(/^0/, "")}/{r.crossDate.slice(6, 8)}
                                </td>
                                <td className={`text-right px-1 font-medium ${
                                  r.returnD1 == null ? "text-[var(--text-faint)]" : r.returnD1 > 0 ? "text-red-400" : r.returnD1 < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
                                }`}>
                                  {r.returnD1 == null ? "-" : `${r.returnD1 > 0 ? "+" : ""}${r.returnD1}%`}
                                </td>
                                <td className={`text-right px-1 font-medium ${
                                  r.returnD3 == null ? "text-[var(--text-faint)]" : r.returnD3 > 0 ? "text-red-400" : r.returnD3 < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
                                }`}>
                                  {r.returnD3 == null ? "-" : `${r.returnD3 > 0 ? "+" : ""}${r.returnD3}%`}
                                </td>
                                <td className={`text-right px-1 font-medium ${
                                  r.returnD5 == null ? "text-[var(--text-faint)]" : r.returnD5 > 0 ? "text-red-400" : r.returnD5 < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
                                }`}>
                                  {r.returnD5 == null ? "-" : `${r.returnD5 > 0 ? "+" : ""}${r.returnD5}%`}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleWatchlist(r.symbol, r.name, e); }}
                                    className="p-0.5"
                                  >
                                    <Star className={`h-3.5 w-3.5 ${
                                      isInWatchlist(r.symbol)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-[var(--text-faint)] hover:text-amber-400/60"
                                    }`} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 면책 문구 */}
                  <p className="mt-3 text-[10px] text-[var(--text-faint)] leading-relaxed">
                    본 성적표는 과거 골든크로스 시그널의 이후 수익률을 통계적으로 집계한 참고 자료이며, 미래 수익을 보장하지 않습니다. 투자 판단의 최종 책임은 본인에게 있습니다.
                  </p>
                </>
              )}
            </>
          )}

          {/* B/S 신호 탭 */}
          {signalTab === "bs" && (
            <>
              {/* 면책 배너 */}
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-300">
                      전일 종가 기준 기술적 지표 분석이며 실시간 신호가 아닙니다
                    </p>
                    <p className="text-[11px] text-amber-400/80 mt-0.5">
                      투자 참고용이며 매매 추천이 아닙니다. 모든 투자 판단과 책임은 본인에게 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-center gap-1.5">
                {(["all", "buy", "sell"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setBsFilter(f)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      bsFilter === f
                        ? f === "buy"
                          ? "bg-teal-500/20 text-teal-300"
                          : f === "sell"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-indigo-500/20 text-indigo-300"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    }`}
                  >
                    {f === "all" ? "전체" : f === "buy" ? "과매도" : "과매수"}
                  </button>
                ))}
                {bsScannedAt && (
                  <span className="ml-auto text-[10px] text-[var(--text-faint)]">{formatScannedAt(bsScannedAt)}</span>
                )}
              </div>

              {bsSignalsLoading ? (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 sm:w-52 sm:shrink-0 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                  ))}
                </div>
              ) : bsSignals.length === 0 ? (
                <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)]">현재 기술적 신호가 없습니다</p>
                  <p className="text-[11px] text-[var(--text-faint)] mt-1">2개 이상의 지표가 동시에 충족되어야 신호가 발생합니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2">
                  {bsSignals
                    .filter((s) => bsFilter === "all" || s.signalType === bsFilter)
                    .map((s) => (
                      <div
                        key={s.symbol}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectSignal({ symbol: s.symbol, name: s.name, exchange: "KSE", type: "equity" })}
                        onKeyDown={(e) => { if (e.key === "Enter") onSelectSignal({ symbol: s.symbol, name: s.name, exchange: "KSE", type: "equity" }); }}
                        className={`sm:w-52 sm:shrink-0 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                          s.signalType === "buy"
                            ? "border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/5 hover:border-teal-500/40"
                            : "border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/5 hover:border-rose-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[90px]">{s.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => onToggleWatchlist(s.symbol, s.name, e)}
                              className="p-0.5 transition-colors hover:scale-110"
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  isInWatchlist(s.symbol)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-[var(--text-faint)] hover:text-amber-400/60"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-medium ${s.changePct < 0 ? "text-blue-400" : s.changePct > 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                              {s.changePct > 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between sm:block">
                          <div className="text-base font-semibold">
                            {s.price.toLocaleString()}원
                          </div>
                          <div className="flex items-center gap-1.5 sm:mt-0.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              s.signalType === "buy"
                                ? "bg-teal-500/20 text-teal-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}>
                              {s.signalType === "buy" ? "과매도" : "과매수"}
                            </span>
                            <span className={`text-[11px] font-medium ${
                              s.signalType === "buy" ? "text-teal-400/80" : "text-rose-400/80"
                            }`}>
                              {s.strength === 4 ? "매우 강함" : s.strength === 3 ? "강함" : "보통"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.indicators.map((ind) => (
                            <span
                              key={ind}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                s.signalType === "buy"
                                  ? "bg-teal-500/15 text-teal-400/90"
                                  : "bg-rose-500/15 text-rose-400/90"
                              }`}
                            >
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
