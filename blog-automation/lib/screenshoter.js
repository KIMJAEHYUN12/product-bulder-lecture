const path = require("path");
const puppeteer = require("puppeteer");
const { execSync } = require("child_process");
const { SIMPLYSTOCK_URL } = require("./config");

function findChromium() {
  for (const cmd of ["chromium", "chromium-browser", "google-chrome"]) {
    try {
      return execSync(`which ${cmd} 2>/dev/null`).toString().trim();
    } catch {}
  }
  return undefined;
}

const NAV_OPTIONS = { waitUntil: "domcontentloaded", timeout: 60000 };
const MOBILE_WIDTH = 500;
const DESKTOP_WIDTH = 1100;
const TOTAL_SCREENSHOTS = 8;

/**
 * 스크린샷 8장 캡처 (단일 페이지 재사용, 개별 에러 처리)
 */
async function captureScreenshots(stockCode, outputDir, symbol, progressCb) {
  const ticker = symbol || `${stockCode}.KS`;
  const notify = (idx, desc) => {
    console.log(`  [${idx}/${TOTAL_SCREENSHOTS}] ${desc}`);
    if (progressCb) progressCb(idx, TOTAL_SCREENSHOTS, desc);
  };

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || findChromium(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-networking",
      "--js-flags=--max-old-space-size=256",
    ],
    protocolTimeout: 60000,
  });

  const savedFiles = [];
  const mainUrl = `${SIMPLYSTOCK_URL}/?ticker=${ticker}`;
  const valuUrl = `${SIMPLYSTOCK_URL}/valuation/?ticker=${ticker}`;

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["font", "media"].includes(type)) req.abort();
      else req.continue();
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("ss-theme", "dark");
    });

    // ---- 캡처 작업 목록 ----
    const jobs = [
      {
        name: "일봉 1M 채널",
        suffix: "daily_1m",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: [],
        mode: "chart",
      },
      {
        name: "일봉 MAX 채널",
        suffix: "daily_max",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: ["MAX"],
        mode: "chart",
      },
      {
        name: "주봉 채널",
        suffix: "weekly",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: ["주"],
        mode: "chart",
      },
      {
        name: "월봉 MAX 채널",
        suffix: "monthly_max",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: ["월", "MAX"],
        mode: "chart",
      },
      {
        name: "수급 합산",
        suffix: "supply_combined",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: [],
        mode: "supply",
        tab: "합산",
      },
      {
        name: "수급 주체별",
        suffix: "supply_detail",
        width: MOBILE_WIDTH,
        url: mainUrl,
        clicks: ["주체별"],
        mode: "supply",
        tab: "주체별",
      },
      {
        name: "매매동향 테이블",
        suffix: "trading",
        width: DESKTOP_WIDTH,
        url: mainUrl,
        clicks: [],
        mode: "trading",
      },
      {
        name: "밸류에이션",
        suffix: "valuation",
        width: MOBILE_WIDTH,
        url: valuUrl,
        clicks: [],
        mode: "fullpage",
      },
    ];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      notify(i + 1, `${job.name} 캡처...`);

      try {
        const filePath = path.join(outputDir, `${stockCode}_${job.suffix}.png`);

        // 뷰포트 설정 + 페이지 이동
        await page.setViewport({ width: job.width, height: 900 });
        await page.goto(job.url, NAV_OPTIONS);
        await waitForCanvas(page);

        // 버튼 클릭
        for (const text of job.clicks) {
          await clickButton(page, text);
          await delay(1500);
        }

        // 모드별 캡처
        if (job.mode === "chart") {
          await scrollToSignal(page);
          await delay(500);
          const h = await calcChartHeight(page);
          await page.setViewport({ width: job.width, height: Math.max(h, 600) });
          await scrollToSignal(page);
          await delay(300);
          await page.screenshot({ path: filePath, fullPage: false });
        } else if (job.mode === "supply") {
          const el = await findSupplyContainer(page, job.tab);
          if (el) {
            await el.screenshot({ path: filePath });
          } else {
            await scrollToSupply(page);
            await delay(300);
            await page.screenshot({ path: filePath, fullPage: false });
          }
        } else if (job.mode === "trading") {
          // 페이지 하단까지 스크롤해서 매매동향 테이블 로딩
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await delay(2000);
          const el = await findTradingTable(page);
          await delay(500);
          if (el) {
            await el.screenshot({ path: filePath });
          } else {
            await page.screenshot({ path: filePath, fullPage: false });
          }
        } else if (job.mode === "fullpage") {
          await page.screenshot({ path: filePath, fullPage: true });
        }

        savedFiles.push(filePath);
      } catch (err) {
        console.log(`    ${job.name} 캡처 실패: ${err.message}`);
        // 브라우저 크래시 확인 — 크래시면 중단
        try {
          await page.evaluate(() => true);
        } catch {
          console.log("    브라우저 크래시 감지, 스크린샷 중단");
          break;
        }
      }
    }

    console.log(`  스크린샷 ${savedFiles.length}장 완료`);
  } finally {
    await browser.close().catch(() => {});
  }

  return savedFiles;
}

