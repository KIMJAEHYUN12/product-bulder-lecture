import { getKSTDateString } from "@/lib/kstDate";
import { EXP_ACTIVITIES, type ExpActivityType } from "@/lib/rpgExpConfig";

// ── localStorage 키 ──
const QUEUE_KEY = "ovision_exp_queue";
const CAPS_KEY = "ovision_exp_daily_caps";

// ── 큐 아이템 ──
export interface ExpQueueItem {
  type: ExpActivityType;
  exp: number;
  label: string;
  ts: number; // timestamp
}

// ── 일일 캡 상태 ──
interface DailyCaps {
  date: string; // YYYY-MM-DD (KST)
  counts: Partial<Record<ExpActivityType, number>>;
}

// ── 내부 유틸 ──
function loadQueue(): ExpQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: ExpQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function loadCaps(): DailyCaps {
  const today = getKSTDateString();
  if (typeof window === "undefined") return { date: today, counts: {} };
  try {
    const raw = localStorage.getItem(CAPS_KEY);
    if (raw) {
      const caps: DailyCaps = JSON.parse(raw);
      if (caps.date === today) return caps;
    }
  } catch { /* ignore */ }
  return { date: today, counts: {} };
}

function saveCaps(caps: DailyCaps) {
  localStorage.setItem(CAPS_KEY, JSON.stringify(caps));
}

/**
 * 활동 EXP 적립. 캡 체크 → 큐 추가 → CustomEvent 발사.
 * @returns 적립된 EXP (0이면 캡 도달)
 */
export function grantExp(type: ExpActivityType): number {
  if (typeof window === "undefined") return 0;

  const config = EXP_ACTIVITIES[type];
  if (!config) return 0;

  // 일일 캡 체크
  const caps = loadCaps();
  const count = caps.counts[type] ?? 0;
  if (config.dailyCap > 0 && count >= config.dailyCap) return 0;

  // 캡 카운트 증가
  caps.counts[type] = count + 1;
  saveCaps(caps);

  // 큐에 추가
  const item: ExpQueueItem = {
    type,
    exp: config.baseExp,
    label: config.label,
    ts: Date.now(),
  };
  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);

  // CustomEvent 발사 (ExpToast가 수신)
  window.dispatchEvent(
    new CustomEvent("ovision-exp-granted", {
      detail: { exp: config.baseExp, label: config.label },
    })
  );

  return config.baseExp;
}

/**
 * 큐 전체 반환 후 비움 (adventure 페이지에서 호출).
 */
export function drainExpQueue(): ExpQueueItem[] {
  if (typeof window === "undefined") return [];
  const queue = loadQueue();
  if (queue.length > 0) {
    localStorage.removeItem(QUEUE_KEY);
  }
  return queue;
}

/**
 * 동적 EXP 적립 (출석 보너스 등 가변 EXP용).
 * grantExp와 동일 로직이지만 baseExp 대신 인자로 받은 exp 사용.
 */
export function grantExpDynamic(
  type: ExpActivityType,
  exp: number,
  label?: string
): number {
  if (typeof window === "undefined") return 0;

  const config = EXP_ACTIVITIES[type];
  if (!config) return 0;

  // 일일 캡 체크
  const caps = loadCaps();
  const count = caps.counts[type] ?? 0;
  if (config.dailyCap > 0 && count >= config.dailyCap) return 0;

  caps.counts[type] = count + 1;
  saveCaps(caps);

  const item: ExpQueueItem = {
    type,
    exp,
    label: label ?? config.label,
    ts: Date.now(),
  };
  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);

  window.dispatchEvent(
    new CustomEvent("ovision-exp-granted", {
      detail: { exp, label: label ?? config.label },
    })
  );

  return exp;
}

/**
 * 레벨업 계산.
 * @param currentExp 현재 EXP
 * @param currentLevel 현재 레벨
 * @param addedExp 추가 EXP
 * @param expForLevelFn 레벨별 필요 EXP 함수
 */
export function applyExp(
  currentExp: number,
  currentLevel: number,
  addedExp: number,
  expForLevelFn: (level: number) => number
): { exp: number; level: number; leveledUp: boolean; levelsGained: number } {
  let exp = currentExp + addedExp;
  let level = currentLevel;
  let levelsGained = 0;

  while (exp >= expForLevelFn(level)) {
    exp -= expForLevelFn(level);
    level++;
    levelsGained++;
  }

  return {
    exp,
    level,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}
