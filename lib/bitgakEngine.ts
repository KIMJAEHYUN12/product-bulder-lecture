import type { Candle, BitgakPivot, BitgakLine, BitgakResult, TechIndicators } from "@/types";

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
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² 계산
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ── 회귀선에서 가장 먼 점 기준으로 평행 채널 구축 ──
function buildChannel(
  candles: Candle[],
  pivots: BitgakPivot[],
  oppositePivots: BitgakPivot[],
  isUpperLine: boolean,
): { slope: number; intercept: number; parallelIntercept: number } | null {
  if (pivots.length < 2) return null;

  // 피벗 인덱스 기준으로 회귀
  const regressionPoints = pivots.map((p) => ({ x: p.index, y: p.price }));
  const reg = linearRegression(regressionPoints);

  // 반대편 피벗들에서 가장 먼 거리 찾기 → 평행선
  let maxDist = 0;
  for (const p of oppositePivots) {
    const predicted = reg.slope * p.index + reg.intercept;
    const dist = isUpperLine ? predicted - p.price : p.price - predicted;
    if (dist > maxDist) maxDist = dist;
  }

  // 평행선 = 같은 slope, intercept를 maxDist만큼 이동
  // 상단 기준선 → 하단 평행선은 intercept - maxDist
  // 하단 기준선 → 상단 평행선은 intercept + maxDist
  const parallelIntercept = isUpperLine
    ? reg.intercept - maxDist
    : reg.intercept + maxDist;

  return { slope: reg.slope, intercept: reg.intercept, parallelIntercept };
}

// ── 채널 라인 좌표 생성 ──
function makeLinePoints(
  candles: Candle[],
  slope: number,
  intercept: number,
): { time: number; value: number }[] {
  if (candles.length === 0) return [];
  // 시작, 중간, 끝 3포인트
  const indices = [0, Math.floor(candles.length / 2), candles.length - 1];
  return indices.map((i) => ({
    time: candles[i].time,
    value: Math.round(slope * i + intercept),
  }));
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
export function analyzeBitgak(candles: Candle[]): BitgakResult {
  if (candles.length < 15) {
    return {
      highs: [],
      lows: [],
      lines: [],
      summary: "데이터 부족: 최소 15개 캔들이 필요합니다.",
    };
  }

  // 기간에 따라 윈도우 사이즈 조절
  const windowSize = candles.length > 100 ? 7 : candles.length > 50 ? 5 : 3;
  const { highs, lows } = findPivots(candles, windowSize);

  const lines: BitgakLine[] = [];

  // 상단 채널: 고점 회귀 + 하단 평행선
  // 하단 채널: 저점 회귀 + 상단 평행선
  // 더 나은 채널을 선택 (피벗이 많은 쪽 기준)
  const useHighsAsBase = highs.length >= lows.length;

  let channelSlope = 0;
  let channelTopIntercept = 0;
  let channelBottomIntercept = 0;
  let hasChannel = false;

  if (useHighsAsBase && highs.length >= 2 && lows.length >= 1) {
    const ch = buildChannel(candles, highs, lows, true);
    if (ch) {
      channelSlope = ch.slope;
      channelTopIntercept = ch.intercept;
      channelBottomIntercept = ch.parallelIntercept;
      hasChannel = true;
    }
  } else if (!useHighsAsBase && lows.length >= 2 && highs.length >= 1) {
    const ch = buildChannel(candles, lows, highs, false);
    if (ch) {
      channelSlope = ch.slope;
      channelBottomIntercept = ch.intercept;
      channelTopIntercept = ch.parallelIntercept;
      hasChannel = true;
    }
  }

  if (hasChannel) {
    // 상단 저항선
    lines.push({
      type: "channel_top",
      label: "상단 저항",
      style: "solid",
      color: "#ef4444",
      points: makeLinePoints(candles, channelSlope, channelTopIntercept),
    });

    // 하단 지지선
    lines.push({
      type: "channel_bottom",
      label: "하단 지지",
      style: "solid",
      color: "#22c55e",
      points: makeLinePoints(candles, channelSlope, channelBottomIntercept),
    });

    // 중앙 라인
    const midIntercept = (channelTopIntercept + channelBottomIntercept) / 2;
    lines.push({
      type: "midline",
      label: "중앙 라인",
      style: "dashed",
      color: "#facc15",
      points: makeLinePoints(candles, channelSlope, midIntercept),
    });
  }

  // S/R Flip
  const srFlips = findSRFlips(candles, highs, lows);
  lines.push(...srFlips);

  // 요약 텍스트 생성 (Gemini에 넘길 데이터)
  const first = candles[0];
  const last = candles[candles.length - 1];
  const highPrice = Math.max(...candles.map((c) => c.high));
  const lowPrice = Math.min(...candles.map((c) => c.low));
  const changePct = ((last.close - first.open) / first.open * 100).toFixed(1);

  const trendDir = hasChannel
    ? channelSlope > 0.5 ? "상승" : channelSlope < -0.5 ? "하락" : "횡보"
    : "판별불가";

  const lastPrice = last.close;
  let positionInChannel = "";
  if (hasChannel) {
    const lastTop = channelSlope * (candles.length - 1) + channelTopIntercept;
    const lastBottom = channelSlope * (candles.length - 1) + channelBottomIntercept;
    const lastMid = (lastTop + lastBottom) / 2;
    if (lastPrice > lastMid) {
      positionInChannel = lastPrice > lastTop ? "채널 상단 돌파" : "채널 상단부";
    } else {
      positionInChannel = lastPrice < lastBottom ? "채널 하단 이탈" : "채널 하단부";
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

  return { highs, lows, lines, summary, indicators };
}
