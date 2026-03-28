# blog-gen 블로그 자동 생성 도구 (Claude Code용 구현 프롬프트)

## 프로젝트 개요

SimplyStock 블로그 종목 분석 글 자동 생성 **데스크톱 앱**.
종목코드 입력 → 데이터 추출 + 스크린샷 캡처 + DART 공시 체크 + (선택) 블로그 마크다운 생성.

## 개발 Phase

```
Phase 1 (지금): 로컬 웹 UI (Next.js, localhost:3030)
  → 핵심 로직 개발 + 테스트 + 안정화
  → 이때부터 실전 블로그 글 생산 가능

Phase 2 (안정화 후): Electron으로 감싸기
  → Phase 1의 웹 UI를 Electron이 그대로 띄움 (코드 변경 최소)
  → .exe/.dmg 패키징 → 독립 실행 프로그램

Phase 3 (추후): 판매용 정리
  → 설정 마법사, 라이선스, 온보딩
```

**⚠️ Phase 1부터 Electron 전환을 고려한 구조로 만들 것.**
프론트는 Next.js, 백엔드 로직은 /api 라우트에 격리 → Phase 2에서 Electron의 main process로 이동만 하면 됨.

## 위치

~/ovision/tools/blog-gen/

## 실행 방법

### Phase 1 (웹 UI)
```bash
cd ~/ovision/tools/blog-gen
npm run dev    # localhost:3030에서 UI 열림
```

### Phase 2 (Electron) — 추후
```bash
npm run electron   # 데스크톱 앱으로 실행
npm run build      # .exe/.dmg 패키징
```

## UI 구조

```
┌─────────────────────────────────────────────────┐
│  📊 SimplyStock Blog Generator                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  종목코드: [ 008770    ] [🔍 검색]               │
│  종목명:   호텔신라 (008770.KS)                  │
│                                                   │
│  ── 실행 모드 ──────────────────────────          │
│  [📦 데이터+캡처만]  [🤖 Sonnet]  [🧠 Opus]     │
│     Claude채팅용       자동글생성    최고품질      │
│                                                   │
│  ── 진행 상황 ──────────────────────────          │
│  ✅ Step 1/4: Firebase 데이터 추출 완료           │
│  ⏳ Step 2/4: 스크린샷 캡처 중... (5/9)          │
│  ⬜ Step 3/4: DART 공시 체크                      │
│  ⬜ Step 4/4: 블로그 글 생성                      │
│                                                   │
│  ── 캡처 미리보기 ─────────────────────           │
│  [월봉] [주봉] [일봉] [수급] [PER] ...           │
│  ┌──────────────────┐                             │
│  │   (캡처 이미지    │                             │
│  │    미리보기)      │                             │
│  └──────────────────┘                             │
│                                                   │
│  ── DART 공시 체크 결과 ───────────────           │
│  🔴 히트: 자기주식 취득 (이부진 47만주)           │
│  🔴 히트: 영업정지 (인천공항 DF1 철수)            │
│  ✅ 클린: 블록딜, 유상증자, 소송 외 7건           │
│                                                   │
│  ── 결과물 ────────────────────────────           │
│  [📁 폴더 열기]  [📋 마크다운 복사]  [🔄 재실행] │
│                                                   │
└─────────────────────────────────────────────────┘
```

## 출력 결과

```
output/
├── 008770_호텔신라/
│   ├── 호텔신라_분석.md          # 블로그 마크다운 (네이버 에디터 붙여넣기용)
│   ├── data.json                # 원본 데이터 (디버깅용)
│   ├── dart.json                # DART 공시 체크 결과
│   └── images/
│       ├── 01_월봉_회귀채널.png
│       ├── 02_주봉_회귀채널.png
│       ├── 03_일봉_회귀채널_수급.png
│       ├── 04_수급_주체별.png
│       ├── 05_매매동향_테이블.png
│       ├── 06_forward_per.png
│       ├── 07_trailing_per.png
│       ├── 08_pbr.png
│       └── dart/
│           ├── 09_블록딜_공시.png      (히트 시에만)
│           ├── 10_시설투자_공시.png    (히트 시에만)
│           └── ...
```

---

