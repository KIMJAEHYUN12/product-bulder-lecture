const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ovision Functions 프록시용
const OVISION_HOST = "https://bitgak.co.kr";

admin.initializeApp();
const db = admin.firestore();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const finnhubApiKey = defineSecret("FINNHUB_API_KEY");
const kisAppKey = defineSecret("KIS_APP_KEY");
const kisAppSecret = defineSecret("KIS_APP_SECRET");
const dartApiKey = defineSecret("DART_API_KEY");

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

// 특정 월의 두 번째 목요일(만기일) 계산
function getSecondThursday(year, month) {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay(); // 0=일 ~ 6=토
  const firstThu = dow <= 4 ? 1 + (4 - dow) : 1 + (11 - dow);
  return new Date(year, month - 1, firstThu + 7);
}

// 만기일 기준 근월물 선물 종목코드 (A016XX)
function getCurrentFuturesCode() {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const y = kst.getFullYear();
  const m = kst.getMonth() + 1;
  const q = [3, 6, 9, 12];

  // 현재 분기 또는 다음 분기 근월물 찾기
  for (let i = 0; i < q.length; i++) {
    const qm = q[i];
    const qy = qm >= m ? y : y + 1;
    const expiry = getSecondThursday(qy, qm);
    // 만기일 당일 15:45 이후 → 다음 근월물로 롤오버
    const expiryLimit = new Date(expiry);
    expiryLimit.setHours(15, 45, 0, 0);
    if (kst < expiryLimit) {
      return `A016${String(qm).padStart(2, "0")}`;
    }
  }
  // fallback: 내년 3월물
  return "A01603";
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

// ── 야간선물 테스트 엔드포인트 (NA0163 코드로 REST API 조회) ──────
exports.kospiFuturesNightTest = onRequest(
  { cors: true, secrets: [kisAppKey, kisAppSecret] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const nightCode = req.query.code || "NA0163";
    const mrktDiv = req.query.mrkt || "F";
    const trId = req.query.trid || "FHMIF10000000";

    try {
      const appKey = kisAppKey.value();
      const appSecret = kisAppSecret.value();
      const token = await getKisToken(appKey, appSecret);

      const url = "https://openapi.koreainvestment.com:9443/uapi/domestic-futureoption/v1/quotations/inquire-price?" +
        new URLSearchParams({
          FID_COND_MRKT_DIV_CODE: mrktDiv,
          FID_INPUT_ISCD: nightCode,
        });

      const priceRes = await fetch(url, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
          "appkey": appKey,
          "appsecret": appSecret,
          "tr_id": trId,
          "custtype": "P",
        },
        signal: AbortSignal.timeout(10000),
      });

      const data = await priceRes.json();

      // 디버깅용: raw 응답 전체 반환
      res.json({
        requestCode: nightCode,
        mrktDiv,
        trId,
        rtCode: data.rt_cd,
        msgCode: data.msg_cd,
        msg: data.msg1,
        output1: data.output1 || null,
        raw: data,
      });
    } catch (err) {
      console.error("야간선물 테스트 오류:", err);
      res.status(502).json({ error: err.message });
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

      const MAKALONG_PROMPT = `[SYSTEM INSTRUCTION: 오비젼 - 빗각 차트 분석 전용 엔진]

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
  "analysis": "◆ STEP 1: 채널 작도\\n차트에서 보이는 주요 고점·저점을 특정하여 어디서 어디까지 빗각을 연결하는지 서술. 3-3 원칙 충족 여부, 채널 신뢰도(고신뢰/잠정), 채널 방향(상승/하락/횡보), 중앙 라인 가격대 명시.\\n\\n◆ STEP 2: 추세·패턴 판별\\n중앙선 지지 여부(매수세 강도), 상승 깃발형(Bull Flag) 유무, 저항 중첩(Confluence) 구간, 삼각수렴·웨지 패턴, 반전 패턴(헤드앤숄더·더블탑) 경계.\\n\\n◆ STEP 3: 매매 타점\\nS/R Flip 발생 여부와 해당 가격대, 눌림목(Retest W자) 진입 조건 충족 여부, 1차·2차 진입 시점, 거래량 동반 여부.\\n\\n◆ STEP 4: 리스크 & 관점 폐기\\n관점 폐기 기준선(가격), 현재 이탈 여부, 손절가. 조건 깨졌으면 '관점 폐기' 명시.\\n\\n◆ 오비젼 최종 판정\\n사라/팔아라/기다려라(되돌림 확인) 중 하나. 구체적 진입가·손절가 제시. 냉소적 조언 한마디.",
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

      // 텍스트 기반 오비젼 빗각 분석 (이미지 없이 데이터 요약으로 분석)
      const MAKALONG_TEXT_PROMPT = `[SYSTEM INSTRUCTION: 오비젼 - 빗각 차트 데이터 분석 엔진]

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
}`;

      // 산업 지식 풀 4세트 — 랜덤 선택으로 분석 다양성 확보
      const INDUSTRY_POOLS = [
        // 세트 A — 공정/수율 관점
        `- 이차전지: 건식 전극 코팅 불량률 12~18%, 실리콘 음극재 팽창 제어(300사이클 후 용량 유지율 80% 이하), 전고체 계면 저항 문제(상온 이온전도도 목표 1mS/cm)
- 반도체: HBM4 TSV 16단 적층 수율 35~40%, 백사이드 전력 배선(BSPDN) 양산 2027년 이후 전망, NAND 300단+ 공정 식각 정밀도 한계
- 전력/에너지: 초고압 GIS 리드타임 18~24개월, 해상풍력 하부구조 국산화율 42%, SMR 인허가 타임라인 최소 7년
- AI/IT: 추론 칩(Groq LPU) 토큰당 비용 GPU 대비 1/10 주장, AI 에이전트 SaaS ARR YoY 200%+ 성장, 데이터센터 전력 PUE 1.1 목표 vs 실측 1.3~1.5
- 바이오: ADC(항체약물접합체) 링커 기술 경쟁 치열(DAR 4→8 고부하 추세), GLP-1 비만약 시장 연 $50B 전망 점유율 전쟁
- 자동차/모빌리티: SDV 라인코드 1천만줄 현실(OTA 업데이트 검증 비용 폭증), 배터리 리사이클 블랙매스 리튬 회수율 90% 목표 vs 실제 70~75%`,

        // 세트 B — 밸류에이션/수주 관점
        `- 이차전지: 유럽 CBAM 탄소비용 셀당 $3~5 추가, 북미 IRA AMPC 실수령 $35~45/kWh(요건 충족 시), 장기공급계약 가격 재협상 리스크
- 반도체: 파운드리 ASP 3nm→2nm 단가 점프 40~60%, 장비 수주→매출 인식 시차 평균 6~9개월, 후공정 장비 수주비중 급증
- 전력/에너지: 변압기 원자재(구리·규소강판) 원가 비중 60%, 미국 그리드 투자 연 $80B+, 수주잔고 매출 대비 3배 이상 업체 주목
- AI/IT: GPU 렌탈 vs 자체 구축 BEP 18~24개월 분기점, 클라우드 3사 CapEx 대비 실매출 전환율 30~40%
- 바이오: 기술이전 딜 선급금 5~15% vs 마일스톤 구조, CMO/CDMO 캐파 병목(글로벌 가동률 85%+)
- 자동차/모빌리티: 전기차 보조금 축소 시 판매 탄력성 -15~25%, 하이브리드 역주행 마진율 BEV 대비 2~3%p 높음`,

        // 세트 C — 경쟁구도/리스크 관점
        `- 이차전지: CATL 글로벌 점유율 37% vs 한국 3사 합산 24%, Northvolt 파산 후 유럽 공급망 재편, 인도네시아 니켈 가공광 수출 규제 강화
- 반도체: TSMC vs 삼성 GAA 수율 갭 15~20%p, 중국 SMIC 성숙 공정 자급률 확대(28nm 이상), 일본 라피더스 2nm 양산 불확실성
- 전력/에너지: 한전 누적적자 구조 고착(전기요금 원가회수율 90% 미달), 신재생 간헐성→ESS 4시간 이상 저장 병목, 원전 해체 비용 호기당 1조원+
- AI/IT: 오픈소스 모델 무료화 vs SaaS 과금 구조 충돌(마진 압박), EU AI Act 고위험 분류 규제 리스크, 중소 AI 기업 캐시번 12개월 미만
- 바이오: 중국 바이오시밀러 가격 공세(오리지널 대비 60~70% 할인), FDA 승인 적체(PDUFA 지연 빈번), CDMO 중국 의존도 40%+
- 자동차/모빌리티: 테슬라 가격인하 도미노(경쟁사 ASP 동반 하락), 중국 BYD 해외 덤핑 관세 리스크, 자율주행 L3+ 보험 책임 이슈 미해결`,

        // 세트 D — 매크로/흐름 관점
        `- 이차전지: 리튬 가격 사이클(톤당 $10K↔$80K 스윙), ESS 신규 수요 폭증 vs 셀 재고 부담 병존, 나트륨이온 저가시장 잠식
- 반도체: 메모리 업사이클/다운사이클 현재 위치 판단 핵심, AI 서버 출하 급증 vs 범용 PC·모바일 부진 이중 구조
- 전력/에너지: 금리 인하 시 유틸리티·리츠 상관계수 0.6+, 구리 슈퍼사이클 논쟁(톤당 $10K 돌파 여부), 전력 수요 AI발 연 15%+ 증가
- AI/IT: AI 거품론 vs 실적 증명 단계(매출 아닌 이익으로 판단), 빅테크 CapEx 사이클 피크아웃 시그널 여부, 엣지 AI 전환 시점
- 바이오: 금리 민감도 높음(바이오 = 장기 듀레이션 자산), JPM 헬스케어 컨퍼런스 딜 동향 반영, 대형 M&A 사이클 활성화 여부
- 자동차/모빌리티: 환율 민감도(원/달러 ±50원 = 영업이익 ±수천억), 글로벌 완성차 재고일수 추이(정상 40~60일 vs 현재), 인도·동남아 신흥시장 성장률`
      ];

      const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
      const poolIndex = Math.floor(Math.random() * INDUSTRY_POOLS.length);
      const selectedPool = INDUSTRY_POOLS[poolIndex];

      const prompt = mode === "makalong" ? (hasText ? MAKALONG_TEXT_PROMPT : MAKALONG_PROMPT) : `당신은 현장직 베테랑 출신의 주식 전문가 '오비젼(OVISION)'입니다.
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
      // 단계별로 JSON 추출 시도 (마크다운 코드블록 변형 대응)
      let parsed;
      const tryParse = (str) => { try { return JSON.parse(str); } catch { return null; } };

      // 1) 원본 그대로
      parsed = tryParse(fullText.trim());
      // 2) ```json ... ``` 제거 (느슨한 패턴)
      if (!parsed) {
        const stripped = fullText.trim()
          .replace(/^[\s\S]*?```(?:json)?\s*\n?/i, "")
          .replace(/\n?\s*```[\s\S]*$/, "");
        parsed = tryParse(stripped);
      }
      // 3) 텍스트에서 첫 번째 { ... } 블록 추출
      if (!parsed) {
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = tryParse(jsonMatch[0]);
      }
      // 4) 모든 시도 실패 → roast 필드만이라도 추출
      if (!parsed) {
        console.warn("JSON 파싱 실패, 원본:", fullText.slice(0, 300));
        const roastMatch = fullText.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        parsed = {
          sector: "기타",
          roast: roastMatch
            ? roastMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            : "분석 결과를 파싱하지 못했습니다. 다시 시도해주세요.",
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
const MARKET_CACHE_TTL = 30 * 60 * 1000; // 30분

exports.market = onRequest(
  { cors: true, secrets: [finnhubApiKey] },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const result = { fearGreed: null, news: [], econCalendar: [], commodities: [], kimComment: "" };

    // 0. 원자재+공포탐욕 Firestore 캐시 확인 (30분 TTL)
    let marketCacheHit = false;
    try {
      const cacheDoc = await db.doc("cache/market_commodities").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.fetchedAt && Date.now() - cached.fetchedAt < MARKET_CACHE_TTL) {
          result.fearGreed = cached.fearGreed || null;
          result.commodities = cached.commodities || [];
          result.kimComment = cached.kimComment || "";
          marketCacheHit = true;
        }
      }
    } catch {}

    // 1. 공포/탐욕 지수 (캐시 미스 시에만 호출)
    if (!marketCacheHit) {
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

    // 4. 핵심 원재료 시세 (캐시 미스 시에만 Yahoo 호출)
    if (!marketCacheHit) {
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
          const result = json?.chart?.result?.[0];
          const meta = result?.meta;
          if (!meta?.regularMarketPrice) continue;
          const price = meta.regularMarketPrice;
          let prev = meta.previousClose;
          if (!prev) {
            const closes = result?.indicators?.quote?.[0]?.close?.filter(Boolean) ?? [];
            if (closes.length >= 2) prev = closes[closes.length - 2];
          }
          if (!prev) prev = meta.chartPreviousClose || price;
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

    // 원자재+공포탐욕 캐시 저장
    try {
      await db.doc("cache/market_commodities").set({
        fearGreed: result.fearGreed,
        commodities: result.commodities,
        kimComment: result.kimComment,
        fetchedAt: Date.now(),
      });
    } catch {}
    } // end if (!marketCacheHit)

    res.set("Cache-Control", "public, max-age=120, s-maxage=120");
    res.json(result);
  }
);

// ── 원자재 시세 엔드포인트 ─────────────────────────────────────────────
exports.commodityPrices = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }
    const { symbols } = req.body || {};
    if (!Array.isArray(symbols) || symbols.length === 0) {
      res.status(400).json({ error: "symbols array required" });
      return;
    }
    const limited = symbols.slice(0, 40);

    const fetchPrice = async (symbol) => {
      const urls = [
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          });
          const json = await r.json();
          const result = json?.chart?.result?.[0];
          const meta = result?.meta;
          if (!meta?.regularMarketPrice) continue;
          const price = meta.regularMarketPrice;
          let prev = meta.previousClose;
          if (!prev) {
            const closes = result?.indicators?.quote?.[0]?.close?.filter(Boolean) ?? [];
            if (closes.length >= 2) prev = closes[closes.length - 2];
          }
          if (!prev) prev = meta.chartPreviousClose || price;
          const changePct = meta.regularMarketChangePercent
            ?? (prev ? ((price - prev) / prev) * 100 : 0);
          return { price, changePct, currency: meta.currency || "USD" };
        } catch { /* try next */ }
      }
      return null;
    };

    const results = await Promise.allSettled(
      limited.map((sym) => fetchPrice(sym))
    );

    const data = {};
    limited.forEach((sym, i) => {
      const val = results[i].status === "fulfilled" ? results[i].value : null;
      if (val) data[sym] = val;
    });

    res.set("Cache-Control", "public, max-age=180, s-maxage=180");
    res.json(data);
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

const CHART_CACHE_TTL = 5 * 60 * 1000; // 5분
const RANGE_TO_COUNT = {
  "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365,
  "2y": 500, "5y": 1300, "10y": 2500, "max": 3000,
};
const INTERVAL_TO_TF = { "1d": "day", "1wk": "week", "1mo": "month" };

