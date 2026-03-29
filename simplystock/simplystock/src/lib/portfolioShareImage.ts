import type { ViewSignal, PortfolioDiagnosisView } from "@/lib/portfolioAnalyzeApi";

const W = 400;
const H = 520;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const SIGNAL_SCORES: Record<ViewSignal, number> = {
  danger: 20,
  warning: 40,
  caution: 60,
  good: 80,
  strong: 100,
};

const SIGNAL_LABELS: Record<ViewSignal, string> = {
  danger: "위험",
  warning: "경고",
  caution: "주의",
  good: "양호",
  strong: "강세",
};

function scoreColor(score: number): string {
  if (score <= 30) return "#f87171";   // red
  if (score <= 60) return "#fb923c";   // orange
  if (score <= 80) return "#34d399";   // green
  return "#60a5fa";                    // blue
}

const FINDING_ICONS: Record<string, string> = {
  conflict: "\u26A1",
  momentum: "\uD83D\uDCC8",
  risk: "\u26A0\uFE0F",
  positive: "\u2705",
};

/** 건강점수 계산: 종목별 signal을 비중 가중 평균 */
export function calcHealthScore(
  stockSignals: { signal: ViewSignal; weight: number }[],
): number {
  if (stockSignals.length === 0) return 50;
  const totalWeight = stockSignals.reduce((s, x) => s + x.weight, 0);
  if (totalWeight === 0) return 50;
  const weighted = stockSignals.reduce(
    (s, x) => s + SIGNAL_SCORES[x.signal] * x.weight,
    0,
  );
  return Math.round(weighted / totalWeight);
}

export async function generatePortfolioShareImage(opts: {
  healthScore: number;
  signal: ViewSignal;
  stockCount: number;
  sectorCount: number;
  diagnosis: PortfolioDiagnosisView;
}): Promise<string> {
  const { healthScore, signal, stockCount, sectorCount, diagnosis } = opts;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // ── 배경 그라데이션 ──
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── 상단 로고 ──
  ctx.fillStyle = "#818cf8";
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("SimplyStock", W / 2, 28);

  // ── "내 포트폴리오 건강점수" 타이틀 ──
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText("내 포트폴리오 건강점수", W / 2, 58);

  // ── 원형 게이지 ──
  const cx = W / 2;
  const cy = 168;
  const radius = 72;
  const lineW = 10;
  const color = scoreColor(healthScore);

  // 배경 트랙
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = lineW;
  ctx.stroke();

  // 진행 아크 (12시 방향 시작, 시계방향)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * healthScore) / 100;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = "round";
  ctx.stroke();

  // 아크 글로우 (은은한 빛)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = color + "40";
  ctx.lineWidth = lineW + 8;
  ctx.stroke();

  // 점수 숫자
  ctx.fillStyle = color;
  ctx.font = `bold 52px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(String(healthScore), cx, cy + 16);

  // "/100"
  ctx.fillStyle = "#94a3b8";
  ctx.font = `16px ${FONT}`;
  ctx.fillText("/100", cx, cy + 38);

  // ── 등급 뱃지 ──
  const sigLabel = SIGNAL_LABELS[signal];
  const badgeW = 90;
  const badgeH = 30;
  const badgeX = (W - badgeW) / 2;
  const badgeY = cy + 52;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 15, color + "25", color + "50");
  ctx.fillStyle = color;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${sigLabel} 등급`, cx, badgeY + badgeH / 2);

  // ── 종목/섹터 정보 ──
  const infoY = badgeY + badgeH + 20;
  ctx.fillStyle = "#94a3b8";
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${stockCount}종목 · ${sectorCount}섹터`, cx, infoY);

  // ── 핵심 발견 카드 ──
  const findingsTop = infoY + 14;
  const findings = diagnosis.key_findings.slice(0, 3);
  const findingsH = 28 + findings.length * 26;
  roundRect(ctx, 28, findingsTop, W - 56, findingsH, 12, "rgba(255,255,255,0.04)", "rgba(255,255,255,0.08)");

  ctx.fillStyle = "#94a3b8";
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("핵심 발견", 44, findingsTop + 18);

  findings.forEach((f, i) => {
    const fy = findingsTop + 32 + i * 26;
    const fIcon = FINDING_ICONS[f.icon] || "\u26A1";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "left";
    // 텍스트 잘림 방지 — 최대 폭 제한
    const titleText = `${fIcon} ${f.title}`;
    const maxTitleW = W - 56 - 32;
    let display = titleText;
    if (ctx.measureText(display).width > maxTitleW) {
      while (ctx.measureText(display + "...").width > maxTitleW && display.length > 0) {
        display = display.slice(0, -1);
      }
      display += "...";
    }
    ctx.fillText(display, 44, fy);
  });

  // ── 하단 CTA ──
  const ctaY = H - 56;

  // CTA 버튼 스타일
  const btnW = 200;
  const btnH = 34;
  const btnX = (W - btnW) / 2;
  roundRect(ctx, btnX, ctaY, btnW, btnH, 17, "#818cf8", "#818cf8");
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("나도 검진하기 >", cx, ctaY + btnH / 2);

  // URL
  ctx.fillStyle = "#64748b";
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("simplystock.co.kr/portfolio", cx, H - 12);

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
