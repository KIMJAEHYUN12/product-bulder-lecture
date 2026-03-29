const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
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
      const type = (req.query.type || "").toLowerCase();

      // type=night → 항상 Firestore 야간선물 데이터 반환 (06:00 종가 그대로 유지)
      if (type === "night") {
        const nightDoc = await db.doc("config/kospi_night_futures").get();
        if (nightDoc.exists && nightDoc.data()) {
          res.set("Cache-Control", "public, max-age=10, s-maxage=10");
          res.json(nightDoc.data());
          return;
        }
        res.status(404).json({ error: "야간선물 데이터 없음" });
        return;
      }

      // type=day → 항상 KIS API 정규장 데이터 (아래 로직으로 진행)

      // 기본(type 미지정): 시간대별 자동 전환 (하위 호환)
      if (!type) {
        const kstHour = (new Date().getUTCHours() + 9) % 24;
        const isNight = kstHour >= 18 || kstHour < 6;

        if (isNight) {
          const nightDoc = await db.doc("config/kospi_night_futures").get();
          if (nightDoc.exists) {
            const nightData = nightDoc.data();
            if (nightData && nightData.updatedAt && Date.now() - nightData.updatedAt < 10 * 60 * 1000) {
              res.set("Cache-Control", "public, max-age=10, s-maxage=10");
              res.json(nightData);
              return;
            }
          }
        }
      }

      // 1. Firestore 캐시 확인 (정규장)
      const cacheDoc = await db.doc("config/kospi_futures_cache").get();
      const cached = cacheDoc.exists ? cacheDoc.data() : null;
      if (cached && cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < FUTURES_CACHE_TTL) {
        res.set("Cache-Control", "public, max-age=300, s-maxage=300");
        res.json(cached.data);
        return;
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

      const now = new Date();
      const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
      const yyyymmdd = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, "0")}${String(kst.getDate()).padStart(2, "0")}`;
      const hh = String(kst.getHours()).padStart(2, "0");
      const mm = String(kst.getMinutes()).padStart(2, "0");
      const ss = String(kst.getSeconds()).padStart(2, "0");

      const price = parseFloat(o.futs_prpr) || 0;
      const newBar = {
        date: `${yyyymmdd} ${hh}:${mm}:${ss}`,
        open: price, high: price, low: price, close: price,
        volume: parseInt(o.acml_vol, 10) || 0,
      };

      // 기존 bars 누적 (당일분만 유지)
      let bars = [];
      if (cached && cached.bars && Array.isArray(cached.bars)) {
        bars = cached.bars.filter(b => b.date && b.date.startsWith(yyyymmdd));
      }
      bars.push(newBar);

      const result = {
        name: o.hts_kor_isnm || "코스피200선물",
        code,
        price,
        change: isDown ? -Math.abs(change) : change,
        changePct: isDown ? -Math.abs(changePct) : changePct,
        open: parseFloat(o.futs_oprc) || 0,
        high: parseFloat(o.futs_hgpr) || 0,
        low: parseFloat(o.futs_lwpr) || 0,
        prevClose: parseFloat(o.futs_prdy_clpr) || 0,
        volume: parseInt(o.acml_vol, 10) || 0,
        basis: parseFloat(o.basis) || 0,
        bars,
      };

      // 3. 캐시 저장 (bars도 함께)
      try {
        await db.doc("config/kospi_futures_cache").set({ data: result, bars, fetchedAt: Date.now() });
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
  { cors: true },
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

/** 내부 호출용: 차트 데이터 조회 (Naver 우선 → Yahoo 폴백) */
async function fetchStockChartInternal(symbol, range = "6mo", interval = "1d") {
  const VALID_RANGES = ["1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"];
  const VALID_INTERVALS = ["1d", "1wk", "1mo"];
  const safeRange = VALID_RANGES.includes(range) ? range : "6mo";
  const safeInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";

  const isKorean = symbol.endsWith(".KS") || symbol.endsWith(".KQ");
  if (isKorean) {
    try {
      const naverResult = await fetchNaverStockChart(symbol, safeRange, safeInterval);
      if (naverResult && naverResult.candles.length > 0) {
        return naverResult;
      }
    } catch (e) {
      console.warn(`[stock-chart-internal] Naver failed for ${symbol}:`, e.message);
    }
  }

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
      return {
        symbol: meta?.symbol || symbol,
        name: meta?.shortName || meta?.longName || symbol,
        currency: meta?.currency || "KRW",
        candles,
      };
    } catch { /* try next */ }
  }

  return null;
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

  const result = await fetchStockChartInternal(symbol, range, interval);
  if (!result) {
    res.status(502).json({ error: "차트 데이터 조회 실패" });
    return;
  }

  res.set("Cache-Control", "public, max-age=300, s-maxage=300");
  res.json(result);
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

// ── 한국 주식 한글→영문 매핑 (KRX 전체 KOSPI+KOSDAQ+우선주 ~2,745종목) ────
const krStocksRaw = require("./data/krStocks.json");
const sectorOverrides = require("./data/sectorOverrides.json");
const KR_STOCK_MAP = krStocksRaw
  .filter((r) => /^\d+\./.test(r.s))  // 코드에 영문자 섞인 임시코드 ETF 제외 (006800.KS 같은 정상 종목 유지)
  .map((r) => ({
    symbol: r.s,
    name: r.n,
    exchange: r.m === "P" ? "코스피" : r.m === "E" ? "코스피" : "코스닥",
  }));

// 해외 주요 종목 한글→영문 별칭
const GLOBAL_ALIAS = {
  "엔비디아": "NVDA", "앤비디아": "NVDA", "애플": "AAPL", "테슬라": "TSLA",
  "마이크로소프트": "MSFT", "구글": "GOOGL", "알파벳": "GOOGL",
  "아마존": "AMZN", "메타": "META", "넷플릭스": "NFLX",
  "인텔": "INTC", "퀄컴": "QCOM",
  "브로드컴": "AVGO", "어도비": "ADBE", "세일즈포스": "CRM",
  "팔란티어": "PLTR", "스노우플레이크": "SNOW", "코인베이스": "COIN",
  "리비안": "RIVN", "루시드": "LCID", "니오": "NIO",
  "샤오미": "1810.HK", "알리바바": "BABA", "바이두": "BIDU",
  "텐센트": "TCEHY", "핀둬둬": "PDD", "비야디": "BYDDY",
  "소파이": "SOFI", "로블록스": "RBLX", "유니티": "U",
  "크라우드스트라이크": "CRWD", "데이터독": "DDOG",
  "마이크론": "MU", "램리서치": "LRCX", "ASML": "ASML",
  "버크셔": "BRK-B", "워렌버핏": "BRK-B", "엑손모빌": "XOM",
  "JP모건": "JPM", "비자": "V", "마스터카드": "MA",
  "존슨앤존슨": "JNJ", "화이자": "PFE", "일라이릴리": "LLY",
  "코스트코": "COST", "월마트": "WMT", "스타벅스": "SBUX",
  "디즈니": "DIS", "나이키": "NKE", "맥도날드": "MCD",
  "보잉": "BA", "록히드마틴": "LMT", "레이시온": "RTX",
  "슈퍼마이크로": "SMCI", "아크": "ARKK", "ARM": "ARM", "암홀딩스": "ARM",
};

function applyGlobalAlias(q) {
  for (const [kr, en] of Object.entries(GLOBAL_ALIAS)) {
    if (q.includes(kr)) return q.replace(kr, en);
  }
  return null;
}

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
  if (q === "__version__") {
    res.json({ v: "2025-03-20", count: KR_STOCK_MAP.length });
    return;
  }
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

  // 2. 한글 별칭 → 영문 치환 (GLOBAL_ALIAS 매칭 시 Yahoo도 병행 검색)
  const aliased = applyGlobalAlias(q);

  // 로컬 결과만으로 충분하고 별칭 매칭이 없으면 바로 반환
  if (localResults.length > 0 && !aliased) {
    res.set("Cache-Control", "public, max-age=600, s-maxage=600");
    res.json(localResults);
    return;
  }

  const searchQuery = aliased || q;

  // 3. Yahoo Finance 검색 (해외 종목 등)
  const urls = [
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=20&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
  ];

  let yahooResults = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) {
        console.warn(`[stockSearch] Yahoo HTTP ${r.status} for q=${searchQuery}`);
        continue;
      }
      const json = await r.json();
      const quotes = json?.quotes || [];
      console.log(`[stockSearch] Yahoo q=${searchQuery} → ${quotes.length} quotes`);

      yahooResults = quotes
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
      break;
    } catch (err) {
      console.warn(`[stockSearch] Yahoo error for q=${searchQuery}:`, err.message);
    }
  }

  // 로컬 + Yahoo 병합 (별칭 매칭된 경우: Yahoo 결과를 앞에 배치)
  if (aliased && localResults.length > 0) {
    const seen = new Set(yahooResults.map((r) => r.symbol));
    for (const r of localResults) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        yahooResults.push(r);
      }
    }
  } else if (localResults.length > 0) {
    // 별칭 없이 로컬만 있는 경우 (위에서 이미 반환했으므로 여기 도달 안 함)
    yahooResults = localResults;
  }

  const finalResults = yahooResults.slice(0, 20);
  if (finalResults.length > 0) {
    res.set("Cache-Control", "public, max-age=600, s-maxage=600");
  } else {
    res.set("Cache-Control", "no-store");
  }

  if (finalResults.length === 0) {
    res.status(502).json({ error: "종목 검색 실패" });
    return;
  }
  res.json(finalResults);
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

/** 내부 호출용: 투자자 동향 조회 (Naver 크롤링) */
async function fetchInvestorTrendInternal(symbol, days = 180) {
  const requestedDays = Math.max(30, Math.min(parseInt(days, 10) || 180, 730));
  const TOTAL_PAGES = Math.min(Math.ceil(requestedDays / 20), 25);
  const code = symbol.replace(/\.\w+$/, "");
  const cacheKey = `inv9s_${code}_${TOTAL_PAGES}p`;

  // 1. Firestore 캐시 확인
  try {
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < INVESTOR_CACHE_TTL) {
        return cached.data;
      }
    }
  } catch {}

  // 2. Naver Finance 크롤링
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

  if (allRows.length === 0) return null;

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
  } catch {}

  return result;
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

    try {
      const result = await fetchInvestorTrendInternal(symbol, days);
      if (!result) {
        res.status(502).json({ error: "투자자 데이터 없음", symbol });
        return;
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
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const today = kstNow.toISOString().slice(0, 10).replace(/-/g, "");
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
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const today = kstNow.toISOString().slice(0, 10).replace(/-/g, "");
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
        const yesterday = new Date(Date.now() + 9 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10).replace(/-/g, "");
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

function detectGoldenCrosses(candles, lookback = 5) {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const results = [];

  const pairs = [
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
        const crosses = detectGoldenCrosses(candles);
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

  // 4. 중복 제거: 같은 종목은 우선순위 높은 교차만 유지 (20_60 > 5_20 > 5_10 > 3_5)
  const crossPriority = { "20_60": 4, "5_20": 3, "5_10": 2, "3_5": 1 };
  const deduped = new Map();
  for (const s of signalResults) {
    const existing = deduped.get(s.symbol);
    if (!existing || (crossPriority[s.crossType] || 0) > (crossPriority[existing.crossType] || 0)) {
      deduped.set(s.symbol, s);
    }
  }
  const uniqueResults = Array.from(deduped.values());

  uniqueResults.sort((a, b) => {
    // 1차: 교차일 최신순, 2차: 외국인+기관 순매수 큰 순
    const dateCmp = b.crossDate.localeCompare(a.crossDate);
    if (dateCmp !== 0) return dateCmp;
    return (b.foreignNet + b.institutionNet) - (a.foreignNet + a.institutionNet);
  });

  const response = {
    scannedAt: new Date().toISOString(),
    totalScanned: pool.length,
    results: uniqueResults,
  };

  // 5. 골든크로스 이력 저장 (ss_golden_history)
  try {
    const histBatch = db.batch();
    let histCount = 0;
    const kospiCandles = await fetchNaverFchart("KOSPI", 30);
    const kospiMap = {};
    if (kospiCandles) {
      for (const c of kospiCandles) kospiMap[c.date] = c.close;
    }
    for (const sig of uniqueResults) {
      const docId = `${sig.crossDate}_${sig.symbol}`;
      const ref = db.collection("ss_golden_history").doc(docId);
      const gc = gcStocks.find((g) => g.symbol === sig.symbol);
      const crossCandle = gc?.candles?.find((c) => c.date === sig.crossDate);
      const priceAtCross = crossCandle?.close || sig.price;
      const kospiAtCross = kospiMap[sig.crossDate] || null;
      histBatch.set(ref, {
        symbol: sig.symbol,
        name: sig.name,
        crossType: sig.crossType,
        crossDate: sig.crossDate,
        priceAtCross,
        kospiAtCross,
        foreignNet: sig.foreignNet,
        institutionNet: sig.institutionNet,
        scannedAt: new Date().toISOString(),
      }, { merge: true });
      histCount++;
    }
    if (histCount > 0) await histBatch.commit();
    console.log(`[signal-scan] 이력 저장: ${histCount}건`);
  } catch (e) {
    console.warn("[signal-scan] 이력 저장 실패:", e.message);
  }

  // 6. 캐시 저장
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
    // B/S 스캔도 실행 후 함께 푸시 발송
    let bsResult = null;
    try {
      bsResult = await performBSSignalScan();
      console.log(`[signal-scan-scheduler] B/S 스캔 완료: ${bsResult.results.length}건`);
    } catch (e) {
      console.warn("[signal-scan-scheduler] B/S 스캔 실패:", e.message);
    }
    try {
      await sendSignalPushNotifications(result.results, bsResult?.results);
    } catch (e) {
      console.warn("[signal-scan-scheduler] 푸시 발송 실패:", e.message);
    }
  }
);

// ── B/S (Buy/Sell) 신호 스캐너 ──────────────────────────────

function computeRSI14(closes) {
  const period = 14;
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function computeMACD(closes) {
  // EMA 12, 26, signal 9
  if (closes.length < 35) return null;
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
  const signalLine = ema(macdLine, 9);
  const n = closes.length;
  return {
    macd: macdLine[n - 1],
    signal: signalLine[n - 1],
    prevMacd: macdLine[n - 2],
    prevSignal: signalLine[n - 2],
  };
}

function computeBollingerBands(closes) {
  const period = 20;
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: mean + 2 * std,
    lower: mean - 2 * std,
    middle: mean,
    lastClose: closes[closes.length - 1],
  };
}

function computeStochastic(candles) {
  // %K(14), %D(3), slow %D(3)
  const kPeriod = 14, dPeriod = 3;
  if (candles.length < kPeriod + dPeriod) return null;
  const kValues = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map((c) => c.high));
    const low = Math.min(...slice.map((c) => c.low));
    const k = high === low ? 50 : ((candles[i].close - low) / (high - low)) * 100;
    kValues.push(k);
  }
  // slow %K = SMA of fast %K (period 3)
  const slowK = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const avg = (kValues[i] + kValues[i - 1] + kValues[i - 2]) / 3;
    slowK.push(avg);
  }
  // %D = SMA of slow %K (period 3)
  const dValues = [];
  for (let i = dPeriod - 1; i < slowK.length; i++) {
    const avg = (slowK[i] + slowK[i - 1] + slowK[i - 2]) / 3;
    dValues.push(avg);
  }
  if (slowK.length < 2 || dValues.length < 2) return null;
  return {
    k: slowK[slowK.length - 1],
    d: dValues[dValues.length - 1],
    prevK: slowK[slowK.length - 2],
    prevD: dValues[dValues.length - 2],
  };
}

function detectBSSignals(candles) {
  if (!candles || candles.length < 60) return null;
  const closes = candles.map((c) => c.close);

  const rsi = computeRSI14(closes);
  const macd = computeMACD(closes);
  const bb = computeBollingerBands(closes);
  const stoch = computeStochastic(candles);

  if (rsi === null || !macd || !bb || !stoch) return null;

  const buySignals = [];
  const sellSignals = [];

  // Buy conditions
  if (rsi <= 30) buySignals.push("RSI");
  if (macd.prevMacd < macd.prevSignal && macd.macd >= macd.signal) buySignals.push("MACD");
  if (bb.lastClose <= bb.lower) buySignals.push("BB");
  if (stoch.k > stoch.d && stoch.k <= 20) buySignals.push("Stoch");

  // Sell conditions
  if (rsi >= 70) sellSignals.push("RSI");
  if (macd.prevMacd > macd.prevSignal && macd.macd <= macd.signal) sellSignals.push("MACD");
  if (bb.lastClose >= bb.upper) sellSignals.push("BB");
  if (stoch.k < stoch.d && stoch.k >= 80) sellSignals.push("Stoch");

  if (buySignals.length >= 2) {
    return {
      signalType: "buy",
      strength: buySignals.length,
      indicators: buySignals,
      rsi: Math.round(rsi * 10) / 10,
      macdCross: buySignals.includes("MACD"),
      bbPosition: bb.lastClose <= bb.lower ? "lower" : "middle",
      stochK: Math.round(stoch.k * 10) / 10,
    };
  }
  if (sellSignals.length >= 2) {
    return {
      signalType: "sell",
      strength: sellSignals.length,
      indicators: sellSignals,
      rsi: Math.round(rsi * 10) / 10,
      macdCross: sellSignals.includes("MACD"),
      bbPosition: bb.lastClose >= bb.upper ? "upper" : "middle",
      stochK: Math.round(stoch.k * 10) / 10,
    };
  }
  return null;
}

async function performBSSignalScan() {
  // 1. 종목 풀 구성
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
  console.log(`[bs-signal] 스캔 시작: ${pool.length}종목`);

  // 2. 차트 데이터 → B/S 신호 감지 (25개씩 병렬)
  const BATCH = 25;
  const results = [];

  for (let i = 0; i < pool.length; i += BATCH) {
    const batch = pool.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const candles = await fetchYahoo3mo(sym.symbol);
        if (!candles || candles.length < 60) return null;

        const signal = detectBSSignals(candles);
        if (!signal) return null;

        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles.length >= 2 ? candles[candles.length - 2] : lastCandle;
        const changePct = prevCandle.close > 0
          ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
          : 0;

        return {
          symbol: sym.symbol,
          name: sym.name,
          price: lastCandle.close,
          changePct: Math.round(changePct * 100) / 100,
          ...signal,
        };
      })
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }

  // 3. 정렬: 강도 높은 순 → 매수 먼저
  results.sort((a, b) => {
    if (a.signalType !== b.signalType) return a.signalType === "buy" ? -1 : 1;
    return b.strength - a.strength;
  });

  console.log(`[bs-signal] 완료: ${results.length}건 (buy: ${results.filter((r) => r.signalType === "buy").length}, sell: ${results.filter((r) => r.signalType === "sell").length})`);

  const response = {
    scannedAt: new Date().toISOString(),
    totalScanned: pool.length,
    results,
  };

  // 4. 캐시 저장
  try {
    await db.doc("cache/bs_signal_scan").set({ data: response, fetchedAt: Date.now() });
  } catch (e) {
    console.warn("bs-signal 캐시 저장 실패:", e.message);
  }

  return response;
}

exports.bsSignalScan = onRequest(
  { cors: true, timeoutSeconds: 540, region: "us-central1", memory: "1GiB" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 캐시 확인 (6시간 TTL)
      const cacheDoc = await db.doc("cache/bs_signal_scan").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      const response = await performBSSignalScan();
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(response);
    } catch (err) {
      console.error("bsSignalScan 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── B/S 신호 스케줄러: 평일 17:00 KST (08:00 UTC) ──
exports.bsSignalScheduler = onSchedule(
  {
    schedule: "0 8 * * 1-5",
    timeZone: "UTC",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    retryCount: 0,
  },
  async () => {
    console.log("[bs-signal-scheduler] 스케줄 스캔 시작");
    const result = await performBSSignalScan();
    console.log(`[bs-signal-scheduler] 완료: ${result.results.length}건`);
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
        const data = snap.exists ? snap.data() : {};
        res.json({ items: data.items || [], folders: data.folders || [] });
        return;
      }

      if (action === "add") {
        if (!symbol || !name) {
          res.status(400).json({ error: "symbol and name required" });
          return;
        }
        try {
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            const items = snap.exists ? (snap.data().items || []) : [];
            if (items.some((it) => it.symbol === symbol)) return;
            if (items.length >= 50) throw new Error("MAX_REACHED");
            items.push({ symbol, name, addedAt: new Date().toISOString() });
            tx.set(docRef, { items, updatedAt: Date.now() }, { merge: true });
          });
        } catch (txErr) {
          if (txErr.message === "MAX_REACHED") {
            const snap = await docRef.get();
            res.status(400).json({ error: "MAX_REACHED", limit: 50, items: snap.exists ? snap.data().items : [] });
            return;
          }
          throw txErr;
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

      // 순서 변경: items 배열을 새 순서로 교체
      if (action === "reorder") {
        const { symbols } = req.body; // string[] — 새 순서의 symbol 배열
        if (!Array.isArray(symbols)) {
          res.status(400).json({ error: "symbols array required" });
          return;
        }
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          const items = snap.data().items || [];
          const itemMap = Object.fromEntries(items.map((it) => [it.symbol, it]));
          const reordered = symbols.filter((s) => itemMap[s]).map((s) => itemMap[s]);
          // symbols에 없는 항목은 뒤에 추가 (안전장치)
          for (const it of items) {
            if (!symbols.includes(it.symbol)) reordered.push(it);
          }
          tx.set(docRef, { items: reordered, updatedAt: Date.now() }, { merge: true });
        });
        const after = await docRef.get();
        res.json({ items: after.exists ? (after.data().items || []) : [] });
        return;
      }

      // 폴더 관리
      if (action === "manage-folders") {
        const { folders } = req.body; // { id, name, order }[]
        if (!Array.isArray(folders)) {
          res.status(400).json({ error: "folders array required" });
          return;
        }
        await docRef.set({ folders, updatedAt: Date.now() }, { merge: true });
        const after = await docRef.get();
        res.json({ items: after.data().items || [], folders: after.data().folders || [] });
        return;
      }

      // 종목에 폴더 할당
      if (action === "set-folder") {
        const folderId = req.body.folderId || null;
        if (!symbol) { res.status(400).json({ error: "symbol required" }); return; }
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          const items = snap.data().items || [];
          const idx = items.findIndex((it) => it.symbol === symbol);
          if (idx === -1) return;
          if (folderId) {
            items[idx].folderId = folderId;
          } else {
            delete items[idx].folderId;
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
        // 기존 userId 목록에 deviceId 목록 병합 (중복 제거, 최대 50개)
        const merged = [...userItems];
        for (const di of deviceItems) {
          if (!merged.some((u) => u.symbol === di.symbol) && merged.length < 50) {
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
    let revenue = null;
    let revenuePrev = null;
    let opIncome = null;
    let opIncomePrev = null;
    const parseAmt = (s) => { const v = parseInt((s || "").replace(/,/g, ""), 10); return isNaN(v) ? null : v; };
    for (const item of targetList) {
      const nm = item.account_nm || "";
      if (!netIncome && (nm.includes("당기순이익") || nm.includes("당기순손실")) && !nm.includes("주당")) {
        netIncome = parseAmt(item.thstrm_amount);
      }
      if (!equity && (nm === "자본총계" || nm === "기말자본" || nm === "자본합계")) {
        equity = parseAmt(item.thstrm_amount);
      }
      if (revenue == null && (nm === "매출액" || nm === "영업수익" || nm === "이자수익" || nm === "수익(매출액)")) {
        revenue = parseAmt(item.thstrm_amount);
        revenuePrev = parseAmt(item.frmtrm_amount);
      }
      if (opIncome == null && (nm.includes("영업이익") || nm === "영업손실")) {
        opIncome = parseAmt(item.thstrm_amount);
        opIncomePrev = parseAmt(item.frmtrm_amount);
      }
    }
    if (netIncome == null && equity == null) return null;
    return { netIncome, equity, revenue, revenuePrev, opIncome, opIncomePrev };
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

      // earningsTrend 0y = 현재 회계연도 컨센서스 EPS (밴드차트 Y→Y+1 패턴과 일치)
      const trends = result.earningsTrend?.trend || [];
      const currentYearTrend = trends.find((t) => t.period === "0y");
      const forwardEpsEstimate = currentYearTrend?.earningsEstimate?.avg?.raw ?? null;
      const forwardEpsYear = currentYearTrend?.endDate ? new Date(currentYearTrend.endDate).getFullYear() : null;

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
        forwardEpsYear,
      };
    } catch { /* try next */ }
  }
  return { forwardPe: null, trailingPe: null, sharesOutstanding: null, yearlyEarnings: [], sector: null, industry: null, forwardEpsEstimate: null, forwardEpsYear: null };
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

    // 배당 파싱
    const divYieldStr = getValue("배당수익률");
    const dividendYield = divYieldStr ? parseFloat(divYieldStr.replace(/[,%]/g, "")) : null;

    const divPerShareStr = getValue("주당배당금");
    const dividendPerShare = divPerShareStr ? parseInt(divPerShareStr.replace(/[,원]/g, ""), 10) : null;

    return { sharesOutstanding, eps, per, forwardPer, forwardEps, marketCap, dividendYield, dividendPerShare };
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
    bandReliability: epsData.length / allEpsData.length < 0.5 ? "low" : "high",
  };
}

/** Forward PER 밴드 계산 (12개월 선행 EPS 매칭) */
function calculateForwardPerBand(prices, epsHistory, sharesOutstanding, forwardEps) {
  if (!prices.length || !epsHistory.length || !sharesOutstanding) return null;

  const allEpsData = epsHistory
    .filter((e) => e.netIncome != null)
    .map((e) => ({
      year: e.year,
      eps: Math.round((e.netIncome / sharesOutstanding) * 100) / 100,
    }));
  const epsData = allEpsData.filter((e) => e.eps > 0).sort((a, b) => a.year - b.year);

  if (epsData.length < 2) return null;

  const currentYear = new Date().getFullYear();
  const bandChart = [];
  const allPers = [];
  for (const p of prices) {
    const priceYear = parseInt(p.date.slice(0, 4));
    let fwdEps = null;
    // 12개월 후 EPS 매칭 (priceYear+1 연도의 실현 EPS)
    for (let i = 0; i < epsData.length; i++) {
      if (epsData[i].year === priceYear + 1) {
        fwdEps = epsData[i].eps;
        break;
      }
    }
    // 미래 EPS 없는 최근 구간 → Naver 추정EPS 사용
    if (!fwdEps && forwardEps && forwardEps > 0 && priceYear >= currentYear - 1) {
      fwdEps = forwardEps;
    }
    if (!fwdEps || fwdEps <= 0) continue;
    const close = p.close;
    const per = Math.round((close / fwdEps) * 100) / 100;
    if (per > 0 && per < 200) {
      allPers.push(per);
      bandChart.push({ date: p.date, close, eps: fwdEps, per });
    }
  }

  if (allPers.length < 10) return null;

  allPers.sort((a, b) => a - b);
  const percentile = (arr, pc) => {
    const idx = (pc / 100) * (arr.length - 1);
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

  for (const point of bandChart) {
    point.bandMin = Math.round(point.eps * perBands.min);
    point.band25 = Math.round(point.eps * perBands.p25);
    point.bandMed = Math.round(point.eps * perBands.median);
    point.band75 = Math.round(point.eps * perBands.p75);
    point.bandMax = Math.round(point.eps * perBands.max);
  }

  const latestPer = bandChart[bandChart.length - 1]?.per || 0;
  const perPosition = Math.round(
    (allPers.filter((p) => p <= latestPer).length / allPers.length) * 100
  );
  const avgPer = Math.round((allPers.reduce((s, v) => s + v, 0) / allPers.length) * 100) / 100;

  return {
    forwardPerBands: perBands,
    forwardBandChart: bandChart,
    currentForwardPer: latestPer,
    avgForwardPer: avgPer,
    forwardPerPosition: perPosition,
    bandReliability: epsData.length / allEpsData.length < 0.5 ? "low" : "high",
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
    bandReliability: bpsData.length / equityHistory.filter((e) => e.equity != null).length < 0.5 ? "low" : "high",
  };
}

/** 내부 호출용: PER 밴드 데이터 조회 */
async function fetchPerBandInternal(rawSymbol, dartKey, { forceRefresh = false } = {}) {
  let symbol = rawSymbol;
  const stockCode = rawSymbol.replace(/\.\w+$/, "");
  const isKorean = rawSymbol.endsWith(".KS") || rawSymbol.endsWith(".KQ") || /^\d{6}$/.test(rawSymbol);
  if (isKorean && !rawSymbol.includes(".")) {
    const mapped = KR_STOCK_MAP.find((s) => s.symbol === `${rawSymbol}.KS` || s.symbol === `${rawSymbol}.KQ`);
    symbol = mapped ? mapped.symbol : `${rawSymbol}.KS`;
  }

  // 1. Firestore 캐시 확인
  const cacheKey = `per_band_v3_${stockCode}`;
  if (!forceRefresh) {
    try {
      const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && Date.now() - cached.fetchedAt < PER_BAND_CACHE_TTL) {
          return cached.data;
        }
      }
    } catch {}
  }

  // 2. 가격 히스토리 + Yahoo 보조 데이터
  const [priceResult, yahooData] = await Promise.all([
    fetchYahooPriceHistory(symbol, "10y"),
    fetchYahooSummary(symbol),
  ]);
  if (!priceResult || priceResult.prices.length < 50) return null;

  // 3. EPS 히스토리
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 - i);
  let epsHistory = [];
  let equityHistory = [];
  let sharesOutstanding = yahooData.sharesOutstanding;
  let forwardPe = yahooData.forwardPe;
  let latestEarnings = null;

  if (isKorean) {
    const corpCode = getDartCorpCode(stockCode);
    if (!corpCode) return null;

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
        if (!latestEarnings && (result.value.revenue != null || result.value.opIncome != null)) {
          const yoy = (cur, prev) => (cur != null && prev != null && prev !== 0) ? Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10 : null;
          latestEarnings = {
            period: `${years[i]}년`,
            revenue: result.value.revenue,
            revenueYoY: yoy(result.value.revenue, result.value.revenuePrev),
            opIncome: result.value.opIncome,
            opIncomeYoY: yoy(result.value.opIncome, result.value.opIncomePrev),
          };
        }
      }
    }
  } else {
    if (yahooData.yearlyEarnings.length > 0 && sharesOutstanding) {
      for (const ye of yahooData.yearlyEarnings) {
        if (ye.earnings != null) {
          epsHistory.push({ year: ye.year, netIncome: ye.earnings });
        }
      }
    }
  }

  if (epsHistory.length < 2) return null;

  let forwardEps = null;
  let dividendYield = null;
  let dividendPerShare = null;
  if (isKorean) {
    const naverInfo = await fetchNaverStockInfo(stockCode);
    if (naverInfo) {
      if (!sharesOutstanding && naverInfo.sharesOutstanding) sharesOutstanding = naverInfo.sharesOutstanding;
      if (!forwardPe && naverInfo.forwardPer) forwardPe = naverInfo.forwardPer;
      if (naverInfo.forwardEps) forwardEps = naverInfo.forwardEps;
      if (naverInfo.dividendYield) dividendYield = naverInfo.dividendYield;
      if (naverInfo.dividendPerShare) dividendPerShare = naverInfo.dividendPerShare;
    }
  } else {
    // 해외 주식: earningsTrend 0y 컨센서스 EPS (밴드차트 Y→Y+1 패턴과 일치)
    if (yahooData.forwardEpsEstimate && yahooData.forwardEpsEstimate > 0) {
      forwardEps = yahooData.forwardEpsEstimate;
      console.log(`[per-band] Forward EPS (Yahoo 0y): ${forwardEps}`);
    }
  }

  if (!sharesOutstanding) return null;

  // 4. PER/Forward PER/PBR 밴드 계산
  const bandResult = calculatePerBand(priceResult.prices, epsHistory, sharesOutstanding);
  if (!bandResult) return null;

  let forwardResult = null;
  if (epsHistory.length >= 2) {
    forwardResult = calculateForwardPerBand(priceResult.prices, epsHistory, sharesOutstanding, forwardEps);
  }

  let pbrResult = null;
  if (isKorean && equityHistory.length >= 2) {
    pbrResult = calculatePbrBand(priceResult.prices, equityHistory, sharesOutstanding);
  }

  const response = {
    symbol: stockCode,
    name: priceResult.name,
    currency: priceResult.currency,
    currentPer: bandResult.currentPer,
    forwardPer: forwardPe,
    avgPer: bandResult.avgPer,
    perPosition: bandResult.perPosition,
    latestEps: bandResult.latestEps,
    epsHistory: bandResult.epsData,
    perBands: bandResult.perBands,
    bandChart: bandResult.bandChart,
    lossYears: bandResult.lossYears,
    bandReliability: bandResult.bandReliability,
    sector: yahooData.sector,
    industry: yahooData.industry,
    ...(forwardResult && {
      forwardPerBands: forwardResult.forwardPerBands,
      forwardBandChart: forwardResult.forwardBandChart,
      currentForwardPer: forwardResult.currentForwardPer,
      avgForwardPer: forwardResult.avgForwardPer,
      forwardPerPosition: forwardResult.forwardPerPosition,
      forwardEpsEstimate: forwardEps,
      forwardEpsYear: yahooData.forwardEpsYear || (isKorean && forwardEps ? currentYear : null),
      forwardBandReliability: forwardResult.bandReliability,
    }),
    ...(pbrResult && {
      currentPbr: pbrResult.currentPbr,
      avgPbr: pbrResult.avgPbr,
      pbrPosition: pbrResult.pbrPosition,
      latestBps: pbrResult.latestBps,
      pbrBands: pbrResult.pbrBands,
      pbrBandChart: pbrResult.pbrBandChart,
      pbrBandReliability: pbrResult.bandReliability,
    }),
    ...(latestEarnings && { latestEarnings }),
    ...(dividendYield && { dividendYield }),
    ...(dividendPerShare && { dividendPerShare }),
    dataSources: {
      price: "Yahoo Finance",
      earnings: isKorean ? "DART 전자공시" : "Yahoo Finance",
      currentPer: isKorean ? "DART+Yahoo 자체계산" : "Yahoo Finance",
      forwardEps: isKorean
        ? (forwardEps ? "네이버증권 (FnGuide)" : null)
        : (forwardEps ? "Yahoo Finance" : null),
    },
  };

  // 5. 캐시 저장
  try {
    await db.doc(`cache/${cacheKey}`).set({ data: response, fetchedAt: Date.now() });
  } catch {}

  return response;
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

      const forceRefresh = req.query.refresh === "true";
      const result = await fetchPerBandInternal(rawSymbol, dartApiKey.value(), { forceRefresh });
      if (!result) {
        res.status(404).json({ error: "PER 밴드 데이터를 가져올 수 없습니다" });
        return;
      }

      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.json(result);
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
    // 캐시 먼저 확인, 없거나 오래되면 인라인 스캔
    const scanDate = todayKST().replace(/-/g, "");
    const cacheKey = `signals_scanner_v4_${scanDate}`;
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    let signals = [];
    if (cacheDoc.exists && cacheDoc.data().data?.signals) {
      const age = Date.now() - (cacheDoc.data().fetchedAt || 0);
      if (age < 2 * 60 * 60 * 1000) {
        signals = cacheDoc.data().data.signals;
        console.log(`[bot_signal] 캐시 사용: ${signals.length}건 (${Math.round(age / 60000)}분 전)`);
      }
    }

    // 캐시 miss → 인라인 스캔 (SEED 종목만, 빠르게)
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
      if ((sig.net3d ?? 0) <= 0) continue;
      if ((sig.changeRate ?? 0) < -3) continue;

      const px = prices[sig.symbol]?.price ?? sig.close;
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
    const crossType = holding.crossType || "5_20";
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
  const gcCacheDoc = await db.doc("cache/signal_scan").get();
  let scanResults = [];
  if (gcCacheDoc.exists && gcCacheDoc.data().data?.results) {
    const age = Date.now() - (gcCacheDoc.data().fetchedAt || 0);
    if (age < 8 * 60 * 60 * 1000) {
      scanResults = gcCacheDoc.data().data.results;
      console.log(`[bot_gold] 캐시 사용: ${scanResults.length}건 (${Math.round(age / 60000)}분 전)`);
    }
  }

  // 캐시 miss → 인라인 골든크로스 스캔
  if (scanResults.length === 0) {
    console.log("[bot_gold] 캐시 없음 → 인라인 스캔 시작");
    const pool = SEED_SYMBOLS.slice(0, 30);
    const BATCH = 10;
    for (let i = 0; i < pool.length; i += BATCH) {
      const batch = pool.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const code = sym.symbol.replace(/\.\w+$/, "");
          const candles = await fetchNaverFchart(code, 200);
          if (!candles || candles.length < 21) return null;
          const crosses = detectGoldenCrosses(candles);
          if (crosses.length === 0) return null;
          const investorRows = await fetchNaverInvestor2pages(code);
          if (!investorRows || investorRows.length === 0) return null;
          const sigs = [];
          for (const cross of crosses) {
            const afterCross = investorRows.filter((r) => r.date >= cross.crossDate);
            if (afterCross.length === 0) continue;
            const foreignNet = afterCross.reduce((s, r) => s + r.foreign, 0);
            const institutionNet = afterCross.reduce((s, r) => s + r.institution, 0);
            if (foreignNet + institutionNet <= 0) continue;
            const lastCandle = candles[candles.length - 1];
            sigs.push({
              symbol: sym.symbol, name: sym.name, price: lastCandle.close,
              crossType: cross.crossType, crossDate: cross.crossDate,
              daysAfterCross: cross.daysAfterCross, foreignNet, institutionNet,
            });
          }
          return sigs;
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) scanResults.push(...r.value);
      }
    }
    console.log(`[bot_gold] 인라인 스캔 완료: ${scanResults.length}건`);
  }

  // 20_60 우선, 그 다음 5_20
  const sorted = [...scanResults].sort((a, b) => {
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
    if (portfolio.holdings[sig.symbol]) {
      portfolio.holdings[sig.symbol].crossType = sig.crossType;
    }
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

    if (returnPct <= -25) sellReason = `강제손절 ${returnPct.toFixed(1)}%`;
    else if (returnPct >= 40) sellReason = `강제익절 +${returnPct.toFixed(1)}%`;

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
      return `${h.name}(${sym}): ${h.qty}주, 평단 ${h.avgPrice}원, 현재 ${Math.round(px)}원, 수익률 ${ret}%`;
    }).join("\n");

    const totalAsset = calcTotal(portfolio);
    const returnPct = ((totalAsset - BOT_INITIAL_CASH) / BOT_INITIAL_CASH) * 100;

    const prompt = `너는 전형적인 한국 개인투자자(개미)야. 감정적으로 투자하고, FOMO에 약하고, 손실 확정을 극도로 싫어해.

