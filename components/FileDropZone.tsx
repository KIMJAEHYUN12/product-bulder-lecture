"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, ImageIcon, X } from "lucide-react";
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
      if (file.type.startsWith("image/")) onFile(file);
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
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer
        ${isDragging
          ? mode === "makalong"
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-kim-red bg-red-50 dark:bg-red-950/20"
          : mode === "makalong"
            ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-kim-gold"
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
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
          <div className={`p-3 rounded-full ${mode === "makalong" ? "bg-blue-500/10" : "bg-kim-gold/10"}`}>
            {isDragging ? (
              <ImageIcon size={32} className={mode === "makalong" ? "text-blue-500" : "text-kim-red"} />
            ) : (
              <Upload size={32} className={mode === "makalong" ? "text-blue-400" : "text-kim-gold"} />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
            {mode === "makalong"
              ? "차트 캡처(주봉·일봉·분봉)를 드래그하거나"
              : "포트폴리오 스크린샷을 드래그하거나 클릭하세요"}
          </p>
          <span className={`px-4 py-2 text-white text-sm rounded-lg transition-colors ${
            mode === "makalong" ? "bg-blue-500/90 hover:bg-blue-500" : "bg-kim-gold/90 hover:bg-kim-gold"
          }`}>
            파일 선택
          </span>
          {mode === "makalong" ? (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 font-mono leading-relaxed">
              권장: 네이버증권 · 트레이딩뷰 · 키움 영웅문 차트<br />
              캔들 차트 + 거래량 포함 캡처 시 정확도 UP
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 font-mono leading-relaxed">
              증권앱 보유종목 화면을 캡처해서 올려주세요<br />
              종목명 · 수량 · 수익률이 보이면 정확도 UP
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
