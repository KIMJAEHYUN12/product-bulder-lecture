const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// admin.initializeApp()은 index.js에서 1회만 호출
const db = admin.firestore();

const ECOS_KEY = "M03J9WH5CQ3WX60HZKND";

// ── 유틸 ──────────────────────────────────────────────────
function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

// ── ECOS API (한국은행) ───────────────────────────────────
async function ecosFetch(statCode, itemCode, startDate, endDate, cycle = "D") {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_KEY}/json/kr/1/100/${statCode}/${cycle}/${startDate}/${endDate}/${itemCode}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ECOS ${statCode}/${itemCode} ${res.status}`);
  const json = await res.json();
  const rows = json?.StatisticSearch?.row;
  if (!rows || rows.length === 0) return null;
  // ECOS는 시간순 정렬 → 마지막 row가 최신 데이터
  const lastRow = rows[rows.length - 1];
  return parseFloat(lastRow.DATA_VALUE);
}

// ── Yahoo Finance 지수 ───────────────────────────────────
async function yahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result?.meta) return null;
  const price = result.meta.regularMarketPrice;
  // 차트 데이터에서 전일 종가 직접 계산 (meta 필드가 한국 지수에서 부정확)
  // 날짜별 중복 제거 후 마지막 2개 날짜의 종가 사용
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const byDate = new Map();
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && closes[i] > 0) {
      const dateKey = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      byDate.set(dateKey, closes[i]);
    }
  }
  const dailyCloses = [...byDate.values()];
  const prevClose = dailyCloses.length >= 2
    ? dailyCloses[dailyCloses.length - 2]
    : result.meta.chartPreviousClose;
  return {
    price,
    change: prevClose ? price - prevClose : 0,
    changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
  };
}

// ── Naver 투자자 동향 (KODEX 200 ETF 대용) ────────────────
function parseNaverInvestorSpans(html) {
  const spans = [];
  const re = /<span class="tah[^"]*">([^<]+)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) spans.push(m[1].trim());

  const dateRe = /^(\d{4}\.\d{2}\.\d{2})$/;
  const parseNum = (s) => parseInt((s || "0").replace(/[+,]/g, ""), 10) || 0;
  const rows = [];
  let i = 0;
  while (i < spans.length) {
    const dm = dateRe.exec(spans[i]);
    if (dm) {
      const date = dm[1].replace(/\./g, "");
      if (i + 8 < spans.length) {
        const rawRate = parseFloat((spans[i + 3] || "0").replace(/[+,%]/g, "")) || 0;
        rows.push({
          date,
          institution: parseNum(spans[i + 5]),
          foreign: parseNum(spans[i + 6]),
        });
      }
      i += 9;
    } else {
      i++;
    }
  }
  return rows;
}

async function fetchInvestorTrend() {
  try {
    const code = "069500"; // KODEX 200 ETF
    const pages = [1, 2]; // 2페이지 = ~40거래일
    const htmlPages = await Promise.all(
      pages.map((p) =>
        fetch(`https://finance.naver.com/item/frgn.naver?code=${code}&page=${p}`, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
          signal: AbortSignal.timeout(8000),
        }).then((r) => r.text())
      )
    );

    const allRows = [];
    for (const html of htmlPages) {
      allRows.push(...parseNaverInvestorSpans(html));
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
        foreign: row.foreign,
        institution: row.institution,
        individual,
      });
    }

    // 최신순 정렬
    daily.sort((a, b) => b.date.localeCompare(a.date));

    const latest = daily[0] || { date: "", foreign: 0, institution: 0, individual: 0 };
    const recent5 = daily.slice(0, 5);
    const recent5Sum = {
      foreign: recent5.reduce((s, d) => s + d.foreign, 0),
      institution: recent5.reduce((s, d) => s + d.institution, 0),
      individual: recent5.reduce((s, d) => s + d.individual, 0),
    };

    return {
      latest,
      recent5Sum,
      daily: daily.slice(0, 10),
    };
  } catch (err) {
    console.warn("investorTrend fetch failed:", err.message);
    return null;
  }
}

