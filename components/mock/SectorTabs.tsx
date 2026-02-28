"use client";

export const SECTORS = [
  "반도체",
  "전력기기",
  "이차전지",
  "바이오",
  "엔터/플랫폼",
  "자동차",
  "정유/화학",
  "금융/증권",
  "의료기기",
  "조선/방산",
  "건설/인프라",
  "철강/소재",
  "소비재",
  "운송/물류",
  "통신",
  "유통",
  "지주/기타",
  "ETF",
] as const;

export type Sector = (typeof SECTORS)[number];

interface SectorTabsProps {
  active: Sector;
  onChange: (s: Sector) => void;
}

export function SectorTabs({ active, onChange }: SectorTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {SECTORS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-all whitespace-nowrap ${
            active === s
              ? "bg-kim-red text-white border-kim-red shadow"
              : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/30"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
