/**
 * Step 2: Puppeteer 스크린샷 캡처
 *
 * SimplyStock 메인페이지 종목검색 결과 + DART 공시 페이지 캡처.
 * URL: https://www.simplystock.co.kr/?ticker=005930.KS
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const sel = require('./utils/selectors');

const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };
const RENDER_WAIT = 4000;  // 차트 렌더링 대기(ms)
const TAB_WAIT = 3000;     // 탭 전환 후 대기(ms)

/** 시스템 Chrome 경로 감지 */
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

// ── 헬퍼 함수 ────────────────────────────────────────────

/**
 * 공지 배너 / 팝업 숨기기
 * AnnounceBanner (border-indigo-500) + PushNotificationBanner 등
 */
async function dismissBanners(page) {
  await page.evaluate(() => {
    // 1. aria-label="닫기" 버튼 클릭 (AnnounceBanner의 X 버튼)
    document.querySelectorAll('button[aria-label="닫기"]').forEach(btn => {
      btn.click();
    });
    // 2. border-indigo-500 배너 숨김 (fallback)
    document.querySelectorAll('.border-indigo-500').forEach(el => {
      const wrapper = el.closest('.mx-auto');
      if (wrapper) wrapper.style.display = 'none';
      else el.style.display = 'none';
    });
    // 3. fixed/sticky 하단 배너 숨김
    document.querySelectorAll('[class*="fixed"], [class*="sticky"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 100 && rect.height < 200) {
        el.style.display = 'none';
      }
    });
  });
  await new Promise(r => setTimeout(r, 300));
}

/**
 * 봉 타입 버튼 클릭 (1글자: "일", "주", "월")
 * "봉" 레이블 바로 뒤에 있는 버튼들 중에서 정확히 매칭
 */
async function clickCandleTab(page, tabText) {
  return page.evaluate((t) => {
    // "봉" span을 찾고, 그 형제 버튼들 중 매칭
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent.trim() === '봉') {
        const parent = span.parentElement;
        if (!parent) continue;
        const buttons = parent.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === t) {
            btn.click();
            return true;
          }
        }
      }
    }
    return false;
  }, tabText);
}

/**
 * 기간 버튼 클릭 ("1M", "3M" 등)
 * "조회" 레이블 뒤의 버튼들 중 매칭
 */
async function clickPeriodButton(page, periodText) {
  return page.evaluate((t) => {
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent.trim() === '조회') {
        const parent = span.parentElement;
        if (!parent) continue;
        const buttons = parent.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === t) {
            btn.click();
            return true;
          }
        }
      }
    }
    return false;
  }, periodText);
}

/**
 * 수급 차트 모드 전환 ("합산" / "주체별")
 */
async function clickSupplyTab(page, tabText) {
  return page.evaluate((t) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === t) {
        btn.click();
        return true;
      }
    }
    return false;
  }, tabText);
}

/**
 * 밸류에이션 탭 클릭 ("Forward PER", "Trailing PER", "PBR")
 * 버튼 안에 span이 있어서 includes로 매칭
 */
async function clickValuationTab(page, tabText) {
  return page.evaluate((t) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      // span 안의 텍스트도 확인
      const spans = btn.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent.trim() === t) {
          btn.click();
          return true;
        }
      }
      // fallback: 버튼 전체 텍스트에 포함
      if (btn.textContent.includes(t)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, tabText);
}

/** 차트 렌더링 대기 (canvas 변경 감지 + 타임아웃) */
async function waitForChartRender(page, waitMs = TAB_WAIT) {
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
      setTimeout(resolve, 3000);
    });
  });
  await new Promise(r => setTimeout(r, waitMs));
}

/**
 * 캔들차트 영역만 캡처 (시그널바 + 탭 + 캔들차트 + 회귀채널)
 * 수급 차트와 매매동향 테이블은 제외
 */
async function captureChartOnly(page, outputPath) {
  const clipBox = await page.evaluate(() => {
    const container = document.querySelector('div.w-full.rounded-none');
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();

    // 첫 번째 canvas = 캔들차트 (priceContainerRef)
    const canvases = container.querySelectorAll('canvas');
    if (canvases.length === 0) return null;
    const firstCanvas = canvases[0];

    // canvas의 부모 div (priceContainerRef.w-full)의 하단까지 캡처
    const canvasParent = firstCanvas.parentElement;
    const canvasRect = canvasParent ? canvasParent.getBoundingClientRect() : firstCanvas.getBoundingClientRect();

    return {
      x: Math.max(0, containerRect.x),
      y: Math.max(0, containerRect.y),
      width: containerRect.width,
      // 컨테이너 상단 ~ 캔들차트 하단 + 날짜축 여백
      height: canvasRect.bottom - containerRect.y + 40,
    };
  });

  if (clipBox && clipBox.width > 0 && clipBox.height > 0) {
    await page.screenshot({ path: outputPath, clip: clipBox });
    return true;
  }

  // fallback: 뷰포트 상단
  await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: 1920, height: 800 } });
  return true;
}

