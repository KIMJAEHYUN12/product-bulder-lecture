import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kim-red/15 border border-kim-red/40 text-kim-red hover:bg-kim-red/25 transition-all font-bold text-xs mb-6"
          >
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            이용약관
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            최종 수정일: 2026년 02월 28일
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">1. 서비스 개요</h2>
            <p>
              오비젼(이하 &quot;서비스&quot;)은 AI 기반 주식 포트폴리오 분석, 차트 분석, 모의투자, 투자성향 테스트 등
              투자 관련 정보를 제공하는 웹 서비스입니다. 본 약관은 서비스 이용에 관한 기본적인 사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">2. 투자 면책 고지</h2>
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
              <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-2">
                <li>본 서비스에서 제공하는 모든 정보(AI 분석, 차트 분석, 종목 브리핑 등)는 <strong className="text-gray-800 dark:text-gray-200">투자 권유 또는 추천이 아닙니다.</strong></li>
                <li>AI 분석 결과는 참고 자료일 뿐이며, 정확성이나 수익을 보장하지 않습니다.</li>
                <li>투자 판단과 그에 따른 손익의 책임은 <strong className="text-gray-800 dark:text-gray-200">전적으로 이용자 본인</strong>에게 있습니다.</li>
                <li>모의투자 기능은 가상 자금으로 운영되며, 실제 투자와는 다릅니다.</li>
                <li>서비스 운영자는 이용자의 투자 결과에 대해 어떠한 법적 책임도 지지 않습니다.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">3. 서비스 이용 조건</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스는 만 14세 이상의 이용자가 사용할 수 있습니다.</li>
              <li>일부 기능(모의투자, 랭킹 등록)은 Google 계정 로그인이 필요합니다.</li>
              <li>이용자는 타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용해서는 안 됩니다.</li>
              <li>커뮤니티 게시판에 허위 정보, 욕설, 광고를 게시하는 행위는 금지됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">4. 광고 관련 고지</h2>
            <p className="mb-2">
              본 서비스는 Google AdSense를 통해 광고를 게재합니다. 광고 수익은 서비스 운영 및 개선에 사용됩니다.
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>광고 콘텐츠는 서비스 운영자가 직접 제작한 것이 아니며, Google의 광고 정책에 따라 게재됩니다.</li>
              <li>광고 내용의 정확성이나 신뢰성에 대해 서비스 운영자는 보증하지 않습니다.</li>
              <li>맞춤형 광고 설정은{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-kim-red hover:underline"
                >
                  Google 광고 설정
                </a>
                에서 변경할 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">5. 지적재산권</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스의 디자인, 로고, 텍스트, 코드 등 콘텐츠에 대한 저작권은 오비젼에 있습니다.</li>
              <li>서비스에서 제공하는 주식 시세 데이터는 Yahoo Finance 등 외부 데이터 제공자의 자산입니다.</li>
              <li>이용자가 커뮤니티에 게시한 콘텐츠의 저작권은 해당 이용자에게 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">6. 면책조항</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스는 &quot;있는 그대로&quot; 제공되며, 특정 목적에 대한 적합성을 보증하지 않습니다.</li>
              <li>시스템 장애, 데이터 오류, 서비스 중단 등으로 인한 손해에 대해 책임을 지지 않습니다.</li>
              <li>외부 API(Yahoo Finance, Google 등) 장애로 인한 데이터 누락이나 오류에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 사전 고지 없이 변경, 중단될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">7. 약관 변경</h2>
            <p>
              본 약관은 서비스 개선 및 법률 변경에 따라 수정될 수 있습니다.
              중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.
              변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">8. 문의</h2>
            <p>서비스 이용 관련 문의사항은 아래로 연락 주세요.</p>
            <div className="mt-2 bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">
              서비스명: 오비젼 (Ovision)<br />
              운영자: 오비젼 팀<br />
              이메일: <span className="text-kim-red">contact@ovision.kr</span>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
