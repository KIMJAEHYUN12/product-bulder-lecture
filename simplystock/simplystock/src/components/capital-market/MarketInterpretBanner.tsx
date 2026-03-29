"use client";

import type { CapitalMarketData } from "@/types/capitalMarket";

interface Props {
  data: CapitalMarketData;
}

function interpret(data: CapitalMarketData): { color: string; text: string } {
  const kospi = data.stocks.find((s) => s.symbol === "^KS11");
  const corpBond = data.bonds.find((b) => b.code === "010300000");
  const govBond3 = data.bonds.find((b) => b.code === "010200000");
  const usdkrw = data.exchangeRates.find((r) => r.symbol === "KRW=X");
  const vix = data.globalIndicators?.find((g) => g.symbol === "^VIX");

  const signals: string[] = [];
  let score = 0;

  if (kospi && kospi.changePct > 0) {
    signals.push("KOSPI 상승");
    score += 1;
  } else if (kospi && kospi.changePct < -1) {
    signals.push("KOSPI 하락");
    score -= 1;
  }

  if (corpBond && govBond3) {
    const spread = corpBond.rate - govBond3.rate;
    if (spread < 0.8) {
      signals.push("신용스프레드 안정");
      score += 0.5;
    } else if (spread > 1.2) {
      signals.push("신용스프레드 확대");
      score -= 1;
    }
  }

  if (usdkrw && usdkrw.changePct >= 2) {
    signals.push("원화 약세");
    score -= 0.5;
  }

  if (vix) {
    if (vix.value >= 30) {
      signals.push("공포지수 경고");
      score -= 1;
    } else if (vix.value <= 20) {
      signals.push("공포지수 안정");
      score += 0.5;
    }
  }

  // 장단기 스프레드 역전 신호
  if (data.usTreasury) {
    if (data.usTreasury.inverted) {
      signals.push("미국 장단기 금리 역전");
      score -= 1;
    } else if (data.usTreasury.spread > 1.5) {
      signals.push("장단기 스프레드 정상");
      score += 0.5;
    }
  }

  // Fear & Greed 극단값 신호
  if (data.fearGreed) {
    if (data.fearGreed.value <= 20) {
      signals.push("Fear&Greed 극단적 공포");
      score -= 1;
    } else if (data.fearGreed.value >= 80) {
      signals.push("Fear&Greed 극단적 탐욕");
      score -= 0.5;
    } else if (data.fearGreed.value >= 55 && data.fearGreed.value <= 75) {
      signals.push("Fear&Greed 탐욕");
      score += 0.5;
    }
  }

  // 투자자 동향 신호
  if (data.investorTrend?.recent5Sum) {
    const { foreign, institution } = data.investorTrend.recent5Sum;
    if (foreign > 0 && institution > 0) {
      signals.push("외국인+기관 동반매수");
      score += 1;
    } else if (foreign < 0 && institution < 0) {
      signals.push("외국인+기관 동반매도");
      score -= 1;
    }
  }

  if (signals.length === 0) {
    return { color: "text-amber-400", text: "시장 데이터 수집 중..." };
  }

  if (score >= 1.5) {
    return { color: "text-emerald-400", text: signals.join(", ") + " — 건강한 흐름" };
  } else if (score <= -0.5) {
    return { color: "text-rose-400", text: signals.join(", ") + " — 주의 필요" };
  }
  return { color: "text-amber-400", text: signals.join(", ") + " — 혼조세" };
}

export function MarketInterpretBanner({ data }: Props) {
  const { color, text } = interpret(data);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3">
      <p className={`text-sm font-medium ${color}`}>{text}</p>
    </div>
  );
}