/** Naver Finance 차트 XML API — KRX 원본 OHLCV */
async function fetchNaverStockChart(symbol, range, interval) {
  const code = symbol.replace(/\.\w+$/, "");
  const count = RANGE_TO_COUNT[range] || 180;
  const timeframe = INTERVAL_TO_TF[interval] || "day";
  const cacheKey = `naver_chart_${code}_${timeframe}_${count}`;

  // 1. Firestore 캐시
  try {
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < CHART_CACHE_TTL) {
        return cached.data;
      }
    }
  } catch {}

  // 2. Naver fchart XML
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=${timeframe}&count=${count}&requestType=0`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    signal: AbortSignal.timeout(10000),
  });
  const xml = await r.text();

  const nameMatch = xml.match(/name="([^"]+)"/);
  const name = nameMatch ? nameMatch[1] : symbol;

  const candles = [];
  const itemRe = /<item data="([^"]+)"\s*\/>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const parts = m[1].split("|");
    if (parts.length < 6) continue;
    const [dateStr, open, high, low, close, volume] = parts;
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const ts = Math.floor(Date.UTC(year, month, day) / 1000);
    const o = parseInt(open);
    const h = parseInt(high);
    const l = parseInt(low);
    const c = parseInt(close);
    if (!o || !h || !l || !c) continue;
    candles.push({ time: ts, open: o, high: h, low: l, close: c, volume: parseInt(volume) || 0 });
  }

  if (candles.length === 0) return null;

  const result = { symbol, name, currency: "KRW", candles };

  // 3. 캐시 저장
  try {
    await db.doc(`cache/${cacheKey}`).set({ data: result, fetchedAt: Date.now() });
  } catch {}

  return result;
}

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
  const VALID_RANGES = ["1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
  const VALID_INTERVALS = ["1d", "1wk", "1mo"];
  const safeRange = VALID_RANGES.includes(range) ? range : "6mo";
  const safeInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";

  // 한국 주식: Naver Finance (KRX 원본) 우선, 실패 시 Yahoo 폴백
  const isKorean = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  if (isKorean) {
    try {
      const naverResult = await fetchNaverStockChart(symbol, safeRange, safeInterval);
      if (naverResult && naverResult.candles.length > 0) {
        console.log(`[stock-chart] Naver OK: ${symbol} ${naverResult.candles.length} candles`);
        res.set("Cache-Control", "public, max-age=300, s-maxage=300");
        res.json(naverResult);
        return;
      }
    } catch (e) {
      console.warn(`[stock-chart] Naver failed for ${symbol}, falling back to Yahoo:`, e.message);
    }
  }

  // 해외 주식 또는 Naver 실패: Yahoo Finance 폴백
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

  res.status(502).json({ error: "차트 데이터 조회 실패" });
});

// ── 주식 현재가 엔드포인트 ─────────────────────────────────────────
const PRICES_CACHE_TTL = 5 * 60 * 1000; // 5분

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

  // 종목별 Firestore 캐시 확인 — 캐시 히트된 종목은 Yahoo 호출 생략
  const data = {};
  const uncachedSymbols = [];

  try {
    const cacheReads = symbols.map((s) =>
      db.doc(`cache/price_${s.replace(/[/.]/g, "_")}`).get()
    );
    const cacheDocs = await Promise.all(cacheReads);
    symbols.forEach((symbol, i) => {
      const doc = cacheDocs[i];
      if (doc.exists) {
        const cached = doc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < PRICES_CACHE_TTL) {
          data[symbol] = cached.data;
          return;
        }
      }
      uncachedSymbols.push(symbol);
    });
  } catch {
    // 캐시 실패 시 전부 Yahoo로 조회
    uncachedSymbols.push(...symbols.filter((s) => !data[s]));
  }

  if (uncachedSymbols.length > 0) {
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
          const changePct = meta.regularMarketChangePercent
            ?? (meta.previousClose ? ((price - meta.previousClose) / meta.previousClose) * 100 : 0);
          const name = meta.shortName || meta.longName || symbol;
          return { price, changePct, name, currency: meta.currency || "KRW" };
        } catch { /* try next */ }
      }
      return null;
    };

    const results = await Promise.allSettled(uncachedSymbols.map((s) => fetchStockPrice(s)));

    // 결과 저장 + 캐시 쓰기
    const cacheWrites = [];
    uncachedSymbols.forEach((symbol, i) => {
      const val = results[i].status === "fulfilled" ? results[i].value : null;
      if (val) {
        data[symbol] = val;
        cacheWrites.push(
          db.doc(`cache/price_${symbol.replace(/[/.]/g, "_")}`).set({ data: val, fetchedAt: Date.now() }).catch(() => {})
        );
      }
    });
    if (cacheWrites.length > 0) await Promise.all(cacheWrites);
  }

  res.set("Cache-Control", "public, max-age=120, s-maxage=120");
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

  const lower = q.toLowerCase();

  // 1. 로컬 매핑 검색 (한글/영문/숫자 공통 — 종목명 + 심볼 모두)
  const starts = [];
  const contains = [];
  for (const s of KR_STOCK_MAP) {
    const nameLow = s.name.toLowerCase();
    const symLow = s.symbol.toLowerCase();
    if (nameLow.startsWith(lower) || symLow.startsWith(lower)) {
      starts.push(s);
    } else if (nameLow.includes(lower) || symLow.includes(lower)) {
      contains.push(s);
    }
  }
  const localResults = [...starts, ...contains]
    .slice(0, 20)
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

  // 2. 로컬에 없으면 Yahoo Finance 검색 (해외 종목 등)
  const urls = [
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      const json = await r.json();
      const quotes = json?.quotes || [];

      const results = quotes
        .filter((q) => q.symbol)
        .slice(0, 20)
        .map((q) => {
          const mapped = KR_STOCK_MAP.find((s) => s.symbol === q.symbol);
          return {
            symbol: q.symbol,
            name: mapped ? mapped.name : (q.shortname || q.longname || q.symbol),
            exchange: mapped ? mapped.exchange : (q.exchDisp || q.exchange || ""),
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

// ── 투자자 동향 (외국인/기관/개인 순매수) — Naver Finance ──────────
const INVESTOR_CACHE_TTL = 10 * 60 * 1000; // 10분

/** Naver Finance 외국인/기관 매매 페이지 파싱 */
function parseNaverInvestorPage(html) {
  const spans = [];
  const re = /<span class="tah[^"]*">([^<]+)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) spans.push(m[1].trim());

  console.log('[DEBUG] 총 span 개수:', spans.length, '첫 22개:', JSON.stringify(spans.slice(0, 22)));

  const dateRe = /^(\d{4}\.\d{2}\.\d{2})$/;
  const parseNum = (s) => parseInt((s || "0").replace(/[+,]/g, ""), 10) || 0;
  const rows = [];
  let i = 0;
  while (i < spans.length) {
    const dm = dateRe.exec(spans[i]);
    if (dm) {
      // 네이버 frgn.naver 실제 9컬럼: [날짜, 종가, 전일비, 등락률, 거래량, 기관순매매, 외국인순매매, 외인보유주수, 외인보유율]
      const date = dm[1].replace(/\./g, "");
      if (i + 8 < spans.length) {
        // 등락률에는 부호가 있지만 전일비는 절댓값만 표시 → changeRate 부호를 priceChange에 적용
        const rawChange = parseNum(spans[i + 2]);
        const rawRate = parseFloat((spans[i + 3] || "0").replace(/[+,%]/g, "")) || 0;
        rows.push({
          date,
          close: parseNum(spans[i + 1]),
          priceChange: rawRate < 0 ? -Math.abs(rawChange) : rawChange,
          changeRate: rawRate,
          volume: parseNum(spans[i + 4]),
          institution: parseNum(spans[i + 5]),
          foreign: parseNum(spans[i + 6]),
          foreignTotal: parseNum(spans[i + 7]),
          foreignPct: parseFloat((spans[i + 8] || "0").replace(/[+,%]/g, "")) || 0,
        });
      }
      i += 9;
    } else {
      i++;
    }
  }
  if (rows.length > 0) {
    console.log('[DEBUG] 첫 번째 파싱 row:', JSON.stringify(rows[0]));
  }
  return rows;
}

exports.investorTrend = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { symbol, days } = req.body;
    if (!symbol) {
      res.status(400).json({ error: "symbol이 필요합니다." });
      return;
    }

    // days → 필요한 페이지 수 (페이지당 20거래일, 최대 25페이지 = ~500일)
    const requestedDays = Math.max(30, Math.min(parseInt(days, 10) || 180, 730));
    const TOTAL_PAGES = Math.min(Math.ceil(requestedDays / 20), 25);

    const code = symbol.replace(/\.\w+$/, "");
    const cacheKey = `inv9s_${code}_${TOTAL_PAGES}p`;

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

      // 2. Naver Finance 외국인/기관 매매 페이지 병렬 크롤링
      const urls = [];
      for (let p = 1; p <= TOTAL_PAGES; p++) {
        urls.push(`https://finance.naver.com/item/frgn.naver?code=${code}&page=${p}`);
      }

      const htmlPages = await Promise.all(
        urls.map((url) =>
          fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
            signal: AbortSignal.timeout(8000),
          }).then((r) => r.text())
        )
      );

      const allRows = [];
      for (const html of htmlPages) {
        allRows.push(...parseNaverInvestorPage(html));
      }

      console.log(`[investor-trend] ${code}: Naver ${allRows.length} rows from ${TOTAL_PAGES} pages`);

      if (allRows.length === 0) {
        res.status(502).json({ error: "투자자 데이터 없음", symbol });
        return;
      }

      // 중복 제거
      const seen = new Set();
      const daily = [];
      for (const row of allRows) {
        if (seen.has(row.date)) continue;
        seen.add(row.date);
        const individual = -(row.foreign + row.institution);
        daily.push({
          date: row.date,
          close: row.close,
          priceChange: row.priceChange,
          changeRate: row.changeRate,
          volume: row.volume,
          foreign: row.foreign,
          institution: row.institution,
          individual,
          foreignTotal: row.foreignTotal,
          foreignPct: row.foreignPct,
        });
      }

      // 오래된 순서로 정렬
      daily.sort((a, b) => a.date.localeCompare(b.date));

      const latest = daily[daily.length - 1] || { foreign: 0, institution: 0, individual: 0 };

      const result = {
        symbol,
        summary: {
          foreign: latest.foreign,
          institution: latest.institution,
          individual: latest.individual,
        },
        daily,
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

// ── AI 추천 종목 ─────────────────────────────────
exports.investorRecommend = onRequest(
  { secrets: [geminiApiKey], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { investorType } = req.body;
    if (!investorType || typeof investorType !== "string") {
      res.status(400).json({ error: "investorType 필수" });
      return;
    }

    const cacheKey = `investor_recommend_${investorType}`;
    try {
      const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        const age = Date.now() - (cached.updatedAt?.toMillis?.() || 0);
        if (age < 6 * 60 * 60 * 1000) {
          res.json({ stocks: cached.stocks });
          return;
        }
      }

      const prompt = `당신은 한국 주식 시장 전문 AI입니다.
투자 성향 유형: "${investorType}"

이 유형의 투자자에게 어울리는 한국 상장 종목 5개를 추천하세요.
실제 존재하는 종목만 추천하세요. 종목코드는 6자리 숫자입니다.

아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만.

{
  "stocks": [
    { "symbol": "005930", "name": "삼성전자", "reason": "추천 이유 1줄 30자 이내" },
    { "symbol": "000660", "name": "SK하이닉스", "reason": "추천 이유 1줄 30자 이내" }
  ]
}`;

      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { stocks: [] };
      }

      const stocks = (parsed.stocks || []).slice(0, 5);

      await db.doc(`cache/${cacheKey}`).set({
        stocks,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ stocks });
    } catch (err) {
      console.error("investorRecommend 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 투자 시그널 스캐너 ──────────────────────────────────────────────
const SEED_SYMBOLS = [
  { symbol: "005930.KS", name: "삼성전자" },
  { symbol: "000660.KS", name: "SK하이닉스" },
  { symbol: "373220.KS", name: "LG에너지솔루션" },
  { symbol: "207940.KS", name: "삼성바이오로직스" },
  { symbol: "005380.KS", name: "현대차" },
  { symbol: "006400.KS", name: "삼성SDI" },
  { symbol: "051910.KS", name: "LG화학" },
  { symbol: "035420.KS", name: "NAVER" },
  { symbol: "000270.KS", name: "기아" },
  { symbol: "035720.KS", name: "카카오" },
  { symbol: "105560.KS", name: "KB금융" },
  { symbol: "055550.KS", name: "신한지주" },
  { symbol: "003670.KS", name: "포스코퓨처엠" },
  { symbol: "068270.KS", name: "셀트리온" },
  { symbol: "028260.KS", name: "삼성물산" },
  { symbol: "012330.KS", name: "현대모비스" },
  { symbol: "066570.KS", name: "LG전자" },
  { symbol: "003550.KS", name: "LG" },
  { symbol: "034730.KS", name: "SK" },
  { symbol: "015760.KS", name: "한국전력" },
  { symbol: "032830.KS", name: "삼성생명" },
  { symbol: "086790.KS", name: "하나금융지주" },
  { symbol: "017670.KS", name: "SK텔레콤" },
  { symbol: "030200.KS", name: "KT" },
  { symbol: "259960.KS", name: "크래프톤" },
  { symbol: "018260.KS", name: "삼성에스디에스" },
  { symbol: "009150.KS", name: "삼성전기" },
  { symbol: "010130.KS", name: "고려아연" },
  { symbol: "047050.KS", name: "포스코인터내셔널" },
  { symbol: "096770.KS", name: "SK이노베이션" },
];

// 네이버 금융에서 시총 상위 종목 스크래핑 (sosok: 0=코스피, 1=코스닥)
async function fetchNaverTopStocks(sosok, count = 20) {
  const results = [];
  const suffix = sosok === 0 ? ".KS" : ".KQ";
  try {
    const maxPages = Math.ceil(count / 50) + 1;
    for (let page = 1; results.length < count && page <= maxPages; page++) {
      const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
        signal: AbortSignal.timeout(8000),
      });
      const buf = await r.arrayBuffer();
      const html = new TextDecoder("euc-kr").decode(buf);
      // <a href="/item/main.naver?code=247540" class="tltle">에코프로비엠</a>
      const regex = /<a\s+href="\/item\/main\.naver\?code=(\d{6})"[^>]*>([^<]+)<\/a>/g;
      let m;
      while ((m = regex.exec(html)) !== null && results.length < count) {
        const code = m[1];
        const name = m[2].trim();
        if (name && !results.some((r) => r.symbol === `${code}${suffix}`)) {
          results.push({ symbol: `${code}${suffix}`, name });
        }
      }
    }
  } catch (e) {
    console.warn(`[fetchNaverTopStocks] sosok=${sosok} 실패:`, e.message);
  }
  return results;
}

function computeRegressionChannel(candles) {
  const n = candles.length;
  if (n < 10) return null;
  const closes = candles.map((c) => c.close);
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += closes[i];
    sumXY += i * closes[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  let sumSqErr = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    sumSqErr += (closes[i] - predicted) ** 2;
  }
  const sigma = Math.sqrt(sumSqErr / n);
  const lastPredicted = intercept + slope * (n - 1);
  const channelBottom = lastPredicted - 2 * sigma;
  const positionPct = ((closes[n - 1] - lastPredicted) / sigma) * 100;
  return { channelBottom: Math.round(channelBottom), positionPct: Math.round(positionPct * 10) / 10, lastPredicted };
}

async function fetchYahoo3mo(symbol) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`,
  ];
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
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open?.[i], h = quote.high?.[i], l = quote.low?.[i], c = quote.close?.[i], v = quote.volume?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({ time: timestamps[i], open: Math.round(o), high: Math.round(h), low: Math.round(l), close: Math.round(c), volume: v || 0 });
      }
      if (candles.length > 0) return candles;
    } catch { /* try next */ }
  }
  return null;
}

async function fetchNaver1page(code) {
  const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=1`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await r.text();
  return parseNaverInvestorPage(html);
}

async function scanOneSymbol(sym) {
  const code = sym.symbol.replace(/\.\w+$/, "");
  const [candles, investorRows] = await Promise.all([
    fetchYahoo3mo(sym.symbol),
    fetchNaver1page(code),
  ]);
  if (!candles || candles.length < 20) return null;
  if (!investorRows || investorRows.length < 3) return null;

  const channel = computeRegressionChannel(candles);
  if (!channel) return null;

  const lastClose = candles[candles.length - 1].close;
  if (lastClose > channel.channelBottom) return null;

  // 최근 3일 기관+외인 누적 순매수
  const recent3 = investorRows.slice(0, 3);
  const net3d = recent3.reduce((s, r) => s + r.institution + r.foreign, 0);
  if (net3d <= 0) return null;

  const foreignNet3d = recent3.reduce((s, r) => s + r.foreign, 0);
  const instNet3d = recent3.reduce((s, r) => s + r.institution, 0);
  const changeRate = investorRows[0]?.changeRate || 0;

  return {
    symbol: sym.symbol,
    name: sym.name,
    close: lastClose,
    channelBottom: channel.channelBottom,
    positionPct: channel.positionPct,
    net3d,
    foreignNet3d,
    instNet3d,
    changeRate,
  };
}

