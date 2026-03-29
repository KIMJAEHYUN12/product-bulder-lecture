const { DART_API_KEY, DART_BASE_URL } = require("./config");
const corpCodes = require("./dartCorpCodes.json");

const UA = { "User-Agent": "Mozilla/5.0 (compatible)" };

/**
 * 종목코드(6자리) → DART corp_code 변환
 */
function getCorpCode(stockCode) {
  return corpCodes[stockCode] || null;
}

/**
 * DART 연간 재무제표에서 매출/영업이익/당기순이익 추출
 * @param {string} corpCode - DART 고유번호
 * @param {number} year - 사업연도
 * @returns {Promise<object|null>}
 */
async function fetchAnnualFinancials(corpCode, year) {
  // CFS(연결) 우선, 없으면 OFS(개별)
  for (const fsDiv of ["CFS", "OFS"]) {
    const url = `${DART_BASE_URL}/fnlttSinglAcntAll.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=${fsDiv}`;
    try {
      const r = await fetch(url, {
        headers: UA,
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data.status !== "000" || !data.list) continue;

      return {
        year,
        fsDiv,
        revenue: extractAmount(data.list, "IS", "매출액") ?? extractAmount(data.list, "IS", "수익(매출액)"),
        operatingProfit: extractAmount(data.list, "IS", "영업이익") ?? extractAmount(data.list, "IS", "영업손실"),
        netIncome: extractNetIncome(data.list),
        equity: extractEquity(data.list),
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 3개년 재무제표 수집
 */
async function fetchFinancials3Y(stockCode) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) return { error: `DART corp_code 없음: ${stockCode}`, years: [] };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear - 2, currentYear - 3];

  const results = await Promise.all(
    years.map((y) => fetchAnnualFinancials(corpCode, y))
  );

  return {
    corpCode,
    years: results.filter(Boolean),
  };
}

/**
 * DART 최근 공시 목록 조회
 */
async function fetchDisclosures(stockCode, days = 30) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) return [];

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `${DART_BASE_URL}/list.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_count=20`;

  try {
    const r = await fetch(url, {
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.status !== "000" || !data.list) return [];

    return data.list.map((item) => ({
      date: item.rcept_dt,
      title: item.report_nm,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
    }));
  } catch {
    return [];
  }
}

// --- 내부 헬퍼 ---

function extractAmount(list, sjDiv, accountName) {
  const items = list.filter((item) => item.sj_div === sjDiv || item.sj_div === "CIS");
  const target = items.find(
    (item) => item.account_nm && item.account_nm.includes(accountName)
  );
  if (!target) return null;
  return parseAmount(target.thstrm_amount);
}

function extractNetIncome(list) {
  const isItems = list.filter((item) => item.sj_div === "IS" || item.sj_div === "CIS");
  const hasNI = (nm) => nm && (nm.includes("당기순이익") || nm.includes("당기순손실"));

  let target = isItems.find(
    (item) => item.account_nm && item.account_nm.includes("지배기업") && hasNI(item.account_nm)
  );
  if (!target) {
    target = isItems.find(
      (item) => hasNI(item.account_nm) && !item.account_nm.includes("주당")
    );
  }
  if (!target) return null;
  return parseAmount(target.thstrm_amount);
}

function extractEquity(list) {
  const bsItems = list.filter((item) => item.sj_div === "BS");
  let target = bsItems.find(
    (item) => item.account_nm && item.account_nm.includes("지배기업") && item.account_nm.includes("자본")
  );
  if (!target) {
    target = bsItems.find((item) => item.account_nm === "자본총계");
  }
  if (!target) return null;
  return parseAmount(target.thstrm_amount);
}

function parseAmount(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/,/g, ""), 10);
  return isNaN(n) ? null : n;
}

/**
 * 분기보고서 재무제표 수집
 * 3분기 → 반기 → 1분기 순으로 최신 분기보고서 탐색
 */