// ── CNN Fear & Greed Index ────────────────────────────────
async function fetchFearGreed() {
  try {
    const url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const current = json?.fear_and_greed;
    if (!current) return null;
    const value = Math.round(current.score);
    const previous = json?.fear_and_greed_historical?.previous_close
      ? Math.round(json.fear_and_greed_historical.previous_close)
      : null;
    const labelMap = { "extreme fear": "극단적 공포", "fear": "공포", "neutral": "중립", "greed": "탐욕", "extreme greed": "극단적 탐욕" };
    const label = labelMap[(current.rating || "").toLowerCase()] || current.rating || "";
    return { value, label, previous };
  } catch (err) {
    console.warn("fearGreed fetch failed:", err.message);
    return null;
  }
}

// ── KOSPI PER/배당수익률 (ECOS) ────────────────────────────
function thisMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

async function fetchKospiValuation() {
  try {
    const tm = thisMonth();
    const m6 = monthsAgo(6);
    const [perResult, divResult] = await Promise.allSettled([
      ecosFetch("901Y014", "1110000", m6, tm, "M"),
      ecosFetch("901Y014", "1100000", m6, tm, "M"),
    ]);
    const per = perResult.status === "fulfilled" ? perResult.value : null;
    const dividendYield = divResult.status === "fulfilled" ? divResult.value : null;
    if (per === null && dividendYield === null) return null;
    return { per, dividendYield };
  } catch (err) {
    console.warn("kospiValuation fetch failed:", err.message);
    return null;
  }
}

// ── 프로그램 매매 (Naver) ──────────────────────────────────
async function fetchProgramTrading() {
  try {
    const url = "https://finance.naver.com/sise/programDailyTrade.naver";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 일별 프로그램매매 테이블에서 차익/비차익/전체 금액 추출
    const spanRe = /<span class="tah[^"]*">([^<]+)<\/span>/g;
    const spans = [];
    let m;
    while ((m = spanRe.exec(html)) !== null) spans.push(m[1].trim());

    const dateRe = /^\d{4}\.\d{2}\.\d{2}$/;
    const parseNum = (s) => parseInt((s || "0").replace(/[+,]/g, ""), 10) || 0;

    // 첫 번째 날짜 행(최신)에서 데이터 추출
    for (let i = 0; i < spans.length; i++) {
      if (!dateRe.test(spans[i])) continue;
      // 날짜 이후 span들: 매도/매수/순매수 × (차익/비차익/전체)
      // 구조: 날짜, 전체매도, 전체매수, 전체순매수, 차익매도, 차익매수, 차익순매수, 비차익매도, 비차익매수, 비차익순매수
      if (i + 9 >= spans.length) break;
      const date = spans[i].replace(/\./g, "");
      const totalBuy = parseNum(spans[i + 2]);
      const totalSell = parseNum(spans[i + 1]);
      const totalNet = parseNum(spans[i + 3]);
      const arbNet = parseNum(spans[i + 6]);
      const nonArbNet = parseNum(spans[i + 9]);

      return {
        date,
        totalBuy,
        totalSell,
        totalNet,
        arbNet,
        nonArbNet,
      };
    }
    return null;
  } catch (err) {
    console.warn("programTrading fetch failed:", err.message);
    return null;
  }
}

// ── 공매도 잔고 (KRX) ──────────────────────────────────────
async function fetchShortSelling() {
  try {
    const url = `https://data.krx.co.kr/comm/bldAttend498/getJsonData.cmd`;

    // 공매도는 T+2 공시 → 최근 5영업일 순차 시도
    for (let i = 2; i <= 7; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const td = daysAgo(i);
      const body = `bld=dbms/MDC/STAT/srt/MDCSTAT30101&locale=ko_KR&mktId=STK&trdDd=${td}&share=1`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mozilla/5.0 (compatible)",
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const rows = json?.output || [];
      if (rows.length === 0) continue;

      let totalBalance = 0;
      for (const row of rows) {
        totalBalance += parseInt((row.BAL_QTY || "0").replace(/,/g, ""), 10) || 0;
      }
      return { balance: totalBalance, ratio: null, date: td };
    }
    return null;
  } catch (err) {
    console.warn("shortSelling fetch failed:", err.message);
    return null;
  }
}

