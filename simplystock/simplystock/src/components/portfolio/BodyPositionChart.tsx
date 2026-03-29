"use client";

import { useState, useCallback } from "react";
import type { PortfolioStockData } from "@/lib/portfolioAnalyzeApi";

/* ── 위치 계산 ── */
export function calcPosition(avgPrice: number, range: { high3y: number; low3y: number }): number {
  if (range.high3y <= range.low3y) return 50;
  const raw = ((avgPrice - range.low3y) / (range.high3y - range.low3y)) * 100;
  return Math.max(0, Math.min(100, raw));
}

/* ── 신체 부위 ── */
export interface BodyPart {
  label: string;
  min: number;
  max: number;
  hex: string;
  tailwind: string;
  bg: string;
}

export const BODY_PARTS: BodyPart[] = [
  { label: "머리", min: 85, max: 100, hex: "#f87171", tailwind: "text-red-400", bg: "bg-red-500/15" },
  { label: "어깨", min: 70, max: 85, hex: "#fb923c", tailwind: "text-orange-400", bg: "bg-orange-500/15" },
  { label: "가슴", min: 55, max: 70, hex: "#fbbf24", tailwind: "text-amber-400", bg: "bg-amber-500/15" },
  { label: "허리", min: 40, max: 55, hex: "#a3e635", tailwind: "text-lime-400", bg: "bg-lime-500/15" },
  { label: "무릎", min: 20, max: 40, hex: "#34d399", tailwind: "text-emerald-400", bg: "bg-emerald-500/15" },
  { label: "발", min: 0, max: 20, hex: "#60a5fa", tailwind: "text-blue-400", bg: "bg-blue-500/15" },
];

export function getBodyPart(pct: number): BodyPart {
  return BODY_PARTS.find((b) => pct >= b.min && pct < b.max) || BODY_PARTS[0];
}

/* pct(0~100) → SVG Y좌표 */
export function pctToY(pct: number): number {
  return 420 - (pct / 100) * 390;
}

export interface StockItem {
  name: string;
  symbol: string;
  pct: number;
  part: BodyPart;
}

/* ── 인체 실루엣 SVG (점 포함) ── */
export function BodySvg({
  items,
  avgPosition,
  onMarkerHover,
  onMarkerLeave,
  onMarkerTap,
}: {
  items: StockItem[];
  avgPosition?: number;
  onMarkerHover?: (item: StockItem, x: number, y: number) => void;
  onMarkerLeave?: () => void;
  onMarkerTap?: (item: StockItem) => void;
}) {
  return (
    <svg viewBox="0 0 200 450" className="w-[100px] shrink-0 text-[var(--text-primary)]">
      {/* 실루엣 */}
      <g opacity="0.15">
        <ellipse cx="100" cy="52" rx="28" ry="32" fill="currentColor" />
        <rect x="88" y="82" width="24" height="16" rx="6" fill="currentColor" />
        <path d="M56,98 C56,98 48,108 48,120 L48,230 C48,238 54,244 62,244 L138,244 C146,244 152,238 152,230 L152,120 C152,108 144,98 144,98 Z" fill="currentColor" />
        <path d="M48,108 C36,112 24,130 20,160 C16,190 22,210 28,220 C34,228 40,224 42,218 L48,170" fill="currentColor" />
        <path d="M152,108 C164,112 176,130 180,160 C184,190 178,210 172,220 C166,228 160,224 158,218 L152,170" fill="currentColor" />
        <path d="M62,244 L58,310 C56,340 56,370 58,400 C58,410 62,418 68,420 L82,422 C86,422 88,418 86,414 L80,400 C78,380 78,340 80,310 L88,244" fill="currentColor" />
        <path d="M138,244 L142,310 C144,340 144,370 142,400 C142,410 138,418 132,420 L118,422 C114,422 112,418 114,414 L120,400 C122,380 122,340 120,310 L112,244" fill="currentColor" />
      </g>

      {/* 부위 구분선 */}
      {BODY_PARTS.map((p) => (
        <line key={p.label} x1="30" y1={pctToY(p.max)} x2="170" y2={pctToY(p.max)} stroke={p.hex} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
      ))}

      {/* 빨간 점 마커 */}
      {items.map((item) => (
        <circle
          key={item.symbol}
          cx="100"
          cy={pctToY(item.pct)}
          r="6"
          fill="#ef4444"
          stroke="#fff"
          strokeWidth="2"
          className="cursor-pointer transition-all duration-200 hover:r-8"
          onMouseEnter={(e) => {
            const svg = (e.target as SVGElement).closest("svg");
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const scaleX = rect.width / 200;
            const scaleY = rect.height / 450;
            onMarkerHover?.(item, rect.left + 100 * scaleX, rect.top + pctToY(item.pct) * scaleY);
          }}
          onMouseLeave={() => onMarkerLeave?.()}
          onClick={() => onMarkerTap?.(item)}
        />
      ))}

      {/* 포트폴리오 평균 위치 마커 (파란 글로우) */}
      {avgPosition != null && (
        <g>
          <circle cx="100" cy={pctToY(avgPosition)} r="10" fill="#3b82f6" opacity="0.2" />
          <circle cx="100" cy={pctToY(avgPosition)} r="6" fill="#3b82f6" stroke="#93c5fd" strokeWidth="2" />
          <line x1="112" y1={pctToY(avgPosition)} x2="140" y2={pctToY(avgPosition)} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
          <text x="143" y={pctToY(avgPosition) + 3} fill="#93c5fd" fontSize="8" fontWeight="bold">AVG</text>
        </g>
      )}
    </svg>
  );
}

