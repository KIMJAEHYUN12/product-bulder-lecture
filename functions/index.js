const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const finnhubApiKey = defineSecret("FINNHUB_API_KEY");

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
    // link 또는 guid에서 URL 추출
    const linkMatch =
      itemXml.match(/<link>(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<]+)\s*(?:\]\]>)?<\/link>/) ||
      itemXml.match(/<guid[^>]*>(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<]+)\s*(?:\]\]>)?<\/guid>/);
    if (titleMatch) {
      const title = titleMatch[1]
        .trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'");
      const url = linkMatch ? linkMatch[1].trim() : "";
      if (title && title.length > 5) items.push({ title, url });
    }
  }
  return items;
}

// ── 시장 데이터 엔드포인트 ─────────────────────────────────────────
exports.market = onRequest(
  { cors: true, secrets: [finnhubApiKey] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const result = { fearGreed: null, news: [], econCalendar: [], commodities: [], kimComment: "" };

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

    // 3. 경제 일정 — 한국 투자자 핵심 일정 (BOK·Fed·통계청 공식 발표 기반)
    {
      const today = new Date();
      const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      // 공식 발표 일정 목록 (날짜 기준 최신화: 2026년)
      const RAW_EVENTS = [
        // ── 한국은행 금통위 기준금리 결정 (2026 BOK 공식 발표 일정 8회) ──
        { d: "2026-02-26", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-04-10", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-05-28", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-07-16", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-08-27", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-10-22", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        { d: "2026-11-26", event: "금통위 기준금리 결정",    tag: "금통위", hot: true  },
        // ── 미국 FOMC 금리 결정 (2026 Fed 공식 발표 일정 8회 — 회의 마지막 날) ──
        { d: "2026-03-18", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-04-29", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-06-17", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-07-29", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-09-16", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-10-28", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        { d: "2026-12-09", event: "미국 FOMC 금리 결정",    tag: "FOMC",  hot: true  },
        // ── 삼성전자 잠정실적 (분기 종료 후 약 1주차 발표) ──
        { d: "2026-04-07", event: "삼성전자 잠정실적 1Q26", tag: "실적",  hot: true  },
        { d: "2026-07-07", event: "삼성전자 잠정실적 2Q26", tag: "실적",  hot: true  },
        { d: "2026-10-07", event: "삼성전자 잠정실적 3Q26", tag: "실적",  hot: true  },
        // ── 소비자물가지수 CPI (통계청, 매월 5~7일) ──
        { d: "2026-03-05", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-04-06", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-05-05", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-06-05", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-07-06", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-08-05", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-09-07", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-10-06", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-11-05", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        { d: "2026-12-07", event: "소비자물가지수 (CPI)",   tag: "물가",  hot: false },
        // ── 월간 수출입 통계 (관세청, 매월 1일 오전 9시) ──
        { d: "2026-03-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-04-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-05-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-06-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-07-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-08-03", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-09-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-10-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-11-02", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        { d: "2026-12-01", event: "월간 수출입 통계",       tag: "무역",  hot: false },
        // ── GDP 속보치 (한국은행, 분기별) ──
        { d: "2026-04-23", event: "GDP 속보치 (1Q26)",      tag: "GDP",   hot: true  },
        { d: "2026-07-23", event: "GDP 속보치 (2Q26)",      tag: "GDP",   hot: true  },
        { d: "2026-10-22", event: "GDP 속보치 (3Q26)",      tag: "GDP",   hot: true  },
      ];

      const events = RAW_EVENTS
        .filter((e) => {
          const d = new Date(e.d);
          return d >= today && d <= endDate;
        })
        .sort((a, b) => new Date(a.d) - new Date(b.d))
        .slice(0, 8)
        .map((e) => ({
          date: e.d.slice(5),   // MM-DD
          event: e.event,
          tag: e.tag,
          hot: e.hot,
        }));

      if (events.length > 0) result.econCalendar = events;
    }

    // 4. 핵심 원재료 시세 (Yahoo Finance 비공식 API — 무료, 키 없음)
    const COMMODITY_SYMBOLS = [
      { key: "copper",   name: "구리",     symbol: "HG=F",  note: "COMEX 선물" },
      { key: "lithium",  name: "리튬 ETF", symbol: "LIT",   note: "Yahoo Finance" },
      { key: "nickel",   name: "니켈",     symbol: "NI=F",  note: "LME 선물" },
      { key: "aluminum", name: "알루미늄", symbol: "ALI=F", note: "LME 선물" },
    ];

    const fetchPrice = async (symbol) => {
      const urls = [
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            signal: AbortSignal.timeout(5000),
          });
          const json = await r.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta?.regularMarketPrice) continue;
          const price = meta.regularMarketPrice;
          const prev = meta.previousClose || meta.chartPreviousClose || price;
          const changePct = ((price - prev) / prev) * 100;
          return { price, changePct, currency: meta.currency || "USD" };
        } catch { /* try next url */ }
      }
      return null;
    };

    const priceResults = await Promise.allSettled(
      COMMODITY_SYMBOLS.map((c) => fetchPrice(c.symbol))
    );

    const commodities = COMMODITY_SYMBOLS.map((c, i) => {
      const val = priceResults[i].status === "fulfilled" ? priceResults[i].value : null;
      return {
        key: c.key,
        name: c.name,
        price: val?.price ?? null,
        changePct: val?.changePct ?? 0,
        currency: val?.currency ?? "USD",
        note: c.note,
      };
    }).filter((c) => c.price !== null);

    result.commodities = commodities;

    // 공장장 킴의 원가 분석 코멘트
    const copper   = commodities.find((c) => c.key === "copper");
    const lithium  = commodities.find((c) => c.key === "lithium");
    const nickel   = commodities.find((c) => c.key === "nickel");
    const aluminum = commodities.find((c) => c.key === "aluminum");

    const comments = [];
    if (copper && Math.abs(copper.changePct) >= 1) {
      comments.push(copper.changePct > 0
        ? `구리 ${copper.changePct.toFixed(1)}% 상승 — 전선·변압기주 원가 부담. 효성중공업·LS일렉트릭 마진 주의.`
        : `구리 ${Math.abs(copper.changePct).toFixed(1)}% 하락 — 전력주 원가엔 숨통. 근데 글로벌 수요 둔화 신호일 수 있어요.`);
    }
    if (lithium && Math.abs(lithium.changePct) >= 1.5) {
      comments.push(lithium.changePct > 0
        ? `리튬 ETF 반등. 양극재·음극재 업체 원가 부담 확인하세요.`
        : `리튬 계속 내리네요. LFP 원가엔 호재지만 광산주는 직격탄입니다.`);
    }
    if (nickel && Math.abs(nickel.changePct) >= 1) {
      comments.push(nickel.changePct > 0
        ? `니켈 상승 — NCM 배터리 원가 직접 영향. 에코프로·엘앤에프 체크 필요합니다.`
        : `니켈 하락. NCM 배터리 원가엔 긍정적. 하지만 수요 신호 같이 봐야 해요.`);
    }
    if (aluminum && Math.abs(aluminum.changePct) >= 1) {
      comments.push(aluminum.changePct > 0
        ? `알루미늄 상승 — 자동차·전장 부품 원가 압력 증가.`
        : `알루미늄 하락 — 완성차·부품주 원가 부담 완화.`);
    }
    result.kimComment = comments.length > 0
      ? comments.join(" ")
      : "원자재 시장 조용합니다. 이럴 때가 더 무서운 거 알죠? 방심 금물.";

    res.json(result);
  }
);
