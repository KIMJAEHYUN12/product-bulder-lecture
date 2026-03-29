"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity, Users, ArrowRight } from "lucide-react";
import { fetchStockChart, fetchInvestorTrend } from "@/lib/api";
import {
  computeRegressionChannelV2,
  regValue,
  getChannelPosition,
  getTrendContext,
  TREND_LABEL,
  WINDOW_SIZE,
} from "@/lib/chartEngine";
import type { Candle, InvestorTrendDaily } from "@/types";

interface PreviewData {
  candles: Candle[];
  currentPrice: number;
  changeRate: number;
  channelPct: number;
  trend: "up" | "down" | "sideways";
  rsi: number | null;
  reg: { slope: number; intercept: number; sigma: number; startIdx: number; windowSize: number; isLog: boolean };
  investor: InvestorTrendDaily[];
}

function calcRSI(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const recent = candles.slice(-(period + 1));
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = recent[i].close - recent[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

interface Props {
  onSelectStock: (stock: { symbol: string; name: string; exchange: string; type: string }) => void;
}

export function StockPreview({ onSelectStock }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [chartRes, trendRes] = await Promise.all([
        fetchStockChart("005930.KS", "3mo", "1d"),
        fetchInvestorTrend("005930", "3mo"),
      ]);

      const candles = chartRes.candles;
      if (candles.length < 20) throw new Error("insufficient data");

      const reg = computeRegressionChannelV2(candles, WINDOW_SIZE.day);
      if (!reg) throw new Error("regression failed");

      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      const changeRate = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;
      const idxInWindow = candles.length - 1 - reg.startIdx;
      const channelPct = getChannelPosition(last.close, reg, idxInWindow);
      const trend = getTrendContext(reg);
      const rsi = calcRSI(candles);

      setData({
        candles,
        currentPrice: last.close,
        changeRate,
        channelPct,
        trend,
        rsi,
        reg,
        investor: trendRes.daily.slice(-30),
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-[var(--bg-overlay)] rounded" />
        <div className="h-32 bg-[var(--bg-overlay)] rounded-lg" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="flex-1 h-16 bg-[var(--bg-overlay)] rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { candles, currentPrice, changeRate, channelPct, trend, rsi, reg, investor } = data;

  // 시그널 태그 계산
  const tags: { label: string; color: string }[] = [];
  const foreignNet30 = investor.reduce((s, d) => s + d.foreign, 0);
  const instNet30 = investor.reduce((s, d) => s + d.institution, 0);
  if (foreignNet30 > 0) tags.push({ label: "외인 순매수", color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/25" });
  else tags.push({ label: "외인 순매도", color: "text-red-400 bg-red-500/15 border-red-500/25" });
  if (instNet30 > 0) tags.push({ label: "기관 순매수", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" });
  if (channelPct <= 20) tags.push({ label: "채널 하단 근접", color: "text-blue-400 bg-blue-500/15 border-blue-500/25" });
  else if (channelPct >= 80) tags.push({ label: "채널 상단 근접", color: "text-amber-400 bg-amber-500/15 border-amber-500/25" });
  if (rsi != null && rsi >= 70) tags.push({ label: "과매수 구간", color: "text-red-400 bg-red-500/15 border-red-500/25" });
  else if (rsi != null && rsi <= 30) tags.push({ label: "과매도 구간", color: "text-blue-400 bg-blue-500/15 border-blue-500/25" });

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-[var(--bg-card)] to-cyan-500/5 p-4 space-y-4">
      {/* 1. 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">실시간 분석 미리보기</h3>
          <span className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
            삼성전자
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-[var(--text-primary)]">{currentPrice.toLocaleString()}원</span>
          <span className={`ml-1.5 text-xs font-medium ${changeRate >= 0 ? "text-red-400" : "text-blue-400"}`}>
            {changeRate > 0 ? "+" : ""}{changeRate.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2. 미니 차트 (SVG) */}
      <MiniChart candles={candles} reg={reg} />

      {/* 3. 핵심 지표 */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="채널 위치"
          value={`${channelPct}%`}
          sub={channelPct <= 30 ? "하단" : channelPct >= 70 ? "상단" : "중심"}
          color={channelPct <= 30 ? "text-blue-400" : channelPct >= 70 ? "text-amber-400" : "text-emerald-400"}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="추세"
          value={TREND_LABEL[trend].text}
          sub="3개월"
          color={`text-[${TREND_LABEL[trend].color}]`}
          colorOverride={TREND_LABEL[trend].color}
          icon={<TrendIcon className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="RSI"
          value={rsi != null ? String(rsi) : "-"}
          sub={rsi != null ? (rsi >= 70 ? "과매수" : rsi <= 30 ? "과매도" : "중립") : ""}
          color={rsi != null ? (rsi >= 70 ? "text-red-400" : rsi <= 30 ? "text-blue-400" : "text-[var(--text-primary)]") : "text-[var(--text-muted)]"}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
      </div>

      {/* 4. 시그널 태그 */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t.label} className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${t.color}`}>
            {t.label}
          </span>
        ))}
      </div>

      {/* 5. 수급 흐름 */}
      <SupplyFlow investor={investor} />

      {/* 6. CTA */}
      <button
        type="button"
        onClick={() => onSelectStock({ symbol: "005930.KS", name: "삼성전자", exchange: "KSE", type: "equity" })}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-4 py-2.5 text-sm font-medium text-indigo-400 hover:bg-indigo-500/30 transition-colors"
      >
        내 종목도 분석해보기
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="text-[10px] text-[var(--text-faint)] text-center">
        로그인 없이 무료 · 2,745개 한국 주식 지원
      </p>
    </div>
  );
}

/* ── 미니 차트: SVG 회귀채널 + 가격선 ── */
function MiniChart({ candles, reg }: {
  candles: Candle[];
  reg: PreviewData["reg"];
}) {
  const W = 320, H = 140, PAD = 8;
  const display = candles.slice(-60);
  const n = display.length;
  if (n < 2) return null;

  const closes = display.map((c) => c.close);
  const allVals = [...closes];

  // 채널 라인 값 계산
  const channelLines: { upper: number[]; center: number[]; lower: number[] } = { upper: [], center: [], lower: [] };
  for (let i = 0; i < n; i++) {
    const globalIdx = candles.length - n + i;
    const idxInWindow = globalIdx - reg.startIdx;
    channelLines.upper.push(regValue(reg, idxInWindow, 2));
    channelLines.center.push(regValue(reg, idxInWindow, 0));
    channelLines.lower.push(regValue(reg, idxInWindow, -2));
  }
  allVals.push(...channelLines.upper, ...channelLines.lower);

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - minV) / range) * (H - PAD * 2);

  const pricePath = closes.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const upperPath = channelLines.upper.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const centerPath = channelLines.center.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const lowerPath = channelLines.lower.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  // 채널 영역 fill
  const bandPath = [
    ...channelLines.upper.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    ...channelLines.lower.map((v, i) => `L${toX(n - 1 - i).toFixed(1)},${toY(channelLines.lower[n - 1 - i]).toFixed(1)}`),
    "Z",
  ].join(" ");

  const lastX = toX(n - 1);
  const lastY = toY(closes[n - 1]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-[var(--bg-overlay)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* 채널 밴드 */}
        <path d={bandPath} fill="rgb(99,102,241)" opacity="0.08" />
        {/* +2σ */}
        <path d={upperPath} fill="none" stroke="rgb(99,102,241)" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.4" />
        {/* 중심선 */}
        <path d={centerPath} fill="none" stroke="rgb(99,102,241)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
        {/* -2σ */}
        <path d={lowerPath} fill="none" stroke="rgb(99,102,241)" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.4" />
        {/* 가격선 */}
        <path d={pricePath} fill="none" stroke="rgb(129,140,248)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* 현재가 점 */}
        <circle cx={lastX} cy={lastY} r="3" fill="rgb(129,140,248)" />
        <circle cx={lastX} cy={lastY} r="6" fill="rgb(129,140,248)" opacity="0.2" />
      </svg>
      {/* 하단 블러 그라데이션 */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[var(--bg-card)] to-transparent flex items-end justify-center pb-1.5">
        <span className="text-[10px] text-[var(--text-faint)]">회원가입 없이 바로 분석해보세요</span>
      </div>
    </div>
  );
}

/* ── 지표 카드 ── */
function MetricCard({ label, value, sub, color, colorOverride, icon }: {
  label: string;
  value: string;
  sub: string;
  color: string;
  colorOverride?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-2.5">
      <div className="flex items-center gap-1 text-[var(--text-muted)]">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className={`text-base font-bold mt-1 ${colorOverride ? "" : color}`} style={colorOverride ? { color: colorOverride } : undefined}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{sub}</div>
    </div>
  );
}

/* ── 수급 흐름 ── */
function SupplyFlow({ investor }: { investor: InvestorTrendDaily[] }) {
  const foreignNet = investor.reduce((s, d) => s + d.foreign, 0);
  const instNet = investor.reduce((s, d) => s + d.institution, 0);
  const indivNet = investor.reduce((s, d) => s + d.individual, 0);

  const fmtBillion = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1e8) return `${(v / 1e8).toFixed(1)}억`;
    if (abs >= 1e4) return `${(v / 1e4).toFixed(0)}만`;
    return v.toLocaleString();
  };

  const items = [
    { label: "외국인", value: foreignNet, color: foreignNet >= 0 ? "text-red-400" : "text-blue-400" },
    { label: "기관", value: instNet, color: instNet >= 0 ? "text-red-400" : "text-blue-400" },
    { label: "개인", value: indivNet, color: indivNet >= 0 ? "text-red-400" : "text-blue-400" },
  ];

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 1);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Users className="h-3 w-3 text-[var(--text-muted)]" />
        <span className="text-[10px] text-[var(--text-muted)]">30일 수급 흐름</span>
      </div>
      {items.map((item) => {
        const pct = Math.abs(item.value) / maxAbs * 100;
        const isPositive = item.value >= 0;
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] w-10 shrink-0">{item.label}</span>
            <div className="flex-1 h-3 rounded-full bg-[var(--bg-overlay)] relative overflow-hidden">
              <div
                className={`h-full rounded-full ${isPositive ? "bg-red-500/40" : "bg-blue-500/40"}`}
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium w-14 text-right shrink-0 ${item.color}`}>
              {item.value > 0 ? "+" : ""}{fmtBillion(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