/* ── 부위별 그룹 라벨 (HTML) ── */
function GroupedLabels({ groups }: { groups: { part: BodyPart; stocks: StockItem[] }[] }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
      {groups.map(({ part, stocks }) => (
        <div key={part.label} className={`rounded-lg px-2.5 py-1.5 ${part.bg}`}>
          <span style={{ color: part.hex }} className="text-[10px] font-bold">
            {part.label}
          </span>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {stocks.map((s) => (
              <span key={s.symbol} className="text-[11px] text-[var(--text-primary)] font-medium whitespace-nowrap">
                {s.name}
                <span className="text-[var(--text-muted)] ml-0.5 text-[10px]">{s.pct.toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 풀 모드 ── */
interface FullProps {
  stocks: PortfolioStockData[];
}

export function BodyPositionFull({ stocks }: FullProps) {
  const [tooltip, setTooltip] = useState<{ item: StockItem; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<StockItem | null>(null);

  const validStocks = stocks.filter((s) => s.avgPrice > 0 && s.priceRange3y);
  const items: StockItem[] = validStocks.map((s) => {
    const pct = calcPosition(s.avgPrice, s.priceRange3y!);
    const part = getBodyPart(pct);
    return { name: s.name, symbol: s.symbol, pct, part };
  });

  if (items.length === 0) return null;

  // 포트폴리오 평균 위치 (투자금액 가중평균)
  const totalInvested = validStocks.reduce((sum, s) => sum + s.qty * s.avgPrice, 0);
  const avgPosition = totalInvested > 0
    ? validStocks.reduce((sum, s, i) => sum + items[i].pct * s.qty * s.avgPrice, 0) / totalInvested
    : items.reduce((sum, i) => sum + i.pct, 0) / items.length;

  // 부위별 그룹핑 (해당 종목이 있는 부위만)
  const groups = BODY_PARTS
    .map((part) => ({
      part,
      stocks: items.filter((s) => s.part.label === part.label).sort((a, b) => b.pct - a.pct),
    }))
    .filter((g) => g.stocks.length > 0);

  const handleMarkerHover = useCallback((item: StockItem, x: number, y: number) => {
    setTooltip({ item, x, y });
  }, []);

  const handleMarkerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleMarkerTap = useCallback((item: StockItem) => {
    setToast(item);
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">매수 위치</h3>
        <span className="text-[10px] text-[var(--text-muted)]">3년 고저 기준</span>
      </div>

      <div className="flex items-stretch gap-2">
        <BodySvg
          items={items}
          avgPosition={avgPosition}
          onMarkerHover={handleMarkerHover}
          onMarkerLeave={handleMarkerLeave}
          onMarkerTap={handleMarkerTap}
        />
        <GroupedLabels groups={groups} />
      </div>

      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed text-center">
        발에 가까울수록 저점 매수, 머리에 가까울수록 고점 매수
      </p>

      {/* PC 호버 툴팁 */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 shadow-xl pointer-events-none hidden md:block"
          style={{ left: tooltip.x + 12, top: tooltip.y - 16, transform: "translateY(-50%)" }}
        >
          <span className="text-xs text-white font-medium">{tooltip.item.name}</span>
          <span className="text-[10px] ml-1.5" style={{ color: tooltip.item.part.hex }}>
            {tooltip.item.part.label} {tooltip.item.pct.toFixed(0)}%
          </span>
        </div>
      )}

      {/* 모바일 탭 토스트 */}
      {toast && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-900/95 border border-gray-700 shadow-lg md:hidden animate-[fadeIn_0.15s_ease-out]">
          <span className="text-xs text-white font-medium">{toast.name}</span>
          <span className="text-[10px] ml-1.5" style={{ color: toast.part.hex }}>
            {toast.part.label} {toast.pct.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 미니 모드 ── */
interface MiniProps {
  avgPrice: number;
  priceRange3y: { high3y: number; low3y: number } | null;
}

export function BodyPositionMini({ avgPrice, priceRange3y }: MiniProps) {
  if (!priceRange3y || avgPrice <= 0) return null;

  const pct = calcPosition(avgPrice, priceRange3y);
  const part = getBodyPart(pct);

  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="text-[var(--text-muted)]">매수위치</span>
      <div className="w-12 h-1.5 rounded-full bg-[var(--bg-overlay)] relative overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500"
          style={{ width: "100%" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-[var(--border-primary)] shadow-sm"
          style={{ left: `calc(${Math.min(Math.max(pct, 5), 95)}% - 4px)` }}
        />
      </div>
      <span style={{ color: part.hex }} className="font-medium">{part.label}</span>
    </div>
  );
}
