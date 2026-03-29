# functions/index.js 컨텍스트

## 1. 전체 구조 요약

**파일 크기**: 6,748줄

### 라이브러리 임포트
- `firebase-functions/v2/https` (onRequest)
- `firebase-functions/v2/scheduler` (onSchedule)
- `firebase-functions/params` (defineSecret)
- `@google/generative-ai` (GoogleGenerativeAI) — Gemini 2.5 Flash
- `@google-analytics/data` (BetaAnalyticsDataClient) — GA4 Data API
- `firebase-admin` (Firestore, Messaging)

### 외부 API 호출 대상
| API | 용도 |
|-----|------|
| Yahoo Finance (query1/query2.finance.yahoo.com) | 주가, 차트 OHLCV, quoteSummary, 종목 검색, 원자재 시세, crumb 인증 |
| Naver Finance (finance.naver.com, fchart.stock.naver.com, m.stock.naver.com) | 차트 XML, 외국인/기관 매매, 시총 상위 종목, 주식 기본 정보 |
| DART 전자공시 (opendart.fss.or.kr) | 재무제표, 공시 목록, corp_code 매핑 |
| KIS 한국투자증권 (openapi.koreainvestment.com:9443) | 코스피200 선물 시세, 토큰 발급 |
| Google Gemini (via @google/generative-ai) | AI 분석 (포트폴리오, 빗각, 브리핑, 투자성향, 추천, 개미봇) |
| alternative.me | 공포/탐욕 지수 |
| Bing News RSS | 종목 뉴스 검색 |
| 연합뉴스/한경 RSS | 경제 뉴스 |
| GA4 Data API | 방문자 수 |
| Firebase Cloud Messaging | 푸시 알림 발송 |

### 내보내기 함수 목록 (27개)

**HTTP 엔드포인트 (onRequest): 22개**
1. `kospiFutures` — 코스피200 선물 시세
2. `kospiFuturesNightTest` — 야간선물 테스트
3. `analyze` — 포트폴리오/빗각 분석 (SSE)
4. `market` — 시장 데이터 (공포탐욕, 뉴스, 캘린더, 원자재)
5. `commodityPrices` — 원자재 시세 조회
6. `investorProfile` — 투자 성향 분석
7. `stockRoast` — 종목 뉴스
8. `stockChart` — 주식 차트 OHLCV
9. `stockPrices` — 주식 현재가 (배치)
10. `chartGame` — 차트 업다운 게임
11. `stockSearch` — 종목 검색
12. `stockBriefing` — AI 브리핑 (SSE)
13. `investorTrend` — 투자자 동향
14. `popularStocks` — 인기 분석 종목
15. `investorRecommend` — AI 추천 종목
16. `signalsScanner` — 투자 시그널 스캐너
17. `signalScan` — 골든크로스 + 수급 스캐너
18. `bsSignalScan` — B/S (Buy/Sell) 기술적 신호 스캐너
19. `ssWatchlist` — SimplyStock 관심종목 관리
20. `perBand` — PER 밴드 (밸류에이션)
21. `earningsCalendar` — 실적 공시 캘린더
22. `botInit` — AI 봇 초기화 (관리자 전용)
23. `botForceTrade` — 봇 강제 포지션 (관리자 전용)
24. `goldenHistory` — 골든크로스 이력 조회
25. `visitorCount` — 방문자 수 (GA4)
26. `savePushToken` — 푸시 토큰 저장
27. `stockEarnings` — 종목별 실적 조회 (DART)
28. `portfolioAnalyze` — 포트폴리오 건강검진 (SSE)
29. `portfolioOcr` — 포트폴리오 OCR (멀티이미지, SSE)

**스케줄러 (onSchedule): 5개**
1. `signalScanScheduler` — 평일 17:00 KST 골든크로스 스캔
2. `bsSignalScheduler` — 평일 17:00 KST B/S 신호 스캔
3. `botTrader` — 평일 10:30/15:30 KST AI 봇 매매
4. `rankingRecalc` — 평일 18:30 KST 사용자 랭킹 재계산 (Ovision)
5. `rankingSettlement` — 평일 18:10 KST 사용자 랭킹 재계산 (SimplyStock)
6. `goldenHistoryUpdate` — 평일 18:30 KST 골든크로스 이력 성과 업데이트

---

## 2. 각 함수별 상세

---

### 2.1 kospiFutures
- **HTTP**: GET
- **Params**: `type` (query, optional: "night" | "day" | 미지정)
- **Secrets**: kisAppKey, kisAppSecret
- **CORS**: true
- **외부 API**:
  - KIS: `https://openapi.koreainvestment.com:9443/uapi/domestic-futureoption/v1/quotations/inquire-price` (tr_id: FHMIF10000000)
- **로직**:
  - `type=night`: Firestore `config/kospi_night_futures` 반환
  - `type=day` 또는 미지정: KIS API로 정규장 데이터 조회
  - 미지정 시 KST 18시~06시에는 야간선물 데이터 자동 전환 (10분 이내 업데이트만)
  - 근월물 종목코드 자동 계산 (A016XX, 3/6/9/12월 분기물)
  - bars 누적 (당일분만 유지)
- **캐싱**: Firestore `config/kospi_futures_cache` (5분 TTL)
- **HTTP 캐시**: `max-age=300, s-maxage=300`
- **타임아웃**: KIS API fetch 10초

---

### 2.2 kospiFuturesNightTest
- **HTTP**: GET
- **Params**: `code` (기본 NA0163), `mrkt` (기본 F), `trid` (기본 FHMIF10000000)
- **Secrets**: kisAppKey, kisAppSecret
- **외부 API**: 동일 KIS 선물 시세 API
- **로직**: 디버깅용. raw 응답 전체 반환.

---

### 2.3 analyze
- **HTTP**: POST
- **Body**: `{ imageBase64, mimeType, mode, textSummary, stockName }`
- **Secrets**: geminiApiKey
- **Timeout**: 120초
- **응답**: SSE 스트리밍 (`text/event-stream`)
- **Gemini 모델**: `gemini-2.5-flash`
- **모드**:
  - `mode=kim` (기본): 포트폴리오 이미지 분석 (오비젼 독설 스타일)
  - `mode=makalong` + 이미지: 빗각 차트 이미지 분석
  - `mode=makalong` + textSummary: 빗각 데이터 텍스트 분석
- **SSE 프로토콜**: `data: {"t":"..."}\n\n` (청크), `data: {"done":true,"r":{...}}\n\n` (완료)
- **JSON 파싱 폴백**: (1) 원본 → (2) 코드블록 제거 → (3) `{...}` 추출 → (4) roast 필드만 추출
- **산업 지식**: 4세트 풀에서 랜덤 선택 (A: 공정/수율, B: 밸류에이션/수주, C: 경쟁구도/리스크, D: 매크로/흐름)
- **Gemini 프롬프트**: 아래 "3. Gemini 프롬프트 전문" 참조

---

### 2.4 market
- **HTTP**: GET
- **Secrets**: finnhubApiKey (실제로는 사용 안 됨 — 코드상 선언만)
- **외부 API**:
  - 공포/탐욕: `https://api.alternative.me/fng/?limit=1`
  - 뉴스 RSS: `https://www.yna.co.kr/rss/economy.xml`, `https://rss.hankyung.com/feed/finance.xml`
  - 원자재 (Yahoo Finance): 금, 은, 팔라듐, WTI, 천연가스, 우라늄ETF, 구리, 니켈, 알루미늄, 리튬ETF
