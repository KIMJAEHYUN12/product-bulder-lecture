import type { BacktestResult, BacktestStock } from "@/types";

const W = 400;
const H = 520;
const BG = "#0f1117";
const CARD_BG = "#1a1b23";
const INDIGO = "#818cf8";
const TEXT = "#e5e7eb";
const MUTED = "#9ca3af";
const BORDER = "#2a2b35";
const RED = "#f87171";
const BLUE = "#60a5fa";
const GREEN = "#34d399";
const AMBER = "#f59e0b";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export async function generateBacktestShareImage(
  result: BacktestResult,
  stocks: BacktestStock[],
  amount: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const isDCA = result.investMode !== "lump";
  const modeLabel = result.investMode === "monthly" ? "월적립" : result.investMode === "daily" ? "일적립" : "";

  // 배경
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // 브랜딩
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`SimplyStock 백테스트${modeLabel ? ` · ${modeLabel}` : ""}`, W / 2, 30);

  // 종목명
  const stockNames = stocks.map((s) => s.name).join(" + ");
  ctx.fillStyle = TEXT;
  ctx.font = "bold 15px -apple-system, sans-serif";
  ctx.fillText(stockNames, W / 2, 58);

  // 투자금
  ctx.fillStyle = MUTED;
  ctx.font = "11px -apple-system, sans-serif";
  if (isDCA) {
    const perLabel = result.investMode === "monthly" ? "월" : "일";
    ctx.fillText(`${perLabel} ${fmt(amount)}원 · 총 ${fmt(result.totalInvested)}원 투자`, W / 2, 80);
  } else {
    ctx.fillText(`투자금 ${fmt(amount)}원`, W / 2, 80);
  }

  // 최종 금액 카드
  roundRect(ctx, 20, 95, W - 40, 65, 12, CARD_BG, BORDER);
  ctx.fillStyle = MUTED;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("최종 평가 금액", W / 2, 115);
  ctx.fillStyle = TEXT;
  ctx.font = "bold 22px -apple-system, sans-serif";
  ctx.fillText(`${fmt(result.finalAmount)}원`, W / 2, 145);

  // 수익률 뱃지 (최종금액 카드 오른쪽 상단)
  const retColor = result.totalReturnPct >= 0 ? RED : BLUE;
  const retText = `${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(2)}%`;
  ctx.fillStyle = retColor;
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(retText, W - 35, 115);

  // 4개 지표 카드 (2x2)
  const cagrLabel = isDCA ? "연환산" : "CAGR";
  const metrics = [
    { label: "수익률", value: retText, color: retColor },
    { label: "MDD", value: `-${result.maxDrawdownPct.toFixed(2)}%`, color: BLUE },
    { label: cagrLabel, value: `${result.cagrPct >= 0 ? "+" : ""}${result.cagrPct.toFixed(2)}%`, color: result.cagrPct >= 0 ? GREEN : RED },
    { label: "vs KOSPI", value: `${(result.totalReturnPct - result.kospiReturnPct) >= 0 ? "+" : ""}${(result.totalReturnPct - result.kospiReturnPct).toFixed(2)}%p`, color: (result.totalReturnPct - result.kospiReturnPct) >= 0 ? GREEN : RED },
  ];

  const mY = 175;
  const mW = (W - 50) / 2;
  const mH = 50;
  metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * (mW + 10);
    const y = mY + row * (mH + 8);
    roundRect(ctx, x, y, mW, mH, 8, CARD_BG, BORDER);
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText(m.label, x + mW / 2, y + 18);
    ctx.fillStyle = m.color;
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.fillText(m.value, x + mW / 2, y + 38);
  });

  // 미니 라인차트
  const chartY = mY + (mH + 8) * 2 + 15;
  const chartX = 30;
  const chartW = W - 60;
  const chartH = 120;

  roundRect(ctx, 20, chartY - 10, W - 40, chartH + 30, 12, CARD_BG, BORDER);

  if (result.dailyValues.length > 1) {
    const values = result.dailyValues.map((d) => d.value);
    const kospiValues = result.kospiValues.map((d) => d.value);
    const investedVals = isDCA ? result.investedValues.map((d) => d.value) : [];
    const allVals = [...values, ...kospiValues, ...investedVals];
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;

    const toX = (i: number, len: number) => chartX + (i / (len - 1)) * chartW;
    const toY = (v: number) => chartY + chartH - ((v - minV) / range) * chartH;

    // DCA 투자금 라인 (step)
    if (isDCA && investedVals.length > 1) {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      investedVals.forEach((v, i) => {
        const x = toX(i, investedVals.length);
        const y = toY(v);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // step-after: horizontal then vertical
          ctx.lineTo(x, toY(investedVals[i - 1]));
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // KOSPI 라인 (점선)
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    kospiValues.forEach((v, i) => {
      const x = toX(i, kospiValues.length);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 포트폴리오 라인
    ctx.strokeStyle = INDIGO;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = toX(i, values.length);
      const y = toY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 범례
    const legendY = chartY + chartH + 14;
    ctx.font = "10px -apple-system, sans-serif";

    const legendItems: { color: string; dash: number[]; label: string; lw: number }[] = [
      { color: INDIGO, dash: [], label: "포트폴리오", lw: 2 },
      { color: "#6b7280", dash: [3, 2], label: "KOSPI", lw: 1 },
    ];
    if (isDCA) {
      legendItems.push({ color: AMBER, dash: [3, 2], label: "투자금", lw: 1 });
    }

    const totalLegendW = legendItems.length * 80;
    let lx = (W - totalLegendW) / 2;
    for (const item of legendItems) {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lw;
      ctx.setLineDash(item.dash);
      ctx.beginPath();
      ctx.moveTo(lx, legendY - 3);
      ctx.lineTo(lx + 15, legendY - 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = MUTED;
      ctx.textAlign = "left";
      ctx.fillText(item.label, lx + 18, legendY);
      lx += 80;
    }
  }

  // 하단 브랜딩 바
  roundRect(ctx, 20, H - 38, W - 40, 28, 8, "rgba(99,102,241,0.08)", "rgba(99,102,241,0.2)");
  ctx.textAlign = "center";
  ctx.fillStyle = INDIGO;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText("simplystock.co.kr/backtest", W / 2, H - 20);

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
