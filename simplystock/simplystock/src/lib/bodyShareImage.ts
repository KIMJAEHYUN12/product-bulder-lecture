import { BODY_PARTS, getBodyPart, pctToY } from "@/components/portfolio/BodyPositionChart";

const W = 400;
const H = 600;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* SVG path → Canvas Path2D */
const BODY_PATHS = [
  // 머리
  { type: "ellipse" as const, cx: 100, cy: 52, rx: 28, ry: 32 },
  // 목
  { type: "rect" as const, x: 88, y: 82, w: 24, h: 16 },
  // 몸통
  "M56,98 C56,98 48,108 48,120 L48,230 C48,238 54,244 62,244 L138,244 C146,244 152,238 152,230 L152,120 C152,108 144,98 144,98 Z",
  // 왼팔
  "M48,108 C36,112 24,130 20,160 C16,190 22,210 28,220 C34,228 40,224 42,218 L48,170",
  // 오른팔
  "M152,108 C164,112 176,130 180,160 C184,190 178,210 172,220 C166,228 160,224 158,218 L152,170",
  // 왼다리
  "M62,244 L58,310 C56,340 56,370 58,400 C58,410 62,418 68,420 L82,422 C86,422 88,418 86,414 L80,400 C78,380 78,340 80,310 L88,244",
  // 오른다리
  "M138,244 L142,310 C144,340 144,370 142,400 C142,410 138,418 132,420 L118,422 C114,422 112,418 114,414 L120,400 C122,380 122,340 120,310 L112,244",
];

function drawBody(ctx: CanvasRenderingContext2D, ox: number, oy: number, scale: number) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.12)";

  for (const p of BODY_PATHS) {
    if (typeof p === "string") {
      const path = new Path2D(p);
      ctx.fill(path);
    } else if (p.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "rect") {
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fill();
    }
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, fill: string, stroke?: string,
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
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function generateBodyShareImage(data: {
  stocks: { name: string; position: number }[];
  avgPosition: number;
}): string {
  const { avgPosition } = data;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 배경 그라데이션
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 브랜드 헤더
  ctx.fillStyle = "#818cf8";
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("SimplyStock", W / 2, 28);

  // 타이틀
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText("내 매수 위치는?", W / 2, 60);

  // 종목 수 서브타이틀
  ctx.fillStyle = "#94a3b8";
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`${data.stocks.length}개 종목 분석 결과`, W / 2, 82);

  // 인체 실루엣 (중앙 배치)
  const bodyScale = 0.85;
  const bodyOx = (W - 200 * bodyScale) / 2;
  const bodyOy = 95;
  drawBody(ctx, bodyOx, bodyOy, bodyScale);

  // 부위 구분 점선
  for (const part of BODY_PARTS) {
    const y = bodyOy + pctToY(part.max) * bodyScale;
    ctx.strokeStyle = part.hex + "40";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(bodyOx + 20 * bodyScale, y);
    ctx.lineTo(bodyOx + 180 * bodyScale, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 부위 라벨 (우측)
  const labelX = bodyOx + 200 * bodyScale + 10;
  for (const part of BODY_PARTS) {
    const midPct = (part.min + part.max) / 2;
    const y = bodyOy + pctToY(midPct) * bodyScale;
    ctx.fillStyle = part.hex;
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(part.label, labelX, y + 3);
  }

  // 평균 위치 마커 (파란 글로우)
  const avgY = bodyOy + pctToY(avgPosition) * bodyScale;
  const avgX = bodyOx + 100 * bodyScale;

  // 글로우
  const glowGrad = ctx.createRadialGradient(avgX, avgY, 0, avgX, avgY, 18);
  glowGrad.addColorStop(0, "rgba(59,130,246,0.4)");
  glowGrad.addColorStop(1, "rgba(59,130,246,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(avgX - 20, avgY - 20, 40, 40);

  // 점
  ctx.beginPath();
  ctx.arc(avgX, avgY, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#3b82f6";
  ctx.fill();
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 2;
  ctx.stroke();

  // "?" 물음표 (개별 종목은 숨김, 맞춰보기 유도)
  ctx.fillStyle = "#fff";
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", avgX, avgY);
  ctx.textBaseline = "alphabetic";

  // 평균 위치 부위명 + %
  const avgPart = getBodyPart(avgPosition);
  const infoY = bodyOy + 450 * bodyScale + 16;

  roundRect(ctx, W / 2 - 80, infoY - 10, 160, 36, 12, avgPart.hex + "20", avgPart.hex + "40");
  ctx.fillStyle = avgPart.hex;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`${avgPart.label} 위치 (${avgPosition.toFixed(0)}%)`, W / 2, infoY + 12);

  // 하단 CTA
  const ctaY = H - 80;
  const btnW = 200;
  const btnH = 38;
  const btnX = (W - btnW) / 2;
  roundRect(ctx, btnX, ctaY, btnW, btnH, 19, "#818cf8", "#818cf8");
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("맞춰보기 >", W / 2, ctaY + btnH / 2);

  // URL
  ctx.fillStyle = "#64748b";
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("simplystock.co.kr/portfolio", W / 2, H - 16);

  return canvas.toDataURL("image/png");
}
