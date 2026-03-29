import type { PerBandData } from "@/types";

const W = 400;
const H = 440;

// 색상
const BG_TOP = "#0c0e1a";
const BG_BOT = "#131629";
const CARD_BG = "#1a1d32";
const INDIGO = "#818cf8";
const INDIGO_DIM = "rgba(99,102,241,0.15)";
const TEXT = "#f1f5f9";
const MUTED = "#94a3b8";
const FAINT = "#64748b";
const GREEN = "#34d399";
const GREEN_DIM = "rgba(52,211,153,0.12)";
const RED = "#f87171";
const RED_DIM = "rgba(248,113,113,0.12)";
const AMBER = "#fbbf24";
const AMBER_DIM = "rgba(251,191,36,0.12)";

export function generateValuationShareImage(
  data: PerBandData,
  stockName: string,
  symbol: string,
): string {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 그라데이션 배경
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, BG_TOP);
  bgGrad.addColorStop(1, BG_BOT);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 장식 원 (우상단)
  const circGrad = ctx.createRadialGradient(W - 40, 40, 0, W - 40, 40, 120);
  circGrad.addColorStop(0, "rgba(99,102,241,0.08)");
  circGrad.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = circGrad;
  ctx.fillRect(W - 160, 0, 160, 160);

  const pad = 24;

  // 브랜딩 헤더
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 10px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SIMPLYSTOCK", pad, 28);
  ctx.fillStyle = FAINT;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText(" VALUATION", pad + ctx.measureText("SIMPLYSTOCK").width + 2, 28);

  // 종목명
  ctx.fillStyle = TEXT;
  ctx.font = "bold 22px -apple-system, sans-serif";
  ctx.fillText(stockName, pad, 62);

  // 심볼
  ctx.fillStyle = FAINT;
  ctx.font = "12px -apple-system, sans-serif";
  ctx.fillText(symbol, pad, 80);

  // 메인 카드
  const cardY = 96;
  const cardH = 280;
  roundRect(ctx, 16, cardY, W - 32, cardH, 16, CARD_BG);

  const cx = 32; // card inner x
  const cw = W - 64; // card inner width

  // 주요 PER 판단
  const hasFwd = data.currentForwardPer != null;
  const mainPer = hasFwd ? data.currentForwardPer! : data.currentPer;
  const mainPos = hasFwd ? (data.forwardPerPosition ?? 50) : data.perPosition;
  const mainLabel = hasFwd ? "Forward PER" : "Trailing PER";
  const avgPer = hasFwd ? data.avgForwardPer : data.avgPer;

  // 평가 배지
  let evalLabel: string;
  let evalColor: string;
  let evalBg: string;
  if (mainPos <= 25) { evalLabel = "저평가"; evalColor = GREEN; evalBg = GREEN_DIM; }
  else if (mainPos <= 50) { evalLabel = "다소 저평가"; evalColor = GREEN; evalBg = GREEN_DIM; }
  else if (mainPos <= 65) { evalLabel = "적정"; evalColor = AMBER; evalBg = AMBER_DIM; }
  else { evalLabel = "고평가"; evalColor = RED; evalBg = RED_DIM; }

  // 배지 그리기
  const badgeW = ctx.measureText(evalLabel).width + 24;
  ctx.font = "bold 12px -apple-system, sans-serif";
  const badgeWMeasured = ctx.measureText(evalLabel).width + 24;
  roundRect(ctx, cx, cardY + 18, badgeWMeasured, 26, 13, evalBg);
  ctx.fillStyle = evalColor;
  ctx.textAlign = "left";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(evalLabel, cx + 12, cardY + 35);

  // 큰 PER 숫자
  let row1Y = cardY + 72;
  ctx.fillStyle = MUTED;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(mainLabel, cx, row1Y);

  ctx.fillStyle = TEXT;
  ctx.font = "bold 32px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(
    mainPer != null ? `${fmtNum(mainPer)}x` : "-",
    cx + cw,
    row1Y + 2,
  );

  // 게이지 바 (과거 대비 위치)
  const gaugeY = row1Y + 16;
  const gaugeW = cw;
  const gaugeH = 8;

  // 배경 트랙
  roundRect(ctx, cx, gaugeY, gaugeW, gaugeH, 4, "rgba(255,255,255,0.06)");

  // 그라데이션 채우기
  const gaugeGrad = ctx.createLinearGradient(cx, 0, cx + gaugeW, 0);
  gaugeGrad.addColorStop(0, GREEN);
  gaugeGrad.addColorStop(0.5, AMBER);
  gaugeGrad.addColorStop(1, RED);
  const fillW = Math.max(8, (mainPos / 100) * gaugeW);
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, cx, gaugeY, fillW, gaugeH, 4);
  ctx.clip();
  ctx.fillStyle = gaugeGrad;
  ctx.fillRect(cx, gaugeY, gaugeW, gaugeH);
  ctx.restore();

  // 게이지 라벨
  const gaugeLabY = gaugeY + 22;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = FAINT;
  ctx.fillText("저평가", cx, gaugeLabY);
  ctx.textAlign = "center";
  ctx.fillStyle = evalColor;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText(`상위 ${mainPos}%`, cx + fillW, gaugeLabY);
  ctx.textAlign = "right";
  ctx.fillStyle = FAINT;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText("고평가", cx + cw, gaugeLabY);

  // 구분선
  const divY = gaugeLabY + 14;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, divY);
  ctx.lineTo(cx + cw, divY);
  ctx.stroke();

  // 상세 수치 2열
  const detailY = divY + 24;
  const colW = cw / 2;

  // 좌: 평균 PER
  ctx.textAlign = "left";
  ctx.fillStyle = FAINT;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText("평균 PER", cx, detailY);
  ctx.fillStyle = MUTED;
  ctx.font = "bold 15px -apple-system, sans-serif";
  ctx.fillText(avgPer != null ? `${fmtNum(avgPer)}x` : "-", cx, detailY + 20);

  // 우: 평균 대비
  if (avgPer != null && mainPer != null) {
    const diff = Math.round(((mainPer - avgPer) / avgPer) * 100);
    ctx.textAlign = "left";
    ctx.fillStyle = FAINT;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("평균 대비", cx + colW, detailY);
    ctx.fillStyle = diff <= 0 ? GREEN : RED;
    ctx.font = "bold 15px -apple-system, sans-serif";
    ctx.fillText(`${diff > 0 ? "+" : ""}${diff}%`, cx + colW, detailY + 20);
  }

  // 2번째 행: Trailing PER (Forward가 있을 때만)
  if (hasFwd) {
    const row2Y = detailY + 48;
    ctx.textAlign = "left";
    ctx.fillStyle = FAINT;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("Trailing PER", cx, row2Y);
    ctx.fillStyle = MUTED;
    ctx.font = "bold 15px -apple-system, sans-serif";
    ctx.fillText(
      data.currentPer != null ? `${fmtNum(data.currentPer)}x` : "-",
      cx,
      row2Y + 20,
    );

    // Trailing 위치
    ctx.fillStyle = FAINT;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("과거 대비", cx + colW, row2Y);
    const tPos = data.perPosition;
    const tColor = tPos <= 30 ? GREEN : tPos >= 70 ? RED : AMBER;
    ctx.fillStyle = tColor;
    ctx.font = "bold 15px -apple-system, sans-serif";
    ctx.fillText(`상위 ${tPos}%`, cx + colW, row2Y + 20);
  }

  // 하단 CTA 바
  const ctaY = H - 42;
  const ctaGrad = ctx.createLinearGradient(16, ctaY, W - 16, ctaY);
  ctaGrad.addColorStop(0, "rgba(99,102,241,0.15)");
  ctaGrad.addColorStop(1, "rgba(99,102,241,0.05)");
  roundRect(ctx, 16, ctaY, W - 32, 30, 10, "transparent");
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  // 테두리
  ctx.strokeStyle = "rgba(99,102,241,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("simplystock.co.kr/valuation  에서 확인하기", W / 2, ctaY + 19);

  return canvas.toDataURL("image/png");
}

function fmtNum(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, fill: string, stroke?: string,
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