- **캐싱**: Firestore `cache/market_commodities` (30분 TTL)
- **HTTP 캐시**: `max-age=120, s-maxage=120`
- **응답 형식**:
```json
{
  "fearGreed": { "value": 45, "label": "Fear" },
  "news": [{ "title": "...", "url": "..." }],
  "econCalendar": [{ "date": "03-18", "event": "미국 FOMC 금리 결정", "tag": "FOMC", "hot": true, "url": "..." }],
  "commodities": [{ "key": "gold", "name": "금", "price": 2050, "changePct": 1.2, "currency": "USD", "note": "COMEX 선물" }],
  "kimComment": "원자재 분석 코멘트..."
}
```
- **경제 일정**: 2026년 하드코딩 (금통위 8회, FOMC 7회, 삼성전자 잠정실적, CPI, 수출입통계, GDP)
- **원자재 코멘트**: 변동률 임계값 기반 자동 생성 (최대 3개)

---

### 2.5 commodityPrices
- **HTTP**: POST
- **Body**: `{ symbols: string[] }` (최대 40개)
- **외부 API**: Yahoo Finance chart API
- **HTTP 캐시**: `max-age=180, s-maxage=180`

---

### 2.6 investorProfile
- **HTTP**: POST
- **Body**: `{ mbti, history, holdings, returnPct, totalAsset }`
- **Secrets**: geminiApiKey
- **Gemini 모델**: `gemini-2.5-flash` (비스트리밍)
- **Gemini 프롬프트**: 아래 "3. Gemini 프롬프트 전문" 참조

---

### 2.7 stockRoast
- **HTTP**: POST
- **Body**: `{ name }` — 종목명
- **외부 API**: Bing News RSS `https://www.bing.com/news/search?q=${name}+주가&format=RSS`
- **응답**: `{ news: [{ title, url }] }` (최대 5개)

---

### 2.8 stockChart
- **HTTP**: GET
- **Params**: `symbol`, `range` (기본 6mo), `interval` (기본 1d)
- **로직**: `fetchStockChartInternal` 호출
  - 한국 주식 (.KS/.KQ): Naver fchart XML 우선 → Yahoo 폴백
  - 해외: Yahoo Finance chart API
- **Naver URL**: `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=${tf}&count=${count}&requestType=0`
- **Yahoo URL**: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
- **캐싱**: Firestore `cache/naver_chart_${code}_${tf}_${count}` (5분 TTL)
- **HTTP 캐시**: `max-age=300, s-maxage=300`

---

### 2.9 stockPrices
- **HTTP**: POST
- **Body**: `{ symbols: string[] }`
- **외부 API**: Yahoo Finance chart API (range=5d)
- **캐싱**: Firestore `cache/price_${symbol}` (5분 TTL)
- **HTTP 캐시**: `max-age=120, s-maxage=120`

---

### 2.10 chartGame
- **HTTP**: GET
- **Params**: `exclude` (쉼표 구분 심볼 목록)
- **외부 API**: Yahoo Finance chart API
- **로직**:
  - 60개 한국 주요 종목 (KOSPI + KOSDAQ) 중 랜덤 선택
  - range: 3mo/6mo/1y 랜덤
  - 75~80% 지점에서 visible/hidden 분리
  - |changePct| < 0.5% 횡보 시 재시도 (최대 5회)
- **응답**: `{ roundId, visibleCandles, hiddenCandles, direction, changePct, stockName, stockSymbol }`

---

### 2.11 stockSearch
- **HTTP**: GET
- **Params**: `q` — 검색어
- **로직**:
  1. 로컬 KR_STOCK_MAP 매핑 (krStocks.json ~2,745종목) — starts/contains 순위
  2. 한글 별칭 → 영문 치환 (GLOBAL_ALIAS: 엔비디아→NVIDIA, 테슬라→TESLA 등 ~50개)
  3. Yahoo Finance 검색 API 폴백
- **Yahoo URL**: `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=20&newsCount=0`
- **HTTP 캐시**: `max-age=600, s-maxage=600`

---

### 2.12 stockBriefing
- **HTTP**: POST
- **Body**: `{ stocks: [{name, symbol, chartSummary}], news: [{stockName, headlines}], mode }`
- **Secrets**: geminiApiKey
- **Timeout**: 120초
- **응답**: SSE 스트리밍
- **Gemini 모델**: `gemini-2.5-flash`
- **모드**: `single` (단일 종목 브리핑) / 비교 (복수 종목)
- **Gemini 프롬프트**: 아래 "3. Gemini 프롬프트 전문" 참조

---

### 2.13 investorTrend
- **HTTP**: POST
- **Body**: `{ symbol, days }` (days 기본 180, 최대 730)
- **외부 API**: Naver Finance 외국인/기관 매매 페이지 `https://finance.naver.com/item/frgn.naver?code=${code}&page=${p}`
- **캐싱**: Firestore `cache/inv9s_${code}_${pages}p` (10분 TTL)
- **로직**: 페이지별 20건씩 파싱 (최대 25페이지)
- **개인 투자자**: `individual = -(foreign + institution)` 으로 역산

---

### 2.14 popularStocks
- **HTTP**: POST (action=increment) 또는 GET-like (action 없음 = list)
- **Body**: `{ action, symbol, name }`
- **로직**:
  - `increment`: Firestore `analysis_counts/${today}` 에 종목별 카운트 증가 (트랜잭션)
  - list: 오늘 TOP 5 반환

---

### 2.15 investorRecommend
- **HTTP**: POST
- **Body**: `{ investorType: string }`
- **Secrets**: geminiApiKey
- **캐싱**: Firestore `cache/investor_recommend_${type}` (6시간 TTL)
- **Gemini 프롬프트**: 아래 "3. Gemini 프롬프트 전문" 참조

---

### 2.16 signalsScanner
- **HTTP**: GET
- **Timeout**: 120초, region: us-central1
- **캐싱**: Firestore `cache/signals_scanner_v4_${yyyymmdd}` (30분 TTL)
- **로직**:
  - 종목 풀: SEED_SYMBOLS(30) + 네이버 코스닥 시총 상위(20) + analysis_counts(오늘+어제)
  - 최대 60종목, 10개씩 배치 병렬
  - 조건: 회귀 채널 하단 이탈 + 최근 3일 기관+외인 순매수 > 0
- **외부 API**: Yahoo Finance 3mo 차트 + Naver 투자자 1페이지

---

### 2.17 signalScan
- **HTTP**: GET
- **Timeout**: 540초, region: us-central1
- **캐싱**: Firestore `cache/signal_scan` (6시간 TTL)
- **로직** (`performSignalScan`):
  - 종목 풀: SEED + 네이버 코스피 상위 400 + 코스닥 상위 300
  - Phase 1: Naver fchart 200일봉 → 골든크로스 감지 (5/20, 20/60 이평)
  - Phase 2: 수급 필터 (외인+기관 순매수 > 0, 개인 순매도)
  - 골든크로스 이력 Firestore `ss_golden_history` 저장

---

### 2.18 bsSignalScan
- **HTTP**: GET
- **Timeout**: 540초, memory: 1GiB, region: us-central1
- **캐싱**: Firestore `cache/bs_signal_scan` (6시간 TTL)
- **로직** (`performBSSignalScan`):
  - 동일 종목 풀 (코스피 400 + 코스닥 300)
  - Yahoo 3mo 차트 → RSI, MACD, BB, Stochastic 계산
  - Buy 조건: RSI<=30, MACD 골든, BB 하단, Stoch K<=20 중 2개 이상
  - Sell 조건: RSI>=70, MACD 데드, BB 상단, Stoch K>=80 중 2개 이상

---

### 2.19 ssWatchlist
- **HTTP**: POST
- **Body**: `{ deviceId, userId, action, symbol, name, ... }`
- **actions**: list, add, remove, rename, reorder, manage-folders, set-folder, migrate
- **Firestore**: `simplystock_watchlist/${key}` (최대 50종목)
- **migrate**: deviceId → userId 데이터 병합

