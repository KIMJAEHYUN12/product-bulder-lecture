"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { loadRpgCharacter, saveRpgCharacter } from "@/lib/rpgCharacterDb";
import { RPG_CLASSES, DEFAULT_EQUIPMENT, getLevelTitle, expForLevel } from "@/lib/rpgConstants";
import type { RpgCharacter, RpgClassKey, RpgStats, EquipmentSlotKey } from "@/types";

const STORAGE_KEY = "ovision_rpg_character";

/** Firestore/localStorage에서 불러온 캐릭터 데이터 유효성 검증 */
function isValidCharacter(c: unknown): c is RpgCharacter {
  if (!c || typeof c !== "object") return false;
  const obj = c as Record<string, unknown>;
  return typeof obj.class === "string" && obj.class in RPG_CLASSES;
}

/** 불완전한 캐릭터 데이터 정규화 (Firestore/localStorage에서 필드 누락 방지) */
function normalizeCharacter(c: RpgCharacter): RpgCharacter {
  const classInfo = RPG_CLASSES[c.class] ?? RPG_CLASSES.visionary;
  const normalized = { ...c };

  // class 키가 유효하지 않으면 visionary 로 보정
  if (!(c.class in RPG_CLASSES)) {
    normalized.class = "visionary";
  }

  // stats 누락 시 기본값
  if (!normalized.stats || typeof normalized.stats !== "object") {
    normalized.stats = { ...classInfo.baseStats };
  }

  // equipment 누락 시 기본 장비 세팅
  if (!normalized.equipment || typeof normalized.equipment !== "object") {
    normalized.equipment = {
      weapon: { ...DEFAULT_EQUIPMENT.weapon },
      armor: { ...DEFAULT_EQUIPMENT.armor },
      spellbook: { ...DEFAULT_EQUIPMENT.spellbook },
      accessory: { ...DEFAULT_EQUIPMENT.accessory },
    };
  } else {
    // 개별 슬롯 누락 복구
    const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
    for (const slot of slots) {
      if (normalized.equipment[slot] && typeof normalized.equipment[slot] === "object") {
        const item = normalized.equipment[slot]!;
        // emoji 누락 시 기본값
        if (!item.emoji) item.emoji = DEFAULT_EQUIPMENT[slot].emoji;
        if (!item.name) item.name = DEFAULT_EQUIPMENT[slot].name;
        if (!item.bonus) item.bonus = {};
      }
    }
  }

  // battleRecord 누락 시 기본값
  if (!normalized.battleRecord || typeof normalized.battleRecord !== "object") {
    normalized.battleRecord = { wins: 0, losses: 0, draws: 0 };
  }

  // stones 누락 시 기본값
  if (typeof normalized.stones !== "number") {
    normalized.stones = 0;
  }

  return normalized;
}

/** 기존 캐릭터에 baseBonus가 없으면 bonus에서 복사 */
function migrateBaseBonus(c: RpgCharacter): RpgCharacter {
  if (!c.equipment) return c;
  let changed = false;
  const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
  for (const slot of slots) {
    const item = c.equipment[slot];
    if (item && !item.baseBonus) {
      item.baseBonus = { ...(item.bonus ?? {}) };
      changed = true;
    }
  }
  return changed ? { ...c } : c;
}

function loadLocal(): RpgCharacter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidCharacter(parsed)) return null;
    return normalizeCharacter(migrateBaseBonus(parsed));
  } catch {
    return null;
  }
}

function saveLocal(c: RpgCharacter) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function computeTotalStats(character: RpgCharacter): RpgStats {
  const total = { ...character.stats };
  if (!character.equipment) return total;
  const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
  for (const slot of slots) {
    const item = character.equipment[slot];
    if (!item?.bonus) continue;
    for (const [key, val] of Object.entries(item.bonus)) {
      if (val) total[key as keyof RpgStats] += val;
    }
  }
  return total;
}

export type SetCharacterArg = RpgCharacter | ((prev: RpgCharacter) => RpgCharacter);

export function useRpgCharacter(userId?: string | null) {
  const [character, setCharacterState] = useState<RpgCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const characterRef = useRef<RpgCharacter | null>(null);

  // characterRef를 항상 최신 character와 동기화
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  const setCharacter = useCallback((arg: SetCharacterArg) => {
    const prev = characterRef.current;
    if (!prev) return;
    const next = typeof arg === "function" ? arg(prev) : arg;
    const updated = { ...next, updatedAt: new Date().toISOString() };
    characterRef.current = updated;
    setCharacterState(updated);
    saveLocal(updated);
    if (userId) {
      saveRpgCharacter(userId, updated).catch(() => {});
    }
  }, [userId]);

  // 로드
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    setLoading(true);

    if (userId) {
      loadRpgCharacter(userId)
        .then((dbChar) => {
          if (dbChar && isValidCharacter(dbChar)) {
            setCharacterState(normalizeCharacter(migrateBaseBonus(dbChar)));
          } else {
            // Firestore에 없으면 localStorage에서 마이그레이션
            const local = loadLocal();
            if (local) {
              const migrated = normalizeCharacter(migrateBaseBonus(local));
              setCharacterState(migrated);
              saveRpgCharacter(userId, migrated).catch(() => {});
            } else {
              setCharacterState(null);
            }
          }
          setLoading(false);
        })
        .catch(() => {
          const fallback = loadLocal();
          setCharacterState(fallback ? normalizeCharacter(fallback) : null);
          setLoading(false);
        });
    } else {
      const local = loadLocal();
      setCharacterState(local ? normalizeCharacter(local) : null);
      setLoading(false);
    }
  }, [userId]);

  const createCharacter = useCallback((classKey: RpgClassKey, nickname: string) => {
    const classInfo = RPG_CLASSES[classKey];
    const now = new Date().toISOString();
    const newChar: RpgCharacter = {
      class: classKey,
      nickname,
      level: 1,
      exp: 0,
      stats: { ...classInfo.baseStats },
      equipment: {
        weapon: { ...DEFAULT_EQUIPMENT.weapon },
        armor: { ...DEFAULT_EQUIPMENT.armor },
        spellbook: { ...DEFAULT_EQUIPMENT.spellbook },
        accessory: { ...DEFAULT_EQUIPMENT.accessory },
      },
      stones: 3,
      battleRecord: { wins: 0, losses: 0, draws: 0 },
      achievements: [],
      createdAt: now,
      updatedAt: now,
    };
    setCharacter(newChar);
    return newChar;
  }, [setCharacter]);

  const totalStats = useMemo(() => {
    if (!character) return null;
    return computeTotalStats(character);
  }, [character]);

  const levelTitle = character ? getLevelTitle(character.level) : "";
  const expNeeded = character ? expForLevel(character.level) : 0;

  return {
    character,
    loading,
    totalStats,
    levelTitle,
    expNeeded,
    createCharacter,
    setCharacter,
  };
}
