export function interpretPerPosition(pos: number): string {
  if (pos > 80) return '과거 10년 기준 "비싼 편"입니다';
  if (pos > 60) return '과거 10년 기준 "약간 비싼" 수준입니다';
  if (pos > 40) return '과거 10년 기준 "중간 정도" 가격입니다';
  if (pos > 20) return '과거 10년 기준 "저렴한 편"입니다';
  return '과거 10년 기준 "매우 저렴한" 구간입니다';
}

export function interpretRSI(rsi: number | null): string {
  if (rsi == null) return "데이터 부족";
  if (rsi > 70) return "과열 신호가 감지되고 있습니다";
  if (rsi > 60) return "약간 뜨거운 상태입니다";
  if (rsi > 40) return "과열도 과냉도 아닌 보통 상태입니다";
  if (rsi > 30) return "약간 차가운 상태입니다";
  return "과매도 신호가 감지되고 있습니다";
}

export function interpretForeignBuy(amount: number, streak: number): string {
  if (amount > 0 && streak >= 10) return "외국인이 꾸준히 사들이고 있습니다";
  if (amount > 0 && streak >= 5) return "외국인 매수세가 이어지고 있습니다";
  if (amount > 0) return "외국인이 최근 순매수로 전환했습니다";
  if (amount < 0 && Math.abs(streak) >= 10) return "외국인이 지속적으로 팔고 있습니다";
  if (amount < 0) return "외국인 매도세가 관찰됩니다";
  return "외국인 매매가 균형 상태입니다";
}

export function interpretMA(status: string): string {
  if (status === "정배열") return "단기 > 중기 > 장기 이동평균 순서 (상승 흐름)";
  if (status === "역배열") return "장기 > 중기 > 단기 이동평균 순서 (하락 흐름)";
  return "이동평균선이 혼조세를 보이고 있습니다";
}

export function interpretDiversification(score: number): string {
  if (score >= 70) return "여러 섹터에 걸쳐 잘 분산되어 있습니다";
  if (score >= 50) return "보통 수준의 분산 구조입니다";
  if (score >= 30) return "특정 섹터에 집중된 구조입니다";
  return "매우 집중된 포트폴리오 구조입니다";
}

export function formatVolume(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}
