# 오비젼(Ovision) 프로젝트 전체 컨텍스트

> 이 문서는 Claude 웹에 붙여넣기용으로 정리한 프로젝트 전체 상태입니다.
> 2026-03-01 기준.

---

## 프로젝트 개요

**오비젼(Ovision)** — AI 투자 분석 플랫폼
- URL: https://bitgak.co.kr/
- 한국 주식 투자자 대상, AI 포트폴리오 진단 + 차트 분석 + 모의투자 + RPG 게이미피케이션

---

## 기술 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion + next-themes
- **Backend**: Firebase Functions v2 (`functions/index.js`) — Gemini 2.5 Flash (Google AI)
- **Hosting**: Firebase Hosting, `out/` (static export)
- **DB**: Firestore (클라이언트 직접 접근 + Functions 서버사이드)
- **Auth**: Firebase Auth (Google 로그인, browserSessionPersistence)

### 주요 제약
- `output: 'export'` → Next.js API routes 사용 불가, SSR 불가
- `darkMode: 'class'` + next-themes `defaultTheme: 'dark'`
- `npm install --legacy-peer-deps` (React 19 peer dep 충돌)
- `images: { unoptimized: true }` (static export)

---

## 페이지 구조

| 경로 | 설명 | 특이사항 |
|------|------|----------|
| `/` | 메인 (포폴진단/차트분석 듀얼모드) | 라이트/다크 전환, lg:grid-cols-4 |
| `/mock-investment` | 모의투자 (가상 1000만원) | always dark, 로그인/게스트 분리 |
| `/stock-lab` | 종목 분석실 | always dark, AI 브리핑/비교차트/뉴스 |
| `/chart-game` | 차트 업다운 게임 | 연승 기반 랭킹 |
| `/quiz` | 투자성향 퀴즈 (15문항) | 8개 투자자 유형 분류 |
| `/adventure` | RPG 투자 모험 | 5탭: 캐릭터/강화/뽑기/배틀/게시판 |
| `/backtest` | 백테스트 시뮬레이션 | 최대 3종목, MDD/CAGR |
| `/terms` | 이용약관 (AdSense용) | |
| `/privacy` | 개인정보처리방침 | |

---

## 메인 페이지 (`/`) 상세

### 레이아웃: `lg:grid-cols-4`
- **좌사이드바** (1col): DailyDiscovery + Watchlist + AttendanceCalendar + InviteCodeSection + 모드별 위젯
- **센터** (2col): 분석 영역 (포폴진단 or 빗각차트)
- **우사이드바** (1col): AnalysisReport (RadarChart)

### 듀얼 모드
- **mode=kim (포폴진단)**: 스크린샷 업로드 → AI 팩폭 진단 (SSE 스트리밍)
  - DashboardWidgets: 공포탐욕 게이지, 뉴스, 캘린더, 원자재, 코스피 야간선물
  - StockRoastSection: 종목 뉴스
- **mode=makalong (차트분석)**: 종목 선택 → 빗각 자동 작도 → AI 매매 판단
  - PopularStocks + AnalysisHistory + TechIndicatorCard
  - BitgakChart (lightweight-charts v5)

### 상단 네비
- 8개 버튼: 모의투자, 분석실, 차트게임, 퀴즈, 백테스트, 모험, 약관, 개인정보
- StreakBadge + LoginButton + KimCharacter + ThemeToggle

---

## API 엔드포인트

모든 API: `FIREBASE_HOST = "https://bitgak.co.kr"`

| 경로 | 용도 |
|------|------|
| `/api/analyze` | 포폴/빗각 분석 (SSE 스트리밍) |
| `/api/kospi-futures` | 코스피200 야간선물 |
| `/api/stock-chart` | 종목 OHLCV 차트 데이터 |
| `/api/stock-prices` | 종목 현재가 |
| `/api/investor-profile` | 투자성향 분석 |
| `/api/stock-roast` | 종목 뉴스 |
| `/api/chart-game` | 차트 업다운 게임 |
| `/api/stock-briefing` | AI 브리핑 (SSE) |
| `/api/stock-search` | 종목 검색 (Yahoo Finance) |
| `/api/market` | 시장 데이터 (공포탐욕, 뉴스, 캘린더, 원자재) |
| `/api/investor-trend` | 투자자 동향 (KIS API) |
| `/api/popular-stocks` | 인기 분석 종목 TOP 5 |
| `/api/daily-briefing` | AI 마켓 브리핑 (30분 캐시) |
| `/api/investor-recommend` | AI 추천 종목 |
| `/api/daily-discovery` | 오늘의 발견 (6시간 캐시) |
| `/api/market-prediction` | 코스피 예측 투표 (GET/POST) |
| `/api/weekly-battle` | 주간 종목 배틀 (GET/POST) |

