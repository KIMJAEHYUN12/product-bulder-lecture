import type { EquipmentItem, EquipmentGrade, RpgStats } from "@/types";
import { GACHA_POOL, type GachaItem } from "./gachaPool";

// ── 등급 확률 (%) ──
export const GRADE_RATES: Record<EquipmentGrade, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

// ── 비용 ──
export const SINGLE_COST = 3;
export const MULTI_COST = 13;
export const MULTI_COUNT = 5;

// ── 등급 결정 (가중 랜덤) ──
const GRADE_ORDER: EquipmentGrade[] = ["legendary", "epic", "rare", "uncommon", "common"];

function rollGrade(): EquipmentGrade {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const grade of GRADE_ORDER) {
    cumulative += GRADE_RATES[grade];
    if (roll < cumulative) return grade;
  }
  return "common";
}

// ── 해당 등급 풀에서 랜덤 아이템 선택 ──
function rollItem(): GachaItem {
  const grade = rollGrade();
  const pool = GACHA_POOL.filter((item) => item.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 뽑기 실행 ──
export function pullGacha(count: 1 | 5): GachaItem[] {
  const results: GachaItem[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollItem());
  }

  // 5연뽑: uncommon 이상 1개 보장
  if (count === 5) {
    const hasUncommonOrAbove = results.some(
      (item) => item.grade !== "common"
    );
    if (!hasUncommonOrAbove) {
      const uncommonPool = GACHA_POOL.filter((item) => item.grade === "uncommon");
      results[count - 1] = uncommonPool[Math.floor(Math.random() * uncommonPool.length)];
    }
  }

  return results;
}

// ── GachaItem → EquipmentItem 변환 ──
export function gachaItemToEquipment(item: GachaItem): EquipmentItem {
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    grade: item.grade,
    baseBonus: { ...item.baseBonus },
    bonus: { ...item.baseBonus },
    enhanceLevel: 0,
  };
}

// ── 현재 vs 새 장비 스탯 차이 계산 ──
export interface StatDiff {
  stat: keyof RpgStats;
  current: number;
  incoming: number;
  diff: number;
}

export function compareWithCurrent(
  current: EquipmentItem | null,
  incoming: EquipmentItem
): StatDiff[] {
  const allStats: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const diffs: StatDiff[] = [];

  for (const stat of allStats) {
    const cur = current?.bonus[stat] ?? 0;
    const inc = incoming.bonus[stat] ?? 0;
    if (cur !== 0 || inc !== 0) {
      diffs.push({ stat, current: cur, incoming: inc, diff: inc - cur });
    }
  }

  return diffs;
}