exports.signalsScanner = onRequest(
  { cors: true, timeoutSeconds: 120, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 1. 캐시 확인 (30분 TTL)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const cacheKey = `signals_scanner_v4_${today}`;
      const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < 30 * 60 * 1000) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      // 2. 종목 풀 구성: 시드(코스피) + 네이버 코스닥 시총 상위 + analysis_counts
      const symbolMap = new Map();
      for (const s of SEED_SYMBOLS) symbolMap.set(s.symbol, s.name);

      // 코스닥 시총 상위 20종목 동적 로드
      const kosdaqStocks = await fetchNaverTopStocks(1, 20);
      for (const s of kosdaqStocks) {
        if (!symbolMap.has(s.symbol)) symbolMap.set(s.symbol, s.name);
      }
      console.log(`[signals-scanner] 코스닥 ${kosdaqStocks.length}종목 로드`);

      try {
        const todayDoc = await db.doc(`analysis_counts/${today}`).get();
        if (todayDoc.exists) {
          const data = todayDoc.data();
          for (const [sym, v] of Object.entries(data)) {
            if (!symbolMap.has(sym)) symbolMap.set(sym, v.name);
          }
        }
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, "");
        const ydoc = await db.doc(`analysis_counts/${yesterday}`).get();
        if (ydoc.exists) {
          const data = ydoc.data();
          for (const [sym, v] of Object.entries(data)) {
            if (!symbolMap.has(sym)) symbolMap.set(sym, v.name);
          }
        }
      } catch (e) {
        console.warn("analysis_counts 로드 실패:", e.message);
      }

      const pool = Array.from(symbolMap.entries())
        .map(([symbol, name]) => ({ symbol, name }))
        .slice(0, 60);

      console.log(`[signals-scanner] 스캔 시작: ${pool.length}종목`);

      // 3. 10개씩 배치로 병렬 스캔
      const BATCH = 10;
      const signals = [];
      for (let i = 0; i < pool.length; i += BATCH) {
        const batch = pool.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map(scanOneSymbol));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) signals.push(r.value);
        }
      }

      // positionPct가 작을수록(채널 하단 깊숙이) 높은 우선순위
      signals.sort((a, b) => a.positionPct - b.positionPct);

      const response = {
        signals,
        scannedAt: new Date().toISOString(),
        totalScanned: pool.length,
      };

      // 4. 캐시 저장
      try {
        await db.doc(`cache/${cacheKey}`).set({ data: response, fetchedAt: Date.now() });
      } catch (e) {
        console.warn("시그널 캐시 저장 실패:", e.message);
      }

      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(response);
    } catch (err) {
      console.error("signalsScanner 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 수급 신호 스캐너 (골든크로스 + 수급 필터) ─────────────────────

async function fetchNaverFchart(code, count = 200) {
  const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=${count}&requestType=0`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      signal: AbortSignal.timeout(10000),
    });
    const text = await r.text();
    const candles = [];
    const re = /<item\s+data="([^"]+)"/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const parts = m[1].split("|");
      if (parts.length >= 5) {
        candles.push({ date: parts[0], close: parseInt(parts[4], 10) });
      }
    }
    candles.sort((a, b) => a.date.localeCompare(b.date));
    return candles;
  } catch {
    return null;
  }
}

function maAt(closes, period, idx) {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += closes[i];
  return sum / period;
}

function detectGoldenCrosses(candles, lookback = 5, customPairs = null) {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const results = [];

  const pairs = customPairs || [
    { short: 5, long: 20, type: "5_20" },
    { short: 20, long: 60, type: "20_60" },
  ];

  for (const p of pairs) {
    if (n < p.long + lookback) continue;
    for (let day = 0; day < lookback; day++) {
      const idx = n - 1 - day;
      const s = maAt(closes, p.short, idx);
      const l = maAt(closes, p.long, idx);
      const ps = maAt(closes, p.short, idx - 1);
      const pl = maAt(closes, p.long, idx - 1);
      if (s !== null && l !== null && ps !== null && pl !== null && ps < pl && s >= l) {
        results.push({ crossType: p.type, crossDate: candles[idx].date, daysAfterCross: day });
        break;
      }
    }
  }
  return results;
}

async function fetchNaverInvestor2pages(code) {
  const allRows = [];
  for (let page = 1; page <= 2; page++) {
    try {
      const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=${page}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await r.text();
      allRows.push(...parseNaverInvestorPage(html));
    } catch { /* skip */ }
  }
  return allRows;
}

// ── performSignalScan: 스캔 로직 독립 함수 ──
async function performSignalScan() {
  // 1. 종목 풀 구성 (~100종목)
  const symbolMap = new Map();
  for (const s of SEED_SYMBOLS) symbolMap.set(s.symbol, s.name);

  const kospiStocks = await fetchNaverTopStocks(0, 400);
  for (const s of kospiStocks) {
    if (!symbolMap.has(s.symbol)) symbolMap.set(s.symbol, s.name);
  }
  const kosdaqStocks = await fetchNaverTopStocks(1, 300);
  for (const s of kosdaqStocks) {
    if (!symbolMap.has(s.symbol)) symbolMap.set(s.symbol, s.name);
  }

  const pool = Array.from(symbolMap.entries()).map(([symbol, name]) => ({ symbol, name }));
  console.log(`[signal-scan] 스캔 시작: ${pool.length}종목`);

  // 2. Phase 1: 차트 데이터 → 골든크로스 감지 (25개씩 병렬)
  const BATCH = 25;
  const gcStocks = [];

  for (let i = 0; i < pool.length; i += BATCH) {
    const batch = pool.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const code = sym.symbol.replace(/\.\w+$/, "");
        const candles = await fetchNaverFchart(code, 200);
        if (!candles || candles.length < 21) return null;
        const crosses = detectGoldenCrosses(candles, 5, [
          { short: 3, long: 5, type: "3_5" },
          { short: 5, long: 10, type: "5_10" },
          { short: 5, long: 20, type: "5_20" },
          { short: 20, long: 60, type: "20_60" },
        ]);
        if (crosses.length === 0) return null;
        return { ...sym, candles, crosses };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) gcStocks.push(r.value);
    }
  }

  console.log(`[signal-scan] 골든크로스 감지: ${gcStocks.length}종목`);

  // 3. Phase 2: 수급 필터 (10개씩 병렬)
  const signalResults = [];
  const INV_BATCH = 10;

  for (let i = 0; i < gcStocks.length; i += INV_BATCH) {
    const batch = gcStocks.slice(i, i + INV_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (gc) => {
        const code = gc.symbol.replace(/\.\w+$/, "");
        const investorRows = await fetchNaverInvestor2pages(code);
        if (!investorRows || investorRows.length === 0) return [];

        const signals = [];
        for (const cross of gc.crosses) {
          const afterCross = investorRows.filter((r) => r.date >= cross.crossDate);
          if (afterCross.length === 0) continue;

          const foreignNet = afterCross.reduce((s, r) => s + r.foreign, 0);
          const institutionNet = afterCross.reduce((s, r) => s + r.institution, 0);
          const individualNet = -(foreignNet + institutionNet);

          if (foreignNet + institutionNet <= 0) continue;
          if (individualNet >= 0) continue;

          const lastCandle = gc.candles[gc.candles.length - 1];
          const prevCandle = gc.candles.length >= 2 ? gc.candles[gc.candles.length - 2] : lastCandle;
          const changePct = prevCandle.close > 0
            ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
            : 0;

          signals.push({
            symbol: gc.symbol,
            name: gc.name,
            price: lastCandle.close,
            changePct: Math.round(changePct * 100) / 100,
            crossType: cross.crossType,
            crossDate: cross.crossDate,
            daysAfterCross: cross.daysAfterCross,
            foreignNet,
            institutionNet,
            individualNet,
            foreignPct: afterCross[0]?.foreignPct || 0,
          });
        }
        return signals;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) signalResults.push(...r.value);
    }
  }

  // 4. 종목별 중복 제거: 같은 symbol이면 우선순위 높은 교차만 유지
  const crossPriority = { "20_60": 4, "5_20": 3, "5_10": 2, "3_5": 1 };
  const dedupMap = new Map();
  for (const sig of signalResults) {
    const existing = dedupMap.get(sig.symbol);
    if (!existing || (crossPriority[sig.crossType] || 0) > (crossPriority[existing.crossType] || 0)) {
      dedupMap.set(sig.symbol, sig);
    }
  }
  const dedupedResults = Array.from(dedupMap.values());
  dedupedResults.sort((a, b) => {
    // 1차: 교차일 최신순, 2차: 외국인+기관 순매수 큰 순
    const dateCmp = b.crossDate.localeCompare(a.crossDate);
    if (dateCmp !== 0) return dateCmp;
    return (b.foreignNet + b.institutionNet) - (a.foreignNet + a.institutionNet);
  });

  const response = {
    scannedAt: new Date().toISOString(),
    totalScanned: pool.length,
    results: dedupedResults,
  };

  // 5. 캐시 저장
  try {
    await db.doc("cache/signal_scan").set({ data: response, fetchedAt: Date.now() });
  } catch (e) {
    console.warn("signal-scan 캐시 저장 실패:", e.message);
  }

  return response;
}

exports.signalScan = onRequest(
  { cors: true, timeoutSeconds: 540, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 캐시 확인 (6시간 TTL)
      const cacheDoc = await db.doc("cache/signal_scan").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      const response = await performSignalScan();

      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(response);
    } catch (err) {
      console.error("signalScan 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 골든크로스 스케줄러: 평일 17:00 KST (08:00 UTC) ──
exports.signalScanScheduler = onSchedule(
  {
    schedule: "0 8 * * 1-5",
    timeZone: "UTC",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0,
  },
  async () => {
    console.log("[signal-scan-scheduler] 스케줄 스캔 시작");
    const result = await performSignalScan();
    console.log(`[signal-scan-scheduler] 완료: ${result.results.length}건 감지`);
  }
);

// ── SimplyStock Watchlist ──────────────────────────────────
exports.ssWatchlist = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }

    const { deviceId, userId, action, symbol, name } = req.body || {};
    if ((!deviceId && !userId) || !action) {
      res.status(400).json({ error: "deviceId or userId, and action required" });
      return;
    }

    const key = userId || deviceId;
    const docRef = db.doc(`simplystock_watchlist/${key}`);

    try {
      if (action === "list") {
        const snap = await docRef.get();
        res.json({ items: snap.exists ? (snap.data().items || []) : [] });
        return;
      }

      if (action === "add") {
        if (!symbol || !name) {
          res.status(400).json({ error: "symbol and name required" });
          return;
        }
        const MAX_WATCHLIST = 30;
        let limitReached = false;
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          const items = snap.exists ? (snap.data().items || []) : [];
          if (items.some((it) => it.symbol === symbol)) return;
          if (items.length >= MAX_WATCHLIST) { limitReached = true; return; }
          items.push({ symbol, name, addedAt: new Date().toISOString() });
          tx.set(docRef, { items, updatedAt: Date.now() }, { merge: true });
        });
        if (limitReached) {
          const snap = await docRef.get();
          res.status(400).json({ error: "MAX_REACHED", limit: MAX_WATCHLIST, items: snap.exists ? (snap.data().items || []) : [] });
          return;
        }
        const after = await docRef.get();
        res.json({ items: after.exists ? (after.data().items || []) : [] });
        return;
      }

      if (action === "remove") {
        if (!symbol) {
          res.status(400).json({ error: "symbol required" });
          return;
        }
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          const items = (snap.data().items || []).filter((it) => it.symbol !== symbol);
          tx.set(docRef, { items, updatedAt: Date.now() }, { merge: true });
        });
        const after = await docRef.get();
        res.json({ items: after.exists ? (after.data().items || []) : [] });
        return;
      }

      if (action === "rename") {
        const customName = req.body.customName;
        if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          const items = snap.data().items || [];
          const idx = items.findIndex((it) => it.symbol === symbol);
          if (idx === -1) return;
          if (customName) {
            items[idx].customName = customName;
          } else {
            delete items[idx].customName;
          }
          tx.set(docRef, { items, updatedAt: Date.now() }, { merge: true });
        });
        const after = await docRef.get();
        res.json({ items: after.exists ? (after.data().items || []) : [] });
        return;
      }

      if (action === "migrate") {
        if (!userId || !deviceId) {
          res.status(400).json({ error: "both userId and deviceId required for migrate" });
          return;
        }
        const deviceDoc = db.doc(`simplystock_watchlist/${deviceId}`);
        const userDoc = db.doc(`simplystock_watchlist/${userId}`);
        const [deviceSnap, userSnap] = await Promise.all([deviceDoc.get(), userDoc.get()]);
        const deviceItems = deviceSnap.exists ? (deviceSnap.data().items || []) : [];
        const userItems = userSnap.exists ? (userSnap.data().items || []) : [];
        // 기존 userId 목록에 deviceId 목록 병합 (중복 제거, 최대 20개)
        const merged = [...userItems];
        for (const di of deviceItems) {
          if (!merged.some((u) => u.symbol === di.symbol) && merged.length < 30) {
            merged.push(di);
          }
        }
        if (merged.length > 0) {
          await userDoc.set({ items: merged, updatedAt: Date.now() }, { merge: true });
        }
        res.json({ items: merged });
        return;
      }

      res.status(400).json({ error: "invalid action" });
    } catch (err) {
      console.error("ssWatchlist error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── PER 밴드 (밸류에이션) 엔드포인트 ─────────────────────────────────

const PER_BAND_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

// DART corp_code 매핑 (사전 빌드, ~3,900 상장사)
const DART_CORP_CODES = require("./data/dartCorpCodes.json");

// 역매핑: corp_code → stock_code (실적 공시 조회용)
const DART_CODE_TO_STOCK = {};
for (const [stockCode, corpCode] of Object.entries(DART_CORP_CODES)) {
  DART_CODE_TO_STOCK[corpCode] = stockCode;
}

/** stock_code → DART corp_code 조회 */
function getDartCorpCode(stockCode) {
  return DART_CORP_CODES[stockCode] || null;
}

/** DART 연간 재무제표에서 당기순이익 + 자본총계 추출 */
async function fetchDartFinancials(corpCode, dartKey, year) {
  try {
    // 1순위: fnlttSinglAcnt (주요계정) — 1회 호출로 CFS/OFS 모두 포함
    const simple = await fetchDartFinancialsSimple(corpCode, dartKey, year);
    if (simple && (simple.netIncome != null || simple.equity != null)) {
      return simple;
    }
    // 2순위: fnlttSinglAcntAll (전체 재무제표) — 더 상세한 계정명 매칭
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=CFS`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data.status === "000" && data.list) {
      const ni = extractNetIncome(data.list);
      const eq = extractEquity(data.list);
      if (ni != null || eq != null) {
        return { netIncome: ni, equity: eq };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** fnlttSinglAcnt (주요계정) 폴백 — 금융주 등 fnlttSinglAcntAll 미제공 종목용 */
async function fetchDartFinancialsSimple(corpCode, dartKey, year) {
  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data.status !== "000" || !data.list) return null;
    const cfsList = data.list.filter((item) => item.fs_div === "CFS");
    const targetList = cfsList.length > 0 ? cfsList : data.list;
    let netIncome = null;
    let equity = null;
    for (const item of targetList) {
      const nm = item.account_nm || "";
      if (!netIncome && (nm.includes("당기순이익") || nm.includes("당기순손실")) && !nm.includes("주당")) {
        const v = parseInt((item.thstrm_amount || "").replace(/,/g, ""), 10);
        if (!isNaN(v)) netIncome = v;
      }
      if (!equity && (nm === "자본총계" || nm === "기말자본" || nm === "자본합계")) {
        const v = parseInt((item.thstrm_amount || "").replace(/,/g, ""), 10);
        if (!isNaN(v)) equity = v;
      }
    }
    if (netIncome == null && equity == null) return null;
    return { netIncome, equity };
  } catch {
    return null;
  }
}

function extractNetIncome(list) {
  // 손익계산서(IS) 또는 포괄손익계산서(CIS)에서 당기순이익 찾기
  // 일부 기업은 IS 없이 CIS만 제출 (예: SK하이닉스)
  // "당기순이익", "당기순이익(손실)", "당기순손실" 모두 매칭
  const isItems = list.filter((item) => item.sj_div === "IS" || item.sj_div === "CIS");
  const hasNI = (nm) => nm && (nm.includes("당기순이익") || nm.includes("당기순손실"));

  // 1순위: 지배기업 귀속 당기순이익
  let target = isItems.find(
    (item) => item.account_nm && item.account_nm.includes("지배기업") && hasNI(item.account_nm)
  );
  // 2순위: 일반 당기순이익/당기순손실 (주당순이익 제외)
  if (!target) {
    target = isItems.find(
      (item) => hasNI(item.account_nm) && !item.account_nm.includes("주당")
    );
  }
  if (!target) return null;

  const amountStr = target.thstrm_amount;
  if (!amountStr) return null;
  const amount = parseInt(amountStr.replace(/,/g, ""), 10);
  return isNaN(amount) ? null : amount;
}

function extractEquity(list) {
  // 재무상태표(BS)에서 자본총계 추출
  const bsItems = list.filter((item) => item.sj_div === "BS");
  // 1순위: 지배기업 소유주 귀속 자본
  let target = bsItems.find(
    (item) => item.account_nm && item.account_nm.includes("지배기업") && item.account_nm.includes("자본")
  );
  // 2순위: 자본총계
  if (!target) {
    target = bsItems.find((item) => item.account_nm === "자본총계");
  }
  // 3순위: 기말자본, 자본합계 (금융주)
  if (!target) {
    target = bsItems.find((item) => item.account_nm === "기말자본" || item.account_nm === "자본합계");
  }
  if (!target) return null;
  const amountStr = target.thstrm_amount;
  if (!amountStr) return null;
  const amount = parseInt(amountStr.replace(/,/g, ""), 10);
  return isNaN(amount) ? null : amount;
}

/** Yahoo crumb + cookie 인증 */
let yahooCrumbCache = { crumb: null, cookie: null, fetchedAt: 0 };
async function getYahooCrumb() {
  if (yahooCrumbCache.crumb && Date.now() - yahooCrumbCache.fetchedAt < 30 * 60 * 1000) {
    return yahooCrumbCache;
  }
  try {
    const r1 = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
    const setCookie = r1.headers.get("set-cookie") || "";
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: setCookie },
      signal: AbortSignal.timeout(5000),
    });
    if (!r2.ok) return { crumb: null, cookie: null };
    const crumb = await r2.text();
    yahooCrumbCache = { crumb, cookie: setCookie, fetchedAt: Date.now() };
    return yahooCrumbCache;
  } catch {
    return { crumb: null, cookie: null };
  }
}