---

## 주요 시스템별 상세

### 1. 모의투자 시스템
- `hooks/useMockPortfolio.ts` — Firestore(로그인) / localStorage(게스트)
- 섹터별 종목 탭, 매수/매도 모달, 포트폴리오 요약
- 랭킹보드 (Firestore `mock_rankings`)
- 커뮤니티 게시판 (카테고리/좋아요/답글 기능)
- `components/mock/` — SectorTabs, StockList, OrderModal, PortfolioSummary, NicknameModal, RankingBoard, CommunityBoard, LoginButton

### 2. 종목 분석실 (Stock Lab)
- `hooks/useStockLab.ts` — lazy loading (탭 활성화 시 데이터 로드)
- `components/stock-lab/` — StockSearchBar, ComparisonChart/Cards, AiBriefing, NewsPanel, SectorCompare, InvestorTrend
- `data/krStocks.json` — `{ s, n, m, i }` (종목코드, 이름, 시장, 업종)

### 3. 빗각 차트 분석
- `lib/bitgakEngine.ts` — RSI, MACD, Bollinger, MA 계산
- `components/BitgakChart.tsx` — lightweight-charts v5
- `createSeriesMarkers()` 필수 (v5에서 setMarkers 없음)

### 4. RPG 모험 시스템
- `/app/adventure/page.tsx` — 5탭: 캐릭터, 강화, 뽑기, 배틀, 게시판
- 8개 클래스: visionary, dealmaker, sage, strategist, hunter, observer, contrarian, explorer
- **EXP 시스템**: `grantExp(type)` → CustomEvent → ExpToast → `drainExpQueue()` → `applyExp()`
- **가변 EXP**: `grantExpDynamic(type, exp, label)` — 출석 보너스 등 동적 EXP 지급용
- **강화 시스템**: 10단계, 비용 1~6 투자석, 성공률 100%~10%
- **뽑기 시스템**: 가챠 (투자석 소모)
- **배틀 시스템**: PvE 전투
- 관련 파일: `lib/rpgConstants.ts`, `lib/rpgExp.ts`, `lib/rpgExpConfig.ts`, `lib/rpgCharacterDb.ts`, `lib/enhanceEngine.ts`, `lib/gachaEngine.ts`, `lib/gachaPool.ts`, `lib/battleEngine.ts`, `lib/stoneReward.ts`
- 컴포넌트: `components/adventure/` — CharacterCreation, CharacterProfile, StatsPanel, EquipmentSlots, EnhancePanel, GachaPanel, BattlePanel

### 5. EXP 활동 종류 (lib/rpgExpConfig.ts)
| 활동 | baseExp | 일일 cap | 라벨 |
|------|---------|----------|------|
| daily_login | 30 | 1 | 출석 보상 |
| chart_game_correct | 15 | 20 | 차트게임 정답 |
| bitgak_analysis | 25 | 10 | 빗각 분석 |
| mock_trade | 10 | 15 | 모의투자 거래 |
| market_prediction | 20 | 1 | 시장 예측 |
| quiz_complete | 50 | 3 | 성향 테스트 |
| share_content | 15 | 3 | 콘텐츠 공유 |
| attendance_bonus | 0(동적) | 1 | 출석 보너스 |
| invite_reward | 50 | 10 | 친구 초대 보상 |

### 6. 백테스트 시스템
- 최대 3종목, 금액, 기간 설정 → 과거 수익 시뮬레이션
- 출력: 최종자산, 수익률, MDD, CAGR, vs KOSPI, 다중라인차트

