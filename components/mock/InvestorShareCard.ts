/**
 * Canvas-based share card generator for investor type results.
 * Generates a 400×560 PNG — no external dependencies.
 */
import type { InvestorType, InvestorTypeKey } from "@/lib/investorQuiz";

const TYPE_COLORS: Record<
  InvestorTypeKey,
  { bg1: string; bg2: string; accent: string; light: string }
> = {
  aggressive: { bg1: "#130303", bg2: "#1f0707", accent: "#DC2626", light: "#FCA5A5" },
  analytical: { bg1: "#030813", bg2: "#07101f", accent: "#2563EB", light: "#93C5FD" },
  stable:     { bg1: "#031308", bg2: "#071f0f", accent: "#16A34A", light: "#86EFAC" },
  momentum:   { bg1: "#0a0313", bg2: "#13071f", accent: "#9333EA", light: "#D8B4FE" },
};

/** Wrap Korean/mixed text by pixel width */
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

/** Rounded rectangle path helper */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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

/** Korean-safe font stack */
const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

export async function generateInvestorShareImage(
  result: InvestorType
): Promise<Blob | null> {
  try {
    const DPR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = 400, H = 560;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const c = TYPE_COLORS[result.key];

    // ── Background ──────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, c.bg1);
    bg.addColorStop(1, c.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Center glow blob
    const glowCenter = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 160);
    glowCenter.addColorStop(0, c.accent + "44");
    glowCenter.addColorStop(1, "transparent");
    ctx.fillStyle = glowCenter;
    ctx.fillRect(0, 0, W, H);

    // ── Top branding ────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `11px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 투자성향 테스트", W / 2, 34);

    // ── Circle ──────────────────────────────────────────────
    const cx = W / 2, cy = 188, cr = 70;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(cx, cy, cr * 0.5, cx, cy, cr * 2);
    outerGlow.addColorStop(0, c.accent + "50");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 2, 0, Math.PI * 2);
    ctx.fill();

    // Circle border with glow
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = c.accent;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner circle fill (semi-transparent)
    ctx.fillStyle = c.accent + "1a";
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();

    // Emoji — use explicit emoji font for reliability
    ctx.font = `56px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(result.emoji, cx, cy);

    // ── Type name ───────────────────────────────────────────
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = c.accent + "80";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 26px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(result.name, W / 2, 313);
    ctx.restore();

    // Divider
    const grad = ctx.createLinearGradient(60, 0, W - 60, 0);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(0.5, c.accent + "70");
    grad.addColorStop(1, "transparent");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 330); ctx.lineTo(W - 60, 330);
    ctx.stroke();

    // ── Traits (top 3) ──────────────────────────────────────
    const traits = result.traits.slice(0, 3);
    ctx.font = `12px ${KO_FONT}`;
    traits.forEach((t, i) => {
      const ty = 356 + i * 25;
      ctx.fillStyle = c.accent;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("▸", 58, ty);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      const truncated = ctx.measureText(t).width > W - 140 ? t.slice(0, 22) + "…" : t;
      ctx.fillText(truncated, 76, ty);
    });

    // ── Kim comment box ─────────────────────────────────────
    const boxX = 40, boxY = 443, boxW = W - 80, boxH = 72;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = c.accent + "40";
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    // "오비젼의 한마디" label
    ctx.fillStyle = c.light;
    ctx.font = `10px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("💬 오비젼의 한마디", boxX + 14, boxY + 15);

    // Comment text (max 2 lines)
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `11px ${KO_FONT}`;
    const commentLines = wrapText(ctx, `"${result.kimComment}"`, boxW - 28);
    commentLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, boxX + 14, boxY + 33 + i * 18);
    });

    // ── Bottom URL ──────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("mylen-24263782-5d205.web.app", W / 2, H - 18);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateInvestorShareImage]", e);
    return null;
  }
}