// ── ECOS 예탁금/신용 ──────────────────────────────────────
async function fetchMarketHealth() {
  try {
    const m6 = monthsAgo(6);
    const tm = thisMonth();

    const [depositResult, creditResult] = await Promise.allSettled([
      // 고객예탁금 (억원) — 통계코드: 901Y056, 항목: S14A1A0A0 (월별 통계)
      ecosFetch("901Y056", "S14A1A0A0", m6, tm, "M"),
      // 신용융자잔고 (억원) — 통계코드: 901Y056, 항목: S14A2A0A0 (월별 통계)
      ecosFetch("901Y056", "S14A2A0A0", m6, tm, "M"),
    ]);

    const deposit = depositResult.status === "fulfilled" ? depositResult.value : null;
    const credit = creditResult.status === "fulfilled" ? creditResult.value : null;

    if (deposit === null && credit === null) return null;

    return {
      customerDeposit: deposit,
      creditLoan: credit,
    };
  } catch (err) {
    console.warn("marketHealth fetch failed:", err.message);
    return null;
  }
}

// ── 메인 함수: capitalMarket ──────────────────────────────
exports.capitalMarket = onRequest({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
  try {
    // Firestore 캐시 확인 (1시간 TTL)
    const cacheDoc = await db.doc("cache/capital_market").get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      if (cached.expiresAt > Date.now()) {
        res.set("Cache-Control", "public, max-age=600");
        return res.json(cached.data);
      }
    }

    const td = today();
    const d30 = daysAgo(30);

    // 병렬 호출
    const [
      // Yahoo 주식지수 6개
      kospiQ, kosdaqQ, dowQ, nasdaqQ, nikkeiQ, hangsengQ,
      // ECOS 금리 5개
      cdRate, govBond3, govBond5, corpBondAA, callRate,
      // Yahoo 환율 4개
      usdkrwQ, eurusdQ, usdjpyQ, usdcnyQ,
      // Yahoo 글로벌 지표 4개 (VIX + BDI + S&P500 + BTC)
      vixQ, bdryQ, sp500Q, btcQ,
      // Naver 투자자 동향
      investorTrendResult,
      // ECOS 예탁금/신용
      marketHealthResult,
      // 미국 국채 금리
      tnxQ, irxQ,
      // CNN Fear & Greed
      fearGreedResult,
      // KOSPI PER/PBR
      kospiValuationResult,
      // 프로그램 매매
      programTradingResult,
      // 공매도
      shortSellingResult,
    ] = await Promise.allSettled([
      yahooQuote("^KS11"),
      yahooQuote("^KQ11"),
      yahooQuote("^DJI"),
      yahooQuote("^IXIC"),
      yahooQuote("^N225"),
      yahooQuote("^HSI"),
      ecosFetch("817Y002", "010502000", d30, td),
      ecosFetch("817Y002", "010200000", d30, td),
      ecosFetch("817Y002", "010200001", d30, td),
      ecosFetch("817Y002", "010300000", d30, td),
      ecosFetch("817Y002", "010101000", d30, td),
      yahooQuote("KRW=X"),
      yahooQuote("EUR=X"),
      yahooQuote("JPY=X"),
      yahooQuote("CNY=X"),
      yahooQuote("^VIX"),
      yahooQuote("BDRY"),
      yahooQuote("^GSPC"),
      yahooQuote("BTC-USD"),
      fetchInvestorTrend(),
      fetchMarketHealth(),
      yahooQuote("^TNX"),
      yahooQuote("^IRX"),
      fetchFearGreed(),
      fetchKospiValuation(),
      fetchProgramTrading(),
      fetchShortSelling(),
    ]);

    const val = (r) => (r.status === "fulfilled" ? r.value : null);

    // 주식시장
    const indexNames = ["KOSPI", "KOSDAQ", "DOW", "NASDAQ", "NIKKEI 225", "항셍"];
    const indexSymbols = ["^KS11", "^KQ11", "^DJI", "^IXIC", "^N225", "^HSI"];
    const indexResults = [kospiQ, kosdaqQ, dowQ, nasdaqQ, nikkeiQ, hangsengQ];
    const stocks = indexResults.map((r, i) => {
      const v = val(r);
      return {
        name: indexNames[i],
        symbol: indexSymbols[i],
        price: v?.price ?? 0,
        change: v?.change ?? 0,
        changePct: v?.changePct ?? 0,
      };
    });

    // 채권/금리
    const bondNames = ["CD(91일)", "국고채 3Y", "국고채 5Y", "회사채 AA-", "콜금리"];
    const bondCodes = ["010502000", "010200000", "010200001", "010300000", "010101000"];
    const bondResults = [cdRate, govBond3, govBond5, corpBondAA, callRate];
    const bonds = bondResults.map((r, i) => ({
      name: bondNames[i],
      code: bondCodes[i],
      rate: val(r) ?? 0,
      change: 0,
    }));

    // 환율 (교차환율 계산)
    const usdkrw = val(usdkrwQ);
    const eurusd = val(eurusdQ);
    const usdjpy = val(usdjpyQ);
    const usdcny = val(usdcnyQ);

    // EUR=X = USD/EUR (1달러당 유로), JPY=X = USD/JPY, CNY=X = USD/CNY
    const usdkrwRate = usdkrw?.price ?? 0;
    const eurkrwRate = usdkrwRate && eurusd?.price ? usdkrwRate / eurusd.price : 0;
    const jpykrwRate = usdkrwRate && usdjpy?.price ? (usdkrwRate / usdjpy.price) * 100 : 0;
    const cnykrwRate = usdkrwRate && usdcny?.price ? usdkrwRate / usdcny.price : 0;

    const prevUsdkrw = usdkrwRate - (usdkrw?.change ?? 0);
    const prevEurusd = (eurusd?.price ?? 0) - (eurusd?.change ?? 0);
    const prevUsdjpy = (usdjpy?.price ?? 0) - (usdjpy?.change ?? 0);
    const prevUsdcny = (usdcny?.price ?? 0) - (usdcny?.change ?? 0);

    const prevEurkrw = prevUsdkrw && prevEurusd ? prevUsdkrw / prevEurusd : 0;
    const prevJpykrw = prevUsdkrw && prevUsdjpy ? (prevUsdkrw / prevUsdjpy) * 100 : 0;
    const prevCnykrw = prevUsdkrw && prevUsdcny ? prevUsdkrw / prevUsdcny : 0;

    const exchangeRates = [
      {
        name: "USD/KRW",
        symbol: "KRW=X",
        rate: Math.round(usdkrwRate),
        change: Math.round((usdkrw?.change ?? 0) * 10) / 10,
        changePct: Math.round((usdkrw?.changePct ?? 0) * 100) / 100,
      },
      {
        name: "EUR/KRW",
        symbol: "EURKRW",
        rate: Math.round(eurkrwRate),
        change: prevEurkrw ? Math.round((eurkrwRate - prevEurkrw) * 10) / 10 : 0,
        changePct: prevEurkrw ? Math.round(((eurkrwRate - prevEurkrw) / prevEurkrw) * 10000) / 100 : 0,
      },
      {
        name: "JPY 100/KRW",
        symbol: "JPYKRW",
        rate: Math.round(jpykrwRate),
        change: prevJpykrw ? Math.round((jpykrwRate - prevJpykrw) * 10) / 10 : 0,
        changePct: prevJpykrw ? Math.round(((jpykrwRate - prevJpykrw) / prevJpykrw) * 10000) / 100 : 0,
      },
      {
        name: "CNY/KRW",
        symbol: "CNYKRW",
        rate: Math.round(cnykrwRate),
        change: prevCnykrw ? Math.round((cnykrwRate - prevCnykrw) * 10) / 10 : 0,
        changePct: prevCnykrw ? Math.round(((cnykrwRate - prevCnykrw) / prevCnykrw) * 10000) / 100 : 0,
      },
    ];

    // 글로벌 지표 (VIX + BDI + S&P500 + BTC)
    const vix = val(vixQ);
    const bdry = val(bdryQ);
    const sp500 = val(sp500Q);
    const btc = val(btcQ);

    const vixValue = Math.round((vix?.price ?? 0) * 100) / 100;
    const globalIndicators = [
      {
        name: "VIX",
        symbol: "^VIX",
        value: vixValue,
        change: Math.round((vix?.change ?? 0) * 100) / 100,
        changePct: Math.round((vix?.changePct ?? 0) * 100) / 100,
        level: vixValue <= 20 ? "안정" : vixValue <= 30 ? "경계" : "공포",
      },
      {
        name: "BDI (BDRY)",
        symbol: "BDRY",
        value: Math.round((bdry?.price ?? 0) * 100) / 100,
        change: Math.round((bdry?.change ?? 0) * 100) / 100,
        changePct: Math.round((bdry?.changePct ?? 0) * 100) / 100,
        level: null,
      },
      {
        name: "S&P 500",
        symbol: "^GSPC",
        value: Math.round((sp500?.price ?? 0) * 100) / 100,
        change: Math.round((sp500?.change ?? 0) * 100) / 100,
        changePct: Math.round((sp500?.changePct ?? 0) * 100) / 100,
        level: null,
      },
      {
        name: "Bitcoin",
        symbol: "BTC-USD",
        value: Math.round(btc?.price ?? 0),
        change: Math.round(btc?.change ?? 0),
        changePct: Math.round((btc?.changePct ?? 0) * 100) / 100,
        level: null,
      },
    ];

    // 투자자 동향
    const investorTrend = val(investorTrendResult);

    // 시장 온도계
    const marketHealth = val(marketHealthResult);

    // 미국 국채 금리 + 장단기 스프레드
    const tnx = val(tnxQ);
    const irx = val(irxQ);
    let usTreasury = null;
    if (tnx?.price != null && irx?.price != null) {
      const yield10Y = Math.round(tnx.price * 100) / 100;
      const yield13W = Math.round(irx.price * 100) / 100;
      const spread = Math.round((yield10Y - yield13W) * 100) / 100;
      usTreasury = { yield10Y, yield13W, spread, inverted: spread < 0 };
    }

    // CNN Fear & Greed
    const fearGreed = val(fearGreedResult);

    // KOSPI PER/PBR
    const kospiValuation = val(kospiValuationResult);

    // 프로그램 매매
    const programTrading = val(programTradingResult);

    // 공매도
    const shortSelling = val(shortSellingResult);

    const result = {
      stocks,
      bonds,
      exchangeRates,
      globalIndicators,
      investorTrend,
      marketHealth,
      usTreasury,
      fearGreed,
      kospiValuation,
      programTrading,
      shortSelling,
      updatedAt: new Date().toISOString(),
    };

    // 장중(KST 9~16시)에는 10분 캐시, 그 외 1시간
    const kstHour = new Date(Date.now() + 9 * 3600000).getUTCHours();
    const cacheTTL = (kstHour >= 9 && kstHour < 16) ? 600000 : 3600000;
    await db.doc("cache/capital_market").set({
      data: result,
      expiresAt: Date.now() + cacheTTL,
    });

    res.set("Cache-Control", "public, max-age=600");
    res.json(result);
  } catch (err) {
    console.error("capitalMarket error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── 시계열 함수: capitalMarketSeries ──────────────────────
exports.capitalMarketSeries = onRequest({ cors: true, timeoutSeconds: 20 }, async (req, res) => {
  try {
    const { type, key } = req.query;
    if (!type || !key) {
      return res.status(400).json({ error: "type, key required" });
    }

    const cacheKey = `capital_series_${type}_${key}`;
    const cacheDoc = await db.doc(`cache/${cacheKey}`).get();
    if (cacheDoc.exists) {
      const cached = cacheDoc.data();
      if (cached.expiresAt > Date.now()) {
        res.set("Cache-Control", "public, max-age=3600");
        return res.json(cached.data);
      }
    }

    let result = { label: key, unit: "", series: [] };
    const td = today();
    const d365 = daysAgo(365);

    if (type === "bond") {
      // ECOS 금리 시계열
      const codeMap = {
        "010502000": "CD(91일)",
        "010200000": "국고채 3Y",
        "010200001": "국고채 5Y",
        "010300000": "회사채 AA-",
        "010101000": "콜금리",
      };
      const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_KEY}/json/kr/1/365/817Y002/D/${d365}/${td}/${key}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const json = await r.json();
      const rows = json?.StatisticSearch?.row || [];
      result = {
        label: codeMap[key] || key,
        unit: "%",
        series: rows.map((row) => ({ date: row.TIME, value: parseFloat(row.DATA_VALUE) || 0 })),
      };
    } else if (type === "stock") {
      // Yahoo Finance 시계열
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(key)}?range=1y&interval=1d`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      const json = await r.json();
      const chart = json?.chart?.result?.[0];
      if (chart) {
        const times = chart.timestamp || [];
        const closes = chart.indicators?.quote?.[0]?.close || [];
        result = {
          label: key,
          unit: "pt",
          series: times.map((t, i) => ({
            date: new Date(t * 1000).toISOString().slice(0, 10).replace(/-/g, ""),
            value: closes[i] ?? 0,
          })).filter((p) => p.value > 0),
        };
      }
    }

    // 캐시 24시간
    await db.doc(`cache/${cacheKey}`).set({
      data: result,
      expiresAt: Date.now() + 86400000,
    });

    res.set("Cache-Control", "public, max-age=3600");
    res.json(result);
  } catch (err) {
    console.error("capitalMarketSeries error:", err);
    res.status(500).json({ error: err.message });
  }
});
