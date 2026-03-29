"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { BotDailySnapshot } from "@/types";

interface BotReturnChartProps {
  snapshots: BotDailySnapshot[];
  color: string;
}

const COLOR_MAP: Record<string, string> = {
  cyan: "#06b6d4",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

export function BotReturnChart({ snapshots, color }: BotReturnChartProps) {
  if (snapshots.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-[var(--text-muted)]">
        데이터 수집 중...
      </div>
    );
  }

  const lineColor = COLOR_MAP[color] || "#6366f1";
  const data = snapshots.map((s) => ({
    date: s.date.slice(5), // MM-DD
    returnPct: s.returnPct,
  }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-primary)",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, "수익률"]}
          />
          <ReferenceLine y={0} stroke="var(--border-primary)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="returnPct"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
