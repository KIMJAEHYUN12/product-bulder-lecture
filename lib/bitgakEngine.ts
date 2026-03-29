import type { Candle, BitgakPivot, BitgakLine, BitgakResult, BitgakMeta, TechIndicators, ChartInterval, BitgakViewMode } from "@/types";

// ── 고점/저점 탐지 (Zigzag 방식) ──
function findPivots(candles: Candle[], windowSize: number = 5): { highs: BitgakPivot[]; lows: BitgakPivot[] } {
  const highs: BitgakPivot[] = [];
  const lows: BitgakPivot[] = [];

  for (let i = windowSize; i < candles.length - windowSize; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) {
      highs.push({ index: i, time: candles[i].time, price: candles[i].high, type: "high" });
    }
    if (isLow) {
      lows.push({ index: i, time: candles[i].time, price: candles[i].low, type: "low" });
    }
  }

  return { highs, lows };
}

// ── 선형회귀 ──
function linearRegression(points: { x: number; y: number; weight?: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    sumW += w;
    sumWX += w * p.x;
    sumWY += w * p.y;
    sumWXY += w * p.x * p.y;
    sumWX2 += w * p.x * p.x;
  }

  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return { slope: 0, intercept: sumWY / sumW, r2: 0 };

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  // R² 계산 (가중)
  const yMean = sumWY / sumW;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    const predicted = slope * p.x + intercept;
    ssRes += w * (p.y - predicted) ** 2;
    ssTot += w * (p.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ── 회귀선에서 Q3 기반 평행 채널 구축 ──
function buildChannel(
  candles: Candle[],
  pivots: BitgakPivot[],
  oppositePivots: BitgakPivot[],
  isUpperLine: boolean,
): { slope: number; intercept: number; parallelIntercept: number } | null {
  if (pivots.length < 2) return null;

  // 최근 30% 구간 피봇에 3배 가중치 → 최근 추세 각도 반영
  const lastIdx = Math.max(1, candles.length - 1);
  const regressionPoints = pivots.map((p) => ({
    x: p.index,
    y: p.price,
    weight: p.index / lastIdx > 0.7 ? 3 : 1,
  }));
  const reg = linearRegression(regressionPoints);

  // 전체 가격 범위 계산
  const allPrices = candles.map((c) => c.high).concat(candles.map((c) => c.low));
  const priceMin = Math.min(...allPrices);
  const priceMax = Math.max(...allPrices);
  const totalRange = priceMax - priceMin;
  const maxAllowedDist = totalRange * 0.6;

  // 반대편 피벗들에서 거리 수집 → 최신 피봇 가중 + Q3(75분위) (outlier 방지)
  const dists: number[] = [];
  for (const p of oppositePivots) {
    const predicted = reg.slope * p.index + reg.intercept;
    const dist = isUpperLine ? predicted - p.price : p.price - predicted;
    if (dist > 0) {
      // 최신 피봇(index가 뒤쪽)에 가중치 부여 → 최근 추세 반영
      const weight = Math.floor(p.index / Math.max(1, candles.length / 5)) + 1;
      for (let w = 0; w < weight; w++) dists.push(dist);
    }
  }

  // 피벗 거리가 없으면 캔들 전체에서 수집
  if (dists.length === 0) {
    for (let i = 0; i < candles.length; i++) {
      const predicted = reg.slope * i + reg.intercept;
      const price = isUpperLine ? candles[i].low : candles[i].high;
      const dist = isUpperLine ? predicted - price : price - predicted;
      if (dist > 0) dists.push(dist);
    }
  }

  dists.sort((a, b) => a - b);
  let maxDist = dists.length > 0 ? dists[Math.floor(dists.length * 0.75)] : 0;

  // 채널 폭이 가격 범위의 60%를 넘지 않도록 클램핑
  if (maxDist > maxAllowedDist) maxDist = maxAllowedDist;

  let parallelIntercept = isUpperLine
    ? reg.intercept - maxDist
    : reg.intercept + maxDist;

  // parallelIntercept 안전 보장 (range 기반 — log 공간에서도 수학적으로 정확)
  const rangeMargin = Math.max(totalRange * 0.15, (priceMax + priceMin) * 0.001);
  const safeFloor = priceMin - rangeMargin;
  const safeCeiling = priceMax + rangeMargin;
  const n = candles.length - 1;
  const v0 = reg.slope * 0 + parallelIntercept;
  const vN = reg.slope * n + parallelIntercept;
  const lineMin = Math.min(v0, vN);
  const lineMax = Math.max(v0, vN);
  if (lineMin < safeFloor) parallelIntercept += (safeFloor - lineMin);
  if (lineMax > safeCeiling) parallelIntercept -= (lineMax - safeCeiling);

  return { slope: reg.slope, intercept: reg.intercept, parallelIntercept };
}

// ── 채널 라인 좌표 생성 (5포인트 + floor/ceiling 클램핑) ──
function makeLinePoints(
  candles: Candle[],
  slope: number,
  intercept: number,
  priceFloor?: number,
  priceCeiling?: number,
): { time: number; value: number }[] {
  if (candles.length === 0) return [];
  const last = candles.length - 1;
  // 5포인트: 0%, 25%, 50%, 75%, 100%
  const rawIndices = [0, Math.round(last * 0.25), Math.round(last * 0.5), Math.round(last * 0.75), last];
  // 캔들 적을 때 중복 인덱스 제거
  const indices = [...new Set(rawIndices)];
  return indices.map((i) => {
    let value = slope * i + intercept;
    if (priceFloor !== undefined) value = Math.max(priceFloor, value);
    if (priceCeiling !== undefined) value = Math.min(priceCeiling, value);
    return { time: candles[i].time, value };
  });
}

// ── S/R Flip 탐지 ──
function findSRFlips(
  candles: Candle[],
  highs: BitgakPivot[],
  lows: BitgakPivot[],
): BitgakLine[] {
  const lines: BitgakLine[] = [];
  // 직전 고점이 이후 저점의 지지가 되는 패턴 찾기
  for (let i = 0; i < highs.length - 1; i++) {
    const resistancePrice = highs[i].price;
    // 이 고점 이후의 저점 중에서 이 가격 근처(±3%)에서 지지받는 저점 찾기
    const laterLows = lows.filter(
      (l) => l.index > highs[i].index && Math.abs(l.price - resistancePrice) / resistancePrice < 0.03
    );
    if (laterLows.length > 0) {
      const startTime = candles[highs[i].index].time;
      const endTime = candles[Math.min(laterLows[laterLows.length - 1].index + 5, candles.length - 1)].time;
      lines.push({
        type: "support_resistance",
        label: `S/R Flip ${Math.round(resistancePrice).toLocaleString()}`,
        style: "dashed",
        color: "#f59e0b",
        points: [
          { time: startTime, value: Math.round(resistancePrice) },
          { time: endTime, value: Math.round(resistancePrice) },
        ],
      });
    }
  }
  return lines.slice(0, 2); // 최대 2개
}

// ── RSI 계산 ──
export function computeRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

// ── MACD 계산 ──
function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function computeMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  sig: number = 9,
): { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < slow + sig) return { macd: 0, signal: 0, histogram: 0, trend: "bearish" };
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = fastEma.map((v, i) => v - slowEma[i]);
  const signalLine = ema(macdLine.slice(slow - 1), sig);
  const macdVal = macdLine[macdLine.length - 1];
  const sigVal = signalLine[signalLine.length - 1];
  return {
    macd: Math.round(macdVal * 100) / 100,
    signal: Math.round(sigVal * 100) / 100,
    histogram: Math.round((macdVal - sigVal) * 100) / 100,
    trend: macdVal > sigVal ? "bullish" : "bearish",
  };
}

