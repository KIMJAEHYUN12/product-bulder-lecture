# SimplyStock 밸류에이션 시스템 전체 코드 문서

> 이 문서는 SimplyStock의 PER/PBR 밴드 분석 기능의 전체 구현을 설명합니다.
> 블로그 글 작성 시 참고용으로 제공됩니다.

---

## 1. 기능 개요

SimplyStock 밸류에이션은 **PER 밴드 + PBR 밴드** 분석 도구입니다.

- 한국 주식: DART 공시 재무제표 기반 (최대 10년)
- 해외 주식: Yahoo Finance 기반
- PER 밴드: 5개 분위수 (5%, 25%, 50%, 75%, 95%)로 과거 주가 범위를 시각화
- PBR 밴드: 한국 주식만 지원 (자본총계 데이터 필요)
- 현재 주가가 밴드 어디에 위치하는지로 고평가/저평가 판단

### 핵심 지표
| 지표 | 설명 |
|------|------|
| PER (주가수익비율) | 주가 / EPS. 이익 대비 주가 수준 |
| PBR (주가순자산비율) | 주가 / BPS. 자산 대비 주가 수준 |
| EPS (주당순이익) | 당기순이익 / 발행주식수 |
| BPS (주당순자산) | 자본총계 / 발행주식수 |
| Forward PER | 향후 12개월 예상 실적 기준 PER |
| PER Position | 현재 PER이 과거 분포에서 차지하는 위치 (0~100%) |

### 업종별 PER 참고범위
| 업종 | PER 범위 |
|------|----------|
| IT/테크 | 15~30배 |
| 금융 | 5~12배 |
| 헬스케어 | 20~50배 |
| 산업재 | 8~15배 |
| 경기소비재 | 10~20배 |
| 필수소비재 | 15~25배 |
| 에너지 | 5~15배 |
| 소재 | 8~15배 |
| 커뮤니케이션 | 15~25배 |
| 부동산 | 15~30배 |
| 유틸리티 | 10~20배 |

---

## 2. 데이터 흐름 (API 엔드포인트)

**엔드포인트**: `GET /api/per-band?symbol={symbol}`

### 처리 순서:

```
1. 심볼 정규화 (005930 → 005930.KS)
2. Firestore 캐시 확인 (24시간 TTL)
3. 병렬 데이터 수집:
   - Yahoo Finance: 10년 주가 히스토리 (주봉)
   - Yahoo Finance: forwardPe, sharesOutstanding, sector, industry
4. EPS 히스토리 수집:
   - 한국: DART API (10년간 연간 재무제표 병렬 조회)
   - 해외: Yahoo Finance yearly earnings
5. 발행주식수 폴백 (한국): Naver 모바일 API
6. PER 밴드 계산
7. PBR 밴드 계산 (한국 주식만)
8. Firestore 캐시 저장
9. 응답 반환
```

---

## 3. 백엔드 코드 (Firebase Functions)

### 3-1. 메인 엔드포인트