### 7. 커뮤니티 활성화 시스템 (최근 구현, 미배포)

#### 초대코드
- `lib/inviteApi.ts` — 6자리 영숫자(I/O/0/1 제외) 코드 생성
- `hooks/useInviteCode.ts` — 미로그인 시 pendingCode를 localStorage 저장
- `components/InviteCodeSection.tsx` — 코드 표시/복사/입력 UI
- Firestore: `invite_codes/{code}`, `invite_records/{userId}`

#### 출석 캘린더
- `hooks/useAttendance.ts` — 7일 사이클 보상 (30/40/50+1석/30/40/50+1석/100 EXP)
- `components/AttendanceCalendar.tsx` — 7일 보상 시각화, 체크인 버튼
- 연속 끊기면 day 1 리셋, 28일 마일스톤 감지
- `useStreak`의 daily_login 시 `ovision-daily-checkin` CustomEvent 발사 → 자동 체크인

#### 커뮤니티 좋아요/답글
- `lib/communityReplyApi.ts` — toggleLike (arrayUnion/Remove + increment), addReply, fetchReplies
- `lib/communityApi.ts` — CommunityPost에 category/likes/likedBy/replyCount 필드 추가
- `components/mock/CommunityBoard.tsx` — 카테고리 탭(전체/인사이트/질문/수익자랑/꿀팁), 좋아요(optimistic), 답글 펼침
- Firestore: `community_replies/{replyId}`
- 모의투자 + 투자모험 페이지 양쪽에서 사용

#### 공유 EXP 보상
- `components/ShareModal.tsx` — 5개 공유 핸들러에 `grantExp("share_content")` 추가
- dailyCap 3 자동 적용

### 8. 인게이지먼트 기능
- **시장예측투표**: MarketPrediction + deviceId 기반
- **연속접속스트릭**: useStreak + StreakBadge (localStorage, KST 날짜)
- **오늘의발견**: DailyDiscovery (Gemini, 6시간 캐시)
- **관심종목**: useWatchlist + Watchlist (최대 5개, 1분 갱신)
- **주간배틀**: WeeklyBattle (ISO week, 금요일 resolve)
- **출석캘린더**: AttendanceCalendar (7일 사이클)
- **초대코드**: InviteCodeSection (친구 초대 보상)

---

## Firestore 컬렉션

| 컬렉션 | 용도 |
|--------|------|
| mock_rankings | 모의투자 랭킹 |
| portfolios | 모의투자 포트폴리오 (유저별) |
| community_posts | 투자 게시판 (카테고리/좋아요/답글 지원) |
| community_replies | 게시판 답글 |
| chart_game_rankings | 차트게임 랭킹 |
| market_predictions | 시장 예측 투표 |
| market_prediction_stats | 예측 통계 |
| prediction_records | 예측 기록 |
| weekly_battles | 주간 배틀 |
| weekly_battle_votes | 주간 배틀 투표 |
| user_streaks | 접속 스트릭 |
| rpg_characters | RPG 캐릭터 (로그인 유저만) |
| analysis_counts | 인기 분석 종목 |
| invite_codes | 초대코드 |
| invite_records | 초대 기록 |

---

## 공유 & 광고

- `lib/analysisShareImage.ts` — Canvas PNG 생성 (400x620/520), DPR 지원
- `components/ShareModal.tsx` — 카카오톡/X/링크복사/이미지저장/텍스트복사 + 공유 시 EXP 지급
- `lib/kakaoShare.ts` — Kakao JS SDK, AppKey: 879eb3c1fc8e7d5bc8bd539d81a5c02b
- `components/AdSlot.tsx` — Google AdSense (ca-pub-8523090652113599)
- 카카오, 트위터/X, 링크 복사, 이미지 다운로드, 텍스트 복사

---

## 타입 정의

### types/index.ts
- RPG: RpgClassKey, EquipmentGrade, EquipmentSlotKey, RpgStats, EquipmentItem, RpgCharacter
- 백테스트: BacktestStock, BacktestResult
- 기존: Grade, KimExpression, RoastState, TechIndicators, AnalysisHistoryItem

