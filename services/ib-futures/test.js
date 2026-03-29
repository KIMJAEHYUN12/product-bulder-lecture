/**
 * IB Client Portal API — K200 야간선물 데이터 테스트
 *
 * 사전 준비:
 * 1. IB Client Portal Gateway 다운로드:
 *    https://www.interactivebrokers.com/en/trading/ib-api.php → Client Portal API
 * 2. 압축 해제 후 실행: bin/run.bat (Windows) 또는 bin/run.sh (Mac/Linux)
 * 3. 브라우저에서 https://localhost:5000 접속 → IB 로그인
 * 4. 이 스크립트 실행: node test.js
 */

const https = require("https");

// IB Client Portal Gateway 주소
const GATEWAY = "https://localhost:5000/v1/api";

// K200 Jun11'26 conid (IB URL에서 확인: /quote/709590994)
const K200_CONID = 709590994;

// 마켓 데이터 필드 코드
// 31=Last, 70=High, 71=Low, 82=Change, 83=Change%,
// 84=Bid, 85=Ask, 86=Volume, 7295=Open, 7762=Change Since Open
const FIELDS = "31,70,71,82,83,84,85,86,7295";

// SSL 인증서 무시 (Gateway가 self-signed cert 사용)
const agent = new https.Agent({ rejectUnauthorized: false });

async function ibFetch(path) {
  const url = `${GATEWAY}${path}`;
  const res = await fetch(url, { agent });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

// ── 1. 인증 상태 확인 ──────────────────────────────────────────────────
async function checkAuth() {
  console.log("1. 인증 상태 확인...");
  try {
    const status = await ibFetch("/iserver/auth/status");
    console.log("   인증:", status.authenticated ? "OK" : "FAIL");
    console.log("   사용자:", status.username || "N/A");
    return status.authenticated;
  } catch (e) {
    console.error("   Gateway 연결 실패:", e.message);
    console.log("\n   → IB Client Portal Gateway가 실행 중인지 확인하세요.");
    console.log("   → https://localhost:5000 에서 로그인했는지 확인하세요.");
    return false;
  }
}

// ── 2. 마켓 데이터 타입 설정 (지연 데이터) ──────────────────────────────
async function setDelayedData() {
  console.log("\n2. 15분 지연 데이터 모드 설정...");
  try {
    // marketDataType: 1=live, 3=delayed, 4=delayed-frozen
    const res = await fetch(`${GATEWAY}/iserver/marketdata/type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 3 }),
      agent,
    });
    const data = await res.json();
    console.log("   결과:", JSON.stringify(data));
  } catch (e) {
    console.log("   지연 데이터 설정 실패 (무시하고 진행):", e.message);
  }
}

// ── 3. K200 선물 시세 조회 ──────────────────────────────────────────────
async function fetchK200Snapshot() {
  console.log("\n3. K200 선물 시세 조회...");
  console.log(`   conid: ${K200_CONID}`);

  // 첫 요청은 구독 시작, 두 번째 요청부터 데이터 반환
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n   시도 ${attempt}/3...`);
    try {
      const data = await ibFetch(
        `/iserver/marketdata/snapshot?conids=${K200_CONID}&fields=${FIELDS}`
      );

      if (!data || data.length === 0) {
        console.log("   데이터 없음, 2초 후 재시도...");
        await delay(2000);
        continue;
      }

      const quote = data[0];

      // 필드가 아직 채워지지 않았으면 재시도
      if (!quote["31"] && !quote["84"]) {
        console.log("   데이터 로딩 중, 2초 후 재시도...");
        await delay(2000);
        continue;
      }

      console.log("\n   ========== K200 야간선물 시세 ==========");
      console.log(`   conid:    ${quote.conid}`);
      console.log(`   현재가:   ${quote["31"] || "N/A"}`);
      console.log(`   시가:     ${quote["7295"] || "N/A"}`);
      console.log(`   고가:     ${quote["70"] || "N/A"}`);
      console.log(`   저가:     ${quote["71"] || "N/A"}`);
      console.log(`   변동:     ${quote["82"] || "N/A"}`);
      console.log(`   변동률:   ${quote["83"] || "N/A"}`);
      console.log(`   매수호가: ${quote["84"] || "N/A"}`);
      console.log(`   매도호가: ${quote["85"] || "N/A"}`);
      console.log(`   거래량:   ${quote["86"] || "N/A"}`);
      console.log("   =======================================\n");

      // 지연 데이터 여부 확인
      if (quote["6509"]) {
        console.log(`   데이터 타입: ${quote["6509"]}`);
      }

      return quote;
    } catch (e) {
      console.error(`   조회 실패: ${e.message}`);
      if (attempt < 3) await delay(2000);
    }
  }

  console.log("   3회 시도 후에도 데이터를 받지 못했습니다.");
  return null;
}

// ── 4. conid 검색 (K200 conid를 모를 때 사용) ──────────────────────────
async function searchK200() {
  console.log("\n[참고] K200 종목 검색...");
  try {
    const res = await fetch(`${GATEWAY}/iserver/secdef/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "K200", secType: "FUT" }),
      agent,
    });
    const data = await res.json();
    if (data && data.length > 0) {
      console.log("   검색 결과:");
      for (const item of data) {
        console.log(`   - ${item.description} | conid=${item.conid} | exchange=${item.exchange || "N/A"}`);
        if (item.sections) {
          for (const sec of item.sections) {
            console.log(`     └ ${sec.secType}: months=${sec.months || "N/A"}, exchange=${sec.exchange || "N/A"}`);
          }
        }
      }
    }
  } catch (e) {
    console.log("   검색 실패:", e.message);
  }
}

// ── 실행 ────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== IB K200 야간선물 데이터 테스트 ===\n");

  const authenticated = await checkAuth();
  if (!authenticated) {
    process.exit(1);
  }

  await setDelayedData();
  await fetchK200Snapshot();
  await searchK200();

  console.log("\n테스트 완료.");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});
