# CLAUDE.md — Ovision 프로젝트 작업 규칙

> 이 파일은 모든 세션 시작 시 자동으로 읽힙니다.
> 코드 수정 전 반드시 이 규칙을 따르세요.

---

## 1. 작업 프로세스 (Plan → Execute → Verify)

### Phase 1: 계획 (Plan Mode 필수)
- **코드를 한 줄이라도 수정하기 전에** 반드시 계획을 세울 것
- 다음을 명시적으로 정리:
  1. **무엇을**: 변경할 파일 목록과 각 파일에서 수정할 부분
  2. **왜**: 이 변경이 필요한 이유
  3. **어떻게**: 구체적인 구현 방식 (함수명, 컴포넌트 구조 등)
  4. **영향 범위**: 이 변경이 다른 파일/기능에 미치는 영향
- 2~4개 파일 수정: `EnterPlanMode` 사용
- **5개 이상 파일 수정 (복잡한 작업)**: `PLAN.md` 파일을 프로젝트 루트에 생성
  - 사용자가 에디터에서 직접 메모/수정 가능 → "PLAN.md 메모 반영해줘"로 업데이트
  - 구현 중 각 단계 완료 시 `[완료]` 표시
  - 작업 종료 후 PLAN.md 삭제
- 계획을 사용자에게 보여주고 승인받은 후 코딩 시작

### Phase 2: 실행 (Execute)
- 계획대로만 수정. 계획에 없는 "개선"은 하지 않음
- 한 번에 하나의 기능/버그만 집중
- 수정 중 예상치 못한 문제 발견 시 → 멈추고 사용자에게 보고

### Phase 3: 검증 (Self-Verify)
- 코드 수정 후 반드시 다음을 실행:
  ```
  npm run build 2>&1 | tail -30
  ```
- 빌드 에러가 있으면 **직접 수정**하고 다시 빌드
- "완료했습니다"는 빌드 성공 확인 후에만 말할 것
- TypeScript 에러 0개 확인 필수

---

## 2. 코딩 컨벤션 (절대 규칙)

### API URL
- 모든 API는 `FIREBASE_HOST` 상수 사용: `https://mylen-24263782-5d205.web.app`
- Cloud Run 직접 URL 절대 금지
- 새 엔드포인트 추가 시 3곳 동시 수정: `functions/index.js` + `firebase.json` + `lib/xxxApi.ts`

### 프론트엔드
- Tailwind CSS 사용, 인라인 style 지양
- 다크모드: 모든 색상에 `dark:` variant 필수
- 모바일 우선: `w-full max-w-[320px]` 패턴 (고정 width 금지)
- `overflow-x-auto` + `shrink-0 whitespace-nowrap` (가로 스크롤 탭)
- 긴 텍스트: `max-w-[140px] truncate`
- 모달: 외부 wrapper에 `px-4` 필수

### 상태 관리
- 커스텀 훅 패턴: `hooks/useXxx.ts`에 중앙 상태관리
- SSE 스트리밍: `stateRef` 패턴 (React 18 batching 주의)
- AbortSignal.timeout(6000~10000) 설정

### 파일 구조
- 페이지: `app/xxx/page.tsx`
- 컴포넌트: `components/xxx/` (페이지별 하위 폴더)
- 훅: `hooks/useXxx.ts`
- API wrapper: `lib/xxxApi.ts`
- 타입: `types/index.ts`

---

## 3. 금지 사항

- **배포 명령어 실행 금지** (`firebase deploy`, `npm run deploy` 등) — 사용자가 직접 실행
- **git push 자동 실행 금지** — 사용자 명시적 요청 시에만
- **.env 파일 수정/생성 금지**
- **사용자가 요청하지 않은 리팩토링 금지**
- **사용자가 요청하지 않은 주석/docstring 추가 금지**
- **추측으로 코드 작성 금지** — 확실하지 않으면 파일을 먼저 읽을 것

---

## 4. 수정 전 필수 확인사항

새 컴포넌트/수정 시 체크리스트:
- [ ] z-index 스태킹: 드롭다운/모달이 다른 요소 위에 표시되는지
- [ ] 모바일 overflow: 가로 스크롤이 필요한 곳에 `overflow-x-auto`
- [ ] 반응형 높이: 차트는 `Math.min(width * 0.6, 350)` 패턴
- [ ] flex-wrap: 배지/태그 2개 이상이면 줄바꿈
- [ ] 모달 px-4: 모바일 양쪽 여백

---

## 5. 커뮤니케이션 규칙

- 한국어로 소통
- 이모지 사용하지 않음 (사용자가 요청하지 않는 한)
- 짧고 명확하게 답변
- 수정 내용 보고 시 형식:
  ```
  [수정 파일]: 무엇을 왜 변경했는지 한 줄 요약
  ```
- 에러 발생 시: 에러 메시지 전문 + 원인 분석 + 해결 방안 제시

---

## 6. 기술 스택 참고

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- Firebase Functions v2 (Node.js) — Gemini 2.5 Flash 사용
- Firebase Hosting (static export, `output: 'export'`)
- `npm install --legacy-peer-deps` 필수 (React 19 peer dep 충돌)
- `images: { unoptimized: true }` (static export)

---

## 7. 포트폴리오 건강검진 앱 — 설계 원칙

