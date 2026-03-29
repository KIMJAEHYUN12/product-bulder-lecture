const { FIREBASE_HOST } = require("./config");

/**
 * 종목 검색. 6자리 숫자면 종목코드로 직접 반환, 아니면 API 호출.
 * @param {string} query - 종목명 또는 종목코드
 * @returns {Promise<{symbol: string, name: string}>}
 */
async function searchStock(query) {
  const q = query.trim();

  // 6자리 숫자 → 종목코드 직접 사용
  if (/^\d{6}$/.test(q)) {
    // 현재가 API로 종목명 확인
    const res = await fetch(`${FIREBASE_HOST}/api/stock-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: [`${q}.KS`] }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const key = Object.keys(data)[0];
      if (key && data[key]?.name) {
        return { symbol: `${q}.KS`, name: data[key].name };
      }
    }
    // KS 실패 시 KQ 시도
    const res2 = await fetch(`${FIREBASE_HOST}/api/stock-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: [`${q}.KQ`] }),
      signal: AbortSignal.timeout(10000),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      const key2 = Object.keys(data2)[0];
      if (key2 && data2[key2]?.name) {
        return { symbol: `${q}.KQ`, name: data2[key2].name };
      }
    }
    return { symbol: `${q}.KS`, name: q };
  }

  // 종목명 검색
  const res = await fetch(
    `${FIREBASE_HOST}/api/stock-search?q=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`종목 검색 실패: ${res.status}`);
  const results = await res.json();
  if (!results.length) throw new Error(`"${q}" 검색 결과 없음`);

  // 첫 번째 결과 반환
  return { symbol: results[0].symbol, name: results[0].name || q };
}

module.exports = { searchStock };
