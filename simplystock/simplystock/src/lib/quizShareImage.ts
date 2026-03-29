import type { InvestorType } from "./investorQuiz";

const W = 400;
const H = 480;
const BG = "#0f1117";
const CARD_BG = "#1a1b23";
const INDIGO = "#818cf8";
const TEXT = "#e5e7eb";
const MUTED = "#9ca3af";
const BORDER = "#2a2b35";

export async function generateQuizShareImage(result: InvestorType): Promise<string> {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 배경
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // 카드 영역
  const cardX = 20;
  const cardY = 50;
  const cardW = W - 40;
  const cardH = H - 100;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16, CARD_BG, BORDER);

  // 브랜딩 헤더
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SimplyStock 투자성향 테스트", W / 2, 35);

  // 이모지
  ctx.font = "56px -apple-system, sans-serif";
  ctx.fillText(result.emoji, W / 2, 115);

  // 유형명
  ctx.fillStyle = TEXT;
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.fillText(result.name, W / 2, 155);

  // 부제목
  ctx.fillStyle = INDIGO;
  ctx.font = "13px -apple-system, sans-serif";
  ctx.fillText(result.subtitle, W / 2, 178);

  // 구분선
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, 195);
  ctx.lineTo(cardX + cardW - 30, 195);
  ctx.stroke();

  // 특성 (최대 3줄)
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = "12px -apple-system, sans-serif";
  const traits = result.traits.slice(0, 3);
  traits.forEach((t, i) => {
    ctx.fillText(`• ${t}`, cardX + 30, 220 + i * 22);
  });

  // 강점 타이틀
  const strengthY = 220 + traits.length * 22 + 15;
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("강점", cardX + 30, strengthY);

  // 강점 항목
  ctx.fillStyle = MUTED;
  ctx.font = "12px -apple-system, sans-serif";
  const strengths = result.strengths.slice(0, 2);
  strengths.forEach((s, i) => {
    ctx.fillText(`• ${s}`, cardX + 30, strengthY + 18 + i * 20);
  });

  // 어울리는 자산 배지
  const badgeY = strengthY + 18 + strengths.length * 20 + 15;
  ctx.fillStyle = MUTED;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("어울리는 자산", cardX + 30, badgeY);

  const assets = result.assets.slice(0, 4);
  let badgeX = cardX + 30;
  ctx.font = "10px -apple-system, sans-serif";
  assets.forEach((a) => {
    const tw = ctx.measureText(a).width + 16;
    roundRect(ctx, badgeX, badgeY + 6, tw, 22, 11, "rgba(99,102,241,0.1)", "rgba(99,102,241,0.3)");
    ctx.fillStyle = INDIGO;
    ctx.fillText(a, badgeX + 8, badgeY + 20);
    badgeX += tw + 6;
  });

  // 하단 브랜딩 바
  roundRect(ctx, 20, H - 48, W - 40, 28, 8, "rgba(99,102,241,0.08)", "rgba(99,102,241,0.2)");
  ctx.textAlign = "center";
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("simplystock.co.kr/quiz", W / 2, H - 30);

  return canvas.toDataURL("image/png");
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
