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
  '임원매매': ['변동사유', '보유주식수', '거래유형', '특정증권등의 소유상황', '소유주식', '단가'],
  '대량보유': ['보유주식등의 수', '보유비율', '요약정보', '보유주식'],
  '영업정지': ['영업정지', '중단사유', '영업정지금액'],
  '감사의견': ['감사의견', '재무상태표', '손익계산서', '의견종류'],
  '신규시설투자': ['투자내역', '투자금액'],
  '자기주식': ['처분방법', '처분수량', '처분(예정)주식', '취득방법', '취득수량', '취득(예정)주식'],
  '단일판매공급': ['계약내역', '계약금액'],
  '유상증자': ['발행주식', '조달금액', '증자방식'],
  '소송': ['소송내용', '소송가액'],
  '최대주주변경': ['변동내역', '변경내역', '최대주주'],
  '블록딜': ['거래내역', '주식등의대량보유'],
  '배당': ['배당금', '배당에 관한 사항', '현금배당', '1주당 배당금'],
};

/**
 * DART 본문 iframe 찾기 — 모든 frame을 탐색해서 table이 가장 많은 프레임 선택
 * DART 공시 페이지는 거의 모든 공시가 iframe 안에 본문이 있음
 */
async function findDartContentFrame(page) {
  const frames = page.frames();
  let bestFrame = page.mainFrame();
  let bestCount = 0;

  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    try {
      const tableCount = await frame.evaluate(() => {
        return document.querySelectorAll('table').length;
      });
      console.log(`    frame "${frame.name() || frame.url().slice(-40)}" → table ${tableCount}개`);
      if (tableCount > bestCount) {
        bestCount = tableCount;
        bestFrame = frame;
      }
    } catch {
      // cross-origin frame 등 무시
    }
  }

  // 메인 프레임 table 수도 확인
  try {
    const mainCount = await page.mainFrame().evaluate(() => {
      return document.querySelectorAll('table').length;
    });
    console.log(`    mainFrame → table ${mainCount}개`);
    if (mainCount > bestCount) {
      bestFrame = page.mainFrame();
    }
  } catch {}

  return bestFrame;
}

/**
 * 프레임 내에서 키워드로 핵심 테이블 찾아 element handle 반환
 * 모든 텍스트 노드를 탐색 (th, td, caption, h1~h4, p, span, b, strong, font)
 */
async function findTargetTable(frame, keywords) {
  // 디버그: 프레임 내 모든 table 개수 출력
  const tableInfo = await frame.evaluate(() => {
    const tables = document.querySelectorAll('table');
    return Array.from(tables).slice(0, 10).map((t, i) => {
      const firstCell = t.querySelector('th, td, caption');
      return `table[${i}] ${t.rows?.length || 0}행 — "${(firstCell?.textContent || '').trim().slice(0, 40)}"`;
    });
  });
  console.log(`    프레임 내 테이블:`, tableInfo.join(' | '));

  for (const keyword of keywords) {
    console.log(`    키워드 "${keyword}" 검색 중...`);

    const handle = await frame.evaluateHandle((kw) => {
      // 넓은 범위 검색: 거의 모든 텍스트 노드
      const selectors = 'th, td, caption, h1, h2, h3, h4, p, span, b, strong, font, div';
      const candidates = document.querySelectorAll(selectors);
      for (const node of candidates) {
        // 자기 자신의 직접 텍스트만 확인 (자식 텍스트 제외하면 너무 엄격하므로 includes 사용)
        if (!node.textContent.includes(kw)) continue;

        // 1. 가장 가까운 <table> 부모
        const table = node.closest('table');
        if (table && table.rows && table.rows.length > 1) return table;

        // 2. 다음 형제에서 table 찾기
        let sibling = node.nextElementSibling || node.parentElement?.nextElementSibling;
        let depth = 0;
        while (sibling && depth < 5) {
          if (sibling.tagName === 'TABLE') return sibling;
          const inner = sibling.querySelector('table');
          if (inner) return inner;
          sibling = sibling.nextElementSibling;
          depth++;
        }

        // 3. 부모의 다음 형제에서 table 찾기
        let parent = node.parentElement;
        for (let up = 0; up < 3 && parent; up++) {
          sibling = parent.nextElementSibling;
          let sibDepth = 0;
          while (sibling && sibDepth < 3) {
            if (sibling.tagName === 'TABLE') return sibling;
            const inner = sibling.querySelector('table');
            if (inner) return inner;
            sibling = sibling.nextElementSibling;
            sibDepth++;
          }
          parent = parent.parentElement;
        }
      }
      return null;
    }, keyword);

    const el = handle.asElement();
    if (el) {
      const box = await el.boundingBox();
      if (box && box.width > 50 && box.height > 20) {
        const info = await frame.evaluate(el => {
          return `${el.tagName} ${el.rows?.length || 0}행 "${(el.querySelector('th,td')?.textContent || '').trim().slice(0, 30)}"`;
        }, el);
        console.log(`    키워드 "${keyword}" 매칭! → ${info} (${Math.round(box.width)}x${Math.round(box.height)})`);
        return el;
      }
    }
    handle.dispose();
  }

  console.log(`    모든 키워드 매칭 실패`);
  return null;
}