## 아키텍처: 4단계 파이프라인

### Step 1: Firebase DB 데이터 추출 (`src/data-fetcher.js`)

SimplyStock의 Firebase Firestore에서 해당 종목의 가공된 데이터를 직접 조회.
Firebase Admin SDK 사용. 서비스 계정 키는 ~/ovision 프로젝트의 기존 키를 공유.

**추출할 데이터:**
```
1. 종목 기본 정보: 종목명, 현재가, 등락률, 시가총액
2. 회귀채널 데이터:
   - 월봉: 추세(상승/하락/횡보), 채널%, 기울기
   - 주봉: 추세, 채널%, 기울기, 시그널(B/S 마커)
   - 일봉: 추세, 채널%, 거래량배수
3. 수급 데이터:
   - 일별 매매동향 (최근 15거래일): 날짜, 종가, 등락률, 개인, 외국인, 기관, 외인보유, 보유율
   - 누적 수급 (합산/주체별)
   - 외인 연속 매수/매도 일수
4. 밸류에이션:
   - Forward PER: 현재값, 평균값, 과거대비%, EPS추이
   - Trailing PER: 현재값, 평균값, 과거대비%
   - PBR: 현재값, 평균값, 과거대비%
   - 업종 참고 PER
5. 스캐너 시그널: 수급반전 여부, 골든크로스 여부/유형/교차일
```

**출력:** data.json

---

### Step 2: 스크린샷 자동 캡처 (`src/screenshot.js`)

**⚠️ 캡처 관련 핵심 주의사항 (반드시 준수)**

Puppeteer로 SimplyStock과 DART 페이지를 캡처하는데, 아래 문제들이 반복적으로 발생했으므로 반드시 해결해야 함:

#### 문제 1: 차트가 렌더링되기 전에 캡처됨
- SimplyStock 차트는 Lightweight Charts (canvas)로 렌더링됨
- 페이지 load 이벤트 후에도 차트 데이터 fetch + 렌더링에 추가 시간 필요
- **해결:**
  - `page.waitForSelector('canvas')` 후 추가 `waitForTimeout(3000)` 필수
  - 차트 영역의 canvas 크기가 0이 아닌지 확인
  - 가능하면 네트워크 idle 상태 대기: `page.waitForNetworkIdle({ idleTime: 2000 })`

#### 문제 2: 탭 전환 후 새 차트가 로드되기 전에 캡처됨
- 월봉→주봉, 합산→주체별, Forward PER→Trailing PER 등 탭 전환 시 기존 캡처가 뜸
- **해결:**
  - 탭 클릭 → `waitForTimeout(500)` → 차트 영역 변화 감지 → `waitForTimeout(2000)` → 캡처
  - MutationObserver를 evaluate로 주입해서 차트 DOM 변경 감지하는 방법도 고려

#### 문제 3: 다크모드 차트의 텍스트가 잘 안 보임
- **해결:** viewport를 충분히 크게 설정 (1920x1080), deviceScaleFactor: 2 (레티나)

#### 문제 4: DART 공시 페이지에서 스크롤 아래 내용이 캡처 안 됨 ⭐ 가장 중요
- DART 공시는 한 페이지에 전체 내용이 있고, 필요한 표/정보가 중간~하단에 있음
- 단순 page.screenshot()은 뷰포트 상단만 캡처함
- **해결 방법 (반드시 이 순서로):**
  1. 먼저 전체 페이지 높이를 측정: `document.body.scrollHeight`
  2. 대상 요소를 찾기: 특정 텍스트/셀렉터로 위치 파악
  3. 대상 요소까지 스크롤: `element.scrollIntoView({ block: 'center' })`
  4. 스크롤 후 `waitForTimeout(1000)` (레이아웃 안정화)
  5. **대상 요소를 기준으로 element.screenshot() 사용 (page.screenshot이 아님!)**
  6. 또는 clip 옵션으로 특정 영역만 캡처: `page.screenshot({ clip: { x, y, width, height } })`

