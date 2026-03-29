# 친구 초대 딥링크 전환 스펙

> 기존 "코드 복사 → 수동 입력" 방식을 **딥링크(URL 파라미터) 자동 매칭** 방식으로 전환.
> 백엔드(Firestore, inviteApi)는 그대로 재사용. UI와 흐름만 수정.

---

## 개요

**기존**: 공유자가 6자리 코드 복사 → 받는 사람이 코드 입력란에 수동 입력
**변경**: 공유자가 링크 공유 → 받는 사람이 링크 클릭만 하면 자동 매칭

---

## 수정 파일 목록

```
[수정] app/page.tsx                        — ?ref= 파라미터 자동 캡처
[수정] components/InviteCodeSection.tsx     — UI 전면 교체 (입력란 제거, 공유 버튼 추가)
[수정] hooks/useInviteCode.ts              — copyCode → shareLink로 변경, 보상 지급 추가
[수정] lib/inviteApi.ts                    — activateInvite (보상 지급) 함수 추가
```

신규 파일 없음. 기존 파일만 수정.

---

## 1. URL 파라미터 자동 캡처 (`app/page.tsx`)

기존에 이미 `?mode=` 파라미터를 파싱하는 useEffect가 있음 (54~59행 부근).
여기에 `?ref=` 처리를 추가.

```tsx
// 기존 mode 파라미터 처리 useEffect에 추가
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  // 기존 mode 처리
  const modeParam = params.get("mode");
  if (modeParam === "makalong") setMode("makalong");

  // ★ 추가: ref 파라미터 캡처
  const ref = params.get("ref");
  if (ref && ref.length === 6) {
    const existing = localStorage.getItem("ovision_pending_invite");
    if (!existing) {
      // 최초 방문 시만 저장 (중복 방지)
      localStorage.setItem("ovision_pending_invite", ref.toUpperCase());
    }
    // URL에서 ref 파라미터 제거 (깔끔하게)
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.pathname + url.search);
  }
}, []);
```

이렇게 하면:
- 누군가 `?ref=ABC123` 링크로 접속
- localStorage에 `ovision_pending_invite = "ABC123"` 저장
- URL에서 `?ref=` 제거 (뒤로가기 시 중복 방지)
- 기존 `useInviteCode` 훅이 로그인 시 `ovision_pending_invite` 자동 처리 (이미 구현돼 있음)

---

## 2. InviteCodeSection UI 전면 교체

### 기존 (제거할 것)
- 6자리 코드 텍스트 표시 + 복사 버튼
- 코드 입력란 + 등록 버튼

### 새 UI

```
┌─────────────────────────────────────┐
│  친구 초대                           │
│  친구를 초대하면 둘 다 투자석 3개!    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  내 초대 링크                │    │
│  │  [ 🔗 링크 공유하기 ]        │    │  메인 버튼 (indigo-600)
│  │                              │    │
│  │  [카카오] [복사] [공유]      │    │  보조 버튼 3개 (아이콘만, 작게)
│  └─────────────────────────────┘    │
│                                      │
│  3명 초대 완료                       │  text-[10px] text-gray-500
│                                      │
│  ── 초대코드가 있나요? ──            │  접이식 (기존 사용자 호환)
│  [______] [등록]                     │  기존 입력란 (축소/접힘)
└─────────────────────────────────────┘
```

### 구체적 스펙

**메인 공유 버튼:**
```
w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold
텍스트: "링크 공유하기"
```
클릭 시 동작:
1. 내 코드가 없으면 → 자동 생성 (`generateCode`)
2. `navigator.share()` 호출 (모바일 네이티브 공유시트)
3. `navigator.share` 미지원 시 → 링크 클립보드 복사 + "복사됨" 피드백

**공유 URL 형식:**
```
https://bitgak.co.kr/?ref={MY_CODE}
```

**공유 메시지:**
```
title: "투자 모험 같이 해볼래?"
text: "지금 시작하면 둘 다 투자석 3개! 투자 RPG, 모의투자, 차트분석까지"
url: https://bitgak.co.kr/?ref={MY_CODE}
```

**보조 버튼 3개** (메인 버튼 아래, 가로 배열):

| 버튼 | 동작 |
|------|------|
| 카카오 | `kakaoShareFeed()` 호출 — 기존 `lib/kakaoShare.ts` 재사용. OG 이미지 + 초대 링크 |
| 복사 | 링크 텍스트만 클립보드 복사 |
| 공유 | `navigator.share()` (모바일만 표시, 데스크탑에선 숨김) |