/**
 * DART 공시 페이지 캡처 — iframe 대응 + element.screenshot()
 */
async function captureDartDisclosure(dartUrl, disclosureType, outputPath, browser) {
  const page = await browser.newPage();

  try {
    console.log(`\n  ── DART 캡처 시작: ${disclosureType} ──`);
    console.log(`  URL: ${dartUrl}`);
    await page.goto(dartUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 팝업/오버레이 닫기
    await page.evaluate(() => {
      document.querySelectorAll('.ui-dialog .ui-dialog-titlebar-close, .close, [aria-label="Close"]')
        .forEach(btn => btn.click());
    }).catch(() => {});

    // 공시 유형별 키워드
    const keywords = DART_CAPTURE_TARGETS[disclosureType] || [disclosureType];
    console.log(`  검색 키워드: [${keywords.join(', ')}]`);

    // 모든 frame을 순회하며 키워드 검색 (best frame 하나만이 아닌 전체)
    const allFrames = page.frames();
    console.log(`  프레임 탐색 중... (전체 ${allFrames.length}개)`);

    let targetEl = null;
    let targetFrame = null;

    for (const frame of allFrames) {
      try {
        const tableCount = await frame.evaluate(() => document.querySelectorAll('table').length);
        if (tableCount === 0) continue;
        const frameName = frame === page.mainFrame() ? 'main' : (frame.name() || frame.url().slice(-50));
        console.log(`  프레임 "${frameName}" (table ${tableCount}개) 검색...`);

        const el = await findTargetTable(frame, keywords);
        if (el) {
          targetEl = el;
          targetFrame = frame;
          console.log(`  → 프레임 "${frameName}"에서 매칭 성공`);
          break;
        }
      } catch {
        // cross-origin 등 무시
      }
    }

    if (targetEl) {
      // 스크롤 후 대기
      await targetFrame.evaluate(el => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, targetEl);
      await new Promise(r => setTimeout(r, 1000));

      // boundingBox로 위치 확인
      const box = await targetEl.boundingBox();

      if (box) {
        // 뷰포트 밖이면 뷰포트 확장
        if (box.y + box.height > 1080) {
          await page.setViewport({ width: VIEWPORT.width, height: Math.ceil(box.y + box.height + 100), deviceScaleFactor: VIEWPORT.deviceScaleFactor });
          await new Promise(r => setTimeout(r, 500));
        }

        const captureHeight = Math.min(box.height + 60, 1500);
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

      // boundingBox null → element.screenshot() 시도
      try {
        await targetEl.screenshot({ path: outputPath });
        console.log(`  캡처 완료: ${disclosureType} (element screenshot)`);
        return true;
      } catch (e) {
        console.warn(`  element.screenshot 실패:`, e.message);
      }
    }

    // 매칭 실패 → 캡처 스킵 (빈 캡처보다 없는 게 나음)
    console.warn(`  DART "${disclosureType}" 모든 프레임에서 키워드 매칭 실패 — 캡처 스킵`);
    return false;

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
