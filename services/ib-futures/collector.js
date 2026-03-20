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

// 1분봉 히스토리 (key: "YYYYMMDD HH:mm:ss", value: bar)
const sessionBars = new Map();

// 현재 폴링 응답용
let currentBars = [];

// ── Firestore 저장 ──────────────────────────────────────────────────────────
async function saveToFirestore() {
  if (lastPrice <= 0) return;
  if (lastPrice === savedPrice) return;

  const change = sessionOpen > 0 ? +(lastPrice - sessionOpen).toFixed(2) : 0;
  const changePct = sessionOpen > 0
    ? +((change / sessionOpen) * 100).toFixed(2)
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
    prevClose: sessionOpen,
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

// ── 폴링 1회 실행 ───────────────────────────────────────────────────────────
function poll() {
  reqId++;
  currentBars = [];

  ib.reqHistoricalData(
    reqId,
    contract,
    "",           // endDateTime (현재)
    "3600 S",     // 최근 1시간
    "1 min",      // 1분봉
    "TRADES",
    0,            // useRTH=0 (야간 포함)
    1,            // formatDate
    false         // keepUpToDate=false (1회성 요청)
  );
}

// ── 시작 ──────────────────────────────────────────────────────────────────────
function start() {
  console.log("=== IB K200 야간선물 수집기 시작 ===");
  console.log(`모드: reqHistoricalData 폴링 (${POLL_INTERVAL / 1000}초 간격)\n`);

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

    // 첫 폴링
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

        // 세션 시가 (첫 폴링의 첫 바)
        if (sessionOpen === 0) {
          sessionOpen = currentBars[0].open;
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
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    sessionOpen = 0;
    sessionHigh = 0;
    sessionLow = Infinity;
    sessionBars.clear();
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
