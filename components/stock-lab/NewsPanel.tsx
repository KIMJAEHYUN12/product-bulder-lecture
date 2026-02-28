"use client";

import { useState } from "react";
import type { StockNewsItem } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  newsMap: Record<string, StockNewsItem[]>;
}

export function NewsPanel({ stocks, newsMap }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  if (stocks.length === 0) return null;

  const activeStock = stocks[activeTab] || stocks[0];
  const news = newsMap[activeStock?.symbol] || [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-black text-white mb-3">관련 뉴스</h3>

      {/* 탭 */}
      {stocks.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {stocks.map((s, i) => (
            <button
              key={s.symbol}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap ${
                activeTab === i
                  ? "text-white"
                  : "bg-white/5 text-gray-500 hover:text-gray-300"
              }`}
              style={
                activeTab === i
                  ? { backgroundColor: STOCK_COLORS[i] + "cc" }
                  : undefined
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* 뉴스 목록 */}
      {news.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono py-4 text-center">
          뉴스를 불러오는 중...
        </div>
      ) : (
        <ul className="space-y-2">
          {news.slice(0, 5).map((item, i) => (
            <li key={i}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-300 hover:text-white transition-colors leading-relaxed"
              >
                <span className="text-gray-500 mr-1.5">{i + 1}.</span>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
