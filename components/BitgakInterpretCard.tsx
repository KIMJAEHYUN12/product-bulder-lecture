"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { BitgakMeta } from "@/types";

interface Props {
  meta: BitgakMeta;
  stockName: string;
}

const DIR_CONFIG = {
  "상승": { icon: TrendingUp, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", label: "상승 채널" },
  "하락": { icon: TrendingDown, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", label: "하락 채널" },
  "횡보": { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", label: "횡보 채널" },
  "판별불가": { icon: AlertTriangle, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", label: "채널 판별불가" },
} as const;

function formatPrice(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function BitgakInterpretCard({ meta, stockName }: Props) {
  const dir = DIR_CONFIG[meta.channelDirection];
  const DirIcon = dir.icon;

  const gaugePercent = meta.positionPercent != null
    ? Math.max(0, Math.min(100, meta.positionPercent))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-card rounded-2xl p-5 space-y-4"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📐</span>
          <h3 className="text-sm font-black text-gray-900 dark:text-white">빗각 해석</h3>
          <span className="text-[10px] text-gray-400 font-mono">{stockName}</span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          {meta.period.start} ~ {meta.period.end} ({meta.period.candleCount}봉)
        </span>
      </div>

      {/* 채널 방향 */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dir.bg}`}>
        <DirIcon size={20} className={dir.color} />
        <div>
          <div className={`text-sm font-black ${dir.color}`}>{dir.label}</div>
          {meta.channelPosition && (
            <div className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
              현재 위치: {meta.channelPosition}
            </div>
          )}
        </div>
      </div>

      {/* 채널 내 위치 게이지 */}
      {gaugePercent != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 font-mono">하단 지지</span>
            <span className="text-[10px] text-gray-500 font-mono">채널 내 위치</span>
            <span className="text-[10px] text-gray-500 font-mono">상단 저항</span>
          </div>
          <div className="relative h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            {/* 구간 색상 */}
            <div className="absolute inset-0 flex">
              <div className="w-1/3 bg-blue-500/20" />
              <div className="w-1/3 bg-yellow-500/10" />
              <div className="w-1/3 bg-red-500/20" />
            </div>
            {/* 현재 위치 인디케이터 */}
            <div
              className="absolute top-0 h-full w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              style={{ left: `calc(${gaugePercent}% - 2px)` }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
              {meta.positionPercent}%
            </span>
          </div>
        </div>
      )}

      {/* 3-3 원칙 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
          {meta.threeThree.highsMet
            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : <XCircle size={14} className="text-gray-400 shrink-0" />
          }
          <div>
            <div className="text-[10px] text-gray-400 font-mono">고점 피벗</div>
            <div className={`text-xs font-bold ${meta.threeThree.highsMet ? "text-emerald-500" : "text-gray-500"}`}>
              {meta.threeThree.highsCount}개 {meta.threeThree.highsMet ? "충족" : "미충족"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
          {meta.threeThree.lowsMet
            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : <XCircle size={14} className="text-gray-400 shrink-0" />
          }
          <div>
            <div className="text-[10px] text-gray-400 font-mono">저점 피벗</div>
            <div className={`text-xs font-bold ${meta.threeThree.lowsMet ? "text-emerald-500" : "text-gray-500"}`}>
              {meta.threeThree.lowsCount}개 {meta.threeThree.lowsMet ? "충족" : "미충족"}
            </div>
          </div>
        </div>
      </div>

      {/* S/R Flip */}
      {meta.srFlips.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 font-mono mb-1.5">S/R Flip 라인</div>
          <div className="flex flex-wrap gap-1.5">
            {meta.srFlips.map((label, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                <span className="inline-block w-2 h-[2px] bg-amber-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 가격 정보 */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "고가", value: formatPrice(meta.priceRange.high), color: "text-red-500" },
          { label: "저가", value: formatPrice(meta.priceRange.low), color: "text-blue-500" },
          { label: "현재가", value: formatPrice(meta.priceRange.current), color: "text-gray-900 dark:text-white" },
          {
            label: "변동률",
            value: `${meta.priceRange.changePct >= 0 ? "+" : ""}${meta.priceRange.changePct.toFixed(1)}%`,
            color: meta.priceRange.changePct >= 0 ? "text-red-500" : "text-blue-500",
          },
        ].map((item) => (
          <div key={item.label} className="text-center px-2 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
            <div className="text-[10px] text-gray-400 font-mono">{item.label}</div>
            <div className={`text-xs font-bold font-mono ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