```javascript
// Firebase Functions v2
exports.perBand = onRequest(
  { cors: true, secrets: [dartApiKey], memory: "512MiB", timeoutSeconds: 60 },
  async (req, res) => {
    const rawSymbol = (req.query.symbol || "").trim();
    if (!rawSymbol) {
      res.status(400).json({ error: "symbol parameter required" });
      return;
    }

    // 심볼 정규화: 005930 → 005930.KS
    let symbol = rawSymbol;
    const stockCode = rawSymbol.replace(/\.\w+$/, "");
    const isKorean = rawSymbol.endsWith(".KS") || rawSymbol.endsWith(".KQ") || /^\d{6}$/.test(rawSymbol);
    if (isKorean && !rawSymbol.includes(".")) {
      const mapped = KR_STOCK_MAP.find((s) => s.symbol === `${rawSymbol}.KS` || s.symbol === `${rawSymbol}.KQ`);
      symbol = mapped ? mapped.symbol : `${rawSymbol}.KS`;
    }

    // 1. Firestore 캐시 확인 (24시간 TTL)
    const cacheKey = `per_band_v2_${stockCode}`;
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      if (cached.data && Date.now() - cached.fetchedAt < PER_BAND_CACHE_TTL) {
        res.json(cached.data);
        return;
      }
    }

    // 2. 가격 히스토리 + Yahoo 보조 데이터 병렬 조회
    const [priceResult, yahooData] = await Promise.all([
      fetchYahooPriceHistory(symbol, "10y"),
      fetchYahooSummary(symbol),
    ]);
    if (!priceResult || priceResult.prices.length < 50) {
      res.status(404).json({ error: "주가 데이터가 충분하지 않습니다" });
      return;
    }

    // 3. EPS 히스토리 조회
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 1 - i);
    let epsHistory = [];
    let equityHistory = [];
    let sharesOutstanding = yahooData.sharesOutstanding;
    let forwardPe = yahooData.forwardPe;

    if (isKorean) {
      // DART API로 한국 주식 EPS 수집
      const dartKey = dartApiKey.value();
      const corpCode = getDartCorpCode(stockCode);
      if (!corpCode) {
        res.status(404).json({ error: "DART에서 종목을 찾을 수 없습니다" });
        return;
      }

      // 연도별 재무제표 병렬 조회
      const financialResults = await Promise.allSettled(
        years.map((year) => fetchDartFinancials(corpCode, dartKey, year))
      );

      for (let i = 0; i < years.length; i++) {
        const result = financialResults[i];
        if (result.status === "fulfilled" && result.value != null) {
          if (result.value.netIncome != null) {
            epsHistory.push({ year: years[i], netIncome: result.value.netIncome });
          }
          if (result.value.equity != null) {
            equityHistory.push({ year: years[i], equity: result.value.equity });
          }
        }
      }
    } else {
      // 해외 주식: Yahoo Finance
      if (yahooData.yearlyEarnings.length > 0 && sharesOutstanding) {
        for (const ye of yahooData.yearlyEarnings) {
          if (ye.earnings != null) {
            epsHistory.push({ year: ye.year, netIncome: ye.earnings });
          }
        }
      }
    }

    // Naver 폴백 (한국 주식)
    if ((!sharesOutstanding || !forwardPe) && isKorean) {
      const naverInfo = await fetchNaverStockInfo(stockCode);
      if (naverInfo) {
        if (!sharesOutstanding && naverInfo.sharesOutstanding) {
          sharesOutstanding = naverInfo.sharesOutstanding;
        }
        if (!forwardPe && naverInfo.forwardPer) {
          forwardPe = naverInfo.forwardPer;
        }
      }
    }

    // 4. PER 밴드 계산
    const bandResult = calculatePerBand(priceResult.prices, epsHistory, sharesOutstanding);

    // 5. PBR 밴드 계산 (한국 주식 + equity 데이터 있을 때만)
    let pbrResult = null;
    if (isKorean && equityHistory.length >= 2) {
      pbrResult = calculatePbrBand(priceResult.prices, equityHistory, sharesOutstanding);
    }

    // 응답 조합
    const response = {
      symbol: stockCode,
      name: priceResult.name,
      currency: priceResult.currency,
      currentPer: bandResult.currentPer,
      forwardPer: forwardPe,
      avgPer: bandResult.avgPer,
      perPosition: bandResult.perPosition,
      latestEps: bandResult.latestEps,
      epsHistory: bandResult.epsData,
      perBands: bandResult.perBands,
      bandChart: bandResult.bandChart,
      lossYears: bandResult.lossYears,
      sector: yahooData.sector,
      industry: yahooData.industry,
      ...(pbrResult && {
        currentPbr: pbrResult.currentPbr,
        avgPbr: pbrResult.avgPbr,
        pbrPosition: pbrResult.pbrPosition,
        latestBps: pbrResult.latestBps,
        pbrBands: pbrResult.pbrBands,
        pbrBandChart: pbrResult.pbrBandChart,
      }),
    };

    // 캐시 저장
    await db.doc(`cache/${cacheKey}`).set({ data: response, fetchedAt: Date.now() });
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.json(response);
  }
);
```