// ── 볼린저 밴드 ──
export function computeBollingerBands(
  candles: Candle[],
  period: number = 20,
  mult: number = 2,
): { upper: number; middle: number; lower: number; position: "above" | "inside" | "below" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, position: "inside" };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = Math.round(middle + mult * std);
  const lower = Math.round(middle - mult * std);
  const last = closes[closes.length - 1];
  const position = last > upper ? "above" : last < lower ? "below" : "inside";
  return { upper, middle: Math.round(middle), lower, position };
}

// ── 이동평균 (단일값) ──
export function computeMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  return Math.round(slice.reduce((a, b) => a + b, 0) / period);
}

// ── 이동평균 배열 (차트 그리기용) ──
export function computeMAArray(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      result.push(Math.round(slice.reduce((a, b) => a + b, 0) / period));
    }
  }
  return result;
}

// ── 기술지표 종합 계산 ──
function computeIndicators(candles: Candle[]): TechIndicators {
  const closes = candles.map((c) => c.close);
  return {
    rsi: computeRSI(candles),
    macd: computeMACD(candles),
    bb: computeBollingerBands(candles),
    ma5: computeMA(closes, 5),
    ma20: computeMA(closes, 20),
    ma60: computeMA(closes, 60),
  };
}

// ── 메인 분석 함수 ──
export function analyzeBitgak(candles: Candle[], interval?: ChartInterval, logScale?: boolean, viewMode?: BitgakViewMode): BitgakResult {
  if (candles.length < 8) {
    return {
      highs: [],
      lows: [],
      lines: [],
      summary: `데이터 부족: 현재 ${candles.length}개 캔들 (최소 8개 필요). 기간을 늘리거나 봉 단위를 줄여주세요.`,
    };
  }

  const vm = viewMode ?? "auto";

  // LOG 모드: 가격을 log10 공간으로 변환하여 분석
  const analysisCandles: Candle[] = logScale
    ? candles.map((c) => ({
        ...c,
        open: Math.log10(Math.max(c.open, 0.01)),
        high: Math.log10(Math.max(c.high, 0.01)),
        low: Math.log10(Math.max(c.low, 0.01)),
        close: Math.log10(Math.max(c.close, 0.01)),
      }))
    : candles;

  // 윈도우 사이즈: 캔들 수 비율 기반 동적 계산 (interval별 계수)
  let windowSize: number;
  if (interval === "1mo") {
    windowSize = Math.max(1, Math.min(4, Math.round(candles.length * 0.06)));
  } else if (interval === "1wk") {
    windowSize = Math.max(2, Math.min(8, Math.round(candles.length * 0.07)));
  } else {
    // 일봉 (기본)
    windowSize = Math.max(2, Math.min(15, Math.round(candles.length * 0.08)));
  }

  // 후처리: 전체 가격 범위 대비 significance 미만 피봇 제거
  const allPrices = analysisCandles.map((c) => c.high).concat(analysisCandles.map((c) => c.low));
  const priceMax = Math.max(...allPrices);
  const priceMin = Math.min(...allPrices);
  const totalRange = priceMax - priceMin;

  function filterAndMerge(rawHighs: BitgakPivot[], rawLows: BitgakPivot[], ws: number, sigRate: number) {
    const minSig = totalRange * sigRate;

    function filterInsignificant(pivots: BitgakPivot[]): BitgakPivot[] {
      if (totalRange === 0) return pivots;
      return pivots.filter((p) => {
        const neighbors = analysisCandles.slice(
          Math.max(0, p.index - ws),
          Math.min(analysisCandles.length, p.index + ws + 1),
        );
        const avgPrice = neighbors.reduce((s, c) => s + (c.high + c.low) / 2, 0) / neighbors.length;
        return Math.abs(p.price - avgPrice) >= minSig;
      });
    }

    function mergeClose(pivots: BitgakPivot[], pickMax: boolean): BitgakPivot[] {
      if (pivots.length <= 1) return pivots;
      const merged: BitgakPivot[] = [pivots[0]];
      for (let i = 1; i < pivots.length; i++) {
        const last = merged[merged.length - 1];
        if (pivots[i].index - last.index < ws) {
          if (pickMax ? pivots[i].price > last.price : pivots[i].price < last.price) {
            merged[merged.length - 1] = pivots[i];
          }
        } else {
          merged.push(pivots[i]);
        }
      }
      return merged;
    }

    return {
      highs: mergeClose(filterInsignificant(rawHighs), true),
      lows: mergeClose(filterInsignificant(rawLows), false),
    };
  }

  // 캔들 수 기반 significance 임계값
  let significanceRate = candles.length < 30 ? 0.005 : candles.length < 60 ? 0.01 : candles.length < 100 ? 0.015 : 0.02;

  let rawPivots = findPivots(analysisCandles, windowSize);
  let filtered = filterAndMerge(rawPivots.highs, rawPivots.lows, windowSize, significanceRate);

  // 피봇 부족 시 재시도 (sensitivity fallback, 1회)
  if (filtered.highs.length + filtered.lows.length < 3) {
    const retryWs = Math.max(1, windowSize - 1);
    const retrySig = significanceRate / 2;
    const retryPivots = findPivots(analysisCandles, retryWs);
    const retryFiltered = filterAndMerge(retryPivots.highs, retryPivots.lows, retryWs, retrySig);
    if (retryFiltered.highs.length + retryFiltered.lows.length > filtered.highs.length + filtered.lows.length) {
      rawPivots = retryPivots;
      filtered = retryFiltered;
      windowSize = retryWs;
      significanceRate = retrySig;
    }
  }

  const highs = filtered.highs;
  const lows = filtered.lows;

  const lines: BitgakLine[] = [];

  // ── Dual 채널 로직: 항상 양쪽 채널 모두 시도 ──
  const rangeMargin = Math.max(totalRange * 0.15, (priceMax + priceMin) * 0.001);
  const lineFloor = priceMin - rangeMargin;
  const lineCeiling = priceMax + rangeMargin;

  let highChannel: { slope: number; intercept: number; parallelIntercept: number } | null = null;
  let lowChannel: { slope: number; intercept: number; parallelIntercept: number } | null = null;

  if (highs.length >= 2 && lows.length >= 1) {
    highChannel = buildChannel(analysisCandles, highs, lows, true);
  }
  if (lows.length >= 2 && highs.length >= 1) {
    lowChannel = buildChannel(analysisCandles, lows, highs, false);
  }

  const strongSide = highs.length >= lows.length ? "high" : "low";

  // 채널 라인 push 헬퍼
  function pushChannelLines(
    ch: { slope: number; intercept: number; parallelIntercept: number },
    side: "resist" | "support",
    opacity: number,
  ) {
    const topIntercept = side === "resist" ? ch.intercept : ch.parallelIntercept;
    const bottomIntercept = side === "resist" ? ch.parallelIntercept : ch.intercept;
    const midIntercept = (topIntercept + bottomIntercept) / 2;

    const topColor = side === "resist" ? "#ef4444" : "#86efac";
    const bottomColor = side === "resist" ? "#fca5a5" : "#22c55e";
    const midColor = side === "resist" ? "#f97316" : "#facc15";

    lines.push({
      type: "channel_top",
      label: side === "resist" ? "저항 상단" : "지지 상단",
      style: "solid",
      color: topColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, topIntercept, lineFloor, lineCeiling),
    });
    lines.push({
      type: "channel_bottom",
      label: side === "resist" ? "저항 하단" : "지지 하단",
      style: "solid",
      color: bottomColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, bottomIntercept, lineFloor, lineCeiling),
    });
    lines.push({
      type: "midline",
      label: side === "resist" ? "저항 중앙" : "지지 중앙",
      style: "dashed",
      color: midColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, midIntercept, lineFloor, lineCeiling),
    });
  }

  if (vm === "bullish") {
    if (lowChannel) pushChannelLines(lowChannel, "support", 1.0);
    else if (highChannel) pushChannelLines(highChannel, "resist", 0.5);
  } else if (vm === "bearish") {
    if (highChannel) pushChannelLines(highChannel, "resist", 1.0);
    else if (lowChannel) pushChannelLines(lowChannel, "support", 0.5);
  } else {
    // auto: 둘 다 표시, 강한 쪽 진하게 / 약한 쪽 연하게
    if (highChannel) pushChannelLines(highChannel, "resist", strongSide === "high" ? 1.0 : 0.35);
    if (lowChannel) pushChannelLines(lowChannel, "support", strongSide === "low" ? 1.0 : 0.35);
  }

  const hasChannel = !!(highChannel || lowChannel);

  // ── Fallback 추세선 (양쪽 채널 모두 실패 시) ──
  if (!hasChannel && candles.length >= 2) {
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < analysisCandles.length; i++) {
      if (analysisCandles[i].low < analysisCandles[minIdx].low) minIdx = i;
      if (analysisCandles[i].high > analysisCandles[maxIdx].high) maxIdx = i;
    }
    const startIdx = Math.min(minIdx, maxIdx);
    const endIdx = Math.max(minIdx, maxIdx);
    if (startIdx !== endIdx) {
      const startPrice = startIdx === minIdx ? analysisCandles[startIdx].low : analysisCandles[startIdx].high;
      const endPrice = endIdx === minIdx ? analysisCandles[endIdx].low : analysisCandles[endIdx].high;
      lines.push({
        type: "trend_line",
        label: "추세선",
        style: "dashed",
        color: "#60a5fa",
        opacity: 1.0,
        points: [
          { time: candles[startIdx].time, value: logScale ? Math.round(Math.pow(10, startPrice)) : Math.round(startPrice) },
          { time: candles[endIdx].time, value: logScale ? Math.round(Math.pow(10, endPrice)) : Math.round(endPrice) },
        ],
      });
    }
  }

  // primary 채널 (추세/위치 판정용): 강한 쪽 우선
  const primaryChannel = strongSide === "high" ? (highChannel ?? lowChannel) : (lowChannel ?? highChannel);
  let channelSlope = 0;
  let channelTopIntercept = 0;
  let channelBottomIntercept = 0;
  if (primaryChannel) {
    channelSlope = primaryChannel.slope;
    if ((strongSide === "high" && highChannel) || (!lowChannel)) {
      channelTopIntercept = primaryChannel.intercept;
      channelBottomIntercept = primaryChannel.parallelIntercept;
    } else {
      channelBottomIntercept = primaryChannel.intercept;
      channelTopIntercept = primaryChannel.parallelIntercept;
    }
  }

  // LOG 모드: log 공간 좌표 → 실제 가격으로 복원 + 이중 클램핑
  if (logScale) {
    const realMin = Math.min(...candles.map((c) => c.low));
    const realMax = Math.max(...candles.map((c) => c.high));
    const realMargin = Math.max((realMax - realMin) * 0.15, realMin * 0.001);
    const realFloor = realMin - realMargin;
    const realCeiling = realMax + realMargin;
    for (const line of lines) {
      for (const p of line.points) {
        let v = Math.pow(10, p.value);
        v = Math.max(realFloor, Math.min(realCeiling, v));
        p.value = Math.round(v);
      }
    }
    for (const p of highs) p.price = Math.round(Math.pow(10, p.price));
    for (const p of lows) p.price = Math.round(Math.pow(10, p.price));
  } else {
    for (const line of lines) {
      for (const p of line.points) {
        p.value = Math.round(p.value);
      }
    }
  }

  // S/R Flip (실제 가격 기준으로 탐색)
  const srFlips = findSRFlips(candles, highs, lows);
  lines.push(...srFlips);

  // 요약 텍스트 생성 (Gemini에 넘길 데이터) — 항상 실제 가격 사용
  const first = candles[0];
  const last = candles[candles.length - 1];
  const highPrice = Math.max(...candles.map((c) => c.high));
  const lowPrice = Math.min(...candles.map((c) => c.low));
  const changePct = ((last.close - first.open) / first.open * 100).toFixed(1);

  // 추세 판정: 실제 가격 기반 (채널 시작~끝 가격 변화율)
  let trendDir: string;
  if (hasChannel) {
    const startVal = logScale
      ? Math.pow(10, channelSlope * 0 + (channelTopIntercept + channelBottomIntercept) / 2)
      : channelSlope * 0 + (channelTopIntercept + channelBottomIntercept) / 2;
    const endVal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + (channelTopIntercept + channelBottomIntercept) / 2)
      : channelSlope * (candles.length - 1) + (channelTopIntercept + channelBottomIntercept) / 2;
    const pctChange = (endVal - startVal) / startVal;
    trendDir = pctChange > 0.02 ? "상승" : pctChange < -0.02 ? "하락" : "횡보";
  } else if (lines.some((l) => l.type === "trend_line")) {
    // fallback 추세선으로 판정
    const tl = lines.find((l) => l.type === "trend_line")!;
    trendDir = tl.points[1].value > tl.points[0].value ? "상승" : "하락";
  } else {
    trendDir = "판별불가";
  }

  const lastPrice = last.close;
  let positionInChannel = "";
  if (hasChannel) {
    // 채널 위치 판정: 실제 가격 공간에서 비교
    const lastTopReal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelTopIntercept)
      : channelSlope * (candles.length - 1) + channelTopIntercept;
    const lastBottomReal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelBottomIntercept)
      : channelSlope * (candles.length - 1) + channelBottomIntercept;
    const lastMid = (lastTopReal + lastBottomReal) / 2;
    if (lastPrice > lastMid) {
      positionInChannel = lastPrice > lastTopReal ? "채널 상단 돌파" : "채널 상단부";
    } else {
      positionInChannel = lastPrice < lastBottomReal ? "채널 하단 이탈" : "채널 하단부";
    }
  }

  const indicators = computeIndicators(candles);

  const maAlignment = indicators.ma5 > indicators.ma20 && indicators.ma20 > indicators.ma60
    ? "정배열" : indicators.ma5 < indicators.ma20 && indicators.ma20 < indicators.ma60
    ? "역배열" : "혼합";

  const summary = [
    `기간: ${new Date(first.time * 1000).toISOString().slice(0, 10)} ~ ${new Date(last.time * 1000).toISOString().slice(0, 10)}`,
    `캔들 수: ${candles.length}개`,
    `고가: ${highPrice.toLocaleString()} / 저가: ${lowPrice.toLocaleString()}`,
    `현재가: ${lastPrice.toLocaleString()} (변동률: ${changePct}%)`,
    `고점 피벗: ${highs.length}개 / 저점 피벗: ${lows.length}개`,
    `채널 방향: ${trendDir}`,
    positionInChannel ? `현재 위치: ${positionInChannel}` : "",
    `3-3 원칙: 고점 ${highs.length >= 3 ? "충족" : "미충족"}(${highs.length}개), 저점 ${lows.length >= 3 ? "충족" : "미충족"}(${lows.length}개)`,
    srFlips.length > 0 ? `S/R Flip: ${srFlips.map((l) => l.label).join(", ")}` : "",
    `RSI(14): ${indicators.rsi}`,
    `MACD: ${indicators.macd.macd} / Signal: ${indicators.macd.signal} (${indicators.macd.trend === "bullish" ? "강세" : "약세"})`,
    `볼린저밴드: 상단 ${indicators.bb.upper.toLocaleString()} / 중간 ${indicators.bb.middle.toLocaleString()} / 하단 ${indicators.bb.lower.toLocaleString()} (현재 ${indicators.bb.position === "above" ? "상단 이탈" : indicators.bb.position === "below" ? "하단 이탈" : "밴드 내"})`,
    `이동평균: MA5=${indicators.ma5.toLocaleString()} MA20=${indicators.ma20.toLocaleString()} MA60=${indicators.ma60.toLocaleString()} (${maAlignment})`,
  ].filter(Boolean).join("\n");

  // BitgakMeta 구성
  let positionPercent: number | null = null;
  if (hasChannel) {
    const lastTopMeta = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelTopIntercept)
      : channelSlope * (candles.length - 1) + channelTopIntercept;
    const lastBottomMeta = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelBottomIntercept)
      : channelSlope * (candles.length - 1) + channelBottomIntercept;
    const metaRange = lastTopMeta - lastBottomMeta;
    if (metaRange > 0) {
      positionPercent = Math.round(((lastPrice - lastBottomMeta) / metaRange) * 100);
      positionPercent = Math.max(-10, Math.min(110, positionPercent));
    }
  }

  const meta: BitgakMeta = {
    channelDirection: trendDir as BitgakMeta["channelDirection"],
    channelPosition: positionInChannel || null,
    positionPercent,
    threeThree: {
      highsMet: highs.length >= 3,
      highsCount: highs.length,
      lowsMet: lows.length >= 3,
      lowsCount: lows.length,
    },
    srFlips: srFlips.map((l) => l.label),
    priceRange: {
      high: highPrice,
      low: lowPrice,
      current: lastPrice,
      changePct: parseFloat(changePct),
    },
    period: {
      start: new Date(first.time * 1000).toISOString().slice(0, 10),
      end: new Date(last.time * 1000).toISOString().slice(0, 10),
      candleCount: candles.length,
    },
  };

  return { highs, lows, lines, summary, indicators, meta };
}