// --- 헬퍼 ---

async function clickButton(page, text) {
  await page.evaluate((t) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent?.trim() === t);
    if (btn) {
      btn.scrollIntoView({ behavior: "instant", block: "center" });
      btn.click();
    }
  }, text);
}

async function scrollToSignal(page) {
  await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll("div"));
    const signal = allEls.find(
      (el) =>
        (el.textContent?.includes("추세") || el.textContent?.includes("횡보")) &&
        el.textContent?.includes("채널") &&
        el.offsetHeight < 60 &&
        el.offsetHeight > 10
    );
    if (signal) {
      signal.scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy(0, -5);
    }
  });
}

async function scrollToSupply(page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const btn = btns.find(
      (b) => b.textContent?.trim() === "합산" || b.textContent?.trim() === "주체별"
    );
    if (btn) btn.scrollIntoView({ behavior: "instant", block: "start" });
  });
}

async function calcChartHeight(page) {
  return page.evaluate(() => {
    const supplyBox = document.querySelector(
      "[class*='rounded-lg'][class*='border'][class*='bg-'][class*='overlay']"
    );
    if (!supplyBox) return 900;
    const signalEls = Array.from(document.querySelectorAll("div"));
    const signal = signalEls.find(
      (el) =>
        (el.textContent?.includes("추세") || el.textContent?.includes("횡보")) &&
        el.textContent?.includes("채널") &&
        el.offsetHeight < 60 &&
        el.offsetHeight > 10
    );
    if (!signal) return 900;
    return Math.ceil(
      supplyBox.getBoundingClientRect().bottom -
        signal.getBoundingClientRect().top +
        15
    );
  });
}

async function findSupplyContainer(page, tabText) {
  const handle = await page.evaluateHandle((tab) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent?.trim() === tab);
    if (!btn) return null;
    let container = btn.parentElement;
    while (container && container !== document.body) {
      const cls = container.className || "";
      if (cls.includes("rounded-lg") && cls.includes("bg-")) break;
      container = container.parentElement;
    }
    return container || null;
  }, tabText);
  return handle.asElement();
}

async function findTradingTable(page) {
  // "일별 매매동향" 텍스트를 찾아서 해당 섹션으로 스크롤
  await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll("div, span, h2, h3, p"));
    const heading = allEls.find(
      (el) => el.textContent?.includes("일별 매매동향") && el.offsetHeight > 0 && el.offsetHeight < 80
    );
    if (heading) {
      heading.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
  await delay(500);

  // 매매동향 테이블 찾기 — "날짜" + "종가" 또는 "외국인" 컬럼이 있는 table
  const handle = await page.evaluateHandle(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const tradingTable = tables.find((t) => {
      const text = t.textContent || "";
      return text.includes("날짜") && (text.includes("외국인") || text.includes("종가"));
    });
    if (!tradingTable) return tables[0] || null;

    // 테이블 + 제목 포함하는 wrapper 찾기
    let container = tradingTable.parentElement;
    while (container && container !== document.body) {
      const cls = container.className || "";
      if (
        (cls.includes("rounded") || cls.includes("border") || cls.includes("bg-")) &&
        container.offsetHeight > tradingTable.offsetHeight
      ) {
        break;
      }
      container = container.parentElement;
    }
    if (container && container !== document.body) {
      container.scrollIntoView({ behavior: "instant", block: "start" });
      return container;
    }
    tradingTable.scrollIntoView({ behavior: "instant", block: "start" });
    return tradingTable;
  });
  return handle.asElement();
}

async function waitForCanvas(page) {
  try {
    await page.waitForSelector("canvas", { timeout: 15000 });
    await delay(3000);
  } catch {
    console.log("    (canvas 대기 타임아웃, 현재 상태로 캡처)");
    await delay(1000);
  }
}