/** Yahoo quoteSummary에서 forwardPe, sharesOutstanding 조회 */
async function fetchYahooSummary(symbol) {
  const { crumb, cookie } = await getYahooCrumb();
  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
  const headers = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  const urls = [
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,earnings,assetProfile,earningsTrend${crumbParam}`,
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,earnings,assetProfile,earningsTrend${crumbParam}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const json = await r.json();
      const result = json?.quoteSummary?.result?.[0];
      if (!result) continue;

      const stats = result.defaultKeyStatistics || {};
      const earnings = result.earnings?.financialsChart?.yearly || [];
      const profile = result.assetProfile || {};

      // earningsTrend에서 "+1y" 컨센서스 EPS 추출
      const trends = result.earningsTrend?.trend || [];
      const nextYearTrend = trends.find((t) => t.period === "+1y");
      const earningsTrendEps = nextYearTrend?.earningsEstimate?.avg?.raw ?? null;

      // defaultKeyStatistics.forwardEps = NTM(Next Twelve Months) 주당순이익
      // earningsTrend +1y보다 NTM이 Seeking Alpha 등과 일치
      const forwardEps = stats.forwardEps?.raw ?? null;
      console.log(`[yahoo-summary] ${symbol} forwardEps=${forwardEps}, earningsTrendEps=${earningsTrendEps}, forwardPE=${stats.forwardPE?.raw}`);
      const forwardEpsEstimate = forwardEps ?? earningsTrendEps;

      return {
        forwardPe: stats.forwardPE?.raw ?? stats.forwardPe?.raw ?? null,
        trailingPe: stats.trailingPE?.raw ?? null,
        sharesOutstanding: stats.sharesOutstanding?.raw ?? null,
        yearlyEarnings: earnings.map((e) => ({
          year: e.date,
          earnings: e.earnings?.raw ?? null,
        })),
        sector: profile.sector || null,
        industry: profile.industry || null,
        forwardEpsEstimate,
      };
    } catch { /* try next */ }
  }
  return { forwardPe: null, trailingPe: null, sharesOutstanding: null, yearlyEarnings: [], sector: null, industry: null, forwardEpsEstimate: null };
}

/** Yahoo 차트에서 장기 가격 히스토리 조회 */
async function fetchYahooPriceHistory(symbol, range = "10y") {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=${range}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=${range}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) continue;
      const json = await r.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!timestamps || !quote) continue;

      const prices = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = quote.close?.[i];
        if (c == null) continue;
        const d = new Date(timestamps[i] * 1000);
        prices.push({
          date: d.toISOString().slice(0, 10),
          close: Math.round(c * 100) / 100,
        });
      }
      const meta = result.meta;
      return {
        prices,
        name: meta?.shortName || meta?.longName || symbol,
        currency: meta?.currency || "KRW",
      };
    } catch { /* try next */ }
  }
  return null;
}

/** Naver 모바일 API에서 주식 기본 정보 조회 (EPS, PER, 시총 등) */
async function fetchNaverStockInfo(stockCode) {
  try {
    // basic + integration 병렬 호출
    const [basicRes, integrationRes] = await Promise.allSettled([
      fetch(`https://m.stock.naver.com/api/stock/${stockCode}/basic`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)", Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.ok ? r.json() : null),
      fetch(`https://m.stock.naver.com/api/stock/${stockCode}/integration`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)", Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.ok ? r.json() : null),
    ]);
    const basic = basicRes.status === "fulfilled" ? basicRes.value : null;
    const data = integrationRes.status === "fulfilled" ? integrationRes.value : null;
    if (!data) return null;
    const infos = data.totalInfos || [];

    const getValue = (key) => {
      const item = infos.find((i) => i.key === key);
      return item ? item.value : null;
    };

    // 시총 파싱: "1,134조 2,026억" → 원 단위
    const marketCapStr = getValue("시총");
    let marketCap = null;
    if (marketCapStr) {
      let total = 0;
      const joMatch = marketCapStr.match(/([\d,]+)조/);
      if (joMatch) total += parseInt(joMatch[1].replace(/,/g, ""), 10) * 1e12;
      const eokMatch = marketCapStr.match(/([\d,]+)억/);
      if (eokMatch) total += parseInt(eokMatch[1].replace(/,/g, ""), 10) * 1e8;
      if (total > 0) marketCap = total;
    }

    // 현재가 (basic 엔드포인트에서)
    const closePrice = basic?.closePrice ? parseInt(basic.closePrice.replace(/,/g, ""), 10) : null;

    // 발행주식수 = 시총 / 현재가
    let sharesOutstanding = null;
    if (marketCap && closePrice && closePrice > 0) {
      sharesOutstanding = Math.round(marketCap / closePrice);
    }

    // EPS 파싱
    const epsStr = getValue("EPS");
    const eps = epsStr ? parseInt(epsStr.replace(/[,원]/g, ""), 10) : null;

    // PER 파싱
    const perStr = getValue("PER");
    const per = perStr ? parseFloat(perStr.replace(/[,배]/g, "")) : null;

    // 추정 PER/EPS
    const fwdPerStr = getValue("추정PER");
    const forwardPer = fwdPerStr ? parseFloat(fwdPerStr.replace(/[,배]/g, "")) : null;

    const fwdEpsStr = getValue("추정EPS");
    const forwardEps = fwdEpsStr ? parseInt(fwdEpsStr.replace(/[,원]/g, ""), 10) : null;

    return { sharesOutstanding, eps, per, forwardPer, forwardEps, marketCap };
  } catch {
    return null;
  }
}

/** PER 밴드 계산 핵심 로직 */
function calculatePerBand(prices, epsHistory, sharesOutstanding) {
  if (!prices.length || !epsHistory.length || !sharesOutstanding) return null;

  // EPS 계산 (당기순이익 / 발행주식수)
  const allEpsData = epsHistory
    .filter((e) => e.netIncome != null)
    .map((e) => ({
      year: e.year,
      eps: Math.round((e.netIncome / sharesOutstanding) * 100) / 100,
    }));
  const epsData = allEpsData.filter((e) => e.eps > 0).sort((a, b) => a.year - b.year);
  const lossYears = allEpsData.length - epsData.length;

  if (epsData.length < 2) return null;

  // 각 가격 데이터에 해당 시점의 trailing EPS 매칭
  const bandChart = [];
  const allPers = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    // 해당 연도 이전의 가장 최근 EPS 사용 (trailing)
    let trailingEps = null;
    for (let i = epsData.length - 1; i >= 0; i--) {
      if (epsData[i].year <= priceYear) {
        trailingEps = epsData[i].eps;
        break;
      }
    }
    if (!trailingEps || trailingEps <= 0) continue;
    const per = Math.round((p.close / trailingEps) * 100) / 100;
    if (per > 0 && per < 200) { // 이상치 제거
      allPers.push(per);
      bandChart.push({ date: p.date, close: p.close, eps: trailingEps, per });
    }
  }

  if (allPers.length < 10) return null;

  // PER 분위수 계산 (5%, 25%, 50%, 75%, 95%)
  allPers.sort((a, b) => a - b);
  const percentile = (arr, p) => {
    const idx = (p / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const frac = idx - lo;
    return Math.round((arr[lo] * (1 - frac) + arr[hi] * frac) * 100) / 100;
  };

  const perBands = {
    min: percentile(allPers, 5),
    p25: percentile(allPers, 25),
    median: percentile(allPers, 50),
    p75: percentile(allPers, 75),
    max: percentile(allPers, 95),
  };

  // 밴드 가격선 추가
  for (const point of bandChart) {
    point.bandMin = Math.round(point.eps * perBands.min);
    point.band25 = Math.round(point.eps * perBands.p25);
    point.bandMed = Math.round(point.eps * perBands.median);
    point.band75 = Math.round(point.eps * perBands.p75);
    point.bandMax = Math.round(point.eps * perBands.max);
  }

  // 현재 PER 위치 (0~100)
  const latestPer = bandChart[bandChart.length - 1]?.per || 0;
  const perPosition = Math.round(
    (allPers.filter((p) => p <= latestPer).length / allPers.length) * 100
  );

  const avgPer = Math.round((allPers.reduce((s, v) => s + v, 0) / allPers.length) * 100) / 100;

  return {
    epsData,
    perBands,
    bandChart,
    currentPer: latestPer,
    avgPer,
    perPosition,
    latestEps: epsData[epsData.length - 1]?.eps || 0,
    lossYears,
  };
}

/** Forward PER 밴드 계산 (연도Y 주가 → Y+1 실현EPS, 최근구간은 컨센서스EPS) */
function calculateForwardPerBand(prices, epsHistory, sharesOutstanding, forwardEpsEstimate) {
  if (!prices.length || !epsHistory.length || !sharesOutstanding) return null;

  // EPS 계산 (당기순이익 / 발행주식수)
  const allEpsData = epsHistory
    .filter((e) => e.netIncome != null)
    .map((e) => ({
      year: e.year,
      eps: Math.round((e.netIncome / sharesOutstanding) * 100) / 100,
    }));
  const epsData = allEpsData.filter((e) => e.eps > 0).sort((a, b) => a.year - b.year);

  if (epsData.length < 2) return null;

  // Forward EPS 맵: 연도Y → Y+1년 실현 EPS
  const forwardEpsMap = {};
  for (let i = 0; i < epsData.length - 1; i++) {
    forwardEpsMap[epsData[i].year] = epsData[i + 1].eps;
  }
  // 최신 연도: 컨센서스 EPS 사용 (forwardEpsEstimate = 주당 EPS)
  const latestEpsYear = epsData[epsData.length - 1].year;
  const currentYear = new Date().getFullYear();
  if (forwardEpsEstimate && forwardEpsEstimate > 0) {
    // 해외 주식: forwardEpsEstimate는 이미 주당 EPS
    // 한국 주식: netIncome 기반이므로 sharesOutstanding으로 나눠야 하지만,
    // earningsTrend는 Yahoo만 제공하므로 이미 주당임
    forwardEpsMap[latestEpsYear] = Math.round(forwardEpsEstimate * 100) / 100;
    // 현재 연도도 컨센서스 사용
    if (currentYear > latestEpsYear) {
      forwardEpsMap[currentYear] = Math.round(forwardEpsEstimate * 100) / 100;
    }
  }

  // 각 가격에 forward EPS 매칭
  const bandChart = [];
  const allPers = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    const fwdEps = forwardEpsMap[priceYear];
    if (!fwdEps || fwdEps <= 0) continue;
    const per = Math.round((p.close / fwdEps) * 100) / 100;
    if (per > 0 && per < 200) {
      allPers.push(per);
      bandChart.push({ date: p.date, close: p.close, eps: fwdEps, per });
    }
  }

  if (allPers.length < 10) return null;

  // PER 분위수 계산 (5%, 25%, 50%, 75%, 95%)
  allPers.sort((a, b) => a - b);
  const percentile = (arr, p) => {
    const idx = (p / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const frac = idx - lo;
    return Math.round((arr[lo] * (1 - frac) + arr[hi] * frac) * 100) / 100;
  };

  const forwardPerBands = {
    min: percentile(allPers, 5),
    p25: percentile(allPers, 25),
    median: percentile(allPers, 50),
    p75: percentile(allPers, 75),
    max: percentile(allPers, 95),
  };

  // 밴드 가격선 추가
  for (const point of bandChart) {
    point.bandMin = Math.round(point.eps * forwardPerBands.min);
    point.band25 = Math.round(point.eps * forwardPerBands.p25);
    point.bandMed = Math.round(point.eps * forwardPerBands.median);
    point.band75 = Math.round(point.eps * forwardPerBands.p75);
    point.bandMax = Math.round(point.eps * forwardPerBands.max);
  }

  // 현재 Forward PER 위치 (0~100)
  const latestPer = bandChart[bandChart.length - 1]?.per || 0;
  const perPosition = Math.round(
    (allPers.filter((p) => p <= latestPer).length / allPers.length) * 100
  );

  const avgPer = Math.round((allPers.reduce((s, v) => s + v, 0) / allPers.length) * 100) / 100;

  return {
    forwardPerBands,
    forwardBandChart: bandChart,
    currentForwardPer: latestPer,
    avgForwardPer: avgPer,
    forwardPerPosition: perPosition,
  };
}

/** PBR 밴드 계산 (자본총계 기반) */
function calculatePbrBand(prices, equityHistory, sharesOutstanding) {
  if (!prices.length || !equityHistory.length || !sharesOutstanding) return null;

  const bpsData = equityHistory
    .filter((e) => e.equity != null && e.equity > 0)
    .map((e) => ({
      year: e.year,
      bps: Math.round((e.equity / sharesOutstanding) * 100) / 100,
    }))
    .sort((a, b) => a.year - b.year);

  if (bpsData.length < 2) return null;

  const bandChart = [];
  const allPbrs = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    let trailingBps = null;
    for (let i = bpsData.length - 1; i >= 0; i--) {
      if (bpsData[i].year <= priceYear) {
        trailingBps = bpsData[i].bps;
        break;
      }
    }
    if (!trailingBps || trailingBps <= 0) continue;
    const pbr = Math.round((p.close / trailingBps) * 100) / 100;
    if (pbr > 0 && pbr < 30) {
      allPbrs.push(pbr);
      bandChart.push({ date: p.date, close: p.close, bps: trailingBps, pbr });
    }
  }

  if (allPbrs.length < 10) return null;

  allPbrs.sort((a, b) => a - b);
  const percentile = (arr, pc) => {
    const idx = (pc / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const frac = idx - lo;
    return Math.round((arr[lo] * (1 - frac) + arr[hi] * frac) * 100) / 100;
  };

  const pbrBands = {
    min: percentile(allPbrs, 5),
    p25: percentile(allPbrs, 25),
    median: percentile(allPbrs, 50),
    p75: percentile(allPbrs, 75),
    max: percentile(allPbrs, 95),
  };

  for (const point of bandChart) {
    point.bandMin = Math.round(point.bps * pbrBands.min);
    point.band25 = Math.round(point.bps * pbrBands.p25);
    point.bandMed = Math.round(point.bps * pbrBands.median);
    point.band75 = Math.round(point.bps * pbrBands.p75);
    point.bandMax = Math.round(point.bps * pbrBands.max);
  }

  const latestPbr = bandChart[bandChart.length - 1]?.pbr || 0;
  const pbrPosition = Math.round(
    (allPbrs.filter((p) => p <= latestPbr).length / allPbrs.length) * 100
  );
  const avgPbr = Math.round((allPbrs.reduce((s, v) => s + v, 0) / allPbrs.length) * 100) / 100;

  return {
    bpsData,
    pbrBands,
    pbrBandChart: bandChart,
    currentPbr: latestPbr,
    avgPbr,
    pbrPosition,
    latestBps: bpsData[bpsData.length - 1]?.bps || 0,
  };
}

exports.perBand = onRequest(
  { cors: true, secrets: [dartApiKey], memory: "512MiB", timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const rawSymbol = (req.query.symbol || "").trim();
      if (!rawSymbol) {
        res.status(400).json({ error: "symbol parameter required" });
        return;
      }

      // 심볼 정규화: 005930 → 005930.KS
      let symbol = rawSymbol;
      const stockCode = rawSymbol.replace(/\.\w+$/, "");
      const isKorean = rawSymbol.endsWith(".KS") || rawSymbol.endsWith(".KQ") || /^\d{6}$/.test(rawSymbol);
      if (isKorean && !rawSymbol.includes(".")) {
        // KR_STOCK_MAP에서 마켓 확인
        const mapped = KR_STOCK_MAP.find((s) => s.symbol === `${rawSymbol}.KS` || s.symbol === `${rawSymbol}.KQ`);
        symbol = mapped ? mapped.symbol : `${rawSymbol}.KS`;
      }

      // 1. Firestore 캐시 확인
      const cacheKey = `per_band_v2_${stockCode}`;
      const forceRefresh = req.query.refresh === "true";
      if (!forceRefresh) {
        try {
          const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
          if (cacheDoc.exists) {
            const cached = cacheDoc.data();
            if (cached.data && Date.now() - cached.fetchedAt < PER_BAND_CACHE_TTL) {
              console.log(`[per-band] Cache hit: ${stockCode}`);
              res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
              res.json(cached.data);
              return;
            }
          }
        } catch {}
      }

      console.log(`[per-band] Processing: ${symbol} (korean=${isKorean})`);

      // 2. 가격 히스토리 + Yahoo 보조 데이터 병렬 조회
      console.log("[per-band] Step 2: Fetching price history + Yahoo summary...");
      const [priceResult, yahooData] = await Promise.all([
        fetchYahooPriceHistory(symbol, "10y"),
        fetchYahooSummary(symbol),
      ]);
      if (!priceResult || priceResult.prices.length < 50) {
        res.status(404).json({ error: "주가 데이터가 충분하지 않습니다" });
        return;
      }
      console.log(`[per-band] Prices: ${priceResult.prices.length} points, shares: ${yahooData.sharesOutstanding}`);

      // 3. EPS 히스토리 조회
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 - i);

      let epsHistory = [];
      let equityHistory = [];
      let sharesOutstanding = yahooData.sharesOutstanding;
      let forwardPe = yahooData.forwardPe;

      if (isKorean) {
        // DART API로 한국 주식 EPS 수집
        const dartKey = dartApiKey.value();
        console.log("[per-band] Step 3: Getting DART corp_code...");
        const corpCode = getDartCorpCode(stockCode);
        if (!corpCode) {
          res.status(404).json({ error: "DART에서 종목을 찾을 수 없습니다" });
          return;
        }
        console.log(`[per-band] Corp code: ${corpCode}`);

        // 연도별 재무제표 순차 조회 (DART rate limit 회피, 최신→과거 순)
        console.log("[per-band] Step 4: Fetching DART financials...");
        const financialResults = [];
        for (let i = 0; i < years.length; i += 2) {
          const batch = years.slice(i, i + 2);
          const batchResults = await Promise.allSettled(
            batch.map((year) => fetchDartFinancials(corpCode, dartKey, year))
          );
          financialResults.push(...batchResults);
        }

        for (let i = 0; i < years.length; i++) {
          const result = financialResults[i];
          if (result.status === "fulfilled" && result.value != null) {
            if (result.value.netIncome != null) {
              epsHistory.push({ year: years[i], netIncome: result.value.netIncome });
            }
            if (result.value.equity != null) {
              equityHistory.push({ year: years[i], equity: result.value.equity });
            }
          }
        }

        console.log(`[per-band] DART results: ${epsHistory.length} netIncome, ${equityHistory.length} equity years`);
      } else {
        // 해외 주식: Yahoo로만 처리
        if (yahooData.yearlyEarnings.length > 0 && sharesOutstanding) {
          for (const ye of yahooData.yearlyEarnings) {
            if (ye.earnings != null) {
              epsHistory.push({ year: ye.year, netIncome: ye.earnings });
            }
          }
        }
      }

      if (epsHistory.length < 2) {
        res.set("Cache-Control", "no-store");
        res.status(404).json({ error: "실적 데이터가 충분하지 않습니다 (최소 2년 필요)" });
        return;
      }

      // sharesOutstanding 폴백: Naver 모바일 API
      if ((!sharesOutstanding || !forwardPe) && isKorean) {
        console.log("[per-band] Trying Naver API for shares/forward PER...");
        const naverInfo = await fetchNaverStockInfo(stockCode);
        if (naverInfo) {
          if (!sharesOutstanding && naverInfo.sharesOutstanding) {
            sharesOutstanding = naverInfo.sharesOutstanding;
          }
          if (!forwardPe && naverInfo.forwardPer) {
            forwardPe = naverInfo.forwardPer;
          }
          console.log(`[per-band] Naver: shares=${naverInfo.sharesOutstanding}, fwdPER=${naverInfo.forwardPer}`);
        }
      }

      if (!sharesOutstanding) {
        res.status(404).json({ error: "발행주식수 데이터를 가져올 수 없습니다" });
        return;
      }

      // 4. PER 밴드 계산
      const bandResult = calculatePerBand(priceResult.prices, epsHistory, sharesOutstanding);
      if (!bandResult) {
        res.status(404).json({ error: "PER 밴드 계산에 실패했습니다 (적자 구간이 많거나 데이터 부족)" });
        return;
      }

      // 5. Forward PER 밴드 계산
      // NTM EPS 결정: forwardEpsEstimate(earningsTrend) 또는 forwardPE에서 역산
      const latestPrice = priceResult.prices[priceResult.prices.length - 1]?.close;
      let ntmEps = yahooData.forwardEpsEstimate;
      if (forwardPe && latestPrice && forwardPe > 0) {
        const derivedEps = Math.round((latestPrice / forwardPe) * 100) / 100;
        // forwardPE 기반 NTM EPS가 earningsTrend보다 신뢰도 높음
        if (derivedEps > 0) {
          console.log(`[per-band] NTM EPS: derived=${derivedEps} (from fwdPE=${forwardPe}), earningsTrend=${yahooData.forwardEpsEstimate}`);
          ntmEps = derivedEps;
        }
      }
      const forwardBandResult = calculateForwardPerBand(
        priceResult.prices, epsHistory, sharesOutstanding, ntmEps
      );
      if (forwardBandResult) {
        console.log(`[per-band] Forward PER band: ${forwardBandResult.forwardBandChart.length} points, fwdPER ${forwardBandResult.currentForwardPer}`);
      }

      // 6. PBR 밴드 계산 (한국 주식 + equity 데이터 있을 때만)
      let pbrResult = null;
      if (isKorean && equityHistory.length >= 2) {
        pbrResult = calculatePbrBand(priceResult.prices, equityHistory, sharesOutstanding);
        if (pbrResult) {
          console.log(`[per-band] PBR band: ${pbrResult.pbrBandChart.length} points, PBR ${pbrResult.currentPbr}`);
        }
      }

      const response = {
        symbol: stockCode,
        name: priceResult.name,
        currency: priceResult.currency,
        currentPer: bandResult.currentPer,
        forwardPer: forwardBandResult?.currentForwardPer ?? forwardPe,
        avgPer: bandResult.avgPer,
        perPosition: bandResult.perPosition,
        latestEps: bandResult.latestEps,
        epsHistory: bandResult.epsData,
        perBands: bandResult.perBands,
        bandChart: bandResult.bandChart,
        lossYears: bandResult.lossYears,
        sector: yahooData.sector,
        industry: yahooData.industry,
        ...(forwardBandResult && {
          forwardPerBands: forwardBandResult.forwardPerBands,
          forwardBandChart: forwardBandResult.forwardBandChart,
          currentForwardPer: forwardBandResult.currentForwardPer,
          avgForwardPer: forwardBandResult.avgForwardPer,
          forwardPerPosition: forwardBandResult.forwardPerPosition,
        }),
        ...(pbrResult && {
          currentPbr: pbrResult.currentPbr,
          avgPbr: pbrResult.avgPbr,
          pbrPosition: pbrResult.pbrPosition,
          latestBps: pbrResult.latestBps,
          pbrBands: pbrResult.pbrBands,
          pbrBandChart: pbrResult.pbrBandChart,
        }),
      };

      // 5. 캐시 저장
      try {
        await db.doc(`cache/${cacheKey}`).set({ data: response, fetchedAt: Date.now() });
      } catch {}

      console.log(`[per-band] OK: ${stockCode}, ${bandResult.bandChart.length} points, PER ${bandResult.currentPer}`);
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.json(response);
    } catch (err) {
      console.error("[per-band] Error:", err);
      res.status(500).json({ error: err.message || "서버 오류" });
    }
  }
);

