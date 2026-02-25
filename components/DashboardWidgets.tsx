"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Zap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Sector } from "@/types";
import type { FearGreedData, EconEvent, CommodityItem } from "@/hooks/useMarketData";

// ─── Data ────────────────────────────────────────────────────────────────────

const NEWS_ITEMS = [
  "🔴 삼성전자 HBM4 엔비디아 퀄 테스트 진행 중 · 3Q26 공급 가시화",
  "⚡ 효성중공업 미국 변압기 수주잔고 3.2조 돌파 · 신규 팩토리 증설 확정",
  "🧬 삼성바이오로직스 5공장 가동률 40%→65% 상향 조정",
  "🚗 현대차 울산 EV 전용라인 3조 투자 확정 · 2027년 양산",
  "💾 SK하이닉스 HBM3E 16단 GB200 NVL72 공급 단가 타결",
  "🔋 LG에너지솔루션 오하이오 2공장 가동률 50% 하향 · GM 발주 감소",
  "🧠 네이버 하이퍼클로바X B2B 계약 23건 신규 수주 · 공공 부문 확대",
  "⚙️ 현대모비스 자율주행 레벨3 센서퓨전 모듈 독점 납품 확정",
  "🔋 포스코퓨처엠 양극재 수주잔고 8.7조 · 2026 가이던스 유지",
  "🔌 두산에너빌리티 체코 원전 수주 최종 협상 진입 · 수주액 24조 추정",
  "💊 셀트리온 자가면역 바이오시밀러 미국 FDA 승인 · 연 매출 5,000억 전망",
  "🔧 LS일렉트릭 미국 데이터센터향 배전반 수주 급증 · 북미 법인 증설",
];

function calcFearGreed(): number {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  return (((seed * 9301 + 49297) % 233280) / 233280) * 70 + 15;
}

interface FGInfo {
  label: string;
  color: string;
  emoji: string;
}
function fgInfo(v: number): FGInfo {
  if (v <= 25) return { label: "극단적 공포", color: "#ef4444", emoji: "😱" };
  if (v <= 45) return { label: "공포", color: "#f97316", emoji: "😨" };
  if (v <= 55) return { label: "중립", color: "#eab308", emoji: "😐" };
  if (v <= 75) return { label: "탐욕", color: "#22c55e", emoji: "😏" };
  return { label: "극단적 탐욕", color: "#10b981", emoji: "🤑" };
}

// 더미 제거 — 실제 일정은 서버(functions/index.js)에서 BOK·Fed·통계청 공식 기준으로 반환

const INDUSTRY_CHECKLISTS: Record<string, string[]> = {
  이차전지: [
    "분리막 수율 92% 이상?",
    "고객사 장기공급계약 체결?",
    "전해질 배합 독자 특허 보유?",
    "LFP 전환 대응 전략 있음?",
    "CATL 대비 원가 10%↓ 달성?",
  ],
  반도체: [
    "HBM 생산능력 로드맵 확보?",
    "EUV 장비 대기 12개월 대응?",
    "선단공정 3nm 이하 진입?",
    "고객사 집중도 Top1 < 30%?",
    "재고조정 사이클 저점 통과?",
  ],
  전력: [
    "수주잔고 소화 2년 이상?",
    "HVDC 국산화 부품 67%↑?",
    "미국 IRA 세액공제 수혜?",
    "규소강판 수급 계약 확보?",
    "신규 수주 모멘텀 지속?",
  ],
  AI: [
    "실제 MRR 전환 매출 검증?",
    "GPU TCO 대비 서비스 마진?",
    "고객 락인(Lock-in) 구조?",
    "오픈소스 대체 리스크 검토?",
    "B2B 계약 ASP 상승 추세?",
  ],
  바이오: [
    "임상 3상 설계 엄밀성?",
    "FDA/EMA 허가 전략 명확?",
    "기술이전 마일스톤 구조?",
    "현금 런웨이 18개월 이상?",
    "CMO 생산능력 사전 확보?",
  ],
  자동차: [
    "BEV 전용 플랫폼 비중?",
    "ADAS 레벨3 양산 일정?",
    "현대·기아 공급망 의존도?",
    "연 2~5% 단가 인하 대응?",
    "소프트웨어 내재화율 목표?",
  ],
  혼합: [
    "섹터 간 상관관계 낮음?",
    "각 섹터 대표 종목 선별?",
    "경기 민감도 분산 확인?",
    "환율 노출 헤지 전략?",
    "리밸런싱 주기 설정?",
  ],
  기타: [
    "비즈니스 모델 이해?",
    "경쟁자 대비 해자(Moat)?",
    "창업자/경영진 트랙레코드?",
    "현금흐름 흑자 전환 시점?",
    "적정 밸류에이션 근거?",
  ],
};

