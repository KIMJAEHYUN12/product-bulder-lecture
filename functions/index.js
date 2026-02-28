const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const finnhubApiKey = defineSecret("FINNHUB_API_KEY");
const kisAppKey = defineSecret("KIS_APP_KEY");
const kisAppSecret = defineSecret("KIS_APP_SECRET");

// ── KIS API 토큰 캐시 (메모리 + Firestore 이중 캐시) ─────────────────
let kisTokenCache = { token: null, expiresAt: 0 };

async function getKisToken(appKey, appSecret) {
  // 1. 메모리 캐시 확인
  if (kisTokenCache.token && Date.now() < kisTokenCache.expiresAt) {
    return kisTokenCache.token;
  }

  // 2. Firestore 캐시 확인 (콜드스타트 대응)
  try {
    const doc = await db.doc("config/kis_token").get();
    if (doc.exists) {
      const cached = doc.data();
      if (cached.token && cached.expiresAt > Date.now()) {
        kisTokenCache = { token: cached.token, expiresAt: cached.expiresAt };
        return cached.token;
      }
    }
  } catch (e) {
    console.warn("Firestore 토큰 캐시 읽기 실패:", e.message);
  }

  // 3. 새 토큰 발급 (하루 1회만)
  const res = await fetch("https://openapi.koreainvestment.com:9443/oauth2/tokenP", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.message || "KIS 토큰 발급 실패");

  const expiresAt = Date.now() + 23 * 60 * 60 * 1000; // 23시간
  kisTokenCache = { token: data.access_token, expiresAt };

  // Firestore에 저장 (다음 콜드스타트 시 재사용)
  try {
    await db.doc("config/kis_token").set({ token: data.access_token, expiresAt });
  } catch (e) {
    console.warn("Firestore 토큰 캐시 저장 실패:", e.message);
  }

  return data.access_token;
}

// 현재 근월물 선물 종목코드 (정규장 전용: A016XX)
function getCurrentFuturesCode() {
  const m = new Date().getMonth() + 1;
  const q = [3, 6, 9, 12];
  const t = q.find((v) => v >= m) || 3;
  return `A016${String(t).padStart(2, "0")}`;
}

// ── 코스피200 선물 엔드포인트 (정규장 KIS API + Firestore 캐싱) ──────
const FUTURES_CACHE_TTL = 5 * 60 * 1000; // 5분

exports.kospiFutures = onRequest(
  { cors: true, secrets: [kisAppKey, kisAppSecret] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 1. Firestore 캐시 확인
      const cacheDoc = await db.doc("config/kospi_futures_cache").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < FUTURES_CACHE_TTL) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      // 2. KIS API 호출
      const appKey = kisAppKey.value();
      const appSecret = kisAppSecret.value();
      const token = await getKisToken(appKey, appSecret);
      const code = getCurrentFuturesCode();

      const url = "https://openapi.koreainvestment.com:9443/uapi/domestic-futureoption/v1/quotations/inquire-price?" +
        new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: "F",
          FID_INPUT_ISCD: code,
        });

      const priceRes = await fetch(url, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
          "appkey": appKey,
          "appsecret": appSecret,
          "tr_id": "FHMIF10000000",
          "custtype": "P",
        },
        signal: AbortSignal.timeout(10000),
      });

      const data = await priceRes.json();
      const o = data.output1;

      if (!o || !o.futs_prpr) {
        res.status(502).json({ error: "선물 데이터 없음", code });
        return;
      }

      const sign = o.prdy_vrss_sign;
      const isDown = sign === "4" || sign === "5";
      const change = parseFloat(o.futs_prdy_vrss) || 0;
      const changePct = parseFloat(o.futs_prdy_ctrt) || 0;

      const result = {
        name: o.hts_kor_isnm || "코스피200선물",
        code,
        price: parseFloat(o.futs_prpr) || 0,
        change: isDown ? -Math.abs(change) : change,
        changePct: isDown ? -Math.abs(changePct) : changePct,
        open: parseFloat(o.futs_oprc) || 0,
        high: parseFloat(o.futs_hgpr) || 0,
        low: parseFloat(o.futs_lwpr) || 0,
        prevClose: parseFloat(o.futs_prdy_clpr) || 0,
        volume: parseInt(o.acml_vol, 10) || 0,
        basis: parseFloat(o.basis) || 0,
      };

      // 3. 캐시 저장
      try {
        await db.doc("config/kospi_futures_cache").set({ data: result, fetchedAt: Date.now() });
      } catch (e) {
        console.warn("시세 캐시 저장 실패:", e.message);
      }

      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(result);
    } catch (err) {
      console.error("KIS API 오류:", err);
      res.status(502).json({
        error: err.message,
        cause: err.cause?.message || err.cause?.code || null,
      });
    }
  }
);