- **DART 공시 유형별 캡처 전략:**
  ```
  블록딜(내부자거래 사전공시):
    → 셀렉터: 표 제목 "거래내역" 포함하는 table
    → 또는 전체 공시 내용을 fullPage: true로 캡처 후 crop

  신규시설투자:
    → 셀렉터: "투자내역" 테이블
    → scrollIntoView 후 element.screenshot()

  영업정지:
    → 셀렉터: "영업정지" 제목의 다음 table

  대량보유 보고서:
    → 셀렉터: "요약정보" 테이블
  ```

- **최후 수단: fullPage 캡처 + sharp로 crop**
  ```javascript
  // 전체 페이지를 한 장으로 캡처
  await page.screenshot({ path: 'full.png', fullPage: true });

  // 대상 요소의 위치를 구함
  const box = await element.boundingBox();

  // sharp로 해당 영역만 잘라냄
  await sharp('full.png')
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height + 100 })
    .toFile('cropped.png');
  ```

---

#### SimplyStock 캡처 시퀀스 (순서 엄수)

```javascript
// 1. 브라우저 설정
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 }
});

// 2. 페이지 접속
const page = await browser.newPage();
await page.goto(`https://simplystock.co.kr/stock/${stockCode}`, {
  waitUntil: 'networkidle2',
  timeout: 30000
});

// 3. 초기 로딩 대기 (차트 렌더링 완료까지)
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForNetworkIdle({ idleTime: 2000 });
await page.waitForTimeout(3000); // 차트 애니메이션 완료

// 4. 월봉 캡처
await clickTabAndWait(page, '월봉탭셀렉터', 'canvas');
await captureChartArea(page, 'output/images/01_월봉_회귀채널.png');

// 5. 주봉 캡처
await clickTabAndWait(page, '주봉탭셀렉터', 'canvas');
await captureChartArea(page, 'output/images/02_주봉_회귀채널.png');

// 6. 일봉 캡처 (수급 차트 포함)
await clickTabAndWait(page, '일봉탭셀렉터', 'canvas');
await captureChartArea(page, 'output/images/03_일봉_회귀채널_수급.png');

// 7. 수급 주체별 탭 전환 → 캡처
await clickTabAndWait(page, '주체별탭셀렉터', 'canvas');
await captureElement(page, '수급차트영역셀렉터', 'output/images/04_수급_주체별.png');

// 8. 매매동향 테이블 캡처
await captureElement(page, '매매동향테이블셀렉터', 'output/images/05_매매동향_테이블.png');

// 9. 밸류에이션 페이지 이동
await page.goto(`https://simplystock.co.kr/stock/${stockCode}/valuation`);
// (또는 밸류에이션 탭 클릭 — 사이트 구조에 따라)

// 10. Forward PER 캡처
await clickTabAndWait(page, 'Forward PER 탭', 'canvas');
await captureElement(page, 'PER밴드영역셀렉터', 'output/images/06_forward_per.png');

// 11. Trailing PER 캡처
await clickTabAndWait(page, 'Trailing PER 탭', 'canvas');
await captureElement(page, 'PER밴드영역셀렉터', 'output/images/07_trailing_per.png');

// 12. PBR 캡처
await clickTabAndWait(page, 'PBR 탭', 'canvas');
await captureElement(page, 'PBR밴드영역셀렉터', 'output/images/08_pbr.png');
```

#### 헬퍼 함수 (반드시 구현)

```javascript
async function clickTabAndWait(page, tabSelector, waitForSelector) {
  await page.click(tabSelector);
  await page.waitForTimeout(500);  // 클릭 반응 대기

  // 차트 변경 감지: canvas가 다시 그려질 때까지
  await page.evaluate(() => {
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });
      const target = document.querySelector('canvas')?.parentElement;
      if (target) {
        observer.observe(target, { childList: true, subtree: true, attributes: true });
      }
      // 3초 타임아웃 안전장치
      setTimeout(resolve, 3000);
    });
  });

  await page.waitForTimeout(2000); // 렌더링 안정화
}

async function captureChartArea(page, outputPath) {
  // 차트 + 상단 시그널 바 포함 영역 캡처
  const chartContainer = await page.$('차트컨테이너셀렉터');
  if (chartContainer) {
    await chartContainer.screenshot({ path: outputPath });
  }
}

