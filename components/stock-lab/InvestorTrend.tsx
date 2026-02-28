"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { InvestorTrendData } from "@/types";

const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

interface Props {
  stocks: { symbol: string; name: string }[];
  investorMap: Record<string, InvestorTrendData>;
  isLoading: boolean;
  onLoad: (symbol: string) => void;
}

function formatQty(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-center">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color }}>
        {value >= 0 ? "+" : ""}
        {formatQty(value)}
      </p>
    </div>
  );
}

export function InvestorTrend({ stocks, investorMap, isLoading, onLoad }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const activeStock = stocks[activeTab] || stocks[0];
  const data = activeStock ? investorMap[activeStock.symbol] : undefined;
  const loaded = data !== undefined;

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      date: d.date ? `${d.date.slice(4, 6)}/${d.date.slice(6)}` : "",
      foreign: d.foreign,
      institution: d.institution,
      individual: d.individual,
    }));
  }, [data]);

  if (stocks.length === 0) {
    return (
      <div className="text-xs text-gray-500 font-mono py-8 text-center">
        종목을 선택하면 투자자별 순매수 추이를 확인할 수 있습니다
      </div>
    );
  }

  return (
    <div>
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

      {!loaded && activeStock && (
        <button
          onClick={() => onLoad(activeStock.symbol)}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {isLoading ? "로딩 중..." : "수급 데이터 불러오기"}
        </button>
      )}

      {loaded && data && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard label="외국인" value={data.summary.foreign} color="#ef4444" />
            <SummaryCard label="기관" value={data.summary.institution} color="#3b82f6" />
            <SummaryCard label="개인" value={data.summary.individual} color="#10b981" />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] text-gray-500 font-mono mb-2">최근 20일 순매수 추이 (주)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatQty}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(val, name) => {
                      const v = typeof val === "number" ? val : 0;
                      const n = name ?? "";
                      return [
                        formatQty(v),
                        n === "foreign" ? "외국인" : n === "institution" ? "기관" : "개인",
                      ];
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "foreign" ? "외국인" : value === "institution" ? "기관" : "개인"
                    }
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <ReferenceLine y={0} stroke="#374151" />
                  <Bar dataKey="foreign" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="institution" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="individual" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {isLoading && !data && (
        <div className="text-xs text-gray-500 font-mono text-center py-4 animate-pulse">
          투자자 데이터 로딩 중...
        </div>
      )}
    </div>
  );
}
