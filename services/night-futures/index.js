/**
 * KOSPI200 야간선물 실시간 시세 수집기
 * KIS WebSocket (H0IFCNT0) → Firestore config/kospi_night_futures
 *
 * Cloud Run에서 실행, Cloud Scheduler로 18:00 start / 06:00 stop
 */

const express = require("express");
const WebSocket = require("ws");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ── 설정 ──────────────────────────────────────────────────────────────────────
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const WS_URL = "ws://ops.koreainvestment.com:21000";
const TR_ID = "H0IFCNT0"; // 국내선물옵션 실시간체결
const FIRESTORE_DOC = "config/kospi_night_futures";
const DEBOUNCE_MS = 3000;
const MAX_RECONNECT_DELAY = 60000;

// ── 근월물 선물 종목코드 계산 ─────────────────────────────────────────────────
function getSecondThursday(year, month) {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay();
  const firstThu = dow <= 4 ? 1 + (4 - dow) : 1 + (11 - dow);
  return new Date(year, month - 1, firstThu + 7);
}

function getCurrentFuturesCode() {
  const now = new Date();
  const kst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
  const y = kst.getFullYear();
  const m = kst.getMonth() + 1;
  const q = [3, 6, 9, 12];

  for (let i = 0; i < q.length; i++) {
    const qm = q[i];
    const qy = qm >= m ? y : y + 1;
    const expiry = getSecondThursday(qy, qm);
    const expiryLimit = new Date(expiry);
    expiryLimit.setHours(15, 45, 0, 0);
    if (kst < expiryLimit) {
      return `A016${String(qm).padStart(2, "0")}`;
    }
  }
  return "A01603";
}

// ── 상태 ──────────────────────────────────────────────────────────────────────
let ws = null;
let approvalKey = null;
let isRunning = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let debounceTimer = null;
let lastData = null;
let currentTrKey = null;

// ── 승인키 발급 ───────────────────────────────────────────────────────────────
async function getApprovalKey() {
  const res = await fetch("https://openapi.koreainvestment.com:9443/oauth2/Approval", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      secretkey: KIS_APP_SECRET,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!data.approval_key) {
    throw new Error(`승인키 발급 실패: ${JSON.stringify(data)}`);
  }
  console.log("[승인키] 발급 완료");
  return data.approval_key;
}

// ── 체결 데이터 파싱 ──────────────────────────────────────────────────────────
function parseTickData(raw) {
  // 수신 형식: 0|H0IFCNT0|001|data (파이프 구분)
  // data 내부: ^ 구분 필드
  const pipes = raw.split("|");
  if (pipes.length < 4) return null;

  const trId = pipes[1];
  if (trId !== TR_ID) return null;

  const fields = pipes[3].split("^");
  console.log(`[파싱] 필드 수=${fields.length}, 종목=${fields[0]}, 가격=${fields[2]}`);

  if (fields.length < 10) return null;

  const signCode = fields[4]; // 1=상한, 2=상승, 3=보합, 4=하한, 5=하락
  const isDown = signCode === "4" || signCode === "5";
  const change = parseFloat(fields[3]) || 0;
  const changePct = parseFloat(fields[5]) || 0;

  return {
    name: "코스피200선물(야간)",
    code: fields[0] || currentTrKey,
    price: parseFloat(fields[2]) || 0,
    change: isDown ? -Math.abs(change) : Math.abs(change),
    changePct: isDown ? -Math.abs(changePct) : Math.abs(changePct),
    open: parseFloat(fields[6]) || 0,
    high: parseFloat(fields[7]) || 0,
    low: parseFloat(fields[8]) || 0,
    prevClose: 0,
    volume: parseInt(fields[9], 10) || 0,
    basis: 0,
    isNight: true,
    tickTime: fields[1] || "",
    updatedAt: Date.now(),
  };
}