### 3-2. PER 밴드 계산 알고리즘

```javascript
function calculatePerBand(prices, epsHistory, sharesOutstanding) {
  if (!prices.length || !epsHistory.length || !sharesOutstanding) return null;

  // EPS 계산 (당기순이익 / 발행주식수)
  const allEpsData = epsHistory
    .filter((e) => e.netIncome != null)
    .map((e) => ({
      year: e.year,
      eps: Math.round((e.netIncome / sharesOutstanding) * 100) / 100,
    }));
  const epsData = allEpsData.filter((e) => e.eps > 0).sort((a, b) => a.year - b.year);
  const lossYears = allEpsData.length - epsData.length;  // 적자 연도 카운트

  if (epsData.length < 2) return null;

  // 각 가격 데이터에 해당 시점의 trailing EPS 매칭
  const bandChart = [];
  const allPers = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    // 해당 연도 이전의 가장 최근 EPS 사용 (trailing)
    let trailingEps = null;
    for (let i = epsData.length - 1; i >= 0; i--) {
      if (epsData[i].year <= priceYear) {
        trailingEps = epsData[i].eps;
        break;
      }
    }
    if (!trailingEps || trailingEps <= 0) continue;
    const per = Math.round((p.close / trailingEps) * 100) / 100;
    if (per > 0 && per < 200) { // 이상치 제거
      allPers.push(per);
      bandChart.push({ date: p.date, close: p.close, eps: trailingEps, per });
    }
  }

  if (allPers.length < 10) return null;

  // PER 분위수 계산 (5%, 25%, 50%, 75%, 95%)
  allPers.sort((a, b) => a - b);
  const percentile = (arr, p) => {
    const idx = (p / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const frac = idx - lo;
    return Math.round((arr[lo] * (1 - frac) + arr[hi] * frac) * 100) / 100;
  };

  const perBands = {
    min: percentile(allPers, 5),    // 하단 5%
    p25: percentile(allPers, 25),   // 25%
    median: percentile(allPers, 50), // 중앙값
    p75: percentile(allPers, 75),   // 75%
    max: percentile(allPers, 95),   // 상단 95%
  };

  // 밴드 가격선 추가 (각 시점의 EPS × PER 분위수 = 밴드 가격)
  for (const point of bandChart) {
    point.bandMin = Math.round(point.eps * perBands.min);
    point.band25 = Math.round(point.eps * perBands.p25);
    point.bandMed = Math.round(point.eps * perBands.median);
    point.band75 = Math.round(point.eps * perBands.p75);
    point.bandMax = Math.round(point.eps * perBands.max);
  }

  // 현재 PER 위치 (0~100) — 과거 전체 PER 분포에서 현재 PER이 차지하는 백분위
  const latestPer = bandChart[bandChart.length - 1]?.per || 0;
  const perPosition = Math.round(
    (allPers.filter((p) => p <= latestPer).length / allPers.length) * 100
  );

  const avgPer = Math.round((allPers.reduce((s, v) => s + v, 0) / allPers.length) * 100) / 100;

  return {
    epsData,          // [{year, eps}, ...]
    perBands,         // {min, p25, median, p75, max}
    bandChart,        // [{date, close, bandMin, band25, bandMed, band75, bandMax, eps, per}, ...]
    currentPer: latestPer,
    avgPer,
    perPosition,
    latestEps: epsData[epsData.length - 1]?.eps || 0,
    lossYears,
  };
}
```

### 3-3. PBR 밴드 계산 알고리즘