### types/social.ts (신규)
- 초대: InviteCode, InviteRecord
- 출석: AttendanceData, DayReward
- 커뮤니티: PostCategory, CommunityReply, CommunityPostExtended

---

## UI 유틸 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| AnimatedNumber | Framer Motion 스프링 카운트업 |
| Skeleton | variant={bar/circle/card}, shimmer |
| StaggerContainer | 순차 fade-in |
| ExpToast | EXP 획득 토스트 (우상단, z-50, 최대 3개) |
| LevelUpModal | 레벨업 전체화면 모달 |
| HeroLanding | 메인 히어로 (3카드 + 5기능소개) |
| InvestorTrendCompact | 투자자 수급 요약 (외/기/개) |
| AttendanceCalendar | 출석 체크 7일 사이클 |
| InviteCodeSection | 친구 초대코드 |
| StreakBadge | 연속 접속 배지 |

---

## Theme / Brand

- 브랜드 색상: kim-red=#4f46e5(indigo), kim-gold=#94a3b8(slate) — 변수명은 레거시
- glass-card, grid-bg, shimmer 클래스 (`globals.css`)
- 폰트: Wanted Sans (CDN) + Plus Jakarta Sans (Google Fonts)
- `tailwind.config.ts` fontFamily.sans에 정의

---

## 파일 구조 규칙

```
app/xxx/page.tsx          — 페이지
components/xxx/           — 페이지별 컴포넌트 하위폴더
hooks/useXxx.ts           — 커스텀 훅 (중앙 상태관리)
lib/xxxApi.ts             — API wrapper
types/index.ts            — 메인 타입
types/social.ts           — 소셜 기능 타입
functions/index.js        — Firebase Functions (서버)
firebase.json             — Hosting + Functions rewrites
firestore.rules           — Firestore 보안 규칙
```

---

## 코딩 컨벤션

- Tailwind CSS, 인라인 style 지양
- 다크모드: 모든 색상에 `dark:` variant 필수
- 모바일 우선: `w-full max-w-[320px]` 패턴 (고정 width 금지)
- 모달: 외부 wrapper에 `px-4` 필수
- SSE 스트리밍: `stateRef` 패턴 (React 18 batching 주의)
- API URL: FIREBASE_HOST 상수 사용, Cloud Run 직접 URL 금지
- 새 API 추가 시 3곳 동시: functions/index.js + firebase.json rewrite + lib/xxxApi.ts

---

## 현재 개발 상태 (2026-03-01)

### 배포 완료 (라이브)
- 마지막 커밋: `c8a533b` — BitgakChart z-index cleanup
- 포폴진단, 차트분석, 모의투자, 종목분석실, 차트게임, 퀴즈, 백테스트 모두 동작 중

### 로컬 미배포 (52개 파일 변경, +2342줄)
크게 4개 작업이 병렬 진행 중:

1. **뽑기(가챠) 시스템** — GachaPanel, gachaEngine, gachaPool
2. **배틀 시스템** — BattlePanel, battleEngine
3. **디자인 고급화** — globals.css, tailwind.config.ts 등 시각 개선
4. **커뮤니티 활성화** — 초대코드, 출석캘린더, 좋아요/답글, 공유보상

### 미구현 / 로드맵
- 프리미엄 구독 모델 (결제 연동)
- 증권사 제휴 CPA
- 커스텀 도메인 (ovision.kr 등)
- Google Search Console 등록

---

## DESIGN-SPEC.md 요약 (디자인 개선 명세)

- 폰트: Wanted Sans(한글) + Plus Jakarta Sans(영문/숫자) → 적용 완료
- 글래스 카드: blur 16px, saturate 180%
- 글로우/그라데이션 제거 → 솔리드 단색
- 여백: 카드 내부 p-4→p-5, gap-4→gap-5
- 텍스트 색상: white/zinc-300/zinc-500/zinc-600 4계층
- 카드 라운딩: rounded-xl → rounded-2xl
- 트랜지션: duration-200 → duration-300

---

## 관리자

- 관리자 UID: `zqyi38VH6vPN6HQNiOxEVBbxCg03`
- `lib/adminConfig.ts`에 정의
- 게시판 삭제, 랭킹 관리 등 관리자 권한 사용
