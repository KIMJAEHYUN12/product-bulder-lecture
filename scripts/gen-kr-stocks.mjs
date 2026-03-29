#!/usr/bin/env node
/**
 * KRX 전체 종목 데이터 생성 스크립트
 *
 * 사용법: node scripts/gen-kr-stocks.mjs
 * 출력:   data/krStocks.json + functions/data/krStocks.json
 *
 * 데이터 소스: KRX (data.krx.co.kr)
 * - KOSPI (STK): ~830개
 * - KOSDAQ (KSQ): ~1,700개
 * - ETF: ~800개
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── KRX API에서 종목 목록 가져오기 ─────────────────────────────────
async function fetchKrxStocks(mktId) {
  // mktId: "STK" (코스피) | "KSQ" (코스닥)
  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const body = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT01901",
    locale: "ko_KR",
    mktId,
    trdDd: today,
    share: "1",
    money: "1",
    csvxls_isNo: "false",
  });

  const res = await fetch("https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`KRX API 실패 (${mktId}): ${res.status}`);
  const json = await res.json();
  const rows = json.OutBlock_1 || json.output || [];
  if (rows.length === 0) throw new Error(`KRX 데이터 비어있음 (${mktId})`);

  return rows;
}

// ── ETF 종목 조회 (KRX 우선 → 네이버 폴백) ───────────────────────
async function fetchKrxEtf() {
  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const body = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT04301",
    locale: "ko_KR",
    trdDd: today,
    share: "1",
    money: "1",
    csvxls_isNo: "false",
  });

  const res = await fetch("https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`KRX ETF API 실패: ${res.status}`);
  const json = await res.json();
  const rows = json.OutBlock_1 || json.output || [];
  if (rows.length === 0) throw new Error("KRX ETF 데이터 비어있음");
  return rows;
}

async function fetchNaverEtf() {
  const res = await fetch(
    "https://finance.naver.com/api/sise/etfItemList.nhn?etfType=0&targetColumn=market_sum&sortOrder=desc&pageSize=2000",
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) throw new Error(`네이버 ETF API 실패: ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("euc-kr").decode(buf);
  const json = JSON.parse(text);
  const list = json.result?.etfItemList || [];
  if (list.length === 0) throw new Error("네이버 ETF 데이터 비어있음");
  // KRX 형식으로 변환
  return list.map((e) => ({
    ISU_SRT_CD: e.itemcode,
    ISU_ABBRV: e.itemname,
  }));
}

// ── KIND 백업 (KRX API 실패 시) ────────────────────────────────────
async function fetchKindStocks(marketType) {
  // marketType: "stockMkt" (코스피) | "kosdaqMkt" (코스닥)
  const url = `https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=${marketType}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`KIND API 실패 (${marketType}): ${res.status}`);

  // KIND는 EUC-KR 인코딩으로 응답
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("euc-kr").decode(buf);

  // HTML 테이블 파싱 — 컬럼: 회사명(0), 시장구분(1), 종목코드(2), 업종(3), ...
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
    }
    // cells[0]=회사명, cells[2]=종목코드, cells[3]=업종 (6자리 숫자만 = 보통주)
    if (cells.length >= 3 && /^\d{6}$/.test(cells[2])) {
      rows.push({ ISU_SRT_CD: cells[2], ISU_ABBRV: cells[0], IDX_IND_NM: cells[3] || "" });
    }
  }
  return rows;
}

// ── 메인 ───────────────────────────────────────────────────────────
async function main() {
  console.log("KRX 종목 데이터 생성 시작...\n");

  let kospiRows, kosdaqRows, etfRows = [];
  let source = "KRX data.krx.co.kr";

  // 1차: data.krx.co.kr API
  try {
    console.log("[1/3] KOSPI 데이터 다운로드 중...");
    kospiRows = await fetchKrxStocks("STK");
    console.log(`  → KOSPI ${kospiRows.length}개`);

    console.log("[2/3] KOSDAQ 데이터 다운로드 중...");
    kosdaqRows = await fetchKrxStocks("KSQ");
    console.log(`  → KOSDAQ ${kosdaqRows.length}개`);
  } catch (e) {
    console.warn(`\nKRX API 실패: ${e.message}`);
    console.log("KIND 백업 API로 재시도...\n");
    source = "KIND kind.krx.co.kr";

    try {
      console.log("[1/3] KOSPI 데이터 다운로드 중...");
      kospiRows = await fetchKindStocks("stockMkt");
      console.log(`  → KOSPI ${kospiRows.length}개`);

      console.log("[2/3] KOSDAQ 데이터 다운로드 중...");
      kosdaqRows = await fetchKindStocks("kosdaqMkt");
      console.log(`  → KOSDAQ ${kosdaqRows.length}개`);
    } catch (e2) {
      console.error(`\nKIND API도 실패: ${e2.message}`);
      console.error("네트워크 환경을 확인하세요.");
      process.exit(1);
    }
  }

  // ETF 조회 (KRX → 네이버 폴백)
  try {
    console.log("[3/3] ETF 데이터 다운로드 중 (KRX)...");
    etfRows = await fetchKrxEtf();
    console.log(`  → ETF ${etfRows.length}개 (KRX)`);
  } catch (e) {
    console.warn(`  KRX ETF 실패: ${e.message}`);
    try {
      console.log("  네이버 금융 ETF API로 재시도...");
      etfRows = await fetchNaverEtf();
      console.log(`  → ETF ${etfRows.length}개 (네이버)`);
    } catch (e2) {
      console.warn(`  네이버 ETF도 실패 (무시): ${e2.message}`);
    }
  }

  // 종목코드 파싱 및 변환
  const stocks = [];

  for (const row of kospiRows) {
    const code = (row.ISU_SRT_CD || "").replace(/\D/g, "");
    const name = (row.ISU_ABBRV || "").trim();
    const industry = (row.IDX_IND_NM || "").trim();
    if (code.length === 6 && name) {
      const entry = { s: `${code}.KS`, n: name, m: "P" };
      if (industry) entry.i = industry;
      stocks.push(entry);
    }
  }

  for (const row of kosdaqRows) {
    const code = (row.ISU_SRT_CD || "").replace(/\D/g, "");
    const name = (row.ISU_ABBRV || "").trim();
    const industry = (row.IDX_IND_NM || "").trim();
    if (code.length === 6 && name) {
      const entry = { s: `${code}.KQ`, n: name, m: "Q" };
      if (industry) entry.i = industry;
      stocks.push(entry);
    }
  }

  // ETF (코스피 시장에 상장, Yahoo Finance에서 .KS 서픽스 사용)
  for (const row of etfRows) {
    const code = (row.ISU_SRT_CD || "").replace(/\D/g, "");
    const name = (row.ISU_ABBRV || "").trim();
    if (code.length === 6 && name) {
      stocks.push({ s: `${code}.KS`, n: name, m: "E", i: "ETF" });
    }
  }

  // 중복 제거 (symbol 기준)
  const seen = new Set();
  const unique = stocks.filter((s) => {
    if (seen.has(s.s)) return false;
    seen.add(s.s);
    return true;
  });

  // 이름순 정렬
  unique.sort((a, b) => a.n.localeCompare(b.n, "ko"));

  console.log(`\n총 ${unique.length}개 종목 (KOSPI ${kospiRows.length} + KOSDAQ ${kosdaqRows.length} + ETF ${etfRows.length})`);
  console.log(`데이터 소스: ${source}`);

  // JSON 출력
  const json = JSON.stringify(unique);
  const sizeKB = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);

  const frontPath = resolve(ROOT, "data/krStocks.json");
  const backPath = resolve(ROOT, "functions/data/krStocks.json");

  mkdirSync(dirname(frontPath), { recursive: true });
  mkdirSync(dirname(backPath), { recursive: true });

  writeFileSync(frontPath, json, "utf8");
  writeFileSync(backPath, json, "utf8");

  console.log(`\n출력 완료:`);
  console.log(`  → ${frontPath} (${sizeKB}KB)`);
  console.log(`  → ${backPath} (${sizeKB}KB)`);
  console.log(`\n샘플: ${unique.slice(0, 5).map((s) => `${s.n}(${s.s})`).join(", ")}`);
}

main().catch((e) => {
  console.error("치명적 오류:", e);
  process.exit(1);
});
