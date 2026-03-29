"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-6xl">😱</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">시스템 오류 발생</h2>
        <p className="text-gray-400 text-sm font-mono mb-2">
          잠시 서버가 흔들렸습니다. 다시 시도해주세요.
        </p>
        {error?.message && (
          <p className="text-gray-600 text-[10px] font-mono mb-4 max-w-xs mx-auto truncate">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-mono rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
