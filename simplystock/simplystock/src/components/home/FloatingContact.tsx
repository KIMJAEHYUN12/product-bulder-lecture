"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, Mail, X } from "lucide-react";

const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_cxlxhEX";
const EMAIL = "simplystock.official@gmail.com";

export function FloatingContact() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-xl p-3 w-52 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-primary)]">문의하기</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <a
              href={KAKAO_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <svg className="h-4 w-4 text-[#FEE500]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.9 3.33c-.08.3.26.54.52.37l3.87-2.57c.6.08 1.22.13 1.85.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z" />
              </svg>
              카카오톡 채널
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <Mail className="h-4 w-4 text-indigo-400" />
              이메일 문의
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 transition-colors"
        aria-label="문의하기"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