// ── 실적 공시 캘린더 엔드포인트 ─────────────────────────────────

const EARNINGS_CACHE_TTL = 60 * 60 * 1000; // 1시간

const EARNINGS_KEYWORDS = [
  "잠정실적", "영업실적", "분기보고서", "반기보고서", "사업보고서", "매출액또는손익구조",
];

exports.earningsCalendar = onRequest(
  { cors: true, secrets: [dartApiKey], timeoutSeconds: 30, region: "us-central1" },
  async (req, res) => {
    try {
      // 1. 캐시 확인
      const cacheDoc = await db.doc("cache/earnings_calendar").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < EARNINGS_CACHE_TTL) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      // 2. 날짜 범위 (최근 7일)
      const now = new Date();
      const toDate = now.toISOString().slice(0, 10).replace(/-/g, "");
      const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10).replace(/-/g, "");

      const dartKey = dartApiKey.value();
      const baseUrl = "https://opendart.fss.or.kr/api/list.json";

      // 3. DART 공시 목록 조회 (A: 정기보고, B: 주요사항보고)
      const fetchList = async (pblntfTy) => {
        const url = `${baseUrl}?crtfc_key=${dartKey}&bgn_de=${fromDate}&end_de=${toDate}&pblntf_ty=${pblntfTy}&page_count=100&sort=date&sort_mth=desc`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return [];
        const data = await r.json();
        if (data.status !== "000" || !data.list) return [];
        return data.list;
      };

      const [listA, listB] = await Promise.all([fetchList("A"), fetchList("B")]);
      const allItems = [...listA, ...listB];

      // 4. 키워드 필터 + 역매핑
      const earnings = [];
      const seen = new Set();
      for (const item of allItems) {
        const reportName = item.report_nm || "";
        if (!EARNINGS_KEYWORDS.some((kw) => reportName.includes(kw))) continue;

        const corpCode = item.corp_code;
        const stockCode = DART_CODE_TO_STOCK[corpCode];
        if (!stockCode) continue;

        const key = `${stockCode}_${item.rcept_no}`;
        if (seen.has(key)) continue;
        seen.add(key);

        earnings.push({
          symbol: `${stockCode}.KS`,
          stockCode,
          name: item.corp_name,
          reportName,
          receiptDate: item.rcept_dt,
          receiptNo: item.rcept_no,
        });

        if (earnings.length >= 30) break;
      }

      const response = {
        earnings,
        scannedAt: now.toISOString(),
        dateRange: { from: fromDate, to: toDate },
      };

      // 5. 캐시 저장
      try {
        await db.doc("cache/earnings_calendar").set({ data: response, fetchedAt: Date.now() });
      } catch (e) {
        console.warn("[earnings-calendar] cache write failed:", e.message);
      }

      console.log(`[earnings-calendar] OK: ${earnings.length} items, range ${fromDate}~${toDate}`);
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(response);
    } catch (err) {
      console.error("[earnings-calendar] Error:", err);
      res.status(500).json({ error: err.message || "서버 오류" });
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// ██ AI 봇 모의투자 시스템
// ══════════════════════════════════════════════════════════════════

const BOT_IDS = ["bot_signal", "bot_gold", "bot_ant"];
const BOT_INITIAL_CASH = 10_000_000;

// ── 공통 함수: fetchPricesBatch ──────────────────────────────────
async function fetchPricesBatch(symbols) {
  if (!symbols || symbols.length === 0) return {};
  const data = {};
  const uncached = [];

  // 1. Firestore 캐시 확인
  try {
    const reads = symbols.map((s) =>
      db.doc(`cache/price_${s.replace(/[/.]/g, "_")}`).get()
    );
    const docs = await Promise.all(reads);
    symbols.forEach((symbol, i) => {
      const doc = docs[i];
      if (doc.exists) {
        const cached = doc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
          data[symbol] = cached.data;
          return;
        }
      }
      uncached.push(symbol);
    });
  } catch {
    uncached.push(...symbols.filter((s) => !data[s]));
  }

  // 2. Yahoo Finance 조회
  if (uncached.length > 0) {
    const fetchOne = async (symbol) => {
      const urls = [
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
        `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      ];
      for (const url of urls) {
        try {
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            signal: AbortSignal.timeout(6000),
          });
          const json = await r.json();
          const meta = json?.chart?.result?.[0]?.meta;
          if (!meta?.regularMarketPrice) continue;
          const price = meta.regularMarketPrice;
          const changePct = meta.regularMarketChangePercent
            ?? (meta.previousClose ? ((price - meta.previousClose) / meta.previousClose) * 100 : 0);
          return { price, changePct, name: meta.shortName || meta.longName || symbol, currency: meta.currency || "KRW" };
        } catch { /* try next */ }
      }
      return null;
    };

    const results = await Promise.allSettled(uncached.map(fetchOne));
    const writes = [];
    uncached.forEach((symbol, i) => {
      const val = results[i].status === "fulfilled" ? results[i].value : null;
      if (val) {
        data[symbol] = val;
        writes.push(
          db.doc(`cache/price_${symbol.replace(/[/.]/g, "_")}`).set({ data: val, fetchedAt: Date.now() }).catch(() => {})
        );
      }
    });
    if (writes.length > 0) await Promise.all(writes);
  }

  return data;
}

// ── 공통 함수: executeBotOrder (서버사이드 placeOrder) ────────────
function executeBotOrder(portfolio, symbol, name, type, qty, price) {
  const p = {
    cash: portfolio.cash,
    holdings: { ...portfolio.holdings },
    history: [...(portfolio.history || [])],
    settledAt: portfolio.settledAt || null,
  };
  price = Math.round(price);

  if (type === "buy") {
    const cost = price * qty;
    if (p.cash < cost) return p; // 잔액 부족 → 스킵
    p.cash -= cost;
    const existing = p.holdings[symbol];
    if (existing) {
      const totalQty = existing.qty + qty;
      const avgPrice = Math.round((existing.avgPrice * existing.qty + price * qty) / totalQty);
      p.holdings[symbol] = { qty: totalQty, avgPrice, currentPrice: price, name };
    } else {
      p.holdings[symbol] = { qty, avgPrice: price, currentPrice: price, name };
    }
  } else {
    const existing = p.holdings[symbol];
    if (!existing || existing.qty < qty) return p; // 보유 부족 → 스킵
    p.cash += price * qty;
    const remaining = existing.qty - qty;
    if (remaining === 0) delete p.holdings[symbol];
    else p.holdings[symbol] = { ...existing, qty: remaining, currentPrice: price };
  }

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = kst.toISOString().slice(0, 10);
  p.history.push({ date: dateStr, type, symbol, name, qty, price });

  return p;
}

// ── KST 오늘 날짜 문자열 ────────────────────────────────────────
function todayKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// ── 한국 휴장일 체크 (주말 + 공휴일) ─────────────────────────────
function isMarketDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  // 주요 공휴일 (간이 목록)
  const holidays2026 = [
    "2026-01-01", "2026-01-27", "2026-01-28", "2026-01-29",
    "2026-03-01", "2026-05-05", "2026-05-24", "2026-06-06",
    "2026-08-15", "2026-09-24", "2026-09-25", "2026-09-26",
    "2026-10-03", "2026-10-09", "2026-12-25",
  ];
  return !holidays2026.includes(dateStr);
}

// ── 봇 포트폴리오 로드/저장 ──────────────────────────────────────
async function loadBotPortfolio(botId) {
  const snap = await db.doc(`ss_portfolios/${botId}`).get();
  if (!snap.exists) return { cash: BOT_INITIAL_CASH, holdings: {}, history: [], settledAt: null };
  return snap.data();
}

async function saveBotPortfolio(botId, portfolio) {
  await db.doc(`ss_portfolios/${botId}`).set(portfolio);
}

// ── 봇 매매 로그 기록 ────────────────────────────────────────────
async function logBotTrade(botId, trade) {
  await db.collection(`bot_trade_logs/${botId}/trades`).add({
    ...trade,
    timestamp: Date.now(),
  });
}

// ── 봇 일일 스냅샷 기록 ──────────────────────────────────────────
async function saveBotSnapshot(botId, portfolio, prices) {
  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    const px = prices[sym]?.price ?? h.currentPrice;
    return sum + px * h.qty;
  }, 0);
  const totalAsset = portfolio.cash + holdingsValue;
  const returnPct = ((totalAsset - BOT_INITIAL_CASH) / BOT_INITIAL_CASH) * 100;
  const date = todayKST();

  await db.doc(`bot_snapshots/${botId}/daily/${date}`).set({
    date,
    totalAsset: Math.round(totalAsset),
    returnPct: Math.round(returnPct * 100) / 100,
    cash: Math.round(portfolio.cash),
    holdingsCount: Object.keys(portfolio.holdings).length,
  });

  return { totalAsset, returnPct };
}

// ── 봇 랭킹 갱신 ────────────────────────────────────────────────
async function updateBotRanking(botId, totalAsset, returnPct) {
  const profileSnap = await db.doc(`bot_profiles/${botId}`).get();
  const nickname = profileSnap.exists ? profileSnap.data().nickname : botId;
  await db.doc(`ss_mock_rankings/${botId}`).set({
    userId: botId,
    nickname,
    totalAsset: Math.round(totalAsset),
    returnPct: Math.round(returnPct * 100) / 100,
    updatedAt: todayKST(),
  });
}

// ── 영업일 카운터 (보유일수 계산용) ──────────────────────────────
function countBusinessDays(fromDate, toDate) {
  let count = 0;
  const from = new Date(fromDate + "T00:00:00+09:00");
  const to = new Date(toDate + "T00:00:00+09:00");
  const d = new Date(from);
  while (d <= to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ══════════════════════════════════════════════════════════════════
// ██ 시그널봇 (bot_signal) — 수급 크로스 전략
// ══════════════════════════════════════════════════════════════════

async function runSignalBot(prices, alreadyBought) {
  const botId = "bot_signal";
  const trades = [];
  let portfolio = await loadBotPortfolio(botId);
  const today = todayKST();

  // 포트폴리오 총 자산 계산
  const calcTotal = (p) => {
    const hv = Object.entries(p.holdings).reduce((s, [sym, h]) => {
      return s + (prices[sym]?.price ?? h.currentPrice) * h.qty;
    }, 0);
    return p.cash + hv;
  };

  const totalAsset = calcTotal(portfolio);
  const portfolioReturn = ((totalAsset - BOT_INITIAL_CASH) / BOT_INITIAL_CASH) * 100;
  const defenseMode = portfolioReturn <= -15;

  // ── 매도 판단 ──
  for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
    const px = prices[symbol]?.price;
    if (!px) continue;

    const returnPct = ((px - holding.avgPrice) / holding.avgPrice) * 100;
    const buyDate = (portfolio.history || []).filter(h => h.symbol === symbol && h.type === "buy").pop()?.date;
    const holdDays = buyDate ? countBusinessDays(buyDate, today) : 0;
    let sellReason = null;
    let sellQty = holding.qty;

    // 익절
    if (returnPct >= 15) {
      sellReason = `익절(전량) +${returnPct.toFixed(1)}%`;
    } else if (returnPct >= 8) {
      sellQty = Math.ceil(holding.qty * 0.5);
      sellReason = `익절(50%) +${returnPct.toFixed(1)}%`;
    }
    // 손절
    else if (returnPct <= -7) {
      sellReason = `손절 ${returnPct.toFixed(1)}%`;
    }
    // 시간 매도
    else if (holdDays >= 8 && returnPct < 4) {
      sellReason = `시간매도(${holdDays}일) ${returnPct.toFixed(1)}%`;
    }

    if (sellReason) {
      portfolio = executeBotOrder(portfolio, symbol, holding.name, "sell", sellQty, px);
      const trade = { date: today, type: "sell", symbol, name: holding.name, qty: sellQty, price: Math.round(px), reason: sellReason, signal: "supply_cross" };
      trades.push(trade);
      await logBotTrade(botId, trade);
    }
  }

  // ── 매수 판단 ── (방어모드 시 스킵)
  if (!defenseMode) {
    // signalsScanner 캐시에서 데이터 로드
    const scanDate = todayKST().replace(/-/g, "");
    const cacheKey = `signals_scanner_v4_${scanDate}`;
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    let signals = [];
    if (cacheDoc.exists && cacheDoc.data().data?.signals) {
      signals = cacheDoc.data().data.signals;
      console.log(`[bot_signal] 캐시 사용: ${signals.length}건`);
    }

    // 캐시 miss → 인라인 스캔 (SEED 종목, 빠르게)
    if (signals.length === 0) {
      console.log("[bot_signal] 캐시 없음 → 인라인 스캔 시작");
      const pool = SEED_SYMBOLS.slice(0, 30);
      const BATCH = 10;
      for (let i = 0; i < pool.length; i += BATCH) {
        const batch = pool.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map(scanOneSymbol));
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) signals.push(r.value);
        }
      }
      console.log(`[bot_signal] 인라인 스캔 완료: ${signals.length}건`);
    }

    const holdingSymbols = new Set(Object.keys(portfolio.holdings));
    const positionCount = holdingSymbols.size;
    const maxPositions = 5;
    const minCashRatio = 0.20;

    for (const sig of signals) {
      if (positionCount + trades.filter(t => t.type === "buy").length >= maxPositions) break;
      if (holdingSymbols.has(sig.symbol)) continue;
      if (alreadyBought.has(sig.symbol)) continue;

      // 조건: 채널 중하단 + 수급 순매수 + 급락 아닌 것
      if ((sig.positionPct ?? 0) > 10) continue;
      if ((sig.net3d ?? sig.netBuy3d ?? 0) <= 0) continue;
      if ((sig.changeRate ?? sig.changePct ?? 0) < -3) continue;

      const px = prices[sig.symbol]?.price ?? sig.close ?? sig.price;
      if (!px || px <= 0) continue;

      // 비중 계산: 종목당 최대 20%, 현금 20% 유지
      const currentTotal = calcTotal(portfolio);
      const maxInvest = Math.min(currentTotal * 0.2, portfolio.cash - currentTotal * minCashRatio);
      if (maxInvest < px) continue;

      const qty = Math.floor(maxInvest / px);
      if (qty <= 0) continue;

      portfolio = executeBotOrder(portfolio, sig.symbol, sig.name, "buy", qty, px);
      alreadyBought.add(sig.symbol);
      const trade = { date: today, type: "buy", symbol: sig.symbol, name: sig.name, qty, price: Math.round(px), reason: `채널중하단(${(sig.positionPct ?? 0).toFixed(0)}%) + 수급`, signal: "supply_cross" };
      trades.push(trade);
      await logBotTrade(botId, trade);
    }
  }

  // 현재가 반영
  for (const [sym, h] of Object.entries(portfolio.holdings)) {
    if (prices[sym]?.price) portfolio.holdings[sym] = { ...h, currentPrice: Math.round(prices[sym].price) };
  }

  await saveBotPortfolio(botId, portfolio);
  const snap = await saveBotSnapshot(botId, portfolio, prices);
  await updateBotRanking(botId, snap.totalAsset, snap.returnPct);

  console.log(`[bot_signal] 매매 ${trades.length}건, 총자산 ${Math.round(snap.totalAsset).toLocaleString()}, 수익률 ${snap.returnPct.toFixed(2)}%`);
  return { trades, totalAsset: snap.totalAsset, returnPct: snap.returnPct };
}

// ══════════════════════════════════════════════════════════════════
// ██ 골드봇 (bot_gold) — 골든크로스 전략
// ══════════════════════════════════════════════════════════════════

async function runGoldBot(prices, alreadyBought) {
  const botId = "bot_gold";
  const trades = [];
  let portfolio = await loadBotPortfolio(botId);
  const today = todayKST();

  const calcTotal = (p) => {
    const hv = Object.entries(p.holdings).reduce((s, [sym, h]) => {
      return s + (prices[sym]?.price ?? h.currentPrice) * h.qty;
    }, 0);
    return p.cash + hv;
  };

  // ── 매도 판단 ──
  for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
    const px = prices[symbol]?.price;
    if (!px) continue;

    const returnPct = ((px - holding.avgPrice) / holding.avgPrice) * 100;
    const buyTrade = (portfolio.history || []).filter(h => h.symbol === symbol && h.type === "buy").pop();
    const buyDate = buyTrade?.date;
    const holdDays = buyDate ? countBusinessDays(buyDate, today) : 0;
    const crossType = buyTrade?.signal || "5_20";
    let sellReason = null;
    let sellQty = holding.qty;

    if (crossType === "20_60") {
      if (returnPct >= 20) {
        sellReason = `20/60 익절(전량) +${returnPct.toFixed(1)}%`;
      } else if (returnPct >= 12) {
        sellQty = Math.ceil(holding.qty * 0.5);
        sellReason = `20/60 익절(50%) +${returnPct.toFixed(1)}%`;
      } else if (returnPct <= -8) {
        sellReason = `20/60 손절 ${returnPct.toFixed(1)}%`;
      } else if (holdDays >= 12 && returnPct < 5) {
        sellReason = `20/60 시간매도(${holdDays}일)`;
      }
    } else {
      if (returnPct >= 15) {
        sellReason = `5/20 익절(전량) +${returnPct.toFixed(1)}%`;
      } else if (returnPct >= 8) {
        sellQty = Math.ceil(holding.qty * 0.5);
        sellReason = `5/20 익절(50%) +${returnPct.toFixed(1)}%`;
      } else if (returnPct <= -6) {
        sellReason = `5/20 손절 ${returnPct.toFixed(1)}%`;
      } else if (holdDays >= 8 && returnPct < 4) {
        sellReason = `5/20 시간매도(${holdDays}일)`;
      }
    }

    if (sellReason) {
      portfolio = executeBotOrder(portfolio, symbol, holding.name, "sell", sellQty, px);
      const trade = { date: today, type: "sell", symbol, name: holding.name, qty: sellQty, price: Math.round(px), reason: sellReason, signal: crossType };
      trades.push(trade);
      await logBotTrade(botId, trade);
    }
  }

  // ── 매수 판단 ──
  const cacheDoc = await db.doc("cache/signal_scan").get();
  let scanResults = [];
  if (cacheDoc.exists && cacheDoc.data().data?.results) {
    scanResults = cacheDoc.data().data.results;
  }

  // 20_60 우선, 그 다음 5_20 (표준 골든크로스)
  const sorted = [...scanResults]
    .filter((s) => s.crossType === "20_60" || s.crossType === "5_20")
    .sort((a, b) => {
      const typeOrder = { "20_60": 0, "5_20": 1 };
      return (typeOrder[a.crossType] ?? 2) - (typeOrder[b.crossType] ?? 2);
    });

  const holdingSymbols = new Set(Object.keys(portfolio.holdings));
  const positionCount = holdingSymbols.size;
  const maxPositions = 5;
  const minCashRatio = 0.20;

  for (const sig of sorted) {
    if (positionCount + trades.filter(t => t.type === "buy").length >= maxPositions) break;
    if (holdingSymbols.has(sig.symbol)) continue;
    if (alreadyBought.has(sig.symbol)) continue;

    // 크로스 3일 이내
    if ((sig.daysAfterCross ?? 99) > 3) continue;
    // 외인+기관 순매수 > 0
    if ((sig.foreignNet ?? 0) + (sig.institutionNet ?? 0) <= 0) continue;

    const px = prices[sig.symbol]?.price ?? sig.price;
    if (!px || px <= 0) continue;

    // 비중 계산
    const currentTotal = calcTotal(portfolio);
    const maxPct = sig.crossType === "20_60" ? 0.25 : 0.18;
    const maxInvest = Math.min(currentTotal * maxPct, portfolio.cash - currentTotal * minCashRatio);
    if (maxInvest < px) continue;

    const qty = Math.floor(maxInvest / px);
    if (qty <= 0) continue;

    portfolio = executeBotOrder(portfolio, sig.symbol, sig.name, "buy", qty, px);
    alreadyBought.add(sig.symbol);
    const trade = { date: today, type: "buy", symbol: sig.symbol, name: sig.name, qty, price: Math.round(px), reason: `골든크로스(${sig.crossType}) ${sig.daysAfterCross}일전`, signal: sig.crossType };
    trades.push(trade);
    await logBotTrade(botId, trade);
  }

  // 현재가 반영
  for (const [sym, h] of Object.entries(portfolio.holdings)) {
    if (prices[sym]?.price) portfolio.holdings[sym] = { ...h, currentPrice: Math.round(prices[sym].price) };
  }

  await saveBotPortfolio(botId, portfolio);
  const snap = await saveBotSnapshot(botId, portfolio, prices);
  await updateBotRanking(botId, snap.totalAsset, snap.returnPct);

  console.log(`[bot_gold] 매매 ${trades.length}건, 총자산 ${Math.round(snap.totalAsset).toLocaleString()}, 수익률 ${snap.returnPct.toFixed(2)}%`);
  return { trades, totalAsset: snap.totalAsset, returnPct: snap.returnPct };
}

// ══════════════════════════════════════════════════════════════════
// ██ 개미봇 (bot_ant) — Gemini AI 감정 매매
// ══════════════════════════════════════════════════════════════════

async function runAntBot(prices, alreadyBought, apiKey) {
  const botId = "bot_ant";
  const trades = [];
  let portfolio = await loadBotPortfolio(botId);
  const today = todayKST();

  const calcTotal = (p) => {
    const hv = Object.entries(p.holdings).reduce((s, [sym, h]) => {
      return s + (prices[sym]?.price ?? h.currentPrice) * h.qty;
    }, 0);
    return p.cash + hv;
  };

  // ── 강제 손절/익절 (Gemini 판단 무관) ──
  for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
    const px = prices[symbol]?.price;
    if (!px) continue;
    const returnPct = ((px - holding.avgPrice) / holding.avgPrice) * 100;
    let sellReason = null;

    if (returnPct <= -10) sellReason = `강제손절 ${returnPct.toFixed(1)}%`;
    else if (returnPct >= 15) sellReason = `강제익절 +${returnPct.toFixed(1)}%`;

    if (sellReason) {
      portfolio = executeBotOrder(portfolio, symbol, holding.name, "sell", holding.qty, px);
      const trade = { date: today, type: "sell", symbol, name: holding.name, qty: holding.qty, price: Math.round(px), reason: sellReason, sentiment: "panic" };
      trades.push(trade);
      await logBotTrade(botId, trade);
    }
  }

  // ── Gemini에게 매매 판단 요청 ──
  try {
    // 시장 데이터 수집
    let fearGreed = null;
    try {
      const mktDoc = await db.doc("cache/market_commodities").get();
      if (mktDoc.exists) fearGreed = mktDoc.data().fearGreed;
    } catch {}

    // 인기종목
    let popularStocks = [];
    try {
      const popDoc = await db.doc("cache/popular_stocks").get();
      if (popDoc.exists && popDoc.data().data) popularStocks = popDoc.data().data.slice(0, 5);
    } catch {}

    const holdingsDesc = Object.entries(portfolio.holdings).map(([sym, h]) => {
      const px = prices[sym]?.price ?? h.currentPrice;
      const ret = ((px - h.avgPrice) / h.avgPrice * 100).toFixed(1);
      const buyDate = (portfolio.history || []).filter(t => t.symbol === sym && t.type === "buy").pop()?.date;
      const holdDays = buyDate ? countBusinessDays(buyDate, today) : 0;
      return `${h.name}(${sym}): ${h.qty}주, 평단 ${h.avgPrice}원, 현재 ${Math.round(px)}원, 수익률 ${ret}%, 보유 ${holdDays}일`;
    }).join("\n");

    // 어제 매도 후 오늘 급등한 종목 찾기 (후회 매수 유도)
    const recentSells = (portfolio.history || [])
      .filter(h => h.type === "sell" && h.date && countBusinessDays(h.date, today) <= 3)
      .map(h => {
        const px = prices[h.symbol]?.price;
        if (!px || !h.price) return null;
        const afterReturn = ((px - h.price) / h.price * 100).toFixed(1);
        return afterReturn > 2 ? `${h.name}(${h.symbol}): 매도가 ${h.price}원 → 현재 ${Math.round(px)}원 (+${afterReturn}%)` : null;
      }).filter(Boolean);

    const totalAsset = calcTotal(portfolio);
    const returnPct = ((totalAsset - BOT_INITIAL_CASH) / BOT_INITIAL_CASH) * 100;

    const prompt = `너는 전형적인 한국 개인투자자(개미)야. 2-3일 단기매매를 해. 감정적이고, FOMO에 약하고, 조급해.

[시장 상황]
- 공포탐욕지수: ${fearGreed ? `${fearGreed.value} (${fearGreed.label})` : "정보 없음"}
- 인기종목: ${popularStocks.map(s => s.name || s.symbol).join(", ") || "정보 없음"}
${recentSells.length > 0 ? `- 최근 매도 후 오른 종목 (후회됨):\n${recentSells.join("\n")}` : ""}

[내 포트폴리오]
- 현금: ${Math.round(portfolio.cash).toLocaleString()}원
- 총자산: ${Math.round(totalAsset).toLocaleString()}원 (수익률 ${returnPct.toFixed(1)}%)
- 보유종목:
${holdingsDesc || "(없음)"}

[매수 가능 종목과 현재가]
${Object.entries(prices).filter(([sym]) => !alreadyBought.has(sym)).slice(0, 15).map(([sym, p]) => `${p.name}(${sym}): ${Math.round(p.price)}원 (${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(1)}%)`).join("\n")}

[규칙 — 단기매매 개미 성격]
- 최대 보유 5종목, 현금 10% 이상 유지, 종목당 최대 25%
- 2-3일 안에 수익 못 내면 불안해서 정리하고 싶어함
- 보유 5일 넘으면 극도로 초조 → 수익이든 손실이든 정리 충동
- 공포탐욕 35 이하면 패닉 → 보유종목 투매 충동
- 공포탐욕 65 이상이면 FOMO → 적극 매수
- +3~5%면 "소확행" 성급 익절 (큰 수익 못 기다림)
- 손실 종목: 물타기(추가매수) 선호 — 이미 보유 중인 종목도 매수 가능!
- 최근 매도 후 오른 종목 → 후회하며 다시 매수 충동
- 오늘 급등 종목에 끌림, 오늘 급락 종목은 "기회"라고 착각

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "thinking": "오늘 시장을 보니... (감정적인 독백 2~3줄, 초조함/후회/FOMO 표현)",
  "actions": [
    { "type": "buy|sell", "symbol": "005930.KS", "name": "삼성전자", "reason": "감정적 이유", "conviction": 1~10, "amountPct": 10~25 }
  ]
}
actions가 없으면 빈 배열 []. conviction은 확신도(1약~10강). amountPct는 총자산 대비 %. 매도 시 보유수량의 %로 해석. 이미 보유 종목도 buy 가능(물타기).`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0, maxOutputTokens: 16384, responseMimeType: "application/json" },
    });

    // 디버그 로깅
    const cand = result.response.candidates?.[0];
    const parts = cand?.content?.parts || [];
    console.log(`[bot_ant] parts: ${parts.length}, finishReason: ${cand?.finishReason}`);

    // 텍스트 파트만 추출 (thought 파트 제외)
    let fullText = "";
    for (const part of parts) {
      if (part.text && !part.thought) fullText += part.text;
    }
    if (!fullText) fullText = result.response.text();
    console.log(`[bot_ant] fullText length: ${fullText.length}, start: ${JSON.stringify(fullText.slice(0, 80))}`);

    // JSON 파싱
    let parsed;
    try { parsed = JSON.parse(fullText); } catch {}
    if (!parsed) {
      const m = fullText.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
    if (!parsed) {
      console.error("[bot_ant] 파싱 실패. parts dump:", JSON.stringify(parts.map(p => ({ thought: !!p.thought, len: (p.text||"").length, head: (p.text||"").slice(0, 50) }))));
      throw new Error("JSON parse failed");
    }
    const thinking = parsed.thinking || "";

    // thinking을 bot_trade_logs에 기록
    if (thinking) {
      await db.collection(`bot_trade_logs/${botId}/trades`).add({
        date: today, type: "thinking", reason: thinking, timestamp: Date.now(),
      });
    }

    const actions = parsed.actions || [];
    const holdingSymbols = new Set(Object.keys(portfolio.holdings));

    for (const action of actions) {
      if (!action.type || !action.symbol) continue;

      if (action.type === "sell") {
        const holding = portfolio.holdings[action.symbol];
        if (!holding) continue;
        const px = prices[action.symbol]?.price;
        if (!px) continue;
        const sellPct = Math.min(action.amountPct || 100, 100) / 100;
        const sellQty = Math.max(1, Math.ceil(holding.qty * sellPct));
        portfolio = executeBotOrder(portfolio, action.symbol, holding.name, "sell", sellQty, px);
        const trade = { date: today, type: "sell", symbol: action.symbol, name: holding.name, qty: sellQty, price: Math.round(px), reason: action.reason || "AI 판단", sentiment: thinking.includes("무서") || thinking.includes("패닉") ? "panic" : "fomo" };
        trades.push(trade);
        await logBotTrade(botId, trade);
      }

      if (action.type === "buy") {
        // 물타기 허용: 보유 종목도 추가매수 가능 (단, 신규 종목은 5종목 제한)
        const isExisting = holdingSymbols.has(action.symbol);
        if (!isExisting && alreadyBought.has(action.symbol)) continue;
        if (!isExisting && Object.keys(portfolio.holdings).length >= 5) continue;

        const px = prices[action.symbol]?.price;
        if (!px || px <= 0) continue;

        const currentTotal = calcTotal(portfolio);
        const minCash = currentTotal * 0.1;
        const maxPct = Math.min((action.amountPct || 20) / 100, 0.25);
        const maxInvest = Math.min(currentTotal * maxPct, portfolio.cash - minCash);
        if (maxInvest < px) continue;

        const qty = Math.floor(maxInvest / px);
        if (qty <= 0) continue;

        portfolio = executeBotOrder(portfolio, action.symbol, action.name || prices[action.symbol]?.name || action.symbol, "buy", qty, px);
        alreadyBought.add(action.symbol);
        holdingSymbols.add(action.symbol);
        const trade = { date: today, type: "buy", symbol: action.symbol, name: action.name || prices[action.symbol]?.name || action.symbol, qty, price: Math.round(px), reason: action.reason || "FOMO", sentiment: "fomo" };
        trades.push(trade);
        await logBotTrade(botId, trade);
      }
    }
  } catch (err) {
    console.error("[bot_ant] Gemini 오류:", err.message);
  }

  // 현재가 반영
  for (const [sym, h] of Object.entries(portfolio.holdings)) {
    if (prices[sym]?.price) portfolio.holdings[sym] = { ...h, currentPrice: Math.round(prices[sym].price) };
  }

  await saveBotPortfolio(botId, portfolio);
  const snap = await saveBotSnapshot(botId, portfolio, prices);
  await updateBotRanking(botId, snap.totalAsset, snap.returnPct);

  console.log(`[bot_ant] 매매 ${trades.length}건, 총자산 ${Math.round(snap.totalAsset).toLocaleString()}, 수익률 ${snap.returnPct.toFixed(2)}%`);
  return { trades, totalAsset: snap.totalAsset, returnPct: snap.returnPct };
}

// ══════════════════════════════════════════════════════════════════
// ██ botTrader — 평일 10:30, 15:30 KST 실행 (onSchedule)
// ══════════════════════════════════════════════════════════════════

exports.botTrader = onSchedule(
  {
    schedule: "30 10,15 * * 1-5",
    timeZone: "Asia/Seoul",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [geminiApiKey],
    retryCount: 0,
  },
  async () => {
    const today = todayKST();
    const nowKST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const slot = nowKST.getHours() < 13 ? "morning" : "afternoon";
    const runKey = `${today}_${slot}`;
    console.log(`[botTrader] 시작: ${runKey}`);

    // 휴장일 스킵
    if (!isMarketDay(today)) {
      console.log(`[botTrader] 휴장일 스킵: ${today}`);
      return;
    }

    // 멱등성 체크 (슬롯별)
    const runDoc = await db.doc(`bot_runs/${runKey}`).get();
    if (runDoc.exists && runDoc.data().completedAt) {
      console.log(`[botTrader] 이미 실행 완료: ${runKey}`);
      return;
    }

    await db.doc(`bot_runs/${runKey}`).set({ startedAt: Date.now() }, { merge: true });

    try {
      // 보유종목 + 시그널 종목 현재가 일괄 조회
      const allSymbols = new Set();
      for (const botId of BOT_IDS) {
        const p = await loadBotPortfolio(botId);
        Object.keys(p.holdings).forEach((s) => allSymbols.add(s));
      }

      // 시그널 캐시에서 매수 후보 종목 추가
      const scanDate = today.replace(/-/g, "");
      const signalCacheKey = `signals_scanner_v4_${scanDate}`;
      try {
        const sigDoc = await db.doc(`cache/${signalCacheKey}`).get();
        if (sigDoc.exists && sigDoc.data().data?.signals) {
          sigDoc.data().data.signals.slice(0, 20).forEach((s) => allSymbols.add(s.symbol));
        }
      } catch {}
      try {
        const gcDoc = await db.doc("cache/signal_scan").get();
        if (gcDoc.exists && gcDoc.data().data?.results) {
          gcDoc.data().data.results.slice(0, 20).forEach((s) => allSymbols.add(s.symbol));
        }
      } catch {}
      // 인기종목 추가 (개미봇용)
      try {
        const popDoc = await db.doc("cache/popular_stocks").get();
        if (popDoc.exists && popDoc.data().data) {
          popDoc.data().data.slice(0, 10).forEach((s) => { if (s.symbol) allSymbols.add(s.symbol); });
        }
      } catch {}

      const prices = await fetchPricesBatch([...allSymbols]);
      console.log(`[botTrader] 시세 조회 완료: ${Object.keys(prices).length}종목`);

      // 봇 간 겹침 방지용 Set
      const alreadyBought = new Set();
      const results = {};

      // 시그널봇 → 골드봇 → 개미봇 순차 실행
      try {
        results.signal = await runSignalBot(prices, alreadyBought);
      } catch (err) {
        console.error("[botTrader] 시그널봇 오류:", err.message);
        results.signal = { error: err.message };
      }

      try {
        results.gold = await runGoldBot(prices, alreadyBought);
      } catch (err) {
        console.error("[botTrader] 골드봇 오류:", err.message);
        results.gold = { error: err.message };
      }

      try {
        results.ant = await runAntBot(prices, alreadyBought, geminiApiKey.value());
      } catch (err) {
        console.error("[botTrader] 개미봇 오류:", err.message);
        results.ant = { error: err.message };
      }

      await db.doc(`bot_runs/${runKey}`).set({
        startedAt: runDoc.exists ? runDoc.data().startedAt : Date.now(),
        completedAt: Date.now(),
        slot,
        results,
      });

      console.log(`[botTrader] 완료 (${slot}):`, JSON.stringify(results, null, 2));
    } catch (err) {
      console.error("[botTrader] 치명적 오류:", err);
      await db.doc(`bot_runs/${runKey}`).set({ error: err.message, failedAt: Date.now() }, { merge: true });
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// ██ botInit — 봇 초기 데이터 생성 (1회용 onRequest)
// ══════════════════════════════════════════════════════════════════

exports.botInit = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const botProfiles = {
      bot_signal: {
        botType: "signal",
        nickname: "시그널봇",
        emoji: "📡",
        color: "cyan",
        description: "수급 반전 전략 — 채널 중하단 + 기관/외인 순매수 포착. 익절 +8%/+15%, 손절 -7%.",
        strategyDetail: "수급 반전 전략 — 채널 중하단(10% 이하) + 3일 순매수 감지 시 진입. 익절 +8%/+15%, 손절 -7%, 최대 8영업일. 데이터만 믿습니다.",
        maxPositions: 5,
      },
      bot_gold: {
        botType: "golden",
        nickname: "골드봇",
        emoji: "✨",
        color: "amber",
        description: "골든크로스 모멘텀 — 5/20, 20/60 이동평균 교차 + 수급 필터. 추세를 끝까지 탑니다.",
        strategyDetail: "골든크로스 모멘텀 — 5/20, 20/60 이동평균 크로스 + 수급 확인. 추세를 끝까지 탑니다. 5/20: 익절 +8%/+15%, 손절 -6%. 20/60: 익절 +12%/+20%, 손절 -8%.",
        maxPositions: 5,
      },
      bot_ant: {
        botType: "ant",
        nickname: "개미봇",
        emoji: "🐜",
        color: "rose",
        description: "AI 감정 단기매매 — Gemini가 2-3일 단기매매의 초조함으로 매매합니다.",
        strategyDetail: "AI 감정 단기매매 — 2-3일 단기매매의 초조함. FOMO 매수, 소확행 익절, 후회 매수, 물타기. 강제손절 -10%, 강제익절 +15%.",
        maxPositions: 5,
      },
    };

    const batch = db.batch();
    const today = todayKST();

    for (const [botId, profile] of Object.entries(botProfiles)) {
      // 프로필
      batch.set(db.doc(`bot_profiles/${botId}`), profile);
      // 포트폴리오
      batch.set(db.doc(`ss_portfolios/${botId}`), {
        cash: BOT_INITIAL_CASH,
        holdings: {},
        history: [],
        settledAt: null,
      });
      // 랭킹
      batch.set(db.doc(`ss_mock_rankings/${botId}`), {
        userId: botId,
        nickname: profile.nickname,
        totalAsset: BOT_INITIAL_CASH,
        returnPct: 0,
        updatedAt: today,
      });
      // 초기 스냅샷
      batch.set(db.doc(`bot_snapshots/${botId}/daily/${today}`), {
        date: today,
        totalAsset: BOT_INITIAL_CASH,
        returnPct: 0,
        cash: BOT_INITIAL_CASH,
        holdingsCount: 0,
      });
    }

    await batch.commit();

    // trade_logs + snapshots 서브컬렉션 삭제
    for (const botId of Object.keys(botProfiles)) {
      // bot_trade_logs/{botId}/trades 삭제
      const tradeDocs = await db.collection(`bot_trade_logs/${botId}/trades`).listDocuments();
      if (tradeDocs.length > 0) {
        const delBatch = db.batch();
        tradeDocs.forEach(doc => delBatch.delete(doc));
        await delBatch.commit();
        console.log(`[botInit] ${botId} trade_logs ${tradeDocs.length}건 삭제`);
      }
      // bot_snapshots/{botId}/daily 삭제
      const snapDocs = await db.collection(`bot_snapshots/${botId}/daily`).listDocuments();
      if (snapDocs.length > 0) {
        const delBatch = db.batch();
        snapDocs.forEach(doc => delBatch.delete(doc));
        await delBatch.commit();
        console.log(`[botInit] ${botId} snapshots ${snapDocs.length}건 삭제`);
      }
    }

    res.json({ success: true, bots: Object.keys(botProfiles), date: today });
  }
);

// ── 자본시장 대시보드 (capitalMarket.js) ────────────────────
const cm = require("./capitalMarket");
exports.capitalMarket = cm.capitalMarket;
exports.capitalMarketSeries = cm.capitalMarketSeries;

// ── 방문자 카운터 (IP 기반 유니크) ───────────────────────────
const VISITOR_BASE_TOTAL = 5074; // 5233 - 오늘(159) = 5074
const DAILY_OFFSET = { "2026-03-27": 210 }; // 초기화 보정

exports.visitorCount = onRequest({ cors: true }, async (req, res) => {
  try {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayKey = kst.toISOString().slice(0, 10);

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.ip || "unknown";
    const ipHash = Buffer.from(ip).toString("base64").slice(0, 12);

    const todayRef = db.doc(`visitor_counts/${todayKey}`);
    const todaySnap = await todayRef.get();
    const data = todaySnap.exists ? todaySnap.data() : { count: 0, ips: [] };
    const ips = data.ips || [];

    if (!ips.includes(ipHash)) {
      await todayRef.set(
        {
          count: admin.firestore.FieldValue.increment(1),
          ips: admin.firestore.FieldValue.arrayUnion(ipHash),
          date: todayKey,
        },
        { merge: true }
      );
    }

    const updatedSnap = await todayRef.get();
    const todayCount = (updatedSnap.exists ? updatedSnap.data().count : 1) + (DAILY_OFFSET[todayKey] || 0);

    const allSnap = await db.collection("visitor_counts").get();
    let total = VISITOR_BASE_TOTAL;
    allSnap.forEach((doc) => {
      total += doc.data().count || 0;
    });
    // DAILY_OFFSET 합산
    for (const v of Object.values(DAILY_OFFSET)) total += v;

    res.json({ today: todayCount, total });
  } catch (e) {
    console.error("visitorCount error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// ██ 종목별 AI 분석 리포트
// ══════════════════════════════════════════════════════════════════

const REPORT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

/** Yahoo 차트 fetch (일/주/월봉 공통) */
async function fetchYahooChart(symbol, range, interval) {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const json = await r.json();
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp) continue;
      const ts = result.timestamp;
      const q = result.indicators?.quote?.[0];
      if (!q) continue;
      const candles = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.close?.[i] == null) continue;
        candles.push({
          time: ts[i],
          date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
          open: q.open?.[i] ?? 0,
          high: q.high?.[i] ?? 0,
          low: q.low?.[i] ?? 0,
          close: q.close[i],
          volume: q.volume?.[i] ?? 0,
        });
      }
      return {
        candles,
        name: result.meta?.shortName || result.meta?.longName || symbol,
        currency: result.meta?.currency || "KRW",
      };
    } catch { /* try next */ }
  }
  return null;
}

/** 서버사이드 기술지표 계산 */
function calcTechnicalIndicators(candles) {
  if (!candles || candles.length < 20) return null;

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const n = closes.length;

  // 이동평균
  const ma = (period) => {
    if (n < period) return null;
    let sum = 0;
    for (let i = n - period; i < n; i++) sum += closes[i];
    return Math.round((sum / period) * 100) / 100;
  };
  const ma5 = ma(5);
  const ma20 = ma(20);
  const ma60 = ma(60);
  const ma120 = ma(120);

  // 이평선 배열 상태
  let maStatus = "판단 불가";
  if (ma5 && ma20 && ma60) {
    if (ma5 > ma20 && ma20 > ma60) maStatus = "정배열 (단기 > 중기 > 장기)";
    else if (ma5 < ma20 && ma20 < ma60) maStatus = "역배열 (단기 < 중기 < 장기)";
    else maStatus = "혼조 (정배열/역배열 혼합)";
  }

  // RSI(14)
  let rsi = null;
  if (n >= 15) {
    let gains = 0, losses = 0;
    for (let i = n - 14; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    rsi = avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
  }

  // MACD(12,26,9)
  let macdValue = null, macdSignal = null, macdHist = null, macdCross = "없음";
  if (n >= 35) {
    const ema = (data, period) => {
      const k = 2 / (period + 1);
      const result = [data[0]];
      for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine.slice(26), 9);
    const offset = 26;
    macdValue = Math.round(macdLine[n - 1] * 100) / 100;
    const sigIdx = n - 1 - offset;
    if (sigIdx >= 0 && sigIdx < signalLine.length) {
      macdSignal = Math.round(signalLine[sigIdx] * 100) / 100;
      macdHist = Math.round((macdValue - macdSignal) * 100) / 100;
      // 최근 5일 이내 크로스 확인
      for (let i = Math.max(0, sigIdx - 5); i < sigIdx; i++) {
        const prevDiff = macdLine[i + offset] - signalLine[i];
        const currDiff = macdLine[i + offset + 1] - (signalLine[i + 1] || signalLine[i]);
        if (prevDiff < 0 && currDiff > 0) macdCross = "골든크로스";
        else if (prevDiff > 0 && currDiff < 0) macdCross = "데드크로스";
      }
    }
  }

  // 볼린저밴드(20,2)
  let bbUpper = null, bbLower = null, bbPosition = null;
  if (n >= 20) {
    const recent20 = closes.slice(-20);
    const mean = recent20.reduce((a, b) => a + b, 0) / 20;
    const variance = recent20.reduce((a, b) => a + (b - mean) ** 2, 0) / 20;
    const std = Math.sqrt(variance);
    bbUpper = Math.round((mean + 2 * std) * 100) / 100;
    bbLower = Math.round((mean - 2 * std) * 100) / 100;
    const range = bbUpper - bbLower;
    bbPosition = range > 0 ? Math.round(((closes[n - 1] - bbLower) / range) * 100) : 50;
  }

  // 거래량 비율 (최근 5일 / 20일 평균)
  let volumeRatio = null;
  if (n >= 20) {
    const vol20Avg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const vol5Avg = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    volumeRatio = vol20Avg > 0 ? Math.round((vol5Avg / vol20Avg) * 100) / 100 : 1;
  }

  // 추세 (60일 선형회귀 기울기)
  let trend = "판단 불가";
  const trendWindow = Math.min(60, n);
  if (trendWindow >= 20) {
    const slice = closes.slice(-trendWindow);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < slice.length; i++) {
      sumX += i; sumY += slice[i]; sumXY += i * slice[i]; sumX2 += i * i;
    }
    const slope = (slice.length * sumXY - sumX * sumY) / (slice.length * sumX2 - sumX * sumX);
    const avgPrice = sumY / slice.length;
    const slopePct = (slope / avgPrice) * 100;
    if (slopePct > 0.1) trend = "상승 추세";
    else if (slopePct < -0.1) trend = "하락 추세";
    else trend = "횡보";

    // 전체 기간 수익률과 추세 방향 모순 방지
    if (n >= 60) {
      const fullReturn = ((closes[n - 1] - closes[0]) / closes[0]) * 100;
      if (trend === "상승 추세" && fullReturn < -5) trend = "횡보";
      if (trend === "하락 추세" && fullReturn > 5) trend = "횡보";
    }
  }

  // 지지/저항 (최근 60일 최저/최고)
  const recent = candles.slice(-Math.min(60, n));
  const support = Math.min(...recent.map((c) => c.low));
  const resistance = Math.max(...recent.map((c) => c.high));

  return {
    currentPrice: closes[n - 1],
    ma5, ma20, ma60, ma120, maStatus,
    rsi,
    macd: macdValue, macdSignal, macdHist, macdCross,
    bbUpper, bbLower, bbPosition,
    volumeRatio,
    trend,
    support: Math.round(support),
    resistance: Math.round(resistance),
  };
}

/** DART 특정 종목 공시 목록 조회 */
async function fetchDartDisclosures(corpCode, dartKey, days = 60) {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10).replace(/-/g, "");
  const fromDate = new Date(now.getTime() - days * 86400000)
    .toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bgn_de=${fromDate}&end_de=${toDate}&page_count=20&sort=date&sort_mth=desc`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.status !== "000" || !data.list) return [];
    return data.list.slice(0, 10).map((item) => ({
      title: item.report_nm,
      date: item.rcept_dt,
      receiptNo: item.rcept_no,
    }));
  } catch {
    return [];
  }
}