[시장 상황]
- 공포탐욕지수: ${fearGreed ? `${fearGreed.value} (${fearGreed.label})` : "정보 없음"}
- 인기종목: ${popularStocks.map(s => s.name || s.symbol).join(", ") || "정보 없음"}

[내 포트폴리오]
- 현금: ${Math.round(portfolio.cash).toLocaleString()}원
- 총자산: ${Math.round(totalAsset).toLocaleString()}원 (수익률 ${returnPct.toFixed(1)}%)
- 보유종목:
${holdingsDesc || "(없음)"}

[매수 가능 종목과 현재가]
${Object.entries(prices).filter(([sym]) => !portfolio.holdings[sym] && !alreadyBought.has(sym)).slice(0, 15).map(([sym, p]) => `${p.name}(${sym}): ${Math.round(p.price)}원 (${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(1)}%)`).join("\n")}

[규칙]
- 최대 보유 6종목, 현금 10% 이상 유지
- 종목당 최대 30%
- 공포탐욕 20 이하면 패닉 매도 충동 발생 (보유종목 일부 투매)
- 공포탐욕 70 이상이면 FOMO로 적극 매수
- 수익 +5~10%면 성급하게 익절하고 싶어함
- 손실 종목은 왠만하면 안 팔려고 함 (물타기 선호)
- 오늘 급등한 종목에 끌림

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "thinking": "오늘 시장을 보니... (감정적인 독백 2~3줄)",
  "actions": [
    { "type": "buy|sell", "symbol": "005930.KS", "name": "삼성전자", "reason": "감정적 이유", "conviction": 1~10, "amountPct": 10~30 }
  ]
}
actions가 없으면 빈 배열 []. conviction은 확신도(1약~10강). amountPct는 총자산 대비 %. 매도 시 보유수량의 %로 해석.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.2, maxOutputTokens: 1024, responseMimeType: "application/json" },
    });

    const text = result.response.text();
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found in response");

    const parsed = JSON.parse(jsonMatch[0]);
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
        if (holdingSymbols.has(action.symbol)) continue;
        if (alreadyBought.has(action.symbol)) continue;
        if (Object.keys(portfolio.holdings).length >= 6) continue;

        const px = prices[action.symbol]?.price;
        if (!px || px <= 0) continue;

        const currentTotal = calcTotal(portfolio);
        const minCash = currentTotal * 0.1;
        const maxPct = Math.min((action.amountPct || 20) / 100, 0.3);
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
// ██ botTrader — 평일 10:30 / 15:30 KST 실행 (onSchedule)
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
  { cors: true, secrets: [geminiApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (req.body?.adminKey !== geminiApiKey.value()) {
      res.status(403).json({ error: "Forbidden" });
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
        description: "AI 감정 매매 — Gemini가 전형적인 개인투자자의 감정으로 매매합니다.",
        strategyDetail: "공포탐욕지수 + 뉴스 + 인기종목 기반. FOMO 매수, 성급 익절, 손절 거부, 공포 시 투매.",
        maxPositions: 6,
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

// ══════════════════════════════════════════════════════════════════
// ██ botForceTrade — 봇 포지션 강제 세팅 (1회용)
// ══════════════════════════════════════════════════════════════════

exports.botForceTrade = onRequest(
  { cors: true, timeoutSeconds: 120, memory: "512MiB", secrets: [geminiApiKey] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (req.body?.adminKey !== geminiApiKey.value()) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const today = todayKST();

    // 봇별 매수 종목 (전략 컨셉에 맞게 큐레이션)
    const botOrders = {
      bot_signal: {
        // 수급 크로스: 채널 하단 + 기관/외인 순매수
        buys: [
          { symbol: "015760.KS", name: "한국전력", reason: "채널하단(-35%) + 외인 3일 순매수", pctOfTotal: 0.18 },
          { symbol: "035720.KS", name: "카카오", reason: "채널하단(-28%) + 기관 매집", pctOfTotal: 0.18 },
          { symbol: "003670.KS", name: "포스코퓨처엠", reason: "채널하단(-22%) + 수급 반전", pctOfTotal: 0.15 },
        ],
      },
      bot_gold: {
        // 골든크로스: 이평선 교차 + 수급 필터
        buys: [
          { symbol: "000660.KS", name: "SK하이닉스", reason: "골든크로스(20/60) 2일전 + 외인 순매수", pctOfTotal: 0.22 },
          { symbol: "005380.KS", name: "현대차", reason: "골든크로스(5/20) + 기관 순매수", pctOfTotal: 0.15 },
        ],
      },
      bot_ant: {
        // 감정 매매: FOMO, 인기종목
        buys: [
          { symbol: "005930.KS", name: "삼성전자", reason: "국민주는 무조건 사야지...", pctOfTotal: 0.25 },
          { symbol: "035420.KS", name: "NAVER", reason: "AI 테마 올라타야 함 FOMO", pctOfTotal: 0.20 },
          { symbol: "259960.KS", name: "크래프톤", reason: "배그 신작 기대감 올인", pctOfTotal: 0.15 },
        ],
      },
    };

    // 모든 종목 시세 일괄 조회
    const allSymbols = new Set();
    for (const orders of Object.values(botOrders)) {
      for (const o of orders.buys) allSymbols.add(o.symbol);
    }
    const prices = await fetchPricesBatch([...allSymbols]);

    const results = {};

    for (const [botId, orders] of Object.entries(botOrders)) {
      let portfolio = { cash: BOT_INITIAL_CASH, holdings: {}, history: [], settledAt: null };
      const trades = [];

      for (const order of orders.buys) {
        const px = prices[order.symbol]?.price;
        if (!px || px <= 0) continue;

        const maxInvest = Math.floor(BOT_INITIAL_CASH * order.pctOfTotal);
        const qty = Math.floor(maxInvest / px);
        if (qty <= 0) continue;

        portfolio = executeBotOrder(portfolio, order.symbol, order.name, "buy", qty, px);
        const trade = {
          date: today, type: "buy", symbol: order.symbol, name: order.name,
          qty, price: Math.round(px), reason: order.reason,
          signal: botId === "bot_signal" ? "supply_cross" : botId === "bot_gold" ? "golden_cross" : "fomo",
        };
        trades.push(trade);
        await logBotTrade(botId, trade);
      }

      // 포트폴리오 저장
      await saveBotPortfolio(botId, portfolio);
      const snap = await saveBotSnapshot(botId, portfolio, prices);
      await updateBotRanking(botId, snap.totalAsset, snap.returnPct);

      results[botId] = {
        trades: trades.length,
        holdings: Object.keys(portfolio.holdings),
        cash: Math.round(portfolio.cash),
        totalAsset: Math.round(snap.totalAsset),
        returnPct: snap.returnPct,
      };
    }

    // bot_runs 기록
    await db.doc(`bot_runs/${today}`).set({
      startedAt: Date.now(),
      completedAt: Date.now(),
      results,
      forced: true,
    });

    res.json({ success: true, date: today, results });
  }
);

// ══════════════════════════════════════════════════════════════════
// ██ rankingRecalc — 매일 18:30 KST, 전 유저 랭킹 재계산
// ══════════════════════════════════════════════════════════════════

exports.rankingRecalc = onSchedule(
  {
    schedule: "30 18 * * 1-5",
    timeZone: "Asia/Seoul",
    timeoutSeconds: 300,
    memory: "512MiB",
    retryCount: 0,
  },
  async () => {
    const INITIAL_CASH = 10_000_000;
    const today = todayKST();
    console.log(`[rankingRecalc] 시작: ${today}`);

    if (!isMarketDay(today)) {
      console.log(`[rankingRecalc] 휴장일 스킵: ${today}`);
      return;
    }

    // 1. 전체 유저 포트폴리오 로드
    const portfolioSnap = await db.collection("portfolios").get();
    if (portfolioSnap.empty) {
      console.log("[rankingRecalc] 포트폴리오 없음");
      return;
    }

    // 2. 보유종목 심볼 수집
    const allSymbols = new Set();
    const userPortfolios = [];
    portfolioSnap.forEach((doc) => {
      const p = doc.data();
      const userId = doc.id;
      if (!p.holdings || Object.keys(p.holdings).length === 0) {
        userPortfolios.push({ userId, portfolio: p, symbols: [] });
        return;
      }
      const symbols = Object.keys(p.holdings);
      symbols.forEach((s) => allSymbols.add(s));
      userPortfolios.push({ userId, portfolio: p, symbols });
    });

    console.log(`[rankingRecalc] 유저 ${userPortfolios.length}명, 종목 ${allSymbols.size}개`);

    // 3. 시세 일괄 조회
    let prices = {};
    if (allSymbols.size > 0) {
      prices = await fetchPricesBatch([...allSymbols]);
      console.log(`[rankingRecalc] 시세 조회 완료: ${Object.keys(prices).length}종목`);
    }

    // 4. 유저별 랭킹 재계산 + 포트폴리오 currentPrice 갱신
    let updated = 0;
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const { userId, portfolio: p, symbols } of userPortfolios) {
      // 봇 유저 제외 (봇은 botTrader가 관리)
      if (userId.startsWith("bot_")) continue;

      // 보유종목 평가액 계산 + currentPrice 갱신
      let holdingsValue = 0;
      let holdingsUpdated = false;
      const updatedHoldings = { ...(p.holdings || {}) };

      for (const sym of symbols) {
        const h = updatedHoldings[sym];
        if (!h) continue;
        const px = prices[sym]?.price;
        if (px && px > 0) {
          holdingsValue += px * h.qty;
          if (Math.round(px) !== h.currentPrice) {
            updatedHoldings[sym] = { ...h, currentPrice: Math.round(px) };
            holdingsUpdated = true;
          }
        } else {
          holdingsValue += (h.currentPrice || h.avgPrice) * h.qty;
        }
      }

      const totalAsset = (p.cash ?? INITIAL_CASH) + holdingsValue;
      const returnPct = Math.round(((totalAsset - INITIAL_CASH) / INITIAL_CASH) * 10000) / 100;
      const pnlAmount = Math.round(totalAsset - INITIAL_CASH);

      // 랭킹 업데이트
      const rankRef = db.doc(`mock_rankings/${userId}`);
      const existingRank = await rankRef.get();
      const prev = existingRank.exists ? existingRank.data() : {};

      batch.set(rankRef, {
        ...prev,
        userId,
        totalAsset: Math.round(totalAsset),
        returnPct,
        pnlAmount,
        updatedAt: today,
      }, { merge: true });

      // 포트폴리오 currentPrice + settledAt 갱신
      if (holdingsUpdated) {
        batch.set(db.doc(`portfolios/${userId}`), {
          ...p,
          holdings: updatedHoldings,
          settledAt: today,
        });
      }

      updated++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`[rankingRecalc] 완료: ${updated}명 랭킹 업데이트`);
  }
);

// ██ rankingSettlement — 매일 18:10 KST, SimplyStock 전 유저 랭킹 재계산
// ══════════════════════════════════════════════════════════════════

exports.rankingSettlement = onSchedule(
  {
    schedule: "10 18 * * 1-5",
    timeZone: "Asia/Seoul",
    timeoutSeconds: 300,
    memory: "512MiB",
    retryCount: 0,
  },
  async () => {
    const INITIAL_CASH = 10_000_000;
    const today = todayKST();
    console.log(`[rankingSettlement] 시작: ${today}`);

    if (!isMarketDay(today)) {
      console.log(`[rankingSettlement] 휴장일 스킵: ${today}`);
      return;
    }

    // 1. 전체 유저 포트폴리오 로드
    const portfolioSnap = await db.collection("ss_portfolios").get();
    if (portfolioSnap.empty) {
      console.log("[rankingSettlement] 포트폴리오 없음");
      return;
    }

    // 2. 보유종목 심볼 수집 (봇 제외)
    const allSymbols = new Set();
    const userPortfolios = [];
    portfolioSnap.forEach((doc) => {
      const userId = doc.id;
      if (BOT_IDS.includes(userId)) return;
      const p = doc.data();
      if (!p.holdings || Object.keys(p.holdings).length === 0) {
        userPortfolios.push({ userId, portfolio: p, symbols: [] });
        return;
      }
      const symbols = Object.keys(p.holdings);
      symbols.forEach((s) => allSymbols.add(s));
      userPortfolios.push({ userId, portfolio: p, symbols });
    });

    console.log(`[rankingSettlement] 유저 ${userPortfolios.length}명, 종목 ${allSymbols.size}개`);

    // 3. 시세 일괄 조회
    let prices = {};
    if (allSymbols.size > 0) {
      prices = await fetchPricesBatch([...allSymbols]);
      console.log(`[rankingSettlement] 시세 조회 완료: ${Object.keys(prices).length}종목`);
    }

    // 4. 유저별 랭킹 재계산 + 포트폴리오 currentPrice 갱신
    let updated = 0;
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const { userId, portfolio: p, symbols } of userPortfolios) {
      let holdingsValue = 0;
      let holdingsUpdated = false;
      const updatedHoldings = { ...(p.holdings || {}) };

      for (const sym of symbols) {
        const h = updatedHoldings[sym];
        if (!h) continue;
        const px = prices[sym]?.price;
        if (px && px > 0) {
          holdingsValue += px * h.qty;
          if (Math.round(px) !== h.currentPrice) {
            updatedHoldings[sym] = { ...h, currentPrice: Math.round(px) };
            holdingsUpdated = true;
          }
        } else {
          holdingsValue += (h.currentPrice || h.avgPrice) * h.qty;
        }
      }

      const totalAsset = (p.cash ?? INITIAL_CASH) + holdingsValue;
      const returnPct = Math.round(((totalAsset - INITIAL_CASH) / INITIAL_CASH) * 10000) / 100;
      const pnlAmount = Math.round(totalAsset - INITIAL_CASH);

      // 랭킹 업데이트
      const rankRef = db.doc(`ss_mock_rankings/${userId}`);
      const existingRank = await rankRef.get();
      const prev = existingRank.exists ? existingRank.data() : {};

      batch.set(rankRef, {
        ...prev,
        userId,
        totalAsset: Math.round(totalAsset),
        returnPct,
        pnlAmount,
        updatedAt: today,
      }, { merge: true });

      // 포트폴리오 currentPrice + settledAt 갱신
      if (holdingsUpdated) {
        batch.set(db.doc(`ss_portfolios/${userId}`), {
          ...p,
          holdings: updatedHoldings,
          settledAt: today,
        });
      }

      updated++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`[rankingSettlement] 완료: ${updated}명 랭킹 업데이트`);
  }
);

// ── Golden History: 일일 성과 업데이트 ──────────────────────────
exports.goldenHistoryUpdate = onSchedule(
  {
    schedule: "30 18 * * 1-5",
    timeZone: "Asia/Seoul",
    timeoutSeconds: 300,
    memory: "512MiB",
    retryCount: 0,
  },
  async () => {
    const today = todayKST();
    if (!isMarketDay(today)) {
      console.log("[goldenHistoryUpdate] 휴장일 스킵");
      return;
    }

    // 미완료 이력 조회
    const snap = await db
      .collection("ss_golden_history")
      .where("completed", "!=", true)
      .get();

    if (snap.empty) {
      console.log("[goldenHistoryUpdate] 업데이트 대상 없음");
      return;
    }

    console.log(`[goldenHistoryUpdate] 대상: ${snap.size}건`);

    // 코스피 지수 캔들
    const kospiCandles = await fetchNaverFchart("KOSPI", 60);
    const kospiMap = {};
    if (kospiCandles) {
      for (const c of kospiCandles) kospiMap[c.date] = c.close;
    }

    // 거래일 목록 (코스피 캔들 날짜 기준)
    const tradingDays = kospiCandles ? kospiCandles.map((c) => c.date).sort() : [];

    function getTradingDayAfter(baseDate, n) {
      const idx = tradingDays.findIndex((d) => d > baseDate);
      if (idx < 0) return null;
      return idx + n - 1 < tradingDays.length ? tradingDays[idx + n - 1] : null;
    }

    const BATCH_SIZE = 10;
    const docs = snap.docs;
    let updated = 0;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batchDocs = docs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batchDocs.map(async (doc) => {
          const data = doc.data();
          const code = data.symbol.replace(/\.\w+$/, "");
          const candles = await fetchNaverFchart(code, 60);
          if (!candles || candles.length === 0) return null;

          const candleMap = {};
          for (const c of candles) candleMap[c.date] = c.close;

          const basePrice = data.priceAtCross;
          const baseKospi = data.kospiAtCross;
          if (!basePrice) return null;

          const targets = [
            { key: 1, field: "returnD1" },
            { key: 2, field: "returnD2" },
            { key: 3, field: "returnD3" },
            { key: 5, field: "returnD5" },
            { key: 10, field: "returnD10" },
          ];

          const update = {};
          let allFilled = true;

          for (const t of targets) {
            const dField = `priceD${t.key}`;
            const rField = t.field;
            const kField = `kospiReturnD${t.key}`;

            // 이미 계산된 필드는 스킵
            if (data[rField] !== undefined && data[rField] !== null) continue;

            const targetDate = getTradingDayAfter(data.crossDate, t.key);
            if (!targetDate) { allFilled = false; continue; }

            const price = candleMap[targetDate];
            if (price) {
              update[dField] = price;
              update[rField] = Math.round(((price - basePrice) / basePrice) * 10000) / 100;
              // 코스피 수익률
              if (baseKospi && kospiMap[targetDate]) {
                update[kField] = Math.round(((kospiMap[targetDate] - baseKospi) / baseKospi) * 10000) / 100;
              }
            } else {
              allFilled = false;
            }
          }

          if (allFilled && Object.keys(update).length > 0) {
            update.completed = true;
          }

          if (Object.keys(update).length > 0) {
            update.updatedAt = new Date().toISOString();
            return { ref: doc.ref, update };
          }
          return null;
        })
      );

      const batch = db.batch();
      let batchCount = 0;
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          batch.update(r.value.ref, r.value.update);
          batchCount++;
          updated++;
        }
      }
      if (batchCount > 0) await batch.commit();
    }

    console.log(`[goldenHistoryUpdate] 완료: ${updated}건 업데이트`);
  }
);

