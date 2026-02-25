"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { FileDropZone } from "@/components/FileDropZone";
import { RoastButton } from "@/components/RoastButton";
import { KimCharacter } from "@/components/KimCharacter";
import { RoastResult } from "@/components/RoastResult";
import { AnalysisReport } from "@/components/AnalysisReport";
import { useRoastFlow } from "@/hooks/useRoastFlow";

export default function Home() {
  const { state, loadImage, startRoast, reset } = useRoastFlow();
  const { previewUrl, isLoading, roast, analysis, scores, error, grade, kimExpression } = state;

  const hasImage = !!previewUrl;
  const hasResult = !!roast || !!error;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
              독설가 킴의
              <br />
              <span className="text-kim-red">팩폭 주식 상담소</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              포트폴리오 올려봐요. 뼈 때려드릴게요.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Main grid: left input panel + right results ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── LEFT: upload + controls ── */}
          <div className="flex flex-col gap-4">
            {/* Kim character */}
            <div className="flex justify-center">
              <KimCharacter expression={kimExpression} isLoading={isLoading} />
            </div>

            {/* Drop zone */}
            <FileDropZone previewUrl={previewUrl} onFile={loadImage} />

            {/* CTA */}
            <RoastButton
              disabled={!hasImage}
              isLoading={isLoading}
              hasResult={hasResult}
              onClick={startRoast}
            />

            {/* Reset */}
            {hasResult && !isLoading && (
              <div className="text-center">
                <button
                  onClick={reset}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                             underline underline-offset-2 transition-colors"
                >
                  새 포트폴리오로 시작
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: results (roast receipt + analysis report) ── */}
          <div className="flex flex-col gap-6">
            {/* Roast receipt */}
            <RoastResult roast={roast} error={error} grade={grade} />

            {/* AI financial report */}
            <AnalysisReport analysis={analysis} scores={scores} />
          </div>

        </div>
      </div>
    </main>
  );
}
