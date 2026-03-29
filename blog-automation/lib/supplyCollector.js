const { FIREBASE_HOST } = require("./config");

/**
 * 수급 동향 데이터 수집
 * @param {string} symbol - 종목 심볼 (예: "005930.KS")
 * @returns {Promise<object>}
 */
async function fetchSupplyData(symbol) {
  const res = await fetch(`${FIREBASE_HOST}/api/investor-trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`수급 API 오류: ${res.status}`);
  const data = await res.json();

  // 최근 10거래일 추출
  const recent10 = (data.daily || []).slice(-10);

  // 추세 요약
  const summary = summarizeTrend(recent10);

  return {
    daily: recent10,
    cumulative: data.cumulative || {},
    summary,
  };
}

function summarizeTrend(daily) {
  if (!daily.length) return { foreign: "데이터 없음", institution: "데이터 없음", individual: "데이터 없음" };

  const sum = (arr, key) => arr.reduce((s, d) => s + (d[key] || 0), 0);

  const foreignNet = sum(daily, "foreign");
  const instNet = sum(daily, "institution");
  const indivNet = sum(daily, "individual");

  const describe = (val, name) => {
    if (val > 0) return `${name} 순매수 ${Math.abs(val).toLocaleString()}주`;
    if (val < 0) return `${name} 순매도 ${Math.abs(val).toLocaleString()}주`;
    return `${name} 중립`;
  };

  return {
    foreign: describe(foreignNet, "외국인"),
    institution: describe(instNet, "기관"),
    individual: describe(indivNet, "개인"),
    foreignNet,
    institutionNet: instNet,
    individualNet: indivNet,
  };
}

module.exports = { fetchSupplyData };
