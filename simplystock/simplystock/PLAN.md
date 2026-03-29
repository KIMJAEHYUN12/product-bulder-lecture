# PLAN: 종목별 AI 분석 리포트

## 개요
사용자가 종목을 검색하면, 차트(일/주/월봉) + DART 재무/공시 + 수급 데이터를 수집하고
Gemini AI가 종합 분석 리포트를 생성하는 기능.

---

## 재활용 가능한 기존 코드 (functions/index.js)

| 함수 | 용도 | 비고 |
|------|------|------|
| `fetchDartFinancials(corpCode, dartKey, year)` | 연간 재무제표 (당기순이익, 자본총계) | PER밴드에서 사용 중 |
| `getDartCorpCode(stockCode)` | 종목코드→DART코드 매핑 | 3,900개 상장사 |
| `fetchYahooPriceHistory(symbol, range)` | 장기 주가 히스토리 | 주봉, 10년치 |
| `fetchYahooSummary(symbol)` | PER, 섹터, 산업, 발행주식수 | quoteSummary |
| `parseNaverInvestorPage(html)` | 네이버 투자자 동향 크롤링 | investorTrend에서 사용 중 |
| `getKisToken()` | KIS API 인증 토큰 | |
| `GoogleGenerativeAI` + `geminiApiKey` | Gemini AI 호출 | analyze에서 사용 중 |
| Firestore 캐시 패턴 | `cache/{key}` + TTL 체크 | 모든 엔드포인트 공통 |

---

## Phase 1: 백엔드 — `stockReport` 함수 (functions/index.js)

### 1-1. 데이터 수집 (병렬)
```
Promise.all([
  1. Yahoo 일봉 차트 (6개월) — range=6mo, interval=1d
  2. Yahoo 주봉 차트 (2년) — range=2y, interval=1wk
  3. Yahoo 월봉 차트 (5년) — range=5y, interval=1mo
  4. Yahoo quoteSummary — PER, 섹터, 발행주식수
  5. DART 재무제표 (최근 3년) — fetchDartFinancials x 3
  6. DART 공시 목록 (최근 60일) — opendart list API
  7. 네이버 투자자 동향 (60일) — parseNaverInvestorPage x 3페이지
])
```

### 1-2. 서버사이드 기술지표 계산
차트 데이터에서 직접 계산 (프론트 chartEngine.ts 로직을 서버에 복제):
- 이동평균: MA5, MA20, MA60, MA120
- RSI(14)
- MACD(12,26,9)
- 볼린저밴드(20,2)
- 거래량: 20일 평균 대비 비율
- 추세: 60일 선형회귀 기울기

### 1-3. Gemini 2-pass 분석
```
Pass 1 (gemini-2.5-flash, 3개 병렬):
  A. 기술적 분석 — 차트 + 지표 데이터 → 기술 분석 JSON
  B. 재무 분석 — DART 재무 + 공시 → 재무 분석 JSON
  C. 수급 분석 — 투자자 동향 → 수급 분석 JSON

Pass 2 (gemini-2.5-flash):
  A+B+C 합산 → 종합 등급(S/A/B/C/D) + 종합 의견 + 체크리스트
```

### 1-4. 응답 구조
```json
{
  "symbol": "005930",
  "name": "삼성전자",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "grade": "B",
  "gradeLabel": "보통",
  "scores": {
    "technical": 65,
    "financial": 78,
    "supply": 55,
    "valuation": 60,
    "overall": 64
  },
  "technical": {
    "trend": "하락 추세 전환 초기",
    "maStatus": "역배열 (단기 < 중기 < 장기)",
    "rsi": 42,
    "macd": "데드크로스 직후",
    "bollinger": "하단 밴드 근접",
    "volumeRatio": 1.3,
    "keyLevels": { "support": 52000, "resistance": 58000 },
    "summary": "..."
  },
  "financial": {
    "revenue": [{ "year": 2023, "value": 258935 }, ...],
    "netIncome": [{ "year": 2023, "value": 15487 }, ...],
    "per": 12.5,
    "forwardPer": 10.2,
    "roe": 8.3,
    "debtRatio": null,
    "recentDisclosures": [
      { "title": "사업보고서 (2025.12)", "date": "2026-03-15" },
      ...
    ],
    "summary": "..."
  },
  "supply": {
    "foreignNet30d": 1500000,
    "institutionNet30d": -800000,
    "foreignStreak": 5,
    "foreignPctChange": 0.3,
    "summary": "..."
  },
  "opinion": "종합적으로...",
  "checklist": [
    { "label": "실적 성장세", "checked": true },
    { "label": "외국인 순매수", "checked": true },
    { "label": "기술적 반등 신호", "checked": false },
    { "label": "밸류에이션 매력", "checked": true },
    { "label": "공시 리스크 없음", "checked": true }
  ],
  "updatedAt": "2026-03-19T12:34:56Z"
}
```

