const W = 400;
const H = 400;
const BG = "#0f1117";
const CARD_BG = "#1a1b23";
const INDIGO = "#818cf8";
const TEXT = "#e5e7eb";
const MUTED = "#9ca3af";
const BORDER = "#2a2b35";
const RED = "#f87171";
const BLUE = "#60a5fa";

interface HoldingInfo {
  name: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export async function generateMockShareImage(
  totalAsset: number,
  cash: number,
  returnPct: number,
  holdings: Record<string, HoldingInfo>,
  prices: Record<string, { price: number }>,
): Promise<string> {
  const holdingEntries = Object.entries(holdings);
  const rows = Math.min(holdingEntries.length, 5);
  const dynamicH = H + Math.max(0, rows - 2) * 24;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = dynamicH * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${dynamicH}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 배경
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, dynamicH);

  // 브랜딩
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SimplyStock 모의투자", W / 2, 30);

  // 총자산 카드
  roundRect(ctx, 20, 45, W - 40, 80, 12, CARD_BG, BORDER);
  ctx.fillStyle = MUTED;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("총 자산", W / 2, 68);

  ctx.fillStyle = TEXT;
  ctx.font = "bold 24px -apple-system, sans-serif";
  ctx.fillText(`${fmt(totalAsset)}원`, W / 2, 97);

  // 수익률
  const retColor = returnPct >= 0 ? RED : BLUE;
  ctx.fillStyle = retColor;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.fillText(`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`, W / 2, 118);

  // 현금 / 평가금 2열
  const infoY = 140;
  const halfW = (W - 50) / 2;
  const holdingsValue = totalAsset - cash;

  roundRect(ctx, 20, infoY, halfW, 45, 8, CARD_BG, BORDER);
  ctx.fillStyle = MUTED;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("현금", 20 + halfW / 2, infoY + 16);
  ctx.fillStyle = TEXT;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(`${fmt(cash)}원`, 20 + halfW / 2, infoY + 34);

  roundRect(ctx, 30 + halfW, infoY, halfW, 45, 8, CARD_BG, BORDER);
  ctx.fillStyle = MUTED;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText("평가 금액", 30 + halfW + halfW / 2, infoY + 16);
  ctx.fillStyle = TEXT;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(`${fmt(holdingsValue)}원`, 30 + halfW + halfW / 2, infoY + 34);

  // 보유 종목 리스트
  const listY = infoY + 60;
  if (holdingEntries.length > 0) {
    ctx.fillStyle = MUTED;
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("보유 종목", 30, listY);

    holdingEntries.slice(0, 5).forEach(([symbol, h], i) => {
      const y = listY + 20 + i * 24;
      const px = prices[symbol]?.price ?? h.currentPrice;
      const pnl = ((px - h.avgPrice) / h.avgPrice) * 100;
      const pnlColor = pnl >= 0 ? RED : BLUE;

      ctx.fillStyle = TEXT;
      ctx.font = "12px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${h.name}`, 30, y);

      ctx.fillStyle = MUTED;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.fillText(`${h.qty}주`, 30 + ctx.measureText(h.name).width + 6, y);

      ctx.fillStyle = pnlColor;
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`, W - 30, y);
    });

    if (holdingEntries.length > 5) {
      const y = listY + 20 + 5 * 24;
      ctx.fillStyle = MUTED;
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`외 ${holdingEntries.length - 5}종목`, W / 2, y);
    }
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("보유 종목이 없습니다", W / 2, listY + 10);
  }

  // 하단 브랜딩 바
  roundRect(ctx, 20, dynamicH - 38, W - 40, 28, 8, "rgba(99,102,241,0.08)", "rgba(99,102,241,0.2)");
  ctx.textAlign = "center";
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("simplystock.co.kr/mock", W / 2, dynamicH - 20);

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