/** 네이버 투자자 동향 직접 조회 (내부 재활용) */
async function fetchInvestorDataInternal(stockCode, pages = 3) {
  const urls = [];
  for (let p = 1; p <= pages; p++) {
    urls.push(`https://finance.naver.com/item/frgn.naver?code=${stockCode}&page=${p}`);
  }
  try {
    const htmlPages = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
          signal: AbortSignal.timeout(8000),
        }).then((r) => r.text())
      )
    );
    const allRows = [];
    for (const html of htmlPages) {
      allRows.push(...parseNaverInvestorPage(html));
    }
    // 중복 제거 + 정렬
    const seen = new Set();
    const daily = [];
    for (const row of allRows) {
      if (seen.has(row.date)) continue;
      seen.add(row.date);
      daily.push(row);
    }
    daily.sort((a, b) => a.date.localeCompare(b.date));
    return daily;
  } catch {
    return [];
  }
}

exports.stockReport = onRequest(
  { cors: true, secrets: [geminiApiKey, dartApiKey], memory: "512MiB", timeoutSeconds: 120 },
  async (req, res) => {
    try {
      const rawSymbol = (req.query.symbol || "").trim();
      if (!rawSymbol) {
        res.status(400).json({ error: "symbol 파라미터가 필요합니다" });
        return;
      }

      // 심볼 정규화
      const stockCode = rawSymbol.replace(/\.\w+$/, "");
      const isKorean = rawSymbol.endsWith(".KS") || rawSymbol.endsWith(".KQ") || /^\d{6}$/.test(rawSymbol);
      let symbol = rawSymbol;
      if (isKorean && !rawSymbol.includes(".")) {
        const mapped = KR_STOCK_MAP.find((s) => s.symbol === `${rawSymbol}.KS` || s.symbol === `${rawSymbol}.KQ`);
        symbol = mapped ? mapped.symbol : `${rawSymbol}.KS`;
      }

      // 1. 캐시 확인
      const cacheKey = `stock_report_${stockCode}`;
      const forceRefresh = req.query.refresh === "true";
      if (!forceRefresh) {
        try {
          const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
          if (cacheDoc.exists) {
            const cached = cacheDoc.data();
            if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < REPORT_CACHE_TTL) {
              console.log(`[stock-report] Cache hit: ${stockCode}`);
              res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
              res.json(cached.data);
              return;
            }
          }
        } catch {}
      }

      console.log(`[stock-report] Generating: ${symbol} (korean=${isKorean})`);

      // 2. 데이터 수집 (병렬)
      const corpCode = isKorean ? getDartCorpCode(stockCode) : null;
      const dartKey = dartApiKey.value();
      const currentYear = new Date().getFullYear();

      const [
        dailyChart,
        weeklyChart,
        monthlyChart,
        yahooSummary,
        ...dartAndInvestor
      ] = await Promise.allSettled([
        fetchYahooChart(symbol, "6mo", "1d"),
        fetchYahooChart(symbol, "2y", "1wk"),
        fetchYahooChart(symbol, "5y", "1mo"),
        fetchYahooSummary(symbol),
        // DART 재무 (최근 3년)
        corpCode ? fetchDartFinancials(corpCode, dartKey, currentYear - 1) : Promise.resolve(null),
        corpCode ? fetchDartFinancials(corpCode, dartKey, currentYear - 2) : Promise.resolve(null),
        corpCode ? fetchDartFinancials(corpCode, dartKey, currentYear - 3) : Promise.resolve(null),
        // DART 공시 목록
        corpCode ? fetchDartDisclosures(corpCode, dartKey) : Promise.resolve([]),
        // 투자자 동향
        isKorean ? fetchInvestorDataInternal(stockCode, 3) : Promise.resolve([]),
      ]);

      const daily = dailyChart.status === "fulfilled" ? dailyChart.value : null;
      const weekly = weeklyChart.status === "fulfilled" ? weeklyChart.value : null;
      const monthly = monthlyChart.status === "fulfilled" ? monthlyChart.value : null;
      const summary = yahooSummary.status === "fulfilled" ? yahooSummary.value : {};
      const stockName = daily?.name || weekly?.name || symbol;

      if (!daily || daily.candles.length < 20) {
        res.status(404).json({ error: "차트 데이터가 부족합니다" });
        return;
      }

      // DART 재무 결과 정리
      const financials = [];
      for (let i = 0; i < 3; i++) {
        const r = dartAndInvestor[i];
        const year = currentYear - 1 - i;
        if (r.status === "fulfilled" && r.value) {
          financials.push({ year, netIncome: r.value.netIncome, equity: r.value.equity });
        }
      }
      const disclosures = dartAndInvestor[3]?.status === "fulfilled" ? dartAndInvestor[3].value : [];
      const investorDaily = dartAndInvestor[4]?.status === "fulfilled" ? dartAndInvestor[4].value : [];

      // 3. 기술지표 계산
      const techIndicators = calcTechnicalIndicators(daily.candles);

      // 4. 수급 요약
      const supplyData = {};
      if (investorDaily.length > 0) {
        const recent30 = investorDaily.slice(-30);
        supplyData.foreignNet30d = recent30.reduce((s, d) => s + (d.foreign || 0), 0);
        supplyData.institutionNet30d = recent30.reduce((s, d) => s + (d.institution || 0), 0);
        // 외인 연속 매수/매도 일수
        let streak = 0;
        for (let i = investorDaily.length - 1; i >= 0; i--) {
          const f = investorDaily[i].foreign || 0;
          if (i === investorDaily.length - 1) {
            streak = f >= 0 ? 1 : -1;
          } else {
            if ((streak > 0 && f >= 0) || (streak < 0 && f < 0)) {
              streak += streak > 0 ? 1 : -1;
            } else break;
          }
        }
        supplyData.foreignStreak = streak;
        supplyData.foreignPctLatest = investorDaily[investorDaily.length - 1]?.foreignPct ?? null;
      }

      // 5. Gemini 분석 (2-pass)
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const flash = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 주봉/월봉 요약 (최근 10개만)
      const weeklySummary = weekly ? weekly.candles.slice(-10).map((c) =>
        `${c.date}: ${Math.round(c.close)} (거래량 ${c.volume})`
      ).join("\n") : "없음";
      const monthlySummary = monthly ? monthly.candles.slice(-12).map((c) =>
        `${c.date}: ${Math.round(c.close)}`
      ).join("\n") : "없음";

      // Pass 1: 3개 병렬 분석
      const techPrompt = `당신은 주식 기술적 분석 전문가입니다. 아래 데이터를 분석하고 JSON으로 응답하세요.

종목: ${stockName} (${stockCode})
현재가: ${techIndicators?.currentPrice || "N/A"}

[일봉 기술지표]
이동평균: MA5=${techIndicators?.ma5}, MA20=${techIndicators?.ma20}, MA60=${techIndicators?.ma60}, MA120=${techIndicators?.ma120}
배열 상태: ${techIndicators?.maStatus}
RSI(14): ${techIndicators?.rsi}
MACD: ${techIndicators?.macd} / Signal: ${techIndicators?.macdSignal} / Hist: ${techIndicators?.macdHist} / 크로스: ${techIndicators?.macdCross}
볼린저밴드: 상단=${techIndicators?.bbUpper}, 하단=${techIndicators?.bbLower}, 위치=${techIndicators?.bbPosition}%
거래량 비율(5일/20일): ${techIndicators?.volumeRatio}
추세: ${techIndicators?.trend}
지지/저항: ${techIndicators?.support} / ${techIndicators?.resistance}

[주봉 최근 10주]
${weeklySummary}

[월봉 최근 12개월]
${monthlySummary}

다음 JSON 형식으로만 응답하세요:
{
  "score": 0~100 (기술적 매력도 점수),
  "trend": "한 문장 추세 요약",
  "maStatus": "이평선 상태 설명",
  "rsiComment": "RSI 해석",
  "macdComment": "MACD 해석",
  "bollingerComment": "볼린저 해석",
  "volumeComment": "거래량 해석",
  "keyLevels": { "support": 숫자, "resistance": 숫자 },
  "summary": "3~4줄 기술적 분석 종합 의견"
}`;

      const finPrompt = `당신은 기업 재무 분석 전문가입니다. 아래 데이터를 분석하고 JSON으로 응답하세요.

종목: ${stockName} (${stockCode})
섹터: ${summary.sector || "N/A"}
산업: ${summary.industry || "N/A"}

[재무제표 (DART)]
${financials.length > 0
  ? financials.map((f) => `${f.year}년: 당기순이익 ${f.netIncome != null ? (f.netIncome / 100000000).toFixed(0) + "억원" : "N/A"}, 자본총계 ${f.equity != null ? (f.equity / 100000000).toFixed(0) + "억원" : "N/A"}`).join("\n")
  : "재무 데이터 없음"}

[밸류에이션]
Trailing PER: ${summary.trailingPe ?? "N/A"}
Forward PER: ${summary.forwardPe ?? "N/A"}

[최근 공시 (DART)]
${disclosures.length > 0
  ? disclosures.map((d) => `${d.date}: ${d.title}`).join("\n")
  : "최근 공시 없음"}

다음 JSON 형식으로만 응답하세요:
{
  "score": 0~100 (재무 건전성 점수),
  "revenueComment": "실적 추이 해석",
  "perComment": "밸류에이션 해석",
  "roeComment": "자본 효율성 해석",
  "disclosureComment": "주요 공시 해석 (없으면 '특이 공시 없음')",
  "summary": "3~4줄 재무 분석 종합 의견"
}`;

      const supplyPrompt = `당신은 주식 수급 분석 전문가입니다. 아래 데이터를 분석하고 JSON으로 응답하세요.

종목: ${stockName} (${stockCode})

[투자자 동향 (최근 30거래일)]
외국인 순매수 합계: ${supplyData.foreignNet30d?.toLocaleString() ?? "N/A"}주
기관 순매수 합계: ${supplyData.institutionNet30d?.toLocaleString() ?? "N/A"}주
외국인 연속 매수/매도: ${supplyData.foreignStreak ?? "N/A"}일 (양수=매수, 음수=매도)
외국인 보유율: ${supplyData.foreignPctLatest ?? "N/A"}%

[최근 10거래일 상세]
${investorDaily.slice(-10).map((d) =>
  `${d.date}: 외인=${(d.foreign || 0).toLocaleString()} 기관=${(d.institution || 0).toLocaleString()} 종가=${d.close?.toLocaleString() || "N/A"}`
).join("\n") || "데이터 없음"}

다음 JSON 형식으로만 응답하세요:
{
  "score": 0~100 (수급 매력도 점수),
  "foreignComment": "외국인 동향 해석",
  "institutionComment": "기관 동향 해석",
  "flowComment": "자금 흐름 해석",
  "summary": "3~4줄 수급 분석 종합 의견"
}`;

      console.log(`[stock-report] Pass 1: 3 parallel Gemini calls for ${stockCode}...`);
      const [techResult, finResult, supplyResult] = await Promise.allSettled([
        flash.generateContent(techPrompt).then((r) => {
          const text = r.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          return JSON.parse(text);
        }),
        flash.generateContent(finPrompt).then((r) => {
          const text = r.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          return JSON.parse(text);
        }),
        flash.generateContent(supplyPrompt).then((r) => {
          const text = r.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          return JSON.parse(text);
        }),
      ]);

      const tech = techResult.status === "fulfilled" ? techResult.value : { score: 50, summary: "기술적 분석 생성 실패" };
      const fin = finResult.status === "fulfilled" ? finResult.value : { score: 50, summary: "재무 분석 생성 실패" };
      const supply = supplyResult.status === "fulfilled" ? supplyResult.value : { score: 50, summary: "수급 분석 생성 실패" };

      // Pass 2: 종합 분석
      const synthPrompt = `당신은 종합 주식 분석 전문가입니다. 3개 분야의 분석 결과를 종합하여 최종 등급과 의견을 제시하세요.

종목: ${stockName} (${stockCode})
섹터: ${summary.sector || "N/A"}

[기술적 분석 (${tech.score}점)]
${tech.summary}

[재무 분석 (${fin.score}점)]
${fin.summary}

[수급 분석 (${supply.score}점)]
${supply.summary}

다음 JSON 형식으로만 응답하세요:
{
  "grade": "S" 또는 "A" 또는 "B" 또는 "C" 또는 "D" (종합 등급),
  "gradeLabel": "매우 좋음/좋음/보통/주의/위험",
  "overallScore": 0~100,
  "valuationScore": 0~100 (밸류에이션 매력도),
  "opinion": "5~6줄의 종합 투자 의견. 강점, 약점, 주의점을 균형있게 서술",
  "checklist": [
    { "label": "실적 성장세", "checked": true/false },
    { "label": "외국인 순매수", "checked": true/false },
    { "label": "기술적 반등 신호", "checked": true/false },
    { "label": "밸류에이션 매력", "checked": true/false },
    { "label": "공시 리스크 없음", "checked": true/false }
  ]
}`;

      console.log(`[stock-report] Pass 2: Synthesis for ${stockCode}...`);
      const synthResponse = await flash.generateContent(synthPrompt);
      const synthText = synthResponse.response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let synth;
      try {
        synth = JSON.parse(synthText);
      } catch {
        synth = { grade: "B", gradeLabel: "보통", overallScore: 50, valuationScore: 50, opinion: "종합 분석 생성 실패", checklist: [] };
      }

      // 6. 응답 조립
      const response = {
        symbol: stockCode,
        name: stockName,
        sector: summary.sector || null,
        industry: summary.industry || null,
        grade: synth.grade,
        gradeLabel: synth.gradeLabel,
        scores: {
          technical: tech.score || 50,
          financial: fin.score || 50,
          supply: supply.score || 50,
          valuation: synth.valuationScore || 50,
          overall: synth.overallScore || 50,
        },
        technical: {
          trend: tech.trend || techIndicators?.trend,
          maStatus: tech.maStatus || techIndicators?.maStatus,
          rsi: techIndicators?.rsi,
          rsiComment: tech.rsiComment,
          macd: techIndicators?.macd,
          macdCross: tech.macdComment || techIndicators?.macdCross,
          bollinger: tech.bollingerComment,
          bbPosition: techIndicators?.bbPosition,
          volumeRatio: techIndicators?.volumeRatio,
          volumeComment: tech.volumeComment,
          keyLevels: tech.keyLevels || { support: techIndicators?.support, resistance: techIndicators?.resistance },
          summary: tech.summary,
        },
        financial: {
          revenue: financials.map((f) => ({
            year: f.year,
            netIncome: f.netIncome,
            equity: f.equity,
          })),
          per: summary.trailingPe || null,
          forwardPer: summary.forwardPe || null,
          revenueComment: fin.revenueComment,
          perComment: fin.perComment,
          roeComment: fin.roeComment,
          disclosureComment: fin.disclosureComment,
          recentDisclosures: disclosures,
          summary: fin.summary,
        },
        supply: {
          foreignNet30d: supplyData.foreignNet30d ?? null,
          institutionNet30d: supplyData.institutionNet30d ?? null,
          foreignStreak: supplyData.foreignStreak ?? null,
          foreignPct: supplyData.foreignPctLatest ?? null,
          foreignComment: supply.foreignComment,
          institutionComment: supply.institutionComment,
          flowComment: supply.flowComment,
          summary: supply.summary,
        },
        opinion: synth.opinion,
        checklist: synth.checklist || [],
        updatedAt: new Date().toISOString(),
      };

      // 7. 캐시 저장
      try {
        await db.doc(`cache/${cacheKey}`).set({ data: response, fetchedAt: Date.now() });
      } catch {}

      console.log(`[stock-report] OK: ${stockCode} grade=${synth.grade} score=${synth.overallScore}`);
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.json(response);
    } catch (err) {
      console.error("[stock-report] Error:", err);
      res.status(500).json({ error: err.message || "리포트 생성 실패" });
    }
  }
);