// ── Firestore 저장 (디바운스) ─────────────────────────────────────────────────
function scheduleSave(data) {
  lastData = data;
  if (lastData.prevClose === 0 && lastData.price && lastData.change) {
    lastData.prevClose = +(lastData.price - lastData.change).toFixed(2);
  }

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await db.doc(FIRESTORE_DOC).set(lastData);
      console.log(`[저장] ${lastData.price} (${lastData.change > 0 ? "+" : ""}${lastData.change}) vol=${lastData.volume}`);
    } catch (e) {
      console.error("[저장 실패]", e.message);
    }
  }, DEBOUNCE_MS);
}

// ── WebSocket 연결 ────────────────────────────────────────────────────────────
async function connectWebSocket() {
  if (!approvalKey) {
    approvalKey = await getApprovalKey();
  }

  currentTrKey = getCurrentFuturesCode();
  console.log(`[WS] 연결 시도... TR_ID=${TR_ID}, TR_KEY=${currentTrKey}`);
  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("[WS] 연결됨");
    reconnectAttempts = 0;

    const subscribeMsg = JSON.stringify({
      header: {
        approval_key: approvalKey,
        custtype: "P",
        tr_type: "1",
        "content-type": "utf-8",
      },
      body: {
        input: {
          tr_id: TR_ID,
          tr_key: currentTrKey,
        },
      },
    });
    ws.send(subscribeMsg);
    console.log(`[WS] 구독 요청: ${TR_ID} / ${currentTrKey}`);
  });

  ws.on("message", (rawBuf) => {
    const msg = rawBuf.toString();

    if (msg.startsWith("{")) {
      try {
        const json = JSON.parse(msg);
        if (json.header?.tr_id === "PINGPONG") {
          return; // PINGPONG은 무시 (텍스트 응답 시 서버 JSON 파싱 에러)
        }
        console.log("[WS] JSON:", JSON.stringify(json.header || {}), JSON.stringify(json.body || {}));
      } catch {
        // ignore
      }
      return;
    }

    // 체결 데이터 (파이프 구분)
    const tickData = parseTickData(msg);
    if (tickData) {
      scheduleSave(tickData);
    } else {
      // 디버깅: 파싱 실패한 메시지 기록
      console.log("[WS] 미파싱:", msg.substring(0, 200));
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[WS] 연결 종료: code=${code} reason=${reason}`);
    ws = null;
    if (isRunning) {
      scheduleReconnect();
    }
  });

  ws.on("error", (err) => {
    console.error("[WS] 에러:", err.message);
    if (ws) {
      try { ws.close(); } catch {}
    }
  });
}

// ── 재연결 (지수 백오프) ──────────────────────────────────────────────────────
function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  console.log(`[WS] ${delay}ms 후 재연결 (#${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    if (isRunning) {
      connectWebSocket().catch((e) => {
        console.error("[WS] 재연결 실패:", e.message);
        scheduleReconnect();
      });
    }
  }, delay);
}

// ── 시작/종료 ─────────────────────────────────────────────────────────────────
async function start() {
  if (isRunning) return "already running";
  isRunning = true;
  approvalKey = null;
  reconnectAttempts = 0;
  try {
    await connectWebSocket();
    return "started";
  } catch (e) {
    console.error("[시작 실패]", e.message);
    isRunning = false;
    throw e;
  }
}

function stop() {
  isRunning = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (ws) {
    try { ws.close(1000, "stop requested"); } catch {}
    ws = null;
  }
  console.log("[중지] WebSocket 연결 해제됨");
  return "stopped";
}

// ── Express 서버 ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/health", (_req, res) => {
  res.json({
    status: isRunning ? "running" : "idle",
    wsConnected: ws !== null && ws.readyState === WebSocket.OPEN,
    trId: TR_ID,
    trKey: currentTrKey,
    lastPrice: lastData?.price || null,
    lastUpdate: lastData?.updatedAt || null,
    reconnectAttempts,
  });
});

app.post("/start", async (_req, res) => {
  try {
    const result = await start();
    res.json({ ok: true, result, trId: TR_ID, trKey: currentTrKey });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/stop", (_req, res) => {
  const result = stop();
  res.json({ ok: true, result });
});

app.listen(PORT, () => {
  console.log(`[서버] night-futures 서비스 시작 (port=${PORT})`);
});
