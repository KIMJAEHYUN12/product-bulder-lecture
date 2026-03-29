const fs = require("fs");
const path = require("path");

const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const CONCURRENCY = 5;

async function main() {
  const listPath = path.join(__dirname, "..", "data", "stockList.json");
  const stockList = JSON.parse(fs.readFileSync(listPath, "utf-8"));
  const outDir = path.join(__dirname, "..", "data", "stocks");
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`대상 종목: ${stockList.length}개\n`);

  // 신호 데이터 한 번에 조회
  const signalMap = await fetchSignalMap();
  const goldenMap = await fetchGoldenMap();

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < stockList.length; i += CONCURRENCY) {
    const batch = stockList.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((stock) => fetchStockData(stock, signalMap, goldenMap)),
    );

    for (let j = 0; j < results.length; j++) {
      const stock = batch[j];
      if (results[j].status === "fulfilled") {
        fs.writeFileSync(
          path.join(outDir, `${stock.code}.json`),
          JSON.stringify(results[j].value, null, 2),
        );
        succeeded++;
        console.log(`  OK  ${stock.name} (${stock.code})`);
      } else {
        failed++;
        console.error(
          `  FAIL ${stock.name} (${stock.code}): ${results[j].reason?.message || results[j].reason}`,
        );
      }
    }
  }

  console.log(`\n완료: ${succeeded}건 성공, ${failed}건 실패`);

  // sitemap 갱신
  const validStocks = stockList.filter((s) =>
    fs.existsSync(path.join(outDir, `${s.code}.json`)),
  );
  updateSitemap(validStocks);
}

async function fetchSignalMap() {
  const map = {};
  try {
    const res = await fetch(`${FIREBASE_HOST}/api/signals`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    for (const s of data.signals || []) {
      map[s.symbol] = s;
    }
    console.log(`수급 신호: ${Object.keys(map).length}건 로드`);
  } catch (e) {
    console.warn(`수급 신호 조회 실패: ${e.message}`);
  }
  return map;
}

async function fetchGoldenMap() {
  const map = {};
  try {
    const res = await fetch(`${FIREBASE_HOST}/api/signal-scan`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    for (const g of data.results || []) {
      map[g.symbol] = g;
    }
    console.log(`골든크로스: ${Object.keys(map).length}건 로드`);
  } catch (e) {
    console.warn(`골든크로스 조회 실패: ${e.message}`);
  }
  return map;
}

async function fetchStockData(stock, signalMap, goldenMap) {
  const { code, symbol, name, market, sector } = stock;

  const [chartResult, perResult, trendResult] = await Promise.allSettled([
    fetchJSON(
      `${FIREBASE_HOST}/api/stock-chart?symbol=${symbol}&range=1mo&interval=1d`,
      15000,
    ),
    fetchJSON(
      `${FIREBASE_HOST}/api/per-band?symbol=${encodeURIComponent(code)}`,
      20000,
    ),
    fetchPOST(
      `${FIREBASE_HOST}/api/investor-trend`,
      { symbol, days: 30 },
      15000,
    ),
  ]);

  // 현재가
  let price = null;
  let changeRate = null;
  if (chartResult.status === "fulfilled") {
    const candles = chartResult.value.candles || [];
    if (candles.length >= 2) {
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      price = last.close;
      changeRate =
        Math.round(((last.close - prev.close) / prev.close) * 10000) / 100;
    } else if (candles.length === 1) {
      price = candles[0].close;
      changeRate = 0;
    }
  }

  // PER
  let per = null,
    forwardPer = null,
    avgPer = null,
    perPosition = null;
  if (perResult.status === "fulfilled") {
    const pd = perResult.value;
    per = pd.currentPer ?? null;
    forwardPer = pd.forwardPer ?? null;
    avgPer = pd.avgPer ?? null;
    perPosition = pd.perPosition ?? null;
    if (price === null && pd.bandChart?.length > 0) {
      price = pd.bandChart[pd.bandChart.length - 1].close;
    }
  }

  // 수급
  let foreignNet = null,
    instNet = null;
  if (trendResult.status === "fulfilled") {
    const td = trendResult.value;
    foreignNet = td.summary?.foreign ?? null;
    instNet = td.summary?.institution ?? null;
  }

  // 채널 위치 (신호 스캔 결과에서)
  const signal = signalMap[symbol];
  const channelPct = signal?.positionPct ?? null;

  // 골든크로스
  const golden = goldenMap[symbol];

  if (price === null) {
    throw new Error("가격 데이터 없음");
  }

  return {
    code,
    name,
    market,
    sector,
    price: Math.round(price),
    changeRate,
    channelPct,
    per: per !== null ? Math.round(per * 10) / 10 : null,
    forwardPer: forwardPer !== null ? Math.round(forwardPer * 10) / 10 : null,
    avgPer: avgPer !== null ? Math.round(avgPer * 10) / 10 : null,
    perPosition: perPosition !== null ? Math.round(perPosition) : null,
    foreignNet,
    instNet,
    goldenCross: golden
      ? { crossType: golden.crossType, crossDate: golden.crossDate }
      : null,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchJSON(url, timeout) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPOST(url, body, timeout) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function updateSitemap(stocks) {
  const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
  let xml = fs.readFileSync(sitemapPath, "utf-8");

  // 기존 종목 엔트리 제거
  xml = xml.replace(
    /\s*<!-- STOCK_SEO_START -->[\s\S]*?<!-- STOCK_SEO_END -->/g,
    "",
  );

  const today = new Date().toISOString().split("T")[0];
  const entries = stocks
    .map(
      (s) =>
        `  <url>\n    <loc>https://www.simplystock.co.kr/stock/${s.code}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    )
    .join("\n");

  const block = `\n  <!-- STOCK_SEO_START -->\n${entries}\n  <!-- STOCK_SEO_END -->`;
  xml = xml.replace("</urlset>", `${block}\n</urlset>`);

  fs.writeFileSync(sitemapPath, xml);
  console.log(`sitemap.xml: ${stocks.length}개 종목 URL 추가`);
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