exports.analyze = onRequest(
  { secrets: [geminiApiKey], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { imageBase64, mimeType, mode = "kim", textSummary, stockName } = req.body;
    // 이미지 기반 분석 또는 텍스트 기반 빗각 분석 (MC.R)
    const hasImage = imageBase64 && mimeType;
    const hasText = mode === "makalong" && textSummary;
    if (!hasImage && !hasText) {
      res.status(400).json({ error: "imageBase64/mimeType 또는 textSummary가 필요합니다." });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const MAKALONG_PROMPT = `[SYSTEM INSTRUCTION: MC.R - 빗각 차트 분석 전용 엔진]

당신은 실전 빗각 매매법을 학습한 차트 분석 AI 'MC.R'이다.
존재 이유: 사용자가 올린 차트(주봉·일봉·30분봉·60분봉 등)에서 빗각(대각 추세선)과 평행 채널을 직접 그려주듯 구체적으로 서술하고, 매매 타점과 리스크를 냉정하게 판단하는 것.

━━━ MC.R 빗각 분석 4단계 ━━━

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
- 추임새: "시부레", "앙 ~해", "개나소나", "설레발 적당히", "헛지랄", "말아올린다"
- 결론은 항상 명확하게: "사라 / 팔아라 / 기다려라(되돌림 확인)" 중 하나로 끝낼 것.
- 마지막에 마카롱 특유의 냉소적 조언 한마디 필수.
- 친절한 설명·과도한 위로·근거 없는 긍정론 금지.

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
  "roast": "MC.R 스타일 빗각 총평 300자 이내. 차트에서 보이는 채널 방향(상승/하락/횡보), 현재 가격의 채널 내 위치(상단/중앙/하단), 핵심 패턴(Bull Flag·수렴·S/R Flip·눌림목 등)을 직접 짚어서 설명. 마지막은 반드시 '📐 MC.R 결론:'으로 시작해서 사라/팔아라/기다려라(되돌림 확인) 중 하나로 마무리.",
  "analysis": "◆ STEP 1: 채널 작도\\n차트에서 보이는 주요 고점·저점을 특정하여 어디서 어디까지 빗각을 연결하는지 서술. 3-3 원칙 충족 여부, 채널 신뢰도(고신뢰/잠정), 채널 방향(상승/하락/횡보), 중앙 라인 가격대 명시.\\n\\n◆ STEP 2: 추세·패턴 판별\\n중앙선 지지 여부(매수세 강도), 상승 깃발형(Bull Flag) 유무, 저항 중첩(Confluence) 구간, 삼각수렴·웨지 패턴, 반전 패턴(헤드앤숄더·더블탑) 경계.\\n\\n◆ STEP 3: 매매 타점\\nS/R Flip 발생 여부와 해당 가격대, 눌림목(Retest W자) 진입 조건 충족 여부, 1차·2차 진입 시점, 거래량 동반 여부.\\n\\n◆ STEP 4: 리스크 & 관점 폐기\\n관점 폐기 기준선(가격), 현재 이탈 여부, 손절가. 조건 깨졌으면 '관점 폐기' 명시.\\n\\n◆ MC.R 최종 판정\\n사라/팔아라/기다려라(되돌림 확인) 중 하나. 구체적 진입가·손절가 제시. 마카롱 냉소 한마디.",
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
}`;

      // 텍스트 기반 MC.R 빗각 분석 (이미지 없이 데이터 요약으로 분석)
      const MAKALONG_TEXT_PROMPT = `[SYSTEM INSTRUCTION: MC.R - 빗각 차트 데이터 분석 엔진]

당신은 실전 빗각 매매법을 학습한 차트 분석 AI 'MC.R'이다.
아래는 ${stockName || "종목"}의 실제 가격 데이터에서 수학적으로 계산된 빗각 채널 분석 결과이다.
이 데이터를 기반으로 MC.R 스타일의 매매 판단을 내려라.

[분석 데이터]
${textSummary}

━━━ MC.R 빗각 분석 4단계 ━━━

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
- 추임새: "시부레", "앙 ~해", "개나소나", "설레발 적당히", "헛지랄", "말아올린다"
- 결론은 항상 명확하게: "사라 / 팔아라 / 기다려라(되돌림 확인)" 중 하나로 끝낼 것.
- 마지막에 마카롱 특유의 냉소적 조언 한마디 필수.

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.
중요: analysis는 반드시 하나의 문자열 값이어야 합니다.

{
  "sector": "종목 섹터. 이차전지|반도체|전력|AI|바이오|자동차|혼합|기타 중 하나",
  "roast": "MC.R 스타일 빗각 총평 300자 이내. 채널 방향, 현재 위치, 핵심 패턴을 짚어 설명. 마지막은 반드시 '📐 MC.R 결론:'으로 시작해서 사라/팔아라/기다려라(되돌림 확인) 중 하나로 마무리.",
  "analysis": "◆ STEP 1~4 분석 내용을 하나의 문자열로. 구체적 가격·수치 포함.",
  "grade": "S(강력매수 타점)|A(매수 유리)|B(중립 관망)|C(주의)|D(위험)|F(관점 폐기) 중 하나",
  "scores": {
    "diversification": "채널 신뢰도 0~100",
    "returns": "추세 강도 0~100",
    "stability": "패턴 안정성 0~100",
    "momentum": "모멘텀 0~100",
    "risk_management": "리스크 관리 0~100"
  }
}`;

      const prompt = mode === "makalong" ? (hasText ? MAKALONG_TEXT_PROMPT : MAKALONG_PROMPT) : `당신은 현장직 베테랑 출신의 주식 전문가 '오비젼(OVISION)'입니다.
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
  "analysis": "현장 전문가 분석 400자 이내. 섹터 전문 지식(수율·수주잔고·마진율 등 구체적 수치) 활용. 포트폴리오 리스크와 개선 방향 포함. 베테랑의 묵직한 조언 톤.",
  "grade": "포트폴리오 전체 등급. S(탁월)|A(우수)|B(평범)|C(우려)|D(심각)|F(손절권고) 중 하나",
  "scores": {
    "diversification": 0~100 정수,
    "returns": 0~100 정수,
    "stability": 0~100 정수,
    "momentum": 0~100 정수,
    "risk_management": 0~100 정수
  }
}`;

      // SSE 스트리밍 헤더
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      // 이미지가 있으면 이미지+프롬프트, 없으면 텍스트만
      const contentParts = hasImage
        ? [prompt, { inlineData: { mimeType, data: imageBase64 } }]
        : [prompt];
      const streamResult = await model.generateContentStream(contentParts);

      let fullText = "";
      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ t: text })}\n\n`);
        }
      }

      // 전체 텍스트 파싱 후 최종 결과 전송
      const cleaned = fullText.trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("JSON 파싱 실패:", parseErr.message, "원본:", cleaned.slice(0, 200));
        parsed = {
          sector: "기타",
          roast: fullText,
          analysis: "분석 데이터를 파싱하지 못했습니다.",
          grade: null,
          scores: null,
          chartLines: null,
        };
      }

      res.write(`data: ${JSON.stringify({ done: true, r: parsed })}\n\n`);
      res.end();
    } catch (err) {
      console.error(err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
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
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
      let url = linkMatch ? linkMatch[1].trim().replace(/&amp;/g, "&") : "";
      // Bing 리다이렉트 URL에서 실제 뉴스 URL 추출
      const bingUrl = url.match(/[?&]url=(https?%3a[^&]+)/i);
      if (bingUrl) {
        try { url = decodeURIComponent(bingUrl[1]); } catch {}
      }
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

      const TAG_URLS = {
        "금통위": "https://www.bok.or.kr/portal/main/contents.do?menuNo=200761",
        "FOMC":   "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
        "실적":   "https://dart.fss.or.kr/dsac001/mainAll.do",
        "물가":   "https://kostat.go.kr/board.es?mid=a10301060200&bid=218",
        "무역":   "https://tradedata.go.kr/",
        "GDP":    "https://ecos.bok.or.kr/",
      };

      // 삼성전자 실적은 Samsung IR 직접 링크
      const EVENT_URL_OVERRIDES = {
        "삼성전자 잠정실적 1Q26": "https://www.samsung.com/sec/ir/ir-events-presentations/events/",
        "삼성전자 잠정실적 2Q26": "https://www.samsung.com/sec/ir/ir-events-presentations/events/",
        "삼성전자 잠정실적 3Q26": "https://www.samsung.com/sec/ir/ir-events-presentations/events/",
      };

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
          url: EVENT_URL_OVERRIDES[e.event] ?? TAG_URLS[e.tag] ?? null,
        }));

      if (events.length > 0) result.econCalendar = events;
    }

    // 4. 핵심 원재료 시세 (Yahoo Finance 비공식 API — 무료, 키 없음)
    const COMMODITY_SYMBOLS = [
      // 귀금속
      { key: "gold",     name: "금",       symbol: "GC=F",  note: "COMEX 선물" },
      { key: "silver",   name: "은",       symbol: "SI=F",  note: "COMEX 선물" },
      { key: "palladium",name: "팔라듐",   symbol: "PA=F",  note: "NYMEX 선물" },
      // 에너지
      { key: "oil",      name: "WTI 원유", symbol: "CL=F",  note: "NYMEX 선물" },
      { key: "natgas",   name: "천연가스", symbol: "NG=F",  note: "NYMEX 선물" },
      { key: "uranium",  name: "우라늄 ETF",symbol: "URA",  note: "Global X ETF" },
      // 산업 금속
      { key: "copper",   name: "구리",     symbol: "HG=F",  note: "COMEX 선물" },
      { key: "nickel",   name: "니켈",     symbol: "NI=F",  note: "LME 선물" },
      { key: "aluminum", name: "알루미늄", symbol: "ALI=F", note: "LME 선물" },
      // 배터리 소재
      { key: "lithium",  name: "리튬 ETF", symbol: "LIT",   note: "Global X ETF" },
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
          const changePct = meta.regularMarketChangePercent
            ?? (prev ? ((price - prev) / prev) * 100 : 0);
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

    // 오비젼의 원가 분석 코멘트
    const gold      = commodities.find((c) => c.key === "gold");
    const silver    = commodities.find((c) => c.key === "silver");
    const palladium = commodities.find((c) => c.key === "palladium");
    const oil       = commodities.find((c) => c.key === "oil");
    const natgas    = commodities.find((c) => c.key === "natgas");
    const uranium   = commodities.find((c) => c.key === "uranium");
    const copper    = commodities.find((c) => c.key === "copper");
    const nickel    = commodities.find((c) => c.key === "nickel");
    const aluminum  = commodities.find((c) => c.key === "aluminum");
    const lithium   = commodities.find((c) => c.key === "lithium");

    const comments = [];
    if (gold && Math.abs(gold.changePct) >= 0.8) {
      comments.push(gold.changePct > 0
        ? `금 ${gold.changePct.toFixed(1)}% 상승 — 안전자산 수요 증가. 위험 회피 심리 확인하세요.`
        : `금 ${Math.abs(gold.changePct).toFixed(1)}% 하락 — 달러·위험자산 선호로 전환. 증시엔 단기 호재.`);
    }
    if (oil && Math.abs(oil.changePct) >= 1.5) {
      comments.push(oil.changePct > 0
        ? `WTI ${oil.changePct.toFixed(1)}% 상승 — S-Oil·SK이노베이션 마진 개선 기대. 화학주도 체크.`
        : `WTI ${Math.abs(oil.changePct).toFixed(1)}% 하락 — 정유주 정제마진 압박. 에너지 수입 원가엔 긍정적.`);
    }
    if (uranium && Math.abs(uranium.changePct) >= 1.5) {
      comments.push(uranium.changePct > 0
        ? `우라늄 ETF 상승 — 원전 테마 주목. 두산에너빌리티·한전기술 수혜 가능.`
        : `우라늄 ETF 하락. 원전 관련주 단기 조정 가능.`);
    }
    if (copper && Math.abs(copper.changePct) >= 1) {
      comments.push(copper.changePct > 0
        ? `구리 ${copper.changePct.toFixed(1)}% 상승 — 전선·변압기주 원가 부담. LS일렉트릭·효성중공업 마진 주의.`
        : `구리 ${Math.abs(copper.changePct).toFixed(1)}% 하락 — 전력주 원가 숨통. 글로벌 수요 둔화 신호인지 같이 봐야 해요.`);
    }
    if (nickel && Math.abs(nickel.changePct) >= 1) {
      comments.push(nickel.changePct > 0
        ? `니켈 상승 — NCM 배터리 원가 직접 영향. 에코프로·엘앤에프 체크 필요합니다.`
        : `니켈 하락. NCM 배터리 원가엔 긍정적. 수요 신호 같이 봐야 해요.`);
    }
    if (palladium && Math.abs(palladium.changePct) >= 1.5) {
      comments.push(palladium.changePct > 0
        ? `팔라듐 상승 — 촉매변환기 원가 부담. 현대모비스·자동차 부품주 원가 주의.`
        : `팔라듐 하락. 자동차 부품 원가 완화. 전기차 전환 가속 신호일 수도.`);
    }
    if (natgas && Math.abs(natgas.changePct) >= 2) {
      comments.push(natgas.changePct > 0
        ? `천연가스 ${natgas.changePct.toFixed(1)}% 상승 — 제조업 전기요금 부담 증가. 에너지 집약 산업 원가 주의.`
        : `천연가스 하락 — 에너지 비용 완화. 화학·철강주 원가엔 긍정적.`);
    }
    if (lithium && Math.abs(lithium.changePct) >= 1.5) {
      comments.push(lithium.changePct > 0
        ? `리튬 ETF 반등. 양극재 업체 원가 부담 확인하세요.`
        : `리튬 계속 내리네요. LFP 원가엔 호재지만 광산주는 직격탄입니다.`);
    }
    if (silver && Math.abs(silver.changePct) >= 1.5) {
      comments.push(silver.changePct > 0
        ? `은 ${silver.changePct.toFixed(1)}% 상승 — 태양광 패널·전자부품 원가 상승. 반도체 소재 주의.`
        : `은 하락. 산업용 수요 감소 신호인지 확인 필요.`);
    }
    if (aluminum && Math.abs(aluminum.changePct) >= 1) {
      comments.push(aluminum.changePct > 0
        ? `알루미늄 상승 — 자동차·전장 부품 원가 압력 증가.`
        : `알루미늄 하락 — 완성차·부품주 원가 부담 완화.`);
    }
    result.kimComment = comments.length > 0
      ? comments.slice(0, 3).join(" ")  // 최대 3개 코멘트로 제한
      : "원자재 시장 조용합니다. 이럴 때가 더 무서운 거 알죠? 방심 금물.";

    res.json(result);
  }
);

// ── 투자 성향 분석 엔드포인트 ─────────────────────────────────────────
exports.investorProfile = onRequest(
  { secrets: [geminiApiKey], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { mbti = "", history = [], holdings = {}, returnPct = 0, totalAsset = 10000000 } = req.body;

    const buyCount = history.filter((h) => h.type === "buy").length;
    const sellCount = history.filter((h) => h.type === "sell").length;
    const holdingCount = Object.keys(holdings).length;
    const hasHistory = history.length > 0;
    const profitLoss = totalAsset - 10000000;

    const tradeCounts = {};
    history.forEach((h) => {
      tradeCounts[h.name] = (tradeCounts[h.name] || 0) + 1;
    });
    const topTrades = Object.entries(tradeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, cnt]) => `${name}(${cnt}회)`)
      .join(", ");

    const prompt = `당신은 주식 투자 성향 분석 AI입니다. 아래 데이터를 보고 투자자의 성향을 날카롭게 분석하세요.

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
}`;

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          type: "분석 오류",
          emoji: "🤔",
          description: "데이터 파싱에 실패했습니다.",
          traits: [],
          strength: "-",
          weakness: "-",
          kimComment: "이거 뭔데...",
        };
      }
      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 종목 뉴스 엔드포인트 ────────────────────────────────────────────
exports.stockRoast = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "name이 필요합니다." });
      return;
    }

    // Bing News RSS로 관련 뉴스 검색
    let news = [];
    const searchQuery = encodeURIComponent(`${name} 주가`);
    try {
      const rssRes = await fetch(
        `https://www.bing.com/news/search?q=${searchQuery}&format=RSS`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(6000),
        }
      );
      const rssText = await rssRes.text();
      news = parseRssItems(rssText, 5);
    } catch (err) {
      console.warn(`뉴스 RSS 실패:`, err.message);
    }

    res.json({ news });
  }
);

