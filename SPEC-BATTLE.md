# 배틀 시스템 구현 스펙

> 이 문서는 디자이너가 작성한 구현 명세입니다. 그대로 따라 구현하세요.
> 기존 코드 패턴(강화 시스템 등)을 참고하되, 이 스펙이 우선합니다.

---

## 개요

비동기 PvE 턴제 자동 배틀. 실시간 대전 아님.
AI가 생성한 상대와 3~5턴 자동 전투 후 보상 획득.
`app/adventure/page.tsx`의 `battle` 탭에 들어갈 컴포넌트.
**서버 API 불필요** — 전부 클라이언트 계산.

---

## 파일 구조

```
components/adventure/BattlePanel.tsx     — 메인 배틀 UI (매칭/전투/결과 상태 관리)
components/adventure/BattleArena.tsx     — 턴 진행 연출
components/adventure/BattleResult.tsx    — 결과 화면
lib/battleEngine.ts                      — 상대 생성, 턴 계산, 배틀 시뮬레이션
```

---

## 1. 배틀 엔진 (`lib/battleEngine.ts`)

### 타입 정의

```typescript
export interface BattleOpponent {
  class: RpgClassKey;
  className: string;
  emoji: string;
  nickname: string;     // 랜덤 생성 (예: "워렌의 후예", "월가의 늑대")
  level: number;
  stats: RpgStats;      // 최종 스탯 (기본 + 레벨보정 + 장비보정)
  combatPower: number;
}

export type TurnType = "attack" | "intelligence" | "stamina" | "luck" | "final";

export interface TurnResult {
  turn: number;
  type: TurnType;
  label: string;          // "공격전", "지능전", "체력전", "운빨", "최종 결산"
  playerDmg: number;      // 플레이어가 받는 데미지
  opponentDmg: number;    // 상대가 받는 데미지
  playerHp: number;       // 턴 후 남은 HP
  opponentHp: number;
  isCritical: boolean;    // 크리티컬 발생 여부
  flavorText: string;     // "혁신가의 날카로운 분석이 적중했다!"
}

export interface BattleResult {
  turns: TurnResult[];
  winner: "player" | "opponent" | "draw";
  expReward: number;
  stoneReward: number;
}
```

### 상대 생성 로직

```typescript
export function generateOpponent(myLevel: number): BattleOpponent {
  // 레벨: myLevel + random(-3, +3), 최소 1
  // 클래스: RPG_CLASSES에서 랜덤
  // 스탯: baseStats[class] + (level × 0.5를 5개 스탯에 랜덤 분배) + (level × 0.3 장비 보정)
  // 닉네임: OPPONENT_NAMES 배열에서 랜덤
}

const OPPONENT_NAMES = [
  "워렌의 후예", "월가의 늑대", "동학개미", "차트의 마법사",
  "배당왕", "숏셀러", "퀀트봇", "다이아몬드핸드",
  "종이손", "김치프리미엄", "존버의 왕", "풀매수전사",
  "손절의 달인", "물타기장인", "셀온뉴스", "바이더딥",
];
```

### 배틀 시뮬레이션

```typescript
// 초기 HP = (스탯 합계) × 10
// 턴 구성: 3~5턴 (고정 5턴)
// 턴 순서: attack → intelligence → stamina → luck → final

export function simulateBattle(playerStats: RpgStats, opponent: BattleOpponent): BattleResult {
  const playerMaxHp = sumStats(playerStats) * 10;
  const opponentMaxHp = sumStats(opponent.stats) * 10;
  let playerHp = playerMaxHp;
  let opponentHp = opponentMaxHp;
  const turns: TurnResult[] = [];

  // Turn 1: 공격전 — attack 기반, defense로 감소
  // Turn 2: 지능전 — intelligence 대결
  // Turn 3: 체력전 — stamina 대결
  // Turn 4: 운빨 — luck 기반, 크리티컬 확률 = luck × 5%
  // Turn 5: 최종 결산 — 남은 HP 비교, 전체 스탯 종합

  // 데미지 공식: base = (주스탯 × 2) - (상대 방어스탯 × 0.8) + random(-2, +2)
  // 최소 데미지: 1
  // 크리티컬: 데미지 × 1.5

  // 승리 판정: HP가 0 이하가 되면 즉시 종료
  // 5턴 후 둘 다 생존: HP 비율 비교 (차이 5% 이내면 무승부)
}
```

### 보상 계산

| 결과 | EXP | 투자석 |
|------|-----|--------|
| 승리 | 30 | 2 |
| 패배 | 10 | 0 |
| 무승부 | 20 | 1 |

3연승 보너스: 투자석 +1 추가.
일일 무료 3회, 이후 투자석 1개로 추가 배틀.
일일 횟수는 `localStorage` key: `ovision_battle_${KST날짜}`.

### 플레이버 텍스트

턴 타입별로 3~5개 준비해서 랜덤 선택:

