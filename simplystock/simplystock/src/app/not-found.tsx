import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] px-4">
      <p className="text-6xl font-black text-indigo-500 mb-4">404</p>
      <h1 className="text-lg font-bold mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8 text-center">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-500/15 border border-indigo-500/40 px-5 py-2.5 text-sm font-bold text-indigo-400 hover:bg-indigo-500/25 transition-all"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
