# 뽑기(Gacha) 시스템 구현 스펙

> 이 문서는 디자이너가 작성한 구현 명세입니다. 그대로 따라 구현하세요.
> 기존 코드 패턴(강화 시스템 등)을 참고하되, 이 스펙이 우선합니다.

---

## 개요

투자석을 소모해 랜덤 장비를 획득하는 가챠 시스템.
`app/adventure/page.tsx`의 `gacha` 탭에 들어갈 컴포넌트.

---

## 파일 구조

```
components/adventure/GachaPanel.tsx    — 메인 뽑기 UI
components/adventure/GachaReveal.tsx   — 뽑기 연출 오버레이
components/adventure/GachaResult.tsx   — 결과 카드 (1회/5회 공용)
lib/gachaEngine.ts                     — 확률 계산, 장비 풀, 뽑기 로직
lib/gachaPool.ts                       — 장비 데이터 정의 (20개+)
```

---

## 1. 장비 풀 (`lib/gachaPool.ts`)

4슬롯(weapon/armor/spellbook/accessory) × 5등급 = 최소 20개.

```typescript
import type { EquipmentSlotKey, EquipmentGrade, RpgStats } from "@/types";

export interface GachaItem {
  id: string;              // "rare_weapon_01"
  slot: EquipmentSlotKey;
  name: string;            // "시장분석의 검"
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
```

장비 이름/이모지는 자유롭게 수정 가능하나 등급별 baseBonus 합계 범위는 지켜야 함.

---

## 2. 뽑기 엔진 (`lib/gachaEngine.ts`)

```typescript
// 등급 확률
const GRADE_RATES: Record<EquipmentGrade, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

// 비용
const SINGLE_COST = 3;   // 투자석
const MULTI_COST = 13;   // 5회 (정가 15에서 할인)
const MULTI_COUNT = 5;

// 뽑기 실행
export function pullGacha(count: 1 | 5): GachaItem[] {
  // 1. 등급 결정 (가중 랜덤)
  // 2. 해당 등급 풀에서 랜덤 아이템 선택
  // 3. count만큼 반복, 결과 배열 반환
}
```

5연뽑은 최소 uncommon 1개 보장 (전부 common 방지).

---

## 3. 메인 UI (`GachaPanel.tsx`)

### 레이아웃

```
┌─────────────────────────────┐
│ 💎 투자석: {stones}          │  glass-card p-5 rounded-2xl
└─────────────────────────────┘

┌─────────────────────────────┐
│  ┌───────────┐ ┌───────────┐│
│  │   🎰      │ │   🎰 ×5  ││
│  │  1회 뽑기  │ │  5회 뽑기  ││  grid grid-cols-2 gap-2
│  │  💎 3     │ │  💎15→13  ││
│  └───────────┘ └───────────┘│  glass-card p-5 rounded-2xl
│                              │
│  확률표 보기 ▼               │  토글 버튼, text-[10px]
│  ┌──────────────────────┐   │
│  │ 일반 60% · 고급 25%  │   │  접었다 펼쳐지는 영역
│  │ 희귀 10% · 영웅  4%  │   │  bg-white/5 rounded-xl p-3
│  │ 전설  1%             │   │
│  └──────────────────────┘   │
└─────────────────────────────┘

┌─────────────────────────────┐
│  최근 획득                   │  glass-card p-5 rounded-2xl
│  [📰][🔦][🗡️][⚔️][🔮]     │  overflow-x-auto, 최근 10개
└─────────────────────────────┘
```

### 버튼 스타일

```
1회 뽑기:
  가능: bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl
  불가: bg-white/5 text-gray-600 cursor-not-allowed

5회 뽑기:
  가능: bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-4 rounded-xl
  불가: bg-white/5 text-gray-600 cursor-not-allowed

할인 표시: 원가에 line-through text-gray-500 text-[10px], 옆에 할인가 text-white font-bold
```

### 최근 획득 히스토리

- `localStorage` key: `ovision_gacha_history`
- 최대 20개 저장, 최근 10개 표시
- 각 아이템: `w-10 h-10 rounded-lg ${GRADE_BG_COLORS[grade]}` 안에 이모지
- 가로 스크롤: `overflow-x-auto flex gap-1.5`, 각 아이템 `shrink-0`

---

## 4. 뽑기 연출 (`GachaReveal.tsx`)

`position: fixed inset-0 z-50` 오버레이.

### 등급별 연출 차등

| 등급 | 시간 | 연출 |
|------|------|------|
| common | 0.6s | 카드 flip만 |
| uncommon | 0.8s | flip + 테두리 glow |
| rare | 1.2s | 배경 파란 flash → flip → ring pulse |
| epic | 1.8s | 배경 어두워짐 → 보라 flash → flip → 파티클 |
| legendary | 2.5s | 화면 shake → 배경 어두워짐 → 금색 flash → flip → 파티클 다량 |

### 애니메이션 스펙