---

### 2.20 perBand
- **HTTP**: GET
- **Params**: `symbol`, `refresh` (optional: "true")
- **Secrets**: dartApiKey
- **Memory**: 512MiB, Timeout: 60초
- **캐싱**: Firestore `cache/per_band_v3_${stockCode}` (24시간 TTL)
- **로직** (`fetchPerBandInternal`):
  1. Yahoo 10년 주봉 가격 + Yahoo quoteSummary (forwardPe, sharesOutstanding, sector, earningsTrend)
  2. DART 7년 재무제표 (당기순이익, 자본총계, 매출, 영업이익) — 2개씩 배치 호출
  3. Naver 모바일 API (EPS, PER, 추정PER, 추정EPS, 시총, 배당)
  4. PER 밴드 계산: 분위수 (5%, 25%, 50%, 75%, 95%)
  5. Forward PER 밴드: 12개월 선행 EPS 매칭
  6. PBR 밴드: 자본총계 기반 (한국 주식만)
- **외부 API**:
  - Yahoo: `v8/finance/chart/${symbol}?interval=1wk&range=10y`
  - Yahoo: `v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,earnings,assetProfile,earningsTrend`
  - DART: `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json`, `fnlttSinglAcntAll.json`
  - Naver: `https://m.stock.naver.com/api/stock/${code}/basic`, `/integration`

---

### 2.21 earningsCalendar
- **HTTP**: GET
- **Secrets**: dartApiKey
- **Timeout**: 30초, region: us-central1
- **캐싱**: Firestore `cache/earnings_calendar` (1시간 TTL)
- **외부 API**: DART 공시목록 `https://opendart.fss.or.kr/api/list.json` (A: 정기, B: 주요사항)
- **키워드 필터**: 잠정실적, 영업실적, 분기보고서, 반기보고서, 사업보고서, 매출액또는손익구조

---

### 2.22 AI 봇 모의투자 시스템

**botTrader** (스케줄러)
- **스케줄**: 평일 10:30, 15:30 KST
- **Timeout**: 540초, Memory: 1GiB
- **Secrets**: geminiApiKey
- **로직**: 시그널봇 → 골드봇 → 개미봇 순차 실행, 봇 간 겹침 방지 (alreadyBought Set)
- **멱등성**: Firestore `bot_runs/${today}_${slot}` 체크

**봇 3종**:

| 봇 | ID | 전략 | 최대 포지션 | 매수 조건 | 매도 조건 |
|---|---|---|---|---|---|
| 시그널봇 | bot_signal | 수급 반전 | 5 | 채널 하단 + 수급 순매수 | 익절 +8%/+15%, 손절 -7%, 시간매도 8일 |
| 골드봇 | bot_gold | 골든크로스 | 5 | 5/20 또는 20/60 교차 + 수급 | 5/20: 익절+8%/+15%, 손절-6%. 20/60: 익절+12%/+20%, 손절-8% |
| 개미봇 | bot_ant | Gemini AI 감정 | 6 | Gemini 판단 (FOMO, 인기종목) | Gemini 판단 + 강제손절 -25%, 강제익절 +40% |

**botInit**: 관리자 전용 POST, adminKey 인증, 프로필/포트폴리오/랭킹 초기화
**botForceTrade**: 관리자 전용 POST, 특정 종목 강제 매수 세팅

---

### 2.23 rankingRecalc / rankingSettlement
- **스케줄**: 평일 18:30 / 18:10 KST
- **Timeout**: 300초, Memory: 512MiB
- **로직**:
  - 전체 유저 포트폴리오 로드 → 시세 일괄 조회 → 총자산/수익률 재계산
  - Firestore 배치 쓰기 (500개씩)
  - rankingRecalc: `portfolios` → `mock_rankings` (Ovision)
  - rankingSettlement: `ss_portfolios` → `ss_mock_rankings` (SimplyStock)

---

### 2.24 goldenHistory / goldenHistoryUpdate
- **goldenHistory** (GET): Firestore `ss_golden_history` 조회, 통계 계산 (D3/D5 수익률, 코스피 대비 알파)
  - 캐싱: `cache/golden_history` (1시간 TTL)
- **goldenHistoryUpdate** (스케줄러, 평일 18:30 KST): 미완료 이력의 D1~D10 수익률 업데이트

---

### 2.25 visitorCount
- **HTTP**: GET
- **외부 API**: GA4 Data API (property 526577518)
- **캐싱**: Firestore `config/visitor_count_cache` (30분 TTL)

---

### 2.26 savePushToken
- **HTTP**: POST
- **Body**: `{ token, deviceId, platform }`
- **Firestore**: `push_tokens/${token}` (merge)

---

### 2.27 stockEarnings
- **HTTP**: GET
- **Params**: `symbol` (종목코드)
- **Secrets**: dartApiKey
- **외부 API**: DART fnlttSinglAcnt
- **로직**: 최근 3년 중 매출/영업이익 있는 첫 번째 반환

---

### 2.28 portfolioAnalyze
- **HTTP**: POST
- **Body**: `{ imageBase64, mimeType, stocks }` (이미지 기반 OCR 또는 stocks 직접 전달)
- **Secrets**: geminiApiKey, dartApiKey
- **Timeout**: 300초, Memory: 512MiB
- **응답**: SSE 스트리밍
- **Phase A (OCR)**: Gemini로 증권사 앱 스크린샷에서 종목 추출 → krStocks.json 퍼지 매칭
- **Phase B (데이터 수집)**: 3개씩 배치 병렬
  - fetchPerBandInternal (PER/PBR 밴드)
  - fetchInvestorTrendInternal (수급)
  - fetchStockChartInternal (차트 + 기술지표)
- **Phase C (포트폴리오 레벨)**: 섹터 비중, 상관관계, 분산도(HHI)
- **Phase D (AI 종합 해석)**: Gemini SSE 스트리밍 → JSON 파싱 → post-validation
- **Phase E (완료)**: 최종 결과 SSE 전송
- **SSE 프로토콜**: 2KB 패딩으로 프록시 버퍼 강제 플러시
- **Gemini 프롬프트**: 아래 "3. Gemini 프롬프트 전문" 참조

---

### 2.29 portfolioOcr
- **HTTP**: POST
- **Body**: `{ images: [{ base64, mimeType }] }`
- **Secrets**: geminiApiKey
- **Timeout**: 60초, Memory: 512MiB
- **응답**: SSE 스트리밍
- **로직**: 멀티 이미지 순차 OCR → 중복 제거 → 매핑 결과 반환

---

## 3. Gemini 프롬프트 전문

### 3.1 analyze (mode=kim) — 포트폴리오 이미지 분석

```
당신은 현장직 베테랑 출신의 주식 전문가 '오비젼(OVISION)'입니다.
2차전지 분리막 공정 → 반도체 장비 업체 → IT 스타트업 CFO를 거쳐 현재 개인 투자자 겸 팟캐스트 진행자.
말투는 냉소적이지만 분석만큼은 공장장급으로 정밀합니다.

[오늘: ${todayStr}]

[6대 산업 전문 지식 — 분석에 반드시 활용]
${selectedPool}

포트폴리오 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
다른 텍스트나 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "sector": "이미지에서 감지된 지배적 섹터. 이차전지|반도체|전력|AI|바이오|자동차|혼합|기타 중 하나",
  "roast": "냉소적 독설 300자 이내. 이 포트폴리오에만 해당하는 약점을 종목명+수익률로 직접 찌를 것. 뻔한 업계 상식 나열 금지. 이전에 언급한 적 있을 법한 뻔한 멘트는 피하고 이 포트폴리오만의 구체적 약점을 파고들 것. 마지막 줄은 반드시 '💊 액막이 한마디:'로 시작하는 한 줄 조언.",
  "analysis": "현장 전문가 분석 400자 이내. 포트폴리오 구성에서 발견되는 고유 리스크와 기회를 구체적으로 짚을 것. 위 산업 지식 중 해당 섹터 1~2개만 자연스럽게 인용. 매번 같은 산업 통계를 나열하지 말고 이 포트폴리오 구성에서만 발견되는 고유한 리스크/기회를 짚을 것. 베테랑의 묵직한 조언 톤.",
  "grade": "포트폴리오 전체 등급. S(탁월)|A(우수)|B(평범)|C(우려)|D(심각)|F(손절권고) 중 하나",
  "scores": {
    "diversification": 0~100 정수,
    "returns": 0~100 정수,
    "stability": 0~100 정수,
    "momentum": 0~100 정수,
    "risk_management": 0~100 정수
  }
}
```