const DAILY_QUOTES = [
  {
    quote: "차트는 과거다. 공장 가동률이 미래다.",
    sub: "수율 90% 못 넘으면 주가도 없어요.",
  },
  {
    quote: "PER 30이 싸다고요? 이익이 나야 PER이죠.",
    sub: "성장주 프리미엄은 성장할 때만 유효합니다.",
  },
  {
    quote: "테마주는 올라갈 때 팔아야 테마주입니다.",
    sub: "고점에서 물리면 그냥 주식이에요.",
  },
  {
    quote: "분기 실적 발표 전날 사면 안 됩니다.",
    sub: "살 거면 3일 전. 발표 당일은 이미 늦었어요.",
  },
  {
    quote: "IR 자료의 '글로벌 1위'는 해당 분기 한정입니다.",
    sub: "지속가능성을 먼저 보세요.",
  },
  {
    quote: "공장 짓는다고 주가 오르는 건 2021년에 끝났어요.",
    sub: "수주 → 매출 → 이익 흐름을 보세요.",
  },
  {
    quote: "외인 순매수 3일 이상 지속 시 진입을 검토하세요.",
    sub: "하루짜리 순매수는 노이즈입니다.",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

/** 상단 뉴스 롤링 티커 */
export function NewsTicker({ news, isLoading }: { news?: string[]; isLoading?: boolean }) {
  const items = news && news.length > 0 ? news : NEWS_ITEMS;
  const displayItems = [...items, ...items]; // seamless loop

  return (
    <div className="overflow-hidden bg-black/50 border-b border-white/10 py-2 px-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold shrink-0 border px-2 py-0.5 rounded font-mono transition-colors ${
          isLoading
            ? "text-gray-500 border-gray-700"
            : news && news.length > 0
            ? "text-green-400 border-green-500/50"
            : "text-red-400 border-red-500/50"
        }`}>
          {isLoading ? "..." : news && news.length > 0 ? "LIVE" : "DEMO"}
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker">
            {displayItems.map((item, i) => (
              <span key={i} className="text-sm text-gray-300 shrink-0 mr-10">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 파일 업로드 전 오늘의 명언 */
export function DailyQuote() {
  const quote = useMemo(() => {
    const idx = new Date().getDate() % DAILY_QUOTES.length;
    return DAILY_QUOTES[idx];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 text-center"
    >
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <Zap size={12} className="text-kim-gold" />
        <p className="text-xs text-kim-gold uppercase tracking-widest font-mono">
          공장장 킴의 오늘의 훈수
        </p>
        <Zap size={12} className="text-kim-gold" />
      </div>
      <p className="text-lg font-bold text-white leading-snug mb-2">
        &ldquo;{quote.quote}&rdquo;
      </p>
      <p className="text-sm text-gray-400 font-mono">{quote.sub}</p>
    </motion.div>
  );
}

const FG_LABEL_KO: Record<string, string> = {
  "Extreme Fear": "극단적 공포",
  "Fear": "공포",
  "Neutral": "중립",
  "Greed": "탐욕",
  "Extreme Greed": "극단적 탐욕",
};

/** 시장 공포/탐욕 게이지 */
export function MarketSentimentGauge({ fearGreed }: { fearGreed?: FearGreedData | null }) {
  // 실제 데이터 있으면 사용, 없으면 날짜 기반 의사난수 fallback
  const raw = useMemo(() => calcFearGreed(), []);
  const value = fearGreed ? fearGreed.value : Math.round(raw);
  const labelKo = fearGreed
    ? (FG_LABEL_KO[fearGreed.label] ?? fearGreed.label)
    : fgInfo(value).label;
  const info = fgInfo(value);
  const isReal = !!fearGreed;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-gray-400" />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              시장 공포/탐욕
            </p>
            <p className="text-[10px] text-gray-600 font-mono">가상화폐 시장 심리 지수</p>
          </div>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          isReal
            ? "text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-600 border-gray-700"
        }`}>
          {isReal ? "실시간" : "추정치"}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-green-500 mb-3">
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-gray-900 transition-all duration-1000 ease-out"
          style={{
            left: `${animated ? value : 50}%`,
            transform: "translateX(-50%) translateY(-50%)",
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-600 mb-3 font-mono">
        <span>공포</span>
        <span>중립</span>
        <span>탐욕</span>
      </div>

      <div className="text-center">
        <span className="text-3xl font-black font-mono" style={{ color: info.color }}>
          {value}
        </span>
        <span className="text-lg ml-2">{info.emoji}</span>
        <p className="text-sm font-semibold mt-0.5" style={{ color: info.color }}>
          {labelKo}
        </p>
      </div>
    </div>
  );
}

/** 핵심 원재료 시세 위젯 */
export function CommodityTicker({
  commodities,
  kimComment,
  isLoading,
}: {
  commodities?: CommodityItem[];
  kimComment?: string;
  isLoading?: boolean;
}) {
  const formatPrice = (price: number, currency: string) => {
    if (price >= 10000) return `${(price / 1000).toFixed(1)}K`;
    if (price >= 1000) return price.toFixed(0);
    return price.toFixed(2);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            핵심 원재료 시세
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          commodities && commodities.length > 0
            ? "text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-600 border-gray-700"
        }`}>
          {isLoading ? "로딩..." : commodities?.length ? "Yahoo Finance" : "데이터 없음"}
        </span>
      </div>

      {/* Price grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="rounded-lg p-2.5 border border-white/5 bg-white/[0.02] animate-pulse h-16" />
          ))}
        </div>
      ) : commodities && commodities.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {commodities.map((c) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-lg p-2.5 border ${
                c.changePct > 0
                  ? "border-red-500/30 bg-red-950/20"
                  : c.changePct < 0
                  ? "border-blue-500/30 bg-blue-950/20"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <p className="text-[10px] text-gray-500 mb-0.5">{c.name}</p>
              <p className="text-sm font-bold text-white font-mono">
                {formatPrice(c.price, c.currency)}
                <span className="text-[9px] text-gray-600 ml-0.5">{c.currency}</span>
              </p>
              <p className={`text-xs font-mono font-bold ${
                c.changePct > 0 ? "text-red-400" : c.changePct < 0 ? "text-blue-400" : "text-gray-500"
              }`}>
                {c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : "–"}
                {" "}{Math.abs(c.changePct).toFixed(2)}%
              </p>
              <p className="text-[9px] text-gray-700 mt-0.5">{c.note}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">시세 로드 실패</p>
      )}

      {/* 공장장 킴의 원가 분석 */}
      {kimComment && !isLoading && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-[10px] text-kim-gold font-mono mb-1.5">
            ⚙️ 공장장 킴의 원가 분석
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">{kimComment}</p>
        </div>
      )}
    </div>
  );
}

/** 하단 주요 경제 일정 */
export function EconomicCalendar({ events }: { events?: EconEvent[] }) {
  const hasEvents = !!(events && events.length > 0);

  // 태그별 색상
  const tagStyle = (tag: string) => {
    if (tag === "금통위") return "bg-blue-500/15 text-blue-400";
    if (tag === "FOMC")  return "bg-purple-500/15 text-purple-400";
    if (tag === "실적")  return "bg-yellow-500/15 text-yellow-400";
    if (tag === "GDP")   return "bg-green-500/15 text-green-400";
    if (tag === "물가")  return "bg-orange-500/15 text-orange-400";
    if (tag === "무역")  return "bg-cyan-500/15 text-cyan-400";
    return "bg-white/5 text-gray-500";
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            주요 경제·실적 일정
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          hasEvents
            ? "text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-600 border-gray-700"
        }`}>
          {hasEvents ? "KR 공식 일정 · BOK·Fed" : "로드 중"}
        </span>
      </div>

      {hasEvents ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {events!.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-lg p-2.5 border ${
                ev.hot
                  ? "border-red-500/30 bg-red-950/20"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <p className="text-xs font-mono text-gray-500 mb-1">{ev.date}</p>
              <p className="text-xs text-white font-medium leading-tight mb-1.5">
                {ev.event}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${tagStyle(ev.tag)}`}>
                {ev.tag}
              </span>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-kim-gold font-mono text-center py-4 leading-relaxed">
          💊 일정도 안 보고 매수 버튼 누르는 손가락이 문제다
        </p>
      )}
    </div>
  );
}
