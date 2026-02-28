"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { GameCandle } from "@/types";

interface Props {
  visibleCandles: GameCandle[];
  hiddenCandles: GameCandle[];
  phase: "guessing" | "revealing" | "result" | "gameover";
  onRevealComplete?: () => void;
}

export function GameChart({ visibleCandles, hiddenCandles, phase, onRevealComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<any>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [chartReady, setChartReady] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Normalize candles: shift prices so first visible candle starts at 100
  const normalizeCandles = useCallback((candles: GameCandle[]) => {
    if (candles.length === 0) return [];
    const base = candles[0].open;
    if (base === 0) return candles;
    const ratio = 100 / base;
    return candles.map((c) => ({
      time: c.time,
      open: Math.round(c.open * ratio * 100) / 100,
      high: Math.round(c.high * ratio * 100) / 100,
      low: Math.round(c.low * ratio * 100) / 100,
      close: Math.round(c.close * ratio * 100) / 100,
    }));
  }, []);

  // Create chart when visible candles change (new round)
  useEffect(() => {
    if (!containerRef.current || visibleCandles.length === 0) return;

    setChartReady(false);
    let cancelled = false;

    (async () => {
      const { createChart, CandlestickSeries } = await import("lightweight-charts");
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;

      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }

      const chart = createChart(container, {
        width: container.clientWidth,
        height: Math.min(container.clientWidth * 0.6, 360),
        layout: {
          background: { color: "#0a0a0a" },
          textColor: "#6b7280",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.03)" },
          horzLines: { color: "rgba(255,255,255,0.03)" },
        },
        rightPriceScale: {
          visible: false,
          borderColor: "rgba(255,255,255,0.1)",
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: false,
          fixLeftEdge: true,
          fixRightEdge: false,
        },
        crosshair: { mode: 0 },
      });

      chartRef.current = chart;

      const normalized = normalizeCandles(visibleCandles);

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });

      series.setData(normalized.map((c) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));

      candleSeriesRef.current = series;
      chart.timeScale().fitContent();

      // Resize handler
      const ro = new ResizeObserver(() => {
        if (chartRef.current && container) {
          chartRef.current.applyOptions({
            width: container.clientWidth,
            height: Math.min(container.clientWidth * 0.6, 360),
          });
        }
      });
      ro.observe(container);

      setChartReady(true);
    })();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCandles, normalizeCandles]);

  // Reveal animation — waits for chartReady
  useEffect(() => {
    if (phase !== "revealing" || !chartReady || !candleSeriesRef.current || hiddenCandles.length === 0) return;

    // Show price axis
    if (chartRef.current) {
      chartRef.current.applyOptions({ rightPriceScale: { visible: true } });
    }

    const allCandles = normalizeCandles([...visibleCandles, ...hiddenCandles]);
    let idx = 0;
    setRevealedCount(0);

    const timer = setInterval(() => {
      if (!candleSeriesRef.current) { clearInterval(timer); return; }
      const candleIdx = visibleCandles.length + idx;
      if (candleIdx >= allCandles.length) {
        clearInterval(timer);
        if (chartRef.current) chartRef.current.timeScale().fitContent();
        onRevealComplete?.();
        return;
      }

      const dataSlice = allCandles.slice(0, candleIdx + 1);
      candleSeriesRef.current.setData(dataSlice.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));

      idx++;
      setRevealedCount(idx);
    }, 60);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chartReady]);

  // When going to result/gameover, ensure full chart is shown
  useEffect(() => {
    if ((phase === "result" || phase === "gameover") && chartRef.current && candleSeriesRef.current) {
      chartRef.current.applyOptions({ rightPriceScale: { visible: true } });
      const allCandles = normalizeCandles([...visibleCandles, ...hiddenCandles]);
      candleSeriesRef.current.setData(allCandles.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })));
      chartRef.current.timeScale().fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a]">
      <div ref={containerRef} className="w-full" />

      {/* Curtain overlay during guessing */}
      {phase === "guessing" && (
        <div className="absolute right-0 top-0 bottom-0 w-[30%] sm:w-[22%] bg-gradient-to-r from-transparent via-gray-950/80 to-gray-950 flex items-center justify-center z-10 pointer-events-none">
          <motion.div
            className="text-4xl sm:text-5xl text-white/80"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            ?
          </motion.div>
        </div>
      )}

      {/* Reveal progress */}
      {phase === "revealing" && hiddenCandles.length > 0 && (
        <div className="absolute top-2 right-3 z-10 text-[10px] font-mono text-gray-500">
          {revealedCount}/{hiddenCandles.length}
        </div>
      )}
    </div>
  );
}