```typescript
const FLAVOR_TEXTS: Record<TurnType, { player: string[]; opponent: string[] }> = {
  attack: {
    player: ["날카로운 분석이 적중!", "매수 타이밍을 포착!", "공격적 포지션 진입!"],
    opponent: ["상대의 반격이 쏟아진다!", "매도 압력에 밀린다!", "숏 포지션에 당했다!"],
  },
  intelligence: {
    player: ["펀더멘털 분석 완료!", "리서치가 빛을 발한다!", "시장을 꿰뚫어 본다!"],
    opponent: ["상대의 통찰이 날카롭다!", "정보력에서 밀린다!"],
  },
  // ... stamina, luck, final 도 동일 패턴
};
```

---

## 2. 메인 UI (`BattlePanel.tsx`)

3개 상태: `idle` → `fighting` → `result`

### idle 상태 (매칭 대기)

```
┌─────────────────────────────┐
│ ⚔️ 투자 배틀                 │  text-sm font-black
│                              │
│  오늘 전적: {wins}승 {losses}패│  text-xs text-gray-400 font-mono
│  남은 횟수: {remaining}/3     │  0이면 "💎1로 추가 가능"
└─────────────────────────────┘

┌─────────────────────────────┐
│                              │
│   {나emoji}    VS     ???    │  양쪽 w-16 h-16 bg-white/5 rounded-2xl
│   {닉네임}           ???     │
│   Lv.{lv}            ???     │
│   전투력 {cp}        ???     │  font-mono
│                              │
└─────────────────────────────┘

[ 🎯 배틀 시작 ]               bg-indigo-600 hover:bg-indigo-500, w-full py-3.5 rounded-xl font-black
                               횟수 소진 시: "💎1 소모하고 배틀" (투자석 부족이면 disabled)

┌─────────────────────────────┐
│  최근 전적                   │  glass-card p-5 rounded-2xl
│  ✓ 승리 vs 현인 Lv.8  +30exp│  text-xs font-mono
│  ✗ 패배 vs 사냥꾼 Lv.15     │  승리: text-green-400, 패배: text-red-400
│  △ 무승부 vs 전략가 Lv.10   │  무승부: text-amber-400
└─────────────────────────────┘
```

- 전적/히스토리: `localStorage` key: `ovision_battle_history`, 최근 10개
- 모든 카드: `glass-card p-5 rounded-2xl`

### 매칭 연출 (idle → fighting 전환, 1.5s)

1. "???" 자리에 상대 정보가 순차 공개 (0.3s stagger)
2. 이모지 → 클래스명 → 레벨 → 전투력 순서
3. 각 항목: `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}`
4. VS 텍스트: `scale: [1, 1.3, 1]` pulse, `text-red-400 font-black text-xl`

---

## 3. 배틀 진행 (`BattleArena.tsx`)

### 레이아웃

```
┌─────────────────────────────┐
│  Round {n} — {턴라벨}        │  text-xs text-gray-400 font-mono
│                              │
│  {나emoji}          {상대emoji}│  양쪽 배치
│                              │
│   -12HP ←          → -8HP   │  데미지 숫자 (위로 튀어오름)
│                              │
│  ████████░░  88  35  ░░████ │  HP 바 (좌=나 우→좌, 우=상대 좌→우)
│  {나닉네임}     {상대닉네임}  │  text-[10px]
│                              │
│  "{플레이버 텍스트}"          │  text-xs text-gray-300 italic
└─────────────────────────────┘
```

### HP 바 스펙

```
높이: h-3
둥글기: rounded-full
배경: bg-white/10
방향: 나=오른쪽 정렬(justify-end), 상대=왼쪽 정렬

색상 (HP 비율):
  100~60%: bg-green-500
  60~30%:  bg-amber-500
  30~0%:   bg-red-500

전환: transition-all duration-500 ease-out
```

### 데미지 숫자 애니메이션

```
일반 데미지:
  text-white text-sm font-black
  initial: { opacity: 1, y: 0 }
  animate: { opacity: 0, y: -30 }
  duration: 0.8s

크리티컬 데미지:
  text-amber-400 text-lg font-black
  initial: { opacity: 1, y: 0, scale: 1.3 }
  animate: { opacity: 0, y: -40, scale: 1 }
  duration: 1s
  + "CRITICAL!" 텍스트 같이 표시
```

### 이모지 충돌 연출

각 턴 시작 시:
- 나: `x: [0, 20, 0]`, duration `0.3s`
- 상대: `x: [0, -20, 0]`, duration `0.3s`
- 동시에 실행 → 중앙에서 부딪히는 느낌

### 턴 진행 타이밍

```
턴 시작 → 이모지 충돌 (0.3s)
         → 데미지 표시 (0.5s 후)
         → HP 바 갱신 (0.3s 후)
         → 플레이버 텍스트 (0.3s 후)
         → 다음 턴 (0.8s 후)

총 턴 간격: 약 2.2s
```

### KO 연출 (HP 0 이하)