**카드 flip:**
```css
perspective: 600px;
transform: rotateY(0deg → 180deg);
transition: 0.5s ease-out;
```
- 뒷면: `bg-gradient-to-br from-indigo-900 to-gray-900`, 중앙에 `?` 텍스트
- 앞면: 등급 테두리 색상 카드

**배경 flash (rare 이상):**
```
fixed inset-0, 등급 색상
opacity: 0 → 0.3 → 0
duration: 0.3s
```
- rare: `bg-blue-500`
- epic: `bg-purple-500`
- legendary: `bg-amber-500`

**Ring pulse (rare 이상):**
```
카드 주변 border-2 원형
scale: 1 → 2, opacity: 1 → 0
2회 반복, duration: 0.6s each
색상: GRADE_COLORS[grade]
```

**파티클 (epic 이상):**
```
8개(epic) / 12개(legendary) 작은 원 (w-2 h-2 rounded-full)
카드 중심에서 random angle × 60~100px 방사
opacity: 1 → 0, duration: 0.8s
색상: 등급 색상
```

**화면 shake (legendary만):**
```
x: [0, -4, 4, -4, 4, 0], duration: 0.4s
전체 컨테이너에 적용
```

### 5연뽑 연출

- 카드 5장 순차 공개, stagger `0.3s`
- 등급이 높은 카드일수록 뒤에 배치 (클라이맥스 구조)
- 배열을 등급순 정렬: common → legendary 순서로 공개
- 마지막 카드(최고 등급)에만 풀 연출, 나머지는 간소화(flip만)

---

## 5. 결과 카드 (`GachaResult.tsx`)

### 1회 뽑기 결과

```
┌─────────────────────────────┐
│                              │
│      ✨ 새로운 장비! ✨       │  GRADE_COLORS[grade], text-sm font-bold
│                              │
│           ⚔️                 │  text-5xl, motion scale spring
│       공매도의 대낫           │  text-base font-black text-white
│                              │
│   ┌──────────────────────┐  │
│   │  공격력 +5            │  │  GRADE_BG_COLORS[grade] 테두리
│   │  지능 +2              │  │  각 스탯: STAT_LABELS[key].color
│   └──────────────────────┘  │
│                              │
│   현재 무기: 수습생의 연필    │  text-[10px] text-gray-500
│   → 공격력 +1 → +5 (↑4)     │  비교 표시
│                              │
│  [장착하기]     [보관하기]    │
└─────────────────────────────┘

장착하기: bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 px-6 rounded-xl
보관하기: bg-white/10 hover:bg-white/15 text-gray-300 text-sm py-2.5 px-6 rounded-xl
```

- 카드 전체: `glass-card rounded-2xl p-6`
- 등급 glow: `box-shadow: 0 0 40px {등급색상}20`
- "장착하기" 누르면 해당 슬롯 장비 교체 → 기존 장비는 사라짐 (인벤토리 없음)
- "보관하기" 누르면 그냥 닫힘 (장비 버림)

### 5연뽑 결과

```
┌─────────────────────────────┐
│       5회 뽑기 결과          │
│                              │
│  [📰] [🔦] [🗡️] [⚔️] [📕] │  가로 스크롤, stagger 등장
│   일반  고급  희귀  영웅  영웅 │  등급 라벨
│                              │
│  ← 탭해서 상세 보기 →        │  text-[10px] text-gray-500
│                              │
│  [닫기]                      │
└─────────────────────────────┘
```

- 각 미니 카드: `w-14 h-20 rounded-lg ${GRADE_BG_COLORS[grade]} flex flex-col items-center justify-center`
- 미니 카드 이모지: `text-xl`
- 미니 카드 등급 라벨: `text-[8px] ${GRADE_COLORS[grade]} font-mono`
- 탭하면 해당 아이템 상세 (1회 결과와 동일 포맷) 표시
- stagger: `initial={{ opacity: 0, y: 20 }}`, delay `i * 0.15s`

---

## 6. adventure/page.tsx 연결

기존 gacha 탭 placeholder를 `<GachaPanel />` 로 교체:

```tsx
{activeTab === "gacha" && (
  <motion.div key="gacha" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
    <GachaPanel character={character} setCharacter={setCharacter} />
  </motion.div>
)}
```

---

## 7. 체크리스트

- [ ] 투자석 차감 정확히 동작
- [ ] 5연뽑 최소 uncommon 1개 보장
- [ ] 장착 시 기존 장비의 enhanceLevel/bonus 리셋 (새 장비는 enhanceLevel: 0)
- [ ] 등급별 연출 차등 적용
- [ ] 5연뽑 결과에서 개별 장착/보관 가능
- [ ] 최근 획득 히스토리 localStorage 저장
- [ ] 모바일 overflow-x-auto 처리
- [ ] z-index: 연출 오버레이 z-50 (모달과 동일)
- [ ] `npm run build` 에러 0개 확인 후 완료 보고
