import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import type { InviteCode, InviteRecord } from "@/types/social";

// I,O,0,1 제외 영숫자
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function getOrCreateInviteCode(
  userId: string,
  nickname: string
): Promise<InviteCode> {
  // 이미 생성된 코드가 있는지 확인
  const q = query(
    collection(db, "invite_codes"),
    where("ownerId", "==", userId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0].data();
    return {
      code: snap.docs[0].id,
      ownerId: d.ownerId,
      ownerNickname: d.ownerNickname,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? "",
      usedCount: d.usedCount ?? 0,
    };
  }

  // 새 코드 생성 (충돌 방지: 최대 5회 시도)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = doc(db, "invite_codes", code);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: userId,
        ownerNickname: nickname,
        createdAt: serverTimestamp(),
        usedCount: 0,
      });
      return {
        code,
        ownerId: userId,
        ownerNickname: nickname,
        createdAt: new Date().toISOString(),
        usedCount: 0,
      };
    }
  }
  throw new Error("코드 생성에 실패했습니다. 다시 시도해주세요.");
}

export async function lookupInviteCode(
  code: string
): Promise<InviteCode | null> {
  const ref = doc(db, "invite_codes", code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    code: snap.id,
    ownerId: d.ownerId,
    ownerNickname: d.ownerNickname,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? "",
    usedCount: d.usedCount ?? 0,
  };
}

export async function registerInvite(
  newUserId: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const upperCode = code.toUpperCase();

  // 이미 초대받은 사용자인지 확인
  const recordRef = doc(db, "invite_records", newUserId);
  const existing = await getDoc(recordRef);
  if (existing.exists()) {
    return { success: false, message: "이미 초대코드를 사용했습니다" };
  }

  // 코드 유효성 확인
  const inviteCode = await lookupInviteCode(upperCode);
  if (!inviteCode) {
    return { success: false, message: "존재하지 않는 초대코드입니다" };
  }

  // 자기 초대 방지
  if (inviteCode.ownerId === newUserId) {
    return { success: false, message: "자신의 초대코드는 사용할 수 없습니다" };
  }

  // 초대 기록 생성
  await setDoc(recordRef, {
    inviteeId: newUserId,
    inviterCode: upperCode,
    inviterId: inviteCode.ownerId,
    activated: false,
    rewardGranted: false,
    createdAt: serverTimestamp(),
  });

  return { success: true, message: `${inviteCode.ownerNickname}님의 초대를 받았습니다!` };
}

export async function getInviteStats(
  userId: string
): Promise<{ code: string | null; count: number }> {
  // 내 코드 조회
  const q = query(
    collection(db, "invite_codes"),
    where("ownerId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return { code: null, count: 0 };

  const d = snap.docs[0].data();
  return {
    code: snap.docs[0].id,
    count: d.usedCount ?? 0,
  };
}

/** 캐릭터 생성 시 호출 — 초대 활성화 + 보상 적립 */
export async function activateInvite(inviteeId: string): Promise<number> {
  const recordRef = doc(db, "invite_records", inviteeId);
  const snap = await getDoc(recordRef);
  if (!snap.exists()) return 0;

  const data = snap.data();
  if (data.activated) return 0; // 이미 활성화됨

  const inviterId: string = data.inviterId;
  const inviterCode: string = data.inviterCode;

  // 초대 기록 활성화
  await setDoc(recordRef, { activated: true, rewardGranted: true }, { merge: true });

  // 초대코드 usedCount 증가
  const codeRef = doc(db, "invite_codes", inviterCode);
  await setDoc(codeRef, { usedCount: increment(1) }, { merge: true });

  // 공유자에게 pending stones 적립
  const rewardRef = doc(db, "invite_rewards", inviterId);
  await setDoc(rewardRef, { pendingStones: increment(3) }, { merge: true });

  return 3; // 받는 사람에게 줄 stones
}

/** adventure 진입 시 호출 — 공유자 보상 수령 */
export async function claimInviteRewards(userId: string): Promise<number> {
  const rewardRef = doc(db, "invite_rewards", userId);
  const snap = await getDoc(rewardRef);
  if (!snap.exists()) return 0;

  const stones = snap.data().pendingStones ?? 0;
  if (stones <= 0) return 0;

  await deleteDoc(rewardRef);
  return stones;
}

// 타입 export (InviteRecord 사용처 지원)
export type { InviteCode, InviteRecord };