### 1-5. 캐시 전략
- Firestore `cache/stock_report_{stockCode}`
- TTL: 24시간 (고정)
- 강제 리프레시: `?refresh=true` 파라미터

### 1-6. 함수 설정
```javascript
exports.stockReport = onRequest(
  { cors: true, secrets: [geminiApiKey, dartApiKey], memory: "512MiB", timeoutSeconds: 120 },
  async (req, res) => { ... }
);
```

---

## Phase 2: 프론트엔드

### 2-1. 타입 정의 (`src/types/stockReport.ts`)
- `StockReportData` — 응답 전체 타입
- `TechnicalAnalysis`, `FinancialAnalysis`, `SupplyAnalysis` — 섹션별 타입
- `ChecklistItem` — 체크리스트 항목

### 2-2. API wrapper (`src/lib/api.ts`에 추가)
```typescript
export async function fetchStockReport(symbol: string): Promise<StockReportData> {
  const res = await fetch(`${FIREBASE_HOST}/api/stock-report?symbol=${encodeURIComponent(symbol)}`, {
    signal: AbortSignal.timeout(30000), // 최대 30초
  });
  if (!res.ok) throw new Error("리포트 생성 실패");
  return res.json();
}
```

### 2-3. UI 컴포넌트 (`src/components/stock/StockReport.tsx`)
7개 섹션:
1. **종합 등급 카드** — S~D 등급 + 레이더 차트 (5축)
2. **기술적 분석** — 이평선 배열, RSI, MACD, 볼린저, 지지/저항
3. **재무 분석** — 매출/순이익 추이, PER, ROE
4. **수급 분석** — 외인/기관 순매매, 외인 보유율 변동
5. **DART 공시** — 최근 주요 공시 목록
6. **AI 종합 의견** — Gemini가 작성한 종합 판단
7. **투자 체크리스트** — 5개 항목 체크/미체크

### 2-4. 로딩 컴포넌트 (`src/components/stock/StockReportLoading.tsx`)
- 스켈레톤 UI (각 섹션별)
- "AI가 분석 중입니다..." 텍스트

### 2-5. 리포트 전용 페이지 (`src/app/report/[symbol]/page.tsx`)
- 별도 `/report/[symbol]/` 경로
- 클라이언트 컴포넌트 — 진입 시 fetchStockReport 호출
- 종목 검색바 상단 배치 (다른 종목 바로 분석 가능)
- 로딩 중 StockReportLoading, 완료 시 StockReport 표시
- 메타데이터: "삼성전자 AI 분석 리포트 | SimplyStock"
- 면책 문구 하단 고정
- 기존 /stock/[symbol]/ 페이지에서 "AI 리포트 보기" 링크 추가

---

## Phase 3: 연결

### 3-1. firebase.json rewrite 추가
```json
{ "source": "/api/stock-report", "function": "stockReport" }
```

### 3-2. functions/index.js exports 추가
- `exports.stockReport` 함수 등록

---

## 수정 파일 목록 (7개)

| # | 파일 | 작업 | 상태 |
|---|------|------|------|
| 1 | `functions/index.js` | stockReport 함수 추가 (~200줄) | |
| 2 | `firebase.json` | rewrite 1줄 추가 | |
| 3 | `src/types/stockReport.ts` | 신규 — 리포트 타입 정의 | |
| 4 | `src/lib/api.ts` | fetchStockReport 함수 추가 | |
| 5 | `src/components/stock/StockReport.tsx` | 신규 — 리포트 UI | |
| 6 | `src/components/stock/StockReportLoading.tsx` | 신규 — 로딩 스켈레톤 | |
| 7 | `src/app/report/[symbol]/page.tsx` | 신규 — 리포트 전용 페이지 | |
| 8 | `src/app/stock/[symbol]/page.tsx` | "AI 리포트 보기" 링크 1줄 추가 | |

---

## 비용 추정
- Gemini Flash: 입력 ~4,000 토큰 x 4회 = ~16,000 토큰/리포트
- 비용: ~$0.01/리포트 (Flash 가격)
- 24시간 캐시 → 같은 종목 재요청 무료
- 월 $100 예산 기준: 약 10,000건/월 가능

## 주의사항
- 면책 문구 필수: "투자 참고용이며 매수·매도 권유가 아닙니다"
- 로그인 불필요 (현재 단계)
- feature flag 준비: 나중에 일일 제한 + 로그인 벽 추가 가능
