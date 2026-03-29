"use client";

import { CommodityPriceCard } from "./CommodityPriceCard";
import type { CommodityInfo } from "@/data/commodities";

interface Props {
  commodity: CommodityInfo;
}

export function CommodityDetail({ commodity }: Props) {
  return (
    <div className="space-y-6">
      <CommodityPriceCard
        symbol={commodity.symbol}
        name={commodity.name}
        exchange={commodity.exchange}
        unit={commodity.unit}
      />

      {/* 개요 */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 scroll-mt-20" id="overview">개요</h2>
        <p className="text-sm leading-relaxed text-zinc-300">{commodity.description}</p>
      </section>

      {/* 가격 변동 요인 */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 scroll-mt-20" id="price-drivers">가격 변동 요인</h2>
        <div className="space-y-2">
          {commodity.priceDrivers.map((driver, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
                {i + 1}
              </span>
              <span className="text-xs text-zinc-300 leading-relaxed">{driver}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 투자 방법 */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 scroll-mt-20" id="investment">투자 방법</h2>
        <div className="space-y-2">
          {commodity.investmentMethods.map((method, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                {i + 1}
              </span>
              <span className="text-xs text-zinc-300 leading-relaxed">{method}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 관련 ETF */}
      {commodity.relatedEtfs.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-white mb-3 scroll-mt-20" id="related-etf">관련 ETF</h2>
          <div className="flex flex-wrap gap-2">
            {commodity.relatedEtfs.map((etf) => (
              <span
                key={etf}
                className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                {etf}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 리스크 요인 */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 scroll-mt-20" id="risk">리스크 요인</h2>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed text-amber-300">
            {commodity.riskFactors.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
