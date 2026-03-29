'use client';

import { useState } from 'react';

export default function OutputActions({ outputDir, markdown, renderedHtml, onRerun }) {
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const handleCopyRich = async () => {
    if (!renderedHtml) return;
    try {
      const blob = new Blob([renderedHtml], { type: 'text/html' });
      const textBlob = new Blob([markdown || ''], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ]);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2000);
    } catch {
      // fallback: 임시 div에 HTML을 넣고 선택 후 복사
      const div = document.createElement('div');
      div.innerHTML = renderedHtml;
      div.style.position = 'fixed';
      div.style.left = '-9999px';
      document.body.appendChild(div);
      const range = document.createRange();
      range.selectNodeContents(div);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      document.body.removeChild(div);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2000);
    }
  };

  const handleCopyRaw = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
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
          폴더 열기
        </button>
        <button
          onClick={handleCopyRich}
          disabled={!renderedHtml}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
                     rounded-md text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedRich ? '복사됨' : '서식 복사'}
        </button>
        <button
          onClick={handleCopyRaw}
          disabled={!markdown}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white
                     rounded-md text-sm font-medium transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copiedRaw ? '복사됨' : '원문 복사'}
        </button>
        <button
          onClick={onRerun}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white
                     rounded-md text-sm font-medium transition-colors"
        >
          재실행
        </button>
      </div>
    </div>
  );
}
