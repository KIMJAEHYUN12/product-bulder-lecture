import Link from "next/link";

export default function PrivacyPage() {
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
            개인정보처리방침
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            최종 수정일: 2026년 02월 26일
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">1. 개요</h2>
            <p>
              오비젼(이하 &quot;서비스&quot;)은 사용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 정보, 사용 방법 및 보호 방법을 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">2. 수집하는 정보</h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Google 로그인 정보</p>
                <p>모의투자 기능 이용 시 Google OAuth를 통해 아래 정보를 수집합니다.</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>이름 (Google 계정 표시 이름)</li>
                  <li>이메일 주소</li>
                  <li>Google 계정 고유 ID (UID)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">서비스 이용 정보</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>모의투자 포트폴리오 및 거래 내역</li>
                  <li>투자 성향 퀴즈 결과</li>
                  <li>커뮤니티 게시판 작성 내용</li>
                  <li>닉네임 및 투자 전략 (사용자 직접 입력)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">자동 수집 정보</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400 space-y-0.5">
                  <li>접속 기기 정보 및 브라우저 정보</li>
                  <li>쿠키 및 로컬 스토리지 데이터</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">3. 정보의 이용 목적</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>모의투자 포트폴리오 저장 및 수익률 랭킹 운영</li>
              <li>커뮤니티 게시판 서비스 제공</li>
              <li>서비스 품질 개선 및 오류 분석</li>
              <li>Google AdSense를 통한 맞춤형 광고 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">4. 제3자 서비스</h2>
            <p className="mb-3">서비스는 아래 제3자 서비스를 이용하며, 각 서비스의 개인정보처리방침이 별도로 적용됩니다.</p>
            <div className="flex flex-col gap-2">
              {[
                { name: "Google Firebase", desc: "인증, 데이터베이스, 호스팅", url: "https://firebase.google.com/support/privacy" },
                { name: "Google AdSense", desc: "광고 서비스 (맞춤형 광고 포함)", url: "https://policies.google.com/privacy" },
                { name: "Yahoo Finance API", desc: "주식 시세 데이터 제공", url: "https://legal.yahoo.com/us/en/yahoo/privacy/index.html" },
                { name: "Google Gemini API", desc: "AI 포트폴리오 분석", url: "https://ai.google.dev/gemini-api/terms" },
              ].map((s) => (
                <div key={s.name} className="flex items-start justify-between gap-4 py-2 border-b border-gray-200 dark:border-white/10">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-kim-red hover:underline shrink-0"
                  >
                    방침 보기
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">5. 쿠키 및 광고</h2>
            <p className="mb-2">
              서비스는 Google AdSense를 통해 광고를 제공합니다. Google은 쿠키를 사용하여 사용자의 이전 방문 기록을 기반으로 맞춤형 광고를 표시할 수 있습니다.
            </p>
            <p>
              맞춤형 광고를 원하지 않는 경우{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-kim-red hover:underline"
              >
                Google 광고 설정
              </a>
              에서 해제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">6. 정보 보관 및 삭제</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>로그인 정보는 브라우저 세션 종료 시 자동 로그아웃됩니다.</li>
              <li>모의투자 데이터는 Firebase Firestore에 저장되며, 계정 삭제 요청 시 삭제됩니다.</li>
              <li>데이터 삭제를 원하시면 아래 이메일로 문의해 주세요.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">7. 사용자 권리</h2>
            <p>사용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-400 space-y-1">
              <li>수집된 개인정보 열람 요청</li>
              <li>개인정보 수정 또는 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">8. 문의</h2>
            <p>개인정보 관련 문의사항은 아래로 연락 주세요.</p>
            <div className="mt-2 bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
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
