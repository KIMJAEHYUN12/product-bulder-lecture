/**
 * DART 캡처 전면 재설계 — element.screenshot() 전용
 *
 * 공시 목록 → 우선순위 선별 → iframe 내부 element.screenshot()
 * page.screenshot({ clip }) / fullPage 절대 금지.
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

// 우선순위 규칙 (rank 낮을수록 높은 우선순위)
const PRIORITY_RULES = [
  { match: (t) => /사업보고서/.test(t) && !/첨부/.test(t), rank: 1, type: 'annual' },
  { match: (t) => /반기보고서/.test(t), rank: 2, type: 'semi' },
  { match: (t) => /분기보고서/.test(t), rank: 2, type: 'quarterly' },
  { match: (t) => /감사보고서/.test(t), rank: 3, type: 'audit' },
  { match: (t) => /영업정지|사업철수/.test(t), rank: 4, type: 'critical' },
  { match: (t) => /대량보유/.test(t), rank: 5, type: 'stake' },
  { match: (t) => /임원.*매매|배당|신규시설|유상증자/.test(t), rank: 6, type: 'corporate' },
];

/**
 * OpenDART list.json으로 최근 공시 40건 조회 → 우선순위 기반 최대 5개 선별
 */
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
          // 보고서 유형별 최신 1개만
          if (['annual', 'semi', 'quarterly'].includes(rule.type) && usedTypes.has(rule.type)) continue;

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
    const selected = ranked.slice(0, 5);
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

/**
 * 콘텐츠 프레임 탐색 — table 수가 가장 많은 frame = 콘텐츠 프레임
 */
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
    } catch {
      // cross-origin or detached
    }
  }

  // 메인 프레임도 확인
  if (!best) {
    try {
      const mainCount = await page.mainFrame().evaluate(() => document.querySelectorAll('table').length);
      if (mainCount > 0) best = page.mainFrame();
    } catch {}
  }

  return best;
}

/**
 * frame 내 가장 큰 테이블을 element.screenshot()
 * 절대 규칙: element.screenshot() 전용. page.screenshot 금지.
 */
async function screenshotLargestTable(frame, filePath) {
  const handle = await frame.evaluateHandle(() => {
    const tables = Array.from(document.querySelectorAll('table'));
    let best = null;
    let maxCells = 0;
    for (const t of tables) {
      const cells = t.querySelectorAll('td, th').length;
      if (cells > maxCells) {
        maxCells = cells;
        best = t;
      }
    }
    return best;
  });

  const el = handle.asElement();
  if (!el) return false;

  // 스크롤 후 캡처
  await frame.evaluate((table) => {
    table.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, el);
  await delay(500);

  await el.screenshot({ path: filePath });
  return true;
}

/**
 * 트리 목차에서 keyword 포함 노드 클릭
 * 접힌 노드를 먼저 펼치고, 매칭 노드 클릭
 */
async function clickTreeNode(page, keyword) {
  // 접힌 트리 노드 펼치기
  await page.evaluate(() => {
    const expanders = document.querySelectorAll(
      '.jstree-closed > ins, .jstree-closed > i, [class*="closed"] > ins'
    );
    expanders.forEach((e) => e.click());
  });
  await delay(800);

  // 메인 페이지에서 매칭 노드 찾기
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

  // 서브 프레임에서도 시도
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

/**
 * 사업보고서 캡처 — 목차 이동으로 3개 섹션 캡처
 * element.screenshot() 전용
 */
async function captureAnnualReport(page, stockCode, outputDir) {
  const sections = [
    { keywords: ['매출', '수주'], suffix: 'dart_01_매출실적', label: '매출실적' },
    { keywords: ['연결 재무상태표', '재무상태표'], suffix: 'dart_02_연결재무상태표', label: '재무상태표' },
    { keywords: ['연결 포괄손익', '포괄손익계산서', '손익계산서'], suffix: 'dart_03_포괄손익계산서', label: '손익계산서' },
  ];

  const results = [];

  for (const section of sections) {
    try {
      let clicked = null;
      for (const kw of section.keywords) {
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

      const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${section.suffix}.png`);
      const ok = await screenshotLargestTable(contentFrame, filePath);
      if (ok) {
        results.push(`images/dart/${stockCode}_${section.suffix}.png`);
        console.log(`    ${section.label} 캡처 완료`);
      } else {
        console.log(`    ${section.label} — 테이블 없음, 스킵`);
      }
    } catch (err) {
      console.log(`    ${section.label} 캡처 실패: ${err.message}`);
    }
  }

  return results;
}

/**
 * 일반 공시 캡처 — iframe 내 가장 큰 테이블 element.screenshot()
 */
async function captureGeneralDisclosure(page, stockCode, disc, outputDir) {
  try {
    const contentFrame = await findContentFrame(page);
    if (!contentFrame) return null;

    const suffix = `dart_${disc.type}`;
    const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${suffix}.png`);
    const ok = await screenshotLargestTable(contentFrame, filePath);
    return ok ? `images/dart/${stockCode}_${suffix}.png` : null;
  } catch {
    return null;
  }
}

/**
 * DART 캡처 메인 함수
 * @param {Array} disclosures - selectDisclosures() 결과
 * @param {string} stockCode - 종목코드
 * @param {string} outputDir - 출력 디렉토리 (output/XXXXXX_종목명)
 * @param {function} onProgress - 진행 콜백
 * @returns {Promise<string[]>} 이미지 상대 경로 배열
 */
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
        await page.evaluate(() => {
          document.querySelectorAll('.ui-dialog .ui-dialog-titlebar-close, .close, [aria-label="Close"]')
            .forEach((btn) => btn.click());
        }).catch(() => {});

        if (disc.type === 'annual') {
          // 사업보고서: 3개 섹션 캡처
          const files = await captureAnnualReport(page, stockCode, outputDir);
          savedFiles.push(...files);
        } else {
          // 일반 공시: 테이블 1개 캡처
          const file = await captureGeneralDisclosure(page, stockCode, disc, outputDir);
          if (file) {
            savedFiles.push(file);
          } else {
            console.log(`    ${disc.title} — 캡처할 테이블 없음`);
          }
        }
      } catch (err) {
        console.log(`    ${disc.title} 캡처 실패: ${err.message}`);
        // 브라우저 크래시 확인
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
