import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "SimplyStock 서비스 이용약관. 투자 면책 고지, 데이터 출처, 광고 관련 안내를 포함합니다.",
};

export default function TermsPage() {
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
          <h1 className="text-2xl font-black mb-2">이용약관</h1>
          <p className="text-sm text-[var(--text-muted)] font-mono">최종 수정일: 2026년 03월 04일</p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-[var(--text-secondary)]">

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">1. 서비스 개요</h2>
            <p>
              SimplyStock(이하 &quot;서비스&quot;)은 주식 차트 분석, 회귀 채널, 투자자별 매매동향 등
              투자 참고용 데이터를 시각화하여 제공하는 웹 서비스입니다.
              본 약관은 서비스 이용에 관한 기본적인 사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">2. 투자 면책 고지</h2>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2">
                <li>본 서비스에서 제공하는 모든 정보(차트 분석, 수급 데이터, 스캔 결과 등)는 <strong className="text-[var(--text-secondary)]">투자 권유 또는 추천이 아닙니다.</strong></li>
                <li>분석 결과는 참고 자료일 뿐이며, 정확성이나 수익을 보장하지 않습니다.</li>
                <li>투자 판단과 그에 따른 손익의 책임은 <strong className="text-[var(--text-secondary)]">전적으로 이용자 본인</strong>에게 있습니다.</li>
                <li>서비스 운영자는 이용자의 투자 결과에 대해 어떠한 법적 책임도 지지 않습니다.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">3. 서비스 이용 조건</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>서비스는 만 14세 이상의 이용자가 사용할 수 있습니다.</li>
              <li>일부 기능(관심종목 동기화)은 Google 계정 로그인이 필요합니다.</li>
              <li>이용자는 타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용해서는 안 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">4. 데이터 출처 및 제한</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>주식 시세 데이터는 외부 데이터 제공자(Yahoo Finance 등)로부터 수집됩니다.</li>
              <li>투자자별 매매동향 데이터는 공개된 금융 데이터를 기반으로 합니다.</li>
              <li>데이터의 실시간성, 정확성, 완전성을 보장하지 않으며, 지연 또는 오류가 발생할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">5. 광고 관련 고지</h2>
            <p className="mb-2">
              본 서비스는 Google AdSense를 통해 광고를 게재할 수 있습니다. 광고 수익은 서비스 운영 및 개선에 사용됩니다.
            </p>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>광고 콘텐츠는 서비스 운영자가 직접 제작한 것이 아니며, Google의 광고 정책에 따라 게재됩니다.</li>
              <li>맞춤형 광고 설정은{" "}
                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  Google 광고 설정
                </a>에서 변경할 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">6. 면책조항</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>서비스는 &quot;있는 그대로&quot; 제공되며, 특정 목적에 대한 적합성을 보증하지 않습니다.</li>
              <li>시스템 장애, 데이터 오류, 서비스 중단 등으로 인한 손해에 대해 책임을 지지 않습니다.</li>
              <li>외부 API 장애로 인한 데이터 누락이나 오류에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 사전 고지 없이 변경, 중단될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">7. 약관 변경</h2>
            <p>
              본 약관은 서비스 개선 및 법률 변경에 따라 수정될 수 있습니다.
              변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">8. 문의</h2>
            <div className="mt-2 bg-[var(--bg-overlay)] rounded-lg px-4 py-3 font-mono text-xs text-[var(--text-muted)]">
              서비스명: SimplyStock<br />
              이메일: <span className="text-indigo-400">simplystock.official@gmail.com</span>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
