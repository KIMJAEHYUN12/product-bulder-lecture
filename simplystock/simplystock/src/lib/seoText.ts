export function getChannelComment(pct: number | null): string {
  if (pct === null) return "";
  if (pct <= -100) return "채널 하단을 크게 이탈한 상태로, 극단적 저평가 또는 추세 전환 구간입니다.";
  if (pct <= -50) return "채널 하단 아래에 위치하며, 의미 있는 반등 가능성을 주시할 구간입니다.";
  if (pct <= 0) return "채널 하단 근처로, 과매도 가능성이 있는 구간입니다.";
  if (pct <= 30) return "채널 하단과 중심 사이에 위치하며, 비교적 저평가 영역입니다.";
  if (pct <= 50) return "채널 중심부에 위치하며, 적정 가격대로 판단됩니다.";
  if (pct <= 70) return "채널 중심을 넘어 상단으로 향하고 있으며, 상승 추세 흐름입니다.";
  if (pct <= 90) return "채널 상단에 접근 중이며, 과매수 주의가 필요합니다.";
  return "채널 상단을 돌파한 강한 상승 구간으로, 추세 지속 여부를 확인해야 합니다.";
}

export function getChannelLabel(pct: number | null): string {
  if (pct === null) return "-";
  if (pct <= -50) return "하단 이탈";
  if (pct <= 0) return "하단";
  if (pct <= 30) return "하단~중심";
  if (pct <= 50) return "중심부";
  if (pct <= 70) return "중심~상단";
  if (pct <= 90) return "상단 근처";
  return "상단 돌파";
}

export function getPerComment(
  per: number | null,
  avgPer: number | null,
  position: number | null,
): string {
  if (per === null || position === null) return "";
  if (position <= 15) return `현재 PER ${per}배로, 과거 밴드 기준 최하위권입니다. 역사적 저평가 영역에 해당합니다.`;
  if (position <= 30) return `현재 PER ${per}배로, 과거 평균 대비 낮은 수준입니다. 저평가 가능성이 있습니다.`;
  if (position <= 50) return `현재 PER ${per}배로, 과거 평균 이하 구간에 위치합니다.`;
  if (position <= 70) return `현재 PER ${per}배로, 과거 평균 이상 구간입니다.`;
  if (position <= 85) return `현재 PER ${per}배로, 과거 밴드 상위권에 위치하며 고평가 가능성이 있습니다.`;
  return `현재 PER ${per}배로, 과거 밴드 기준 최상위권입니다. 역사적 고평가 영역에 해당합니다.`;
}

export function getSupplyComment(
  foreignNet: number | null,
  instNet: number | null,
): string {
  if (foreignNet === null && instNet === null) return "";
  const fBuy = (foreignNet ?? 0) > 0;
  const iBuy = (instNet ?? 0) > 0;
  if (fBuy && iBuy) return "최근 외국인과 기관이 동시에 순매수하고 있어, 수급 측면에서 긍정적 흐름입니다.";
  if (fBuy) return "외국인이 순매수 중이며, 기관은 매도 우위입니다.";
  if (iBuy) return "기관이 순매수 중이며, 외국인은 매도 우위입니다.";
  return "외국인과 기관 모두 매도 우위로, 수급 측면에서 보수적 접근이 필요합니다.";
}

export function formatKrw(value: number): string {
  return value.toLocaleString("ko-KR") + "원";
}

export function formatNetVolume(v: number | null): string {
  if (v === null) return "-";
  const abs = Math.abs(v);
  const sign = v >= 0 ? "+" : "";
  if (abs >= 100000000) return `${sign}${(v / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${(v / 10000).toFixed(0)}만`;
  return `${sign}${v.toLocaleString("ko-KR")}`;
}
