"use client";

import { useState, useEffect, useRef } from "react";
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
import type { FearGreedData, EconEvent, CommodityItem, NewsItem } from "@/hooks/useMarketData";

// ─── Data ────────────────────────────────────────────────────────────────────

const NEWS_ITEMS: NewsItem[] = [
  { title: "🔴 삼성전자 HBM4 엔비디아 퀄 테스트 진행 중 · 3Q26 공급 가시화", url: "" },
  { title: "⚡ 효성중공업 미국 변압기 수주잔고 3.2조 돌파 · 신규 팩토리 증설 확정", url: "" },
  { title: "🧬 삼성바이오로직스 5공장 가동률 40%→65% 상향 조정", url: "" },
  { title: "🚗 현대차 울산 EV 전용라인 3조 투자 확정 · 2027년 양산", url: "" },
  { title: "💾 SK하이닉스 HBM3E 16단 GB200 NVL72 공급 단가 타결", url: "" },
  { title: "🔋 LG에너지솔루션 오하이오 2공장 가동률 50% 하향 · GM 발주 감소", url: "" },
  { title: "🧠 네이버 하이퍼클로바X B2B 계약 23건 신규 수주 · 공공 부문 확대", url: "" },
  { title: "⚙️ 현대모비스 자율주행 레벨3 센서퓨전 모듈 독점 납품 확정", url: "" },
  { title: "🔋 포스코퓨처엠 양극재 수주잔고 8.7조 · 2026 가이던스 유지", url: "" },
  { title: "🔌 두산에너빌리티 체코 원전 수주 최종 협상 진입 · 수주액 24조 추정", url: "" },
  { title: "💊 셀트리온 자가면역 바이오시밀러 미국 FDA 승인 · 연 매출 5,000억 전망", url: "" },
  { title: "🔧 LS일렉트릭 미국 데이터센터향 배전반 수주 급증 · 북미 법인 증설", url: "" },
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

interface FuturesData {
  name: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
}

// 선물 장 상태 판별 (KST 기준)
function getFuturesMarketStatus(): { label: string; isOpen: boolean; isNight: boolean } {
  const now = new Date();
  const kstH = (now.getUTCHours() + 9) % 24;
  const kstM = now.getUTCMinutes();
  const kstMin = kstH * 60 + kstM;
  const day = now.getUTCDay(); // 0=Sun
  if (day === 0 || day === 6) return { label: "주말 휴장", isOpen: false, isNight: false };
  // 정규장 09:00~15:45
  if (kstMin >= 540 && kstMin < 945) return { label: "정규장", isOpen: true, isNight: false };
  // 야간 18:00~06:00
  if (kstMin >= 1080 || kstMin < 360) return { label: "야간선물", isOpen: false, isNight: true };
  if (kstMin < 540) return { label: "장 준비 중", isOpen: false, isNight: false };
  return { label: "장 마감", isOpen: false, isNight: false };
}

/** 코스피200 선물 위젯 (정규장 KIS API / 야간은 esignal 안내) */
export function KospiNightFutures() {
  const [data, setData] = useState<FuturesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFutures = async () => {
      try {
        const FIREBASE_HOST = "https://bitgak.co.kr";
        const API_URL =
          process.env.NEXT_PUBLIC_KOSPI_FUTURES_API_URL ||
          `${FIREBASE_HOST}/api/kospi-futures`;
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
        const json = await res.json();
        if (!cancelled) {
          if (json.error) {
            setError(json.error);
          } else {
            setData(json);
            setError(null);
            setLastUpdated(new Date());
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError("데이터 로드 실패");
          setLoading(false);
        }
      }
    };

    fetchFutures();
    const interval = window.setInterval(fetchFutures, 300000); // 5분
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const isUp = (data?.change ?? 0) > 0;
  const isDown = (data?.change ?? 0) < 0;
  const market = getFuturesMarketStatus();

  const updatedStr = lastUpdated
    ? `${String(lastUpdated.getHours()).padStart(2, "0")}:${String(lastUpdated.getMinutes()).padStart(2, "0")}`
    : null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-blue-500" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            코스피200 선물
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
            market.isOpen
              ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
              : "text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/5"
          }`}>
            {loading ? "..." : market.isNight ? "야간 장중" : market.label}
          </span>
          {updatedStr && !market.isNight && (
            <span className="text-[9px] text-gray-400 font-mono">{updatedStr}</span>
          )}
        </div>
      </div>

      {market.isNight ? (
        /* ── 야간: 정규장 종가 + esignal 안내 ── */
        <div>
          {data && (
            <div className="mb-3">
              <p className="text-[9px] text-gray-400 mb-1">정규장 종가</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-black font-mono ${
                  isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-900 dark:text-white"
                }`}>
                  {data.price.toFixed(2)}
                </span>
                <span className={`text-xs font-bold font-mono ${
                  isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500"
                }`}>
                  {isUp ? "▲" : isDown ? "▼" : "–"}{" "}
                  {Math.abs(data.change).toFixed(2)} ({isUp ? "+" : ""}{data.changePct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
          <a
            href="http://esignal.co.kr/kospi200-futures-night/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
          >
            <span>야간선물 실시간 보기</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-xs text-gray-500 dark:text-gray-600 font-mono">{error}</p>
      ) : data ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${
              isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-900 dark:text-white"
            }`}>
              {data.price.toFixed(2)}
            </span>
            <span className={`text-sm font-bold font-mono ${
              isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-gray-500"
            }`}>
              {isUp ? "▲" : isDown ? "▼" : "–"}
              {" "}{Math.abs(data.change).toFixed(2)}
              {" "}({isUp ? "+" : ""}{data.changePct.toFixed(2)}%)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <p className="text-[9px] text-gray-400 font-mono">고가</p>
              <p className="text-xs font-bold text-red-500 dark:text-red-400 font-mono">{data.high.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-mono">저가</p>
              <p className="text-xs font-bold text-blue-500 dark:text-blue-400 font-mono">{data.low.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-mono">거래량</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white font-mono">{data.volume.toLocaleString()}</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** 상단 뉴스 롤링 티커 */
export function NewsTicker({ news, isLoading }: { news?: NewsItem[]; isLoading?: boolean }) {
  const isLive = !!(news && news.length > 0);
  const items = isLive ? news! : NEWS_ITEMS;
  const displayItems = [...items, ...items]; // seamless loop

  return (
    <div className="overflow-hidden bg-gray-100 dark:bg-black/50 border-b border-gray-200 dark:border-white/10 py-2 px-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold shrink-0 border px-2 py-0.5 rounded font-mono transition-colors ${
          isLoading
            ? "text-gray-400 border-gray-300 dark:text-gray-500 dark:border-gray-700"
            : isLive
            ? "text-green-600 dark:text-green-400 border-green-500/50"
            : "text-red-500 dark:text-red-400 border-red-500/50"
        }`}>
          {isLoading ? "..." : isLive ? "LIVE" : "DEMO"}
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker">
            {displayItems.map((item, i) =>
              isLive && item.url ? (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-300 shrink-0 mr-10 hover:text-gray-900 dark:hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {item.title}
                </a>
              ) : (
                <span key={i} className="text-sm text-gray-600 dark:text-gray-300 shrink-0 mr-10">
                  {item.title}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 파일 업로드 전 오늘의 명언 */
export function DailyQuote() {
  const [quote, setQuote] = useState(DAILY_QUOTES[0]);

  useEffect(() => {
    const idx = new Date().getDate() % DAILY_QUOTES.length;
    setQuote(DAILY_QUOTES[idx]);
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
          오비젼의 오늘의 훈수
        </p>
        <Zap size={12} className="text-kim-gold" />
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2">
        &ldquo;{quote.quote}&rdquo;
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{quote.sub}</p>
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
export function MarketSentimentGauge({
  fearGreed,
  isLoading,
}: {
  fearGreed?: FearGreedData | null;
  isLoading?: boolean;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (fearGreed) {
      const t = setTimeout(() => setAnimated(true), 100);
      return () => clearTimeout(t);
    }
  }, [fearGreed]);

  const isReal = !!fearGreed;
  const value = fearGreed?.value ?? 50;
  const labelKo = fearGreed ? (FG_LABEL_KO[fearGreed.label] ?? fearGreed.label) : "";
  const info = fgInfo(value);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-gray-500 dark:text-gray-400" />
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
              시장 공포/탐욕
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-600 font-mono">가상화폐 시장 심리 지수</p>
          </div>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          isReal
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {isLoading ? "..." : isReal ? "실시간" : "오류"}
        </span>
      </div>

      {/* Gradient bar */}
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-green-500 mb-3">
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-gray-300 dark:border-gray-900 transition-all duration-1000 ease-out"
          style={{
            left: `${isReal && animated ? value : 50}%`,
            transform: "translateX(-50%) translateY(-50%)",
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-600 mb-3 font-mono">
        <span>공포</span>
        <span>중립</span>
        <span>탐욕</span>
      </div>

      <div className="text-center">
        {isLoading || !fearGreed ? (
          <div className="py-1">
            <div className="h-8 w-16 mx-auto rounded bg-gray-200 dark:bg-white/5 animate-pulse mb-1" />
            <div className="h-4 w-20 mx-auto rounded bg-gray-200 dark:bg-white/5 animate-pulse" />
          </div>
        ) : (
          <>
            <span className="text-3xl font-black font-mono" style={{ color: info.color }}>
              {value}
            </span>
            <span className="text-lg ml-2">{info.emoji}</span>
            <p className="text-sm font-semibold mt-0.5" style={{ color: info.color }}>
              {labelKo}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const COMMODITY_URLS: Record<string, string> = {
  // 귀금속
  gold:      "https://finance.yahoo.com/quote/GC%3DF/",
  silver:    "https://finance.yahoo.com/quote/SI%3DF/",
  palladium: "https://finance.yahoo.com/quote/PA%3DF/",
  // 에너지
  oil:       "https://finance.yahoo.com/quote/CL%3DF/",
  natgas:    "https://finance.yahoo.com/quote/NG%3DF/",
  uranium:   "https://finance.yahoo.com/quote/URA/",
  // 산업 금속
  copper:    "https://finance.yahoo.com/quote/HG%3DF/",
  nickel:    "https://finance.yahoo.com/quote/NI%3DF/",
  aluminum:  "https://finance.yahoo.com/quote/ALI%3DF/",
  // 배터리 소재
  lithium:   "https://finance.yahoo.com/quote/LIT/",
};

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
          <TrendingUp size={13} className="text-gray-500 dark:text-gray-400" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            핵심 원재료 시세
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          commodities && commodities.length > 0
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {isLoading ? "로딩..." : commodities?.length ? "Yahoo Finance" : "데이터 없음"}
        </span>
      </div>

      {/* Price grid — lg:grid-cols-2 to fit narrow sidebar */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-3">
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <div key={i} className="rounded-lg p-2.5 border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] animate-pulse h-16" />
          ))}
        </div>
      ) : commodities && commodities.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-3">
          {commodities.map((c) => (
            <motion.a
              key={c.key}
              href={COMMODITY_URLS[c.key] ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-lg p-2.5 border block transition-opacity hover:opacity-80 cursor-pointer ${
                c.changePct > 0
                  ? "border-red-500/30 bg-red-50 dark:bg-red-950/20"
                  : c.changePct < 0
                  ? "border-blue-500/30 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <p className="text-[10px] text-gray-500 mb-0.5">{c.name}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                {formatPrice(c.price, c.currency)}
                <span className="text-[9px] text-gray-500 dark:text-gray-600 ml-0.5">{c.currency}</span>
              </p>
              <p className={`text-xs font-mono font-bold ${
                c.changePct > 0 ? "text-red-500 dark:text-red-400" : c.changePct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"
              }`}>
                {c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : "–"}
                {" "}{Math.abs(c.changePct).toFixed(2)}%
              </p>
              <p className="text-[9px] text-gray-400 dark:text-gray-700 mt-0.5">{c.note}</p>
            </motion.a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-600 text-center py-4">시세 로드 실패</p>
      )}

      {/* 공장장 킴의 원가 분석 */}
      {kimComment && !isLoading && (
        <div className="border-t border-gray-200 dark:border-white/10 pt-3">
          <p className="text-[10px] text-kim-gold font-mono mb-1.5">
            ⚙️ 오비젼의 원가 분석
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{kimComment}</p>
        </div>
      )}
    </div>
  );
}

const ECON_URLS: Record<string, string> = {
  "금통위": "https://www.bok.or.kr/portal/main/contents.do?menuNo=200761",
  "FOMC":   "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  "실적":   "https://dart.fss.or.kr/dsac001/mainAll.do",
  "물가":   "https://kostat.go.kr/board.es?mid=a10301060200&bid=218",
  "무역":   "https://tradedata.go.kr/",
  "GDP":    "https://ecos.bok.or.kr/",
};

/** 하단 주요 경제 일정 */
export function EconomicCalendar({ events }: { events?: EconEvent[] }) {
  const hasEvents = !!(events && events.length > 0);

  // 태그별 색상
  const tagStyle = (tag: string) => {
    if (tag === "금통위") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    if (tag === "FOMC")  return "bg-purple-500/15 text-purple-600 dark:text-purple-400";
    if (tag === "실적")  return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
    if (tag === "GDP")   return "bg-green-500/15 text-green-600 dark:text-green-400";
    if (tag === "물가")  return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    if (tag === "무역")  return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    return "bg-gray-100 dark:bg-white/5 text-gray-500";
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gray-500 dark:text-gray-400" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            주요 경제·실적 일정
          </p>
        </div>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
          hasEvents
            ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5"
            : "text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700"
        }`}>
          {hasEvents ? "KR 공식 일정 · BOK·Fed" : "로드 중"}
        </span>
      </div>

      {hasEvents ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {events!.map((ev, i) => (
            <motion.a
              key={i}
              href={ev.url ?? ECON_URLS[ev.tag] ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-lg p-2.5 border block transition-opacity hover:opacity-80 cursor-pointer ${
                ev.hot
                  ? "border-red-500/30 bg-red-50 dark:bg-red-950/20"
                  : "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]"
              }`}
            >
              <p className="text-xs font-mono text-gray-500 mb-1">{ev.date}</p>
              <p className="text-xs text-gray-900 dark:text-white font-medium leading-tight mb-1.5">
                {ev.event}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${tagStyle(ev.tag)}`}>
                {ev.tag}
              </span>
            </motion.a>
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
