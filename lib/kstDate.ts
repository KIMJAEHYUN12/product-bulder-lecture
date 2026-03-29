/** KST(UTC+9) 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function getKSTDateString(date?: Date): string {
  const d = date ?? new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 어제 날짜 문자열 (YYYY-MM-DD) */
export function getKSTYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getKSTDateString(d);
}

/** KST 기준 ISO 주차 (2026-W09 형식) */
export function getKSTWeekId(date?: Date): string {
  const d = date ?? new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  // ISO week 계산
  const tmp = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** KST 기준 이번 주 월요일 날짜 (YYYY-MM-DD) */
export function getKSTMonday(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay() || 7; // 일요일=7
  kst.setUTCDate(kst.getUTCDate() - day + 1);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 이번 주 금요일 날짜 (YYYY-MM-DD) */
export function getKSTFriday(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay() || 7;
  kst.setUTCDate(kst.getUTCDate() - day + 5);
  return kst.toISOString().slice(0, 10);
}