async function fetchQuarterlyFinancials(corpCode) {
  const currentYear = new Date().getFullYear();
  const reprtCodes = [
    { code: "11014", label: "3분기" },
    { code: "11012", label: "반기" },
    { code: "11013", label: "1분기" },
  ];
  const yearsToTry = [currentYear, currentYear - 1];

  for (const year of yearsToTry) {
    for (const { code, label } of reprtCodes) {
      for (const fsDiv of ["CFS", "OFS"]) {
        const url = `${DART_BASE_URL}/fnlttSinglAcntAll.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${code}&fs_div=${fsDiv}`;
        try {
          const r = await fetch(url, {
            headers: UA,
            signal: AbortSignal.timeout(15000),
          });
          if (!r.ok) continue;
          const data = await r.json();
          if (data.status !== "000" || !data.list) continue;

          return {
            year,
            quarter: label,
            fsDiv,
            revenue: extractAmount(data.list, "IS", "매출액") ?? extractAmount(data.list, "IS", "수익(매출액)"),
            operatingProfit: extractAmount(data.list, "IS", "영업이익") ?? extractAmount(data.list, "IS", "영업손실"),
            netIncome: extractNetIncome(data.list),
            equity: extractEquity(data.list),
          };
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}

/**
 * 주요사항보고서 구조화 데이터 수집
 * 투자 판단에 중요한 8개 유형 병렬 조회
 */
async function fetchMajorReports(corpCode, months = 6) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const bgn = fmt(start);
  const endDe = fmt(end);

  const reportTypes = [
    { endpoint: "piicDecsn.json", label: "유상증자", fields: ["nstk_ostk_cnt", "slprc", "fdpp_fclt"] },
    { endpoint: "fricDecsn.json", label: "무상증자", fields: ["nstk_asstd_bfclt", "nstk_ostk_cnt"] },
    { endpoint: "tsstkAqDecsn.json", label: "자기주식취득", fields: ["aq_planqy", "aq_dd", "aq_pp"] },
    { endpoint: "tsstkDpDecsn.json", label: "자기주식처분", fields: ["dp_planqy", "dp_dd", "dp_pp"] },
    { endpoint: "cmpMgDecsn.json", label: "합병", fields: ["mgsc", "mgicd", "mg_rt"] },
    { endpoint: "cmpDvDecsn.json", label: "분할", fields: ["dvrt", "dvdnm"] },
    { endpoint: "bsnInhDecsn.json", label: "영업양수", fields: ["inhsm", "inhdd", "tm_pp"] },
    { endpoint: "otcprStkInvscrInhDecsn.json", label: "타법인주식양수", fields: ["inhsm", "inhdd", "ivstkstt_cn"] },
  ];

  const results = await Promise.allSettled(
    reportTypes.map(async ({ endpoint, label, fields }) => {
      const url = `${DART_BASE_URL}/${endpoint}?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bgn_de=${bgn}&end_de=${endDe}`;
      try {
        const r = await fetch(url, {
          headers: UA,
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) return null;
        const data = await r.json();
        if (data.status !== "000" || !data.list) return null;

        return {
          type: label,
          items: data.list.map((item) => {
            const entry = { rcept_dt: item.rcept_dt, rcept_no: item.rcept_no };
            for (const f of fields) {
              if (item[f] !== undefined) entry[f] = item[f];
            }
            return entry;
          }),
        };
      } catch {
        return null;
      }
    })
  );

  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

/**
 * 공시 키워드 태깅
 */
const DISCLOSURE_KEYWORDS = ["계약", "매출", "증자", "합병", "분할", "자기주식", "소송", "특허", "CB", "BW", "유상", "무상", "배당", "분기보고서", "사업보고서"];

function tagDisclosure(title) {
  const tags = [];
  for (const kw of DISCLOSURE_KEYWORDS) {
    if (title.includes(kw)) tags.push(kw);
  }
  return tags;
}

/**
 * 통합 DART 데이터 수집
 * 연간 재무제표 + 분기보고서 + 주요사항보고서 + 공시 목록 병렬 수집
 */
async function fetchAllDartData(stockCode) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) return { error: `DART corp_code 없음: ${stockCode}` };

  const currentYear = new Date().getFullYear();
  const annualYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  const [annualResults, quarterly, majorReports, disclosures] = await Promise.allSettled([
    Promise.all(annualYears.map((y) => fetchAnnualFinancials(corpCode, y))),
    fetchQuarterlyFinancials(corpCode),
    fetchMajorReports(corpCode, 6),
    fetchDisclosuresExtended(corpCode, 180),
  ]);

  return {
    corpCode,
    years: annualResults.status === "fulfilled" ? annualResults.value.filter(Boolean) : [],
    quarterly: quarterly.status === "fulfilled" ? quarterly.value : null,
    majorReports: majorReports.status === "fulfilled" ? majorReports.value : [],
    disclosures: disclosures.status === "fulfilled" ? disclosures.value : [],
  };
}

/**
 * 확장 공시 목록 (180일, 키워드 태깅 포함) — corpCode 직접 받는 내부 함수
 */
async function fetchDisclosuresExtended(corpCode, days = 180) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `${DART_BASE_URL}/list.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bgn_de=${fmt(start)}&end_de=${fmt(end)}&page_count=50`;

  try {
    const r = await fetch(url, {
      headers: UA,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.status !== "000" || !data.list) return [];

    return data.list.map((item) => ({
      date: item.rcept_dt,
      title: item.report_nm,
      tags: tagDisclosure(item.report_nm),
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
    }));
  } catch {
    return [];
  }
}

module.exports = { fetchFinancials3Y, fetchDisclosures, fetchAllDartData, getCorpCode };
