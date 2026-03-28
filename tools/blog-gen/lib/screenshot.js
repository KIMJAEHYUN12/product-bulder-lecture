/**
 * Step 2: Puppeteer 스크린샷 캡처
 *
 * SimplyStock 종목 페이지 + DART 공시 페이지 캡처.
 * 캡처 타이밍 문제 해결을 위한 대기 로직 포함.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const sel = require('./utils/selectors');

const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };
const CHART_WAIT = 3000;  // 차트 렌더링 대기(ms)
const TAB_WAIT = 2500;    // 탭 전환 후 대기(ms)

/** 시스템 Chrome 경로 감지 (Windows / macOS / Linux) */
function findChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
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
    return null; // Puppeteer 번들 Chrome 사용
  }
}

// ── 헬퍼 함수 ────────────────────────────────────────────

/** 텍스트로 버튼 클릭 */
async function clickButtonByText(page, text) {
  return page.evaluate((t) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === t) {
        btn.click();
        return true;
      }
    }
    return false;
  }, text);
}

/** 탭 클릭 + 차트 렌더링 대기 */
async function clickTabAndWait(page, tabText, waitMs = TAB_WAIT) {
  const clicked = await clickButtonByText(page, tabText);
  if (!clicked) {
    console.warn(`버튼 "${tabText}" 을(를) 찾지 못함`);
    return false;
  }

  // MutationObserver로 차트 변경 감지
  await page.evaluate(() => {
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        observer.disconnect();
        resolve();
      });
      const target = document.querySelector('canvas')?.parentElement;
      if (target) {
        observer.observe(target, { childList: true, subtree: true, attributes: true });
      }
      setTimeout(resolve, 3000); // 안전장치
    });
  });

  await new Promise(r => setTimeout(r, waitMs));
  return true;
}

/** 차트 컨테이너 캡처 (canvas 포함 영역) */
async function captureChartArea(page, outputPath) {
  // 차트를 감싸는 첫 번째 큰 섹션 찾기
  const container = await page.evaluateHandle(() => {
    // canvas를 포함하는 가장 가까운 rounded 컨테이너
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    let el = canvas.parentElement;
    while (el && !el.classList.toString().includes('rounded')) {
      el = el.parentElement;
    }
    return el || canvas.parentElement?.parentElement?.parentElement;
  });

  if (container.asElement()) {
    await container.asElement().screenshot({ path: outputPath });
    return true;
  }

  // fallback: 뷰포트 상단 영역 캡처
  await page.screenshot({
    path: outputPath,
    clip: { x: 0, y: 0, width: 1920, height: 900 },
  });
  return true;
}

/** 특정 요소 캡처 (스크롤 포함) */
async function captureElement(page, selector, outputPath) {
  const element = await page.$(selector);
  if (!element) {
    console.warn(`요소 "${selector}" 을(를) 찾지 못함`);
    return false;
  }

  await page.evaluate(el => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, element);
  await new Promise(r => setTimeout(r, 500));

  await element.screenshot({ path: outputPath });
  return true;
}

// ── SimplyStock 캡처 시퀀스 ──────────────────────────────

/**
 * SimplyStock 종목 페이지 캡처
 * @param {string} stockCode - 6자리 종목코드
 * @param {string} outputDir - 이미지 저장 폴더
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<string[]>} 생성된 이미지 파일 경로 목록
 */
