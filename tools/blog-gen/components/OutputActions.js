'use client';

import { useState } from 'react';

export default function OutputActions({ outputDir, markdown, onRerun }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenFolder = async () => {
    if (!outputDir) return;
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: outputDir }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3">결과물</h2>
      <div className="flex gap-3">
        <button
          onClick={handleOpenFolder}
          disabled={!outputDir}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white
                     rounded-md text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📁 폴더 열기
        </button>
        <button
          onClick={handleCopy}
          disabled={!markdown}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
                     rounded-md text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? '✓ 복사됨' : '📋 마크다운 복사'}
        </button>
        <button
          onClick={onRerun}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white
                     rounded-md text-sm font-medium transition-colors"
        >
          🔄 재실행
        </button>
      </div>
    </div>
  );
}