### 핵심 규칙 (절대 위반 금지)
1. 개별 종목에 Trailing/Forward 탭 추가하지 마라 → 글로벌 토글만 유지
2. PER 섹션은 항상 밴드 + 비교뷰(두 막대) 동시 표시, 탭 없이
3. "(DART 기준)"으로 PER 표기 금지 → PER은 네이버 금융 기준
4. 투자 자문 어투 금지 → "~하세요" ❌, "~검토해 볼 수 있습니다" ✅
5. 추가 API 호출 최소화 → 기존 API 응답에서 필드 추가 추출
6. 포워드 PER 10년 밴드를 그리려 하지 마라 → 무료 데이터로 구할 수 없음

### 글로벌 토글이 전환하는 것
- 종목 카드 한줄 요약, signal 뱃지, 포트폴리오 상태, 종목별 요약+태그, AI 상세 분석, 액션 가이드

### 글로벌 토글이 전환하지 않는 것
- 수급 동향, RSI, 이동평균선, 추세, 섹터 구성, 분산도, PER 밴드+비교뷰

### 데이터 출처 정확한 표기
- PER 밴드 범위: DART 순이익 + Yahoo 주가 자체 계산
- 현재 PER/포워드 PER: 네이버 금융
- 수급: KIS
- 주가/기술지표: Yahoo Finance OHLCV
- 매출/영업이익: DART 사업보고서

### 설계 판단
- KOSPI 벤치마크/MDD는 매수일을 모르면 비교가 무의미하여 제거 (백테스트에서는 유지)
- 결과 화면 "결론 먼저, 근거는 나중에" 구조: DiagnosisCard(종합진단) → PortfolioDashboard → 종목카드 → AI상세
- 5단계 신호 체계: danger/warning/caution/good/strong (ViewSignal)
- AI JSON 구조: portfolio_diagnosis(key_findings, action_guide) + stocks(one_line, key_insight, detail_analysis)
- 종목 카드 기본 접힌 상태 (StockSummaryCard), 미니 게이지로 핵심 지표 요약

### 구현 예정
- DART 매출/영업이익 추가 추출
- 섹터 구성 범례에 소속 종목명 표시

---

## 8. 수정 전 영향 범위 체크 (필수)
코드를 수정하기 전에 반드시:
1. 이 함수/컴포넌트를 다른 곳에서도 사용하는지 grep으로 확인
2. 같은 함수의 복사본이 다른 파일에 있는지 확인
3. 프론트/백엔드/Gemini 프롬프트 중 어디에 영향 주는지 파악
4. 영향 범위를 표로 정리해서 보고한 뒤 승인받고 수정 시작

## 9. 완료 보고 형식
수정 완료 시 반드시:
1. 수정 파일 목록 + 각 파일 변경 1줄 요약
2. 빌드 검증 결과 (TypeScript 에러 0개)
3. 배포 필요 서비스 명시 (functions / 프론트 / firestore 등)
4. 배포 후 사용자가 확인할 체크리스트

## 10. 절대 하지 말 것 (확장)
- 요청하지 않은 파일 수정 금지
- 공통 함수를 한 곳만 수정하고 다른 복사본 놔두지 마라
- "아마 ~일 것이다"로 추측하고 코드 작성 금지 — 파일 먼저 읽어라
- Gemini 프롬프트 수정 시 기존 전문을 먼저 보여주고 수정해라
- 같은 빌드 에러가 2번 반복되면 멈추고 다른 접근 방식 보고해라
- 다른 페이지의 기존 코드를 "통일" 명목으로 수정하지 마라 — 해당 페이지 작업 요청이 있을 때만 수정

## 11. Context compact 대비 — 포트폴리오 건강검진 전용 불변 규칙
(이 규칙은 portfolio-test 페이지 전용. 다른 페이지에 적용하지 마라)
- 개별 종목에 Trailing/Forward 탭 절대 추가 금지 → 글로벌 토글만
- PER 섹션: 항상 밴드 + 비교뷰 동시 표시
- PER 출처: 현재 PER = 네이버 금융, 밴드 범위 = DART + Yahoo 자체계산
- signal post-validation: PER밴드 95%+ → strong 불가, RSI>=70 → strong 불가
- sparkline: 6개월 전체 + 수정주가 방어 로직
- 투자 어투: "~검토해 볼 수 있습니다" 형태만 허용

## 12. 데이터 파이프라인 수정 시
외부 API (Yahoo, DART, 네이버, KIS) 관련 수정 시:
1. 수정 전 curl로 현재 응답 확인
2. 수정 후 동일 curl로 결과 비교
3. 엣지 케이스 (수정주가, 액면분할, ETF) 고려 여부 명시
4. 타임아웃 변경 시 기존값 → 새값 보고
5. 새 API 호출 추가 시 예상 시간 증가 보고

## 13. 포트폴리오 건강검진 신호 색상 코드
(이 색상은 portfolio-test 관련 컴포넌트에서만 사용. 다른 페이지의 기존 색상을 바꾸지 마라)
- danger/위험: red-500, bg red-500/20
- warning/경고: amber-500, bg amber-500/20
- caution/주의: yellow-500, bg yellow-500/20
- good/양호: emerald-500, bg emerald-500/20
- strong/강세: blue-500, bg blue-500/20