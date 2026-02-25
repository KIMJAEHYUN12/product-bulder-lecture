"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, ImageIcon } from "lucide-react";
import Image from "next/image";

interface Props {
  previewUrl: string | null;
  onFile: (file: File) => void;
}

export function FileDropZone({ previewUrl, onFile }: Props) {
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
          ? "border-kim-red bg-red-50 dark:bg-red-950/20"
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
            alt="포트폴리오 미리보기"
            fill
            className="object-contain"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium">클릭하여 변경</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
          <div className="p-3 rounded-full bg-kim-gold/10">
            {isDragging ? (
              <ImageIcon size={32} className="text-kim-red" />
            ) : (
              <Upload size={32} className="text-kim-gold" />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
            포트폴리오 스크린샷을 드래그하거나
          </p>
          <span className="px-4 py-2 bg-kim-gold/90 hover:bg-kim-gold text-white text-sm rounded-lg transition-colors">
            파일 선택
          </span>
        </div>
      )}
    </motion.div>
  );
}
