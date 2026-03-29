"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, Loader2, Sun, Moon } from "lucide-react";
import { fetchKospiFutures } from "@/lib/api";
import type { FuturesData, FuturesBar } from "@/lib/api";

function getKST() {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
}

function getMarketStatus(): "정규장" | "야간선물" | "장 마감" | "휴장" {
  const kst = getKST();
  const day = kst.getDay();
  const t = kst.getHours() * 60 + kst.getMinutes();
  if (day === 0 || day === 6) return "휴장";
  if (t >= 540 && t < 945) return "정규장";
  if (t >= 1080 || t < 360) return "야간선물";
  return "장 마감";
}

type TabType = "day" | "night";

function PriceCard({ data, loading, error }: { data: FuturesData | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">조회 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
      <div className="mb-1 text-xs text-[var(--text-faint)]">{data.name || data.code}</div>
      <div className="mb-3">
        <span className={`text-2xl font-bold ${data.change > 0 ? "text-red-400" : data.change < 0 ? "text-blue-400" : "text-[var(--text-primary)]"}`}>
          {data.price.toFixed(2)}
        </span>
        <span className={`ml-2 text-sm font-medium ${data.change > 0 ? "text-red-400" : data.change < 0 ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
          {data.change > 0 ? "▲" : data.change < 0 ? "▼" : ""}
          {" "}{data.change > 0 ? "+" : ""}{data.change.toFixed(2)}
          {" "}({data.changePct > 0 ? "+" : ""}{data.changePct.toFixed(2)}%)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {([
          ["시가", data.open],
          ["고가", data.high],
          ["저가", data.low],
          ["전일종가", data.prevClose],
          ["거래량", data.volume],
          ["베이시스", data.basis],
        ] as [string, number][]).map(([label, val]) => (
          <div key={label} className="rounded bg-[var(--bg-secondary)] p-2">
            <span className="text-[var(--text-faint)]">{label}</span>
            <p className="mt-0.5 font-mono text-[var(--text-secondary)]">
              {label === "거래량" ? val.toLocaleString() : val.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** IB 날짜 "YYYYMMDD HH:mm:ss" → lightweight-charts 시간값 (KST 표시용) */
function parseBarTime(dateStr: string): import("lightweight-charts").Time {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const rest = dateStr.slice(9, 17); // "HH:mm:ss" (타임존 접미사 제거)
  // KST 시간을 그대로 표시하기 위해 UTC로 간주
  const dt = new Date(`${y}-${m}-${d}T${rest}Z`);
  return Math.floor(dt.getTime() / 1000) as import("lightweight-charts").Time;
}

function FuturesChart({ bars, openPrice, prevClose }: { bars: FuturesBar[]; openPrice?: number; prevClose?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  const prevCountRef = useRef(0);
  const roRef = useRef<ResizeObserver | null>(null);

  // 시가 대비 상승/하락 색상
  const lastClose = bars.length > 0 ? bars[bars.length - 1].close : 0;
  const lineColor = openPrice && lastClose >= openPrice ? "#ef4444" : "#3b82f6";

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    let disposed = false;

    (async () => {
      const { createChart, LineSeries, ColorType, LineStyle } = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      // 차트가 이미 있으면 데이터만 업데이트
      if (chartRef.current && seriesRef.current) {
        seriesRef.current.applyOptions({ color: lineColor });
        if (bars.length > prevCountRef.current) {
          const newBars = bars.slice(prevCountRef.current);
          for (const bar of newBars) {
            seriesRef.current.update({
              time: parseBarTime(bar.date),
              value: bar.close,
            });
          }
        } else {
          seriesRef.current.setData(
            bars.map((b) => ({ time: parseBarTime(b.date), value: b.close }))
          );
        }
        prevCountRef.current = bars.length;
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const h = Math.min(rect.width * 0.6, 350);

      const chart = createChart(containerRef.current, {
        width: rect.width,
        height: h,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          horzLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#374151" },
          vertLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#374151" },
        },
      });

      const series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerRadius: 4,
      });

      const data = bars.map((b) => ({
        time: parseBarTime(b.date),
        value: b.close,
      }));
      series.setData(data);

      // 시가선 (주황 점선)
      if (openPrice && openPrice > 0) {
        series.createPriceLine({
          price: openPrice,
          color: "#f4a261",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "시가",
        });
      }

      // 전일종가선 (회색 점선)
      if (prevClose && prevClose > 0) {
        series.createPriceLine({
          price: prevClose,
          color: "#6b7280",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: "전일종가",
        });
      }

      // x축 최소 2시간 범위 보장
      const firstTime = parseBarTime(bars[0].date) as number;
      const lastTime = parseBarTime(bars[bars.length - 1].date) as number;
      const minRange = 2 * 60 * 60; // 2시간 (초)
      if (lastTime - firstTime < minRange) {
        chart.timeScale().setVisibleRange({
          from: firstTime as import("lightweight-charts").Time,
          to: (firstTime + minRange) as import("lightweight-charts").Time,
        });
      } else {
        chart.timeScale().fitContent();
      }

      chartRef.current = chart;
      seriesRef.current = series;
      prevCountRef.current = bars.length;

      // 반응형 리사이즈
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const w = entry.contentRect.width;
        chart.applyOptions({ width: w, height: Math.min(w * 0.6, 350) });
      });
      ro.observe(containerRef.current);
      roRef.current = ro;
    })();

    return () => {
      disposed = true;
    };
  }, [bars, lineColor, openPrice, prevClose]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (roRef.current && containerRef.current) {
        roRef.current.unobserve(containerRef.current);
        roRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        prevCountRef.current = 0;
      }
    };
  }, []);

  if (bars.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 text-center text-sm text-[var(--text-muted)]">
        차트 데이터가 없습니다
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">1분봉 차트</span>
        <span className="text-xs text-red-500">20분 지연데이터입니다. 참고 부탁드립니다.</span>
        <span className="text-[10px] text-[var(--text-faint)]">{bars.length}봉</span>
      </div>
      <div ref={containerRef} className="w-full" />
    </section>
  );
}

export default function FuturesTestPage() {
  const [tab, setTab] = useState<TabType>("day");
  const [dayData, setDayData] = useState<FuturesData | null>(null);
  const [nightData, setNightData] = useState<FuturesData | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [nightLoading, setNightLoading] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);
  const [nightError, setNightError] = useState<string | null>(null);

  const loadDay = useCallback(async (silent = false) => {
    if (!silent) { setDayLoading(true); setDayError(null); }
    try {
      const res = await fetchKospiFutures("day");
      setDayData(res);
      setDayError(null);
    } catch (err) {
      if (!silent) {
        setDayError(err instanceof Error ? err.message : "조회 실패");
        setDayData(null);
      }
    } finally {
      if (!silent) setDayLoading(false);
    }
  }, []);

  const loadNight = useCallback(async (silent = false) => {
    if (!silent) { setNightLoading(true); setNightError(null); }
    try {
      const res = await fetchKospiFutures("night");
      setNightData(res);
      setNightError(null);
    } catch (err) {
      if (!silent) {
        setNightError(err instanceof Error ? err.message : "조회 실패");
        setNightData(null);
      }
    } finally {
      if (!silent) setNightLoading(false);
    }
  }, []);

  const loadAll = useCallback((silent = false) => {
    loadDay(silent);
    loadNight(silent);
  }, [loadDay, loadNight]);

  useEffect(() => {
    loadAll(false);
    const timer = setInterval(() => loadAll(true), 30000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const status = getMarketStatus();
  const loading = tab === "day" ? dayLoading : nightLoading;

  const badgeColor =
    status === "정규장" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    status === "야간선물" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
    status === "장 마감" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-gray-500/20 text-gray-400 border-gray-500/30";

  const currentData = tab === "day" ? dayData : nightData;

  return (
    <div className="dark min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border-primary)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <a href="/" className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <h1 className="text-sm font-semibold">KOSPI200 선물</h1>
          <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${badgeColor}`}>{status}</span>
          <button
            type="button"
            onClick={() => loadAll()}
            disabled={loading}
            className="ml-auto flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* 주간/야간 탭 */}
        <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-secondary)] p-1">
          <button
            type="button"
            onClick={() => setTab("day")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === "day"
                ? "bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            주간
          </button>
          <button
            type="button"
            onClick={() => setTab("night")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === "night"
                ? "bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            야간
          </button>
        </div>

        {/* 시세 카드 */}
        <PriceCard
          data={currentData}
          loading={tab === "day" ? dayLoading : nightLoading}
          error={tab === "day" ? dayError : nightError}
        />

        {/* 분봉 차트 */}
        {tab === "day" && dayData?.bars && (
          <FuturesChart bars={dayData.bars} openPrice={dayData.open} prevClose={dayData.prevClose} />
        )}
        {tab === "night" && nightData?.bars && (
          <FuturesChart
            bars={nightData.bars.filter((b) => {
              const hh = parseInt(b.date.slice(9, 11), 10);
              return hh >= 18 || hh < 6;
            })}
            openPrice={nightData.open}
            prevClose={nightData.prevClose}
          />
        )}

      </div>
    </div>
  );
}