async function captureElement(page, selector, outputPath) {
  const element = await page.$(selector);
  if (element) {
    await element.scrollIntoView();
    await page.waitForTimeout(500);
    await element.screenshot({ path: outputPath });
  }
}
```

#### DART 공시 캡처 시퀀스 ⭐

```javascript
async function captureDartDisclosure(page, dartUrl, targetText, outputPath) {
  await page.goto(dartUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 방법 1: 특정 텍스트가 포함된 요소 찾기 + 스크롤
  const targetElement = await page.evaluateHandle((text) => {
    const allElements = document.querySelectorAll('table, h2, h3, th, td');
    for (const el of allElements) {
      if (el.textContent.includes(text)) {
        return el.closest('table') || el;
      }
    }
    return null;
  }, targetText);

  if (targetElement) {
    // 대상 요소로 스크롤
    await page.evaluate(el => {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, targetElement);
    await page.waitForTimeout(1500); // 스크롤 안정화 (중요!)

    // 요소 기준 캡처
    const box = await targetElement.boundingBox();
    if (box) {
      // 요소 위아래로 여백 추가해서 캡처
      await page.screenshot({
        path: outputPath,
        clip: {
          x: Math.max(0, box.x - 20),
          y: Math.max(0, box.y - 50),
          width: Math.min(box.width + 40, 1920),
          height: Math.min(box.height + 100, 1080)
        }
      });
    }
  } else {
    // 방법 2: fallback — fullPage 캡처 후 수동 확인
    console.warn(`⚠️ "${targetText}" 요소를 찾지 못함. 전체 페이지 캡처합니다.`);
    await page.screenshot({ path: outputPath, fullPage: true });
  }
}

// DART 공시 유형별 캡처 키워드 매핑
const DART_CAPTURE_TARGETS = {
  '블록딜': { keyword: '거래내역', fallback: '주식등의대량보유' },
  '신규시설투자': { keyword: '투자내역', fallback: '투자금액' },
  '영업정지': { keyword: '영업정지금액', fallback: '영업정지' },
  '자기주식': { keyword: '취득(처분)예정주식수', fallback: '자기주식' },
  '대량보유': { keyword: '요약정보', fallback: '보유주식' },
  '단일판매공급': { keyword: '계약내용', fallback: '계약금액' },
  '소송': { keyword: '소송가액', fallback: '소송내용' },
  '유상증자': { keyword: '발행주식수', fallback: '증자방식' },
  '최대주주변경': { keyword: '변경후', fallback: '최대주주' },
  '감사의견': { keyword: '감사의견', fallback: '의견종류' }
};
```

---

### Step 3: DART API 공시 조회 (`src/dart-checker.js`)

OpenDART API를 사용해서 10개 항목 자동 체크.

**API 키:** 환경변수 DART_API_KEY로 관리 (.env 파일)

**조회 로직:**
```
1. 기업 고유번호 조회: /api/company.json?corp_name=호텔신라
2. 최근 공시 목록 조회: /api/list.json?corp_code=XXX&bgn_de=20260101&end_de=20260329
3. 공시 유형별 필터링:
   - report_nm에 "내부자거래" 포함 → 블록딜 체크
   - report_nm에 "신규시설투자" 포함 → CAPEX 체크
   - report_nm에 "단일판매" 포함 → 수주 체크
   - report_nm에 "자기주식" 포함 → 자사주 체크
   - report_nm에 "대량보유" 포함 → 5% 지분 변동
   - report_nm에 "영업정지" 포함 → 사업 철수
   - report_nm에 "유상증자" OR "전환사채" 포함 → 희석
   - report_nm에 "소송" 포함 → 법적 리스크
   - report_nm에 "최대주주" 포함 → 경영권 변동
   - report_nm에 "감사의견" 포함 → 감사 리스크
4. 히트된 공시의 rcept_no로 상세 URL 생성
5. 히트된 공시 → Puppeteer로 해당 URL 접속 → 핵심 테이블 캡처
```

**출력:** dart.json
```json
{
  "checked_at": "2026-03-29",
  "corp_code": "00165680",
  "corp_name": "호텔신라",
  "hits": [
    {
      "type": "자기주식",
      "report_nm": "임원ㆍ주요주주특정증권등소유상황보고서",
      "rcept_dt": "20260326",
      "url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=XXX",
      "screenshot": "images/dart/09_자기주식_공시.png",
      "summary": "이부진 대표 47만주 장내매수 예정 (4/27~5/26)"
    },
    {
      "type": "영업정지",
      "report_nm": "영업정지",
      "rcept_dt": "20250918",
      "url": "...",
      "screenshot": "images/dart/10_영업정지_공시.png",
      "summary": "인천공항 DF1 면세점 철수, 영업정지금액 4,293억"
    }
  ],
  "clean": ["블록딜", "신규시설투자", "단일판매공급", "유상증자", "소송", "최대주주변경", "감사의견"]
}
```

---

### Step 4: 블로그 마크다운 생성 (`src/blog-writer.js`)

Anthropic API (claude-sonnet-4-20250514)로 블로그 글 생성.

**API 호출 구조:**
```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  system: BLOG_SYSTEM_PROMPT,  // 블로그 포맷 + 스타일 가이드
  messages: [
    {
      role: 'user',
      content: `
종목: ${data.name} (${data.code})

## 차트 데이터
${JSON.stringify(data.chart, null, 2)}

## 수급 데이터
${JSON.stringify(data.supply, null, 2)}

## 밸류에이션 데이터
${JSON.stringify(data.valuation, null, 2)}

## DART 공시 체크 결과
${JSON.stringify(dart, null, 2)}

## 이미지 파일 목록
${imageList.map((f, i) => `이미지 ${i+1}: ${f}`).join('\n')}

위 데이터를 기반으로 SimplyStock 블로그 종목 분석 글을 작성해주세요.
포맷은 기존 블로그 스타일(작성 가이드 + 📸 마커 + 🔴 핵심문장 + 4열 양면 테이블 + 발행 체크리스트)을 따르세요.
      `
    }
  ]
});
```

**BLOG_SYSTEM_PROMPT (별도 파일: prompts/blog-format.txt):**
```
당신은 SimplyStock 블로그의 종목 분석 글을 작성하는 전문가입니다.

