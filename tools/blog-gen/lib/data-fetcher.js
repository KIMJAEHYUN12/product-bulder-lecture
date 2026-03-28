/**
 * Step 1: Firebase Functions API를 통한 데이터 추출
 *
 * SimplyStock이 사용하는 동일 API 엔드포인트 호출.
 * Firestore에 캐시된 데이터가 아니라, 실시간 API에서 가져옴.
 */

const { getStockInfo, getYahooSymbol } = require('./utils/stock-codes');

const API_HOST = process.env.API_HOST || 'https://bitgak.co.kr';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeout || 20000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${url} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── 개별 API 호출 ────────────────────────────────────────

/** 현재가 조회 */
async function fetchPrice(symbol) {
  const data = await fetchJSON(`${API_HOST}/api/stock-prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: [symbol] }),
  });
  return data[symbol] || null;
}

/** OHLCV 차트 데이터 (일봉) */
async function fetchChart(symbol, range = '2y') {
  const params = new URLSearchParams({ symbol, range, interval: '1d' });
  return fetchJSON(`${API_HOST}/api/stock-chart?${params}`);
}

/** 수급 동향 (KIS API) */
async function fetchInvestorTrend(symbol, days = 180) {
  return fetchJSON(`${API_HOST}/api/investor-trend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, days }),
    timeout: 15000,
  });
}

/** PER 밴드 */
async function fetchPerBand(symbol) {
  return fetchJSON(
    `${API_HOST}/api/per-band?symbol=${encodeURIComponent(symbol)}`,
    { timeout: 20000 },
  );
}

/** AI 종목 리포트 (종합 분석) */
async function fetchStockReport(symbol) {
  return fetchJSON(
    `${API_HOST}/api/stock-report?symbol=${encodeURIComponent(symbol)}`,
    { timeout: 60000 },
  );
}

// ── 메인 추출 함수 ──────────────────────────────────────

/**
 * 종목 데이터 종합 추출
 * @param {string} stockCode - 6자리 종목코드 (예: "008770")
 * @param {(msg: string) => void} onProgress - 진행 콜백
 * @returns {Promise<object>} 종합 데이터
 */
async function fetchStockData(stockCode, onProgress = () => {}) {
  const info = getStockInfo(stockCode);
  const symbol = getYahooSymbol(stockCode);

  onProgress('기본 정보 조회 중...');

  // 병렬 API 호출 (4개 동시)
  const results = await Promise.allSettled([
    fetchPrice(symbol),
    fetchChart(symbol, '2y'),
    fetchInvestorTrend(symbol, 180),
    fetchPerBand(symbol),
  ]);

  const [priceResult, chartResult, investorResult, perBandResult] = results;

  onProgress('데이터 정리 중...');

  // 에러 난 항목은 null 처리
  const price = priceResult.status === 'fulfilled' ? priceResult.value : null;
  const chart = chartResult.status === 'fulfilled' ? chartResult.value : null;
  const investor = investorResult.status === 'fulfilled' ? investorResult.value : null;
  const perBand = perBandResult.status === 'fulfilled' ? perBandResult.value : null;

  // 수급 요약 계산
  const supplySummary = investor ? summarizeSupply(investor) : null;

  const data = {
    // 기본 정보
    basic: {
      code: stockCode,
      symbol,
      name: info?.name || price?.name || stockCode,
      market: info?.market || '',
      industry: info?.industry || '',
      price: price?.price ?? null,
      change: price?.change ?? null,
      changePct: price?.changePct ?? null,
      marketCap: price?.marketCap ?? null,
    },

    // 차트 데이터 (OHLCV) — API 응답: { candles: [{time,open,high,low,close,volume}] }
    chart: chart?.candles?.length ? {
      candles: chart.candles,
      count: chart.candles.length,
      name: chart.name || '',
    } : null,

    // 수급 데이터
    supply: investor ? {
      raw: investor,
      summary: supplySummary,
    } : null,

    // 밸류에이션 — API: { currentPer, forwardPer, avgPer, perPosition, perBands:{min,p25,median,p75,max} }
    valuation: perBand ? {
      currentPer: perBand.currentPer ?? null,
      forwardPer: perBand.forwardPer ?? null,
      avgPer: perBand.avgPer ?? null,
      perPosition: perBand.perPosition ?? null,
      perBands: perBand.perBands ?? null,
      latestEps: perBand.latestEps ?? null,
    } : null,

    // 메타
    fetchedAt: new Date().toISOString(),
    errors: results
      .map((r, i) => r.status === 'rejected' ? { step: ['price', 'chart', 'investor', 'perBand'][i], error: r.reason.message } : null)
      .filter(Boolean),
  };

  return data;
}

/** 수급 데이터 요약 */
function summarizeSupply(investor) {
  if (!investor?.daily?.length) return null;

  const daily = investor.daily;
  const recent15 = daily.slice(0, 15);

  // 최근 15일 누적 — API 필드: foreign, institution, individual
  let foreignNet = 0, instNet = 0, indivNet = 0;
  for (const d of recent15) {
    foreignNet += d.foreign || 0;
    instNet += d.institution || 0;
    indivNet += d.individual || 0;
  }

  // 외인 연속 매수/매도 일수
  let foreignStreak = 0;
  if (daily.length > 0) {
    const dir = (daily[0].foreign || 0) >= 0 ? 1 : -1;
    for (const d of daily) {
      if (((d.foreign || 0) >= 0 ? 1 : -1) === dir) foreignStreak++;
      else break;
    }
    foreignStreak *= dir;
  }

  return {
    foreignNet15d: foreignNet,
    institutionNet15d: instNet,
    individualNet15d: indivNet,
    foreignStreak,
    recentDays: recent15.map(d => ({
      date: d.date,
      close: d.close,
      changePct: d.changeRate ?? d.changePct,
      foreign: d.foreign,
      institution: d.institution,
      individual: d.individual,
      foreignHolding: d.foreignTotal,
      foreignRate: d.foreignPct,
    })),
  };
}

module.exports = { fetchStockData };
