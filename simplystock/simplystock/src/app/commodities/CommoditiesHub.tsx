"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { ALL_COMMODITIES, CATEGORIES } from "@/data/commodities";
import type { CommodityCategory } from "@/data/commodities";
import { fetchCommodityPrices } from "@/lib/api";
import type { CommodityPriceData } from "@/lib/api";

export function CommoditiesHub() {
  const [activeCategory, setActiveCategory] = useState<CommodityCategory | "전체">("전체");
  const [prices, setPrices] = useState<Record<string, CommodityPriceData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const symbols = ALL_COMMODITIES.map((c) => c.symbol);
    fetchCommodityPrices(symbols)
      .then(setPrices)
      .catch(() => setPrices({}))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === "전체"
      ? ALL_COMMODITIES
      : ALL_COMMODITIES.filter((c) => c.category === activeCategory);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-8 sm:py-12">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-400 transition-all hover:bg-indigo-500/25 mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            홈으로
          </Link>
          <h1 className="text-xl sm:text-2xl font-black">원자재 시세</h1>
          <p className="mt-1 text-sm text-gray-500">
            29개 주요 원자재의 실시간 시세와 투자 정보
          </p>
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-1.5">
            {(["전체", ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 상품 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((commodity) => {
            const priceData = prices[commodity.symbol];
            const isUp = priceData && priceData.changePct > 0;
            const isDown = priceData && priceData.changePct < 0;

            return (
              <Link
                key={commodity.slug}
                href={`/commodities/${commodity.slug}/`}
                className="group rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-3 sm:p-4 transition-all hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                  <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
                    {commodity.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  {commodity.name}
                </h3>
                <p className="text-[10px] text-[var(--text-faint)]">{commodity.nameEn}</p>

                {loading ? (
                  <div className="mt-2 h-4 w-16 animate-pulse rounded bg-[var(--bg-card)]" />
                ) : priceData ? (
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-sm font-bold">
                      {priceData.currency === "USD" ? "$" : ""}
                      {priceData.price.toLocaleString(undefined, {
                        minimumFractionDigits: priceData.price < 10 ? 4 : priceData.price < 100 ? 2 : 0,
                        maximumFractionDigits: priceData.price < 10 ? 4 : priceData.price < 100 ? 2 : 0,
                      })}
                    </span>
                    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
                      isUp ? "text-red-400" : isDown ? "text-blue-400" : "text-[var(--text-muted)]"
                    }`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : null}
                      {isUp ? "+" : ""}{priceData.changePct.toFixed(2)}%
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-[var(--text-faint)]">가격 정보 없음</div>
                )}
              </Link>
            );
          })}
        </div>

        {/* 면책 */}
        <div className="mt-10 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 text-center">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            본 페이지의 원자재 시세는 Yahoo Finance에서 제공하는 지연 시세이며, 실시간 거래가와 차이가 있을 수 있습니다.
            모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <Link href="/" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">
            &larr; 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