## 글쓰기 규칙
1. 독자 질문 훅으로 시작 ("OO이 XX했는데, 지금 들어가도 되나요?")
2. 일상 비유로 개념 설명 (건물, 택시, 가게 등)
3. 단계별 분석: 회귀채널(월→주→일) → 수급 → 밸류에이션 → 공시/리스크
4. 🔴 핵심문장 6~8개 (네이버 에디터에서 빨간색 하이라이트용)
5. 📸 이미지 마커 (제공된 이미지 파일명과 매칭)
6. 4열 양면 체크리스트 테이블 (지표 | 데이터 | 긍정적 해석 | 부정적 해석)
7. ✏️ 작성 가이드 섹션 (블로그 미포함 안내, 이미지 매핑, 발행 체크리스트)
8. 투자 면책 문구
9. SimplyStock CTA (자연스럽게)

## 수급 해석 주의
- "스마트머니 유입"처럼 과대해석하지 말 것
- 공시 이벤트 직후의 외인/기관 매수는 이벤트 반응일 가능성을 명시할 것
- 누적 수급 추세와 최근 단기 수급을 분리해서 해석할 것

## DART 공시 반영
- hits 배열에 있는 공시만 본문에 반영
- clean 배열에 있는 항목은 작성 가이드에 "확인 완료 — 특이사항 없음" 기록
- 공시는 반드시 긍정/부정 양면 해석

## 톤
- 친근한 구어체 ("~거예요", "~잖아요", "~거든요")
- 전문 용어는 나올 때마다 쉽게 풀어쓰기
- 광고 느낌 없이 자연스럽게 SimplyStock 연결
```

---

## 필요한 패키지

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "puppeteer": "^22.0.0",
    "sharp": "^0.33.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "firebase-admin": "^12.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  },
  "scripts": {
    "dev": "next dev -p 3030",
    "electron": "electron .",
    "build": "electron-builder"
  }
}
```