/**
 * 수급 차트 영역만 캡처 (InvestorFlowChartV2)
 */
async function captureSupplyChart(page, outputPath) {
  const element = await page.evaluateHandle(() => {
    // InvestorFlowChartV2: "합산"/"주체별" 버튼 + canvas를 포함하는 rounded-lg border 컨테이너
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === '합산' || btn.textContent.trim() === '주체별') {
        // 이 버튼의 부모 컨테이너를 찾음
        let el = btn.parentElement;
        while (el) {
          if (el.classList.contains('rounded-lg') && el.querySelector('canvas')) {
            return el;
          }
          el = el.parentElement;
        }
      }
    }
    return null;
  });

  if (element.asElement()) {
    await element.asElement().screenshot({ path: outputPath });
    return true;
  }
  return false;
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
 * SimplyStock 종목 페이지 캡처 (9장)
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
    const yahooSymbol = `${stockCode}.KS`;

    // ── 1. 종목 페이지 접속 ──
    onProgress('종목 페이지 로딩 중...');
    await page.goto(`${sel.BASE_URL}/?ticker=${yahooSymbol}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // canvas가 나타날 때까지 대기
    onProgress('차트 렌더링 대기 중...');
    await page.waitForSelector('canvas', { timeout: 25000 }).catch(() => {
      console.warn('canvas 대기 타임아웃 — 계속 진행');
    });
    await new Promise(r => setTimeout(r, RENDER_WAIT));

    // 공지 배너 / 팝업 숨기기
    await dismissBanners(page);

    // 디버그: 페이지 상태 확인
    const debugInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const buttons = document.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent.trim()).filter(t => t.length <= 5);
      return {
        canvasCount: canvases.length,
        buttonCount: buttons.length,
        shortButtons: btnTexts.slice(0, 30),
      };
    });
    console.log('페이지 상태:', JSON.stringify(debugInfo));

    // ── 2. 월봉 캡처 ──
    onProgress('월봉 캡처 중...');
    await clickCandleTab(page, sel.TAB_MONTHLY);
    await new Promise(r => setTimeout(r, 500));
    await clickPeriodButton(page, sel.PERIOD_5Y);
    await waitForChartRender(page);
    const monthlyPath = path.join(imagesDir, '01_월봉_회귀채널.png');
    await captureChartOnly(page, monthlyPath);
    images.push('images/01_월봉_회귀채널.png');

    // ── 3. 주봉 캡처 ──
    onProgress('주봉 캡처 중...');
    await clickCandleTab(page, sel.TAB_WEEKLY);
    await new Promise(r => setTimeout(r, 500));
    await clickPeriodButton(page, sel.PERIOD_2Y);
    await waitForChartRender(page);
    const weeklyPath = path.join(imagesDir, '02_주봉_회귀채널.png');
    await captureChartOnly(page, weeklyPath);
    images.push('images/02_주봉_회귀채널.png');

    // ── 4. 일봉 캡처 (수급 바차트 포함) ──
    onProgress('일봉 캡처 중...');
    await clickCandleTab(page, sel.TAB_DAILY);
    await new Promise(r => setTimeout(r, 500));
    await clickPeriodButton(page, sel.PERIOD_6M);
    await waitForChartRender(page);
    const dailyPath = path.join(imagesDir, '03_일봉_회귀채널_수급.png');
    await captureChartOnly(page, dailyPath);
    images.push('images/03_일봉_회귀채널_수급.png');

    // ── 5. 수급 합산 캡처 ──
    onProgress('수급 합산 캡처 중...');
    await clickSupplyTab(page, sel.SUPPLY_TAB_BAR);
    await waitForChartRender(page, 2000);
    const supplyBarPath = path.join(imagesDir, '04_수급_합산.png');
    const supplyBarOk = await captureSupplyChart(page, supplyBarPath);
    if (supplyBarOk) images.push('images/04_수급_합산.png');

    // ── 6. 수급 주체별 캡처 ──
    onProgress('수급 주체별 캡처 중...');
    await clickSupplyTab(page, sel.SUPPLY_TAB_LINE);
    await waitForChartRender(page, 2000);
    const supplyLinePath = path.join(imagesDir, '05_수급_주체별.png');
    const supplyLineOk = await captureSupplyChart(page, supplyLinePath);
    if (supplyLineOk) images.push('images/05_수급_주체별.png');

    // ── 7. 매매동향 테이블 캡처 ──
    onProgress('매매동향 캡처 중...');

    // 테이블이 이미 DOM에 있는지 확인 (showDailyDetail이 이미 true일 수 있음)
    let tradeTableVisible = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rect = table.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const h = table.querySelector('thead')?.textContent || '';
        if (h.includes('날짜') && h.includes('종가')) return true;
      }
      return false;
    });

    if (!tradeTableVisible) {
      // 테이블이 없으면 토글 클릭으로 열기
      await page.evaluate(() => {
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent.trim() === '일별 매매동향') {
            const btn = span.closest('button');
            if (!btn) continue;
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) { btn.click(); return; }
          }
        }
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    const tablePath = path.join(imagesDir, '06_매매동향_테이블.png');
    const tableHandle = await page.evaluateHandle(() => {
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rect = table.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const h = table.querySelector('thead')?.textContent || '';
        if (h.includes('날짜') && h.includes('종가')) {
          // 최근 15행만 남기고 나머지 숨김
          const rows = table.querySelectorAll('tbody tr');
          for (let i = 15; i < rows.length; i++) {
            rows[i].style.display = 'none';
          }
          // maxHeight 해제
          const wrapper = table.closest('.overflow-x-auto') || table.closest('.overflow-auto');
          if (wrapper) wrapper.style.maxHeight = 'none';
          // 부모 컨테이너 반환 (제목 "일별 매매동향" + 테이블 포함)
          const parent = wrapper ? wrapper.parentElement : table.parentElement;
          return parent || wrapper || table;
        }
      }
      return null;
    });
    if (tableHandle.asElement()) {
      await new Promise(r => setTimeout(r, 300));
      await tableHandle.asElement().screenshot({ path: tablePath });
      images.push('images/06_매매동향_테이블.png');
    } else {
      console.warn('매매동향 테이블 캡처 실패');
    }

    // ── 8. 밸류에이션 페이지 이동 ──
    onProgress('밸류에이션 페이지 이동 중...');
    await page.goto(`${sel.BASE_URL}/valuation/?ticker=${yahooSymbol}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {
      console.warn('밸류에이션 canvas 대기 타임아웃');
    });
    await new Promise(r => setTimeout(r, RENDER_WAIT));

    // 검색 드롭다운 닫기 + 공지 배너 숨기기
    await page.click('body');
    await new Promise(r => setTimeout(r, 300));
    await dismissBanners(page);

    // 뷰포트를 확장하여 스크롤 없이 전체 콘텐츠 표시
    await page.setViewport({
      width: VIEWPORT.width,
      height: 4000,
      deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    });
    await new Promise(r => setTimeout(r, 1500));

    // ── 9. Forward PER 캡처 ──
    onProgress('Forward PER 캡처 중...');
    await clickValuationTab(page, sel.VAL_TAB_FORWARD);
    await waitForChartRender(page, 2000);
    // 밸류에이션 전체 콘텐츠 영역 캡처
    const forwardPath = path.join(imagesDir, '07_forward_per.png');
    await captureValuationSection(page, forwardPath);
    images.push('images/07_forward_per.png');

    // ── 10. Trailing PER 캡처 ──
    onProgress('Trailing PER 캡처 중...');
    await clickValuationTab(page, sel.VAL_TAB_TRAILING);
    await waitForChartRender(page, 2000);
    const trailingPath = path.join(imagesDir, '08_trailing_per.png');
    await captureValuationSection(page, trailingPath);
    images.push('images/08_trailing_per.png');

    // ── 11. PBR 캡처 ──
    onProgress('PBR 캡처 중...');
    await clickValuationTab(page, sel.VAL_TAB_PBR);
    await waitForChartRender(page, 2000);
    const pbrPath = path.join(imagesDir, '09_pbr.png');
    await captureValuationSection(page, pbrPath);
    images.push('images/09_pbr.png');

  } finally {
    await browser.close();
  }

  return images;
}

