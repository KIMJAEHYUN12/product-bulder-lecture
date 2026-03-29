"use client";

import { useState } from "react";
import { BarChart3, Users, Crosshair, Activity, TrendingUp, X } from "lucide-react";
import { CommodityTicker } from "@/components/CommodityTicker";
import { StockPreview } from "@/components/home/StockPreview";
import type { SignalEntry, GoldenSignalEntry, GoldenHistoryResponse } from "@/lib/api";

interface HomeDefaultProps {
  signals: SignalEntry[];
  signalsLoading: boolean;
  signalsScannedAt: string;
  goldenSignals: GoldenSignalEntry[];
  goldenSignalsLoading: boolean;
  goldenScannedAt: string;
  goldenHistory: GoldenHistoryResponse | null;
  onSelectStock: (stock: { symbol: string; name: string; exchange: string; type: string }) => void;
  todayAnalysisCount?: number;
  scannerOpen?: boolean;
}

function RegressionChannelMockup() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* +3σ ~ -3σ 밴드 (그라데이션 fill) */}
      <defs>
        <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.08" />
          <stop offset="50%" stopColor="rgb(99,102,241)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <polygon points="10,10 190,5 190,135 10,130" fill="url(#bandGrad)" />

      {/* σ 라인들 */}
      <line x1="10" y1="10" x2="190" y2="5" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.2" />
      <line x1="10" y1="30" x2="190" y2="25" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.25" />
      <line x1="10" y1="50" x2="190" y2="45" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.35" />
      <line x1="10" y1="70" x2="190" y2="70" stroke="rgb(99,102,241)" strokeWidth="1" opacity="0.5" strokeDasharray="4 2" />
      <line x1="10" y1="90" x2="190" y2="95" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.35" />
      <line x1="10" y1="110" x2="190" y2="115" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.25" />
      <line x1="10" y1="130" x2="190" y2="135" stroke="rgb(99,102,241)" strokeWidth="0.5" opacity="0.2" />

      {/* σ 라벨 */}
      <text x="193" y="8" fontSize="7" fill="rgb(99,102,241)" opacity="0.4">+3σ</text>
      <text x="193" y="28" fontSize="7" fill="rgb(99,102,241)" opacity="0.5">+2σ</text>
      <text x="193" y="48" fontSize="7" fill="rgb(99,102,241)" opacity="0.6">+1σ</text>
      <text x="193" y="73" fontSize="7" fill="rgb(99,102,241)" opacity="0.7">중심</text>
      <text x="193" y="98" fontSize="7" fill="rgb(99,102,241)" opacity="0.6">-1σ</text>
      <text x="193" y="118" fontSize="7" fill="rgb(99,102,241)" opacity="0.5">-2σ</text>
      <text x="193" y="138" fontSize="7" fill="rgb(99,102,241)" opacity="0.4">-3σ</text>

      {/* 가격 곡선 */}
      <path
        d="M10,80 C25,85 35,95 50,90 S70,60 85,55 S105,65 120,50 S140,40 155,55 S170,70 185,60"
        fill="none"
        stroke="rgb(129,140,248)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10,80 C25,85 35,95 50,90 S70,60 85,55 S105,65 120,50 S140,40 155,55 S170,70 185,60"
        fill="none"
        stroke="rgb(129,140,248)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.15"
      />

      {/* 현재 위치 dot */}
      <circle cx="185" cy="60" r="3" fill="rgb(129,140,248)" />
      <circle cx="185" cy="60" r="6" fill="rgb(129,140,248)" opacity="0.2" />
    </svg>
  );
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

