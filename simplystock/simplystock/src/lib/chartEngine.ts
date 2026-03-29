/**
 * chartEngine.ts — V2 차트 계산 유틸 (순수 함수)
 *
 * 주요 변경점 (V1 대비):
 * 1. 고정 윈도우 회귀 (일봉 60, 주봉 30, 월봉 24)
 * 2. 수급 마커 정규화 (20일 평균의 50% 임계치)
 * 3. 매수/매도 OR + 임계치 통일
 * 4. 추세 컨텍스트 (slope 기반 상승/하락/횡보)
 * 5. 한 줄 해석 생성
 */

import type { Candle, InvestorTrendDaily } from "@/types";

/* ─── 유틸 ─── */
const toDateStr = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const normalizeDateStr = (raw: string) => {
  if (raw.length === 8 && !raw.includes("-")) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw;
};

/* ─── 타입 ─── */
export interface RegressionResultV2 {
  slope: number;
  intercept: number;
  sigma: number;
  windowSize: number;
  /** 회귀 시작 인덱스 (전체 candles 배열 기준) */
  startIdx: number;
  /** 로그 공간에서 계산된 회귀인지 여부 */
  isLog: boolean;
}

export type TrendContext = "up" | "down" | "sideways";

export interface OneLiner {
  channelPct: number;        // 채널 내 위치 %
  foreignStreak: number;     // 외인 연속 매수/매도 일수 (양수=매수, 음수=매도)
  volumeRatio: number;       // 최근 거래량 / 20일 평균
  text: string;              // 조합된 한줄 해석
}

export interface MarkerV2 {
  time: string;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowDown" | "arrowUp" | "square";
  text: string;
  size: number;
  description: string;
}

/* ─── 고정 윈도우 크기 ─── */
export const WINDOW_SIZE: Record<string, number> = {
  day: 60,
  week: 30,
  month: 24,
};

/* ─── 1. 고정 윈도우 회귀 채널 ─── */
export function computeRegressionChannelV2(
  candles: Candle[],
  windowSize: number,
  useLog = false,
): RegressionResultV2 | null {
  const n = candles.length;
  if (n < 2) return null;

  const win = Math.min(windowSize, n);
  const startIdx = n - win;
  const slice = candles.slice(startIdx);

  // 단기(≤60): win/4로 최신 데이터 강조, 장기(>60): win/2로 전체 윈도우 균등 반영
  const halfLife = win <= 60 ? win / 4 : win / 2;
  const lambda = Math.LN2 / halfLife;

  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
  for (let i = 0; i < win; i++) {
    const w = Math.exp(lambda * (i - (win - 1)));
    const raw = (slice[i].high + slice[i].low) / 2;
    const y = useLog ? Math.log(raw) : raw;
    sumW += w;
    sumWX += w * i;
    sumWY += w * y;
    sumWXY += w * i * y;
    sumWX2 += w * i * i;
  }
  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return null;

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  let sumWResidSq = 0;
  for (let i = 0; i < win; i++) {
    const w = Math.exp(lambda * (i - (win - 1)));
    const raw = (slice[i].high + slice[i].low) / 2;
    const y = useLog ? Math.log(raw) : raw;
    const yHat = intercept + slope * i;
    sumWResidSq += w * (y - yHat) ** 2;
  }
  const sigma = Math.sqrt(sumWResidSq / sumW);

  return { slope, intercept, sigma, windowSize: win, startIdx, isLog: useLog };
}

/**
 * 회귀선의 값을 계산한다.
 * @param reg 회귀 결과
 * @param idxInWindow 윈도우 내 인덱스 (0부터 시작)
 * @param mult sigma 배수
 */
export function regValue(reg: RegressionResultV2, idxInWindow: number, mult: number): number {
  const v = reg.intercept + reg.slope * idxInWindow + mult * reg.sigma;
  return reg.isLog ? Math.exp(v) : v;
}

/**
 * 회귀 채널 밴드 데이터를 생성한다.
 * 윈도우 범위 + 전후 10봉 외삽 포함.
 */
export function buildBandData(
  candles: Candle[],
  reg: RegressionResultV2,
  mult: number,
  interval: "day" | "week" | "month",
): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  const extrapolate = 10;
  const dayStep = interval === "month" ? 30 * 86400 : interval === "week" ? 7 * 86400 : 86400;

  // 과거 외삽 (윈도우 시작 전 10봉)
  const pastStart = Math.max(0, reg.startIdx - extrapolate);
  for (let ci = pastStart; ci < reg.startIdx; ci++) {
    const idxInWindow = ci - reg.startIdx; // 음수
    result.push({
      time: toDateStr(candles[ci].time),
      value: regValue(reg, idxInWindow, mult),
    });
  }

  // 윈도우 내 데이터
  for (let ci = reg.startIdx; ci < candles.length; ci++) {
    const idxInWindow = ci - reg.startIdx;
    result.push({
      time: toDateStr(candles[ci].time),
      value: regValue(reg, idxInWindow, mult),
    });
  }

  // 미래 외삽 (마지막 캔들 이후 10봉)
  const lastTs = candles[candles.length - 1].time;
  for (let j = 1; j <= extrapolate; j++) {
    const idxInWindow = (candles.length - 1 - reg.startIdx) + j;
    result.push({
      time: toDateStr(lastTs + j * dayStep),
      value: regValue(reg, idxInWindow, mult),
    });
  }

  return result;
}

