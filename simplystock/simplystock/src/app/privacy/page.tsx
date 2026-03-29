import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "SimplyStock 개인정보처리방침. 수집 정보, 이용 목적, 제3자 서비스, 사용자 권리를 안내합니다.",
};

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-black mb-2">개인정보처리방침</h1>
          <p className="text-sm text-[var(--text-muted)] font-mono">최종 수정일: 2026년 03월 20일</p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-[var(--text-secondary)]">

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">1. 개요</h2>
            <p>
              SimplyStock(이하 &quot;서비스&quot;)은 사용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 정보, 사용 방법 및 보호 방법을 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">2. 수집하는 정보</h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-[var(--text-secondary)] mb-1">Google 로그인 정보</p>
                <p>관심종목 동기화 등 일부 기능 이용 시 Google OAuth를 통해 아래 정보를 수집합니다.</p>
                <ul className="list-disc list-inside mt-1 text-[var(--text-muted)] space-y-0.5">
                  <li>이름 (Google 계정 표시 이름)</li>
                  <li>이메일 주소</li>
                  <li>Google 계정 고유 ID (UID)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-secondary)] mb-1">서비스 이용 정보</p>
                <ul className="list-disc list-inside mt-1 text-[var(--text-muted)] space-y-0.5">
                  <li>관심종목 목록 (로그인 사용자: Firebase 서버 저장 / 비로그인 사용자: 기기 식별자 기반 서버 저장)</li>
                  <li>차트 조회 기록</li>
                  <li>모의투자 포트폴리오 및 랭킹 정보 (Google 계정 표시 이름이 공개 랭킹에 노출될 수 있습니다)</li>
                  <li>피드백 제출 내용</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-secondary)] mb-1">자동 수집 정보</p>
                <ul className="list-disc list-inside mt-1 text-[var(--text-muted)] space-y-0.5">
                  <li>기기 고유 식별자 (deviceId, UUID 형식)</li>
                  <li>접속 기기 정보 및 브라우저 정보 (User-Agent)</li>
                  <li>쿠키 및 로컬 스토리지 데이터</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">3. 정보의 이용 목적</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>관심종목 저장 및 동기화</li>
              <li>서비스 품질 개선 및 오류 분석</li>
              <li>Google AdSense를 통한 광고 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">4. 제3자 서비스</h2>
            <p className="mb-3">서비스는 아래 제3자 서비스를 이용하며, 각 서비스의 개인정보처리방침이 별도로 적용됩니다.</p>
            <div className="flex flex-col gap-2">
              {[
                { name: "Google Firebase", desc: "인증, 데이터베이스, 호스팅", url: "https://firebase.google.com/support/privacy" },
                { name: "Google AdSense", desc: "광고 서비스", url: "https://policies.google.com/privacy" },
                { name: "Yahoo Finance", desc: "주식 시세 데이터", url: "https://legal.yahoo.com/us/en/yahoo/privacy/index.html" },
              ].map((s) => (
                <div key={s.name} className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border-primary)]">
                  <div>
                    <p className="font-semibold text-[var(--text-secondary)] text-xs">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.desc}</p>
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline shrink-0">
                    방침 보기
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">5. 쿠키 및 광고</h2>
            <p className="mb-2">
              서비스는 Google AdSense를 통해 광고를 제공할 수 있습니다.
              Google은 쿠키를 사용하여 맞춤형 광고를 표시할 수 있습니다.
            </p>
            <p>
              맞춤형 광고를 원하지 않는 경우{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                Google 광고 설정
              </a>에서 해제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">6. 정보 보관 및 삭제</h2>
            <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1">
              <li>로그인 정보는 브라우저 세션 종료 시 자동 로그아웃됩니다.</li>
              <li>관심종목 데이터는 Firebase Firestore에 저장되며, 삭제 요청 시 삭제됩니다.</li>
              <li>비로그인 사용자의 관심종목은 기기 식별자(deviceId) 기반으로 서버에 저장되며, 삭제 요청 시 삭제됩니다. 그 외 설정 데이터는 로컬 스토리지에 저장되며, 브라우저에서 직접 삭제할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-3">7. 사용자 권리</h2>
            <p>사용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 text-[var(--text-muted)] space-y-1">
              <li>수집된 개인정보 열람 요청</li>
              <li>개인정보 수정 또는 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
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