```javascript
/** PBR 밴드 계산 (자본총계 기반, 한국 주식만) */
function calculatePbrBand(prices, equityHistory, sharesOutstanding) {
  if (!prices.length || !equityHistory.length || !sharesOutstanding) return null;

  // BPS 계산 (자본총계 / 발행주식수)
  const bpsData = equityHistory
    .filter((e) => e.equity != null && e.equity > 0)
    .map((e) => ({
      year: e.year,
      bps: Math.round((e.equity / sharesOutstanding) * 100) / 100,
    }))
    .sort((a, b) => a.year - b.year);

  if (bpsData.length < 2) return null;

  // 각 가격에 trailing BPS 매칭
  const bandChart = [];
  const allPbrs = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    let trailingBps = null;
    for (let i = bpsData.length - 1; i >= 0; i--) {
      if (bpsData[i].year <= priceYear) {
        trailingBps = bpsData[i].bps;
        break;
      }
    }
    if (!trailingBps || trailingBps <= 0) continue;
    const pbr = Math.round((p.close / trailingBps) * 100) / 100;
    if (pbr > 0 && pbr < 30) { // 이상치 제거 (PBR 30 이상은 비정상)
      allPbrs.push(pbr);
      bandChart.push({ date: p.date, close: p.close, bps: trailingBps, pbr });
    }
  }

  if (allPbrs.length < 10) return null;

  // PBR 분위수 계산 (PER과 동일한 로직)
  allPbrs.sort((a, b) => a - b);
  const percentile = (arr, pc) => {
    const idx = (pc / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const frac = idx - lo;
    return Math.round((arr[lo] * (1 - frac) + arr[hi] * frac) * 100) / 100;
  };

  const pbrBands = {
    min: percentile(allPbrs, 5),
    p25: percentile(allPbrs, 25),
    median: percentile(allPbrs, 50),
    p75: percentile(allPbrs, 75),
    max: percentile(allPbrs, 95),
  };

  // 밴드 가격선 (BPS × PBR 분위수)
  for (const point of bandChart) {
    point.bandMin = Math.round(point.bps * pbrBands.min);
    point.band25 = Math.round(point.bps * pbrBands.p25);
    point.bandMed = Math.round(point.bps * pbrBands.median);
    point.band75 = Math.round(point.bps * pbrBands.p75);
    point.bandMax = Math.round(point.bps * pbrBands.max);
  }

  const latestPbr = bandChart[bandChart.length - 1]?.pbr || 0;
  const pbrPosition = Math.round(
    (allPbrs.filter((p) => p <= latestPbr).length / allPbrs.length) * 100
  );
  const avgPbr = Math.round((allPbrs.reduce((s, v) => s + v, 0) / allPbrs.length) * 100) / 100;

  return {
    bpsData,
    pbrBands,
    pbrBandChart: bandChart,
    currentPbr: latestPbr,
    avgPbr,
    pbrPosition,
    latestBps: bpsData[bpsData.length - 1]?.bps || 0,
  };
}
```

### 3-4. 데이터 수집 보조 함수

#### DART 재무제표 조회

```javascript
/** DART 연간 재무제표에서 당기순이익 + 자본총계 추출 */
async function fetchDartFinancials(corpCode, dartKey, year) {
  // 연결재무제표(CFS) 우선, 없으면 개별재무제표(OFS) 폴백
  const url = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=CFS`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await r.json();
  if (data.status !== "000" || !data.list) {
    // CFS 없으면 OFS 시도
    if (data.status === "013") {
      const r2 = await fetch(/*OFS URL*/, { signal: AbortSignal.timeout(15000) });
      const data2 = await r2.json();
      return { netIncome: extractNetIncome(data2.list), equity: extractEquity(data2.list) };
    }
    return null;
  }
  return { netIncome: extractNetIncome(data.list), equity: extractEquity(data.list) };
}

