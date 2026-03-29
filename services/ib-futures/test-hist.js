/**
 * IB Gateway — K200 과거 데이터 조회 테스트
 * 스트리밍 구독 없이 최근 시세를 가져올 수 있는지 확인
 */

const path = require("path");
const { IBApi, EventName, SecType } = require("@stoqey/ib");

const IB_HOST = "127.0.0.1";
const IB_PORT = 4001;
const CLIENT_ID = 2;

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
    if (now < expiry) return `${qy}${String(q).padStart(2, "0")}`;
  }
  return `${y + 1}03`;
}

const ib = new IBApi({ host: IB_HOST, port: IB_PORT, clientId: CLIENT_ID });

ib.on(EventName.connected, () => {
  console.log("[연결] 성공\n");

  const contract = {
    symbol: "K200",
    secType: SecType.FUT,
    exchange: "KSE",
    currency: "KRW",
    lastTradeDateOrContractMonth: getFrontMonth(),
  };

  console.log(`[조회] K200 ${getFrontMonth()} 최근 1시간 데이터 요청...\n`);

  // 과거 데이터 요청 (최근 1시간, 1분봉)
  ib.reqHistoricalData(
    1,                    // reqId
    contract,             // contract
    "",                   // endDateTime (빈 문자열 = 현재)
    "3600 S",             // duration (1시간)
    "1 min",              // barSize
    "TRADES",             // whatToShow
    0,                    // useRTH (0=야간 포함)
    1,                    // formatDate
    false                 // keepUpToDate
  );
});

ib.on(EventName.historicalData, (reqId, date, open, high, low, close, volume) => {
  if (date.startsWith("finished")) {
    console.log("\n[완료] 데이터 수신 끝");
    console.log(`마지막 가격: ${lastClose}`);
    ib.disconnect();
    process.exit(0);
    return;
  }
  lastClose = close;
  console.log(`${date} | O:${open} H:${high} L:${low} C:${close} V:${volume}`);
});

let lastClose = 0;

ib.on(EventName.error, (err, code, reqId) => {
  if (code === 2104 || code === 2106 || code === 2158 || code === 10167) return;
  console.error(`[에러] code=${code}: ${err}`);
});

ib.on(EventName.disconnected, () => {
  console.log("[끊김]");
  process.exit(1);
});

console.log("=== K200 과거 데이터 테스트 ===\n");
ib.connect();

// 30초 후 자동 종료
setTimeout(() => {
  console.log("\n[타임아웃] 30초 경과, 종료");
  process.exit(1);
}, 30000);
