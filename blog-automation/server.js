const express = require("express");
const path = require("path");
const fs = require("fs");
const { OUTPUT_DIR } = require("./lib/config");
const { searchStock } = require("./lib/stockSearch");
const { fetchAllDartData } = require("./lib/dartCollector");
const { fetchSupplyData } = require("./lib/supplyCollector");
const { fetchPriceData } = require("./lib/priceCollector");
const { captureScreenshots } = require("./lib/screenshoter");
const { selectDisclosures, captureDartPages } = require("./lib/dart-capturer");
const { generateBlogPost } = require("./lib/blogWriter");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 진행 중인 작업 저장
const sessions = new Map();

// =============================================
// POST /api/collect — 데이터 수집 + 스크린샷 (SSE)
// =============================================
app.post("/api/collect", (req, res) => {
  const { query, noScreenshot } = req.body;
  if (!query) return res.status(400).json({ error: "종목명 또는 코드를 입력하세요" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  (async () => {
    try {
      // 1. 종목 검색
      send("step", { step: 1, total: 5, message: "종목 검색 중..." });
      const stock = await searchStock(query);
      const stockCode = stock.symbol.replace(/\.(KS|KQ)$/, "");
      send("stock", { name: stock.name, symbol: stock.symbol, stockCode });

      // 2. 데이터 수집 (병렬)
      send("step", { step: 2, total: 5, message: "재무제표 + 분기보고서 + 주요 공시 수집 중..." });
      const [dartData, supply, price] = await Promise.allSettled([
        fetchAllDartData(stockCode),
        fetchSupplyData(stock.symbol),
        fetchPriceData(stock.symbol),
      ]);

      const fin =
        dartData.status === "fulfilled"
          ? dartData.value
          : { error: dartData.reason?.message, years: [] };
      const sup =
        supply.status === "fulfilled"
          ? supply.value
          : { error: supply.reason?.message };
      const prc =
        price.status === "fulfilled"
          ? price.value
          : { error: price.reason?.message };

      send("data", {
        financials: { years: fin.years?.length || 0, quarterly: !!fin.quarterly, majorReports: fin.majorReports?.length || 0 },
        disclosures: fin.disclosures?.length || 0,
        supply: !sup.error,
        price: prc.error ? null : prc.price,
      });

      // 3. 출력 폴더 생성
      const today = new Date().toISOString().slice(0, 10);
      const sessionId = `${stock.name}_${today}`;
      const outputDir = path.join(OUTPUT_DIR, sessionId);
      const imagesDir = path.join(outputDir, "images");
      fs.mkdirSync(imagesDir, { recursive: true });

      // 4. 스크린샷 캡처
      let screenshots = [];
      if (noScreenshot) {
        send("step", { step: 3, total: 5, message: "스크린샷 건너뜀" });
      } else {
        send("step", { step: 3, total: 5, message: "스크린샷 캡처 시작..." });
        try {
          screenshots = await captureScreenshots(
            stockCode,
            imagesDir,
            stock.symbol,
            (idx, total, desc) => {
              send("screenshot", { index: idx, total, description: desc });
            }
          );
          send("step", {
            step: 3,
            total: 5,
            message: `스크린샷 ${screenshots.length}장 완료`,
          });
        } catch (err) {
          send("warning", { message: `스크린샷 실패: ${err.message}` });
        }
      }

      // 4-1. DART 공시 선별 + 캡처 (dart-capturer)
      let dartScreenshots = [];
      if (!noScreenshot) {
        send("step", { step: 4, total: 6, message: "DART 공시 선별 + 캡처 중..." });
        try {
          const disclosures = await selectDisclosures(stockCode);
          if (disclosures.length > 0) {
            dartScreenshots = await captureDartPages(
              disclosures,
              stockCode,
              imagesDir,
              (idx, total, desc) => {
                send("screenshot", { index: idx, total, description: `[DART] ${desc}` });
              }
            );
          }
          send("step", {
            step: 4,
            total: 6,
            message: `DART 스크린샷 ${dartScreenshots.length}장 완료`,
          });
        } catch (err) {
          send("warning", { message: `DART 스크린샷 실패: ${err.message}` });
        }
      }

      // 5. 수집 데이터 조립 + 저장
      send("step", { step: 5, total: 6, message: "데이터 정리 중..." });
      const collectedData = {
        name: stock.name,
        symbol: stock.symbol,
        stockCode,
        price: prc.error ? null : prc,
        financials: fin,
        supply: sup.error ? null : sup,
        screenshots: screenshots.map((f) => path.basename(f)),
        dartScreenshots: dartScreenshots.map((f) => path.basename(f)),
        capturedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(outputDir, "data.json"),
        JSON.stringify(collectedData, null, 2),
        "utf-8"
      );

      // 세션에 저장
      sessions.set(sessionId, { collectedData, outputDir });

      send("step", { step: 6, total: 6, message: "수집 완료" });
      send("complete", {
        sessionId,
        stockName: stock.name,
        stockCode,
        symbol: stock.symbol,
        screenshots: screenshots.map((f) => path.basename(f)),
        dartScreenshots: dartScreenshots.map((f) => path.basename(f)),
        financials: fin,
        supply: sup.error ? null : sup,
        price: prc.error ? null : prc,
      });
    } catch (err) {
      send("error", { message: err.message });
    } finally {
      res.end();
    }
  })();
});

// =============================================
// POST /api/generate — 글 생성 (SSE 스트리밍)
// =============================================
app.post("/api/generate", (req, res) => {
  const { sessionId, dartInput } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId가 필요합니다" });

  const session = sessions.get(sessionId);
  if (!session)
    return res.status(404).json({ error: "세션을 찾을 수 없습니다. 수집을 다시 실행하세요." });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  (async () => {
    try {
      send("step", { message: "Gemini 2.5 Flash 글 생성 시작..." });

      // DART 수치를 collectedData에 추가
      if (dartInput) {
        session.collectedData.dartInput = dartInput;
      }

      const result = await generateBlogPost(
        session.collectedData,
        session.outputDir,
        {
          dartInput,
          onToken: (text) => {
            send("token", { text });
          },
        }
      );

      send("done", {
        sessionId,
        title: result.title,
        tags: result.tags,
        bodyLength: result.bodyLength,
      });
    } catch (err) {
      send("error", { message: err.message });
    } finally {
      res.end();
    }
  })();
});

// =============================================
// GET /api/preview/:id — preview.html 서빙
// =============================================
app.get("/api/preview/:id", (req, res) => {
  const previewPath = path.join(OUTPUT_DIR, req.params.id, "preview.html");
  if (!fs.existsSync(previewPath)) return res.status(404).send("Not found");
  res.sendFile(previewPath);
});

// =============================================
// GET /api/post/:id — post.md 원문 서빙
// =============================================
app.get("/api/post/:id", (req, res) => {
  const postPath = path.join(OUTPUT_DIR, req.params.id, "post.md");
  if (!fs.existsSync(postPath)) return res.status(404).send("Not found");
  res.type("text/plain; charset=utf-8").sendFile(postPath);
});

// =============================================
// GET /api/images/:id/:file — 이미지 서빙
// =============================================
app.get("/api/images/:id/:file", (req, res) => {
  const imgPath = path.join(OUTPUT_DIR, req.params.id, "images", req.params.file);
  if (!fs.existsSync(imgPath)) return res.status(404).send("Not found");
  res.sendFile(imgPath);
});

// =============================================
// POST /api/upload-images/:id — 수동 스크린샷 업로드
// =============================================
app.post("/api/upload-images/:id", (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "세션 없음" });

  const { images } = req.body; // [{ name, data }] data=base64
  if (!images || !images.length) return res.status(400).json({ error: "이미지 없음" });

  const imagesDir = path.join(session.outputDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  const saved = [];
  for (const img of images) {
    const buf = Buffer.from(img.data, "base64");
    const filePath = path.join(imagesDir, img.name);
    fs.writeFileSync(filePath, buf);
    saved.push(img.name);
  }

  // 세션 데이터에 스크린샷 목록 업데이트
  session.collectedData.screenshots = saved;

  res.json({ ok: true, saved });
});

// =============================================
// GET /api/sessions — 이전 세션 목록
// =============================================
app.get("/api/sessions", (req, res) => {
  const ids = Array.from(sessions.keys());
  res.json(ids);
});

// output 디렉토리 생성
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`\n  blog-automation v2 서버 시작`);
  console.log(`  http://localhost:${PORT}\n`);
});
