import type { PortfolioSnapshot } from "@/types/social";

interface Props {
  snapshot: PortfolioSnapshot;
}

export function PortfolioSnapshotCard({ snapshot }: Props) {
  const pctColor =
    snapshot.returnPct > 0
      ? "text-red-500"
      : snapshot.returnPct < 0
        ? "text-blue-500"
        : "text-gray-500";

  return (
    <div className="mt-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono text-indigo-400">포트폴리오</span>
        <span className={`text-xs font-bold font-mono ${pctColor}`}>
          {snapshot.returnPct > 0 ? "+" : ""}
          {snapshot.returnPct.toFixed(2)}%
        </span>
      </div>
      <div className="text-xs font-mono text-gray-600 dark:text-zinc-300 mb-1.5">
        총 자산 {Math.round(snapshot.totalAsset).toLocaleString("ko-KR")}원
      </div>
      {snapshot.holdings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {snapshot.holdings.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-[10px] font-mono text-indigo-300"
            >
              {h.name}
              <span className={h.pnlPct >= 0 ? "text-red-400" : "text-blue-400"}>
                {h.pnlPct > 0 ? "+" : ""}
                {h.pnlPct.toFixed(1)}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
