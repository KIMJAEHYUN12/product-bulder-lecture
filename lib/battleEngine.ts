import { RPG_CLASSES } from "@/lib/rpgConstants";
import { getKSTDateString } from "@/lib/kstDate";
import type {
  RpgClassKey,
  RpgStats,
  BattleOpponent,
  TurnType,
  TurnResult,
  BattleResult,
  BattleHistoryEntry,
} from "@/types";

// ── 유틸 ──

export function sumStats(s: RpgStats): number {
  return s.attack + s.defense + s.intelligence + s.stamina + s.luck;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── 상대 생성 ──

const OPPONENT_NAMES = [
  "워렌의 후예", "월가의 늑대", "동학개미", "차트의 마법사",
  "배당왕", "숏셀러", "퀀트봇", "다이아몬드핸드",
  "종이손", "김치프리미엄", "존버의 왕", "풀매수전사",
  "손절의 달인", "물타기장인", "셀온뉴스", "바이더딥",
];

export function generateOpponent(myLevel: number): BattleOpponent {
  const level = Math.max(1, myLevel + rand(-3, 3));
  const classKeys = Object.keys(RPG_CLASSES) as RpgClassKey[];
  const classKey = classKeys[rand(0, classKeys.length - 1)];
  const cls = RPG_CLASSES[classKey];

  const stats: RpgStats = { ...cls.baseStats };
  const statKeys: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const levelBonus = Math.floor(level * 0.5);
  for (let i = 0; i < levelBonus; i++) {
    stats[statKeys[rand(0, 4)]]++;
  }
  const equipBonus = Math.floor(level * 0.3);
  for (let i = 0; i < equipBonus; i++) {
    stats[statKeys[rand(0, 4)]]++;
  }

  return {
    class: classKey,
    className: cls.className,
    emoji: cls.emoji,
    nickname: OPPONENT_NAMES[rand(0, OPPONENT_NAMES.length - 1)],
    level,
    stats,
    combatPower: sumStats(stats),
  };
}

// ── 플레이버 텍스트 ──

const FLAVOR_TEXTS: Record<TurnType, { player: string[]; opponent: string[] }> = {
  attack: {
    player: ["날카로운 분석이 적중!", "매수 타이밍을 포착!", "공격적 포지션 진입!"],
    opponent: ["상대의 반격이 쏟아진다!", "매도 압력에 밀린다!", "숏 포지션에 당했다!"],
  },
  intelligence: {
    player: ["펀더멘털 분석 완료!", "리서치가 빛을 발한다!", "시장을 꿰뚫어 본다!"],
    opponent: ["상대의 통찰이 날카롭다!", "정보력에서 밀린다!"],
  },
  stamina: {
    player: ["끈기 있는 존버가 빛난다!", "체력으로 밀어붙인다!"],
    opponent: ["상대의 지구력이 대단하다!", "체력에서 밀리기 시작한다!"],
  },
  luck: {
    player: ["운이 따라준다!", "절묘한 타이밍!", "행운의 여신이 미소짓는다!"],
    opponent: ["상대에게 운이 따른다!", "불운한 타이밍이다!"],
  },
  final: {
    player: ["최종 결산에서 우위를 점한다!", "총합 전력으로 압도!"],
    opponent: ["상대의 종합 실력이 앞선다!", "최종 대결에서 밀린다!"],
  },
};

function pickFlavor(type: TurnType, isPlayerWinning: boolean): string {
  const pool = isPlayerWinning ? FLAVOR_TEXTS[type].player : FLAVOR_TEXTS[type].opponent;
  return pool[rand(0, pool.length - 1)];
}

// ── 배틀 시뮬레이션 ──

const TURN_CONFIG: { type: TurnType; label: string; pStat: keyof RpgStats; oStat: keyof RpgStats }[] = [
  { type: "attack", label: "공격전", pStat: "attack", oStat: "defense" },
  { type: "intelligence", label: "지능전", pStat: "intelligence", oStat: "intelligence" },
  { type: "stamina", label: "체력전", pStat: "stamina", oStat: "stamina" },
  { type: "luck", label: "운빨", pStat: "luck", oStat: "luck" },
  { type: "final", label: "최종 결산", pStat: "attack", oStat: "attack" },
];

export function simulateBattle(playerStats: RpgStats, opponent: BattleOpponent): BattleResult {
  const playerMaxHp = sumStats(playerStats) * 10;
  const opponentMaxHp = sumStats(opponent.stats) * 10;
  let playerHp = playerMaxHp;
  let opponentHp = opponentMaxHp;
  const turns: TurnResult[] = [];

  for (let i = 0; i < 5; i++) {
    const cfg = TURN_CONFIG[i];

    let pDmg = Math.max(1, playerStats[cfg.pStat] * 2 - opponent.stats[cfg.oStat] * 0.8 + rand(-2, 2));
    let pCrit = false;
    if (Math.random() * 100 < playerStats.luck * 5) {
      pDmg = Math.floor(pDmg * 1.5);
      pCrit = true;
    }
    pDmg = Math.floor(pDmg);

    let oDmg = Math.max(1, opponent.stats[cfg.pStat] * 2 - playerStats[cfg.oStat] * 0.8 + rand(-2, 2));
    let oCrit = false;
    if (Math.random() * 100 < opponent.stats.luck * 5) {
      oDmg = Math.floor(oDmg * 1.5);
      oCrit = true;
    }
    oDmg = Math.floor(oDmg);

    opponentHp = Math.max(0, opponentHp - pDmg);
    playerHp = Math.max(0, playerHp - oDmg);

    const isPlayerWinning = pDmg >= oDmg;

    turns.push({
      turn: i + 1,
      type: cfg.type,
      label: cfg.label,
      playerDmg: oDmg,
      opponentDmg: pDmg,
      playerHp,
      opponentHp,
      isCritical: pCrit || oCrit,
      flavorText: pickFlavor(cfg.type, isPlayerWinning),
    });

    if (playerHp <= 0 || opponentHp <= 0) break;
  }

  let winner: "player" | "opponent" | "draw";
  if (playerHp <= 0 && opponentHp <= 0) {
    winner = "draw";
  } else if (opponentHp <= 0) {
    winner = "player";
  } else if (playerHp <= 0) {
    winner = "opponent";
  } else {
    const pRatio = playerHp / playerMaxHp;
    const oRatio = opponentHp / opponentMaxHp;
    if (Math.abs(pRatio - oRatio) < 0.05) winner = "draw";
    else winner = pRatio > oRatio ? "player" : "opponent";
  }

  const expReward = winner === "player" ? 30 : winner === "draw" ? 20 : 10;
  const stoneReward = winner === "player" ? 2 : winner === "draw" ? 1 : 0;

  return { turns, winner, expReward, stoneReward };
}

// ── 일일 횟수 (localStorage) ──

const MAX_FREE = 3;

function getAttemptsKey(): string {
  return `ovision_battle_${getKSTDateString()}`;
}

export function getBattleAttempts(): { used: number; remaining: number } {
  if (typeof window === "undefined") return { used: 0, remaining: MAX_FREE };
  const used = parseInt(localStorage.getItem(getAttemptsKey()) || "0", 10);
  return { used, remaining: Math.max(0, MAX_FREE - used) };
}

export function consumeBattleAttempt(): boolean {
  const { remaining } = getBattleAttempts();
  if (remaining <= 0) return false;
  const key = getAttemptsKey();
  const used = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(used + 1));
  return true;
}

export function consumePaidBattleAttempt(): void {
  // 유료(투자석) 배틀은 횟수에 포함하지 않음
}

// ── 연승 관리 (localStorage) ──

const STREAK_KEY = "ovision_battle_streak";

export function getWinStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
}

export function updateWinStreak(isWin: boolean): { streak: number; bonusStones: number } {
  if (typeof window === "undefined") return { streak: 0, bonusStones: 0 };
  let streak = getWinStreak();
  if (isWin) {
    streak++;
  } else {
    streak = 0;
  }
  localStorage.setItem(STREAK_KEY, String(streak));
  const bonusStones = streak > 0 && streak % 3 === 0 ? 1 : 0;
  return { streak, bonusStones };
}

// ── 전적 히스토리 (localStorage, 최근 10개) ──

const HISTORY_KEY = "ovision_battle_history";

export function getBattleHistory(): BattleHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addBattleHistory(entry: BattleHistoryEntry): void {
  if (typeof window === "undefined") return;
  const history = getBattleHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}
