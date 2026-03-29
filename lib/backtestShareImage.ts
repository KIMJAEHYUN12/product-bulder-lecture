/**
 * Canvas-based share image for backtest results.
 * 400×580 — stats + mini chart + stock bars
 */
import type { BacktestResult } from "@/types";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatKrw(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString();
}

interface ShareOptions {
  result: BacktestResult;
  stockNames: Record<string, string>;
  amount: number;
}

export async function generateBacktestShareImage({
  result,
  stockNames,
  amount,
}: ShareOptions): Promise<Blob | null> {
  try {
    const DPR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = 400;
    const H = 580;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const isProfit = result.totalReturnPct >= 0;
    const accent = isProfit ? "#EF4444" : "#3B82F6";

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Top glow
    const glow = ctx.createRadialGradient(W / 2, 100, 0, W / 2, 100, 180);
    glow.addColorStop(0, accent + "30");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 백테스트 시뮬레이터", W / 2, 22);

    // ── Title: 종목명 ──
    let y = 48;
    const names = Object.values(stockNames);
    const titleText = names.length === 1
      ? `만약 ${names[0]}을(를) 샀다면?`
      : `만약 ${names.join(", ")}을(를) 샀다면?`;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 16px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(titleText.length > 28 ? titleText.slice(0, 27) + "..." : titleText, W / 2, y);
    y += 14;

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${KO_FONT}`;
    ctx.fillText(`투자금 ${formatKrw(amount)}원 기준`, W / 2, y);
    y += 24;

    // ── Final Amount ──
    const finalBoxH = 60;
    roundRect(ctx, 24, y, W - 48, finalBoxH, 12);
    ctx.fillStyle = accent + "12";
    ctx.fill();
    ctx.strokeStyle = accent + "30";
    ctx.lineWidth = 1;
    roundRect(ctx, 24, y, W - 48, finalBoxH, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("최종 자산", W / 2, y + 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${KO_FONT}`;
    ctx.fillText(`${formatKrw(result.finalAmount)}원`, W / 2, y + 42);

    // Return badge
    const retText = `${isProfit ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`;
    ctx.font = `bold 12px ${KO_FONT}`;
    const retW = ctx.measureText(retText).width + 14;
    const badgeX = W / 2 + ctx.measureText(`${formatKrw(result.finalAmount)}원`).width / 2 + 8;
    roundRect(ctx, badgeX - retW / 2, y + 30, retW, 18, 9);
    ctx.fillStyle = accent + "30";
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = `bold 11px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(retText, badgeX, y + 41);
    y += finalBoxH + 12;

    // ── 4 Stat Cards (2x2) ──
    const cardW = (W - 48 - 8) / 2;
    const cardH = 48;
    const stats = [
      { label: "총 수익률", value: `${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`, color: accent },
      { label: "MDD", value: `-${result.maxDrawdownPct.toFixed(1)}%`, color: "#3B82F6" },
      { label: "CAGR", value: `${result.cagrPct >= 0 ? "+" : ""}${result.cagrPct.toFixed(1)}%`, color: result.cagrPct >= 0 ? "#EF4444" : "#3B82F6" },
      { label: "vs KOSPI", value: `${(result.totalReturnPct - result.kospiReturnPct) >= 0 ? "+" : ""}${(result.totalReturnPct - result.kospiReturnPct).toFixed(1)}%p`, color: (result.totalReturnPct - result.kospiReturnPct) >= 0 ? "#22C55E" : "#F97316" },
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 24 + col * (cardW + 8);
      const cy = y + row * (cardH + 6);
      roundRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      roundRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `9px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(stats[i].label, cx + cardW / 2, cy + 16);
      ctx.fillStyle = stats[i].color;
      ctx.font = `bold 14px ${KO_FONT}`;
      ctx.fillText(stats[i].value, cx + cardW / 2, cy + 36);
    }
    y += cardH * 2 + 6 + 14;

    // ── Mini Line Chart ──
    const chartX = 28;
    const chartY = y;
    const chartW = W - 56;
    const chartH = 120;

    roundRect(ctx, chartX - 4, chartY - 4, chartW + 8, chartH + 8, 10);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();

    const values = result.dailyValues.map(d => d.value);
    if (values.length > 1) {
      const minV = Math.min(...values) * 0.98;
      const maxV = Math.max(...values) * 1.02;
      const rangeV = maxV - minV || 1;

      // Portfolio line
      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        const px = chartX + (i / (values.length - 1)) * chartW;
        const py = chartY + chartH - ((values[i] - minV) / rangeV) * chartH;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fill under
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.lineTo(chartX, chartY + chartH);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      fill.addColorStop(0, "rgba(255,255,255,0.08)");
      fill.addColorStop(1, "transparent");
      ctx.fillStyle = fill;
      ctx.fill();

      // KOSPI line
      const kospiValues = result.kospiValues.map(d => d.value);
      if (kospiValues.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < kospiValues.length; i++) {
          const px = chartX + (i / (kospiValues.length - 1)) * chartW;
          const py = chartY + chartH - ((kospiValues[i] - minV) / rangeV) * chartH;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(107,114,128,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Chart legend
    y = chartY + chartH + 14;
    ctx.font = `9px ${KO_FONT}`;
    ctx.textAlign = "left";
    // Portfolio label
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(chartX, y, 12, 2);
    ctx.fillText("포트폴리오", chartX + 16, y + 3);
    // KOSPI label
    ctx.fillStyle = "#6b7280";
    ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(chartX + 90, y + 1); ctx.lineTo(chartX + 102, y + 1); ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText("KOSPI", chartX + 106, y + 3);
    y += 18;

    // ── Stock Returns ──
    const symbols = Object.keys(result.stockValues);
    const maxAbs = Math.max(...symbols.map(s => Math.abs(result.stockReturns[s] ?? 0)), 1);
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const ret = result.stockReturns[sym] ?? 0;
      const name = stockNames[sym] || sym;
      const color = STOCK_COLORS[i] || "#94a3b8";
      const barW = Math.min(Math.abs(ret) / maxAbs * (chartW - 100), chartW - 100);

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 10px ${KO_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(name.length > 8 ? name.slice(0, 7) + ".." : name, chartX, y + 10);

      // Bar
      roundRect(ctx, chartX + 70, y + 2, barW, 12, 3);
      ctx.fillStyle = color + "40";
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = `bold 10px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`, chartX + chartW, y + 11);
      y += 20;
    }

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("bitgak.co.kr/backtest", W / 2, H - 16);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateBacktestShareImage]", e);
    return null;
  }
}

/** 공유 텍스트 생성 */
export function generateBacktestShareText(
  result: BacktestResult,
  stockNames: Record<string, string>,
  amount: number,
): string {
  const names = Object.values(stockNames);
  const nameStr = names.join(", ");
  const isProfit = result.totalReturnPct >= 0;
  const retSign = isProfit ? "+" : "";
  return `[오비젼 백테스트] ${nameStr}\n투자금 ${formatKrw(amount)}원 → 최종 ${formatKrw(result.finalAmount)}원 (${retSign}${result.totalReturnPct.toFixed(1)}%)\n만약 그때 샀다면... 당신은?\n\n오비젼에서 시뮬레이션 해보기`;
}