/**
 * 밸류에이션 섹션 캡처 (탭 + 차트 + 밴드 구간 + EPS)
 * main(max-w-3xl) 기준으로 좌우 여백 최소화,
 * 탭 버튼 ~ 마지막 카드까지만 캡처.
 * 호출 전 뷰포트를 충분히 확장해둘 것 (height: 4000).
 */
async function captureValuationSection(page, outputPath) {
  const clipBox = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    const mainRect = main.getBoundingClientRect();

    // 탭 버튼의 부모 컨테이너 찾기 (Forward PER / Trailing PER / PBR 텍스트로 탐색)
    let tabContainer = null;
    const buttons = main.querySelectorAll('button');
    for (const btn of buttons) {
      const spans = btn.querySelectorAll('span');
      for (const span of spans) {
        const t = span.textContent.trim();
        if (t === 'Forward PER' || t === 'Trailing PER' || t === 'PBR') {
          tabContainer = btn.parentElement;
          break;
        }
      }
      if (tabContainer) break;
    }

    if (!tabContainer) {
      // fallback: main 전체
      return { x: mainRect.left, y: mainRect.top, width: mainRect.width, height: mainRect.height };
    }

    const tabRect = tabContainer.getBoundingClientRect();

    // 탭의 부모 = results container (mt-4 space-y-4)
    // 그 안의 마지막 직계 자식의 하단이 콘텐츠 끝
    const resultsContainer = tabContainer.parentElement;
    let bottomY = tabRect.bottom + 800; // fallback
    if (resultsContainer) {
      const children = resultsContainer.querySelectorAll(':scope > div');
      if (children.length > 0) {
        bottomY = children[children.length - 1].getBoundingClientRect().bottom;
      }
    }

    return {
      x: Math.max(0, mainRect.left - 8),
      y: Math.max(0, tabRect.top - 8),
      width: Math.min(mainRect.width + 16, 1920),
      height: bottomY - tabRect.top + 24,
    };
  });

  if (clipBox && clipBox.width > 0 && clipBox.height > 0) {
    await page.screenshot({ path: outputPath, clip: clipBox });
    return true;
  }

  await page.screenshot({ path: outputPath, fullPage: true });
  return true;
}

