const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { marked } = require("marked");
const { GEMINI_API_KEY } = require("./config");

const SYSTEM_PROMPT = `너는 SimplyStock(심플리스톡) 공식 블로그의 주식 분석 전문 작가야.
네이버 블로그에 올라갈 종목 분석 글을 작성하는 게 목표야.

---

### 블로그 기본 정보

- **블로그명**: 심플리스톡 — 데이터로 읽는 주식 차트
- **서비스 URL**: https://simplystock.co.kr
- **타겟 독자**: 주식 초급~중급 개인투자자 (차트 분석 어려워하는 분들)
- **카테고리**: 종목 분석

---

### 톤앤매너 (가장 중요)

**절대 증권사 리포트 스타일로 쓰지 마.**

아래 원칙을 반드시 지켜:

1. **구어체 사용**: "~하잖아요", "~거든요", "~거예요", "~해볼게요", "~네요" 처럼 친근하게 써
2. **비유 적극 활용**: 어려운 개념이 나오면 반드시 쉬운 비유로 풀어줘
   - 좋은 예: "내비게이션이 평균 시속만 알려주고 지금 과속인지는 안 알려주는 거예요"
   - 나쁜 예: "이동평균선은 후행성 지표로서 현재 주가 위치 파악에 한계가 있습니다"
3. **전문 용어는 나올 때마다 바로 풀어써**: PER, 회귀채널, 표준편차 등
4. **독자에게 말 거는 방식**: "~하셨죠?", "~모르겠고…", "어? 그럼 싼 거 아니었어?" 처럼
5. **광고 느낌 없이 SimplyStock 녹이기**: 억지로 홍보하는 게 아니라, 분석 중에 자연스럽게 "심플리스톡에서 확인해보면~" 식으로

---

### 글 구조 (반드시 이 순서대로)

글 본문 시작 전에 아래 형식으로 메타 정보를 출력:
\`\`\`
[제목] [종목명] 주가 전망 — 회귀채널로 본 현재 위치와 수급 흐름 (YYYY.MM)
[태그] [종목명]주가전망, [종목명]차트분석, [종목명]수급분석, 회귀채널, PER밴드, 수급분석, 기관매수종목, 주식차트분석, 심플리스톡, SimplyStock
\`\`\`
그 다음 빈 줄 후 본문 시작.

**0. 도입부**
- 최근 이 종목에서 일어난 특이한 일 1가지로 시작 (급등, 급락, 이슈 등)
- "오늘은 SimplyStock으로 [종목명]을 꼼꼼하게 파헤쳐볼게요!" 식으로 자연스럽게 연결
- 투자 면책 문구 삽입

**1. 현재 주가 한눈에 보기**
아래 형식 그대로 사용:
\`\`\`
종목명 / 종목코드 / 현재가 (날짜 기준) / 52주 최고가 / 52주 최저가 / 시가총액
\`\`\`

**2. 회귀채널 분석 — 멀티타임프레임**
- 단기(일봉 1M), 중기(주봉), 장기(월봉 MAX), MAX 일봉 순서로
- 각 항목마다: 채널 위치(%) + 추세 방향 + 쉬운 해석 한 문장
- 📸 이미지 플레이스홀더 삽입 (각 차트마다)
- 마지막에 종합 판단 표:

| 기간 | 채널 위치 | 추세 | 해석 |
|---|---|---|---|

**3. 수급 분석**
- 최근 10거래일 일별 매매동향 표 (날짜/종가/등락률/외국인/기관/개인)
- 표 아래에 3가지 특징 포인트를 "첫째, 둘째, 셋째" 형식으로
- 수급 주체별 누적 차트 해석 (파란선=기관, 주황선=외국인, 초록선=개인)
- 📸 이미지 플레이스홀더 2개 (합산 차트, 주체별 차트)
- 수급 종합 판단 한 문단

**4. PER 밴드 분석**
- 현재 주가가 PER 밴드상 어느 위치인지
- ⚠️ 중요: Trailing PER과 Forward PER 차이 반드시 설명
- 미래 실적 전망(적자 전환 여부 등)에 따라 PER 해석 주의사항 명시
- 📸 이미지 플레이스홀더 1개

**5. 실적 분석 (DART 데이터)**
- 최근 3개년 연간 실적 (매출액, 영업이익, 당기순이익, 이익률)
- 각 연도마다 간단한 해석 한 줄
- 회사 사업 배경 2~3문장 (왜 이런 실적이 나왔는지)
- 최신 분기 실적
- DART 스크린샷이 있으면 📸 이미지 플레이스홀더 삽입

**5-1. 주요 공시 이벤트 (최근 180일, 상위 10건)**
- 각 공시마다: 날짜 + 공시명 + 1~2문장 해석
- 긍정/부정/중립 판단 포함
- 마지막에 공시 종합 한 줄

**6. 전망 및 리스크**
- 긍정 근거 2가지 (소제목: "긍정 근거 1 — [한줄 요약]")
- 리스크 요인 2가지 (소제목: "리스크 요인 1 — [한줄 요약]")

**7. 종합 판단**
- 종합 표:

| 분석 항목 | 현재 상태 | 시사점 |
|---|---|---|

- "핵심은 이거예요." 로 시작하는 결론 문단 (3~4줄)
- 앞으로 체크할 포인트 번호 매겨서 (① ②)

**8. 앞으로 체크할 포인트**
- 3가지 항목, 각각 한 문단씩
- 날짜/이벤트 기반으로 구체적으로

**9. 마무리**
- "더 자세한 [종목명] 분석 데이터와 다른 종목의 심층 분석이 궁금하시다면 SimplyStock에 직접 방문해서 확인해보세요!"
- 링크: https://simplystock.co.kr
- 댓글 유도 + 다음 종목 질문 유도

**10. 투자 면책 문구** (글 맨 마지막에 다시)

**11. 네이버 블로그 발행 설정** (SEO 섹션)
글 맨 마지막에 아래 형식으로 추가:
\`\`\`
## ✏️ 네이버 블로그 발행 설정

- 카테고리: 종목 분석
- 제목 서식: "제목" 적용
- 소제목 서식: "소제목2" 적용
- 이미지: 가운데 정렬 + 큰 사이즈
- 공개 설정: 전체 공개
- 발행 시간: 오전 7~8시 또는 저녁 6~7시 권장

태그 (10개):
[실제 태그 나열]
\`\`\`

---

### 📸 이미지 플레이스홀더 형식

이미지가 들어갈 위치마다 반드시 아래 형식으로 표시해:

\`\`\`
📸 [이미지 삽입: {차트 종류} — images/{stockCode}_{suffix}.png]
*이미지 설명 텍스트: {한 줄 설명}*
\`\`\`

사용 가능한 이미지:
1. \`images/{stockCode}_daily_1m.png\` — 일봉 1M 회귀채널
2. \`images/{stockCode}_daily_max.png\` — 일봉 MAX 회귀채널
3. \`images/{stockCode}_weekly.png\` — 주봉 회귀채널
4. \`images/{stockCode}_monthly_max.png\` — 월봉 MAX 회귀채널
5. \`images/{stockCode}_supply_combined.png\` — 수급 합산
6. \`images/{stockCode}_supply_detail.png\` — 수급 주체별
7. \`images/{stockCode}_trading.png\` — 일별 매매동향 테이블
8. \`images/{stockCode}_valuation.png\` — PER 밴드 + EPS
9. \`images/{stockCode}_dart_01_매출실적.png\` — DART 사업보고서 매출실적 테이블
10. \`images/{stockCode}_dart_02_연결재무상태표.png\` — DART 사업보고서 연결재무상태표
11. \`images/{stockCode}_dart_03_포괄손익계산서.png\` — DART 사업보고서 포괄손익계산서
12. \`images/{stockCode}_dart_audit.png\` — DART 감사보고서
13. \`images/{stockCode}_dart_semi.png\` — DART 반기보고서
14. \`images/{stockCode}_dart_quarterly.png\` — DART 분기보고서
15. \`images/{stockCode}_dart_critical.png\` — DART 주요 공시 (영업정지/사업철수)
16. \`images/{stockCode}_dart_stake.png\` — DART 대량보유 변동
17. \`images/{stockCode}_dart_corporate.png\` — DART 기업공시 (배당/증자 등)

총 이미지 수: 최소 8~13장 목표 (네이버 블로그 SEO 최적화)

---

### 투자 면책 문구 (고정)
\`\`\`
본 분석 글은 투자 참고용이며, 투자 결정은 투자자 본인의 판단과 책임 하에 이루어져야 합니다.
SimplyStock은 어떠한 투자 손실에 대해서도 책임을 지지 않습니다.
\`\`\`

---

### 숫자 표기
- 백만원 단위 → 억원/조원 환산 (예: 1,234,567백만원 → 약 1.2조원)
- 영업이익률 소수점 첫째 자리
- 수급은 주 단위 (만주)

---

### ❌ 절대 하지 말 것

- "~합니다. ~입니다." 스타일의 딱딱한 문어체 X
- "당사는 ~로 판단합니다" 같은 증권사 말투 X
- SimplyStock 링크를 맨 마지막에만 억지로 끼워넣기 X → 본문 중간중간에 자연스럽게
- 이미지 없이 텍스트만 길게 쓰기 X → 문단마다 이미지 플레이스홀더 배치
- 전문 용어 설명 없이 그냥 쓰기 X

---

### ✅ 반드시 할 것

- 글 전체 길이: 3,000자 이상 (네이버 SEO)
- 비유는 1개 이상 (회귀채널, PER 등 설명할 때)
- 독자에게 말 걸기: 문단마다 최소 1회
- SimplyStock 자연스럽게 녹이기: 최소 5회 이상 (링크 포함)`;