// ── ovision Functions 프록시 (cross-origin → same-origin 전환) ──

// Golden History 프록시 (GET)
exports.goldenHistory = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") { res.status(405).send("Method Not Allowed"); return; }
    try {
      const qs = new URLSearchParams(req.query).toString();
      const upstream = await fetch(`${OVISION_HOST}/api/golden-history${qs ? "?" + qs : ""}`);
      const data = await upstream.json();
      res.set("Cache-Control", "public, max-age=3600");
      res.json(data);
    } catch (err) {
      console.error("[goldenHistory proxy]", err);
      res.status(502).json({ error: "프록시 오류" });
    }
  }
);

// BS Signal Scan 프록시 (GET)
exports.bsSignalScan = onRequest(
  { cors: true, timeoutSeconds: 540, region: "us-central1", memory: "1GiB" },
  async (req, res) => {
    if (req.method !== "GET") { res.status(405).send("Method Not Allowed"); return; }
    try {
      const qs = new URLSearchParams(req.query).toString();
      const upstream = await fetch(`${OVISION_HOST}/api/bs-signals${qs ? "?" + qs : ""}`);
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      console.error("[bsSignalScan proxy]", err);
      res.status(502).json({ error: "프록시 오류" });
    }
  }
);

// Push Token 저장 프록시 (POST)
exports.savePushToken = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    try {
      const upstream = await fetch(`${OVISION_HOST}/api/save-push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      console.error("[savePushToken proxy]", err);
      res.status(502).json({ error: "프록시 오류" });
    }
  }
);

// ── 포트폴리오 OCR 프록시 ──
exports.portfolioOcr = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "512MiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      const upstream = await fetch(`${OVISION_HOST}/api/portfolio-ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (err) {
      console.error("[portfolioOcr proxy]", err);
      res.status(502).json({ error: "OCR 프록시 오류" });
    }
  }
);