// ── DART 공시 캡처 ───────────────────────────────────────

/** DART 공시 유형별 캡처 키워드 (우선순위 순) */
const DART_CAPTURE_TARGETS = {
  '임원매매': ['특정증권등의 소유상황', '거래내역', '거래계획', '특정증권등'],
  '대량보유': ['보유주식등의 수', '보유비율', '요약정보', '보유주식'],
  '영업정지': ['영업정지', '중단사유', '영업정지금액'],
  '감사의견': ['감사의견', '재무상태표', '손익계산서', '의견종류'],
  '신규시설투자': ['투자내역', '투자금액'],
  '자기주식': ['취득', '처분', '자기주식'],
  '단일판매공급': ['계약내역', '계약금액'],
  '유상증자': ['발행주식', '조달금액', '증자방식'],
  '소송': ['소송내용', '소송가액'],
  '최대주주변경': ['변경내역', '최대주주', '변경후'],
  '블록딜': ['거래내역', '주식등의대량보유'],
};

/**
 * DART 본문 iframe(또는 frame) 찾기
 * DART 공시 페이지는 본문이 iframe 안에 있음
 */
async function findDartContentFrame(page) {
  // 1. iframe#ifrm 또는 iframe 내에서 table이 있는 프레임 찾기
  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const hasTable = await frame.evaluate(() => {
        return document.querySelectorAll('table').length > 0;
      });
      if (hasTable) return frame;
    } catch {
      // cross-origin frame 등 무시
    }
  }
  // iframe이 없으면 메인 프레임 반환
  return page.mainFrame();
}

/**
 * 프레임 내에서 키워드로 핵심 테이블 찾아 element handle 반환
 */
