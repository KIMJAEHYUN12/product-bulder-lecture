import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TocItem {
  id: string;
  label: string;
}

interface Props {
  title: string;
  subtitle: string;
  updatedAt: string;
  toc: TocItem[];
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function GuideLayout({ title, subtitle, updatedAt, toc, children, backHref = "/", backLabel = "홈으로" }: Props) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/25 transition-all font-bold text-xs mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            {backLabel}
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
          <p className="mt-2 text-[10px] text-gray-600 font-mono">{updatedAt}</p>
        </div>

        {/* 목차 */}
        <nav className="mb-8 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
          <p className="text-[11px] font-bold text-gray-400 mb-2 tracking-wide">목차</p>
          <ol className="space-y-1.5">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-baseline gap-2 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                >
                  <span className="text-[10px] text-gray-600 font-mono w-4 shrink-0">{i + 1}.</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 본문 */}
        <article className="flex flex-col gap-10 text-sm leading-relaxed text-zinc-300">
          {children}
        </article>

        {/* 면책 */}
        <div className="mt-12 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 text-center">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            본 가이드는 차트 분석 방법론을 소개하는 교육 자료이며,
            특정 종목의 매수·매도를 권유하지 않습니다.
            모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>

        {/* 다음/이전 가이드 */}
        <div className="mt-6 flex justify-center">
          <Link
            href={backHref}
            className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
          >
            &larr; {backLabel}으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-base font-bold text-white mb-3 scroll-mt-20">{title}</h2>
      {children}
    </section>
  );
}

export function HighlightBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "tip" }) {
  const styles = {
    info: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
    warn: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    tip: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",
  };
  return (
    <div className={`rounded-xl border p-4 text-xs leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function ImagePlaceholder({ caption }: { caption: string }) {
  return (
    <div className="my-4 rounded-xl border border-dashed border-[var(--border-primary)] bg-white/[0.02] p-8 text-center">
      <div className="text-gray-600 text-xs mb-1">[이미지 영역]</div>
      <p className="text-[11px] text-gray-500">{caption}</p>
    </div>
  );
}
