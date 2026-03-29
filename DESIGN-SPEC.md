# DESIGN-SPEC.md — Ovision 고급화 리팩토링 명세

> 이 문서는 디자이너 Claude가 작성한 시각 디자인 개선 명세입니다.
> 구조/레이아웃 변경 없음. 기존 뼈대 유지하면서 디테일만 수정합니다.
> 작업 완료 후 이 파일을 삭제하세요.

---

## 1. 폰트 변경

### 적용 폰트
- **한글/본문**: Wanted Sans (무료, Google Fonts 없음 → CDN 직접)
  - CDN: `https://cdn.jsdelivr.net/gh/niceplugin/NPS@v1.0.1/fonts/wantedsans/WantedSans-Variable.min.css`
  - 또는 공식: `https://cdn.wanted.co.kr/wanted-sans/v1.0/WantedSans-Variable.min.css`
- **숫자/영문**: Plus Jakarta Sans (Google Fonts)
  - `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap`

### 수정 파일

#### `app/layout.tsx`
- 기존 Pretendard CDN link 제거
- 위 두 폰트 CDN link 추가

#### `tailwind.config.ts`
```ts
fontFamily: {
  sans: ['"Plus Jakarta Sans"', '"Wanted Sans"', 'system-ui', 'sans-serif'],
}
```
- Plus Jakarta Sans가 먼저 → 영문/숫자에 적용
- Wanted Sans가 fallback → 한글에 적용 (Plus Jakarta Sans에 한글 없으므로)

#### `app/globals.css`
```css
body {
  font-family: "Plus Jakarta Sans", "Wanted Sans", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 타이포그래피 규칙
- **제목 (페이지 타이틀, 섹션 헤더)**: `font-light tracking-wide` (300 weight + letter-spacing 0.02em)
- **본문/데이터**: `font-medium` (500 weight)
- **숫자 (가격, 수익률 등)**: `tabular-nums` 추가 (숫자 정렬)
- **캡션/부가정보**: `font-normal text-zinc-500` (400 weight)

#### globals.css에 유틸 클래스 추가
```css
.text-display {
  font-weight: 300;
  letter-spacing: 0.02em;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

### 임의 폰트 사이즈 정리
아래 패턴을 찾아서 교체:
- `text-[9px]` → `text-[10px]` (최소 사이즈를 10px로 통일)
- `text-[11px]` → `text-xs` (12px)
- 사이즈는 4단계만 사용: `text-2xl`(제목) / `text-base`(본문) / `text-sm`(서브) / `text-xs`(캡션)

---

## 2. 글래스 카드 조정

### 수정 파일: `app/globals.css`

#### `.glass-card` 다크모드 수정
```css
/* 변경 전 */
.dark .glass-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

/* 변경 후 */
.dark .glass-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(16px);
}
```

#### 라이트모드는 유지 (현재 값 괜찮음)

---

## 3. 글로우/그라데이션 제거

### 원칙
- `shadow-[0_0_Xpx_rgba(...)]` 형태의 글로우 이펙트 → 전부 제거 또는 `shadow-lg`로 교체
- 버튼의 `bg-gradient-to-r` → 솔리드 단색으로 교체
- 배경 gradient orb (있다면) → opacity 50%로 줄이거나 제거

### 구체적 수정 대상
아래 패턴을 전체 검색해서 수정:

1. **글로우 섀도우 제거**
   - 검색: `shadow-[0_0_`
   - 처리: 삭제하거나 `shadow-md` 또는 `shadow-lg`로 대체
   - 예외: 주식 등락 표시에 미세한 글로우가 있다면 유지 가능

2. **버튼 그라데이션 → 솔리드**
   - 검색: `bg-gradient-to-r`, `from-`, `to-`가 버튼에 적용된 경우
   - 처리: `bg-indigo-600 hover:bg-indigo-500` 솔리드로 교체
   - 예외: 공포탐욕 게이지의 그라데이션은 데이터 시각화이므로 유지

3. **배경 장식 orb**
   - 검색: `absolute`, `rounded-full`, `blur-` 조합
   - 처리: opacity를 현재의 절반으로 줄이기. 예) `opacity-20` → `opacity-10`

---

## 4. 여백/간격 조정

### 전역 패딩 업
아래 패턴을 **glass-card 내부**에 적용된 경우에만 수정:
- `p-4` → `p-5` (카드 내부 패딩)
- `gap-4` → `gap-5` (카드 간 간격, 그리드/플렉스에 적용된 경우)

### 주의사항
- 네비게이션 버튼, 탭 버튼의 `p-2`, `p-3`은 건드리지 않음
- `px-4` (모바일 외부 여백)는 건드리지 않음
- 모달 내부는 `p-5` 또는 `p-6`으로 통일

---

## 5. 마이크로 디테일

### 카드 라운딩
- `rounded-xl` → `rounded-2xl` (glass-card에 적용된 경우)
- globals.css의 `.glass-card`에서 `border-radius` 값을 `1rem`(16px)으로 수정

### 트랜지션 속도
- `duration-200` → `duration-300` (호버 트랜지션)
- `transition-colors` → `transition-all duration-300 ease-out`

### 텍스트 색상 계층 (다크모드 기준)
- 제목/강조: `text-white`
- 본문/데이터: `text-zinc-300` (기존 `text-gray-300` → zinc로 통일)
- 부가/캡션: `text-zinc-500` (기존 `text-gray-500` → zinc로 통일)
- 비활성: `text-zinc-600`

### 구분선
- `border-white/10` → `border-white/[0.06]` (더 은은하게)
- 또는 `border-zinc-800`

---

## 6. 작업 순서 (권장)

1. 폰트 교체 (layout.tsx, tailwind.config.ts, globals.css)
2. globals.css의 glass-card 수정
3. 글로우/그라데이션 제거 (전체 검색 → 일괄 수정)
4. 여백/간격 조정
5. 마이크로 디테일 (라운딩, 트랜지션, 텍스트 색상)
6. `npm run build` 검증

---

## 7. 건드리지 않는 것

- 레이아웃 구조 (그리드 컬럼 수, 페이지 구성)
- 컴포넌트 기능/로직
- API 연동
- 모바일 반응형 브레이크포인트
- 공포탐욕 게이지 그라데이션 (데이터 시각화)
- 주식 등락 색상 (green/red 유지)
