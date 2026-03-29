# BattlePanel 빈 화면 버그 수정

> 배틀 몇 번 하면 페이지에 아무것도 안 나오는 버그.
> 아래 원인 분석과 수정 지점을 참고해서 수정하세요.

---

## 증상

배틀 3~4회 반복 후 "다시 배틀" 누르면 탭 영역이 완전히 빈 화면이 됨.
탭 바는 보이지만 콘텐츠 영역에 아무것도 렌더되지 않음.

---

## 원인 1 — `retry()`가 상태를 먼저 밀고 `startBattle()`이 실패하면 복구 불가

**파일**: `components/adventure/BattlePanel.tsx` 154~159행

```tsx
const retry = () => {
    setBattleResult(null);   // ← 먼저 null
    setOpponent(null);       // ← 먼저 null
    setStreakBonus(0);
    setAttempts(getBattleAttempts());
    startBattle();           // ← 여기서 early return하면 빈 화면
};
```

`startBattle`이 early return하는 조건:
- `attempts.remaining <= 0 && character.stones < 1` (무료 소진 + 투자석 부족)
- `consumeBattleAttempt()` 반환값 false (원인 2와 연결)

이 때 상태:
- `phase` = "result" (변경 안 됨)
- `battleResult` = null, `opponent` = null

렌더링 조건 (177행 부근):
```tsx
{phase === "result" && battleResult && opponent && (...)}
```
→ 조건 전부 false → AnimatePresence 안에 렌더되는 자식 없음 → **빈 화면**

---

## 원인 2 — `handleBattleComplete`에서 `setAttempts` 누락 → stale closure

**파일**: `components/adventure/BattlePanel.tsx` 95~151행

`handleBattleComplete`는 배틀 종료 후 보상을 처리하지만 `setAttempts(getBattleAttempts())`를 **호출하지 않는다**.

결과:
1. 배틀 1 시작 → `consumeBattleAttempt()` → localStorage: used=1
2. 배틀 1 끝 → `handleBattleComplete` → **setAttempts 안 함**
3. 배틀 2 retry → `startBattle`의 closure에 있는 `attempts`는 옛날 값
4. 3~4회 반복 후 → state의 `attempts.remaining > 0`이라 무료 경로 진입
5. 하지만 `consumeBattleAttempt()`가 localStorage에서 읽으면 remaining=0 → false 반환
6. early return → 원인 1 발동 → 빈 화면

---

## 수정 방법

### 수정 A — `startBattle` 실패 시 idle 복귀 (필수)

`startBattle` 함수 내부, early return 지점에 `setPhase("idle")` 추가:

```tsx
const startBattle = useCallback(() => {
    const isFree = attempts.remaining > 0;
    if (!isFree) {
      if (character.stones < 1) {
        setPhase("idle");  // ← 추가
        return;
      }
      consumePaidBattleAttempt();
      setCharacter({ ...character, stones: character.stones - 1 });
    } else {
      if (!consumeBattleAttempt()) {
        setPhase("idle");  // ← 추가
        return;
      }
    }
    // ... 나머지 동일
}, [attempts, character, totalStats, setCharacter]);
```

### 수정 B — `retry`에서 사전 체크 (필수)

`retry` 함수를 수정. 상태 초기화 전에 가능 여부 체크:

```tsx
const retry = () => {
    // 가능 여부 먼저 체크 (fresh하게 localStorage에서 읽기)
    const freshAttempts = getBattleAttempts();
    const canRetry = freshAttempts.remaining > 0 || character.stones >= 1;

    if (!canRetry) {
      // 배틀 불가 → idle로 복귀
      setBattleResult(null);
      setOpponent(null);
      setStreakBonus(0);
      setPhase("idle");
      setAttempts(freshAttempts);
      setHistory(getBattleHistory());
      return;
    }

    setBattleResult(null);
    setOpponent(null);
    setStreakBonus(0);
    setAttempts(freshAttempts);
    startBattle();
};
```

### 수정 C — `handleBattleComplete` 끝에 attempts 갱신 (필수)

`handleBattleComplete` 함수 마지막 부분에 추가:

```tsx
    // 히스토리 저장
    addBattleHistory(entry);
    setHistory(getBattleHistory());

    setAttempts(getBattleAttempts());  // ← 추가: stale attempts 방지

    setPhase("result");
```

---

## 수정 후 검증

1. 무료 3회 다 쓴 후 "다시 배틀" → idle로 돌아가는지 (빈 화면 아닌지)
2. 투자석 있을 때 유료 배틀 → 정상 동작
3. 투자석 0 + 무료 0 → "투자석 부족" 상태로 idle 표시
4. 연속 10회 이상 retry → 빈 화면 없는지
5. `npm run build` 에러 0개

---

## (보너스) GachaReveal 중복 호출 방지

`components/adventure/GachaReveal.tsx`에서 "탭해서 스킵" 버튼이 `onComplete`를 직접 호출하는데,
타이머가 아직 돌고 있어서 `onComplete`이 2번 호출될 수 있음.

수정: `completedRef` 추가

```tsx
const completedRef = useRef(false);

// onComplete 호출하는 모든 곳을:
if (!completedRef.current) {
    completedRef.current = true;
    onComplete();
}

// 스킵 버튼도 동일하게:
<button onClick={() => {
    if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
    }
}}>
```

이렇게 하면 히스토리 중복 저장도 방지됨.