/* ─── 2. 추세 컨텍스트 ─── */
export function getTrendContext(reg: RegressionResultV2): TrendContext {
  const threshold = reg.sigma * 0.01;
  if (reg.slope > threshold) return "up";
  if (reg.slope < -threshold) return "down";
  return "sideways";
}

export const TREND_LABEL: Record<TrendContext, { text: string; color: string }> = {
  up: { text: "상승 추세", color: "#4ade80" },
  down: { text: "하락 추세", color: "#f87171" },
  sideways: { text: "횡보", color: "#9ca3af" },
};

/* ─── 3. 채널 위치(%) ─── */
export function getChannelPosition(
  close: number,
  reg: RegressionResultV2,
  idxInWindow: number,
): number {
  const upper = regValue(reg, idxInWindow, 2);
  const lower = regValue(reg, idxInWindow, -2);
  if (upper === lower) return 50;
  return Math.round(((close - lower) / (upper - lower)) * 100);
}

/* ─── 4. 마커 (정규화 + OR 통일) ─── */
export function buildMarkersV2(
  candles: Candle[],
  reg: RegressionResultV2,
  trendMap: Map<string, InvestorTrendDaily>,
  trend: TrendContext,
): MarkerV2[] {
  const markers: MarkerV2[] = [];

  // 20일 평균 |institution|, |foreign| 계산 → 임계치
  const recentDates = candles.slice(-20).map(c => toDateStr(c.time));
  let sumInst = 0, sumFor = 0, cnt = 0;
  for (const dt of recentDates) {
    const t = trendMap.get(dt);
    if (t) {
      sumInst += Math.abs(t.institution);
      sumFor += Math.abs(t.foreign);
      cnt++;
    }
  }
  const avgInst = cnt > 0 ? sumInst / cnt : 0;
  const avgFor = cnt > 0 ? sumFor / cnt : 0;
  const instThreshold = avgInst * 0.5;
  const forThreshold = avgFor * 0.5;

  for (let ci = reg.startIdx; ci < candles.length; ci++) {
    const c = candles[ci];
    const dateStr = toDateStr(c.time);
    const idxInWindow = ci - reg.startIdx;

    const top2 = regValue(reg, idxInWindow, 2);
    const top15 = regValue(reg, idxInWindow, 1.5);
    const bot2 = regValue(reg, idxInWindow, -2);
    const bot15 = regValue(reg, idxInWindow, -1.5);

    const t = trendMap.get(dateStr);
    const instBuy = t ? t.institution > instThreshold : false;
    const forBuy = t ? t.foreign > forThreshold : false;
    const instSell = t ? t.institution < -instThreshold : false;
    const forSell = t ? t.foreign < -forThreshold : false;

    // 매수: 채널 하단 터치 OR 수급 유의미 매수
    const touchBottom = c.low <= bot2 || c.low <= bot15;
    const supplyBuy = instBuy || forBuy;

    if (touchBottom && supplyBuy) {
      // 하락 추세 → 1단계 약화
      const weakened = trend === "down";
      const who = [instBuy ? "기관" : "", forBuy ? "외인" : ""].filter(Boolean).join("+");
      markers.push({
        time: dateStr,
        position: "belowBar",
        color: weakened ? "rgba(134,239,172,0.5)" : "#4ade80",
        shape: weakened ? "arrowUp" : "square",
        text: "B",
        size: weakened ? 1 : 2,
        description: weakened
          ? `채널 하단 + ${who} 매수 (하락추세 주의)`
          : `채널 하단 + ${who} 매수`,
      });
    }

    // 매도: 채널 상단 터치 OR 수급 유의미 매도
    const touchTop = c.close > top2 || c.high >= top15;
    const supplySell = instSell || forSell;

    if (touchTop && supplySell) {
      // 상승 추세 → 1단계 약화
      const weakened = trend === "up";
      const who = [instSell ? "기관" : "", forSell ? "외인" : ""].filter(Boolean).join("+");
      markers.push({
        time: dateStr,
        position: "aboveBar",
        color: weakened ? "rgba(252,165,165,0.5)" : "#f87171",
        shape: weakened ? "arrowDown" : "square",
        text: "S",
        size: weakened ? 1 : 2,
        description: weakened
          ? `채널 상단 + ${who} 매도 (상승추세 주의)`
          : `채널 상단 + ${who} 매도`,
      });
    }
  }

  return markers;
}

