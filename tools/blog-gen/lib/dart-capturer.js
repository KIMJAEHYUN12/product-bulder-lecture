/**
 * DART 캡처 v2 — element.screenshot() 전용
 *
 * v1 문제: iframe 높이 제한으로 테이블 잘림, 키워드 없이 가장 큰 테이블만 찾음
 * v2 수정:
 *   1. iframe 높이 제한 해제 → 테이블 전체 캡처
 *   2. 키워드 기반 테이블 검색 → 정확한 타겟
 *   3. 제목 + 테이블 래핑 → 섹션 제목 포함
 *   4. 최소 행/셀 검증 → 빈 캡처 방지
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

// 공시 유형별 테이블 검색 키워드
const GENERAL_TABLE_KEYWORDS = {
  audit: ['감사의견', '의견종류'],
  stake: ['보유주식수', '보유비율', '보유주식등의 수', '보유현황'],
  corporate: ['배당금', '1주당 배당금', '배당에 관한', '투자금액', '신규시설', '증자방식'],
  critical: ['영업정지', '사업철수'],
  semi: ['매출액', '영업이익', '당기순이익'],
  quarterly: ['매출액', '영업이익', '당기순이익'],
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

// ── 캡처 준비 ─────────────────────────────────

/**
 * iframe 높이 제한 해제 + 뷰포트 확장
 * 테이블이 iframe 경계에 의해 잘리지 않도록 함
 */
async function prepareForCapture(page, frame) {
  // 메인 페이지: iframe + 부모 컨테이너 높이/overflow 해제
  await page.evaluate(() => {
    document.querySelectorAll('iframe').forEach((f) => {
      f.style.height = '15000px';
      f.style.maxHeight = 'none';
      f.style.overflow = 'visible';
      let parent = f.parentElement;
      for (let i = 0; i < 5 && parent && parent !== document.body; i++) {
        parent.style.overflow = 'visible';
        parent.style.maxHeight = 'none';
        parent.style.height = 'auto';
        parent = parent.parentElement;
      }
    });
  });

  // frame 내부: body overflow 해제
  try {
    await frame.evaluate(() => {
      document.body.style.overflow = 'visible';
      document.body.style.height = 'auto';
      document.documentElement.style.overflow = 'visible';
      document.documentElement.style.height = 'auto';
    });
  } catch {}

  // 뷰포트를 충분히 크게
  await page.setViewport({ width: 1200, height: 10000, deviceScaleFactor: 2 });
  await delay(300);
}

// ── 테이블 검색 + 캡처 ───────────────────────

/**
 * frame 내에서 키워드로 테이블을 찾아 <table> element.screenshot()
 *
 * @param {Frame} frame
 * @param {string} filePath
 * @param {object} options
 * @param {string[]} options.keywords - 테이블 내 검색 키워드 (순서대로 시도)
 * @param {number} options.minRows - 최소 행 수 (기본 3)
 * @param {boolean} options.withHeading - 섹션 제목 포함 여부
 * @returns {Promise<boolean>}
 */
async function captureTable(frame, filePath, { keywords = [], minRows = 3, withHeading = false } = {}) {
  const handle = await frame.evaluateHandle(
    ({ kws, min }) => {
      const tables = Array.from(document.querySelectorAll('table'));

      // 1. 키워드 매칭
      if (kws.length > 0) {
        for (const kw of kws) {
          const found = tables.find((t) => {
            if ((t.rows?.length || 0) < min) return false;
            return (t.textContent || '').includes(kw);
          });
          if (found) return found;
        }
      }

      // 2. fallback: 가장 큰 테이블 (최소 행 수 충족)
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

  // 제목 포함 래핑 (withHeading=true)
  let captureTarget = tableEl;
  if (withHeading) {
    const wrapperHandle = await frame.evaluateHandle((table) => {
      // 테이블 앞의 제목 요소 찾기
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

      // 부모가 다르면 래핑 불가 → 테이블만 반환
      if (heading.parentElement !== table.parentElement) return table;

      // heading ~ table 범위를 임시 wrapper로 감싸기
      const wrapper = document.createElement('div');
      wrapper.id = '__dart_capture_wrapper';
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

  // 스크롤 + 캡처
  await frame.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }), captureTarget);
  await delay(300);

  await captureTarget.screenshot({ path: filePath });
  return true;
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
    const expanders = document.querySelectorAll(
      '.jstree-closed > ins, .jstree-closed > i, [class*="closed"] > ins',
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

// ── 사업보고서 캡처 ──────────────────────────

async function captureAnnualReport(page, stockCode, outputDir) {
  const sections = [
    {
      treeKeywords: ['매출', '수주'],
      tableKeywords: ['매출액', '매출'],
      suffix: 'dart_01_매출실적',
      label: '매출실적',
    },
    {
      treeKeywords: ['연결 재무상태표', '재무상태표'],
      tableKeywords: ['자산총계', '유동자산'],
      suffix: 'dart_02_연결재무상태표',
      label: '재무상태표',
    },
    {
      treeKeywords: ['연결 포괄손익', '포괄손익계산서', '손익계산서'],
      tableKeywords: ['매출액', '영업이익', '당기순이익'],
      suffix: 'dart_03_포괄손익계산서',
      label: '손익계산서',
    },
  ];

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

      // iframe 높이 제한 해제
      await prepareForCapture(page, contentFrame);

      const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${section.suffix}.png`);
      const ok = await captureTable(contentFrame, filePath, {
        keywords: section.tableKeywords,
        minRows: 3,
        withHeading: true,
      });

      if (ok) {
        results.push(`images/dart/${stockCode}_${section.suffix}.png`);
        console.log(`    ${section.label} 캡처 완료`);
      } else {
        console.log(`    ${section.label} — 유효한 테이블 없음, 스킵`);
      }
    } catch (err) {
      console.log(`    ${section.label} 캡처 실패: ${err.message}`);
    }
  }

  return results;
}

// ── 일반 공시 캡처 ────────────────────────────

async function captureGeneralDisclosure(page, stockCode, disc, outputDir) {
  try {
    const contentFrame = await findContentFrame(page);
    if (!contentFrame) return null;

    // iframe 높이 제한 해제
    await prepareForCapture(page, contentFrame);

    const suffix = `dart_${disc.type}`;
    const filePath = path.join(outputDir, 'images', 'dart', `${stockCode}_${suffix}.png`);

    const keywords = GENERAL_TABLE_KEYWORDS[disc.type] || [];
    const ok = await captureTable(contentFrame, filePath, {
      keywords,
      minRows: 3,
    });

    return ok ? `images/dart/${stockCode}_${suffix}.png` : null;
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

        if (disc.type === 'annual') {
          const files = await captureAnnualReport(page, stockCode, outputDir);
          savedFiles.push(...files);
        } else {
          const file = await captureGeneralDisclosure(page, stockCode, disc, outputDir);
          if (file) {
            savedFiles.push(file);
          } else {
            console.log(`    ${disc.title} — 유효한 테이블 없음, 스킵`);
          }
        }

        // 뷰포트 복원 (메모리 절약)
        await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
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
