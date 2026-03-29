import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "활용 가이드",
  description:
    "회귀 채널, 수급 흐름, 모의투자, 백테스트, PER 밴드, 원자재, 투자성향 등 SimplyStock 활용 가이드 모음.",
};
import { TrendingUp, BarChart3, Users, Activity, Crosshair, ArrowRight, Gamepad2, LineChart, DollarSign, Gem, Brain, Calendar, GitCompareArrows, Layers, Waves } from "lucide-react";

const guides = [
  {
    slug: "regression-channel",
    icon: BarChart3,
    color: "indigo",
    title: "회귀 채널 분석법",
    subtitle: "7선 회귀채널로 저평가·고평가 구간 읽기",
    readTime: "5분",
  },
  {
    slug: "investor-flow",
    icon: Activity,
    color: "cyan",
    title: "수급 흐름 읽는 법",
    subtitle: "기관/외국인/개인 누적 흐름과 크로스 해석",
    readTime: "5분",
  },
  {
    slug: "trading-trend",
    icon: Users,
    color: "emerald",
    title: "투자자별 매매동향 해석",
    subtitle: "일별 순매매 테이블을 실전에서 활용하기",
    readTime: "4분",
  },
  {
    slug: "supply-scan",
    icon: Crosshair,
    color: "amber",
    title: "수급 스캔 활용법",
    subtitle: "채널 위치 + 수급 조건으로 관심 종목 탐색",
    readTime: "4분",
  },
  {
    slug: "chart-patterns",
    icon: Layers,
    color: "red",
    title: "차트 패턴 완벽 가이드",
    subtitle: "쌍바닥, 컵앤핸들, 트라이앵글 등 핵심 패턴",
    readTime: "6분",
  },
  {
    slug: "moving-average",
    icon: Waves,
    color: "lime",
    title: "이평선 매매 기법",
    subtitle: "224일선 기반 밥그릇·공구리·256 등 8가지 기법",
    readTime: "7분",
  },
  {
    slug: "mock-trading",
    icon: Gamepad2,
    color: "rose",
    title: "모의투자 완벽 활용법",
    subtitle: "가상 자본으로 실전 전 매매 연습하기",
    readTime: "5분",
  },
  {
    slug: "backtest",
    icon: LineChart,
    color: "violet",
    title: "백테스트 시뮬레이터 사용법",
    subtitle: "과거 데이터로 투자 전략 검증하기",
    readTime: "5분",
  },
  {
    slug: "valuation",
    icon: DollarSign,
    color: "orange",
    title: "PER 밴드 분석 활용법",
    subtitle: "주식의 고평가·저평가 구간 판단하기",
    readTime: "5분",
  },
  {
    slug: "commodities",
    icon: Gem,
    color: "teal",
    title: "원자재 시세 보는 법",
    subtitle: "금, 유가, 구리 등 매크로 신호 읽기",
    readTime: "5분",
  },
  {
    slug: "quiz",
    icon: Brain,
    color: "pink",
    title: "투자성향 테스트 이해하기",
    subtitle: "8가지 유형으로 나의 투자 심리 파악하기",
    readTime: "5분",
  },
  {
    slug: "earnings",
    icon: Calendar,
    color: "sky",
    title: "실적 캘린더 사용법",
    subtitle: "상장사 실적 공시 일정을 달력으로 확인하기",
    readTime: "4분",
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  indigo: { bg: "bg-indigo-500/5", border: "border-indigo-500/20", text: "text-indigo-400", iconBg: "bg-indigo-500/10" },
  cyan: { bg: "bg-cyan-500/5", border: "border-cyan-500/20", text: "text-cyan-400", iconBg: "bg-cyan-500/10" },
  emerald: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/10" },
  amber: { bg: "bg-amber-500/5", border: "border-amber-500/20", text: "text-amber-400", iconBg: "bg-amber-500/10" },
  rose: { bg: "bg-rose-500/5", border: "border-rose-500/20", text: "text-rose-400", iconBg: "bg-rose-500/10" },
  violet: { bg: "bg-violet-500/5", border: "border-violet-500/20", text: "text-violet-400", iconBg: "bg-violet-500/10" },
  orange: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", iconBg: "bg-orange-500/10" },
  teal: { bg: "bg-teal-500/5", border: "border-teal-500/20", text: "text-teal-400", iconBg: "bg-teal-500/10" },
  pink: { bg: "bg-pink-500/5", border: "border-pink-500/20", text: "text-pink-400", iconBg: "bg-pink-500/10" },
  sky: { bg: "bg-sky-500/5", border: "border-sky-500/20", text: "text-sky-400", iconBg: "bg-sky-500/10" },
  red: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", iconBg: "bg-red-500/10" },
  lime: { bg: "bg-lime-500/5", border: "border-lime-500/20", text: "text-lime-400", iconBg: "bg-lime-500/10" },
};

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/25 transition-all font-bold text-xs mb-6"
          >
            &larr; 홈으로
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">SimplyStock 가이드</h1>
              <p className="text-sm text-[var(--text-muted)]">차트를 더 똑똑하게 읽는 방법</p>
            </div>
          </div>
        </div>

        {/* 핵심 가이드 */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-indigo-400 mb-2">핵심 가이드</p>
          <div className="flex flex-col gap-3">
            {guides.slice(0, 6).map((g) => {
              const c = colorMap[g.color];
              const Icon = g.icon;
              return (
                <Link
                  key={g.slug}
                  href={`/guide/${g.slug}/`}
                  className={`group flex items-center gap-4 rounded-xl border ${c.border} ${c.bg} p-4 transition-all hover:border-[var(--border-primary)] hover:bg-[var(--bg-overlay)]`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{g.title}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{g.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--text-faint)]">{g.readTime}</span>
                    <ArrowRight className="h-4 w-4 text-[var(--text-faint)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 기능 가이드 */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">기능 가이드</p>
          <div className="flex flex-col gap-3">
            {guides.slice(6).map((g) => {
              const c = colorMap[g.color];
              const Icon = g.icon;
              return (
                <Link
                  key={g.slug}
                  href={`/guide/${g.slug}/`}
                  className={`group flex items-center gap-4 rounded-xl border ${c.border} ${c.bg} p-4 transition-all hover:border-[var(--border-primary)] hover:bg-[var(--bg-overlay)]`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{g.title}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{g.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--text-faint)]">{g.readTime}</span>
                    <ArrowRight className="h-4 w-4 text-[var(--text-faint)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 심화 분석 자료 */}
        <div className="mt-6">
          <p className="text-xs font-medium text-[var(--text-faint)] mb-2">심화 분석 자료</p>
          <Link
            href="/analysis/supply-cross/"
            className="group flex items-center gap-4 rounded-xl border border-lime-500/20 bg-lime-500/5 p-4 transition-all hover:border-[var(--border-primary)] hover:bg-[var(--bg-overlay)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-500/10">
              <GitCompareArrows className="h-5 w-5 text-lime-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">수급 크로스 분석</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">개인-외국인 매매 교차 신호 해석하기</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[var(--text-faint)]">6분</span>
              <ArrowRight className="h-4 w-4 text-[var(--text-faint)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </div>
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-3">가이드 내용을 실제 종목에 적용해보세요</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { code: "005930", name: "삼성전자" },
              { code: "000660", name: "SK하이닉스" },
              { code: "035420", name: "NAVER" },
              { code: "005380", name: "현대차" },
            ].map((s) => (
              <Link
                key={s.code}
                href={`/stock/${s.code}/`}
                className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-center text-xs text-[var(--text-secondary)] transition-colors hover:border-indigo-500/30 hover:text-indigo-400"
              >
                {s.name}
              </Link>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Link href="/stock/" className="text-[10px] text-[var(--text-faint)] hover:text-indigo-400 transition-colors">
              전체 50개 종목 보기 →
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5 text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            본 가이드는 차트 분석 방법론을 소개하는 교육 자료이며,<br />
            특정 종목의 매수·매도를 권유하지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
