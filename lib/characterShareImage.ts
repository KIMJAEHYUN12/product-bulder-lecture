/**
 * Canvas-based share image generator for RPG character card.
 * 400×560 — character info + stats radar + equipment slots
 */
import type { RpgCharacter, RpgStats, EquipmentSlotKey } from "@/types";
import { RPG_CLASSES, GRADE_LABELS, SLOT_LABELS, getLevelTitle, expForLevel } from "@/lib/rpgConstants";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

const STAT_COLORS: Record<keyof RpgStats, string> = {
  attack: "#EF4444",
  defense: "#3B82F6",
  intelligence: "#A855F7",
  stamina: "#22C55E",
  luck: "#F59E0B",
};

const STAT_LABELS: Record<keyof RpgStats, string> = {
  attack: "공격",
  defense: "방어",
  intelligence: "지능",
  stamina: "체력",
  luck: "행운",
};

const EQUIP_GRADE_HEX: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#4ADE80",
  rare: "#60A5FA",
  epic: "#C084FC",
  legendary: "#FBBF24",
};

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

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

function drawStatsRadar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  stats: RpgStats, accent: string
) {
  const keys: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const labels = keys.map(k => STAT_LABELS[k]);
  const maxStat = Math.max(...Object.values(stats), 30);
  const values = keys.map(k => Math.min(stats[k] / maxStat, 1));
  const n = 5;
  const angleOffset = -Math.PI / 2;

  function getPoint(i: number, r: number): [number, number] {
    const angle = angleOffset + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Background pentagons
  for (const pct of [0.33, 0.66, 1.0]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = getPoint(i, radius * pct);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = accent + "30";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Data points + values
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = STAT_COLORS[keys[i]];
    ctx.fill();
  }

  // Labels + values
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius + 18);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `10px ${KO_FONT}`;
    ctx.fillText(labels[i], px, py);
    const [vx, vy] = getPoint(i, radius + 30);
    ctx.fillStyle = STAT_COLORS[keys[i]];
    ctx.font = `bold 10px ${KO_FONT}`;
    ctx.fillText(String(stats[keys[i]]), vx, vy);
  }
}

export async function generateCharacterShareImage(
  character: RpgCharacter,
  totalStats: RpgStats,
): Promise<Blob | null> {
  try {
    const DPR = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2
    );
    const W = 400;
    const H = 560;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const classInfo = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;
    const levelTitle = getLevelTitle(character.level);
    const expNeeded = expForLevel(character.level);
    const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
    const accent = "#6366F1"; // indigo

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
    const glow = ctx.createRadialGradient(W / 2, 80, 0, W / 2, 80, 160);
    glow.addColorStop(0, accent + "33");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Header branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 투자 모험 캐릭터", W / 2, 22);

    // ── Character image ──
    const imgSize = 72;
    const imgX = W / 2 - imgSize / 2;
    const imgY = 40;
    try {
      const img = await loadImage(`/investors/${character.class}.png`);
      // Circle clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();
      // Circle border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      // Fallback: emoji
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `36px ${KO_FONT}`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(classInfo.emoji, W / 2, imgY + imgSize / 2);
    }

    // ── Name + Class ──
    let y = imgY + imgSize + 16;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Level badge
    ctx.fillStyle = accent + "40";
    const badgeText = `${levelTitle} · Lv.${character.level}`;
    ctx.font = `10px ${KO_FONT}`;
    const badgeW = ctx.measureText(badgeText).width + 16;
    roundRect(ctx, W / 2 - badgeW / 2, y - 10, badgeW, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#C7D2FE";
    ctx.fillText(badgeText, W / 2, y);
    y += 20;

    // Nickname
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px ${KO_FONT}`;
    ctx.fillText(character.nickname, W / 2, y);
    y += 16;

    // Class subtitle
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${KO_FONT}`;
    ctx.fillText(`${classInfo.className} · ${classInfo.subtitle}`, W / 2, y);
    y += 20;

    // ── Combat Power + Stones ──
    const boxY = y;
    const boxW = 140;
    const boxH = 44;
    const gap = 12;
    // Combat power
    roundRect(ctx, W / 2 - boxW - gap / 2, boxY, boxW, boxH, 8);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.fillText("전투력", W / 2 - boxW / 2 - gap / 2, boxY + 16);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 14px ${KO_FONT}`;
    ctx.fillText(String(combatPower), W / 2 - boxW / 2 - gap / 2, boxY + 34);
    // Stones
    roundRect(ctx, W / 2 + gap / 2, boxY, boxW, boxH, 8);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.fillText("투자석", W / 2 + boxW / 2 + gap / 2, boxY + 16);
    ctx.fillStyle = "#FBBF24";
    ctx.font = `bold 14px ${KO_FONT}`;
    ctx.fillText(String(character.stones), W / 2 + boxW / 2 + gap / 2, boxY + 34);
    y = boxY + boxH + 16;

    // ── Divider ──
    const divGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
    divGrad.addColorStop(0, "transparent");
    divGrad.addColorStop(0.5, accent + "60");
    divGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
    y += 8;

    // ── Stats Radar ──
    const radarCy = y + 64;
    drawStatsRadar(ctx, W / 2, radarCy, 52, totalStats, accent);
    y = radarCy + 52 + 40;

    // ── Equipment Slots (2x2) ──
    const eqStartX = 28;
    const eqW = (W - 56 - 8) / 2;
    const eqH = 40;
    const eqGap = 8;
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ex = eqStartX + col * (eqW + eqGap);
      const ey = y + row * (eqH + eqGap);
      const slot = SLOTS[i];
      const item = character.equipment?.[slot];

      if (item) {
        const gradeColor = EQUIP_GRADE_HEX[item.grade] || "#9CA3AF";
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.fillStyle = gradeColor + "15";
        ctx.fill();
        ctx.strokeStyle = gradeColor + "50";
        ctx.lineWidth = 1;
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `14px ${KO_FONT}`;
        ctx.fillStyle = "#fff";
        ctx.fillText(item.emoji, ex + 8, ey + eqH / 2);
        ctx.font = `bold 10px ${KO_FONT}`;
        ctx.fillStyle = "#fff";
        const enhLabel = item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : "";
        ctx.fillText(item.name + enhLabel, ex + 28, ey + 14);
        ctx.font = `9px ${KO_FONT}`;
        ctx.fillStyle = gradeColor;
        ctx.fillText(GRADE_LABELS[item.grade], ex + 28, ey + 28);
        // Bonus stats
        const bonusStr = Object.entries(item.bonus)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k === "attack" ? "공" : k === "defense" ? "방" : k === "intelligence" ? "지" : k === "stamina" ? "체" : "운"}+${v}`)
          .join(" ");
        if (bonusStr) {
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = `9px monospace`;
          ctx.fillText(bonusStr, ex + eqW - 8, ey + eqH / 2);
          ctx.textAlign = "left";
        }
      } else {
        const slotInfo = SLOT_LABELS[slot];
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = `10px ${KO_FONT}`;
        ctx.fillText(`${slotInfo.emoji} ${slotInfo.label} · 비어있음`, ex + eqW / 2, ey + eqH / 2);
      }
    }

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("bitgak.co.kr/adventure", W / 2, H - 16);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateCharacterShareImage]", e);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
