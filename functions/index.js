const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.analyze = onRequest(
  { secrets: [geminiApiKey], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: "imageBase64와 mimeType이 필요합니다." });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `당신은 38세 현장직 베테랑 출신의 주식 전문가 '독설가 킴'입니다.
2차전지 분리막 공정 → 반도체 장비 업체 → IT 스타트업 CFO를 거쳐 현재 개인 투자자 겸 팟캐스트 진행자.
말투는 냉소적이지만 분석만큼은 공장장급으로 정밀합니다.

[6대 산업 전문 지식 — 분석에 반드시 활용]
- 이차전지: 분리막 코팅 수율(일반 85%→고성능 92%), 전해질 첨가제 배합비 특허, CATL LFP 원가 $85/kWh 대비 국산 NCM 원가구조, 양극재 리튬 함량 12% vs 15% 등급 차이
- 반도체: HBM3E→HBM4 전환 수율 이슈(현재 43%), ASML EUV 1대 2,000억원 × 대기 12개월, GAA 3nm 양산 수율 현실(목표 70% vs 실제 45~52%), CoWoS 패키징 병목
- 전력/에너지: 변압기 수주잔고 소화 기간(업계 평균 2.5년치), HVDC 국산화율 67%, 규소강판 수급 중국 의존도 71%, 미국 IRA 제조세액공제 구조
- AI/IT: GPU H100 렌탈 $2.5/hr × TCO 대비 SaaS 마진율, 진짜 API 호출 볼륨 vs IR 과장 패턴, 오픈소스 Llama 3.1 대체 위협, 리니지식 고래 유저(상위 1% = 매출 60%) BM 한계
- 바이오: 임상 3상 평균 성공률 9.8%, FDA 패스트트랙 평균 소요 8.3개월, 기술이전 선급금 vs 마일스톤 비율, 현금 런웨이 18개월 기준선
- 자동차/모빌리티: 현대모비스 1차 벤더 단가 인하 압력(연 2~5%), ADAS 레벨3 양산 ASIL-D 인증 현실(2~3년 소요), OTA 수익화 모델 미완성, BEV 전용 플랫폼 vs ICE 개조 원가 차이

포트폴리오 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
다른 텍스트나 마크다운 코드블록 없이 순수 JSON만 반환하세요.

{
  "sector": "이미지에서 감지된 지배적 섹터. 이차전지|반도체|전력|AI|바이오|자동차|혼합|기타 중 하나",
  "roast": "냉소적 독설 300자 이내. 반드시 수익률/종목명 수치로 찌르기. 2차전지 있으면 공정 디테일로 추가 팩폭. 마지막 줄은 반드시 '💊 액막이 한마디:'로 시작하는 한 줄 조언.",
  "analysis": "현장 전문가 분석 400자 이내. 섹터 전문 지식(수율·수주잔고·마진율 등 구체적 수치) 활용. 포트폴리오 리스크와 개선 방향 포함. 38세 베테랑의 묵직한 조언 톤.",
  "grade": "포트폴리오 전체 등급. S(탁월)|A(우수)|B(평범)|C(우려)|D(심각)|F(손절권고) 중 하나",
  "scores": {
    "diversification": 0~100 정수,
    "returns": 0~100 정수,
    "stability": 0~100 정수,
    "momentum": 0~100 정수,
    "risk_management": 0~100 정수
  }
}`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: imageBase64 } },
      ]);

      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          sector: "기타",
          roast: rawText,
          analysis: "분석 데이터를 파싱하지 못했습니다.",
          grade: null,
          scores: null,
        };
      }

      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── RSS 파싱 헬퍼 ──────────────────────────────────────────────────
function parseRssItems(xml, maxItems) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const itemXml = match[1];
    const titleMatch = itemXml.match(
      /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/
    );
    if (titleMatch) {
      const title = titleMatch[1]
        .trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'");
      if (title && title.length > 5) items.push(title);
    }
  }
  return items;
}

// ── 시장 데이터 엔드포인트 ─────────────────────────────────────────
exports.market = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const result = { fearGreed: null, news: [] };

    // 1. 공포/탐욕 지수 (alternative.me — 무료, 키 없음)
    try {
      const fgRes = await fetch(
        "https://api.alternative.me/fng/?limit=1",
        { signal: AbortSignal.timeout(5000) }
      );
      const fgData = await fgRes.json();
      const fg = fgData.data?.[0];
      if (fg) {
        result.fearGreed = {
          value: parseInt(fg.value, 10),
          label: fg.value_classification,
        };
      }
    } catch (err) {
      console.warn("Fear & Greed API 실패:", err.message);
    }

    // 2. 뉴스 (연합뉴스 경제 RSS — 무료)
    const RSS_SOURCES = [
      "https://www.yna.co.kr/rss/economy.xml",
      "https://rss.hankyung.com/feed/finance.xml",
    ];
    for (const url of RSS_SOURCES) {
      try {
        const rssRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; OvisionBot/1.0)" },
          signal: AbortSignal.timeout(6000),
        });
        const rssText = await rssRes.text();
        const items = parseRssItems(rssText, 12);
        if (items.length > 0) {
          result.news = items;
          break;
        }
      } catch (err) {
        console.warn(`RSS 실패 (${url}):`, err.message);
      }
    }

    res.json(result);
  }
);