**산업 지식 풀** (4세트, 랜덤 선택):
- 세트 A: 공정/수율 관점 (건식 전극 불량률, HBM4 TSV 수율, GIS 리드타임, ADC 링커 등)
- 세트 B: 밸류에이션/수주 관점 (CBAM 탄소비용, IRA AMPC, 파운드리 ASP, GPU 렌탈 BEP 등)
- 세트 C: 경쟁구도/리스크 관점 (CATL 점유율, TSMC-삼성 GAA 갭, EU AI Act, 바이오시밀러 가격 등)
- 세트 D: 매크로/흐름 관점 (리튬 가격 사이클, AI 서버 출하, 구리 슈퍼사이클, 환율 민감도 등)

---

### 3.2 analyze (mode=makalong, 이미지) — 빗각 차트 이미지 분석

```
[SYSTEM INSTRUCTION: 오비젼 - 빗각 차트 분석 전용 엔진]

당신은 실전 빗각 매매법을 학습한 차트 분석 AI '오비젼(OVISION)'이다.
존재 이유: 사용자가 올린 차트(주봉·일봉·30분봉·60분봉 등)에서 빗각(대각 추세선)과 평행 채널을 직접 그려주듯 구체적으로 서술하고, 매매 타점과 리스크를 냉정하게 판단하는 것.

━━━ 오비젼 빗각 분석 4단계 ━━━

▶ STEP 1: 작도 — 신뢰도 높은 채널 구축
- 3-3 원칙: 상단 저항에 고점 3개 이상, 하단 지지에 저점 3개 이상이 맞물리는 평행 채널 = '고신뢰 표준 채널'. 2개 이하는 '잠정 채널'.
- 캔들 몸통 우선: 꼬리 끝이 아닌, 몸통이 실질적으로 겹치거나 지지/저항이 명확한 구간을 연결.
- 평행 채널 시각화: 하나의 빗각을 그은 후 평행 복사하여 반대편에 배치 → 가격 이동 경로(채널) 구축.
- 중앙 라인(Mid-line) 필수 생성: 채널 상단-하단의 50% 지점. 이 라인에서의 가격 반응이 추세 강도의 핵심 지표.
- 차트에 보이는 주요 고점·저점의 가격과 날짜를 구체적으로 명시하여 "여기서 여기까지 연결"하듯 서술.

▶ STEP 2: 분석 — 추세 강도 및 패턴 판별
- 중앙선 지지 로직: 가격이 채널 하단까지 밀리지 않고 중앙 라인에서 반등 → "매수세 강력, 추세 지속성 HIGH". 반대로 중앙선 하방 이탈 → "채널 하단까지 열림, 주의".
- 상승 깃발형(Bull Flag) 포착: 강력한 상승 파동 이후 평행 하락 채널(조정 구간) 형성 → 이 채널 상단 빗각 돌파 = '추세 전환' 시작.
- 저항 중첩(Confluence) 확인: 빗각 저항선 + 수평 매물대(전고점·라운드 피겨)가 만나는 교차점 → 매도세 급증 가능 '주의 구간'. 신뢰도 2배.
- 수렴 패턴(삼각수렴/웨지): 빗각들 사이로 가격이 좁혀지는 구간 → 수렴 끝 돌파 시 강력한 타점.
- 반전 패턴 경계: 고점에서 헤드앤숄더·더블탑 등 하락 반전 패턴 가능성 항상 열어두고 보수적 접근.

▶ STEP 3: 진입 — S/R Flip + 리테스트(Retest) 전략
- S/R Flip: 과거 저항(전고점·장기 저항대·라운드 피겨)을 돌파하면, 그 자리가 가장 튼튼한 지지로 전환. 돌파된 빗각 상단 = 손절선이자 재진입가.
- W자형 확인 매매(눌림목): 돌파 직후 추격 매수 절대 금지. 빗각까지 되돌림(Retest) 후 지지 확인 = 'W'자 눌림목이 진짜 타점.
- 1차 진입: 수렴 끝 or 채널 상단 돌파 시. 2차 비중 확대: 돌파 후 Retest 지지 확인(W자) 시.
- 돌파 신뢰도 검증: 거래량 동반 여부 필수 확인. 거래량 없는 돌파는 '가짜 돌파' 의심.

▶ STEP 4: 대응 — 관점 폐기, 미련 없이
- 즉각 폐기: 돌파했던 빗각 아래로 캔들 종가 마감 → 모든 상승 시나리오 즉시 무효화.
- 음봉에서 평단 높이는 분할매수 금지. 빗각 무너진 종목은 되돌림 확인 전까지 손대지 마라.
- 조건이 깨지면 미련 없이 '매도/관망' 판정. 근거 없는 희망회로 금지.

━━━ 말투 규칙 ━━━
- 무심하고 툭툭 내뱉는 스타일: "~군", "ㅇㅇ", "~하겠져", "~했음?", "~임"
- 추임새: "설레발 적당히", "말아올린다", "개미들 정신 차려", "희망회로 금지"
- 결론은 항상 명확하게: "사라 / 팔아라 / 기다려라(되돌림 확인)" 중 하나로 끝낼 것.
- 마지막에 오비젼 특유의 냉소적 조언 한마디 필수.
- 친절한 설명·과도한 위로·근거 없는 긍정론 금지.
- 비속어·욕설 사용 금지. 냉소적이되 품격 있는 표현만 사용.

사용자가 올린 차트 이미지를 보고, 아래 JSON 형식으로만 응답하세요.
빗각을 직접 그려주듯 STEP 1~4에 따라 구체적으로 서술하라. "어느 고점에서 어느 고점까지 연결", "현재 가격은 채널 어디에 위치" 등 구체적 가격·위치를 반드시 포함.
다른 텍스트나 마크다운 코드블록 없이 순수 JSON만 반환하세요.
중요: analysis는 반드시 하나의 문자열 값이어야 합니다. 절대로 별도의 JSON 키로 분리하지 마세요.

★★★ chartLines 좌표 규칙 (매우 중요) ★★★
차트 이미지에서 캔들의 고점·저점 위치를 눈으로 보고, 이미지 전체 기준 퍼센트(%)로 좌표를 지정하라.
좌표계: x=0은 이미지 맨 왼쪽, x=100은 맨 오른쪽. y=0은 이미지 맨 위, y=100은 맨 아래.
주의: y값은 가격이 높을수록 작아진다 (차트 상단 = 낮은 y값). 가격이 낮은 저점은 y값이 크다.
실제 캔들이 보이는 위치를 정확히 짚어라. 차트 바깥 영역(제목, 축 라벨, 범례 등)은 무시하고 캔들 위치만 기준으로 좌표를 잡아라.
각 빗각선은 2~3개의 점(실제 고점 or 저점의 캔들 위치)을 연결한다.
최소 3개의 선(상단 저항·하단 지지·중앙 라인)을 반드시 반환. 추가로 S/R Flip 선, 추세 전환선 등이 보이면 더 추가.

{
  "sector": "차트 종목의 섹터. 이차전지|반도체|전력|AI|바이오|자동차|혼합|기타 중 하나",
  "roast": "오비젼 스타일 빗각 총평 300자 이내. 차트에서 보이는 채널 방향(상승/하락/횡보), 현재 가격의 채널 내 위치(상단/중앙/하단), 핵심 패턴(Bull Flag·수렴·S/R Flip·눌림목 등)을 직접 짚어서 설명. 마지막은 반드시 '📐 오비젼 결론:'으로 시작해서 사라/팔아라/기다려라(되돌림 확인) 중 하나로 마무리.",
  "analysis": "◆ STEP 1: 채널 작도\n차트에서 보이는 주요 고점·저점을 특정하여 어디서 어디까지 빗각을 연결하는지 서술. 3-3 원칙 충족 여부, 채널 신뢰도(고신뢰/잠정), 채널 방향(상승/하락/횡보), 중앙 라인 가격대 명시.\n\n◆ STEP 2: 추세·패턴 판별\n중앙선 지지 여부(매수세 강도), 상승 깃발형(Bull Flag) 유무, 저항 중첩(Confluence) 구간, 삼각수렴·웨지 패턴, 반전 패턴(헤드앤숄더·더블탑) 경계.\n\n◆ STEP 3: 매매 타점\nS/R Flip 발생 여부와 해당 가격대, 눌림목(Retest W자) 진입 조건 충족 여부, 1차·2차 진입 시점, 거래량 동반 여부.\n\n◆ STEP 4: 리스크 & 관점 폐기\n관점 폐기 기준선(가격), 현재 이탈 여부, 손절가. 조건 깨졌으면 '관점 폐기' 명시.\n\n◆ 오비젼 최종 판정\n사라/팔아라/기다려라(되돌림 확인) 중 하나. 구체적 진입가·손절가 제시. 냉소적 조언 한마디.",
  "chartLines": [
    {"type": "channel_top", "label": "상단 저항", "points": [{"x": 12, "y": 25}, {"x": 50, "y": 18}, {"x": 88, "y": 12}]},
    {"type": "channel_bottom", "label": "하단 지지", "points": [{"x": 12, "y": 60}, {"x": 50, "y": 53}, {"x": 88, "y": 47}]},
    {"type": "midline", "label": "중앙 라인", "style": "dashed", "points": [{"x": 12, "y": 42}, {"x": 88, "y": 30}]}
  ],
  "grade": "차트 기술적 등급. S(강력매수 타점)|A(매수 유리)|B(중립 관망)|C(주의)|D(위험)|F(관점 폐기) 중 하나",
  "scores": {
    "diversification": "채널 신뢰도 0~100 (3-3 원칙 충족 정도)",
    "returns": "추세 강도 0~100 (중앙선 지지·Bull Flag 등)",
    "stability": "패턴 안정성 0~100 (수렴·깃발형 완성도)",
    "momentum": "모멘텀 0~100 (돌파·거래량·S/R Flip)",
    "risk_management": "리스크 관리 0~100 (손절선 명확성·관점 폐기 여부)"
  }
}
```