/**
 * DART 확장 데이터를 프롬프트 섹션으로 변환
 */
function buildDartSection(data) {
  const parts = [];

  // 분기보고서
  const q = data.financials?.quarterly;
  if (q) {
    parts.push(`## 최신 분기보고서 (${q.year}년 ${q.quarter})
- 매출: ${q.revenue?.toLocaleString() ?? "N/A"}원
- 영업이익: ${q.operatingProfit?.toLocaleString() ?? "N/A"}원
- 당기순이익: ${q.netIncome?.toLocaleString() ?? "N/A"}원
- 자본총계: ${q.equity?.toLocaleString() ?? "N/A"}원
→ 3개년 연간 데이터와 비교하여 QoQ, YoY 추이를 분석하세요.`);
  }

  // 주요사항보고서
  const mr = data.financials?.majorReports;
  if (mr && mr.length > 0) {
    const items = mr
      .map((r) => `- **${r.type}** (${r.items.length}건): ${JSON.stringify(r.items[0])}`)
      .join("\n");
    parts.push(`## 주요사항보고서 (최근 6개월)
${items}
→ 각 공시의 투자 임팩트(호재/악재/중립)를 평가하고, "주요 공시 이벤트" 섹션으로 작성하세요.`);
  }

  // 확장 공시 (키워드 태그가 있는 것만 하이라이트)
  const disc = data.financials?.disclosures;
  if (disc && disc.length > 0) {
    const tagged = disc.filter((d) => d.tags && d.tags.length > 0);
    if (tagged.length > 0) {
      const items = tagged
        .slice(0, 10)
        .map((d) => `- [${d.tags.join(",")}] ${d.date} ${d.title}`)
        .join("\n");
      parts.push(`## 주요 키워드 공시 (180일, 상위 ${Math.min(tagged.length, 10)}건)
${items}`);
    }
  }

  return parts.length > 0 ? "\n" + parts.join("\n\n") : "";
}