// ── 주식 차트 데이터 (OHLCV) 엔드포인트 ─────────────────────────────
exports.stockChart = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { symbol, range = "6mo", interval = "1d" } = req.query;
  if (!symbol) {
    res.status(400).json({ error: "symbol 파라미터가 필요합니다." });
    return;
  }

  // 유효한 range/interval 조합 검증
  const VALID_RANGES = ["1mo", "3mo", "6mo", "1y", "2y"];
  const VALID_INTERVALS = ["1d", "1wk"];
  const safeRange = VALID_RANGES.includes(range) ? range : "6mo";
  const safeInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";

  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${safeInterval}&range=${safeRange}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${safeInterval}&range=${safeRange}`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      const json = await r.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!timestamps || !quote) continue;

      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        const v = quote.volume?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({
          time: timestamps[i],
          open: Math.round(o),
          high: Math.round(h),
          low: Math.round(l),
          close: Math.round(c),
          volume: v || 0,
        });
      }

      const meta = result.meta;
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json({
        symbol: meta?.symbol || symbol,
        name: meta?.shortName || meta?.longName || symbol,
        currency: meta?.currency || "KRW",
        candles,
      });
      return;
    } catch { /* try next */ }
  }

  res.status(502).json({ error: "Yahoo Finance 데이터 조회 실패" });
});

// ── 주식 현재가 엔드포인트 ─────────────────────────────────────────
exports.stockPrices = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { symbols } = req.body;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    res.status(400).json({ error: "symbols 배열이 필요합니다." });
    return;
  }

  const fetchStockPrice = async (symbol) => {
    const urls = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
          signal: AbortSignal.timeout(6000),
        });
        const json = await r.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) continue;
        const price = meta.regularMarketPrice;
        // regularMarketChangePercent: Yahoo Finance가 직접 제공하는 등락률 (가장 정확)
        const changePct = meta.regularMarketChangePercent
          ?? (meta.previousClose ? ((price - meta.previousClose) / meta.previousClose) * 100 : 0);
        const name = meta.shortName || meta.longName || symbol;
        return { price, changePct, name, currency: meta.currency || "KRW" };
      } catch { /* try next */ }
    }
    return null;
  };

  const results = await Promise.allSettled(symbols.map((s) => fetchStockPrice(s)));

  const data = {};
  symbols.forEach((symbol, i) => {
    const val = results[i].status === "fulfilled" ? results[i].value : null;
    if (val) data[symbol] = val;
  });

  res.json(data);
});

// ── 차트 업다운 게임 엔드포인트 ──────────────────────────────────────
const CHART_GAME_STOCKS = [
  { symbol: "005930.KS", name: "삼성전자" },
  { symbol: "000660.KS", name: "SK하이닉스" },
  { symbol: "373220.KS", name: "LG에너지솔루션" },
  { symbol: "207940.KS", name: "삼성바이오로직스" },
  { symbol: "005380.KS", name: "현대차" },
  { symbol: "000270.KS", name: "기아" },
  { symbol: "068270.KS", name: "셀트리온" },
  { symbol: "035420.KS", name: "NAVER" },
  { symbol: "035720.KS", name: "카카오" },
  { symbol: "051910.KS", name: "LG화학" },
  { symbol: "006400.KS", name: "삼성SDI" },
  { symbol: "003670.KS", name: "포스코퓨처엠" },
  { symbol: "247540.KS", name: "에코프로비엠" },
  { symbol: "086520.KS", name: "에코프로" },
  { symbol: "012450.KS", name: "한화에어로스페이스" },
  { symbol: "009150.KS", name: "삼성전기" },
  { symbol: "028260.KS", name: "삼성물산" },
  { symbol: "105560.KS", name: "KB금융" },
  { symbol: "055550.KS", name: "신한지주" },
  { symbol: "066570.KS", name: "LG전자" },
  { symbol: "034730.KS", name: "SK" },
  { symbol: "032830.KS", name: "삼성생명" },
  { symbol: "003550.KS", name: "LG" },
  { symbol: "015760.KS", name: "한국전력" },
  { symbol: "010950.KS", name: "S-Oil" },
  { symbol: "034020.KS", name: "두산에너빌리티" },
  { symbol: "011200.KS", name: "HMM" },
  { symbol: "017670.KS", name: "SK텔레콤" },
  { symbol: "030200.KS", name: "KT" },
  { symbol: "000810.KS", name: "삼성화재" },
  { symbol: "259960.KS", name: "크래프톤" },
  { symbol: "352820.KS", name: "하이브" },
  { symbol: "003490.KS", name: "대한항공" },
  { symbol: "010130.KS", name: "고려아연" },
  { symbol: "036570.KS", name: "엔씨소프트" },
  { symbol: "251270.KS", name: "넷마블" },
  { symbol: "316140.KS", name: "우리금융지주" },
  { symbol: "377300.KS", name: "카카오페이" },
  { symbol: "323410.KS", name: "카카오뱅크" },
  { symbol: "267250.KS", name: "HD현대" },
  { symbol: "329180.KS", name: "HD현대중공업" },
  { symbol: "042700.KS", name: "한미반도체" },
  { symbol: "000720.KS", name: "현대건설" },
  { symbol: "047050.KS", name: "포스코인터내셔널" },
  { symbol: "018260.KS", name: "삼성에스디에스" },
  { symbol: "402340.KS", name: "SK스퀘어" },
  { symbol: "361610.KS", name: "SK아이이테크놀로지" },
  { symbol: "196170.KS", name: "알테오젠" },
  // 코스닥
  { symbol: "041510.KQ", name: "에스엠" },
  { symbol: "293490.KQ", name: "카카오게임즈" },
  { symbol: "403870.KQ", name: "HPSP" },
  { symbol: "067310.KQ", name: "하나마이크론" },
  { symbol: "058470.KQ", name: "리노공업" },
  { symbol: "039030.KQ", name: "이오테크닉스" },
  { symbol: "028300.KQ", name: "HLB" },
  { symbol: "257720.KQ", name: "실리콘투" },
  { symbol: "041920.KQ", name: "메디아나" },
  { symbol: "145020.KQ", name: "휴젤" },
];

const GAME_RANGES = ["3mo", "6mo", "1y"];

exports.chartGame = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const excludeRaw = (req.query.exclude || "").toString();
  const excludeSet = new Set(excludeRaw.split(",").filter(Boolean));

  const candidates = CHART_GAME_STOCKS.filter((s) => !excludeSet.has(s.symbol));
  if (candidates.length === 0) {
    res.status(400).json({ error: "사용 가능한 종목이 없습니다." });
    return;
  }

  // 최대 5회 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const stock = candidates[Math.floor(Math.random() * candidates.length)];
    const range = GAME_RANGES[Math.floor(Math.random() * GAME_RANGES.length)];

    const urls = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?interval=1d&range=${range}`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?interval=1d&range=${range}`,
    ];

    let candles = null;
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        const json = await r.json();
        const result = json?.chart?.result?.[0];
        if (!result) continue;

        const timestamps = result.timestamp;
        const quote = result.indicators?.quote?.[0];
        if (!timestamps || !quote) continue;

        const parsed = [];
        for (let i = 0; i < timestamps.length; i++) {
          const o = quote.open?.[i];
          const h = quote.high?.[i];
          const l = quote.low?.[i];
          const c = quote.close?.[i];
          if (o == null || h == null || l == null || c == null) continue;
          parsed.push({
            time: timestamps[i],
            open: Math.round(o),
            high: Math.round(h),
            low: Math.round(l),
            close: Math.round(c),
          });
        }
        if (parsed.length >= 40) {
          candles = parsed;
          break;
        }
      } catch { /* try next */ }
    }

    if (!candles || candles.length < 40) continue;

    // 75~80% 지점에서 분리
    const splitRatio = 0.75 + Math.random() * 0.05;
    const splitIdx = Math.floor(candles.length * splitRatio);
    const visibleCandles = candles.slice(0, splitIdx);
    const hiddenCandles = candles.slice(splitIdx);

    if (hiddenCandles.length < 3) continue;

    const lastVisible = visibleCandles[visibleCandles.length - 1].close;
    const lastHidden = hiddenCandles[hiddenCandles.length - 1].close;
    const changePct = ((lastHidden - lastVisible) / lastVisible) * 100;

    // 횡보 방지: |changePct| < 0.5% 면 재시도
    if (Math.abs(changePct) < 0.5) continue;

    const direction = changePct > 0 ? "up" : "down";

    // UUID 생성
    const roundId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    res.set("Cache-Control", "no-store");
    res.json({
      roundId,
      visibleCandles,
      hiddenCandles,
      direction,
      changePct: Math.round(changePct * 10) / 10,
      stockName: stock.name,
      stockSymbol: stock.symbol,
    });
    return;
  }

  res.status(502).json({ error: "게임 데이터 생성 실패. 다시 시도해주세요." });
});

// ── 한국 주식 한글→영문 매핑 (KRX 전체 KOSPI+KOSDAQ ~2,600종목) ────
const krStocksRaw = require("./data/krStocks.json");
const KR_STOCK_MAP = krStocksRaw.map((r) => ({
  symbol: r.s,
  name: r.n,
  exchange: r.m === "P" ? "코스피" : "코스닥",
}));

// 한글 검색인지 판별
function isKorean(text) {
  return /[가-힣]/.test(text);
}

// ── 종목 검색 엔드포인트 (Yahoo Finance 자동완성 + 한글 로컬 매핑) ────
exports.stockSearch = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const q = (req.query.q || "").trim();
  if (!q || q.length < 1) {
    res.json([]);
    return;
  }

  // 1. 한글 입력 → 로컬 매핑에서 검색
  if (isKorean(q)) {
    const lower = q.toLowerCase();
    const localResults = KR_STOCK_MAP
      .filter((s) => s.name.toLowerCase().includes(lower))
      .slice(0, 12)
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        exchange: s.exchange,
        type: "Equity",
      }));

    if (localResults.length > 0) {
      res.set("Cache-Control", "public, max-age=600, s-maxage=600");
      res.json(localResults);
      return;
    }
  }

  // 2. 영문/숫자 → Yahoo Finance 검색
  const urls = [
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      const json = await r.json();
      const quotes = json?.quotes || [];

      // 한국 주식만 필터 (.KS = 코스피, .KQ = 코스닥)
      let results = quotes
        .filter((q) => q.symbol && (q.symbol.endsWith(".KS") || q.symbol.endsWith(".KQ")))
        .map((q) => {
          // Yahoo 영문명 → 한글명 매핑 시도
          const mapped = KR_STOCK_MAP.find((s) => s.symbol === q.symbol);
          return {
            symbol: q.symbol,
            name: mapped ? mapped.name : (q.shortname || q.longname || q.symbol),
            exchange: q.symbol.endsWith(".KS") ? "코스피" : "코스닥",
            type: q.typeDisp || q.quoteType || "",
          };
        });

      res.set("Cache-Control", "public, max-age=600, s-maxage=600");
      res.json(results);
      return;
    } catch { /* try next */ }
  }

  res.status(502).json({ error: "종목 검색 실패" });
});

// ── 종목 분석실 AI 브리핑 (SSE 스트리밍) ──────────────────────────
exports.stockBriefing = onRequest(
  { secrets: [geminiApiKey], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { stocks, news, mode } = req.body;
    if (!Array.isArray(stocks) || stocks.length === 0) {
      res.status(400).json({ error: "stocks 배열이 필요합니다." });
      return;
    }

    const isSingle = mode === "single" || stocks.length === 1;

    const stockInfo = stocks.map((s) => {
      const newsForStock = (news || []).find((n) => n.stockName === s.name);
      const headlines = newsForStock?.headlines?.slice(0, 5).join(", ") || "뉴스 없음";
      return `[${s.name} (${s.symbol})]
