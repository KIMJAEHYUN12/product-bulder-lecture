// 관리자 Firebase UID 목록
// 로그인 후 브라우저 콘솔에서 확인: firebase.auth().currentUser.uid
export const ADMIN_UIDS: string[] = [
  "zqyi38VH6vPN6HQNiOxEVBbxCg03",
];

export function isAdmin(uid: string | undefined | null): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}
