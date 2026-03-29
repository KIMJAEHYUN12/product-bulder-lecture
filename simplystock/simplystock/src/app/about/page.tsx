import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Users, Search, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "SimplyStock 소개",
  description:
    "SimplyStock은 회귀 채널, 수급 흐름, 수급 스캔 등 데이터 기반 주식 차트 분석 도구입니다.",
};

export default function AboutPage() {
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
          <h1 className="text-2xl font-black mb-2">SimplyStock 소개</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            복잡한 차트를 단순하게. 데이터 기반 주식 분석 도구.
          </p>
        </div>

        {/* 서비스 소개 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-indigo-400">
            SimplyStock이란?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            SimplyStock은 주식 차트를 통계적으로 분석하는 무료 웹 도구입니다.
            선형 회귀 기반 7선 채널로 주가의 정상 범위를 시각화하고,
            외국인·기관·개인 투자자의 수급 흐름을 누적 그래프로 보여줍니다.
            복잡한 지표 대신 핵심 데이터만 간결하게 제공하여,
            투자 판단에 필요한 정보를 빠르게 파악할 수 있도록 설계했습니다.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            모든 분석 데이터는 Yahoo Finance 등 공개된 금융 데이터를 기반으로 하며,
            별도의 설치 없이 웹 브라우저에서 바로 이용할 수 있습니다.
            PC와 모바일 모두 최적화되어 있어 언제 어디서든 차트를 확인할 수 있습니다.
          </p>
        </section>

        {/* 핵심 기능 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-indigo-400">핵심 기능</h2>
          <div className="grid gap-3">
            {[
              {
                icon: BarChart3,
                title: "회귀 채널 분석",
                desc: "선형 회귀와 표준편차를 활용한 7선 채널로 주가의 저평가·고평가 구간을 통계적으로 판단합니다. 1개월~전체 기간까지 자유롭게 설정할 수 있습니다.",
              },
              {
                icon: Users,
                title: "투자자 수급 흐름",
                desc: "외국인, 기관, 개인 투자자의 순매매를 날짜순으로 누적하여 흐름을 파악합니다. 단순 일일 수치가 아닌 추세를 읽을 수 있습니다.",
              },
              {
                icon: Search,
                title: "수급 스캔",
                desc: "채널 하단(-2σ 이하) + 외인/기관 3일 연속 순매수 조건을 동시에 충족하는 종목을 자동으로 탐색합니다. 30분마다 갱신됩니다.",
              },
              {
                icon: Shield,
                title: "관심종목 관리",
                desc: "Google 로그인으로 최대 50개 관심종목을 저장하고, 현재가와 등락률을 실시간으로 확인할 수 있습니다.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                    <f.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-bold">{f.title}</h3>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 데이터 출처 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-indigo-400">
            데이터 출처
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            SimplyStock에서 제공하는 주가, 거래량, 투자자별 매매동향 등의 데이터는
            Yahoo Finance 및 공개 금융 데이터 API를 통해 수집됩니다.
            데이터는 실시간이 아닌 지연 데이터이며,
            정확성이나 완전성을 보장하지 않습니다.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            차트 라이브러리는{" "}
            <span className="text-[var(--text-secondary)] font-medium">
              Lightweight Charts (TradingView)
            </span>
            를 사용합니다.
          </p>
        </section>

        {/* 운영 정보 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-indigo-400">운영 정보</h2>
          <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 text-sm text-[var(--text-muted)] space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">서비스명</span>
              <span className="text-[var(--text-secondary)]">SimplyStock</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">문의</span>
              <span className="text-[var(--text-secondary)]">simplystock.official@gmail.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">운영 시작</span>
              <span className="text-[var(--text-secondary)]">2026년 3월</span>
            </div>
          </div>
        </section>

        {/* 면책 고지 */}
        <div className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-5 text-center">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            본 서비스는 투자 참고용 데이터 분석 도구이며,
            <br />
            특정 종목의 매수·매도를 권유하지 않습니다.
            <br />
            모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-[var(--text-faint)]">
          <Link href="/terms/" className="hover:text-[var(--text-muted)] transition-colors">
            이용약관
          </Link>
          <span className="text-[var(--text-faint)]">|</span>
          <Link href="/privacy/" className="hover:text-[var(--text-muted)] transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </main>
  );
}
