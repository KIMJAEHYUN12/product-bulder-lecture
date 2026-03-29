const { FIREBASE_HOST } = require("./config");

/**
 * 현재가 + 종목 기본정보 조회
 * @param {string} symbol - 종목 심볼 (예: "005930.KS")
 * @returns {Promise<{name: string, price: number, changePct: number, currency: string}>}
 */
async function fetchPriceData(symbol) {
  const res = await fetch(`${FIREBASE_HOST}/api/stock-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: [symbol] }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`현재가 API 오류: ${res.status}`);
  const data = await res.json();

  const info = data[symbol];
  if (!info) throw new Error(`현재가 데이터 없음: ${symbol}`);

  return {
    name: info.name,
    price: info.price,
    changePct: info.changePct,
    currency: info.currency || "KRW",
  };
}

module.exports = { fetchPriceData };