// ── Golden History API ──────────────────────────────────────
exports.goldenHistory = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 캐시 확인 (1시간 TTL)
      const cacheDoc = await db.doc("cache/golden_history").get();
      if (cacheDoc.exists) {
        const cached = cacheDoc.data();
        if (cached.data && cached.fetchedAt && Date.now() - cached.fetchedAt < 60 * 60 * 1000) {
          res.set("Cache-Control", "public, max-age=300, s-maxage=300");
          res.json(cached.data);
          return;
        }
      }

      const days = parseInt(req.query.days) || 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

      const snap = await db
        .collection("ss_golden_history")
        .where("crossDate", ">=", cutoffStr)
        .orderBy("crossDate", "desc")
        .limit(200)
        .get();

      const records = [];
      let total = 0;
      let d3Positive = 0;
      let sumD3 = 0;
      let sumD5 = 0;
      let sumKospiD3 = 0;
      let sumKospiD5 = 0;
      let countD3 = 0;
      let countD5 = 0;
      let countKD3 = 0;
      let countKD5 = 0;

      for (const doc of snap.docs) {
        const d = doc.data();
        const record = {
          symbol: d.symbol,
          name: d.name,
          crossType: d.crossType,
          crossDate: d.crossDate,
          priceAtCross: d.priceAtCross,
          priceD1: d.priceD1 ?? null,
          priceD3: d.priceD3 ?? null,
          priceD5: d.priceD5 ?? null,
          priceD10: d.priceD10 ?? null,
          returnD1: d.returnD1 ?? null,
          returnD3: d.returnD3 ?? null,
          returnD5: d.returnD5 ?? null,
          returnD10: d.returnD10 ?? null,
          kospiReturnD3: d.kospiReturnD3 ?? null,
          kospiReturnD5: d.kospiReturnD5 ?? null,
        };
        records.push(record);
        total++;

        if (d.returnD3 !== undefined && d.returnD3 !== null) {
          countD3++;
          sumD3 += d.returnD3;
          if (d.returnD3 > 0) d3Positive++;
        }
        if (d.returnD5 !== undefined && d.returnD5 !== null) {
          countD5++;
          sumD5 += d.returnD5;
        }
        if (d.kospiReturnD3 !== undefined && d.kospiReturnD3 !== null) {
          countKD3++;
          sumKospiD3 += d.kospiReturnD3;
        }
        if (d.kospiReturnD5 !== undefined && d.kospiReturnD5 !== null) {
          countKD5++;
          sumKospiD5 += d.kospiReturnD5;
        }
      }

      const avgD3 = countD3 > 0 ? Math.round((sumD3 / countD3) * 100) / 100 : 0;
      const avgD5 = countD5 > 0 ? Math.round((sumD5 / countD5) * 100) / 100 : 0;
      const avgKD3 = countKD3 > 0 ? Math.round((sumKospiD3 / countKD3) * 100) / 100 : 0;
      const avgKD5 = countKD5 > 0 ? Math.round((sumKospiD5 / countKD5) * 100) / 100 : 0;

      const response = {
        records,
        stats: {
          total,
          d3Positive,
          d3Rate: countD3 > 0 ? Math.round((d3Positive / countD3) * 100) : 0,
          avgReturnD3: avgD3,
          avgReturnD5: avgD5,
          avgKospiD3: avgKD3,
          avgKospiD5: avgKD5,
          alphaD3: Math.round((avgD3 - avgKD3) * 100) / 100,
          alphaD5: Math.round((avgD5 - avgKD5) * 100) / 100,
          sampleDays: days,
          dataStart: records.length > 0 ? records[records.length - 1].crossDate : "",
        },
        updatedAt: new Date().toISOString(),
      };

      // 캐시 저장
      try {
        await db.doc("cache/golden_history").set({ data: response, fetchedAt: Date.now() });
      } catch (e) {
        console.warn("[golden-history] 캐시 저장 실패:", e.message);
      }

      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(response);
    } catch (err) {
      console.error("[goldenHistory] 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Visitor Count (GA4 Data API) ──────────────────────────────
const GA4_PROPERTY_ID = "526577518";
const VISITOR_CACHE_TTL = 30 * 60 * 1000; // 30분

exports.visitorCount = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // Firestore 캐시 확인
      const cacheDoc = await db.doc("config/visitor_count_cache").get();
      const cached = cacheDoc.exists ? cacheDoc.data() : null;

      if (cached?.today !== undefined && cached.cachedAt && Date.now() - cached.cachedAt < VISITOR_CACHE_TTL) {
        res.set("Cache-Control", "public, max-age=300, s-maxage=300");
        res.json({ today: cached.today, total: cached.total, cachedAt: cached.cachedAt });
        return;
      }

      // GA4 API 호출
      let today, total;
      try {
        const analyticsClient = new BetaAnalyticsDataClient();
        const [todayReport, totalReport] = await Promise.all([
          analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: "today", endDate: "today" }],
            metrics: [{ name: "totalUsers" }],
          }),
          analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
            metrics: [{ name: "totalUsers" }],
          }),
        ]);

        today = parseInt(todayReport[0]?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
        total = parseInt(totalReport[0]?.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
      } catch (gaErr) {
        console.warn("[visitor-count] GA4 API 실패, 캐시 폴백:", gaErr.message);
        // GA4 실패 시 만료된 캐시라도 반환
        if (cached?.today !== undefined) {
          res.set("Cache-Control", "public, max-age=60, s-maxage=60");
          res.json({ today: cached.today, total: cached.total, cachedAt: cached.cachedAt, stale: true });
          return;
        }
        throw gaErr;
      }

      const cachedAt = Date.now();
      try {
        await db.doc("config/visitor_count_cache").set({ today, total, cachedAt });
      } catch (e) {
        console.warn("[visitor-count] 캐시 저장 실패:", e.message);
      }

      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json({ today, total, cachedAt });
    } catch (err) {
      console.error("[visitorCount] 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Push Token 저장 ──────────────────────────────────────────
exports.savePushToken = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      const { token, deviceId, platform } = req.body || {};
      if (!token) {
        res.status(400).json({ error: "token required" });
        return;
      }
      await db.collection("push_tokens").doc(token).set(
        {
          deviceId: deviceId || null,
          platform: platform || "web",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          active: true,
        },
        { merge: true }
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("[savePushToken] 오류:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── 푸시 알림 발송 헬퍼 ──────────────────────────────────────
async function sendSignalPushNotifications(goldenResults, bsResults) {
  const allNames = [];
  if (goldenResults?.length) {
    for (const r of goldenResults.slice(0, 5)) allNames.push(r.name);
  }
  if (bsResults?.length) {
    for (const r of bsResults.slice(0, 5)) {
      if (!allNames.includes(r.name)) allNames.push(r.name);
    }
  }
  const totalCount = (goldenResults?.length || 0) + (bsResults?.length || 0);
  if (totalCount === 0) {
    console.log("[push] 신호 0건 — 발송 안 함");
    return;
  }

  const topNames = allNames.slice(0, 3);
  const extra = totalCount - topNames.length;
  const bodyText =
    topNames.join(", ") +
    (extra > 0 ? ` 외 ${extra}종목` : "") +
    "에서 골든크로스·수급 신호가 확인됐습니다.";

  const payload = {
    notification: {
      title: `장 마감 신호 ${totalCount}건 감지`,
      body: bodyText,
      image: undefined,
    },
    data: {
      url: "https://www.simplystock.co.kr/",
    },
    webpush: {
      notification: {
        icon: "/favicon.ico",
        tag: "simplystock-signal",
      },
    },
  };

  // 활성 토큰 조회
  const snap = await db.collection("push_tokens").where("active", "==", true).get();
  if (snap.empty) {
    console.log("[push] 활성 토큰 없음");
    return;
  }

  const tokens = snap.docs.map((d) => d.id);
  console.log(`[push] ${tokens.length}개 토큰에 발송`);

  // 500개씩 배치 발송
  const BATCH_SIZE = 500;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      ...payload,
    });
    successCount += response.successCount;
    failCount += response.failureCount;

    // 무효 토큰 비활성화
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (resp.error) {
        const code = resp.error.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(batch[idx]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      const writeBatch = db.batch();
      for (const t of invalidTokens) {
        writeBatch.update(db.collection("push_tokens").doc(t), { active: false });
      }
      await writeBatch.commit();
      console.log(`[push] ${invalidTokens.length}개 무효 토큰 비활성화`);
    }
  }
  console.log(`[push] 발송 완료: 성공 ${successCount}, 실패 ${failCount}`);
}

// ── 포트폴리오 건강검진 ─────────────────────────────────────────────

/** 기술지표 계산 (일봉 OHLCV → RSI, MACD, BB, MA 등) */
function calcTechnicalIndicators(candles) {
  if (!candles || candles.length < 20) return null;
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const n = closes.length;

  const ma = (period) => {
    if (n < period) return null;
    let sum = 0;
    for (let i = n - period; i < n; i++) sum += closes[i];
    return Math.round((sum / period) * 100) / 100;
  };
  const ma5 = ma(5), ma20 = ma(20), ma60 = ma(60), ma120 = ma(120);

  let maStatus = "혼조";
  if (ma5 && ma20 && ma60) {
    if (ma5 > ma20 && ma20 > ma60) maStatus = "정배열";
    else if (ma5 < ma20 && ma20 < ma60) maStatus = "역배열";
  }

  // RSI(14)
  let rsi = null;
  if (n >= 15) {
    let gains = 0, losses = 0;
    for (let i = n - 14; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / 14, avgLoss = losses / 14;
    rsi = avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
  }

  // MACD(12,26,9)
  let macdValue = null, macdSignal = null, macdHist = null, macdCross = "없음";
  if (n >= 35) {
    const ema = (data, period) => {
      const k = 2 / (period + 1);
      const result = [data[0]];
      for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
      return result;
    };
    const ema12 = ema(closes, 12), ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine.slice(26), 9);
    const offset = 26;
    macdValue = Math.round(macdLine[n - 1] * 100) / 100;
    const sigIdx = n - 1 - offset;
    if (sigIdx >= 0 && sigIdx < signalLine.length) {
      macdSignal = Math.round(signalLine[sigIdx] * 100) / 100;
      macdHist = Math.round((macdValue - macdSignal) * 100) / 100;
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

  // 거래량 비율
  let volumeRatio = null;
  if (n >= 20) {
    const vol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const vol5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    volumeRatio = vol20 > 0 ? Math.round((vol5 / vol20) * 100) / 100 : 1;
  }

  // 추세
  let trend = "횡보";
  const tw = Math.min(60, n);
  if (tw >= 20) {
    const slice = closes.slice(-tw);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < slice.length; i++) {
      sumX += i; sumY += slice[i]; sumXY += i * slice[i]; sumX2 += i * i;
    }
    const slope = (slice.length * sumXY - sumX * sumY) / (slice.length * sumX2 - sumX * sumX);
    const slopePct = (slope / (sumY / slice.length)) * 100;
    if (slopePct > 0.1) trend = "상승";
    else if (slopePct < -0.1) trend = "하락";

    // 전체 기간 수익률과 추세 방향 모순 방지
    if (n >= 60) {
      const fullReturn = ((closes[n - 1] - closes[0]) / closes[0]) * 100;
      if (trend === "상승" && fullReturn < -5) trend = "횡보";
      if (trend === "하락" && fullReturn > 5) trend = "횡보";
    }
  }

  return {
    currentPrice: closes[n - 1],
    ma5, ma20, ma60, ma120, maStatus,
    rsi, macd: macdValue, macdSignal, macdHist, macdCross,
    bbUpper, bbLower, bbPosition, volumeRatio, trend,
  };
}

/** 외인 연속 매수/매도 일수 계산 */
function calcStreak(daily, field) {
  if (!daily || daily.length === 0) return 0;
  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    const val = daily[i][field] || 0;
    if (i === daily.length - 1) {
      streak = val >= 0 ? 1 : -1;
    } else {
      if ((streak > 0 && val >= 0) || (streak < 0 && val < 0)) {
        streak += streak > 0 ? 1 : -1;
      } else break;
    }
  }
  return streak;
}

/** 종목 퍼지 매칭 — 코드 우선 → 정규화 이름 → 부분 매칭 */
function normalizeStockName(name) {
  if (!name) return "";
  return name
    .replace(/\s+/g, "")          // 공백 제거
    .replace(/[()（）\[\]]/g, "") // 괄호 제거
    .replace(/보통주|ordinary/gi, "")
    .replace(/우선주/g, "우")
    .replace(/\d+(st|nd|rd|th)/gi, "")
    .trim();
}

function matchStock(stock, krStocksRaw) {
  // 전처리: 말줄임표 제거 (OCR에서 잘린 ETF명 등)
  const name = (stock.name || "")
    .replace(/\u2026/g, "")       // Unicode 말줄임표 … (U+2026)
    .replace(/\.{2,}$/, "")       // ASCII 마침표 2개 이상 (끝)
    .replace(/\.{3,}/g, "")       // ASCII 마침표 3개 이상 (중간)
    .trim();
  const code = stock.code || null; // 6자리 종목코드 (OCR에서 추출)

  // 1단계: 종목코드 매칭 (가장 정확)
  if (code) {
    const codeStr = String(code).padStart(6, "0");
    const byCode = krStocksRaw.find(
      (s) => s.s.replace(".KS", "").replace(".KQ", "") === codeStr
    );
    if (byCode) return byCode;
  }

  // 2단계: 정확한 이름 매칭
  const exact = krStocksRaw.find((s) => s.n === name);
  if (exact) return exact;

  // 3단계: 정규화 이름 매칭
  const norm = normalizeStockName(name);
  if (norm) {
    const normMatch = krStocksRaw.find(
      (s) => normalizeStockName(s.n) === norm
    );
    if (normMatch) return normMatch;
  }

  // 4단계: 부분 매칭 (가장 긴 이름 우선으로 오매칭 방지)
  if (name.length >= 2) {
    // DB 이름이 OCR 이름으로 시작하는 경우 (예: OCR "삼성전자우" → DB "삼성전자")
    const startsWithCandidates = krStocksRaw
      .filter((s) => name.startsWith(s.n) && s.n.length >= 2)
      .sort((a, b) => b.n.length - a.n.length); // 긴 이름 우선
    if (startsWithCandidates.length > 0) return startsWithCandidates[0];

    // 정규화 후 매칭 (예: OCR "LG 화학" → norm "LG화학")
    if (norm && norm.length >= 3) {
      const normCandidates = krStocksRaw
        .filter((s) => {
          const sNorm = normalizeStockName(s.n);
          return norm.startsWith(sNorm) && sNorm.length >= 2;
        })
        .sort((a, b) => normalizeStockName(b.n).length - normalizeStockName(a.n).length);
      if (normCandidates.length > 0) return normCandidates[0];
    }

    // 5단계: 역방향 부분 매칭 — DB 이름이 OCR 이름(잘린 텍스트)으로 시작하는 경우
    // (예: OCR "TIGER 코리아AI전력기..." → DB "TIGER 코리아AI전력기기TOP3플러스")
    if (name.length >= 4) {
      const cleanNorm = normalizeStockName(name);
      const reverseCandidates = krStocksRaw
        .filter((s) => {
          const sNorm = normalizeStockName(s.n);
          return sNorm.startsWith(cleanNorm) && cleanNorm.length >= 4 && sNorm !== cleanNorm;
        })
        .sort((a, b) => a.n.length - b.n.length); // 짧은 이름 우선 (가장 가까운 매칭)
      if (reverseCandidates.length > 0) return reverseCandidates[0];
    }

    // 6단계: 퍼지 접두어 매칭 — OCR 오인식 대응 (력↔략, 기↔기기 등)
    // 공통 접두어가 OCR 이름의 60% 이상이면 매칭
    // 동일 prefix 길이일 때 전체 문자 겹침 수로 tiebreak
    if (norm.length >= 6) {
      const minPrefix = Math.max(5, Math.floor(norm.length * 0.6));
      let bestMatch = null;
      let bestPrefixLen = 0;
      let bestOverlap = 0;
      for (const s of krStocksRaw) {
        const sNorm = normalizeStockName(s.n);
        if (sNorm.length < norm.length - 2) continue;
        let prefixLen = 0;
        const maxLen = Math.min(norm.length, sNorm.length);
        for (let i = 0; i < maxLen; i++) {
          if (norm[i] === sNorm[i]) prefixLen++;
          else break;
        }
        if (prefixLen >= minPrefix && (prefixLen > bestPrefixLen || (prefixLen === bestPrefixLen))) {
          // 전체 문자 겹침 계산 (tiebreaker)
          const freq = {};
          for (const c of sNorm) freq[c] = (freq[c] || 0) + 1;
          let overlap = 0;
          for (const c of norm) {
            if (freq[c] > 0) { overlap++; freq[c]--; }
          }
          if (prefixLen > bestPrefixLen || overlap > bestOverlap) {
            bestPrefixLen = prefixLen;
            bestOverlap = overlap;
            bestMatch = s;
          }
        }
      }
      if (bestMatch) return bestMatch;
    }
  }

  return null;
}

function mapOcrStock(stock, krStocksRaw) {
  const match = matchStock(stock, krStocksRaw);
  return {
    ...stock,
    symbol: match ? match.s.replace(".KS", "").replace(".KQ", "") : null,
    fullSymbol: match ? match.s : null,
    sector: match ? match.i : null,
    market: match ? match.m : null,
  };
}

/** 섹터 간소화 (KRX 162개 업종 → 11개 대분류) */
function simplifySector(industry, symbol) {
  // 오버라이드 우선 (지주회사 등 KRX 분류 보정)
  if (symbol) {
    const code = symbol.replace(/\.\w+$/, "");
    if (sectorOverrides[code]) return sectorOverrides[code];
  }
  if (!industry) return "기타";
  if (industry === "ETF") return "ETF";
  // 우선순위 높은 키워드부터 매칭
  const rules = [
    [["반도체", "전자부품", "Semiconductor"], "반도체"],
    [["소프트웨어", "컴퓨터", "정보통신", "정보 서비스", "게임", "인터넷", "IT", "Software", "Technology", "기록매체"], "IT"],
    [["자동차", "차체", "자동차부품", "Auto"], "자동차"],
    [["의약", "제약", "바이오", "의료", "헬스", "Biotech", "Pharma"], "바이오/제약"],
    [["금융", "은행", "증권", "보험", "투자", "캐피탈", "Financial", "리스"], "금융"],
    [["화학", "비료", "플라스틱", "고무", "비금속", "유리", "세라믹", "Chemical"], "화학/소재"],
    [["철강", "비철금속", "금속", "주조", "Materials"], "금속/철강"],
    [["석유", "가스", "에너지", "전기업", "Energy"], "에너지"],
    [["식품", "음료", "식료", "곡물", "과실", "낙농", "도축", "담배", "소매", "도매", "상품", "유통", "Consumer"], "유통/소비재"],
    [["건설", "건물", "시설물", "기반조성", "토목", "기계", "산업용", "운송장비", "조선", "Industrial"], "건설/산업재"],
    [["방송", "통신", "미디어", "영화", "광고", "출판", "Communication"], "미디어/통신"],
    [["섬유", "의복", "가죽", "가구", "종이"], "생활/소비재"],
    [["운송", "해운", "항공", "물류", "창고", "육상"], "운송"],
  ];
  for (const [keywords, sector] of rules) {
    for (const kw of keywords) {
      if (industry.includes(kw)) return sector;
    }
  }
  return "기타";
}

/** 후처리 필터 — 투자 조언 문장 제거 */
const ADVICE_PATTERNS = [
  /(?:매수|매도|손절|홀드|추가\s*매수|비중\s*축소|비중\s*확대|비중\s*조[정절]|물타기|분할\s*매[수도]).*(?:하세요|하십시오|하시기|합시다|바랍니다)/,
  /(?:권합니다|권해\s*드립니다|추천합니다|제안합니다|권고합니다)/,
  /(?:손절|물타기|매수|매도|비중\s*조정|비중\s*축소|비중\s*확대|포지션|리밸런싱).*(?:필요|해야|검토|고려|판단)/,
  /(?:매수|매도|진입|이탈).*(?:대기|관망|기다리|지켜보)/,
  /(?:수익|이익|차익).*(?:보장|확실|기대됩니다)/,
  /(?:좋은\s*기회|절호의\s*기회|적기|매력적인\s*구간)/,
];

function sanitizeInterpretation(text) {
  // 1. 마크다운 제거
  let cleaned = text
    .replace(/^#{1,3}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n");

  // 2. 투자 조언 문장 필터
  cleaned = cleaned
    .split(/(?<=[.!?]\s)/)
    .filter((sentence) => {
      for (const pattern of ADVICE_PATTERNS) {
        if (pattern.test(sentence)) {
          console.warn("[투자조언 필터 차단]:", sentence.trim());
          return false;
        }
      }
      return true;
    })
    .join("");

  return cleaned;
}

/** 피어슨 상관계수 */
function pearsonCorrelation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 20) return 0;
  const ra = [], rb = [];
  for (let i = 1; i < n; i++) {
    ra.push((a[i] - a[i - 1]) / a[i - 1]);
    rb.push((b[i] - b[i - 1]) / b[i - 1]);
  }
  const meanA = ra.reduce((s, v) => s + v, 0) / ra.length;
  const meanB = rb.reduce((s, v) => s + v, 0) / rb.length;
  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < ra.length; i++) {
    const da = ra[i] - meanA, db = rb[i] - meanB;
    cov += da * db; varA += da * da; varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : Math.round((cov / denom) * 100) / 100;
}

// ── 종목 최근 실적 조회 (DART fnlttSinglAcnt) ──────────────────────
exports.stockEarnings = onRequest(
  { cors: true, secrets: [dartApiKey], memory: "256MiB", timeoutSeconds: 15 },
  async (req, res) => {
    try {
      const symbol = (req.query.symbol || "").replace(/\.KS$/, "");
      if (!symbol) return res.status(400).json({ error: "symbol required" });

      const corpCode = getDartCorpCode(symbol);
      if (!corpCode) return res.json({ data: null });

      const dartKey = dartApiKey.value();
      const currentYear = new Date().getFullYear();

      // 최근 보고서 순서대로 시도: 올해 연간 → 작년 연간 → 작작년 연간
      const tryCombos = [
        { year: currentYear, code: "11011" },
        { year: currentYear - 1, code: "11011" },
        { year: currentYear - 2, code: "11011" },
      ];

      let result = null;
      for (const { year, code } of tryCombos) {
        try {
          const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${dartKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${code}`;
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
            signal: AbortSignal.timeout(10000),
          });
          if (!r.ok) continue;
          const data = await r.json();
          if (data.status !== "000" || !data.list) continue;

          const cfsList = data.list.filter((item) => item.fs_div === "CFS");
          const targetList = cfsList.length > 0 ? cfsList : data.list;

          let revenue = null, revenuePrev = null;
          let opIncome = null, opIncomePrev = null;
          let period = `${year}년`;

          for (const item of targetList) {
            const nm = (item.account_nm || "").trim();
            const cur = parseInt((item.thstrm_amount || "").replace(/,/g, ""), 10);
            const prev = parseInt((item.frmtrm_amount || "").replace(/,/g, ""), 10);

            if (nm === "매출액" || nm === "수익(매출액)" || nm === "영업수익") {
              if (revenue == null && !isNaN(cur)) { revenue = cur; revenuePrev = isNaN(prev) ? null : prev; }
            }
            if (nm === "영업이익" || nm === "영업이익(손실)") {
              if (opIncome == null && !isNaN(cur)) { opIncome = cur; opIncomePrev = isNaN(prev) ? null : prev; }
            }
          }

          if (revenue != null || opIncome != null) {
            const revenueYoY = revenue != null && revenuePrev != null && revenuePrev !== 0
              ? Math.round(((revenue - revenuePrev) / Math.abs(revenuePrev)) * 1000) / 10
              : null;
            const opIncomeYoY = opIncome != null && opIncomePrev != null && opIncomePrev !== 0
              ? Math.round(((opIncome - opIncomePrev) / Math.abs(opIncomePrev)) * 1000) / 10
              : null;

            result = { revenue, revenueYoY, opIncome, opIncomeYoY, period };
            break;
          }
        } catch { continue; }
      }

      res.json({ data: result });
    } catch (err) {
      console.error("[stockEarnings] Error:", err);
      res.json({ data: null });
    }
  }
);

exports.portfolioAnalyze = onRequest(
  {
    secrets: [geminiApiKey, dartApiKey],
    cors: true,
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { imageBase64, mimeType, stocks: preOcrStocks } = req.body;
    if (!imageBase64 && !preOcrStocks) {
      res.status(400).json({ error: "imageBase64 또는 stocks가 필요합니다." });
      return;
    }

    // SSE 헤더
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // 2KB 패딩으로 프록시 버퍼 강제 플러시
    const PADDING = `: ${"_".repeat(2048)}\n\n`;
    const sse = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.write(PADDING);
    };

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const dartKey = dartApiKey.value();

      let mappedStocks;

      if (preOcrStocks && Array.isArray(preOcrStocks) && preOcrStocks.length > 0) {
        // ── stocks 직접 전달 (OCR 건너뛰기) ──
        mappedStocks = preOcrStocks;
        sse({ type: "ocr", stocks: mappedStocks, unmapped: [] });
        console.log(`[portfolio] Pre-OCR stocks: ${mappedStocks.length}`);
      } else {
        // ── Phase A: OCR (기존 방식) ──
        const ocrPrompt = `이 증권사 앱 스크린샷에서 보유 종목 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만:

{
  "stocks": [
    {
      "name": "종목명 (한글)",
      "code": "종목코드 6자리 (숫자 또는 영문 포함) 또는 null",
      "qty": 보유수량,
      "avgPrice": 평균매입가,
      "currentPrice": 현재가 또는 null,
      "returnPct": 수익률 또는 null
    }
  ]
}

규칙:
- 종목명은 정확히 표시된 대로 추출
- 종목코드(6자리, 숫자 또는 영문 포함)가 보이면 반드시 추출. 예: 005930, 0117V0. 안 보이면 null
- 수량, 가격에서 쉼표 제거하고 숫자만
- 현재가나 수익률이 보이지 않으면 null
- ETF, 펀드도 포함
- 최대 20종목까지`;

        const ocrResult = await model.generateContent([
          ocrPrompt,
          { inlineData: { mimeType: mimeType || "image/png", data: imageBase64 } },
        ]);
        const ocrText = ocrResult.response.text();

        // JSON 파싱 (4단계 폴백)
        let ocrParsed;
        try {
          ocrParsed = JSON.parse(ocrText);
        } catch {
          try {
            const cleaned = ocrText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            ocrParsed = JSON.parse(cleaned);
          } catch {
            const match = ocrText.match(/\{[\s\S]*\}/);
            if (match) ocrParsed = JSON.parse(match[0]);
            else throw new Error("OCR 결과 파싱 실패");
          }
        }

        if (!ocrParsed?.stocks?.length) {
          sse({ type: "error", message: "종목을 인식할 수 없습니다. 다른 스크린샷을 시도해주세요." });
          res.end();
          return;
        }

        // 종목명/코드 → 매핑 (퍼지 매칭)
        const allMapped = ocrParsed.stocks.map((stock) => mapOcrStock(stock, krStocksRaw));
        mappedStocks = allMapped.filter((s) => s.symbol);
        const unmapped = allMapped.filter((s) => !s.symbol);

        sse({
          type: "ocr",
          stocks: mappedStocks,
          unmapped: unmapped.map((s) => s.name),
        });
        console.log(`[portfolio] OCR: ${mappedStocks.length} mapped, ${unmapped.length} unmapped`);

        if (mappedStocks.length === 0) {
          sse({ type: "error", message: "인식된 종목 중 매핑 가능한 한국 주식이 없습니다." });
          res.end();
          return;
        }
      }

      // ── Phase B: 데이터 수집 (3개씩 배치 병렬) ──
      sse({ type: "phase", phase: "dart", label: "DART 전자공시 조회 중..." });
      const collectedData = [];
      const BATCH_SIZE = 3;

      for (let i = 0; i < mappedStocks.length; i += BATCH_SIZE) {
        const batch = mappedStocks.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (stock) => {
            const code = stock.symbol;
            const fullSym = stock.fullSymbol;

            const stockData = {
              name: stock.name,
              symbol: code,
              fullSymbol: fullSym,
              qty: stock.qty,
              avgPrice: stock.avgPrice,
              currentPrice: stock.currentPrice,
              returnPct: stock.returnPct,
              sector: stock.sector,
            };

            // 각 항목 loading 상태 먼저 전송
            sse({ type: "progress", stock: stock.name, step: "perBand", status: "loading" });
            sse({ type: "progress", stock: stock.name, step: "investorTrend", status: "loading" });
            sse({ type: "progress", stock: stock.name, step: "chart", status: "loading" });

            // 각 fetch를 개별 Promise로 — 완료 즉시 SSE 전송
            const perBandPromise = (async () => {
              try {
                const pb = await fetchPerBandInternal(code, dartKey);
                if (pb) {
                  stockData.perBand = {
                    currentPer: pb.currentPer,
                    perPosition: pb.perPosition,
                    bands: pb.perBands,
                    forwardPer: pb.forwardPer,
                  };
                  if (pb.latestEarnings) {
                    stockData.earnings = pb.latestEarnings;
                  }
                  if (pb.dividendYield) stockData.dividendYield = pb.dividendYield;
                  if (pb.dividendPerShare) stockData.dividendPerShare = pb.dividendPerShare;
                  sse({
                    type: "progress", stock: stock.name, step: "perBand", status: "done",
                    preview: { currentPer: pb.currentPer, perPosition: pb.perPosition },
                  });
                } else {
                  stockData.perBand = null;
                  sse({ type: "progress", stock: stock.name, step: "perBand", status: "failed" });
                }
              } catch {
                stockData.perBand = null;
                sse({ type: "progress", stock: stock.name, step: "perBand", status: "failed" });
              }
            })();

            const trendPromise = (async () => {
              try {
                const trendData = await fetchInvestorTrendInternal(fullSym, 60);
                if (trendData) {
                  const daily = trendData.daily || [];
                  const recent30 = daily.slice(-30);
                  const foreignNet30 = recent30.reduce((s, d) => s + (d.foreign || 0), 0);
                  const instNet30 = recent30.reduce((s, d) => s + (d.institution || 0), 0);
                  const indivNet30 = recent30.reduce((s, d) => s + (d.individual || 0), 0);
                  const foreignStreak = calcStreak(daily, "foreign");
                  const supplyLastDate = daily.length > 0 ? daily[daily.length - 1].date : null;
                  stockData.supply = { foreignNet30, institutionNet30: instNet30, individualNet30: indivNet30, foreignStreak, asOf: supplyLastDate };
                  sse({
                    type: "progress", stock: stock.name, step: "investorTrend", status: "done",
                    preview: { foreignNet30, foreignStreak },
                  });
                } else {
                  stockData.supply = null;
                  sse({ type: "progress", stock: stock.name, step: "investorTrend", status: "failed" });
                }
              } catch {
                stockData.supply = null;
                sse({ type: "progress", stock: stock.name, step: "investorTrend", status: "failed" });
              }
            })();

            const chartPromise = (async () => {
              try {
                const chartData = await fetchStockChartInternal(fullSym, "6mo", "1d");
                if (chartData) {
                  const candles = chartData.candles;
                  stockData.technicals = calcTechnicalIndicators(candles);
                  // sparkline 방어: Yahoo가 close에 수정주가를 넣는 케이스 대응
                  const allCloses = candles.map((c) => c.close);
                  let sparkStart = 0;
                  // 1) 인접 캔들 ±40% 급변 (즉시 분할/합병)
                  for (let si = 1; si < allCloses.length; si++) {
                    if (allCloses[si - 1] > 0 && Math.abs((allCloses[si] - allCloses[si - 1]) / allCloses[si - 1]) > 0.4) {
                      sparkStart = si;
                    }
                  }
                  // 2) 한국 주식 수정주가 감지: 호가 단위 검증 (뒤에서 스캔)
                  if (fullSym.endsWith(".KS") || fullSym.endsWith(".KQ")) {
                    let cleanBoundary = allCloses.length;
                    for (let si = allCloses.length - 1; si >= sparkStart; si--) {
                      const c = allCloses[si];
                      if (c == null) continue;
                      const p = Math.round(c);
                      const tick = p >= 500000 ? 1000 : p >= 200000 ? 500 : p >= 50000 ? 100 : p >= 20000 ? 50 : p >= 5000 ? 10 : p >= 2000 ? 5 : 1;
                      if (p % tick !== 0 || Math.abs(c - p) > 0.5) break;
                      cleanBoundary = si;
                    }
                    if (allCloses.length - cleanBoundary >= 5) {
                      sparkStart = Math.max(sparkStart, cleanBoundary);
                    }
                  }
                  // 3) 전체 수익률 ±100% 초과 시 시작점 앞으로 당기기
                  if (allCloses.length > 1 && sparkStart < allCloses.length - 1) {
                    const lastP = allCloses[allCloses.length - 1];
                    if (lastP > 0 && allCloses[sparkStart] > 0 && Math.abs((lastP - allCloses[sparkStart]) / allCloses[sparkStart]) > 1.0) {
                      for (let si = sparkStart; si < allCloses.length - 1; si++) {
                        if (allCloses[si] > 0 && Math.abs((lastP - allCloses[si]) / allCloses[si]) <= 1.0) {
                          sparkStart = si;
                          break;
                        }
                      }
                    }
                  }
                  stockData.sparkline = allCloses.slice(sparkStart);
                  if (candles.length > 0) {
                    const lastCandle = candles[candles.length - 1];
                    if (!stockData.currentPrice) stockData.currentPrice = lastCandle.close;
                    stockData.chartAsOf = new Date(lastCandle.time * 1000).toISOString().slice(0, 10);
                  }
                  sse({
                    type: "progress", stock: stock.name, step: "chart", status: "done",
                    preview: stockData.technicals ? {
                      rsi: stockData.technicals.rsi,
                      maStatus: stockData.technicals.maStatus,
                      trend: stockData.technicals.trend,
                    } : null,
                  });
                } else {
                  stockData.technicals = null;
                  stockData.sparkline = [];
                  sse({ type: "progress", stock: stock.name, step: "chart", status: "failed" });
                }
              } catch {
                stockData.technicals = null;
                stockData.sparkline = [];
                sse({ type: "progress", stock: stock.name, step: "chart", status: "failed" });
              }
            })();

            // 3년 고가/저가 범위 (매수 위치 시각화용)
            const priceRangePromise = (async () => {
              try {
                const rangeData = await fetchStockChartInternal(fullSym, "5y", "1wk");
                if (rangeData && rangeData.candles && rangeData.candles.length > 0) {
                  const now = Date.now() / 1000;
                  const threeYearsAgo = now - 3 * 365.25 * 86400;
                  const filtered = rangeData.candles.filter((c) => c.time >= threeYearsAgo);
                  const candles = filtered.length >= 4 ? filtered : rangeData.candles;
                  let high3y = -Infinity;
                  let low3y = Infinity;
                  for (const c of candles) {
                    if (c.high > high3y) high3y = c.high;
                    if (c.low < low3y) low3y = c.low;
                  }
                  if (high3y > low3y && low3y > 0) {
                    stockData.priceRange3y = { high3y, low3y };
                  }
                }
              } catch {
                // 실패 시 무시 — 선택적 데이터
              }
            })();

            await Promise.all([perBandPromise, trendPromise, chartPromise, priceRangePromise]);
            collectedData.push(stockData);
          })
        );
      }

      // ── Phase C: 포트폴리오 레벨 계산 ──
      sse({ type: "phase", phase: "valuation", label: "밸류에이션 계산 중..." });
      sse({ type: "analysis", status: "calculating" });

      // 섹터 비중
      let totalValue = 0;
      const sectorMap = {};
      for (const s of collectedData) {
        const val = (s.currentPrice || s.avgPrice) * s.qty;
        totalValue += val;
        const sector = simplifySector(s.sector, s.symbol);
        sectorMap[sector] = (sectorMap[sector] || 0) + val;
      }
      const sectorWeights = Object.entries(sectorMap)
        .map(([sector, value]) => ({ sector, value, weight: Math.round((value / (totalValue || 1)) * 100) }))
        .sort((a, b) => b.weight - a.weight);

      // 상관관계 매트릭스
      const correlationMatrix = {};
      for (let i = 0; i < collectedData.length; i++) {
        for (let j = i + 1; j < collectedData.length; j++) {
          const a = collectedData[i].sparkline || [];
          const b = collectedData[j].sparkline || [];
          if (a.length >= 10 && b.length >= 10) {
            correlationMatrix[`${collectedData[i].symbol}_${collectedData[j].symbol}`] =
              pearsonCorrelation(a, b);
          }
        }
      }

      // 분산도 (HHI)
      const hhi = sectorWeights.reduce((sum, s) => sum + (s.weight / 100) ** 2, 0);
      let diversificationScore = Math.round((1 - hhi) * 100);
      const highCorr = Object.values(correlationMatrix).filter((c) => Math.abs(c) > 0.7);
      diversificationScore = Math.max(0, Math.min(100, diversificationScore - highCorr.length * 10));

      // 가중 수익률
      let totalReturn = 0;
      if (totalValue > 0) {
        let totalCost = 0;
        for (const s of collectedData) {
          totalCost += s.avgPrice * s.qty;
        }
        totalReturn = totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 1000) / 10 : 0;
      }

      const portfolioSummary = {
        totalValue,
        totalReturn,
        stockCount: collectedData.length,
        sectorWeights,
        diversificationScore,
        correlationMatrix,
        dataTimestamp: new Date().toISOString(),
        dataAsOf: {
          price: new Date().toISOString().slice(0, 16).replace("T", " "),
          supply: collectedData[0]?.supply?.asOf || null,
          chart: collectedData[0]?.chartAsOf || null,
          dart: collectedData[0]?.earnings?.period || null,
        },
      };

      // ── Phase D: AI 종합 해석 ──
      sse({ type: "phase", phase: "ai", label: "AI 종합 분석 중..." });
      sse({ type: "analysis", status: "interpreting" });

      const stocksSummaryText = collectedData.map((s) => {
        const ret = s.returnPct != null ? `수익률 ${s.returnPct > 0 ? "+" : ""}${s.returnPct}%` : "";
        return `- ${s.name} ${s.qty}주 (평단가 ${Math.round(s.avgPrice).toLocaleString()}원${ret ? ", " + ret : ""})`;
      }).join("\n");

      const stocksDetailText = collectedData.map((s) => {
        let text = `## ${s.name} (${s.symbol})\n`;
        if (s.perBand) {
          text += `### 밸류에이션 (DART 기준)\n`;
          text += `- 현재 PER (Trailing): ${s.perBand.currentPer ?? "N/A"}배\n`;
          text += `- Forward PER: ${s.perBand.forwardPer ?? "N/A"}배\n`;
          text += `- PER 밴드 위치: ${s.perBand.perPosition}% (10년 기준)\n`;
          if (s.perBand.bands) text += `- PER 범위: ${s.perBand.bands.min?.toFixed(1)}~${s.perBand.bands.max?.toFixed(1)}배\n`;
        }
        if (s.supply) {
          const fs = s.supply.foreignStreak;
          text += `### 수급 (KIS 30일)\n`;
          text += `- 외국인: ${s.supply.foreignNet30 > 0 ? "+" : ""}${s.supply.foreignNet30.toLocaleString()} (${fs > 0 ? fs + "일 연속 매수" : Math.abs(fs) + "일 연속 매도"})\n`;
          text += `- 기관: ${s.supply.institutionNet30 > 0 ? "+" : ""}${s.supply.institutionNet30.toLocaleString()}\n`;
        }
        if (s.earnings) {
          const fmtKrw = (n) => { const a = Math.abs(n); if (a >= 1e12) return `${(n/1e12).toFixed(1)}조`; if (a >= 1e8) return `${Math.round(n/1e8)}억`; return `${Math.round(n/1e4)}만`; };
          const fmtYoY = (v) => v != null ? ` (전년 대비 ${v > 0 ? "+" : ""}${v}%)` : "";
          text += `### 최근 실적 (${s.earnings.period}, DART 기준)\n`;
          if (s.earnings.revenue != null) text += `- 매출: ${fmtKrw(s.earnings.revenue)}원${fmtYoY(s.earnings.revenueYoY)}\n`;
          if (s.earnings.opIncome != null) text += `- 영업이익: ${fmtKrw(s.earnings.opIncome)}원${fmtYoY(s.earnings.opIncomeYoY)}\n`;
        }
        if (s.technicals) {
          text += `### 추세 (Yahoo Finance OHLCV)\n`;
          text += `- 이동평균: ${s.technicals.maStatus}\n`;
          text += `- RSI(14): ${s.technicals.rsi}\n`;
          text += `- MACD: ${s.technicals.macd > 0 ? "양" : "음"}수 (${s.technicals.macdCross})\n`;
          text += `- 볼린저 밴드: ${s.technicals.bbPosition}% 위치\n`;
        }
        if (s.dividendYield) {
          text += `### 배당\n`;
          text += `- 배당수익률: ${s.dividendYield}%\n`;
          if (s.dividendPerShare) text += `- 주당배당금: ${s.dividendPerShare.toLocaleString()}원\n`;
        }
        return text;
      }).join("\n");

      const sectorText = sectorWeights.map((s) => `${s.sector} ${s.weight}%`).join(", ");
      const correlationText = Object.entries(correlationMatrix)
        .filter(([, v]) => Math.abs(v) > 0.5)
        .map(([key, v]) => {
          const [a, b] = key.split("_");
          const nameA = collectedData.find((s) => s.symbol === a)?.name || a;
          const nameB = collectedData.find((s) => s.symbol === b)?.name || b;
          return `- ${nameA} <-> ${nameB}: 상관계수 ${v}`;
        }).join("\n") || "- 유의미한 상관관계 없음";

      const interpretPrompt = `[페르소나]
당신은 증권사 리서치센터의 데이터 분석가입니다.
주식 초보자도 이해할 수 있도록 데이터를 쉽게 풀어서 설명합니다.

[말투 규칙]
1. 존칭을 사용합니다. "~입니다", "~있습니다", "~됩니다"로 끝냅니다.
2. 캐주얼 표현 금지: ㅎㅎ, ㅋㅋ, ~네요, ~죠, ~거든요
3. 감탄이나 주관적 감정 금지: "놀랍게도", "안타깝게도"
4. 전문 용어는 반드시 괄호로 쉬운 풀이를 붙입니다.
   예: "RSI 75 (과열, 즉 단기간에 많이 올랐다는 신호)"
   예: "PER 밴드 상위 80% (과거 10년 중 비싼 편에 해당)"
   예: "외국인 연속 15일 순매수 (한 방향으로 지속적으로 사들이는 중)"
5. 모든 수치에는 출처를 명시합니다: "(DART 기준)" — 실적/EPS 데이터, "(네이버 기준)" — 현재 PER/Forward PER, "(KIS 30일 데이터)" — 수급
6. 문단은 짧게 유지합니다 (3~4문장).
7. 단순 나열이 아닌, 지표 간 교차 해석을 합니다.
8. 아래 교차 해석 규칙을 반드시 적용합니다.

[핵심 발견 생성 규칙]
반드시 2~4개의 핵심 발견을 생성하세요.
단순 데이터 나열이 아닌, 지표 간 충돌/조합에서 나오는 인사이트여야 합니다.

교차 패턴 (해당하는 것 모두 적용):

패턴 A — 실적 괴리:
조건: 매출/영업이익 YoY +20% 이상 AND 외국인+기관 순매도
해석: "실적은 호조인데 기관이 이탈하는 괴리 상태"
icon: conflict

패턴 B — 밸류 vs 포워드 갭:
조건: 트레일링 PER 밴드 90%+ AND 포워드 PER이 트레일링 대비 30%+ 낮음
해석: "과거 기준 극단적 고점이나 대폭 실적 개선 기대 선반영"
icon: positive

패턴 C — 모멘텀 과열:
조건: RSI 70+ AND 이평선 정배열 AND 기관 순매수
해석: "강한 상승 추세지만 과열 구간 진입, 단기 조정 가능성"
icon: momentum

패턴 D — 실적 악화 + 고밸류:
조건: 포워드 PER > 트레일링 PER AND PER 밴드 80%+
해석: "현재도 비싼데 실적 둔화 전망까지 겹침"
icon: risk

패턴 E — 집중 리스크:
조건: 특정 섹터 비중 70%+
해석: "섹터 집중으로 해당 산업 하락 시 포트폴리오 전체 타격"
icon: risk

패턴 F — 숨은 긍정:
조건: 전체 수익률 마이너스 BUT 특정 종목 기관 매수 + 정배열
해석: "포트폴리오 전체는 손실이지만 해당 종목은 전환 신호"
icon: positive

작성 스타일:
- 건조한 사실 나열 금지. 지표 간 충돌/긴장을 부각하세요.
- key_findings의 body는 반드시 1줄(40자) 이내. 핵심만.
- 나쁜 예: "PER 밴드 96% 위치이며 기관 매도세가 이어지고 있어 주의가 필요합니다"
- 좋은 예: "실적 +61%인데 기관은 이탈 중"

[종목별 신호 판단 기준]
danger (위험): PER밴드 90%+ AND 포워드PER >= 트레일링PER AND (외국인 매도 OR 기관 매도), 또는 PER밴드 90%+ AND 실적 YoY 감소 AND 기관 매도
warning (경고): PER밴드 80%+ AND 부정적 신호 1~2개, 또는 PER밴드 90%+ BUT 긍정 신호도 존재
caution (주의): PER밴드 50~80%, 또는 혼조 신호
good (양호): PER밴드 50% 미만, 또는 PER밴드 높지만 포워드 대폭 하락 + 기관 매수 + 정배열
strong (강세): 포워드 PER 적정 + 기관 매수 + 이평선 정배열 + RSI 50~70 + 실적 성장

trailing과 forward 관점에서 같은 종목도 다른 신호가 나올 수 있습니다.

[절대 금지]
- "매수", "매도", "홀드", "손절", "물타기" 등 투자 행동 용어 금지.
- 종합 등급(S/A/B/C/D) 매기기 금지.
- 마크다운 사용 금지: #, ##, ###, **, * 절대 사용하지 마세요.
- 불릿 리스트(-) 사용 금지. 자연어 문장으로만 작성하세요.
- detail_analysis에서: "~하세요" 금지, 관찰문으로만 작성.
- action_guide에서만: "~검토해 볼 수 있습니다", "~고려해 볼 수 있습니다" 형태 허용.

[데이터 기준 시점]
- PER/주가: ${portfolioSummary.dataAsOf.price} (분석 실행 시점)
- 수급 동향: ${portfolioSummary.dataAsOf.supply ? `~${portfolioSummary.dataAsOf.supply.slice(0,4)}-${portfolioSummary.dataAsOf.supply.slice(4,6)}-${portfolioSummary.dataAsOf.supply.slice(6,8)}` : "전일"} (전일 장마감 기준, 당일 미반영)
- 차트/기술지표: ${portfolioSummary.dataAsOf.chart || "전일"} (전일 종가 기준)
- DART 실적: ${portfolioSummary.dataAsOf.dart || "N/A"} (사업보고서)
주의: 장중 분석 시 수급과 기술지표는 전일 기준이므로 당일 장중 변동은 미반영.

[데이터 시점 활용 규칙]
- 데이터 시점 차이를 인지하되, 시점 차이가 분석에 영향을 줄 때만 언급하세요.
- PER(실시간)과 수급(전일) 사이에 괴리가 있을 수 있음을 고려하세요.
- DART 실적은 "최근 공시 실적 기준"으로 표현하세요.

[데이터]
## 포트폴리오 구성
${stocksSummaryText}

## 포트폴리오 구조
- 총 평가액: ${Math.round(totalValue).toLocaleString()}원
- 총 수익률: ${totalReturn > 0 ? "+" : ""}${totalReturn}%
- 섹터 구성: ${sectorText}
- 분산도 점수: ${diversificationScore}/100 (HHI 기반)

${stocksDetailText}

## 종목 간 상관관계
${correlationText}

[응답 형식]
분석 결과를 반드시 아래 JSON 형식으로만 출력하세요. 마크다운이나 설명 텍스트 없이 JSON만 출력하세요. 코드블록(\`\`\`)도 사용하지 마세요.

{
  "portfolio_diagnosis": {
    "trailing": {
      "overall_signal": "danger 또는 warning 또는 caution 또는 good 또는 strong 중 하나",
      "overall_summary": "반드시 2줄(80자) 이내. 첫 문장: 결론 판정. 둘째 문장: 반드시 첫 문장과 반대 방향 신호(부정이면 긍정 요소, 긍정이면 주의 요소).",
      "key_findings": [
        {
          "icon": "conflict 또는 momentum 또는 risk 또는 positive 중 하나",
          "title": "핵심 발견 제목 (10자 이내)",
          "body": "반드시 1줄(40자) 이내. 지표 간 충돌/조합 인사이트.",
          "stocks": ["종목코드1", "종목코드2"],
          "severity": "high 또는 medium 또는 low"
        }
      ],
      "action_guide": [
        {
          "target": "포트폴리오 전체 또는 종목명",
          "action": "반드시 구체적 수치 1개 이상 포함. 최대 50자. (~검토해 볼 수 있습니다 형태)",
          "reason": "해당 포트폴리오의 실제 데이터 인용. 최대 60자."
        }
      ]
    },
    "forward": {
      "overall_signal": "...",
      "overall_summary": "...",
      "key_findings": [ ... ],
      "action_guide": [ ... ]
    }
  },
  "stocks": [
    {
      "code": "종목코드",
      "name": "종목명",
      "trailing": {
        "signal": "danger 또는 warning 또는 caution 또는 good 또는 strong 중 하나",
        "one_line": "한줄 요약",
        "key_insight": "이 종목에서 가장 주목할 교차 해석 1줄",
        "tags": ["밸류에이션 부담", "기관 매도"],
        "detail_analysis": "상세 분석 텍스트 (3~5문장)"
      },
      "forward": {
        "signal": "...",
        "one_line": "...",
        "key_insight": "...",
        "tags": [ ... ],
        "detail_analysis": "상세 분석 텍스트 (trailing과 다른 부분만 간결히 2~3문장)"
      }
    }
  ]
}

[분석 규칙]
1. trailing 관점: 과거 실적(트레일링 PER) 기준으로 현재 밸류에이션을 평가합니다.
2. forward 관점: 미래 예상 실적(포워드 PER) 기준으로 현재 밸류에이션을 재평가합니다.
3. 포워드 PER이 트레일링보다 높으면 실적 하향 우려를, 낮으면 실적 개선 기대를 반영해서 분석합니다.
4. 두 관점의 signal이 다를 수 있습니다. 예: trailing에선 "warning"이지만 forward에선 "good"일 수 있습니다.
5. 수급 동향, RSI, 이동평균선은 두 관점 모두에서 동일하게 참조하되, 해석 맥락이 달라야 합니다.
6. forward의 detail_analysis에서 수급/추세 설명은 trailing과 동일하므로 생략하고, PER 관점 차이만 기술합니다.
7. Forward PER 데이터가 없는 종목은 forward 객체의 signal과 summary를 trailing과 동일하게 출력합니다.
8. Forward에서 trailing보다 신호가 나빠지거나 좋아지는 경우, overall_summary 첫 문장에 '왜 바뀌는지' 명시하세요. 예: "실적 둔화 전망으로 경고→위험으로 악화"

[액션 가이드 규칙]
- 반드시 핵심 발견(key_findings)과 1:1 대응되는 검토 사항을 생성하세요.
- 반드시 "~를 검토해 볼 수 있습니다", "~를 고려해 볼 수 있습니다" 형태로 작성하세요.
- 절대로 "~하세요", "~해야 합니다" 같은 직접적 투자 권고를 하지 마세요.
- 각 제안에는 반드시 구체적 근거(reason)를 포함하세요.
- 나쁜 예: action "분산을 검토해 보세요" / reason "집중도가 높습니다"
- 좋은 예: action "IT/헬스케어 등 추가로 금융 90% 집중 완화를 검토해 볼 수 있습니다" / reason "금융 섹터 -10% 시 포트폴리오 -9% 타격 추정"

[해석 요청]
초보 투자자가 자신의 포트폴리오 상태를 이해할 수 있도록:
1. 종합 진단 (portfolio_diagnosis.overall_summary): 반드시 2줄(80자) 이내. 첫 문장=결론. 둘째 문장=반드시 첫 문장과 반대 방향 신호(부정→긍정 요소, 긍정→주의 요소). 나쁜 예: "밸류 부담 + 수급 악화로 위험. 기관 매도세가 지속." (둘 다 부정) 좋은 예: "밸류 부담 + 수급 악화로 위험. 다만 실적 성장세는 유효."
2. 핵심 발견 (key_findings): 지표 간 충돌/긴장에서 나오는 인사이트 2~4개
3. 검토 사항 (action_guide): 핵심 발견에 대응하는 검토 사항 2~4개
4. 종목별 교차 해석 (stocks[].detail_analysis): 지표 간 교차 분석
5. 종목별 핵심 인사이트 (stocks[].key_insight): 가장 주목할 교차 해석 1줄`;

      const streamResult = await model.generateContentStream(interpretPrompt);
      let fullInterpretation = "";

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          fullInterpretation += text;
          sse({ type: "interpretation", t: text });
        }
      }

      // 후처리: JSON 파싱 시도 → 실패 시 텍스트 필터
      let aiAnalysis = null;
      let cleanedText = fullInterpretation;
      try {
        // Gemini가 코드블록으로 감쌀 수 있음
        let jsonStr = fullInterpretation.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        if (parsed.portfolio_diagnosis && parsed.stocks) {
          // post-validation: PER밴드 95%+ 종목은 strong 불가 → good으로 하향
          if (Array.isArray(parsed.stocks)) {
            for (const aiStock of parsed.stocks) {
              const matchData = collectedData.find((d) => d.symbol === aiStock.symbol || d.name === aiStock.name);
              const perPos = matchData?.perBand?.perPosition;
              const views = [aiStock.trailing, aiStock.forward].filter(Boolean);
              for (const view of views) {
                if (view.signal === "strong" && perPos != null && perPos >= 95) {
                  view.signal = "good";
                }
              }
            }
          }
          aiAnalysis = parsed;
        }
      } catch {
        // JSON 파싱 실패 → 기존 텍스트 필터 적용
        cleanedText = sanitizeInterpretation(fullInterpretation);
      }

      // ── Phase E: 완료 ──
      const disclaimer = "본 분석은 공개된 데이터(DART, KIS, Yahoo Finance)를 기반으로 한 현황 정리이며, 투자 자문이 아닙니다. 투자 판단의 책임은 본인에게 있습니다.";

      const finalResult = {
        portfolio: portfolioSummary,
        stocks: collectedData.map((s) => ({
          name: s.name,
          symbol: s.symbol,
          qty: s.qty,
          avgPrice: s.avgPrice,
          currentPrice: s.currentPrice,
          returnPct: s.returnPct,
          sector: simplifySector(s.sector, s.symbol),
          perBand: s.perBand,
          supply: s.supply,
          technicals: s.technicals,
          earnings: s.earnings || null,
          dividendYield: s.dividendYield ?? null,
          dividendPerShare: s.dividendPerShare ?? null,
          sparkline: s.sparkline || [],
          priceRange3y: s.priceRange3y || null,
          disclosures: [],
        })),
        interpretation: cleanedText,
        aiAnalysis,
        disclaimer,
      };

      sse({ type: "done", r: finalResult });
      res.end();
    } catch (err) {
      console.error("[portfolio] Error:", err);
      sse({ type: "error", message: err.message || "분석 중 오류가 발생했습니다." });
      res.end();
    }
  }
);

