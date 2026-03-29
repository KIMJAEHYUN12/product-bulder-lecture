import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ArrowLeftRight,
  ListChecks,
} from "lucide-react";

export const metadata: Metadata = {
  title: "분석 자료실",
  description:
    "회귀 채널, 수급 분석 칼럼을 확인하세요. 데이터 기반 투자 분석 자료.",
};

const columns = [
  {
    href: "/analysis/regression-undervalue/",
    icon: FileText,
    title: "회귀 채널로 보는 저평가 구간 판단법",
    desc: "\"싸다\"는 느낌 vs 통계적 저평가의 차이",
  },
  {
    href: "/analysis/supply-cross/",
    icon: ArrowLeftRight,
    title: "개인이 팔 때 외인이 산다 — 수급 크로스",
    desc: "개인-외인 크로스의 의미와 역사적 패턴",
  },
  {
    href: "/analysis/scan-checklist/",
    icon: ListChecks,
    title: "수급 스캔 종목, 선정 후 확인법",
    desc: "5단계 체크리스트와 탈락 조건 정리",
  },
];


export default function AnalysisPage() {
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
          <h1 className="text-2xl font-black mb-2">분석 자료실</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            데이터 기반 투자 분석 칼럼을 확인하세요.
          </p>
        </div>

        {/* 분석 칼럼 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-bold">분석 칼럼</h2>
          </div>
          <div className="grid gap-2.5">
            {columns.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex items-center gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 hover:bg-[var(--bg-card)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <c.icon className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {c.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 관련 링크 */}
        <div className="mb-10 flex items-center gap-3 text-xs text-[var(--text-faint)]">
          <Link href="/guide/" className="hover:text-[var(--text-muted)] transition-colors">가이드</Link>
          <span>|</span>
          <Link href="/dictionary/" className="hover:text-[var(--text-muted)] transition-colors">용어사전</Link>
        </div>

        <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5 text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            본 자료는 투자 참고용 교육 자료이며,
            <br />
            특정 종목의 매수·매도를 권유하지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