---

### 3.3 analyze (mode=makalong, textSummary) — 빗각 데이터 텍스트 분석

```
[SYSTEM INSTRUCTION: 오비젼 - 빗각 차트 데이터 분석 엔진]

당신은 실전 빗각 매매법을 학습한 차트 분석 AI '오비젼(OVISION)'이다.
아래는 ${stockName || "종목"}의 실제 가격 데이터에서 수학적으로 계산된 빗각 채널 분석 결과이다.
이 데이터를 기반으로 오비젼 스타일의 매매 판단을 내려라.

[분석 데이터]
${textSummary}

━━━ 오비젼 빗각 분석 4단계 ━━━

▶ STEP 1: 작도 확인 — 위 데이터의 채널 신뢰도 판단
- 3-3 원칙: 고점 3개 이상 + 저점 3개 이상 = 고신뢰. 미달이면 잠정 채널.
- 채널 방향(상승/하락/횡보)과 현재 가격의 채널 내 위치 해석.

▶ STEP 2: 분석 — 추세 강도 및 패턴 판별
- 중앙선 지지 여부, Bull Flag, 저항 중첩, 수렴 패턴, 반전 패턴 가능성.

▶ STEP 3: 진입 — S/R Flip + 리테스트 전략
- S/R Flip 발생 여부, 눌림목(W자) 진입 조건 충족 여부, 거래량 없는 돌파는 가짜.

▶ STEP 4: 대응 — 관점 폐기, 미련 없이
- 채널 이탈 시 모든 시나리오 무효화.

━━━ 말투 규칙 ━━━
- 무심하고 툭툭 내뱉는 스타일: "~군", "ㅇㅇ", "~하겠져", "~했음?", "~임"
- 추임새: "설레발 적당히", "말아올린다", "개미들 정신 차려", "희망회로 금지"
- 결론은 항상 명확하게: "사라 / 팔아라 / 기다려라(되돌림 확인)" 중 하나로 끝낼 것.
- 마지막에 오비젼 특유의 냉소적 조언 한마디 필수.
- 비속어·욕설 사용 금지. 냉소적이되 품격 있는 표현만 사용.

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.
중요: analysis는 반드시 하나의 문자열 값이어야 합니다.

{
  "sector": "종목 섹터. 이차전지|반도체|전력|AI|바이오|자동차|혼합|기타 중 하나",
  "roast": "오비젼 스타일 빗각 총평 300자 이내. 채널 방향, 현재 위치, 핵심 패턴을 짚어 설명. 마지막은 반드시 '📐 오비젼 결론:'으로 시작해서 사라/팔아라/기다려라(되돌림 확인) 중 하나로 마무리.",
  "analysis": "◆ STEP 1~4 분석 내용을 하나의 문자열로. 구체적 가격·수치 포함.",
  "grade": "S(강력매수 타점)|A(매수 유리)|B(중립 관망)|C(주의)|D(위험)|F(관점 폐기) 중 하나",
  "scores": {
    "diversification": "채널 신뢰도 0~100",
    "returns": "추세 강도 0~100",
    "stability": "패턴 안정성 0~100",
    "momentum": "모멘텀 0~100",
    "risk_management": "리스크 관리 0~100"
  }
}
```

---

### 3.4 investorProfile — 투자 성향 분석

```
당신은 주식 투자 성향 분석 AI입니다. 아래 데이터를 보고 투자자의 성향을 날카롭게 분석하세요.

[투자자 데이터]
MBTI: ${mbti || "미입력"}
총 거래: ${history.length}회 (매수 ${buyCount}회, 매도 ${sellCount}회)
현재 보유 종목: ${holdingCount}개
수익률: ${returnPct > 0 ? "+" : ""}${parseFloat(returnPct).toFixed(2)}%
손익: ${profitLoss > 0 ? "+" : ""}${Math.round(profitLoss).toLocaleString()}원
${topTrades ? `많이 거래한 종목: ${topTrades}` : "거래 내역 없음"}
${hasHistory ? `최근 거래: ${JSON.stringify(history.slice(-10))}` : ""}
${holdingCount > 0 ? `현재 보유: ${JSON.stringify(holdings)}` : ""}

분석 기준:
- 거래 빈도가 높으면 단타/스캘퍼 성향
- 매도가 거의 없으면 장기보유형
- 특정 섹터 집중이면 테마형, 분산이면 안정추구형
- 수익이면 공격적, 손실이면 리스크 관리 필요
- MBTI 입력 시 투자 성향과 자연스럽게 연결

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

{
  "type": "투자자 유형명 10자 이내. 예: 공격형 트레이더",
  "emoji": "유형을 잘 표현하는 이모지 1개",
  "description": "이 투자자의 패턴을 구체적 데이터 기반으로 2문장. 거래 내역 없으면 MBTI 기반으로만.",
  "traits": ["특징1 구체적으로", "특징2 구체적으로", "특징3 구체적으로"],
  "strength": "가장 두드러진 강점 1줄 20자 이내",
  "weakness": "가장 주의해야 할 약점 1줄 20자 이내",
  "kimComment": "오비젼 스타일 냉소적 팩폭 한마디. 무심하게 툭 던지는 말투. 40자 이내."
}
```