/**
 * DART 공시 페이지 스크린샷 캡처
 * @param {object} dartData - fetchAllDartData 결과
 * @param {string} stockCode - 종목코드
 * @param {string} outputDir - images 폴더 경로
 * @param {function} progressCb - 진행 콜백
 * @returns {Promise<string[]>} 저장된 파일 경로 배열
 */
async function captureDartScreenshots(dartData, stockCode, outputDir, progressCb) {
  if (!dartData || dartData.error) return [];

  // 캡처할 DART 페이지 목록 구성
  const jobs = [];

  // 1. 공시 목록에서 사업보고서 찾기
  const disclosures = dartData.disclosures || [];
  const annualReport = disclosures.find((d) => d.title && d.title.includes("사업보고서"));
  if (annualReport && annualReport.url) {
    jobs.push({
      name: "DART 사업보고서",
      url: annualReport.url,
      suffix: "dart_annual",
    });
  }

  // 2. 분기/반기보고서 찾기
  const quarterlyReport = disclosures.find(
    (d) => d.title && (d.title.includes("분기보고서") || d.title.includes("반기보고서"))
  );
  if (quarterlyReport && quarterlyReport.url) {
    jobs.push({
      name: `DART ${quarterlyReport.title.includes("반기") ? "반기" : "분기"}보고서`,
      url: quarterlyReport.url,
      suffix: "dart_quarterly",
    });
  }

  // 3. 주요사항보고서 (최대 2건)
  const majorReports = dartData.majorReports || [];
  for (let i = 0; i < Math.min(majorReports.length, 2); i++) {
    const report = majorReports[i];
    if (report.items && report.items[0]?.rcept_no) {
      jobs.push({
        name: `DART ${report.type}`,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${report.items[0].rcept_no}`,
        suffix: `dart_major_${i + 1}`,
      });
    }
  }

  // 4. 키워드 태그 공시 중 중요한 것 (증자, 합병, 자기주식 등, 최대 1건)
  const importantDisc = disclosures.find(
    (d) =>
      d.tags &&
      d.tags.length > 0 &&
      d.tags.some((t) => ["증자", "합병", "분할", "자기주식", "CB", "BW"].includes(t)) &&
      !jobs.some((j) => j.url === d.url)
  );
  if (importantDisc && importantDisc.url) {
    jobs.push({
      name: `DART 주요공시 (${importantDisc.tags.join(",")})`,
      url: importantDisc.url,
      suffix: "dart_important",
    });
  }

  if (jobs.length === 0) {
    console.log("  DART 캡처할 공시 없음");
    return [];
  }

  const totalJobs = jobs.length;
  const notify = (idx, desc) => {
    console.log(`  [DART ${idx}/${totalJobs}] ${desc}`);
    if (progressCb) progressCb(idx, totalJobs, desc);
  };

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || findChromium(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-networking",
      "--js-flags=--max-old-space-size=256",
    ],
    protocolTimeout: 60000,
  });

  const savedFiles = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: DESKTOP_WIDTH, height: 900 });

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      notify(i + 1, `${job.name} 캡처...`);

      try {
        const filePath = path.join(outputDir, `${stockCode}_${job.suffix}.png`);

        await page.goto(job.url, { waitUntil: "networkidle2", timeout: 30000 });
        await delay(3000);

        // DART 뷰어는 iframe 구조 — iframe 내부 콘텐츠 로딩 대기
        try {
          const iframeHandle = await page.$("iframe#ifrm");
          if (iframeHandle) {
            const frame = await iframeHandle.contentFrame();
            if (frame) {
              await frame.waitForSelector("body", { timeout: 10000 });
              await delay(2000);
            }
          }
        } catch {
          // iframe 없으면 그냥 메인 페이지 캡처
        }

        await page.screenshot({ path: filePath, fullPage: false });
        savedFiles.push(filePath);
      } catch (err) {
        console.log(`    ${job.name} 캡처 실패: ${err.message}`);
        try {
          await page.evaluate(() => true);
        } catch {
          console.log("    브라우저 크래시 감지, DART 캡처 중단");
          break;
        }
      }
    }

    console.log(`  DART 스크린샷 ${savedFiles.length}장 완료`);
  } finally {
    await browser.close().catch(() => {});
  }

  return savedFiles;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { captureScreenshots };
