import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getStockName } from '../../../lib/utils/stock-codes';
import { fetchStockData } from '../../../lib/data-fetcher';
import { captureSimplyStock } from '../../../lib/screenshot';
import { checkDisclosures } from '../../../lib/dart-checker';
import { selectDisclosures, captureDartPages } from '../../../lib/dart-capturer';
import { fetchFinanceData } from '../../../lib/finance-fetcher';
import { generateBlog } from '../../../lib/blog-writer';

export async function POST(request) {
  const { stockCode, mode } = await request.json();

  if (!stockCode || !mode) {
    return NextResponse.json({ error: 'stockCode와 mode가 필요합니다' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 출력 디렉토리 준비
      const stockName = getStockName(stockCode) || stockCode;
      const outputDir = path.join(process.cwd(), 'output', `${stockCode}_${stockName}`);
      fs.mkdirSync(path.join(outputDir, 'images', 'dart'), { recursive: true });

      let stockData = null;
      let dartResult = null;
      let financeData = null;
      let images = [];
      let markdown = '';

      try {
        // ── Step 1: 데이터 추출 ──
        send({ type: 'step_start', step: 1, message: '데이터 추출 중...' });
        try {
          stockData = await fetchStockData(stockCode, (msg) => {
            send({ type: 'step_progress', step: 1, message: msg });
          });
          // data.json 저장
          fs.writeFileSync(
            path.join(outputDir, 'data.json'),
            JSON.stringify(stockData, null, 2),
          );
          send({ type: 'step_done', step: 1, message: `${stockName} 데이터 추출 완료` });
        } catch (err) {
          send({ type: 'step_error', step: 1, message: err.message });
          throw err;
        }

        // ── Step 2: 스크린샷 캡처 ──
        send({ type: 'step_start', step: 2, message: '캡처 준비 중...' });
        try {
          images = await captureSimplyStock(stockCode, outputDir, (msg) => {
            send({ type: 'step_progress', step: 2, message: msg });
          });
          send({ type: 'images', files: images });
          send({ type: 'step_done', step: 2, message: `캡처 ${images.length}장 완료` });
        } catch (err) {
          send({ type: 'step_error', step: 2, message: err.message });
          // 캡처 실패해도 계속 진행
        }

        // ── Step 3: DART 공시 체크 ──
        send({ type: 'step_start', step: 3, message: '공시 조회 중...' });
        try {
          dartResult = await checkDisclosures(stockCode, (msg) => {
            send({ type: 'step_progress', step: 3, message: msg });
          });

          // DART 캡처 — 우선순위 기반 공시 선별 + element.screenshot()
          try {
            const disclosures = await selectDisclosures(stockCode);
            if (disclosures.length > 0) {
              send({ type: 'step_progress', step: 3, message: `DART 캡처 ${disclosures.length}건 시작...` });
              const dartImages = await captureDartPages(disclosures, stockCode, outputDir, (msg) => {
                send({ type: 'step_progress', step: 3, message: msg });
              });
              images.push(...dartImages);
              if (dartImages.length > 0) {
                send({ type: 'images', files: images });
              }
            }
          } catch (captureErr) {
            console.log(`  DART 캡처 실패 (진행 계속): ${captureErr.message}`);
          }

          // dart.json 저장
          fs.writeFileSync(
            path.join(outputDir, 'dart.json'),
            JSON.stringify(dartResult, null, 2),
          );
          send({ type: 'dart', data: dartResult });
          send({ type: 'step_done', step: 3, message: `히트 ${dartResult.hits.length}건 / 클린 ${dartResult.clean.length}건` });
        } catch (err) {
          send({ type: 'step_error', step: 3, message: err.message });
          // DART 실패해도 계속 진행
          dartResult = { hits: [], clean: [], error: err.message };
        }

        // ── Step 4: 재무제표 조회 ──
        send({ type: 'step_start', step: 4, message: '재무제표 조회 중...' });
        try {
          financeData = await fetchFinanceData(stockCode, (msg) => {
            send({ type: 'step_progress', step: 4, message: msg });
          });
          if (financeData) {
            fs.writeFileSync(
              path.join(outputDir, 'finance.json'),
              JSON.stringify(financeData, null, 2),
            );
            send({ type: 'step_done', step: 4, message: `재무제표 ${Object.keys(financeData.raw).length}건 조회 완료` });
          } else {
            send({ type: 'step_done', step: 4, message: '재무제표 데이터 없음 (스킵)' });
          }
        } catch (err) {
          send({ type: 'step_error', step: 4, message: err.message });
          // 재무제표 실패해도 계속 진행
        }

        // ── Step 5: 블로그 글 생성 (data 모드에서는 스킵) ──
        if (mode !== 'data') {
          send({ type: 'step_start', step: 5, message: '글 생성 중...' });
          try {
            markdown = await generateBlog(stockData, dartResult, financeData, images, mode, (msg) => {
              send({ type: 'step_progress', step: 5, message: msg });
            });
            // 마크다운 저장
            fs.writeFileSync(
              path.join(outputDir, `${stockName}_분석.md`),
              markdown,
            );
            send({ type: 'markdown', content: markdown });
            send({ type: 'step_done', step: 5, message: '글 생성 완료' });
          } catch (err) {
            send({ type: 'step_error', step: 5, message: err.message });
          }
        }

        send({ type: 'output_dir', path: outputDir });
      } catch (err) {
        send({ type: 'step_error', step: 0, message: `파이프라인 오류: ${err.message}` });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
