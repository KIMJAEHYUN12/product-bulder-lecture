import type { EquipmentItem, EquipmentGrade, RpgStats } from "@/types";

export const MAX_ENHANCE_LEVEL = 10;

// ── 비용 (투자석) ──
const COST_TABLE: number[] = [1, 1, 1, 2, 2, 3, 3, 4, 5, 6];

export function getEnhanceCost(level: number): number {
  if (level < 0 || level >= MAX_ENHANCE_LEVEL) return 0;
  return COST_TABLE[level];
}

// ── 성공 확률 (%) ──
const RATE_TABLE: number[] = [100, 95, 90, 80, 70, 55, 40, 30, 20, 10];

export function getSuccessRate(level: number): number {
  if (level < 0 || level >= MAX_ENHANCE_LEVEL) return 0;
  return RATE_TABLE[level];
}

// ── 최대 레벨 체크 ──
export function canEnhance(item: EquipmentItem): boolean {
  return item.enhanceLevel < MAX_ENHANCE_LEVEL;
}

// ── 등급 배수 ──
const GRADE_MULT: Record<EquipmentGrade, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 2.5,
  legendary: 3,
};

// ── 보너스 계산 ──
export function computeEnhancedBonus(
  baseBonus: Partial<RpgStats>,
  level: number,
  grade: EquipmentGrade
): Partial<RpgStats> {
  const mult = GRADE_MULT[grade];
  const result: Partial<RpgStats> = {};
  for (const [key, val] of Object.entries(baseBonus)) {
    if (val != null) {
      result[key as keyof RpgStats] = val + Math.round(level * mult);
    }
  }
  return result;
}

// ── 실패 페널티 계산 ──
function applyFailurePenalty(level: number): number {
  if (level <= 3) return level; // 유지
  if (level <= 6) return Math.random() < 0.5 ? level - 1 : level; // 50% 하락
  return level - 1; // 확정 하락
}

// ── 강화 결과 ──
export interface EnhanceResult {
  success: boolean;
  newLevel: number;
  newBonus: Partial<RpgStats>;
  message: string;
}

// ── 강화 실행 ──
export function executeEnhance(item: EquipmentItem): EnhanceResult {
  const rate = getSuccessRate(item.enhanceLevel);
  const roll = Math.random() * 100;
  const success = roll < rate;

  if (success) {
    const newLevel = item.enhanceLevel + 1;
    const newBonus = computeEnhancedBonus(item.baseBonus, newLevel, item.grade);
    return {
      success: true,
      newLevel,
      newBonus,
      message: `+${newLevel} 강화 성공!`,
    };
  }

  const newLevel = applyFailurePenalty(item.enhanceLevel);
  const newBonus = computeEnhancedBonus(item.baseBonus, newLevel, item.grade);
  const dropped = newLevel < item.enhanceLevel;

  return {
    success: false,
    newLevel,
    newBonus,
    message: dropped
      ? `강화 실패... +${newLevel}로 하락`
      : "강화 실패... 레벨 유지",
  };
}