function extractNetIncome(list) {
  // 손익계산서(IS) 또는 포괄손익계산서(CIS)에서 당기순이익 찾기
  // 우선순위: 1. 지배기업 귀속 당기순이익 → 2. 일반 당기순이익
  const isItems = list.filter((item) => item.sj_div === "IS" || item.sj_div === "CIS");
  let target = isItems.find(
    (item) => item.account_nm.includes("지배기업") && item.account_nm.includes("당기순이익")
  );
  if (!target) {
    target = isItems.find(
      (item) => item.account_nm.includes("당기순이익") && !item.account_nm.includes("주당")
    );
  }
  return parseInt(target.thstrm_amount.replace(/,/g, ""), 10);
}

function extractEquity(list) {
  // 재무상태표(BS)에서 자본총계 추출
  // 우선순위: 1. 지배기업 소유주 귀속 자본 → 2. 자본총계
  const bsItems = list.filter((item) => item.sj_div === "BS");
  let target = bsItems.find(
    (item) => item.account_nm.includes("지배기업") && item.account_nm.includes("자본")
  );
  if (!target) {
    target = bsItems.find((item) => item.account_nm === "자본총계");
  }
  return parseInt(target.thstrm_amount.replace(/,/g, ""), 10);
}
```

#### Yahoo Finance 데이터 조회

```javascript
/** Yahoo quoteSummary에서 forwardPe, sharesOutstanding, 업종 정보 조회 */
async function fetchYahooSummary(symbol) {
  // modules: defaultKeyStatistics, earnings, assetProfile
  // 반환값:
  return {
    forwardPe,          // Forward PER
    trailingPe,         // Trailing PER
    sharesOutstanding,  // 발행주식수
    yearlyEarnings,     // [{year, earnings}, ...] — 해외 주식 EPS용
    sector,             // "Technology", "Financial Services" 등
    industry,           // 상세 업종
  };
}

