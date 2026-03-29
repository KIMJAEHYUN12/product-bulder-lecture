# SimplyStock — 데이터 기반 주식 분석 도구

> 다른 AI에 붙여넣기용 프로젝트 컨텍스트 (2026-03-08 기준)

---

## 프로젝트 개요
- **URL**: https://www.simplystock.co.kr
- **목적**: 주식 차트를 통계적으로 분석하는 데이터 기반 투자 분석 도구
- **대상**: 한국 주식 투자자 (데이터 중심 분석 선호)

## 기술 스택
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + React 19
- **차트**: Lightweight Charts 5 (TradingView), Recharts 3
- **Backend**: Firebase Functions v2 (ovision 프로젝트 Functions 공유)
- **DB**: Firestore (모의투자 포트폴리오, 랭킹)
- **인증**: Firebase Auth (Google OAuth)
- **Hosting**: Firebase Hosting (static export)
- **API 호스트**: https://mylen-24263782-5d205.web.app

## 데이터 소스
- 종목 차트/현재가: Yahoo Finance (전일 종가 기준)
- 투자자 동향: KIS API (기관/외인/개인 순매매)
- PER/EPS: DART 공시 재무제표
- 실적 캘린더: DART 공시 일정
- 원자재: Yahoo Finance (29개 상품)

---

## 페이지 구조 (9개 메인 + 정적 콘텐츠)

### 1. 메인 (`/`) — 종목 차트 분석 + 신호 스캔
- 종목 검색 → OHLCV 차트 + 회귀채널 7선 렌더링
- 투자자 수급 차트 (기관/외인/개인 누적선)
- 신호 스캔: 채널 돌파 + 수급 반전 + 골든크로스 감지
- 차트 기간: 1M/3M/6M/1Y/2Y/MAX
- 회귀채널: 지수가중 최소제곱법 (최근 데이터 가중치 높음)

### 2. 모의투자 (`/mock`) — 가상 1,000만원 거래
- Google 로그인 필수
- 섹터별 종목 리스트 + 매수/매도 주문
- 포트폴리오 추적 + 18시 KST 정산
- 수익률 랭킹보드 (상위 20명)
- 공유 이미지 생성 (Canvas)

### 3. 백테스트 (`/backtest`) — "그때 샀다면?"
- 최대 3종목 + 금액 + 기간 설정
- MDD, CAGR, vs KOSPI 비교
- 포트폴리오 vs 개별 종목 라인차트
- 종목별 수익률 바차트

### 4. PER 밴드 (`/valuation`) — 역사적 밸류에이션
- DART 공시 EPS 추이 (최대 10년)
- PER 밴드 5선: 상단(max)/75%/중앙값/25%/하단(min)
- 현재 PER 위치 (0~100%)
- Forward PER (Yahoo Finance)

### 5. 실적 캘린더 (`/earnings`) — DART 공시
- 월별 공시 일정 조회
- 보고서 유형 배지 (잠정/분기/반기/사업)
- DART 원문 링크

### 6. 투자성향 테스트 (`/quiz`)
- 20개 질문 → 8가지 투자 유형 판정
- 결과: 유형 설명, 특성, 강점, 주의사항, 어울리는 자산
- Canvas 공유 이미지

### 7. 원자재 시세 (`/commodities`)
- 29개 상품 (귀금속/에너지/산업금속/농산물)
- 카테고리별 정렬 + 개별 상세 차트
- 시세 히스토리 테이블

### 8. 분석 자료실 (`/analysis`) + 가이드 (`/guide`) + 용어사전 (`/dictionary`)
- 9개 활용 가이드 (회귀채널, 수급, 매매동향, 모의투자 등)
- 5개 용어사전 (밸류에이션, 차트, 수급, 기술분석, 주문유형)
- 3개 분석 칼럼 (회귀채널 저평가, 수급 크로스, 스캔 체크리스트)

### 9. 서비스 소개/약관 (`/about`, `/terms`, `/privacy`)

---

## 핵심 기술 상세

### 회귀채널 7선 (StockChart.tsx)
- 지수가중 최소제곱법 (EMA-weighted least squares)
- 중심선(회귀선) + 상하 3개 표준편차 채널 (±1σ, ±2σ, ±3σ)
- 채널 돌파 시 신호 마커 표시
- 주봉/월봉 리샘플링 지원

