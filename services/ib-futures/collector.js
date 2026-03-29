/**
 * IB Gateway (TWS API) → K200 야간선물 수집기
 *
 * reqHistoricalData 폴링 방식 — 30초마다 최근 5분 데이터 요청
 * Firestore config/kospi_night_futures에 저장
 *
 * 실행: node collector.js
 * 사전: IB Gateway 실행 + 로그인 완료
 */

const path = require("path");
const { IBApi, EventName, SecType } = require("@stoqey/ib");
const admin = require("firebase-admin");

// ── 설정 ──────────────────────────────────────────────────────────────────────
const IB_HOST = "127.0.0.1";
const IB_PORT = 4001;
const CLIENT_ID = 3;
const FIRESTORE_DOC = "config/kospi_night_futures";
const POLL_INTERVAL = 30000; // 30초마다 폴링

// ── Firebase 초기화 ──────────────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  console.error("[Firebase] serviceAccountKey.json을 찾을 수 없습니다.");
  process.exit(1);
}
const db = admin.firestore();

// ── 근월물 만기월 계산 ────────────────────────────────────────────────────────
function getFrontMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const quarters = [3, 6, 9, 12];
  for (const q of quarters) {
    const qy = q >= m ? y : y + 1;
    const firstDay = new Date(qy, q - 1, 1);
    const dow = firstDay.getDay();
    const firstThu = dow <= 4 ? 1 + (4 - dow) : 1 + (11 - dow);
    const secondThu = firstThu + 7;
    const expiry = new Date(qy, q - 1, secondThu, 15, 45);
    if (now < expiry) {
      const result = `${qy}${String(q).padStart(2, "0")}`;
      console.log(`[근월물] ${result} (만기: ${qy}-${String(q).padStart(2, "0")}-${secondThu})`);
      return result;
    }
  }
  return `${y + 1}03`;
}

// ── 상태 ──────────────────────────────────────────────────────────────────────
let ib = null;
let contract = null;
let reqId = 0;
let savedPrice = 0;
let pollTimer = null;

// 세션 데이터
let sessionOpen = 0;
let sessionHigh = 0;
let sessionLow = Infinity;
let lastPrice = 0;
let lastVolume = 0;
let lastBarDate = "";
let prevClose = 0;       // 정규장 종가 (Firestore에서 로드)
let isFirstPoll = true;  // 첫 폴링은 세션 전체 데이터 요청

// 1분봉 히스토리 (key: "YYYYMMDD HH:mm:ss", value: bar)
const sessionBars = new Map();

// 현재 폴링 응답용
let currentBars = [];

// ── 세션 시작(18:00)부터 현재까지 경과 시간 계산 ─────────────────────────────
function getSessionDurationStr() {
  const now = new Date();
  const h = now.getHours();

  const sessionStart = new Date(now);
  if (h >= 18) {
    sessionStart.setHours(18, 0, 0, 0);
  } else {
    // 자정 이후 → 전일 18:00 기준
    sessionStart.setDate(sessionStart.getDate() - 1);
    sessionStart.setHours(18, 0, 0, 0);
  }

  const durationSec = Math.floor((now - sessionStart) / 1000);
  const clamped = Math.max(300, Math.min(durationSec, 43200));
  return `${clamped} S`;
}

// ── Firestore에서 정규장 종가 로드 ───────────────────────────────────────────
async function loadPrevClose() {
  try {
    const doc = await db.doc("config/kospi_futures_cache").get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.data?.price) {
        prevClose = data.data.price;
        console.log(`[prevClose] 정규장 종가 로드: ${prevClose}`);
        return;
      }
    }
    console.log("[prevClose] 정규장 데이터 없음 — sessionOpen으로 대체 예정");
  } catch (e) {
    console.error("[prevClose] 로드 실패:", e.message);
  }
}

// ── Firestore 저장 ──────────────────────────────────────────────────────────
async function saveToFirestore() {
  if (lastPrice <= 0) return;
  if (lastPrice === savedPrice) return;

  // 변동 기준: 정규장 종가(prevClose) 우선, 없으면 세션 시가
  const basePrice = prevClose > 0 ? prevClose : sessionOpen;
  const change = basePrice > 0 ? +(lastPrice - basePrice).toFixed(2) : 0;
  const changePct = basePrice > 0
    ? +((change / basePrice) * 100).toFixed(2)
    : 0;

  // sessionBars → 정렬된 배열 (최대 720개)
  const barsArray = Array.from(sessionBars.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-720);

  const record = {
    name: "코스피200선물(야간)",
    code: "K200",
    price: lastPrice,
    change,
    changePct,
    open: sessionOpen,
    high: sessionHigh,
    low: sessionLow === Infinity ? lastPrice : sessionLow,
    prevClose: prevClose > 0 ? prevClose : sessionOpen,
    volume: lastVolume,
    bid: 0,
    ask: 0,
    basis: 0,
    isNight: true,
    source: "IB",
    updatedAt: Date.now(),
    bars: barsArray,
  };

  try {
    await db.doc(FIRESTORE_DOC).set(record);
    savedPrice = lastPrice;
    const arrow = change >= 0 ? "+" : "";
    console.log(
      `  [저장] ${lastPrice} (${arrow}${change}, ${arrow}${changePct}%) vol=${lastVolume} | ${lastBarDate}`
    );
  } catch (e) {
    console.error("  [저장 실패]", e.message);
  }
}