/** Yahoo 차트에서 장기 가격 히스토리 조회 */
async function fetchYahooPriceHistory(symbol, range = "10y") {
  // interval=1wk, range=10y → 주봉 10년
  // 반환값:
  return {
    prices: [{ date: "2024-01-15", close: 72500 }, ...],
    name: "삼성전자",
    currency: "KRW",
  };
}
```

#### Naver 모바일 API 폴백 (한국 주식)

```javascript
/** Naver 모바일 API에서 발행주식수, Forward PER 등 조회 */
async function fetchNaverStockInfo(stockCode) {
  // 두 API 병렬 호출:
  // 1. https://m.stock.naver.com/api/stock/{code}/basic → 현재가
  // 2. https://m.stock.naver.com/api/stock/{code}/integration → EPS, PER, 시총 등
  // 발행주식수 = 시총 / 현재가 (역산)
  return {
    sharesOutstanding,  // 발행주식수
    eps,                // EPS
    per,                // PER
    forwardPer,         // 추정 PER
    forwardEps,         // 추정 EPS
    marketCap,          // 시가총액 (원)
  };
}
```

---

## 4. 프론트엔드 코드

### 4-1. API 호출 (lib/api.ts)

```typescript
export async function fetchPerBand(symbol: string): Promise<PerBandData> {
  const res = await fetch(
    `${FIREBASE_HOST}/api/per-band?symbol=${encodeURIComponent(symbol)}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `PER 밴드 조회 실패 (${res.status})`);
  }
  return res.json();
}
```

### 4-2. TypeScript 타입 정의

```typescript
export interface PerBandData {
  symbol: string;
  name: string;
  currency: string;            // "KRW" | "USD"
  currentPer: number | null;   // 현재 PER
  forwardPer: number | null;   // Forward PER
  avgPer: number;              // 과거 평균 PER
  perPosition: number;         // 과거 대비 위치 (0~100%)
  latestEps: number;           // 최신 EPS
  lossYears: number;           // 적자 연도 수
  sector?: string | null;      // 업종
  industry?: string | null;    // 산업

  epsHistory: { year: number; eps: number }[];  // 연간 EPS 추이

  perBands: {
    min: number;     // 하단 5%
    p25: number;     // 25%
    median: number;  // 중앙값
    p75: number;     // 75%
    max: number;     // 상단 95%
  };

  bandChart: {
    date: string;      // "2024-01-15"
    close: number;     // 종가
    bandMin: number;   // EPS × PER하단
    band25: number;    // EPS × PER25%
    bandMed: number;   // EPS × PER중앙
    band75: number;    // EPS × PER75%
    bandMax: number;   // EPS × PER상단
    eps: number;       // trailing EPS
    per: number;       // 해당 시점 PER
  }[];

  // PBR 데이터 (한국 주식만)
  currentPbr?: number | null;
  avgPbr?: number;
  pbrPosition?: number;
  latestBps?: number;
  pbrBands?: { min: number; p25: number; median: number; p75: number; max: number };
  pbrBandChart?: {
    date: string;
    close: number;
    bandMin: number; band25: number; bandMed: number; band75: number; bandMax: number;
    bps: number;
    pbr: number;
  }[];
}
```

### 4-3. PER 밴드 차트 컴포넌트 (PerBandChart.tsx)

```typescript
// lightweight-charts 라이브러리로 밴드 차트 렌더링
// 동적 import로 번들 사이즈 최적화

const BAND_COLORS = {
  max:    { line: "#ef4444", label: "상단 95%" },   // 빨강
  p75:    { line: "#f59e0b", label: "75%" },         // 주황
  median: { line: "#6b7280", label: "중앙" },        // 회색 (점선)
  p25:    { line: "#38bdf8", label: "25%" },         // 하늘색
  min:    { line: "#22c55e", label: "하단 5%" },     // 초록
};

// 차트 구성:
// - 5개 밴드선 (아래→위 순서로 렌더링)
// - 주가 라인 (흰색, 최상위)
// - 반응형 높이: Math.min(width * 0.6, 400)
// - 다크/라이트 모드 지원
// - 마우스 휠 줌 + 핀치 줌 지원
```

### 4-4. 밸류에이션 페이지 (app/valuation/page.tsx)

페이지 구성:
1. **검색바**: 종목명/심볼 검색 → 300ms 디바운스 → 드롭다운
2. **PER 밴드 차트**: lightweight-charts 기반 인터랙티브 차트
3. **3칸 요약 카드**: 현재 PER / 평균 PER / 과거 대비 위치
4. **업종 PER 참고**: 해당 업종의 일반적 PER 범위 대비 현재 위치
5. **포워드 PER**: Yahoo Finance 기준 예상 PER
6. **적자 연도 안내**: 분석에서 제외된 적자 연도 수
7. **연간 EPS 추이**: 최대 10년간 EPS 히스토리
8. **PER 밴드 구간**: 5개 분위수의 실제 배수
9. **PBR 밴드 차트** (한국 주식만): PBR 기반 동일 분석
10. **PBR 3칸 요약 + 밴드 구간**

위치 판단 로직:
```typescript
// PER 위치에 따른 색상
const positionColor = (pos: number) => {
  if (pos <= 25) return "text-emerald-400";  // 저평가
  if (pos <= 50) return "text-sky-400";      // 다소 저평가
  if (pos <= 75) return "text-amber-400";    // 다소 고평가
  return "text-red-400";                      // 고평가
};

// 위치 라벨
const positionLabel = (pos: number) => {
  if (pos <= 20) return "저평가 구간";
  if (pos <= 40) return "다소 저평가";
  if (pos <= 60) return "적정 수준";
  if (pos <= 80) return "다소 고평가";
  return "고평가 구간";
};
```

URL 쿼리 지원: `?ticker=005930` → 해당 종목 자동 로드

---

## 5. 가이드/교육 콘텐츠

### PER 밴드 분석 활용법 (guide/valuation)

5개 섹션으로 구성:

**1. 주식이 비싼지 싼지, 어떻게 알 수 있을까**
- 주가의 절대 금액으로는 판단 불가
- 이익 대비 주가 수준 = PER
- 비유: 아파트 가격 vs 연간 임대 수익의 "몇 배"

**2. PER 밴드 차트 읽는 법**
- 최대 PER선: 역사적으로 가장 비싼 구간
- 75% 밴드: 상당히 낙관적 상태
- 중앙값: 평균적 평가 수준 (매수/매도 기준선)
- 25% 밴드: 비관적이거나 저평가 가능성
- 최소 PER선: 역사적 최저평가 (실적 악화 가능성도 점검 필요)

**3. EPS와 Forward PER의 의미**
- Trailing PER: 최근 4분기 확정 실적 기준 (과거 반영)
- Forward PER: 향후 12개월 예상 실적 기준 (미래 기대)
- "EPS 추이를 함께 보세요" — 낮은 PER이 저평가가 아닌 실적 악화일 수 있음

**4. 업종별 PER 해석 차이**
- IT/반도체: 15~30배도 정상 (성장 기대)
- 바이오/헬스: 50배 이상도 흔함 (적자 기업은 PSR 사용)
- 금융/은행: 5~10배가 일반적 (15배 이상이면 고평가)
- 제조/화학: 8~15배 (경기 민감, 호황기에 PER 낮아지는 역설)
- "동일 업종 내에서 비교" 원칙

**5. PER 밴드만 보면 안 되는 이유**
- 적자 전환의 함정: EPS 마이너스 → PER 무의미
- 일회성 이익의 함정: 일시적 EPS 급증 → 거짓 저평가
- 성장 둔화의 함정: 과거 밴드가 더 이상 유효하지 않음
- "수급 흐름, 실적 추이, 업황 분석과 함께 종합적으로 활용"

### 밸류에이션 용어 사전 (dictionary/valuation)

| 지표 | 공식 | 핵심 해석 |
|------|------|-----------|
| PER | 주가 / EPS | 낮을수록 이익 대비 저평가 (업종별 비교 필수) |
| PBR | 주가 / BPS | 1 미만이면 장부가치보다 싸게 거래 (자산 업종에서 유용) |
| ROE | 당기순이익 / 자기자본 × 100 | 15% 이상이면 우량 (부채비율 함께 확인) |
| EPS | 당기순이익 / 발행주식수 | 꾸준한 증가 = 이익 성장력 신호 |

---

## 6. 캐시 전략

| 항목 | TTL | 저장소 |
|------|-----|--------|
| PER 밴드 데이터 | 24시간 | Firestore (`cache/per_band_v2_{code}`) |
| HTTP 캐시 | 1시간 | CDN (`Cache-Control: public, max-age=3600`) |
| Yahoo crumb/cookie | 30분 | 인메모리 |

---

## 7. 데이터 출처 요약

| 데이터 | 한국 주식 | 해외 주식 |
|--------|-----------|-----------|
| 주가 히스토리 | Yahoo Finance (10년 주봉) | Yahoo Finance (10년 주봉) |
| 당기순이익 (EPS 계산용) | DART API (연간 재무제표) | Yahoo Finance (yearly earnings) |
| 자본총계 (BPS 계산용) | DART API (재무상태표) | 미지원 |
| 발행주식수 | Yahoo Finance → Naver 폴백 | Yahoo Finance |
| Forward PER | Yahoo Finance → Naver 폴백 | Yahoo Finance |
| 업종/산업 분류 | Yahoo Finance (assetProfile) | Yahoo Finance (assetProfile) |

---

## 8. 기술 스택

- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS
- **차트 라이브러리**: lightweight-charts (TradingView 오픈소스)
- **백엔드**: Firebase Functions v2 (Node.js)
- **데이터 소스**: DART OpenAPI, Yahoo Finance, Naver Stock API
- **캐시**: Firestore + HTTP Cache-Control
- **호스팅**: Firebase Hosting (static export)
