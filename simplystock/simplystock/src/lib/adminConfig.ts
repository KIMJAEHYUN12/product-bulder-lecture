// 관리자 Firebase UID 목록
export const ADMIN_UIDS: string[] = [
  "zqyi38VH6vPN6HQNiOxEVBbxCg03",
];

export function isAdmin(uid: string | undefined | null): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}