async function findTargetTable(frame, keywords) {
  for (const keyword of keywords) {
    const handle = await frame.evaluateHandle((kw) => {
      const candidates = document.querySelectorAll('th, td, caption, h3, h4, p, span');
      for (const node of candidates) {
        if (!node.textContent.includes(kw)) continue;
        // 가장 가까운 <table> 부모 찾기
        const table = node.closest('table');
        if (table) return table;
        // table이 아니면 바로 다음 형제에서 table 찾기
        let sibling = node.parentElement?.nextElementSibling;
        while (sibling) {
          if (sibling.tagName === 'TABLE') return sibling;
          const inner = sibling.querySelector('table');
          if (inner) return inner;
          sibling = sibling.nextElementSibling;
        }
        return node.parentElement;
      }
      return null;
    }, keyword);

    const el = handle.asElement();
    if (el) {
      // 요소 크기 확인
      const box = await el.boundingBox();
      if (box && box.width > 50 && box.height > 20) {
        console.log(`  DART 키워드 "${keyword}" → 요소 발견 (${Math.round(box.width)}x${Math.round(box.height)})`);
        return el;
      }
    }
    handle.dispose();
  }
  return null;
}

/**
 * DART 공시 페이지 캡처 — iframe 대응 + element.screenshot()
 */
async function captureDartDisclosure(dartUrl, disclosureType, outputPath, browser) {
  const page = await browser.newPage();

  try {
    console.log(`  DART 접속: ${disclosureType} — ${dartUrl}`);
    await page.goto(dartUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000)); // DART 로딩 여유

    // 팝업/오버레이 닫기
    await page.evaluate(() => {
      document.querySelectorAll('.ui-dialog .ui-dialog-titlebar-close, .close, [aria-label="Close"]')
        .forEach(btn => btn.click());
    }).catch(() => {});

    // 본문 iframe 찾기
    const frame = await findDartContentFrame(page);
    const isIframe = frame !== page.mainFrame();
    console.log(`  프레임: ${isIframe ? 'iframe 내부' : '메인 페이지'}`);

    // 공시 유형별 키워드
    const keywords = DART_CAPTURE_TARGETS[disclosureType] || [disclosureType];

    // 키워드로 핵심 테이블 찾기
    const targetEl = await findTargetTable(frame, keywords);

    if (targetEl) {
      // element.screenshot()은 요소 전체를 자동 캡처 (스크롤 무관)
      await frame.evaluate(el => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, targetEl);
      await new Promise(r => setTimeout(r, 1000));

      if (isIframe) {
        // iframe 내부 요소는 element.screenshot()이 안 될 수 있음
        // → 프레임 내 요소의 위치를 구해서 page 레벨에서 clip 캡처
        const box = await targetEl.boundingBox();
        if (box) {
          // 테이블 높이가 너무 크면 상단 1200px만
          const captureHeight = Math.min(box.height + 60, 1200);
          await page.screenshot({
            path: outputPath,
            clip: {
              x: Math.max(0, box.x - 10),
              y: Math.max(0, box.y - 30),
              width: Math.min(box.width + 20, 1900),
              height: captureHeight,
            },
          });
          console.log(`  캡처 완료: ${disclosureType} (clip ${Math.round(box.width)}x${Math.round(captureHeight)})`);
          return true;
        }
      }

      // 메인 프레임이면 element.screenshot() 직접 사용
      await targetEl.screenshot({ path: outputPath });
      console.log(`  캡처 완료: ${disclosureType} (element screenshot)`);
      return true;
    }

    // fallback: 전체 페이지 캡처 후 상단 crop
    console.warn(`  DART "${disclosureType}" 키워드 매칭 실패 — fullPage fallback`);
    const sharp = require('sharp');
    const fullPath = outputPath.replace('.png', '_full.png');
    await page.screenshot({ path: fullPath, fullPage: true });

    // 상단 30% crop
    const meta = await sharp(fullPath).metadata();
    const cropHeight = Math.min(Math.round(meta.height * 0.3), 1200);
    await sharp(fullPath)
      .extract({ left: 0, top: 0, width: meta.width, height: cropHeight })
      .toFile(outputPath);
    fs.unlinkSync(fullPath); // 임시 파일 삭제
    console.log(`  fallback 캡처: ${disclosureType} (상단 ${cropHeight}px crop)`);
    return true;

  } catch (err) {
    console.error(`  DART 캡처 실패 (${disclosureType}):`, err.message);
    return false;
  } finally {
    await page.close();
  }
}

/**
 * DART 히트 공시들 캡처
 */
async function captureDartHits(hits, outputDir, onProgress = () => {}) {
  if (!hits || hits.length === 0) return [];

  const dartDir = path.join(outputDir, 'images', 'dart');
  fs.mkdirSync(dartDir, { recursive: true });

  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    headless: 'new',
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: VIEWPORT,
  });

  try {
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const idx = String(i + 10).padStart(2, '0'); // 10부터 시작 (09까지는 SimplyStock)
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