async function captureSimplyStock(stockCode, outputDir, onProgress = () => {}) {
  const imagesDir = path.join(outputDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: 'new',
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1920,1080'],
    defaultViewport: VIEWPORT,
  });

  const images = [];

  try {
    const page = await browser.newPage();

    // ── 1. 종목 페이지 접속 ──
    onProgress('종목 페이지 로딩 중...');
    await page.goto(`${sel.BASE_URL}/stock/${stockCode}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 클라이언트 사이드 렌더링 대기: canvas가 나타날 때까지 (최대 20초)
    onProgress('차트 렌더링 대기 중...');
    await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
      console.warn('canvas 대기 타임아웃 — 계속 진행');
    });
    // 차트 데이터 fetch + 렌더링 완료 추가 대기
    await new Promise(r => setTimeout(r, 5000));

    // ── 2. 월봉 캡처 ──
    onProgress('월봉 캡처 중...');
    await clickTabAndWait(page, sel.TAB_MONTHLY);
    // 5Y 기간으로 전환 (월봉은 장기가 좋음)
    await clickButtonByText(page, sel.PERIOD_5Y);
    await new Promise(r => setTimeout(r, TAB_WAIT));
    const monthlyPath = path.join(imagesDir, '01_월봉_회귀채널.png');
    await captureChartArea(page, monthlyPath);
    images.push('images/01_월봉_회귀채널.png');

    // ── 3. 주봉 캡처 ──
    onProgress('주봉 캡처 중...');
    await clickTabAndWait(page, sel.TAB_WEEKLY);
    await clickButtonByText(page, sel.PERIOD_2Y);
    await new Promise(r => setTimeout(r, TAB_WAIT));
    const weeklyPath = path.join(imagesDir, '02_주봉_회귀채널.png');
    await captureChartArea(page, weeklyPath);
    images.push('images/02_주봉_회귀채널.png');

    // ── 4. 일봉 캡처 (수급 차트 포함) ──
    onProgress('일봉 캡처 중...');
    await clickTabAndWait(page, sel.TAB_DAILY);
    await clickButtonByText(page, sel.PERIOD_6M);
    await new Promise(r => setTimeout(r, TAB_WAIT));
    const dailyPath = path.join(imagesDir, '03_일봉_회귀채널_수급.png');
    await captureChartArea(page, dailyPath);
    images.push('images/03_일봉_회귀채널_수급.png');

    // ── 5. 매매동향 테이블 캡처 ──
    onProgress('매매동향 캡처 중...');
    // PC 테이블 펼치기 시도
    const expandBtn = await page.$('button.w-full.flex.items-center.gap-2.px-4.pt-3');
    if (expandBtn) {
      await expandBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    const tablePath = path.join(imagesDir, '05_매매동향_테이블.png');
    const tableOk = await captureElement(page, 'table.min-w-\\[640px\\]', tablePath);
    if (tableOk) images.push('images/05_매매동향_테이블.png');

    // ── 6. 밸류에이션 페이지 이동 ──
    onProgress('밸류에이션 페이지 이동 중...');
    await page.goto(`${sel.BASE_URL}/valuation/?ticker=${stockCode}.KS`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    // 밸류에이션 차트 렌더링 대기
    await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
      console.warn('밸류에이션 canvas 대기 타임아웃');
    });
    await new Promise(r => setTimeout(r, 5000));

    // ── 7. Forward PER 캡처 ──
    onProgress('Forward PER 캡처 중...');
    await clickTabAndWait(page, sel.VAL_TAB_FORWARD);
    const forwardPath = path.join(imagesDir, '06_forward_per.png');
    await captureChartArea(page, forwardPath);
    images.push('images/06_forward_per.png');

    // ── 8. Trailing PER 캡처 ──
    onProgress('Trailing PER 캡처 중...');
    await clickTabAndWait(page, sel.VAL_TAB_TRAILING);
    const trailingPath = path.join(imagesDir, '07_trailing_per.png');
    await captureChartArea(page, trailingPath);
    images.push('images/07_trailing_per.png');

    // ── 9. PBR 캡처 ──
    onProgress('PBR 캡처 중...');
    await clickTabAndWait(page, sel.VAL_TAB_PBR);
    const pbrPath = path.join(imagesDir, '08_pbr.png');
    await captureChartArea(page, pbrPath);
    images.push('images/08_pbr.png');

  } finally {
    await browser.close();
  }

  return images;
}

// ── DART 공시 캡처 ───────────────────────────────────────

/** DART 공시 유형별 캡처 키워드 */
const DART_CAPTURE_TARGETS = {
  '블록딜': { keyword: '거래내역', fallback: '주식등의대량보유' },
  '임원매매': { keyword: '거래계획', fallback: '특정증권등' },
  '신규시설투자': { keyword: '투자내역', fallback: '투자금액' },
  '영업정지': { keyword: '영업정지금액', fallback: '영업정지' },
  '자기주식': { keyword: '취득(처분)예정주식수', fallback: '자기주식' },
  '대량보유': { keyword: '요약정보', fallback: '보유주식' },
  '단일판매공급': { keyword: '계약내용', fallback: '계약금액' },
  '소송': { keyword: '소송가액', fallback: '소송내용' },
  '유상증자': { keyword: '발행주식수', fallback: '증자방식' },
  '최대주주변경': { keyword: '변경후', fallback: '최대주주' },
  '감사의견': { keyword: '감사의견', fallback: '의견종류' },
};

/**
 * DART 공시 페이지 캡처
 * @param {string} dartUrl - DART 공시 URL
 * @param {string} disclosureType - 공시 유형 (DART_CAPTURE_TARGETS 키)
 * @param {string} outputPath - 저장 경로
 * @returns {Promise<boolean>}
 */
async function captureDartDisclosure(dartUrl, disclosureType, outputPath, browser) {
  const page = await browser.newPage();

  try {
    await page.goto(dartUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const target = DART_CAPTURE_TARGETS[disclosureType];
    const keywords = target ? [target.keyword, target.fallback] : [];

    // 키워드로 대상 요소 찾기
    for (const keyword of keywords) {
      const found = await page.evaluate((kw) => {
        const elements = document.querySelectorAll('table, h2, h3, th, td');
        for (const el of elements) {
          if (el.textContent.includes(kw)) {
            const table = el.closest('table') || el;
            table.scrollIntoView({ block: 'center', behavior: 'instant' });
            return true;
          }
        }
        return false;
      }, keyword);

      if (found) {
        await new Promise(r => setTimeout(r, 1500)); // 스크롤 안정화
        // 요소 기준 캡처
        const box = await page.evaluate((kw) => {
          const elements = document.querySelectorAll('table, h2, h3, th, td');
          for (const el of elements) {
            if (el.textContent.includes(kw)) {
              const table = el.closest('table') || el;
              const rect = table.getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }
          }
          return null;
        }, keyword);

        if (box && box.width > 0 && box.height > 0) {
          await page.screenshot({
            path: outputPath,
            clip: {
              x: Math.max(0, box.x - 20),
              y: Math.max(0, box.y - 50),
              width: Math.min(box.width + 40, 1920),
              height: Math.min(box.height + 100, 1080),
            },
          });
          return true;
        }
      }
    }

    // fallback: fullPage 캡처
    console.warn(`DART "${disclosureType}" 대상 요소 못 찾음 — 전체 페이지 캡처`);
    await page.screenshot({ path: outputPath, fullPage: true });
    return true;

  } catch (err) {
    console.error(`DART 캡처 실패 (${disclosureType}):`, err.message);
    return false;
  } finally {
    await page.close();
  }
}

/**
 * DART 히트 공시들 캡처
 * @param {Array} hits - dart-checker의 hits 배열
 * @param {string} outputDir - 출력 폴더
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<Array>} 캡처 경로가 추가된 hits
 */
async function captureDartHits(hits, outputDir, onProgress = () => {}) {
  if (!hits || hits.length === 0) return [];

  const dartDir = path.join(outputDir, 'images', 'dart');
  fs.mkdirSync(dartDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: VIEWPORT,
  });

  try {
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const idx = String(i + 9).padStart(2, '0'); // 09부터 시작
      const filename = `${idx}_${hit.type}_공시.png`;
      const outputPath = path.join(dartDir, filename);

      onProgress(`DART 캡처 ${i + 1}/${hits.length}: ${hit.type}`);

      const ok = await captureDartDisclosure(hit.url, hit.type, outputPath, browser);
      if (ok) {
        hit.screenshot = `images/dart/${filename}`;
      }
    }
  } finally {
    await browser.close();
  }

  return hits;
}

module.exports = {
  captureSimplyStock,
  captureDartHits,
  captureDartDisclosure,
  DART_CAPTURE_TARGETS,
};