// ── 포트폴리오 분석 프록시 (ovision Functions → same-origin 전환) ──
exports.portfolioAnalyze = onRequest(
  { cors: true, timeoutSeconds: 540, memory: "512MiB" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      const upstream = await fetch(`${OVISION_HOST}/api/portfolio-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (err) {
      console.error("[portfolioAnalyze proxy]", err);
      res.status(502).json({ error: "분석 프록시 오류" });
    }
  }
);

// ── 포트폴리오 공유 쿠폰 (Fingerprint 기반 활성화) ──
exports.portfolioShareCoupon = onRequest({ cors: true }, async (req, res) => {
  const action = req.query.action || req.body?.action;

  function generateFingerprint(request) {
    const ip = (request.headers["x-forwarded-for"] || "").split(",")[0].trim() || request.ip || "unknown";
    const ua = request.headers["user-agent"] || "unknown";
    return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex");
  }

  try {
    if (action === "complete_share" && req.method === "POST") {
      const fingerprint = generateFingerprint(req);
      const shareId = req.body?.shareId;

      if (shareId) {
        await db.doc(`ss_share_coupons/${shareId}`).update({
          ownerFingerprint: fingerprint,
          couponStatus: "pending",
          updatedAt: Date.now(),
        });
        res.json({ status: "coupon_pending", shareId });
      } else {
        const docRef = db.collection("ss_share_coupons").doc();
        await docRef.set({
          type: "gate",
          ownerFingerprint: fingerprint,
          couponStatus: "pending",
          visitorCount: 0,
          createdAt: Date.now(),
        });
        res.json({ status: "coupon_pending", shareId: docRef.id });
      }
    } else if (action === "visit" && req.method === "POST") {
      const shareId = req.body?.shareId || req.query.shareId;
      if (!shareId) {
        res.status(400).json({ error: "shareId required" });
        return;
      }

      const docRef = db.doc(`ss_share_coupons/${shareId}`);
      const snap = await docRef.get();
      if (!snap.exists) {
        res.json({ status: "not_found" });
        return;
      }

      const data = snap.data();
      const fingerprint = generateFingerprint(req);

      const updates = {
        visitorCount: admin.firestore.FieldValue.increment(1),
        lastVisitAt: Date.now(),
      };

      if (data.couponStatus === "pending" && fingerprint !== data.ownerFingerprint) {
        updates.couponStatus = "activated";
        updates.couponActivatedAt = Date.now();
      }

      await docRef.update(updates);
      res.json({ status: "ok" });
    } else if (action === "status" && req.method === "GET") {
      const shareId = req.query.shareId;
      if (!shareId) {
        res.status(400).json({ error: "shareId required" });
        return;
      }

      const snap = await db.doc(`ss_share_coupons/${shareId}`).get();
      if (!snap.exists) {
        res.json({ couponStatus: "not_found" });
        return;
      }

      const data = snap.data();
      res.json({
        couponStatus: data.couponStatus,
        couponActivatedAt: data.couponActivatedAt || null,
      });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (err) {
    console.error("[portfolioShareCoupon]", err);
    res.status(500).json({ error: "Internal error" });
  }
});
