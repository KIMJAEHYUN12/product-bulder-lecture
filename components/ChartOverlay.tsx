"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { X, Eye, EyeOff, Download } from "lucide-react";
import type { ChartLine } from "@/types";

const LINE_COLORS: Record<ChartLine["type"], string> = {
  channel_top: "#ef4444",
  channel_bottom: "#22c55e",
  midline: "#facc15",
  support: "#22c55e",
  resistance: "#ef4444",
  trendline: "#3b82f6",
};

const LINE_LABELS: Record<ChartLine["type"], string> = {
  channel_top: "상단",
  channel_bottom: "하단",
  midline: "중앙",
  support: "지지",
  resistance: "저항",
  trendline: "추세",
};

interface Props {
  imageUrl: string;
  lines: ChartLine[];
  onClear?: () => void;
}

export function ChartOverlay({ imageUrl, lines, onClear }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [showLines, setShowLines] = useState(true);

  const drawLines = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPI 보정 (레티나 대응)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = imgSize.w * dpr;
    canvas.height = imgSize.h * dpr;
    canvas.style.width = `${imgSize.w}px`;
    canvas.style.height = `${imgSize.h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    if (!showLines || lines.length === 0) return;

    for (const line of lines) {
      if (line.points.length < 2) continue;

      const color = LINE_COLORS[line.type] || "#3b82f6";
      const isDashed = line.type === "midline" || line.style === "dashed";

      // % → 실제 픽셀 변환
      const pts = line.points.map((p) => ({
        px: (p.x / 100) * imgSize.w,
        py: (p.y / 100) * imgSize.h,
      }));

      // ── 선 그리기 (포인트 사이만, 연장 없음) ──
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(isDashed ? [6, 4] : []);
      ctx.globalAlpha = 0.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].px, pts[i].py);
      }
      ctx.stroke();

      // ── 포인트 마커 ──
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const pt of pts) {
        // 외곽 원
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        // 내부 흰 점
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      // ── 라벨 (마지막 포인트 옆에) ──
      const labelText = line.label || LINE_LABELS[line.type] || "";
      if (labelText) {
        const lastPt = pts[pts.length - 1];
        const lx = Math.min(lastPt.px + 8, imgSize.w - 80);
        const ly = lastPt.py + 4;

        ctx.font = "bold 10px 'Pretendard', monospace";
        const metrics = ctx.measureText(labelText);
        const pad = 3;
        const bgW = metrics.width + pad * 2;
        const bgH = 14;

        // 배경 박스
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect(lx - pad, ly - bgH + 2, bgW, bgH, 3);
        ctx.fill();

        // 텍스트
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillText(labelText, lx, ly - 2);
      }
    }
  }, [lines, imgSize, showLines]);

  useEffect(() => {
    drawLines();
  }, [drawLines]);

  // 이미지 사이즈 추적
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const img = container.querySelector("img");
      if (img && img.clientWidth > 0) {
        setImgSize({ w: img.clientWidth, h: img.clientHeight });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    const container = containerRef.current;
    if (!container) return;
    const img = container.querySelector("img");
    if (img && img.clientWidth > 0) {
      setImgSize({ w: img.clientWidth, h: img.clientHeight });
    }
  };

  // 합성 다운로드
  const handleDownload = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const img = container.querySelector("img") as HTMLImageElement | null;
    if (!img) return;

    const merged = document.createElement("canvas");
    merged.width = img.naturalWidth;
    merged.height = img.naturalHeight;
    const mctx = merged.getContext("2d");
    if (!mctx) return;

    mctx.drawImage(img, 0, 0);

    // 빗각선을 원본 이미지 해상도에 맞춰 다시 그리기
    const scaleX = img.naturalWidth / imgSize.w;
    const scaleY = img.naturalHeight / imgSize.h;

    for (const line of lines) {
      if (line.points.length < 2) continue;
      const color = LINE_COLORS[line.type] || "#3b82f6";
      const isDashed = line.type === "midline" || line.style === "dashed";
      const pts = line.points.map((p) => ({
        px: (p.x / 100) * imgSize.w * scaleX,
        py: (p.y / 100) * imgSize.h * scaleY,
      }));

      mctx.beginPath();
      mctx.strokeStyle = color;
      mctx.lineWidth = 3 * Math.max(scaleX, scaleY);
      mctx.setLineDash(isDashed ? [10, 8] : []);
      mctx.globalAlpha = 0.8;
      mctx.moveTo(pts[0].px, pts[0].py);
      for (let i = 1; i < pts.length; i++) {
        mctx.lineTo(pts[i].px, pts[i].py);
      }
      mctx.stroke();
    }

    const link = document.createElement("a");
    link.download = "mcr-bitgak-analysis.png";
    link.href = merged.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/30" ref={containerRef}>
      <Image
        src={imageUrl}
        alt="차트 분석"
        width={800}
        height={450}
        className="w-full h-auto block"
        unoptimized
        onLoad={handleImageLoad}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />

      {/* 컨트롤 버튼 */}
      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
        <button
          onClick={() => setShowLines((v) => !v)}
          className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-blue-600 rounded-full text-white transition-colors shadow"
          title={showLines ? "빗각 숨기기" : "빗각 보기"}
        >
          {showLines ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          onClick={handleDownload}
          className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-blue-600 rounded-full text-white transition-colors shadow"
          title="빗각 이미지 저장"
        >
          <Download size={14} />
        </button>
        {onClear && (
          <button
            onClick={onClear}
            className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors shadow"
            title="이미지 삭제"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 범례 */}
      {showLines && lines.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {lines.map((line, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[10px] text-white font-mono">
              <span
                className="inline-block w-4 h-[2px]"
                style={{
                  backgroundColor: LINE_COLORS[line.type] || "#3b82f6",
                  borderStyle: line.type === "midline" ? "dashed" : "solid",
                }}
              />
              {line.label || LINE_LABELS[line.type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
