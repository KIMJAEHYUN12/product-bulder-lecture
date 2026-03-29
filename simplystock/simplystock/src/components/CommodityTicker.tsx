"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import Link from "next/link";
import { fetchCommodities } from "@/lib/api";
import type { CommodityItem } from "@/lib/api";
import { getCommoditySlugFromKey } from "@/data/commodities";

export function CommodityTicker() {
  const [items, setItems] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommodities()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/commodities/"
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
          원자재 시세
        </Link>
        <Link href="/commodities/" className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-white transition-colors">
          전체보기 &rarr;
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-[var(--bg-card)]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item) => {
            const slug = getCommoditySlugFromKey(item.key);
            const href = slug ? `/commodities/${slug}/` : "/commodities/";

            return (
              <Link
                key={item.key}
                href={href}
                className="rounded-lg bg-[var(--bg-card)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-secondary)]"
              >
                <div className="text-xs text-[var(--text-secondary)]">
                  {item.name}
                </div>
                <div className="mt-0.5 text-sm font-semibold">
                  {item.currency === "USD" ? "$" : ""}
                  {item.price.toLocaleString(undefined, {
                    minimumFractionDigits: item.price < 100 ? 2 : 0,
                    maximumFractionDigits: item.price < 100 ? 2 : 0,
                  })}
                </div>
                <div
                  className={`mt-0.5 text-[11px] ${
                    item.changePct > 0
                      ? "text-red-400"
                      : item.changePct < 0
                        ? "text-blue-400"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {item.changePct > 0 ? "+" : ""}
                  {item.changePct.toFixed(2)}%
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
