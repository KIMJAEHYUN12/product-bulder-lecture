import type { RpgClassKey, RpgStats, EquipmentItem, EquipmentSlotKey, EquipmentGrade } from "@/types";

// ── 클래스 정보 ──
export interface RpgClassInfo {
  emoji: string;
  className: string;
  subtitle: string;
  baseStats: RpgStats;
}

export const RPG_CLASSES: Record<RpgClassKey, RpgClassInfo> = {
  visionary: {
    emoji: "🚀",
    className: "혁신가",
    subtitle: "미래에 투자하는 선구자",
    baseStats: { attack: 8, defense: 3, intelligence: 7, stamina: 4, luck: 6 },
  },
  dealmaker: {
    emoji: "🏛️",
    className: "딜메이커",
    subtitle: "레버리지의 달인",
    baseStats: { attack: 7, defense: 5, intelligence: 5, stamina: 6, luck: 5 },
  },
  sage: {
    emoji: "🦉",
    className: "현인",
    subtitle: "복리와 인내의 철학자",
    baseStats: { attack: 4, defense: 8, intelligence: 8, stamina: 5, luck: 3 },
  },
  strategist: {
    emoji: "⚙️",
    className: "전략가",
    subtitle: "시스템 설계자",
    baseStats: { attack: 5, defense: 7, intelligence: 7, stamina: 6, luck: 3 },
  },
  hunter: {
    emoji: "🦅",
    className: "사냥꾼",
    subtitle: "거시경제의 승부사",
    baseStats: { attack: 9, defense: 3, intelligence: 6, stamina: 4, luck: 6 },
  },
  observer: {
    emoji: "🔍",
    className: "관찰자",
    subtitle: "일상 속 보석 발굴자",
    baseStats: { attack: 5, defense: 5, intelligence: 6, stamina: 7, luck: 5 },
  },
  contrarian: {
    emoji: "🐻",
    className: "역발상가",
    subtitle: "세상과 반대로 가는 독행자",
    baseStats: { attack: 7, defense: 6, intelligence: 5, stamina: 5, luck: 5 },
  },
  explorer: {
    emoji: "🧭",
    className: "탐험가",
    subtitle: "미래 선점의 선구자",
    baseStats: { attack: 6, defense: 4, intelligence: 7, stamina: 4, luck: 7 },
  },
};

// ── 기본 장비 ──
export const DEFAULT_EQUIPMENT: Record<EquipmentSlotKey, EquipmentItem> = {
  weapon: {
    id: "default_weapon",
    name: "수습생의 연필",
    emoji: "✏️",
    grade: "common",
    baseBonus: { attack: 1 },
    bonus: { attack: 1 },
    enhanceLevel: 0,
  },
  armor: {
    id: "default_armor",
    name: "수습생의 양복",
    emoji: "👔",
    grade: "common",
    baseBonus: { defense: 1 },
    bonus: { defense: 1 },
    enhanceLevel: 0,
  },
  spellbook: {
    id: "default_spellbook",
    name: "입문 경제학 교과서",
    emoji: "📖",
    grade: "common",
    baseBonus: { intelligence: 1 },
    bonus: { intelligence: 1 },
    enhanceLevel: 0,
  },
  accessory: {
    id: "default_accessory",
    name: "행운의 동전",
    emoji: "🪙",
    grade: "common",
    baseBonus: { luck: 1 },
    bonus: { luck: 1 },
    enhanceLevel: 0,
  },
};

// ── 레벨 & 칭호 ──
const LEVEL_TITLES: [number, string][] = [
  [1, "수습 투자자"],
  [5, "견습 트레이더"],
  [10, "투자 기사"],
  [20, "시장 마법사"],
  [30, "전설의 펀드매니저"],
  [50, "투자의 신"],
];

export function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0][1];
  for (const [minLevel, t] of LEVEL_TITLES) {
    if (level >= minLevel) title = t;
    else break;
  }
  return title;
}

export function expForLevel(level: number): number {
  return level * 100;
}

// ── 스탯 라벨 & 색상 ──
export const STAT_LABELS: Record<keyof RpgStats, { label: string; color: string; bg: string }> = {
  attack: { label: "공격력", color: "text-red-400", bg: "bg-red-500" },
  defense: { label: "방어력", color: "text-blue-400", bg: "bg-blue-500" },
  intelligence: { label: "지능", color: "text-purple-400", bg: "bg-purple-500" },
  stamina: { label: "체력", color: "text-green-400", bg: "bg-green-500" },
  luck: { label: "행운", color: "text-amber-400", bg: "bg-amber-500" },
};

// ── 등급 색상 ──
export const GRADE_COLORS: Record<EquipmentGrade, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

export const GRADE_BG_COLORS: Record<EquipmentGrade, string> = {
  common: "border-gray-600 bg-gray-800/50",
  uncommon: "border-green-600 bg-green-900/30",
  rare: "border-blue-600 bg-blue-900/30",
  epic: "border-purple-600 bg-purple-900/30",
  legendary: "border-amber-500 bg-amber-900/30",
};

export const GRADE_LABELS: Record<EquipmentGrade, string> = {
  common: "일반",
  uncommon: "고급",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};

// ── 슬롯 라벨 ──
export const SLOT_LABELS: Record<EquipmentSlotKey, { label: string; emoji: string }> = {
  weapon: { label: "무기", emoji: "⚔️" },
  armor: { label: "방어구", emoji: "🛡️" },
  spellbook: { label: "마법서", emoji: "📚" },
  accessory: { label: "장신구", emoji: "💎" },
};