/* ─── 5. 한 줄 해석 ─── */
export function buildOneLiner(
  candles: Candle[],
  reg: RegressionResultV2,
  trendMap: Map<string, InvestorTrendDaily>,
): OneLiner {
  const lastCandle = candles[candles.length - 1];
  const idxInWindow = candles.length - 1 - reg.startIdx;

  // 채널 위치
  const channelPct = getChannelPosition(lastCandle.close, reg, idxInWindow);

  // 외인 연속 매수/매도 일수
  let foreignStreak = 0;
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 30); i--) {
    const dt = toDateStr(candles[i].time);
    const t = trendMap.get(dt);
    if (!t) break;
    if (foreignStreak === 0) {
      foreignStreak = t.foreign > 0 ? 1 : t.foreign < 0 ? -1 : 0;
      if (foreignStreak === 0) break;
    } else if (foreignStreak > 0 && t.foreign > 0) {
      foreignStreak++;
    } else if (foreignStreak < 0 && t.foreign < 0) {
      foreignStreak--;
    } else {
      break;
    }
  }

  // 거래량 비율 (최근 1봉 / 20일 평균)
  const vol20 = candles.slice(-21, -1);
  const avgVol = vol20.length > 0 ? vol20.reduce((s, c) => s + c.volume, 0) / vol20.length : lastCandle.volume;
  const volumeRatio = avgVol > 0 ? lastCandle.volume / avgVol : 1;

  // 텍스트 조합
  const parts: string[] = [];
  parts.push(`채널 ${channelPct < 0 ? "하단 이탈" : channelPct > 100 ? "상단 돌파" : `${channelPct}% 위치`}`);

  if (foreignStreak !== 0) {
    const days = Math.abs(foreignStreak);
    const dir = foreignStreak > 0 ? "매수" : "매도";
    parts.push(`외인 ${days}일 연속 ${dir}`);
  }

  if (volumeRatio >= 1.3 || volumeRatio <= 0.5) {
    const arrow = volumeRatio >= 1.3 ? "▲" : "▼";
    parts.push(`거래량 ${volumeRatio.toFixed(1)}배 ${arrow}`);
  }

  return {
    channelPct,
    foreignStreak,
    volumeRatio,
    text: parts.join(" | "),
  };
}

/* ─── 공통 유틸 (export) ─── */
export { toDateStr, normalizeDateStr };

/** 수급 숫자 포맷: 한국식 억/만 단위 */
export function fmtVolume(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 100_000_000) return sign + (abs / 100_000_000).toFixed(1) + "억";
  if (abs >= 10_000) return sign + Math.round(abs / 10_000).toLocaleString() + "만";
  return n.toLocaleString();
}

/** 일봉 → 주봉/월봉 리샘플링 */
export function resampleCandles(candles: Candle[], interval: "day" | "week" | "month"): Candle[] {
  if (interval === "day" || candles.length === 0) return candles;

  const getKey = (ts: number): string => {
    const d = new Date(ts * 1000);
    if (interval === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  };

  const groups: Map<string, Candle[]> = new Map();
  for (const c of candles) {
    const key = getKey(c.time);
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  const result: Candle[] = [];
  for (const group of groups.values()) {
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((s, c) => s + c.volume, 0),
    });
  }
  return result;
}

/** 수급 데이터 리샘플링 */
export function resampleTrend(daily: InvestorTrendDaily[], interval: "day" | "week" | "month"): InvestorTrendDaily[] {
  if (interval === "day" || daily.length === 0) return daily;

  const getKey = (raw: string): string => {
    const d = raw.replace(/-/g, "");
    const year = d.slice(0, 4);
    const month = d.slice(4, 6);
    const dayStr = d.slice(6, 8);
    if (interval === "month") return `${year}-${month}`;
    const date = new Date(+year, +month - 1, +dayStr);
    const dow = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - dow + 1);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  };

  const groups: Map<string, InvestorTrendDaily[]> = new Map();
  for (const d of daily) {
    const norm = normalizeDateStr(d.date);
    const key = getKey(norm);
    const arr = groups.get(key);
    if (arr) arr.push(d);
    else groups.set(key, [d]);
  }

  const result: InvestorTrendDaily[] = [];
  for (const group of groups.values()) {
    result.push({
      date: group[0].date,
      foreign: group.reduce((s, d) => s + d.foreign, 0),
      institution: group.reduce((s, d) => s + d.institution, 0),
      individual: group.reduce((s, d) => s + d.individual, 0),
    });
  }
  return result;
}