### 투자자 수급 차트 (InvestorFlowChart.tsx)
- 기관/외인/개인 순매매 누적선 3개
- 40거래일 슬라이스
- 수급 크로스 (개인/외인 교차점) 표시

### 신호 스캔
- **채널 신호**: 하단 채널(-2σ) 터치 + 3일 수급 반전
- **골든크로스**: 5일/20일 또는 20일/60일 이동평균 교차
- 30분마다 자동 갱신

---

## API 엔드포인트 (14개)

| 경로 | 용도 |
|------|------|
| `/api/stock-chart` | 종목 OHLCV (Yahoo Finance) |
| `/api/investor-trend` | 투자자 순매매 (KIS API) |
| `/api/stock-search` | 종목 검색 |
| `/api/stock-prices` | 현재가 배치 |
| `/api/per-band` | PER 밴드 (DART) |
| `/api/earnings-calendar` | 실적 공시 |
| `/api/signals` | 채널+수급 신호 |
| `/api/signal-scan` | 골든크로스 |
| `/api/commodity-prices` | 원자재 시세 |
| `/api/market` | 뉴스+상품+선물 |
| `/api/ss-watchlist` | 관심종목 CRUD |
| `/api/ss-mock-rankings` | 모의투자 랭킹 |
| `/api/kospi-futures` | KOSPI200 야간선물 |
| `/api/news` | 시장 뉴스 |

---

## Hooks (3개)
| 훅 | 용도 |
|----|------|
| `useAuth` | Google OAuth 로그인/로그아웃 (browserLocalPersistence) |
| `useMockPortfolio` | 모의투자 포트폴리오 + Firestore 동기화 + 18시 정산 |
| `useBacktest` | 백테스트 계산 (종목/금액/기간 → MDD/CAGR) |

## Components (12+ 개)
| 컴포넌트 | 역할 |
|----------|------|
| StockChart | 메인 캔들차트 + 회귀채널 7선 + 신호 마커 |
| PerBandChart | PER 밴드 5선 + 주가 오버레이 |
| InvestorFlowChart | 투자자 수급 누적 3선 |
| ShareModal | 카카오톡/X/링크복사/이미지저장 |
| ThemeToggle | 다크/라이트 모드 |
| CommodityTicker | 원자재 티커 (가로스크롤) |
| NewsTicker | 뉴스 자동 스크롤 |
| RankingBoard | 모의투자 랭킹 |
| CommodityDetail | 원자재 상세 차트 |

---

## 현재 완성도

| 기능 | 상태 |
|------|------|
| 종목 차트 + 회귀채널 | 완성 |
| 투자자 수급 차트 | 완성 |
| 신호 스캔 | 완성 |
| 모의투자 | 완성 |
| 백테스트 | 완성 |
| PER 밴드 | 완성 |
| 실적 캘린더 | 완성 |
| 투자성향 테스트 | 완성 |
| 원자재 시세 | 완성 |
| 가이드/사전/칼럼 | 완성 |
| 다크/라이트 모드 | 완성 |
| 카카오 공유 | 완성 |
| 모바일 반응형 | 완성 |

---

## Ovision과의 차이점
- **Ovision**: AI 분석 + RPG 게이미피케이션 + 커뮤니티 (재미 중심)
- **SimplyStock**: 순수 데이터 분석 + 통계 지표 (정보 중심)
- SimplyStock은 AI 분석 없음 (Gemini 미사용)
- SimplyStock만의 고유 기능: 회귀채널 7선, PER 밴드, 실적 캘린더, 신호 스캔, 원자재

---

## 사용자 여정
1. 메인 → 종목 검색 → 회귀채널 차트 + 수급 확인
2. 신호 스캔으로 매수 타이밍 후보 탐색
3. PER 밴드로 밸류에이션 확인
4. 백테스트로 과거 성과 검증
5. 모의투자로 전략 실전 테스트
6. 실적 캘린더로 공시 일정 체크
7. 원자재로 거시 환경 파악

---

## 질문 사항 (아이디어 요청)
1. 현재 기능 중 킬러 피처로 성장시킬 만한 것은?
2. 회귀채널 + 수급 분석의 차별화 방안은?
3. 사용자 리텐션을 높이기 위한 추가 기능은?
4. SEO/마케팅 관점에서 콘텐츠 전략은?
5. 수익화 방안 (현재 AdSense만 사용)?
6. Ovision과의 시너지를 높일 수 있는 방법은?
