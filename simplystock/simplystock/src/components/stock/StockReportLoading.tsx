"use client";

export default function StockReportLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 등급 카드 */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-[var(--bg-secondary)]" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-[var(--bg-secondary)]" />
            <div className="h-4 w-48 rounded bg-[var(--bg-secondary)]" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[var(--bg-secondary)]" />
          ))}
        </div>
      </div>

      {/* 분석 섹션 x 3 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4"
        >
          <div className="mb-3 h-5 w-24 rounded bg-[var(--bg-secondary)]" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-[var(--bg-secondary)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--bg-secondary)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--bg-secondary)]" />
          </div>
        </div>
      ))}

      <p className="text-center text-sm text-[var(--text-muted)]">
        AI가 분석 중입니다... (최대 30초 소요)
      </p>
    </div>
  );
}
