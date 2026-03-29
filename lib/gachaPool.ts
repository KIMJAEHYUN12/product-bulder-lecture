import type { EquipmentSlotKey, EquipmentGrade, RpgStats } from "@/types";

export interface GachaItem {
  id: string;
  slot: EquipmentSlotKey;
  name: string;
  emoji: string;
  grade: EquipmentGrade;
  baseBonus: Partial<RpgStats>;
}

export const GACHA_POOL: GachaItem[] = [
  // common (baseBonus 합계 1~2)
  { id: "c_weapon_01", slot: "weapon", name: "수련생의 볼펜", emoji: "🖊️", grade: "common", baseBonus: { attack: 1 } },
  { id: "c_armor_01", slot: "armor", name: "구겨진 와이셔츠", emoji: "👕", grade: "common", baseBonus: { defense: 1 } },
  { id: "c_spell_01", slot: "spellbook", name: "찢어진 경제신문", emoji: "📰", grade: "common", baseBonus: { intelligence: 1 } },
  { id: "c_acc_01", slot: "accessory", name: "녹슨 동전", emoji: "🪙", grade: "common", baseBonus: { luck: 1 } },

  // uncommon (합계 2~3)
  { id: "u_weapon_01", slot: "weapon", name: "애널리스트의 레이저포인터", emoji: "🔦", grade: "uncommon", baseBonus: { attack: 2, intelligence: 1 } },
  { id: "u_armor_01", slot: "armor", name: "브랜드 정장", emoji: "🧥", grade: "uncommon", baseBonus: { defense: 2, stamina: 1 } },
  { id: "u_spell_01", slot: "spellbook", name: "기술적 분석 입문서", emoji: "📊", grade: "uncommon", baseBonus: { intelligence: 2, attack: 1 } },
  { id: "u_acc_01", slot: "accessory", name: "가죽 시계", emoji: "⌚", grade: "uncommon", baseBonus: { luck: 1, stamina: 1 } },

  // rare (합계 3~5)
  { id: "r_weapon_01", slot: "weapon", name: "헤지펀드의 칼날", emoji: "🗡️", grade: "rare", baseBonus: { attack: 3, intelligence: 2 } },
  { id: "r_armor_01", slot: "armor", name: "월가의 방탄조끼", emoji: "🦺", grade: "rare", baseBonus: { defense: 3, stamina: 2 } },
  { id: "r_spell_01", slot: "spellbook", name: "퀀트 알고리즘 노트", emoji: "🧮", grade: "rare", baseBonus: { intelligence: 3, attack: 1 } },
  { id: "r_acc_01", slot: "accessory", name: "황소상 미니어처", emoji: "🐂", grade: "rare", baseBonus: { luck: 2, attack: 2 } },

  // epic (합계 5~7)
  { id: "e_weapon_01", slot: "weapon", name: "공매도의 대낫", emoji: "⚔️", grade: "epic", baseBonus: { attack: 5, intelligence: 2 } },
  { id: "e_armor_01", slot: "armor", name: "리스크관리의 갑옷", emoji: "🛡️", grade: "epic", baseBonus: { defense: 4, stamina: 3 } },
  { id: "e_spell_01", slot: "spellbook", name: "가치투자 바이블", emoji: "📕", grade: "epic", baseBonus: { intelligence: 5, defense: 2 } },
  { id: "e_acc_01", slot: "accessory", name: "내부자의 귓속말", emoji: "👂", grade: "epic", baseBonus: { luck: 3, intelligence: 3 } },

  // legendary (합계 7~10)
  { id: "l_weapon_01", slot: "weapon", name: "버핏의 연례서한", emoji: "📜", grade: "legendary", baseBonus: { attack: 6, intelligence: 4 } },
  { id: "l_armor_01", slot: "armor", name: "불패의 포트폴리오", emoji: "💼", grade: "legendary", baseBonus: { defense: 5, stamina: 3, intelligence: 2 } },
  { id: "l_spell_01", slot: "spellbook", name: "시장의 예언서", emoji: "🔮", grade: "legendary", baseBonus: { intelligence: 6, luck: 4 } },
  { id: "l_acc_01", slot: "accessory", name: "미다스의 손", emoji: "✋", grade: "legendary", baseBonus: { luck: 5, attack: 3, intelligence: 2 } },
];