// ── 포트폴리오 OCR (멀티이미지, 별도 엔드포인트) ──
exports.portfolioOcr = onRequest(
  {
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "images 배열이 필요합니다." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const PADDING = `: ${"_".repeat(2048)}\n\n`;
    const sse = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.write(PADDING);
    };

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const ocrPrompt = `이 증권사 앱 스크린샷에서 보유 종목 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만:

{
  "stocks": [
    {
      "name": "종목명 (한글)",
      "code": "종목코드 6자리 (숫자 또는 영문 포함) 또는 null",
      "qty": 보유수량,
      "avgPrice": 평균매입가,
      "currentPrice": 현재가 또는 null,
      "returnPct": 수익률 또는 null
    }
  ]
}

규칙:
- 종목명은 정확히 표시된 대로 추출
- 종목코드(6자리, 숫자 또는 영문 포함)가 보이면 반드시 추출. 예: 005930, 0117V0. 안 보이면 null
- 수량, 가격에서 쉼표 제거하고 숫자만
- 현재가나 수익률이 보이지 않으면 null
- ETF, 펀드도 포함
- 최대 20종목까지`;

      const allStocks = [];
      const total = images.length;

      for (let i = 0; i < total; i++) {
        const img = images[i];
        sse({ type: "ocr-progress", index: i, total, status: "processing" });

        try {
          const ocrResult = await model.generateContent([
            ocrPrompt,
            { inlineData: { mimeType: img.mimeType || "image/png", data: img.base64 } },
          ]);
          const ocrText = ocrResult.response.text();

          let ocrParsed;
          try {
            ocrParsed = JSON.parse(ocrText);
          } catch {
            try {
              const cleaned = ocrText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
              ocrParsed = JSON.parse(cleaned);
            } catch {
              const match = ocrText.match(/\{[\s\S]*\}/);
              if (match) ocrParsed = JSON.parse(match[0]);
              else ocrParsed = { stocks: [] };
            }
          }

          const imgStocks = (ocrParsed?.stocks || []).map((stock) => mapOcrStock(stock, krStocksRaw));

          sse({ type: "ocr-progress", index: i, total, status: "done", stocks: imgStocks });
          allStocks.push(...imgStocks);
        } catch (err) {
          console.error(`[portfolioOcr] Image ${i} failed:`, err.message);
          sse({ type: "ocr-progress", index: i, total, status: "failed" });
        }
      }

      // 중복 제거 (symbol 기준, 첫 번째 우선)
      const seen = new Set();
      const deduped = [];
      const unmapped = [];
      for (const s of allStocks) {
        if (!s.symbol) {
          unmapped.push(s.name);
          continue;
        }
        if (!seen.has(s.symbol)) {
          seen.add(s.symbol);
          deduped.push(s);
        }
      }

      sse({ type: "ocr-done", stocks: deduped, unmapped });
      console.log(`[portfolioOcr] Done: ${deduped.length} mapped, ${unmapped.length} unmapped`);
      res.end();
    } catch (err) {
      console.error("[portfolioOcr] Error:", err);
      sse({ type: "error", message: err.message || "OCR 처리 중 오류가 발생했습니다." });
      res.end();
    }
  }
);
