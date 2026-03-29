#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { OUTPUT_DIR } = require("./lib/config");
const { searchStock } = require("./lib/stockSearch");
const { fetchAllDartData } = require("./lib/dartCollector");
const { fetchSupplyData } = require("./lib/supplyCollector");
const { fetchPriceData } = require("./lib/priceCollector");
const { captureScreenshots } = require("./lib/screenshoter");
const { generateBlogPost } = require("./lib/blogWriter");

async function main() {
  const args = process.argv.slice(2);
  const noScreenshot = args.includes("--no-screenshot");
  const query = args.find((a) => !a.startsWith("--"));
  if (!query) {
    console.log("사용법: node generate.js <종목명 또는 종목코드> [옵션]");
    console.log("예시:   node generate.js 삼성중공업");
    console.log("        node generate.js 010140");
    console.log("        node generate.js 삼성전자 --no-screenshot");
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`\n[blog-automation] "${query}" 블로그 글 생성 시작\n`);

  // 1. 종목 검색
  console.log("[1/5] 종목 검색...");
  const stock = await searchStock(query);
  const stockCode = stock.symbol.replace(/\.(KS|KQ)$/, "");
  console.log(`  종목: ${stock.name} (${stock.symbol})\n`);

  // 2. 데이터 수집 (병렬)
  console.log("[2/5] 데이터 수집 (재무제표 + 분기보고서 + 주요 공시)...");
  const [dartData, supply, price] = await Promise.allSettled([
    fetchAllDartData(stockCode),
    fetchSupplyData(stock.symbol),
    fetchPriceData(stock.symbol),
  ]);

  const fin = dartData.status === "fulfilled" ? dartData.value : { error: dartData.reason?.message, years: [] };
  const sup = supply.status === "fulfilled" ? supply.value : { error: supply.reason?.message };
  const prc = price.status === "fulfilled" ? price.value : { error: price.reason?.message };

  console.log(`  재무제표: ${fin.years?.length || 0}개년`);
  console.log(`  분기보고서: ${fin.quarterly ? `${fin.quarterly.year}년 ${fin.quarterly.quarter}` : "없음"}`);
  console.log(`  주요사항보고서: ${fin.majorReports?.length || 0}건`);
  console.log(`  공시: ${fin.disclosures?.length || 0}건 (180일)`);
  console.log(`  수급: ${sup.error ? "실패 - " + sup.error : "성공"}`);
  console.log(`  현재가: ${prc.error ? "실패 - " + prc.error : prc.price?.toLocaleString() + "원"}`);
  console.log();

  // 3. 출력 폴더 생성
  const today = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(OUTPUT_DIR, `${stock.name}_${today}`);
  const imagesDir = path.join(outputDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  // 4. 스크린샷 캡처
  let screenshots = [];
  if (noScreenshot) {
    console.log("[3/5] 스크린샷 건너뜀 (--no-screenshot)\n");
  } else {
    console.log("[3/5] 스크린샷 캡처...");
    try {
      screenshots = await captureScreenshots(stockCode, imagesDir, stock.symbol);
    } catch (err) {
      console.log(`  스크린샷 실패: ${err.message}`);
      console.log("  (스크린샷 없이 글 생성을 계속합니다)\n");
    }
  }

  // 5. 수집 데이터 조립
  const collectedData = {
    name: stock.name,
    symbol: stock.symbol,
    stockCode,
    price: prc.error ? null : prc,
    financials: fin,
    supply: sup.error ? null : sup,
    capturedAt: new Date().toISOString(),
  };

  // data.json 저장 (디버깅용)
  fs.writeFileSync(
    path.join(outputDir, "data.json"),
    JSON.stringify(collectedData, null, 2),
    "utf-8"
  );

  // 6. Claude로 글 생성
  console.log("[4/5] 블로그 글 생성...");
  const result = await generateBlogPost(collectedData, outputDir, {});
  console.log(`  제목: ${result.title}`);
  console.log(`  태그: ${result.tags.join(", ")}`);
  console.log(`  본문: ${result.bodyLength}자\n`);

  // 7. 결과 요약
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("[5/5] 완료!");
  console.log(`  출력 폴더: ${outputDir}`);
  console.log(`  - post.md       블로그 본문`);
  console.log(`  - meta.json     제목/태그/메타`);
  console.log(`  - preview.html  미리보기`);
  console.log(`  - data.json     수집 원본 데이터`);
  console.log(`  - images/       스크린샷 ${screenshots.length}장`);
  console.log(`  소요 시간: ${elapsed}초\n`);
}

main().catch((err) => {
  console.error(`\n오류 발생: ${err.message}`);
  process.exit(1);
});