- 진 쪽 이모지: `opacity: 1 → 0.3`, `scale: 1 → 0.8`, `rotate: 15deg`
- "K.O." 텍스트: 중앙에 `text-2xl font-black text-red-400`, scale spring
- 0.8s 후 결과 화면으로 전환

---

## 4. 결과 화면 (`BattleResult.tsx`)

### 승리

```
┌─────────────────────────────┐
│                              │
│         🏆                   │  text-5xl, scale spring
│        승리!                 │  text-xl font-black text-amber-400
│                              │
│   ┌──────────┐ ┌──────────┐ │
│   │   EXP    │ │  투자석   │ │  grid grid-cols-2 gap-2
│   │   +30    │ │   +2     │ │  AnimatedNumber 사용
│   └──────────┘ └──────────┘ │  bg-white/5 rounded-xl p-3 text-center
│                              │
│   3연승 보너스! 💎+1          │  연승 보너스 있을 때만 표시
│                              │
│   전적: {w}승 {l}패 ({pct}%) │  text-xs text-gray-400 font-mono
│                              │
│  [다시 배틀]    [돌아가기]    │
└─────────────────────────────┘

다시 배틀: bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 flex-1 rounded-xl
돌아가기: bg-white/10 hover:bg-white/15 text-gray-300 text-sm py-2.5 flex-1 rounded-xl
두 버튼: flex gap-2
```

**승리 파티클:**
- 8~12개 원형 (`w-2 h-2 rounded-full`)
- 색상: amber-400, yellow-300, orange-400 랜덤
- 상단에서 랜덤 x 위치, `y: -50 → 300`, `opacity: 1 → 0`
- duration: 1.5~2.5s 랜덤, 지연 0~0.5s 랜덤

### 패배

```
┌─────────────────────────────┐
│                              │
│         💀                   │  text-5xl, 흔들림 1회
│        패배...               │  text-xl font-black text-gray-400
│                              │
│   ┌──────────────────────┐  │
│   │     EXP +10           │  │  단일 카드, bg-white/5
│   └──────────────────────┘  │
│                              │
│  [다시 배틀]    [돌아가기]    │
└─────────────────────────────┘
```

- 배경: 잠깐 `bg-red-500/5` flash (0.3s)
- 전체 컨테이너 흔들림: `x: [0, -5, 5, -3, 3, 0]`, duration `0.4s`

### 무승부

```
이모지: ⚖️
텍스트: "무승부" text-amber-400
보상: EXP +20, 💎 +1
```

---

## 5. 상태 관리

`BattlePanel.tsx`에서 useState로 관리:

```typescript
type BattlePhase = "idle" | "matching" | "fighting" | "result";

const [phase, setPhase] = useState<BattlePhase>("idle");
const [opponent, setOpponent] = useState<BattleOpponent | null>(null);
const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
const [currentTurn, setCurrentTurn] = useState(0);
```

흐름:
1. `idle`: 배틀 시작 버튼 클릭
2. `matching`: `generateOpponent()` → 상대 정보 순차 공개 (1.5s)
3. `fighting`: `simulateBattle()` → 턴별로 `setCurrentTurn` 증가 (타이머)
4. `result`: 보상 계산 → `grantExp("battle_win" | "battle_lose")` → 투자석 지급 → character 업데이트

---

## 6. adventure/page.tsx 연결

기존 battle 탭 placeholder를 `<BattlePanel />` 로 교체:

```tsx
{activeTab === "battle" && (
  <motion.div key="battle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
    <BattlePanel character={character} setCharacter={setCharacter} />
  </motion.div>
)}
```

---

## 7. EXP 연동

`lib/rpgExpConfig.ts`에 배틀 활동 추가 필요:

```typescript
// 기존 EXP_ACTIVITIES에 추가
battle_win: { baseExp: 30, dailyCap: 10 },
battle_lose: { baseExp: 10, dailyCap: 10 },
```

배틀 결과 시 `grantExp("battle_win")` 또는 `grantExp("battle_lose")` 호출.
투자석은 `setCharacter`로 직접 추가.

---

## 8. 체크리스트

- [ ] 상대 생성이 내 레벨 기준 ±3 범위인지 확인
- [ ] 일일 3회 제한 + 투자석 추가 배틀 동작
- [ ] 턴 진행이 자동으로 2.2s 간격 재생
- [ ] HP 0 이하 시 즉시 종료 (남은 턴 스킵)
- [ ] 승리/패배/무승부 보상 정확히 지급
- [ ] 3연승 보너스 투자석 +1
- [ ] grantExp 호출로 EXP 토스트 동작
- [ ] 전적 히스토리 localStorage 저장
- [ ] KST 날짜 기준 일일 리셋
- [ ] 모바일에서 레이아웃 깨지지 않는지 확인
- [ ] z-index: KO 연출이 탭 바 위에 표시
- [ ] `npm run build` 에러 0개 확인 후 완료 보고
