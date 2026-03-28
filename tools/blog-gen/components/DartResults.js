'use client';

export default function DartResults({ data }) {
  if (!data) return null;

  const { hits = [], clean = [] } = data;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3">DART 공시 체크 결과</h2>

      {/* 히트 항목 */}
      {hits.length > 0 && (
        <div className="space-y-2 mb-3">
          {hits.map((hit, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-red-500/10 border border-red-500/30
                         rounded-md px-3 py-2"
            >
              <span className="text-red-400 shrink-0 mt-0.5">●</span>
              <div className="text-sm">
                <span className="text-red-300 font-medium">{hit.type}</span>
                <span className="text-slate-400 mx-1.5">—</span>
                <span className="text-slate-300">{hit.report_nm}</span>
                {hit.summary && (
                  <p className="text-slate-400 text-xs mt-1">{hit.summary}</p>
                )}
                {hit.url && (
                  <a
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline mt-1 inline-block"
                  >
                    공시 원문 보기
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 클린 항목 */}
      {clean.length > 0 && (
        <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30
                        rounded-md px-3 py-2">
          <span className="text-emerald-400 shrink-0 mt-0.5">●</span>
          <div className="text-sm">
            <span className="text-emerald-300 font-medium">클린</span>
            <span className="text-slate-400 mx-1.5">—</span>
            <span className="text-slate-400">{clean.join(', ')}</span>
          </div>
        </div>
      )}

      {hits.length === 0 && clean.length === 0 && (
        <p className="text-sm text-slate-500">공시 데이터 없음</p>
      )}
    </div>
  );
}