// ── 야간 세션 시간인지 확인 (18:00~06:00) ────────────────────────────────────
function isNightSessionTime() {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

// ── 폴링 1회 실행 ───────────────────────────────────────────────────────────
function poll() {
  // 18시 전이면 폴링 스킵 (어젯밤 데이터 방지)
  if (!isNightSessionTime()) {
    console.log(`[스킵] 야간 세션 시간 아님 (18:00~06:00 대기 중)`);
    return;
  }

  reqId++;
  currentBars = [];

  // 첫 폴링: 세션 시작(18:00)부터 전체 데이터 요청 → 늦게 켜도 복구
  // 이후 폴링: 최근 1시간 (30초 간격이니 충분)
  const duration = isFirstPoll ? getSessionDurationStr() : "3600 S";
  if (isFirstPoll) {
    console.log(`[첫 폴링] 세션 시작부터 전체 요청: ${duration}`);
  }

  ib.reqHistoricalData(
    reqId,
    contract,
    "",           // endDateTime (현재)
    duration,     // 첫 폴링: 세션 전체, 이후: 최근 1시간
    "1 min",      // 1분봉
    "TRADES",
    0,            // useRTH=0 (야간 포함)
    1,            // formatDate
    false         // keepUpToDate=false (1회성 요청)
  );
}

// ── 시작 ──────────────────────────────────────────────────────────────────────
async function start() {
  console.log("=== IB K200 야간선물 수집기 시작 ===");
  console.log(`모드: reqHistoricalData 폴링 (${POLL_INTERVAL / 1000}초 간격)\n`);

  // 정규장 종가 로드 (변동 계산 기준)
  await loadPrevClose();

  contract = {
    symbol: "K200",
    secType: SecType.FUT,
    exchange: "KSE",
    currency: "KRW",
    lastTradeDateOrContractMonth: getFrontMonth(),
  };

  ib = new IBApi({ host: IB_HOST, port: IB_PORT, clientId: CLIENT_ID });

  ib.on(EventName.connected, () => {
    console.log("[연결] IB Gateway 연결 성공");
    console.log("[폴링] 30초마다 최신 데이터 요청 시작...\n");

    // 첫 폴링 (세션 시작부터 전체 데이터 요청)
    poll();

    // 이후 30초마다 반복
    pollTimer = setInterval(() => {
      poll();
    }, POLL_INTERVAL);
  });

  ib.on(EventName.historicalData, (id, date, open, high, low, close, volume) => {
    if (id !== reqId) return;

    if (date.startsWith("finished")) {
      // 이번 폴링 완료 — 마지막 바가 최신 데이터
      if (currentBars.length > 0) {
        const latest = currentBars[currentBars.length - 1];

        if (isFirstPoll) {
          console.log(`[첫 폴링 완료] ${currentBars.length}봉 수신 (세션 전체)`);
          isFirstPoll = false;
        }

        // 세션 시가: 전체 바 중 가장 이른 시간의 시가 (늦게 켜도 정확)
        if (sessionOpen === 0) {
          const earliest = currentBars.reduce((a, b) => (a.date < b.date ? a : b));
          sessionOpen = earliest.open;
          console.log(`[세션 시가] ${sessionOpen} (${earliest.date})`);
        }

        // currentBars → sessionBars 병합 (중복 제거)
        for (const bar of currentBars) {
          sessionBars.set(bar.date, bar);
        }

        // 이번 폴링의 모든 바에서 고/저 갱신
        for (const bar of currentBars) {
          if (bar.high > sessionHigh) sessionHigh = bar.high;
          if (bar.low < sessionLow) sessionLow = bar.low;
        }

        lastPrice = latest.close;
        lastVolume = latest.volume;
        lastBarDate = latest.date;

        const now = new Date().toLocaleTimeString("ko-KR");
        console.log(`[폴링 ${now}] ${latest.date} | C:${latest.close} V:${latest.volume} (${currentBars.length}봉)`);

        saveToFirestore();
      } else {
        console.log(`[폴링] 데이터 없음`);
      }
      return;
    }

    // 바 수집
    currentBars.push({ date, open, high, low, close, volume });
  });

  ib.on(EventName.error, (err, code) => {
    if ([2104, 2106, 2158, 10167].includes(code)) return;
    console.error(`[에러] code=${code}: ${err}`);
    if (code === 321) {
      console.log("[안내] 야간 선물 거래시간(18:00~05:00)이 아닐 수 있습니다.");
    }
  });

  ib.on(EventName.disconnected, () => {
    console.log("[연결 끊김] 폴링 중지, 10초 후 재연결...");
    console.log(`  세션 데이터 보존: ${sessionBars.size}봉, open=${sessionOpen}`);
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    // 재연결 시 세션 데이터 보존 (bars, open, high, low 유지)
    // 첫 폴링으로 빠진 구간 보충
    isFirstPoll = true;
    setTimeout(() => {
      console.log("[재연결] 시도...");
      ib.connect();
    }, 10000);
  });

  console.log(`[연결] ${IB_HOST}:${IB_PORT}`);
  ib.connect();
}

// 종료 처리
process.on("SIGINT", () => {
  console.log("\n[종료] 수집기 중지");
  if (pollTimer) clearInterval(pollTimer);
  if (ib) {
    ib.disconnect();
  }
  process.exit(0);
});

start();