보조 버튼 스타일:
```
w-10 h-10 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center
아이콘: text-sm (이모지 또는 SVG)
카카오: 💬, 복사: 📋, 공유: ↗
```

**접이식 코드 입력** (기존 사용자 호환):
- 기본 접힘 상태
- "초대코드가 있나요?" 텍스트 클릭 시 펼침
- 기존 input + 등록 버튼 그대로 유지
- `text-[10px] text-gray-500` 톤으로 눈에 안 띄게

**비로그인 상태:**
- 공유 버튼 대신: "로그인하면 초대 링크를 만들 수 있어요" 안내
- 코드 입력란은 그대로 표시 (비로그인도 pending 저장 가능)

---

## 3. useInviteCode 훅 수정

### 추가할 함수: `shareLink`

```tsx
const shareLink = useCallback(async () => {
  if (!user) return;

  // 코드 없으면 자동 생성
  let code = myCode;
  if (!code) {
    const result = await getOrCreateInviteCode(user.uid, user.displayName || "익명");
    code = result.code;
    setMyCode(code);
    setInviteCount(result.usedCount);
  }

  const url = `https://bitgak.co.kr/?ref=${code}`;
  const shareData = {
    title: "투자 모험 같이 해볼래?",
    text: "지금 시작하면 둘 다 투자석 3개!",
    url,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(url);
      setMessage({ text: "링크가 복사되었습니다", ok: true });
      setTimeout(() => setMessage(null), 3000);
    }
  } catch {
    // 사용자가 공유시트 취소한 경우 무시
  }
}, [user, myCode]);
```

### 추가할 함수: `shareKakao`

```tsx
const shareKakao = useCallback(async () => {
  if (!user) return;

  let code = myCode;
  if (!code) {
    const result = await getOrCreateInviteCode(user.uid, user.displayName || "익명");
    code = result.code;
    setMyCode(code);
  }

  const url = `https://bitgak.co.kr/?ref=${code}`;

  // 기존 kakaoShareFeed 패턴 활용
  // kakaoShareFeed는 lib/kakaoShare.ts에 있음
  const { kakaoShareFeed } = await import("@/lib/kakaoShare");
  kakaoShareFeed({
    title: "투자 모험 같이 해볼래?",
    description: "지금 시작하면 둘 다 투자석 3개! 투자 RPG, 모의투자, 차트분석까지",
    imageUrl: "https://bitgak.co.kr/og-image.png",
    linkUrl: url,
  });
}, [user, myCode]);
```

### 추가할 함수: `copyLink`

```tsx
const copyLink = useCallback(async () => {
  if (!user) return;

  let code = myCode;
  if (!code) {
    const result = await getOrCreateInviteCode(user.uid, user.displayName || "익명");
    code = result.code;
    setMyCode(code);
  }

  const url = `https://bitgak.co.kr/?ref=${code}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  setCodeCopied(true);
  setTimeout(() => setCodeCopied(false), 2000);
}, [user, myCode]);
```

### return 변경

```tsx
return {
  myCode,
  inviteCount,
  loading,
  codeCopied,
  message,
  generateCode,
  copyCode,      // 기존 유지 (코드 텍스트만 복사 — 접이식 영역에서 사용)
  copyLink,      // ★ 추가 (URL 복사)
  shareLink,     // ★ 추가 (네이티브 공유)
  shareKakao,    // ★ 추가 (카카오)
  submitCode,    // 기존 유지 (접이식 입력란에서 사용)
};
```

---

## 4. 보상 지급 (`lib/inviteApi.ts`)

현재 `registerInvite`는 `invite_records`에 `rewardGranted: false`만 저장하고 실제 보상을 주지 않음.

### 추가 함수: `activateInvite`

초대받은 사용자가 캐릭터 생성 완료 시 호출. 양쪽에 보상 지급.

```tsx
import { updateDoc, increment } from "firebase/firestore";

export async function activateInvite(
  inviteeId: string
): Promise<{ activated: boolean; inviterCode: string | null }> {
  const recordRef = doc(db, "invite_records", inviteeId);
  const recordSnap = await getDoc(recordRef);

  if (!recordSnap.exists()) return { activated: false, inviterCode: null };

  const record = recordSnap.data();
  if (record.activated) return { activated: false, inviterCode: null };

  // 활성화 + 보상 지급 표시
  await updateDoc(recordRef, {
    activated: true,
    rewardGranted: true,
  });

  // 초대자의 usedCount 증가
  const codeRef = doc(db, "invite_codes", record.inviterCode);
  await updateDoc(codeRef, {
    usedCount: increment(1),
  });

  return { activated: true, inviterCode: record.inviterCode };
}
```

### 호출 시점

`hooks/useRpgCharacter.ts`의 `createCharacter` 완료 후, 또는 `app/adventure/page.tsx`에서 캐릭터 생성 직후:

```tsx
// 캐릭터 생성 후
const newChar = createCharacter(classKey, nickname);

// 초대 보상 처리
if (user) {
  activateInvite(user.uid).then((result) => {
    if (result.activated) {
      // 받는 사람 보상: 투자석 3개
      setCharacter({ ...newChar, stones: newChar.stones + 3 });
      // 초대자 보상은 invite_reward EXP (Firestore에 기록됨, 초대자가 다음 접속 시 확인)
      grantExp("invite_reward");
    }
  });
}
```

**보상 내역:**
- 받는 사람: 투자석 +3 (캐릭터 생성 시 즉시)
- 공유자: EXP 50 + 투자석 +3 (다음 접속 시 EXP 큐에서 수령)

공유자의 투자석 지급은 클라이언트에서 직접 줄 수 없음 (다른 유저의 캐릭터 데이터).
→ **Firebase Function으로 처리하거나, 공유자의 다음 adventure 페이지 접속 시 invite_records를 체크해서 지급**.

간단한 방법: `activateInvite`에서 Firestore에 `invite_rewards/{inviterId}` 문서에 `pendingStones: increment(3)` 기록.
공유자가 adventure 진입 시 이 문서를 읽고 투자석 추가 후 삭제.

```tsx
// activateInvite 안에 추가
const rewardRef = doc(db, "invite_rewards", record.inviterId);
const rewardSnap = await getDoc(rewardRef);
if (rewardSnap.exists()) {
  await updateDoc(rewardRef, { pendingStones: increment(3) });
} else {
  await setDoc(rewardRef, { pendingStones: 3 });
}
```

```
// firestore.rules에 추가
match /invite_rewards/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null;
}
```

`app/adventure/page.tsx` EXP 큐 처리 부분에 추가:
```tsx
// 기존 EXP 큐 처리 후
if (user) {
  const rewardRef = doc(db, "invite_rewards", user.uid);
  const rewardSnap = await getDoc(rewardRef);
  if (rewardSnap.exists()) {
    const pending = rewardSnap.data().pendingStones ?? 0;
    if (pending > 0) {
      setCharacter({ ...character, stones: character.stones + pending });
      await deleteDoc(rewardRef);
    }
  }
}
```

---

## 5. kakaoShareFeed 호출 형태 확인

기존 `lib/kakaoShare.ts`의 `kakaoShareFeed` 함수 시그니처를 확인하고,
위 스펙의 호출 형태와 맞춰야 함. 인자 형태가 다르면 래퍼 함수 작성.

현재 `kakaoShareFeed`가 `{ title, description, imageUrl, linkUrl }` 형태를 받는지 확인 필요.
만약 다르면 호환 래퍼를 만들거나, 직접 `window.Kakao.Share.sendDefault` 호출.

---

## 6. 체크리스트

- [ ] `?ref=ABC123` 링크로 접속 시 localStorage에 코드 저장되는지
- [ ] URL에서 `?ref=` 파라미터가 자동 제거되는지
- [ ] 공유 버튼 클릭 → 코드 자동 생성 + 공유시트 열리는지
- [ ] 카카오 공유 → OG 이미지 + 링크 포함되는지
- [ ] 링크 복사 → 클립보드에 `?ref=` 포함된 URL 복사되는지
- [ ] 비로그인 유저가 ref 링크로 접속 → 로그인 후 자동 매칭
- [ ] 캐릭터 생성 시 초대 보상 양쪽 지급
- [ ] 자기 코드로 자기 초대 불가
- [ ] 이미 초대받은 유저 중복 등록 불가
- [ ] 접이식 코드 입력란 동작 (기존 호환)
- [ ] `npm run build` 에러 0개