export function HomeDefault({
  signals,
  signalsLoading,
  signalsScannedAt,
  goldenSignals,
  goldenSignalsLoading,
  goldenScannedAt,
  goldenHistory,
  onSelectStock,
  todayAnalysisCount = 0,
  scannerOpen = false,
}: HomeDefaultProps) {
  const handleSignalClick = (sig: SignalEntry) => {
    onSelectStock({ symbol: sig.symbol, name: sig.name, exchange: "KSE", type: "equity" });
  };

  return (
    <div className="mt-6 space-y-5">
      {/* 마켓 브리프 — 제거됨 */}

      {/* 히어로 */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-[var(--bg-overlay)] to-cyan-500/5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-6">
          {/* 좌: 텍스트 + 배지 + CTA */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
              주가의 정상 범위를<br />통계로 분석합니다
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              회귀 채널 + 수급 흐름으로 데이터 기반 차트 분석
            </p>

            {/* 핵심 수치 배지 */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-400">
                <BarChart3 className="h-3 w-3" />
                100종목 스캔
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-400">
                <Activity className="h-3 w-3" />
                7선 분석
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                <Users className="h-3 w-3" />
                실시간 수급
              </span>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => onSelectStock({ symbol: "005930.KS", name: "삼성전자", exchange: "KSE", type: "equity" })}
              className="mt-4 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-4 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/30 transition-colors"
            >
              삼성전자로 시작해보기
            </button>

            {/* 분석 건수 */}
            {todayAnalysisCount > 0 && (
              <div className="mt-3 text-[11px] text-[var(--text-faint)]">
                오늘 <span className="font-semibold text-indigo-400">{todayAnalysisCount.toLocaleString()}건</span> 분석
              </div>
            )}
          </div>

          {/* 우: 회귀채널 차트 목업 (모바일 숨김) */}
          <div className="hidden sm:block w-[200px] shrink-0 self-center">
            <RegressionChannelMockup />
          </div>
        </div>
      </div>

      {/* 삼성전자 미리보기 */}
      <StockPreview onSelectStock={onSelectStock} />

      {/* 포트폴리오 건강검진 배너 — 히어로 아래, 수급반전 위 */}
      <PortfolioBanner />

      {/* 오늘의 신호 — 스캐너 펼쳐져 있으면 숨김 */}
      {!scannerOpen && <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">수급 반전 신호</h3>
            <p className="text-[10px] text-[var(--text-faint)] mt-0.5">전일 마감 기준 · 3거래일 누적</p>
          </div>
          {(signalsScannedAt || goldenScannedAt) && (
            <span className="text-[10px] text-[var(--text-faint)]">
              {formatScannedAt(signalsScannedAt || goldenScannedAt)}
            </span>
          )}
        </div>

        {signalsLoading && goldenSignalsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((sec) => (
              <div key={sec}>
                <div className="mb-2 h-4 w-24 animate-pulse rounded bg-[var(--bg-overlay)]" />
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 sm:w-[180px] sm:shrink-0 animate-pulse rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : signals.length === 0 && goldenSignals.length === 0 ? (
          <p className="text-xs text-[var(--text-faint)]">현재 감지된 신호가 없습니다</p>
        ) : (
          <div className="space-y-4">
            {/* 수급 반전 신호 */}
            {signals.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs font-medium text-indigo-400">수급 반전 신호</span>
                  <span className="text-[10px] text-[var(--text-faint)]">{signals.length}건</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2">
                  {signals.slice(0, 5).map((sig) => (
                    <div
                      key={sig.symbol}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSignalClick(sig)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSignalClick(sig); }}
                      className="sm:w-[180px] sm:shrink-0 rounded-lg border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 p-3 text-left transition-colors hover:border-indigo-500/40 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[90px]">{sig.name}</span>
                        <span className={`text-xs font-medium ${sig.changeRate < 0 ? "text-blue-400" : sig.changeRate > 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                          {sig.changeRate > 0 ? "+" : ""}{sig.changeRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {sig.close.toLocaleString()}원
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          채널 {sig.positionPct <= -50 ? "하단 이탈" : sig.positionPct <= 0 ? "하단" : sig.positionPct <= 50 ? `${sig.positionPct}%` : sig.positionPct <= 100 ? `${sig.positionPct}%` : "상단 돌파"}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          sig.foreignNet3d > 0 && sig.instNet3d > 0
                            ? "bg-emerald-500/20 text-emerald-300"
                            : sig.foreignNet3d > 0
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}>
                          {sig.foreignNet3d > 0 && sig.instNet3d > 0
                            ? "외인+기관 매수"
                            : sig.foreignNet3d > 0
                            ? "외인 매수"
                            : "기관 매수"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 골든크로스 */}
            {goldenSignals.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">골든크로스</span>
                  <span className="text-[10px] text-[var(--text-faint)]">{goldenSignals.length}건</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-2">
                  {goldenSignals.slice(0, 5).map((g) => (
                    <div
                      key={`${g.symbol}_${g.crossType}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectStock({ symbol: g.symbol, name: g.name, exchange: "KSE", type: "equity" })}
                      onKeyDown={(e) => { if (e.key === "Enter") onSelectStock({ symbol: g.symbol, name: g.name, exchange: "KSE", type: "equity" }); }}
                      className="sm:w-[180px] sm:shrink-0 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-3 text-left transition-colors hover:border-amber-500/40 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[90px]">{g.name}</span>
                        <span className={`text-xs font-medium ${g.changePct < 0 ? "text-blue-400" : g.changePct > 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                          {g.changePct > 0 ? "+" : ""}{g.changePct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {g.price.toLocaleString()}원
                      </div>
                      <div className="mt-1 flex items-center justify-between">
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
                      {(g.foreignNet > 0 || g.institutionNet > 0) && (
                        <div className="mt-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            g.foreignNet > 0 && g.institutionNet > 0
                              ? "bg-emerald-500/20 text-emerald-300"
                              : g.foreignNet > 0
                              ? "bg-indigo-500/20 text-indigo-300"
                              : "bg-cyan-500/20 text-cyan-300"
                          }`}>
                            {g.foreignNet > 0 && g.institutionNet > 0
                              ? "외인+기관 매수"
                              : g.foreignNet > 0
                              ? "외인 매수"
                              : "기관 매수"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 골든크로스 미니 요약 */}
        {goldenHistory && goldenHistory.stats.total >= 30 && goldenHistory.stats.d3Rate > 0 && (
          <div className="mt-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-[var(--text-muted)]">
              최근 {goldenHistory.stats.sampleDays}일 D+3 양전율{" "}
              <span className={goldenHistory.stats.d3Rate >= 50 ? "text-red-400 font-medium" : "text-blue-400 font-medium"}>
                {goldenHistory.stats.d3Rate}%
              </span>
              {" | 코스피 대비 "}
              <span className={goldenHistory.stats.alphaD3 >= 0 ? "text-red-400 font-medium" : "text-blue-400 font-medium"}>
                {goldenHistory.stats.alphaD3 > 0 ? "+" : ""}{goldenHistory.stats.alphaD3}%p
              </span>
            </p>
          </div>
        )}
      </div>}

      {/* 인기 종목 — 제거됨 */}

      {/* 핵심 기능 소개 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <a
          href="/guide/regression-channel/"
          className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 transition-colors hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
          </div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">회귀 채널 분석</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-faint)]">
            7선 회귀채널로 저평가·고평가 한눈에 파악
          </p>
          <span className="mt-2 inline-block text-[10px] text-indigo-400/70">
            가이드 읽기 &rarr;
          </span>
        </a>

        <a
          href="/guide/trading-trend/"
          className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 transition-colors hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">수급 분석</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-faint)]">
            외인/기관 매매 동향을 차트에 자동 표시
          </p>
          <span className="mt-2 inline-block text-[10px] text-emerald-400/70">
            가이드 읽기 &rarr;
          </span>
        </a>

        <a
          href="/guide/supply-scan/"
          className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 transition-colors hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Crosshair className="h-4 w-4 text-amber-400" />
          </div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">수급 스캔</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-faint)]">
            채널 하단 + 수급 유입 종목 자동 탐색
          </p>
          <span className="mt-2 inline-block text-[10px] text-amber-400/70">
            가이드 읽기 &rarr;
          </span>
        </a>

        <a
          href="/guide/investor-flow/"
          className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 transition-colors hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">수급 흐름</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-faint)]">
            기관/외인/개인 누적 흐름을 한눈에 비교
          </p>
          <span className="mt-2 inline-block text-[10px] text-cyan-400/70">
            가이드 읽기 &rarr;
          </span>
        </a>
      </div>

      {/* 원자재 시세 */}
      <CommodityTicker />
    </div>
  );
}

function PortfolioBanner() {
  const DISMISS_KEY = "portfolio-checkup-dismissed-at";
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    return Date.now() - Number(stored) < 24 * 60 * 60 * 1000;
  });

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <a
      href="/portfolio?ref=hero_banner"
      className="group relative flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-5 md:py-4 mb-3 transition-colors hover:bg-indigo-500/15"
    >
      {/* 모바일 */}
      <div className="flex-1 md:hidden">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">NEW</span>
          <span className="text-base font-bold text-[var(--text-primary)]">포트폴리오 AI 건강검진</span>
        </div>
        <p className="text-xs text-indigo-400 mt-1.5">보유 종목을 AI로 무료 진단해보세요</p>
        <span className="mt-2 inline-block rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white">
          시작 &rarr;
        </span>
      </div>
      {/* 데스크톱 */}
      <div className="hidden md:flex flex-1 items-center gap-2.5">
        <Activity className="h-6 w-6 text-indigo-400 shrink-0" />
        <span className="shrink-0 rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">NEW</span>
        <span className="text-sm text-[var(--text-primary)]">
          <span className="font-bold">포트폴리오 AI 건강검진</span>
          <span className="text-[var(--text-muted)] ml-1.5">— 보유 종목을 진단해보세요</span>
        </span>
      </div>
      <span className="hidden md:inline rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white shrink-0 group-hover:bg-indigo-600 transition-colors">
        시작 &rarr;
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-md text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
        aria-label="배너 닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </a>
  );
}