## 환경변수 (.env.local)

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
DART_API_KEY=xxxxx
FIREBASE_SERVICE_ACCOUNT_PATH=../../serviceAccountKey.json
```

---

## 파일 구조

```
tools/blog-gen/
├── package.json
├── .env.local
├── next.config.js
├── main.js                        # Phase 2: Electron 메인 프로세스
│
├── app/                           # Next.js App Router (UI)
│   ├── layout.js
│   ├── page.js                    # 메인 화면 (종목 입력 + 모드 선택 + 진행상황)
│   └── api/                       # 백엔드 로직 (API Routes)
│       ├── run/route.js           # POST /api/run — 전체 파이프라인 실행
│       ├── data/route.js          # Step 1: Firebase 데이터 추출
│       ├── screenshot/route.js    # Step 2: Puppeteer 캡처
│       ├── dart/route.js          # Step 3: DART 공시 체크
│       └── generate/route.js      # Step 4: Anthropic API 글 생성
│
├── lib/                           # 핵심 로직 (UI와 분리)
│   ├── data-fetcher.js            # Firebase 데이터 추출
│   ├── screenshot.js              # Puppeteer 캡처 (SimplyStock + DART)
│   ├── dart-checker.js            # OpenDART API 공시 조회
│   ├── blog-writer.js             # Anthropic API 글 생성
│   └── utils/
│       ├── stock-codes.js         # 종목코드 → 종목명 매핑
│       └── selectors.js           # SimplyStock CSS 셀렉터 모음
│
├── components/                    # React UI 컴포넌트
│   ├── StockInput.js              # 종목코드 입력 + 검색
│   ├── ModeSelector.js            # 데이터만 / Sonnet / Opus 버튼
│   ├── ProgressTracker.js         # 4단계 진행바
│   ├── ImagePreview.js            # 캡처 이미지 미리보기
│   ├── DartResults.js             # DART 공시 히트/클린 표시
│   └── OutputActions.js           # 폴더열기 / 마크다운복사 / 재실행
│
├── prompts/
│   └── blog-format.txt            # 블로그 글 시스템 프롬프트
│
└── output/                        # 결과물 폴더 (gitignore)
```

### Phase 2 Electron 전환 시 변경점
- `main.js` 추가: BrowserWindow로 localhost:3030을 띄우거나, 빌드된 Next.js를 로드
- Puppeteer → puppeteer-core + 번들된 Chromium (electron-builder에서 처리)
- 나머지 로직은 그대로 /api 라우트에서 동작
- 핵심: **lib/ 폴더의 코드는 Phase 1→2 전환 시 변경 없음**

---

## 구현 순서 (Claude Code에게)

### Phase 1-A: 스캐폴딩 + UI 뼈대
1. Next.js 프로젝트 생성 (app router, port 3030)
2. 메인 페이지 UI 구현 (종목 입력, 모드 버튼 3개, 진행 상황 표시)
3. .env.local 설정, Firebase Admin 연결 확인

### Phase 1-B: 핵심 로직 (lib/ 폴더)
4. lib/data-fetcher.js — Firebase 연결 + 데이터 추출 (한 종목으로 테스트)
5. lib/screenshot.js — SimplyStock 캡처 (⭐ 가장 중요, 충분히 테스트)
   - 먼저 한 종목으로 월봉/주봉/일봉 캡처가 정확히 되는지 반복 테스트
   - 탭 전환 후 캡처 타이밍 문제 해결 확인
   - 수급/밸류에이션 탭 전환 캡처 확인
6. lib/screenshot.js — DART 공시 캡처 (⭐ 스크롤+요소 캡처 문제 반드시 해결)
   - DART 공시 페이지에서 특정 테이블을 찾아 스크롤 후 캡처하는 로직
   - fullPage 캡처 → sharp crop 방식을 fallback으로 반드시 구현
   - 최소 3개 다른 공시 유형으로 테스트 (영업정지, 신규시설투자, 대량보유)
7. lib/dart-checker.js — OpenDART API 연동 + 10개 항목 체크
8. lib/blog-writer.js — Anthropic API 연동 + 마크다운 생성

### Phase 1-C: API 라우트 + UI 연결
9. /api/run — 전체 파이프라인을 SSE(Server-Sent Events)로 진행 상황 실시간 전달
10. 프론트에서 진행 상황 실시간 표시 (Step 1/4, 2/4...)
11. 캡처 이미지 미리보기, DART 결과 표시
12. [폴더 열기], [마크다운 복사], [재실행] 버튼 동작

### Phase 1-D: 모드 분기
13. 📦 데이터만 모드: Step 1~3만 실행, output 폴더에 data.json + dart.json + images/ 생성
14. 🤖 Sonnet 모드: Step 1~4 실행, model='claude-sonnet-4-20250514'
15. 🧠 Opus 모드: Step 1~4 실행, model='claude-opus-4-6'

### Phase 2: Electron 전환 (Phase 1 안정화 후)
16. main.js 작성 (BrowserWindow → localhost:3030 또는 빌드된 Next.js 로드)
17. electron-builder 설정 (macOS .dmg + Windows .exe)
18. Puppeteer → puppeteer-core 전환 (번들 Chromium)
19. 패키징 테스트

---

## ⚠️ SimplyStock 셀렉터 참고사항

SimplyStock의 정확한 CSS 셀렉터는 실제 사이트 DOM을 확인해야 합니다.
아래는 예시이며, 실제 구현 시 `page.evaluate(() => document.querySelector(...))` 또는
브라우저 DevTools로 정확한 셀렉터를 확인해서 `src/utils/selectors.js`에 관리하세요.

```javascript
// selectors.js — 실제 DOM 확인 후 수정 필요
module.exports = {
  // 차트 탭
  TAB_DAILY: '[data-period="일"]',
  TAB_WEEKLY: '[data-period="주"]',
  TAB_MONTHLY: '[data-period="월"]',

  // 차트 영역
  CHART_CONTAINER: '.chart-wrapper', // 또는 차트 전체를 감싸는 div
  CANVAS: 'canvas',

  // 수급 탭
  TAB_SUPPLY_COMBINED: '[data-tab="합산"]',
  TAB_SUPPLY_BY_TYPE: '[data-tab="주체별"]',
  SUPPLY_CHART: '.supply-chart-area',
  TRADE_TABLE: '.trade-table',

  // 밸류에이션 탭
  TAB_FORWARD_PER: 'Forward PER 텍스트가 있는 버튼',
  TAB_TRAILING_PER: 'Trailing PER 텍스트가 있는 버튼',
  TAB_PBR: 'PBR 텍스트가 있는 버튼',
  VALUATION_AREA: '.valuation-container',

  // 시그널 바 (상단 태그)
  SIGNAL_BAR: '.signal-bar',
};
```

---

## 테스트 체크리스트

### 로직 테스트
- [ ] 008770 (호텔신라) 전체 파이프라인 실행 성공
- [ ] 월봉/주봉/일봉 캡처에서 차트가 실제로 렌더링된 상태로 찍히는지
- [ ] 주봉 탭 전환 후 캡처가 월봉이 아닌 주봉인지 (탭 전환 타이밍)
- [ ] 수급 주체별 탭 캡처가 합산이 아닌 주체별인지
- [ ] Forward/Trailing/PBR 각각 다른 차트로 캡처되는지
- [ ] 매매동향 테이블이 잘리지 않고 전체 캡처되는지
- [ ] DART 공시 히트 시 해당 테이블이 정확히 캡처되는지 (스크롤 문제 해결)
- [ ] DART 공시 히트 없는 종목에서도 에러 없이 진행되는지
- [ ] 최종 마크다운에 이미지 파일명이 올바르게 매핑되는지
- [ ] 003090 (대웅) 등 DART 소송 공시가 있는 종목으로도 테스트

### UI 테스트
- [ ] 종목코드 입력 → 종목명 자동 표시
- [ ] 모드 버튼 3개 클릭 시 각각 올바른 Step만 실행되는지
- [ ] SSE로 진행 상황이 실시간 업데이트되는지
- [ ] 캡처 이미지 미리보기가 정상 표시되는지
- [ ] DART 히트/클린 결과가 UI에 올바르게 표시되는지
- [ ] [폴더 열기] 버튼이 output 폴더를 여는지
- [ ] [마크다운 복사] 버튼이 클립보드에 복사되는지
- [ ] 에러 발생 시 UI에서 어떤 Step에서 실패했는지 표시되는지