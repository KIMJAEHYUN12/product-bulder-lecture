import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "주식 용어 사전",
  description:
    "주식 투자에 필요한 핵심 용어를 쉽게 정리. 가치평가, 차트, 수급, 기술적 분석, 주문 유형.",
};
import { BookOpen, CandlestickChart, TrendingUp, LineChart, ClipboardList, ArrowRight } from "lucide-react";

const terms = [
  {
    slug: "valuation",
    icon: BookOpen,
    color: "rose",
    title: "가치 평가 지표",
    subtitle: "PER, PBR, ROE, EPS 등 핵심 밸류에이션 용어",
    readTime: "5분",
  },
  {
    slug: "chart-basics",
    icon: CandlestickChart,
    color: "violet",
    title: "차트 기본 용어",
    subtitle: "캔들, 이동평균선, 거래량, 지지/저항 등",
    readTime: "5분",
  },
  {
    slug: "supply-demand",
    icon: TrendingUp,
    color: "teal",
    title: "수급 용어 정리",
    subtitle: "순매수, 프로그램매매, 공매도 등",
    readTime: "4분",
  },
  {
    slug: "technical",
    icon: LineChart,
    color: "sky",
    title: "기술적 분석 용어",
    subtitle: "RSI, MACD, 볼린저밴드 등 보조지표",
    readTime: "5분",
  },
  {
    slug: "order-types",
    icon: ClipboardList,
    color: "orange",
    title: "주문 유형 용어",
    subtitle: "시장가, 지정가, 조건부, IOC, FOK 등",
    readTime: "4분",
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  rose: { bg: "bg-rose-500/5", border: "border-rose-500/20", text: "text-rose-400", iconBg: "bg-rose-500/10" },
  violet: { bg: "bg-violet-500/5", border: "border-violet-500/20", text: "text-violet-400", iconBg: "bg-violet-500/10" },
  teal: { bg: "bg-teal-500/5", border: "border-teal-500/20", text: "text-teal-400", iconBg: "bg-teal-500/10" },
  sky: { bg: "bg-sky-500/5", border: "border-sky-500/20", text: "text-sky-400", iconBg: "bg-sky-500/10" },
  orange: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", iconBg: "bg-orange-500/10" },
};

export default function DictionaryPage() {
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <BookOpen className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">주식 용어 사전</h1>
              <p className="text-sm text-[var(--text-muted)]">초보 투자자를 위한 필수 용어 카테고리별 정리</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {terms.map((t) => {
            const c = colorMap[t.color];
            const Icon = t.icon;
            return (
              <Link
                key={t.slug}
                href={`/dictionary/${t.slug}/`}
                className={`group flex items-center gap-4 rounded-xl border ${c.border} ${c.bg} p-4 transition-all hover:border-[var(--border-primary)] hover:bg-[var(--bg-overlay)]`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}>
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">{t.title}</h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-[var(--text-faint)]">{t.readTime}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-faint)] group-hover:text-[var(--text-secondary)] transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5 text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            본 용어 사전은 주식 투자 입문자를 위한 교육 자료이며,<br />
            특정 종목의 매수·매도를 권유하지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
