/**
 * Canvas-based share image generator for analysis results.
 * kim mode: 400×620 with radar chart
 * makalong mode: 400×520 without radar chart
 */
import type { Grade, PortfolioScores, AnalysisMode } from "@/types";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

const GRADE_COLORS: Record<NonNullable<Grade>, string> = {
  S: "#EAB308",
  A: "#22C55E",
  B: "#3B82F6",
  C: "#F97316",
  D: "#EF4444",
  F: "#6B7280",
};

const GRADE_DESC: Record<NonNullable<Grade>, string> = {
  S: "신의 한수",
  A: "제법인데요",
  B: "평범합니다",
  C: "걱정됩니다",
  D: "심각합니다",
  F: "손절하세요",
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scores: PortfolioScores,
  accent: string
) {
  const labels = ["분산투자", "수익률", "안정성", "모멘텀", "리스크"];
  const keys: (keyof PortfolioScores)[] = [
    "diversification",
    "returns",
    "stability",
    "momentum",
    "risk_management",
  ];
  const values = keys.map((k) => Math.max(0, Math.min(100, scores[k])) / 100);
  const n = 5;
  const angleOffset = -Math.PI / 2;

  function getPoint(i: number, r: number): [number, number] {
    const angle = angleOffset + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Background pentagons (50%, 100%)
  for (const pct of [0.5, 1.0]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = getPoint(i, radius * pct);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = accent + "30";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Data points
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }

  // Labels
  ctx.font = `10px ${KO_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius + 16);
    ctx.textAlign = "center";
    ctx.fillText(labels[i], px, py);
  }
}

export async function generateAnalysisShareImage(
  grade: NonNullable<Grade>,
  roast: string,
  scores: PortfolioScores | null,
  mode: AnalysisMode
): Promise<Blob | null> {
  try {
    const DPR = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2
    );
    const W = 400;
    const hasRadar = mode === "kim" && scores;
    const H = hasRadar ? 620 : 520;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const accent = GRADE_COLORS[grade];

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Center glow
    const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 180);
    glow.addColorStop(0, accent + "33");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Top branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `11px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const brandText =
      mode === "makalong"
        ? "오비젼 빗각 분석 리포트"
        : "오비젼 AI 팩폭 진단";
    ctx.fillText(brandText, W / 2, 30);

    // ── Grade circle ──
    const gcx = W / 2;
    const gcy = 105;
    const gr = 50;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(gcx, gcy, gr * 0.5, gcx, gcy, gr * 2);
    outerGlow.addColorStop(0, accent + "40");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr * 2, 0, Math.PI * 2);
    ctx.fill();

    // Circle border
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner fill
    ctx.fillStyle = accent + "1a";
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
    ctx.fill();

    // Grade letter
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = accent + "80";
    ctx.fillStyle = accent;
    ctx.font = `bold 42px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(grade, gcx, gcy);
    ctx.restore();

    // ── Grade description ──
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${grade}급 — ${GRADE_DESC[grade]}`, W / 2, gcy + gr + 30);

    // Divider
    const divY = gcy + gr + 46;
    const divGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
    divGrad.addColorStop(0, "transparent");
    divGrad.addColorStop(0.5, accent + "70");
    divGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    let nextY = divY + 16;

    // ── Radar chart (kim mode only) ──
    if (hasRadar && scores) {
      const radarCy = nextY + 75;
      drawRadarChart(ctx, W / 2, radarCy, 60, scores, accent);
      nextY = radarCy + 60 + 30;
    }

    // ── Roast excerpt box ──
    const maxLines = hasRadar ? 2 : 3;
    const boxX = 32;
    const boxW = W - 64;
    const lineHeight = 18;
    const boxPadTop = 28;
    const boxPadBottom = 14;

    // Pre-calculate lines for box height
    ctx.font = `11px ${KO_FONT}`;
    const cleanRoast = roast.replace(/\n+/g, " ").trim();
    const roastLines = wrapText(ctx, `"${cleanRoast}"`, boxW - 28).slice(
      0,
      maxLines
    );
    const boxH = boxPadTop + roastLines.length * lineHeight + boxPadBottom;
    const boxY = nextY;

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = accent + "40";
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    // Box label
    ctx.fillStyle = accent;
    ctx.font = `10px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const boxLabel =
      mode === "makalong" ? "빗각 분석 코멘트" : "팩폭 발췌";
    ctx.fillText(`💬 ${boxLabel}`, boxX + 14, boxY + 15);

    // Roast text
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `11px ${KO_FONT}`;
    roastLines.forEach((line, i) => {
      const isLast = i === roastLines.length - 1;
      const display =
        isLast && cleanRoast.length > line.length * roastLines.length
          ? line.slice(0, -1) + "..."
          : line;
      ctx.fillText(display, boxX + 14, boxY + boxPadTop + 5 + i * lineHeight);
    });

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const bottomUrl = mode === "makalong"
      ? "bitgak.co.kr?mode=makalong"
      : "bitgak.co.kr";
    ctx.fillText(bottomUrl, W / 2, H - 18);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateAnalysisShareImage]", e);
    return null;
  }
}
