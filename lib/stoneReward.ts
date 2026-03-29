import { getKSTDateString } from "@/lib/kstDate";

// ── localStorage 키 ──
const QUEUE_KEY = "ovision_stone_queue";
const QUIZ_CLAIMED_KEY = "ovision_quiz_stone_claimed";

// ── 큐 아이템 ──
interface StoneQueueItem {
  amount: number;
  label: string;
  ts: number;
}

// ── 내부 유틸 ──
function loadQueue(): StoneQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: StoneQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * 투자석 큐에 추가 + CustomEvent 발사 (토스트용).
 */
export function queueStone(amount: number, label: string) {
  if (typeof window === "undefined") return;
  const queue = loadQueue();
  queue.push({ amount, label, ts: Date.now() });
  saveQueue(queue);

  window.dispatchEvent(
    new CustomEvent("ovision-stone-granted", {
      detail: { amount, label },
    })
  );
}

/**
 * 큐 합산 반환 후 비움 (adventure 페이지에서 호출).
 */
export function drainStoneQueue(): number {
  if (typeof window === "undefined") return 0;
  const queue = loadQueue();
  if (queue.length === 0) return 0;
  localStorage.removeItem(QUEUE_KEY);
  return queue.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * 퀴즈 투자석 수령 (영구 1회).
 */
export function claimQuizStone(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(QUIZ_CLAIMED_KEY)) return false;
  localStorage.setItem(QUIZ_CLAIMED_KEY, "1");
  queueStone(1, "투자성향 퀴즈 완료");
  return true;
}

/**
 * 모의투자 수익률 투자석 (KST 일 1회).
 */
export function claimMockDailyStone(): boolean {
  if (typeof window === "undefined") return false;
  const today = getKSTDateString();
  const key = `ovision_mock_stone_${today}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, "1");
  queueStone(1, "모의투자 수익률 +5%");
  return true;
}

/**
 * 차트게임 연승 투자석 (KST 일 1회).
 */
export function claimChartStreakStone(): boolean {
  if (typeof window === "undefined") return false;
  const today = getKSTDateString();
  const key = `ovision_chart_streak_stone_${today}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, "1");
  queueStone(1, "차트게임 5연승");
  return true;
}
