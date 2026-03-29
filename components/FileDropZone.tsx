"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, ImageIcon, X, Camera } from "lucide-react";
import Image from "next/image";

interface Props {
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  mode?: "kim" | "makalong";
}

export function FileDropZone({ previewUrl, onFile, onClear, mode = "kim" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      // accept="image/*"가 브라우저 레벨에서 필터링하므로
      // file.type이 빈 문자열인 모바일 브라우저도 허용
      if (!file.type || file.type.startsWith("image/")) onFile(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
        ${isDragging
          ? mode === "makalong"
            ? "border-blue-400 bg-blue-500/15 dark:bg-blue-500/15 shadow-[0_0_30px_rgba(59,130,246,0.35)]"
            : "border-kim-red bg-red-500/15 dark:bg-red-500/15 shadow-[0_0_30px_rgba(230,57,70,0.35)]"
          : mode === "makalong"
            ? "border-blue-400/60 dark:border-blue-400/40 bg-gradient-to-b from-blue-50/80 to-white dark:from-blue-500/10 dark:to-gray-900/60 hover:border-blue-400 hover:shadow-[0_0_24px_rgba(59,130,246,0.2)]"
            : "border-indigo-400/60 dark:border-indigo-400/40 bg-gradient-to-b from-indigo-50/80 to-white dark:from-indigo-500/10 dark:to-gray-900/60 hover:border-indigo-400 hover:shadow-[0_0_24px_rgba(99,102,241,0.2)]"
        }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
        }}
      />

      {previewUrl ? (
        <div className="relative w-full h-56 rounded-xl overflow-hidden">
          <Image
            src={previewUrl}
            alt={mode === "makalong" ? "차트 미리보기" : "포트폴리오 미리보기"}
            fill
            className="object-contain"
            unoptimized
          />
          {/* X 삭제 버튼 */}
          {onClear && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center
                         bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors shadow"
              title="이미지 삭제"
            >
              <X size={14} />
            </button>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium">클릭하여 변경</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
          <motion.div
            animate={isDragging ? { scale: 1.15 } : { scale: [1, 1.08, 1] }}
            transition={isDragging ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className={`p-5 rounded-2xl ${mode === "makalong"
              ? "bg-blue-500/20 ring-2 ring-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
              : "bg-indigo-500/20 ring-2 ring-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"}`}
          >
            {isDragging ? (
              <ImageIcon size={40} className={mode === "makalong" ? "text-blue-400" : "text-indigo-400"} />
            ) : (
              <Camera size={40} className={mode === "makalong" ? "text-blue-400" : "text-indigo-400"} />
            )}
          </motion.div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white text-base font-black">
              {mode === "makalong"
                ? "차트 캡처를 올려주세요"
                : "포트폴리오 스크린샷을 올려주세요"}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              {mode === "makalong"
                ? "주봉 · 일봉 · 분봉 캔들 차트"
                : "증권앱 보유종목 화면 캡처"}
            </p>
          </div>
          <motion.span
            animate={{ boxShadow: [
              mode === "makalong"
                ? "0 0 0 0 rgba(59,130,246,0)"
                : "0 0 0 0 rgba(99,102,241,0)",
              mode === "makalong"
                ? "0 0 0 8px rgba(59,130,246,0.15)"
                : "0 0 0 8px rgba(99,102,241,0.15)",
              mode === "makalong"
                ? "0 0 0 0 rgba(59,130,246,0)"
                : "0 0 0 0 rgba(99,102,241,0)",
            ]}}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className={`px-6 py-3 text-white text-sm font-black rounded-xl transition-colors ${
              mode === "makalong"
                ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30"
                : "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30"
            }`}
          >
            클릭하여 파일 선택
          </motion.span>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center font-mono leading-relaxed">
            {mode === "makalong"
              ? "네이버증권 · 트레이딩뷰 · 키움 영웅문 차트 권장"
              : "종목명 · 수량 · 수익률이 보이면 정확도 UP"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
