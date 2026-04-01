/**
 * DART 캡처 v3 — 새 탭 직접 URL 캡처
 *
 * v2 문제: iframe 확장해도 포괄손익계산서 하단만 잘림, semi/quarterly 표지만 캡처
 * v3 수정:
 *   1. frame URL을 새 탭에서 직접 열어 캡처 → iframe 클리핑 완전 회피
 *   2. semi/quarterly도 사업보고서와 동일하게 목차 이동 후 캡처
 *   3. 캡처 후 파일 크기 검증 → 표지/빈 화면 자동 삭제
 */

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const { getCorpCode } = require('./dart-checker');

const DART_API_URL = 'https://opendart.fss.or.kr/api';

function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  try {
    return execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 우선순위 규칙 ─────────────────────────────

const PRIORITY_RULES = [
  { match: (t) => /사업보고서/.test(t) && !/첨부/.test(t), rank: 1, type: 'annual' },
  { match: (t) => /반기보고서/.test(t), rank: 2, type: 'semi' },
  { match: (t) => /분기보고서/.test(t), rank: 2, type: 'quarterly' },
  { match: (t) => /감사보고서/.test(t), rank: 3, type: 'audit' },
  { match: (t) => /영업정지|사업철수/.test(t), rank: 4, type: 'critical' },
  { match: (t) => /대량보유/.test(t), rank: 5, type: 'stake' },
  { match: (t) => /임원.*매매|배당|신규시설|유상증자/.test(t), rank: 6, type: 'corporate' },
];

// ── 보고서 유형별 캡처 섹션 ──────────────────

const REPORT_SECTIONS = {
  annual: [
    { treeKeywords: ['매출', '수주'], tableKeywords: ['매출액', '매출'], suffix: 'dart_01_매출실적', label: '매출실적' },
    { treeKeywords: ['연결 재무상태표', '재무상태표'], tableKeywords: ['자산총계', '유동자산'], suffix: 'dart_02_연결재무상태표', label: '재무상태표' },
    { treeKeywords: ['연결 포괄손익', '포괄손익계산서', '손익계산서'], tableKeywords: ['매출액', '영업이익', '당기순이익'], suffix: 'dart_03_포괄손익계산서', label: '손익계산서' },
    { treeKeywords: ['수주상황', '수주현황', '수주계약'], suffix: 'dart_04_수주현황', label: '수주현황', captureMode: 'tables' },
    { treeKeywords: ['사업의 내용', '사업의내용', '사업개요'], suffix: 'dart_05_사업내용', label: '사업내용', captureMode: 'tables' },
    { treeKeywords: ['주요 경영사항', '경영실적', '영업의 개황'], suffix: 'dart_06_경영사항', label: '주요경영사항', captureMode: 'tables' },
  ],
  semi: [
    { treeKeywords: ['연결 재무상태표', '재무상태표'], tableKeywords: ['자산총계', '유동자산'], suffix: 'dart_semi_재무상태표', label: '반기 재무상태표' },
    { treeKeywords: ['연결 포괄손익', '포괄손익계산서', '손익계산서'], tableKeywords: ['매출액', '영업이익'], suffix: 'dart_semi_손익계산서', label: '반기 손익계산서' },
  ],
  quarterly: [
    { treeKeywords: ['연결 재무상태표', '재무상태표'], tableKeywords: ['자산총계', '유동자산'], suffix: 'dart_quarterly_재무상태표', label: '분기 재무상태표' },
    { treeKeywords: ['연결 포괄손익', '포괄손익계산서', '손익계산서'], tableKeywords: ['매출액', '영업이익'], suffix: 'dart_quarterly_손익계산서', label: '분기 손익계산서' },
  ],
};

// 일반 공시 유형별 테이블 검색 키워드
const GENERAL_TABLE_KEYWORDS = {
  audit: ['감사의견', '의견종류'],
  stake: ['보유주식수', '보유비율', '보유주식등의 수', '보유현황'],
  corporate: ['배당금', '1주당 배당금', '배당에 관한', '투자금액', '신규시설', '증자방식'],
  critical: ['영업정지', '사업철수'],
};

// 일반 공시 유형별 트리 탐색 키워드
const GENERAL_TREE_CONFIG = {
  audit: {
    treeKeywords: ['감사의견', '감사보고서', '독립된 감사인'],
    fallback: true,
  },
  stake: {
    treeKeywords: ['보유현황', '요약정보', '대량보유상황보고서'],
    fallback: true,
  },
  corporate: {
    treeKeywords: ['거래내역', '취득결정', '자기주식 취득'],
    fallback: true,
  },
  executive: {
    treeKeywords: ['변동내역', '특정증권등의 거래내역'],
    fallback: true,
  },
  critical: {
    treeKeywords: ['주요경영사항', '투자판단 관련'],
    fallback: true,
  },
};

// ── 공시 선별 ─────────────────────────────────

async function selectDisclosures(stockCode) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) {
    console.log(`  DART corp_code 없음: ${stockCode}`);
    return [];
  }

  const dartKey = process.env.DART_API_KEY;
  if (!dartKey) {
    console.log('  DART_API_KEY 없음');
    return [];
  }

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 365);

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const params = new URLSearchParams({
    crtfc_key: dartKey,
    corp_code: corpCode,
    bgn_de: fmt(start),
    end_de: fmt(end),
    page_count: '40',
  });

  try {
    const r = await fetch(`${DART_API_URL}/list.json?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.status !== '000' || !data.list) return [];

    const ranked = [];
    const usedTypes = new Set();

    for (const item of data.list) {
      const title = item.report_nm;
      for (const rule of PRIORITY_RULES) {
        if (rule.match(title)) {
          if (usedTypes.has(rule.type)) continue;
          ranked.push({
            rank: rule.rank,
            type: rule.type,
            title,
            date: item.rcept_dt,
            rceptNo: item.rcept_no,
            url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
          });
          usedTypes.add(rule.type);
          break;
        }
      }
    }

    ranked.sort((a, b) => a.rank - b.rank);

    // annual(사업보고서) 1건 보장 + 나머지 최대 6건
    const annual = ranked.find((d) => d.type === 'annual');
    const others = ranked.filter((d) => d.type !== 'annual');
    const maxOthers = annual ? 6 : 7;
    const selected = [...(annual ? [annual] : []), ...others.slice(0, maxOthers)];

    console.log(`  DART 공시 ${data.list.length}건 중 ${selected.length}건 선별`);
    for (const d of selected) {
      console.log(`    [${d.type}] ${d.title} (${d.date})`);
    }
    return selected;
  } catch (err) {
    console.log(`  DART 공시 목록 조회 실패: ${err.message}`);
    return [];
  }
}

// ── 테이블 검색 + 캡처 ───────────────────────

/**
 * frame 내에서 키워드로 테이블을 찾아 <table> element.screenshot()
 */
async function captureTable(frame, filePath, { keywords = [], minRows = 3, withHeading = false } = {}) {
  const handle = await frame.evaluateHandle(
    ({ kws, min }) => {
      const tables = Array.from(document.querySelectorAll('table'));

      // 키워드 매칭
      if (kws.length > 0) {
        for (const kw of kws) {
          const found = tables.find((t) => {
            if ((t.rows?.length || 0) < min) return false;
            return (t.textContent || '').includes(kw);
          });
          if (found) return found;
        }
      }

      // fallback: 가장 큰 테이블
      let best = null;
      let maxCells = 0;
      for (const t of tables) {
        if ((t.rows?.length || 0) < min) continue;
        const cells = t.querySelectorAll('td, th').length;
        if (cells > maxCells) {
          maxCells = cells;
          best = t;
        }
      }
      return best;
    },
    { kws: keywords, min: minRows },
  );

  const tableEl = handle.asElement();
  if (!tableEl) return false;

  // 제목 포함 래핑
  let captureTarget = tableEl;
  if (withHeading) {
    const wrapperHandle = await frame.evaluateHandle((table) => {
      let heading = null;
      let prev = table.previousElementSibling;
      for (let i = 0; i < 5 && prev; i++) {
        const tag = prev.tagName.toLowerCase();
        const hasBold = prev.querySelector('b, strong');
        const isHeading = /^h[1-6]$/.test(tag);
        if (hasBold || isHeading) {
          heading = prev;
          break;
        }
        prev = prev.previousElementSibling;
      }

      if (!heading) return table;
      if (heading.parentElement !== table.parentElement) return table;

      const wrapper = document.createElement('div');
      wrapper.id = '__dart_capture_wrapper';
      wrapper.style.display = 'inline-block';
      heading.parentElement.insertBefore(wrapper, heading);

      let el = heading;
      const toMove = [];
      while (el) {
        toMove.push(el);
        if (el === table) break;
        el = el.nextElementSibling;
      }
      toMove.forEach((node) => wrapper.appendChild(node));

      return wrapper;
    }, tableEl);

    const wrapperEl = wrapperHandle.asElement();
    if (wrapperEl) captureTarget = wrapperEl;
  }

  await frame.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }), captureTarget);
  await delay(300);

  await captureTarget.screenshot({ path: filePath });
  return true;
}

// ── 새 탭에서 frame URL 직접 캡처 ────────────

/**
 * frame URL을 새 탭에서 열어 테이블 캡처
 * iframe 제약을 완전히 회피 → 테이블 전체가 잘리지 않음
 */
async function captureFromDirectUrl(browser, url, filePath, options = {}) {
  const capturePage = await browser.newPage();
  try {
    await capturePage.setViewport({ width: 1200, height: 10000, deviceScaleFactor: 2 });
    await capturePage.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(1000);

    // body overflow 해제
    await capturePage.evaluate(() => {
      document.body.style.overflow = 'visible';
      document.body.style.height = 'auto';
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.height = 'auto';
    });

    return await captureTable(capturePage.mainFrame(), filePath, options);
  } catch (err) {
    console.log(`    직접 URL 캡처 실패: ${err.message}`);
    return false;
  } finally {
    await capturePage.close();
  }
}

/**
 * 프레임 내 테이블 복수 캡처 (매출/수주 등 긴 페이지용)
 * - 높이 50px 이상 테이블만 필터
 * - 3개 이하 → 프레임 전체 1장
 * - 4개 이상 → 상위 3개 개별 element.screenshot()
 */
async function captureTablesFromFrame(browser, frameUrl, stockCode, suffix, outputDir) {
  const capturePage = await browser.newPage();
  const results = [];
  try {
    await capturePage.setViewport({ width: 1200, height: 10000, deviceScaleFactor: 2 });
    await capturePage.goto(frameUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(1000);

    await capturePage.evaluate(() => {
      document.body.style.overflow = 'visible';
      document.body.style.height = 'auto';
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.height = 'auto';
    });

    // 높이 50px 이상 테이블 수집
    const tableCount = await capturePage.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.filter((t) => t.getBoundingClientRect().height > 50).length;
    });

    console.log(`    테이블 ${tableCount}개 발견 (height>50px)`);

    if (tableCount === 0) return results;

    if (tableCount <= 3) {
      // 전체 프레임 1장 캡처
      const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${suffix}.png`);
      await capturePage.screenshot({ path: filePath, fullPage: true });
      if (validateCapture(filePath, suffix)) {
        results.push(`images/dart/${stockCode}_${suffix}.png`);
      }
    } else {
      // 상위 3개 테이블 개별 캡처
      const handles = await capturePage.evaluateHandle(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        return tables
          .filter((t) => t.getBoundingClientRect().height > 50)
          .slice(0, 3);
      });

      const arr = await handles.getProperties();
      let idx = 1;
      for (const [, handle] of arr) {
        const el = handle.asElement();
        if (!el) continue;
        const paddedIdx = String(idx).padStart(2, '0');
        const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${suffix}_${paddedIdx}.png`);

        await capturePage.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }), el);
        await delay(300);
        await el.screenshot({ path: filePath });

        if (validateCapture(filePath, `${suffix}_${paddedIdx}`)) {
          results.push(`images/dart/${stockCode}_${suffix}_${paddedIdx}.png`);
        }
        idx++;
      }
    }
  } catch (err) {
    console.log(`    테이블 캡처 실패: ${err.message}`);
  } finally {
    await capturePage.close();
  }
  return results;
}

/**
 * 캡처 파일 검증 — 너무 작으면(표지/빈 화면) 삭제
 * @returns {boolean} 유효하면 true
 */
function validateCapture(filePath, label) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size < 5000) {
      console.log(`    ${label} — 캡처 너무 작음 (${(stats.size / 1024).toFixed(1)}KB), 삭제`);
      fs.unlinkSync(filePath);
      return false;
    }
    console.log(`    ${label} 캡처 완료 (${(stats.size / 1024).toFixed(1)}KB)`);
    return true;
  } catch {
    return false;
  }
}

// ── 콘텐츠 프레임 탐색 ───────────────────────

async function findContentFrame(page) {
  const frames = page.frames();
  let best = null;
  let maxTables = 0;

  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const count = await frame.evaluate(() => document.querySelectorAll('table').length);
      if (count > maxTables) {
        maxTables = count;
        best = frame;
      }
    } catch {}
  }

  if (!best) {
    try {
      const mainCount = await page.mainFrame().evaluate(() => document.querySelectorAll('table').length);
      if (mainCount > 0) best = page.mainFrame();
    } catch {}
  }

  return best;
}

// ── 트리 목차 클릭 ────────────────────────────

async function clickTreeNode(page, keyword) {
  // 접힌 트리 노드 펼치기
  await page.evaluate(() => {
    document.querySelectorAll('.jstree-closed > ins, .jstree-closed > i, [class*="closed"] > ins').forEach((e) => e.click());
  });
  await delay(800);

  const clicked = await page.evaluate((kw) => {
    const links = Array.from(document.querySelectorAll('a, span'));
    for (const el of links) {
      const text = (el.textContent || '').trim();
      if (text.includes(kw) && el.offsetHeight > 0 && el.offsetWidth > 0) {
        el.scrollIntoView({ block: 'center' });
        el.click();
        return text;
      }
    }
    return null;
  }, keyword);

  if (clicked) return clicked;

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      const result = await frame.evaluate((kw) => {
        const links = Array.from(document.querySelectorAll('a, span'));
        for (const el of links) {
          const text = (el.textContent || '').trim();
          if (text.includes(kw) && el.offsetHeight > 0 && el.offsetWidth > 0) {
            el.click();
            return text;
          }
        }
        return null;
      }, keyword);
      if (result) return result;
    } catch {}
  }

  return null;
}

// ── 보고서 목차 이동 캡처 (annual/semi/quarterly) ──

/**
 * 사업보고서/반기/분기보고서 — 목차에서 섹션 이동 후 캡처
 * frame URL을 새 탭에서 직접 열어 iframe 클리핑 회피
 */
async function captureReportSections(page, browser, stockCode, outputDir, disc) {
  const sections = REPORT_SECTIONS[disc.type];
  if (!sections) return [];

  const results = [];

  for (const section of sections) {
    try {
      let clicked = null;
      for (const kw of section.treeKeywords) {
        clicked = await clickTreeNode(page, kw);
        if (clicked) break;
      }

      if (!clicked) {
        console.log(`    목차에서 "${section.label}" 찾지 못함, 스킵`);
        continue;
      }

      console.log(`    "${clicked}" 클릭, 콘텐츠 로딩 대기...`);
      await delay(3000);

      const contentFrame = await findContentFrame(page);
      if (!contentFrame) {
        console.log(`    콘텐츠 프레임 없음, 스킵`);
        continue;
      }

      const frameUrl = contentFrame.url();
      if (!frameUrl || frameUrl === 'about:blank') {
        console.log(`    프레임 URL 없음, 스킵`);
        continue;
      }

      // captureMode: 'tables' → 복수 테이블 캡처
      if (section.captureMode === 'tables') {
        const files = await captureTablesFromFrame(browser, frameUrl, stockCode, section.suffix, outputDir);
        results.push(...files);
      } else {
        const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${section.suffix}.png`);

        // 새 탭에서 frame URL 직접 열어 캡처 (iframe 클리핑 회피)
        const ok = await captureFromDirectUrl(browser, frameUrl, filePath, {
          keywords: section.tableKeywords,
          minRows: 3,
          withHeading: true,
        });

        if (ok && validateCapture(filePath, section.label)) {
          results.push(`images/dart/${stockCode}_${section.suffix}.png`);
        }
      }
    } catch (err) {
      console.log(`    ${section.label} 캡처 실패: ${err.message}`);
    }
  }

  return results;
}