차트 요약: ${s.chartSummary || "없음"}
관련 뉴스: ${headlines}`;
    }).join("\n\n");

    const prompt = isSingle
      ? `당신은 냉소적이지만 분석은 정밀한 주식 전문가 '오비젼(OVISION)'입니다.

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
}`
      : `당신은 냉소적이지만 분석은 정밀한 주식 전문가 '오비젼(OVISION)'입니다.

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
}`;

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const streamResult = await model.generateContentStream(prompt);
      let fullText = "";

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ t: text })}\n\n`);
        }
      }

      const cleaned = fullText.trim()
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          briefing: fullText,
          verdict: isSingle ? "관망" : stocks[0]?.name || "판단 불가",
          riskLevel: "medium",
          keyPoints: [],
        };
      }

      res.write(`data: ${JSON.stringify({ done: true, r: parsed })}\n\n`);
      res.end();
    } catch (err) {
      console.error(err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
);

// ── 투자자 동향 (외국인/기관/개인 순매수) ────────────────────────────
const INVESTOR_CACHE_TTL = 5 * 60 * 1000; // 5분

exports.investorTrend = onRequest(
  { cors: true, secrets: [kisAppKey, kisAppSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { symbol } = req.body;
    if (!symbol) {
      res.status(400).json({ error: "symbol이 필요합니다." });
      return;
    }

    // 005930.KS → 005930
    const code = symbol.replace(/\.\w+$/, "");
    const cacheKey = `investor_trend_${code}`;

    try {
      // 1. Firestore 캐시 확인
      const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < INVESTOR_CACHE_TTL) {
          res.json(cached.data);
          return;
        }
      }

      // 2. KIS API 호출 — 주식현재가 투자자
      const appKey = kisAppKey.value();
      const appSecret = kisAppSecret.value();
      const token = await getKisToken(appKey, appSecret);

      const url = "https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-investor?" +
        new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: "J",
          FID_INPUT_ISCD: code,
        });

      const apiRes = await fetch(url, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
          "appkey": appKey,
          "appsecret": appSecret,
          "tr_id": "FHKST01010900",
          "custtype": "P",
        },
        signal: AbortSignal.timeout(10000),
      });

      const data = await apiRes.json();
      const items = data.output || [];

      if (items.length === 0) {
        res.status(502).json({ error: "투자자 데이터 없음", symbol });
        return;
      }

      // 최근 20일 데이터 파싱
      const daily = items.slice(0, 20).map((item) => ({
        date: item.stck_bsop_date,
        foreign: parseInt(item.frgn_ntby_qty, 10) || 0,
        institution: parseInt(item.orgn_ntby_qty, 10) || 0,
        individual: parseInt(item.prsn_ntby_qty, 10) || 0,
      }));

      // 당일 요약 (첫 번째 항목)
      const today = daily[0] || { foreign: 0, institution: 0, individual: 0 };

      const result = {
        symbol,
        summary: {
          foreign: today.foreign,
          institution: today.institution,
          individual: today.individual,
        },
        daily: daily.reverse(), // 오래된 순서로 정렬
      };

      // 3. 캐시 저장
      try {
        await db.doc(`cache/${cacheKey}`).set({ data: result, fetchedAt: Date.now() });
      } catch (e) {
        console.warn("투자자 캐시 저장 실패:", e.message);
      }

      res.json(result);
    } catch (err) {
      console.error("투자자 동향 API 오류:", err);
      res.status(502).json({
        error: err.message,
        cause: err.cause?.message || err.cause?.code || null,
      });
    }
  }
);

// ── 인기 분석 종목 ──────────────────────────────────────────────────
exports.popularStocks = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    try {
      const { action, symbol, name } = req.body || {};
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const docRef = db.doc(`analysis_counts/${today}`);

      if (action === "increment" && symbol && name) {
        await db.runTransaction(async (t) => {
          const doc = await t.get(docRef);
          const data = doc.exists ? doc.data() : {};
          const current = data[symbol] || { name, count: 0 };
          current.count += 1;
          current.name = name;
          t.set(docRef, { ...data, [symbol]: current }, { merge: true });
        });
        res.json({ ok: true });
      } else {
        // list: 오늘 TOP 5
        const doc = await docRef.get();
        if (!doc.exists) {
          res.json([]);
          return;
        }
        const data = doc.data();
        const entries = Object.entries(data)
          .map(([sym, v]) => ({ symbol: sym, name: v.name, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        res.json(entries);
      }
    } catch (err) {
      console.error("popularStocks 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