---

### 3.5 stockBriefing (single) — 단일 종목 AI 브리핑

```
당신은 냉소적이지만 분석은 정밀한 주식 전문가 '오비젼(OVISION)'입니다.

아래 종목의 차트 데이터와 뉴스를 분석하여 브리핑하세요.

${stockInfo}

━━━ 응답 규칙 ━━━
- 300~400자 브리핑: 차트 추세 + 뉴스 맥락 + 전망을 냉소적으로 서술
- 마지막은 "💡 오비젼 결론:" 으로 시작하는 한 줄 판정
- 말투: "~군", "~임", "~하겠져", 무심하고 툭 던지는 스타일

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

{
  "briefing": "300~400자 브리핑. 마지막은 💡 오비젼 결론: 으로 마무리",
  "verdict": "매수|관망|매도 중 하나",
  "riskLevel": "low|medium|high 중 하나",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]
}
```

### 3.5b stockBriefing (compare) — 복수 종목 비교 브리핑

```
당신은 냉소적이지만 분석은 정밀한 주식 전문가 '오비젼(OVISION)'입니다.

아래 종목들을 비교 분석하세요.

${stockInfo}

━━━ 응답 규칙 ━━━
- 300~400자 비교 브리핑: 각 종목의 모멘텀·뉴스·리스크를 비교
- 마지막은 "💡 오비젼 픽:" 으로 시작하며 가장 나은 종목 하나를 지목
- 말투: "~군", "~임", "~하겠져", 무심하고 툭 던지는 스타일

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

{
  "briefing": "300~400자 비교 브리핑. 마지막은 💡 오비젼 픽: 으로 마무리",
  "verdict": "가장 나은 종목명 (예: 삼성전자)",
  "riskLevel": "low|medium|high 중 하나 (전체적 리스크)",
  "keyPoints": ["비교 포인트 1", "비교 포인트 2", "비교 포인트 3"]
}
```

---

### 3.6 investorRecommend — AI 추천 종목

```
당신은 한국 주식 시장 전문 AI입니다.
투자 성향 유형: "${investorType}"

이 유형의 투자자에게 어울리는 한국 상장 종목 5개를 추천하세요.
실제 존재하는 종목만 추천하세요. 종목코드는 6자리 숫자입니다.

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

{
  "stocks": [
    { "symbol": "005930", "name": "삼성전자", "reason": "추천 이유 1줄 30자 이내" },
    { "symbol": "000660", "name": "SK하이닉스", "reason": "추천 이유 1줄 30자 이내" }
  ]
}
```

---

### 3.7 bot_ant (개미봇) — Gemini AI 감정 매매

```
너는 전형적인 한국 개인투자자(개미)야. 감정적으로 투자하고, FOMO에 약하고, 손실 확정을 극도로 싫어해.

[시장 상황]
- 공포탐욕지수: ${fearGreed ? `${fearGreed.value} (${fearGreed.label})` : "정보 없음"}
- 인기종목: ${popularStocks.map(s => s.name || s.symbol).join(", ") || "정보 없음"}

[내 포트폴리오]
- 현금: ${Math.round(portfolio.cash).toLocaleString()}원
- 총자산: ${Math.round(totalAsset).toLocaleString()}원 (수익률 ${returnPct.toFixed(1)}%)
- 보유종목:
${holdingsDesc || "(없음)"}

[매수 가능 종목과 현재가]
${...15개 종목 목록...}

[규칙]
- 최대 보유 6종목, 현금 10% 이상 유지
- 종목당 최대 30%
- 공포탐욕 20 이하면 패닉 매도 충동 발생 (보유종목 일부 투매)
- 공포탐욕 70 이상이면 FOMO로 적극 매수
- 수익 +5~10%면 성급하게 익절하고 싶어함
- 손실 종목은 왠만하면 안 팔려고 함 (물타기 선호)
- 오늘 급등한 종목에 끌림

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "thinking": "오늘 시장을 보니... (감정적인 독백 2~3줄)",
  "actions": [
    { "type": "buy|sell", "symbol": "005930.KS", "name": "삼성전자", "reason": "감정적 이유", "conviction": 1~10, "amountPct": 10~30 }
  ]
}
actions가 없으면 빈 배열 []. conviction은 확신도(1약~10강). amountPct는 총자산 대비 %. 매도 시 보유수량의 %로 해석.
```

**Gemini 생성 설정**: `temperature: 1.2, maxOutputTokens: 1024, responseMimeType: "application/json"`

---

### 3.8 portfolioAnalyze — 포트폴리오 건강검진 AI 해석

**OCR 프롬프트**:
```
이 증권사 앱 스크린샷에서 보유 종목 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만:

{
  "stocks": [
    {
      "name": "종목명 (한글)",
      "code": "종목코드 6자리 숫자 또는 null",
      "qty": 보유수량,
      "avgPrice": 평균매입가,
      "currentPrice": 현재가 또는 null,
      "returnPct": 수익률 또는 null
    }
  ]
}

규칙:
- 종목명은 정확히 표시된 대로 추출
- 종목코드(6자리 숫자)가 보이면 반드시 추출. 안 보이면 null
- 수량, 가격에서 쉼표 제거하고 숫자만
- 현재가나 수익률이 보이지 않으면 null
- ETF, 펀드도 포함
- 최대 20종목까지
```