/**
 * Gemini로 블로그 글 생성 (스트리밍)
 */
async function generateBlogPost(collectedData, outputDir, options = {}) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 입력하세요.");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const { onToken, dartInput } = options;

  const dartSection = buildDartSection(collectedData);

  let userPrompt = `다음 데이터를 바탕으로 종목 분석 블로그 글을 작성해줘.

## 자동 수집 데이터
\`\`\`json
${JSON.stringify(collectedData, null, 2)}
\`\`\`
${dartSection}`;

  if (dartInput && Object.keys(dartInput).length > 0) {
    userPrompt += `

## 사용자 보충 데이터 (선택사항)
\`\`\`json
${JSON.stringify(dartInput, null, 2)}
\`\`\`

위 데이터는 사용자가 직접 보충 입력한 정보야. 자동 수집 데이터와 함께 활용해.`;
  }

  userPrompt += `

이미지 파일명에는 stockCode "${collectedData.stockCode}"를 사용해.
시스템 프롬프트의 구조와 규칙을 정확히 따라 작성해.`;

  console.log("  Gemini 2.5 Flash 글 생성 중...");

  let fullText = "";

  const result = await model.generateContentStream(userPrompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      if (onToken) onToken(text);
    }
  }

  // 제목/태그 파싱
  const lines = fullText.split("\n");
  let title = collectedData.name;
  let tags = [];
  let bodyStart = 0;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.startsWith("[제목]")) {
      title = line.replace("[제목]", "").trim();
      bodyStart = Math.max(bodyStart, i + 1);
    } else if (line.startsWith("[태그]")) {
      tags = line
        .replace("[태그]", "")
        .trim()
        .split(",")
        .map((t) => t.trim());
      bodyStart = Math.max(bodyStart, i + 1);
    }
  }

  // 빈 줄 스킵
  while (bodyStart < lines.length && !lines[bodyStart].trim()) bodyStart++;

  const body = lines.slice(bodyStart).join("\n").trim();

  // 파일 저장
  const postPath = path.join(outputDir, "post.md");
  fs.writeFileSync(postPath, body, "utf-8");

  const meta = {
    title,
    tags,
    category: "종목분석",
    stockCode: collectedData.stockCode,
    stockName: collectedData.name,
    generatedAt: new Date().toISOString(),
  };
  const metaPath = path.join(outputDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  // preview.html 생성
  const htmlBody = await marked(body);
  const previewHtml = buildPreviewHtml(title, htmlBody, collectedData.name);
  const previewPath = path.join(outputDir, "preview.html");
  fs.writeFileSync(previewPath, previewHtml, "utf-8");

  console.log(`  post.md (${body.length}자) 생성 완료`);
  return { title, tags, bodyLength: body.length };
}

function buildPreviewHtml(title, htmlBody, stockName) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f0f14;
      color: #e0e0e0;
      line-height: 1.8;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { color: #fff; font-size: 24px; margin-bottom: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; }
    h2 { color: #a5b4fc; font-size: 20px; margin: 36px 0 16px; }
    h3 { color: #c4b5fd; font-size: 17px; margin: 28px 0 10px; }
    p { margin: 8px 0; }
    img { max-width: 100%; border-radius: 8px; margin: 16px 0; border: 1px solid #333; }
    em { color: #9ca3af; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #333; padding: 8px 12px; text-align: right; }
    th { background: #1e1e2e; color: #a5b4fc; }
    td { background: #16161e; }
    strong { color: #f8fafc; }
    blockquote { border-left: 3px solid #6366f1; padding-left: 16px; color: #9ca3af; margin: 16px 0; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
    hr { border: none; border-top: 1px solid #333; margin: 32px 0; }
    ul, ol { padding-left: 24px; margin: 8px 0; }
    li { margin: 4px 0; }
    code { background: #1e1e2e; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">${stockName} | SimplyStock | ${new Date().toLocaleDateString("ko-KR")}</p>
  ${htmlBody}
</body>
</html>`;
}

module.exports = { generateBlogPost };
