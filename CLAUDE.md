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