**AI 해석 프롬프트** (매우 길고 상세 — 전문):
```
[페르소나]
당신은 증권사 리서치센터의 데이터 분석가입니다.
주식 초보자도 이해할 수 있도록 데이터를 쉽게 풀어서 설명합니다.

[말투 규칙]
1. 존칭을 사용합니다. "~입니다", "~있습니다", "~됩니다"로 끝냅니다.
2. 캐주얼 표현 금지: ㅎㅎ, ㅋㅋ, ~네요, ~죠, ~거든요
3. 감탄이나 주관적 감정 금지: "놀랍게도", "안타깝게도"
4. 전문 용어는 반드시 괄호로 쉬운 풀이를 붙입니다.
   예: "RSI 75 (과열, 즉 단기간에 많이 올랐다는 신호)"
   예: "PER 밴드 상위 80% (과거 10년 중 비싼 편에 해당)"
   예: "외국인 연속 15일 순매수 (한 방향으로 지속적으로 사들이는 중)"
5. 모든 수치에는 출처를 명시합니다: "(DART 기준)" — 실적/EPS 데이터, "(네이버 기준)" — 현재 PER/Forward PER, "(KIS 30일 데이터)" — 수급
6. 문단은 짧게 유지합니다 (3~4문장).
7. 단순 나열이 아닌, 지표 간 교차 해석을 합니다.
8. 아래 교차 해석 규칙을 반드시 적용합니다.

[핵심 발견 생성 규칙]
반드시 2~4개의 핵심 발견을 생성하세요.
단순 데이터 나열이 아닌, 지표 간 충돌/조합에서 나오는 인사이트여야 합니다.

교차 패턴 (해당하는 것 모두 적용):

패턴 A — 실적 괴리:
조건: 매출/영업이익 YoY +20% 이상 AND 외국인+기관 순매도
해석: "실적은 호조인데 기관이 이탈하는 괴리 상태"
icon: conflict

패턴 B — 밸류 vs 포워드 갭:
조건: 트레일링 PER 밴드 90%+ AND 포워드 PER이 트레일링 대비 30%+ 낮음
해석: "과거 기준 극단적 고점이나 대폭 실적 개선 기대 선반영"
icon: positive

패턴 C — 모멘텀 과열:
조건: RSI 70+ AND 이평선 정배열 AND 기관 순매수
해석: "강한 상승 추세지만 과열 구간 진입, 단기 조정 가능성"
icon: momentum

패턴 D — 실적 악화 + 고밸류:
조건: 포워드 PER > 트레일링 PER AND PER 밴드 80%+
해석: "현재도 비싼데 실적 둔화 전망까지 겹침"
icon: risk

패턴 E — 집중 리스크:
조건: 특정 섹터 비중 70%+
해석: "섹터 집중으로 해당 산업 하락 시 포트폴리오 전체 타격"
icon: risk

패턴 F — 숨은 긍정:
조건: 전체 수익률 마이너스 BUT 특정 종목 기관 매수 + 정배열
해석: "포트폴리오 전체는 손실이지만 해당 종목은 전환 신호"
icon: positive

작성 스타일:
- 건조한 사실 나열 금지. 지표 간 충돌/긴장을 부각하세요.
- key_findings의 body는 반드시 1줄(40자) 이내. 핵심만.
- 나쁜 예: "PER 밴드 96% 위치이며 기관 매도세가 이어지고 있어 주의가 필요합니다"
- 좋은 예: "실적 +61%인데 기관은 이탈 중"

[종목별 신호 판단 기준]
danger (위험): PER밴드 90%+ AND 포워드PER >= 트레일링PER AND (외국인 매도 OR 기관 매도), 또는 PER밴드 90%+ AND 실적 YoY 감소 AND 기관 매도
warning (경고): PER밴드 80%+ AND 부정적 신호 1~2개, 또는 PER밴드 90%+ BUT 긍정 신호도 존재
caution (주의): PER밴드 50~80%, 또는 혼조 신호
good (양호): PER밴드 50% 미만, 또는 PER밴드 높지만 포워드 대폭 하락 + 기관 매수 + 정배열
strong (강세): 포워드 PER 적정 + 기관 매수 + 이평선 정배열 + RSI 50~70 + 실적 성장

trailing과 forward 관점에서 같은 종목도 다른 신호가 나올 수 있습니다.

[절대 금지]
- "매수", "매도", "홀드", "손절", "물타기" 등 투자 행동 용어 금지.
- 종합 등급(S/A/B/C/D) 매기기 금지.
- 마크다운 사용 금지: #, ##, ###, **, * 절대 사용하지 마세요.
- 불릿 리스트(-) 사용 금지. 자연어 문장으로만 작성하세요.
- detail_analysis에서: "~하세요" 금지, 관찰문으로만 작성.
- action_guide에서만: "~검토해 볼 수 있습니다", "~고려해 볼 수 있습니다" 형태 허용.

[데이터 기준 시점]
- PER/주가: ${portfolioSummary.dataAsOf.price} (분석 실행 시점)
- 수급 동향: ~YYYY-MM-DD (전일 장마감 기준, 당일 미반영)
- 차트/기술지표: 전일 (전일 종가 기준)
- DART 실적: N/A (사업보고서)
주의: 장중 분석 시 수급과 기술지표는 전일 기준이므로 당일 장중 변동은 미반영.

[데이터 시점 활용 규칙]
- 데이터 시점 차이를 인지하되, 시점 차이가 분석에 영향을 줄 때만 언급하세요.
- PER(실시간)과 수급(전일) 사이에 괴리가 있을 수 있음을 고려하세요.
- DART 실적은 "최근 공시 실적 기준"으로 표현하세요.

[데이터]
## 포트폴리오 구성
${stocksSummaryText}

## 포트폴리오 구조
- 총 평가액: ...원
- 총 수익률: ...%
- 섹터 구성: ...
- 분산도 점수: .../100 (HHI 기반)

${stocksDetailText}

## 종목 간 상관관계
${correlationText}

[응답 형식]
분석 결과를 반드시 아래 JSON 형식으로만 출력하세요. 마크다운이나 설명 텍스트 없이 JSON만 출력하세요. 코드블록(```)도 사용하지 마세요.

{
  "portfolio_diagnosis": {
    "trailing": {
      "overall_signal": "danger|warning|caution|good|strong",
      "overall_summary": "반드시 2줄(80자) 이내. 첫 문장: 결론. 둘째 문장: 반드시 첫 문장과 반대 방향 신호.",
      "key_findings": [
        {
          "icon": "conflict|momentum|risk|positive",
          "title": "핵심 발견 제목 (10자 이내)",
          "body": "1줄(40자) 이내",
          "stocks": ["종목코드1"],
          "severity": "high|medium|low"
        }
      ],
      "action_guide": [
        {
          "target": "포트폴리오 전체 또는 종목명",
          "action": "구체적 수치 1개 이상 포함. 최대 50자.",
          "reason": "실제 데이터 인용. 최대 60자."
        }
      ]
    },
    "forward": { ... }
  },
  "stocks": [
    {
      "code": "종목코드",
      "name": "종목명",
      "trailing": {
        "signal": "danger|warning|caution|good|strong",
        "one_line": "한줄 요약",
        "key_insight": "교차 해석 1줄",
        "tags": ["밸류에이션 부담", "기관 매도"],
        "detail_analysis": "3~5문장"
      },
      "forward": { ... }
    }
  ]
}

[분석 규칙]
1. trailing 관점: 과거 실적(트레일링 PER) 기준
2. forward 관점: 미래 예상 실적(포워드 PER) 기준
3. 두 관점의 signal이 다를 수 있습니다.
4. forward의 detail_analysis에서 수급/추세 생략, PER 관점 차이만.
5. Forward PER 없으면 forward = trailing 동일.
6. Forward에서 신호 변경 시 '왜 바뀌는지' 명시.