// ── 일반 공시 캡처 ────────────────────────────

async function captureGeneralDisclosure(page, browser, stockCode, disc, outputDir) {
  try {
    const suffix = `dart_${disc.type}`;
    const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${suffix}.png`);
    const keywords = GENERAL_TABLE_KEYWORDS[disc.type] || [];
    const treeConfig = GENERAL_TREE_CONFIG[disc.type];

    // 트리 탐색 시도
    let treeClicked = false;
    if (treeConfig) {
      for (const kw of treeConfig.treeKeywords) {
        const clicked = await clickTreeNode(page, kw);
        if (clicked) {
          console.log(`    트리 "${clicked}" 클릭, 콘텐츠 로딩 대기...`);
          treeClicked = true;
          await delay(2000);
          break;
        }
      }
      if (!treeClicked) {
        console.log(`    트리 매칭 실패 (${disc.type}), fallback 시도`);
        if (!treeConfig.fallback) return null;
      }
    }

    const contentFrame = await findContentFrame(page);
    if (!contentFrame) return null;

    const frameUrl = contentFrame.url();
    if (!frameUrl || frameUrl === 'about:blank') return null;

    const ok = await captureFromDirectUrl(browser, frameUrl, filePath, {
      keywords,
      minRows: 3,
    });

    if (!ok) return null;
    if (!validateCapture(filePath, disc.type)) return null;

    return `images/dart/${stockCode}_${suffix}.png`;
  } catch {
    return null;
  }
}

// ── 메인 캡처 함수 ────────────────────────────

async function captureDartPages(disclosures, stockCode, outputDir, onProgress = () => {}) {
  if (!disclosures || disclosures.length === 0) return [];

  const dartDir = path.join(outputDir, 'images', 'dart');
  fs.mkdirSync(dartDir, { recursive: true });

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: 'new',
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1200, height: 900, deviceScaleFactor: 2 },
  });

  const savedFiles = [];

  try {
    const page = await browser.newPage();

    for (let i = 0; i < disclosures.length; i++) {
      const disc = disclosures[i];
      const msg = `DART 캡처 ${i + 1}/${disclosures.length}: ${disc.title}`;
      console.log(`  ${msg}`);
      onProgress(msg);

      try {
        await page.goto(disc.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(3000);

        // 팝업/오버레이 닫기
        await page
          .evaluate(() => {
            document
              .querySelectorAll('.ui-dialog .ui-dialog-titlebar-close, .close, [aria-label="Close"]')
              .forEach((btn) => btn.click());
          })
          .catch(() => {});

        if (REPORT_SECTIONS[disc.type]) {
          // 사업보고서/반기/분기: 목차 이동 후 섹션별 캡처
          const files = await captureReportSections(page, browser, stockCode, outputDir, disc);
          savedFiles.push(...files);
        } else {
          // 일반 공시: 키워드 기반 테이블 캡처
          const file = await captureGeneralDisclosure(page, browser, stockCode, disc, outputDir);
          if (file) {
            savedFiles.push(file);
          } else {
            console.log(`    ${disc.title} — 유효한 테이블 없음, 스킵`);
          }
        }
      } catch (err) {
        console.log(`    ${disc.title} 캡처 실패: ${err.message}`);
        try {
          await page.evaluate(() => true);
        } catch {
          console.log('    브라우저 크래시 감지, DART 캡처 중단');
          break;
        }
      }
    }

    console.log(`  DART 스크린샷 ${savedFiles.length}장 완료`);
  } finally {
    await browser.close();
  }

  return savedFiles;
}

module.exports = { selectDisclosures, captureDartPages };