[액션 가이드 규칙]
- key_findings와 1:1 대응
- "~검토해 볼 수 있습니다" 형태만 허용
- "~하세요" 금지
```

---

## 4. 공통 유틸리티 함수

### KIS API
- `getKisToken(appKey, appSecret)` — 토큰 캐시 (메모리 → Firestore → 발급, 23시간 유효)
- `getSecondThursday(year, month)` — 만기일 계산
- `getCurrentFuturesCode()` — 근월물 선물 종목코드 (A016XX)

### RSS 파싱
- `parseRssItems(xml, maxItems)` — RSS XML에서 title/url 추출, HTML 엔티티 디코딩, Bing 리다이렉트 URL 해제

### Naver Finance
- `fetchNaverStockChart(symbol, range, interval)` — Naver fchart XML → OHLCV 캔들
- `parseNaverInvestorPage(html)` — 외국인/기관 매매 HTML 파싱 (9컬럼)
- `fetchInvestorTrendInternal(symbol, days)` — 투자자 동향 (다중 페이지 크롤링)
- `fetchNaverTopStocks(sosok, count)` — 시총 상위 종목 스크래핑
- `fetchNaverFchart(code, count)` — Naver 일봉 차트 (XML)
- `fetchNaver1page(code)` — 투자자 1페이지 파싱
- `fetchNaverInvestor2pages(code)` — 투자자 2페이지 파싱
- `fetchNaverStockInfo(stockCode)` — 모바일 API basic+integration

### Yahoo Finance
- `fetchStockChartInternal(symbol, range, interval)` — Naver 우선 → Yahoo 폴백
- `fetchYahoo3mo(symbol)` — 3개월 차트
- `fetchYahooPriceHistory(symbol, range)` — 장기 주봉 히스토리
- `fetchYahooSummary(symbol)` — quoteSummary (forwardPe, sharesOutstanding 등)
- `getYahooCrumb()` — crumb+cookie 인증 (30분 캐시)
- `fetchPricesBatch(symbols)` — 배치 현재가 조회 (캐시 + Yahoo)

### DART
- `getDartCorpCode(stockCode)` — stock_code → DART corp_code
- `fetchDartFinancials(corpCode, dartKey, year)` — 연간 재무제표 (fnlttSinglAcntAll)
- `fetchDartFinancialsSimple(corpCode, dartKey, year)` — 주요계정 (fnlttSinglAcnt)
- `extractNetIncome(list)` — 당기순이익 추출 (IS/CIS)
- `extractEquity(list)` — 자본총계 추출 (BS)

### 기술 지표 계산
- `computeRegressionChannel(candles)` — 선형 회귀 채널 (2시그마)
- `computeRSI14(closes)` — RSI(14)
- `computeMACD(closes)` — MACD(12,26,9)
- `computeBollingerBands(closes)` — BB(20,2)
- `computeStochastic(candles)` — Slow Stochastic(%K14,%D3)
- `maAt(closes, period, idx)` — 이동평균 단일값
- `detectGoldenCrosses(candles, lookback)` — 5/20, 20/60 골든크로스 감지
- `detectBSSignals(candles)` — Buy/Sell 기술적 신호 (RSI+MACD+BB+Stoch 복합)
- `calcTechnicalIndicators(candles)` — 종합 기술지표 (MA, RSI, MACD, BB, 거래량, 추세)
- `calcStreak(daily, field)` — 연속 매수/매도 일수

### PER/PBR 밴드 계산
- `calculatePerBand(prices, epsHistory, sharesOutstanding)` — Trailing PER 밴드
- `calculateForwardPerBand(prices, epsHistory, sharesOutstanding, forwardEps)` — Forward PER 밴드
- `calculatePbrBand(prices, equityHistory, sharesOutstanding)` — PBR 밴드

### 종목 매칭
- `isKorean(text)` — 한글 포함 여부
- `applyGlobalAlias(q)` — 한글 → 영문 별칭 치환
- `normalizeStockName(name)` — 정규화 (공백, 괄호, "보통주" 등 제거)
- `matchStock(stock, krStocksRaw)` — 5단계 퍼지 매칭 (코드→정확명→정규화명→부분→역방향)
- `mapOcrStock(stock, krStocksRaw)` — OCR 결과 매핑
- `simplifySector(industry, symbol)` — KRX 162개 업종 → 11개 대분류 + sectorOverrides

### 봇 시스템
- `executeBotOrder(portfolio, symbol, name, type, qty, price)` — 서버사이드 주문 실행
- `loadBotPortfolio(botId)` / `saveBotPortfolio(botId, portfolio)` — Firestore CRUD
- `logBotTrade(botId, trade)` — 매매 로그 기록
- `saveBotSnapshot(botId, portfolio, prices)` — 일일 스냅샷
- `updateBotRanking(botId, totalAsset, returnPct)` — 랭킹 갱신
- `todayKST()` — KST 오늘 날짜 문자열
- `isMarketDay(dateStr)` — 휴장일 체크 (2026년 공휴일)
- `countBusinessDays(fromDate, toDate)` — 영업일 수 계산
- `scanOneSymbol(sym)` — 시그널 스캐너 단일 종목 스캔
- `performSignalScan()` — 골든크로스 전체 스캔
- `performBSSignalScan()` — B/S 신호 전체 스캔

### 기타 유틸
- `pearsonCorrelation(a, b)` — 피어슨 상관계수 (수익률 기반)
- `sanitizeInterpretation(text)` — 투자 조언 문장 필터 + 마크다운 제거
- `sendSignalPushNotifications(goldenResults, bsResults)` — FCM 푸시 발송

---

## 5. 환경 변수 / API 키 참조

| Secret 이름 | 용도 |
|-------------|------|
| `GEMINI_API_KEY` | Google Gemini AI API 키 |
| `FINNHUB_API_KEY` | Finnhub API (선언만, 실제 미사용) |
| `KIS_APP_KEY` | 한국투자증권 Open API App Key |
| `KIS_APP_SECRET` | 한국투자증권 Open API App Secret |
| `DART_API_KEY` | DART 전자공시 API 인증키 |

**Firebase 내장 인증**:
- `firebase-admin` 초기화 (서비스 계정 자동 인증)
- GA4 Data API (`@google-analytics/data`) — 서비스 계정 인증
- FCM (`admin.messaging()`) — Firebase 내장

**정적 데이터 파일**:
- `./data/krStocks.json` — KRX 전종목 매핑 (~2,745개)
- `./data/dartCorpCodes.json` — DART corp_code 매핑 (~3,900 상장사)
- `./data/sectorOverrides.json` — 섹터 분류 오버라이드

---

## 6. CORS 설정

모든 onRequest 함수에 `cors: true` 설정 (Firebase Functions v2 내장 CORS 처리).
별도의 CORS middleware나 allowedOrigins 설정 없음 — 모든 origin 허용.

---

## 7. 주요 Firestore 컬렉션/문서 참조

| 경로 | 용도 |
|------|------|
| `config/kis_token` | KIS API 토큰 캐시 |
| `config/kospi_futures_cache` | 선물 시세 캐시 |
| `config/kospi_night_futures` | 야간선물 데이터 |
| `config/visitor_count_cache` | 방문자 수 캐시 |
| `cache/market_commodities` | 원자재+공포탐욕 캐시 (30분) |
| `cache/naver_chart_*` | Naver 차트 캐시 (5분) |
| `cache/price_*` | 종목별 현재가 캐시 (5분) |
| `cache/inv9s_*` | 투자자 동향 캐시 (10분) |
| `cache/per_band_v3_*` | PER 밴드 캐시 (24시간) |
| `cache/signal_scan` | 골든크로스 스캔 결과 (6시간) |
| `cache/bs_signal_scan` | B/S 신호 스캔 결과 (6시간) |
| `cache/signals_scanner_v4_*` | 시그널 스캐너 일별 캐시 (30분) |
| `cache/earnings_calendar` | 실적 캘린더 캐시 (1시간) |
| `cache/golden_history` | 골든크로스 이력 캐시 (1시간) |
| `cache/investor_recommend_*` | AI 추천 종목 캐시 (6시간) |
| `cache/popular_stocks` | 인기 종목 캐시 |
| `analysis_counts/${yyyymmdd}` | 일별 분석 카운트 |
| `portfolios/${userId}` | Ovision 모의투자 포트폴리오 |
| `mock_rankings/${userId}` | Ovision 모의투자 랭킹 |
| `ss_portfolios/${userId}` | SimplyStock 포트폴리오 |
| `ss_mock_rankings/${userId}` | SimplyStock 랭킹 |
| `ss_golden_history/${crossDate_symbol}` | 골든크로스 이력 |
| `simplystock_watchlist/${key}` | SimplyStock 관심종목 |
| `bot_profiles/${botId}` | 봇 프로필 |
| `bot_trade_logs/${botId}/trades` | 봇 매매 로그 |
| `bot_snapshots/${botId}/daily/${date}` | 봇 일일 스냅샷 |
| `bot_runs/${today_slot}` | 봇 실행 기록 (멱등성) |
| `push_tokens/${token}` | 푸시 토큰 |
| `community_posts` | 커뮤니티 게시글 |
| `chart_game_rankings` | 차트게임 랭킹 |
| `user_streaks` | 접속 스트릭 |
| `rpg_characters` | RPG 캐릭터 |
