"use client";

import { useEffect, useState } from "react";

/** 카카오톡 / 인스타 등 인앱 WebView 감지 (정식 브라우저 오탐 방지) */
function detectWebView(): { isWebView: boolean; isKakao: boolean; isAndroid: boolean } {
  if (typeof navigator === "undefined") return { isWebView: false, isKakao: false, isAndroid: false };
  const ua = navigator.userAgent;

  // 카카오톡 인앱 브라우저 — UA에 KAKAOTALK 명시됨
  const isKakao = /KAKAOTALK/i.test(ua);

  // Android 공식 WebView 플래그: "wv)" 포함 (Chrome, Samsung 등 정식 브라우저엔 없음)
  const isAndroidWebView = /Android/.test(ua) && /wv\)/.test(ua);

  // 인스타그램 / Facebook 인앱
  const isSocialApp = /Instagram|FBAN|FBAV/i.test(ua);

  const isAndroid = /Android/i.test(ua);
  return {
    isWebView: isKakao || isAndroidWebView || isSocialApp,
    isKakao,
    isAndroid,
  };
}

export function WebViewBanner() {
  const [info, setInfo] = useState<{ isWebView: boolean; isKakao: boolean; isAndroid: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInfo(detectWebView());
  }, []);

  if (!info?.isWebView || dismissed) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const chromeUrl = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="sticky top-0 z-40 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-3">
      <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-300">
          {info.isKakao ? "카카오톡 브라우저" : "인앱 브라우저"} — Google 로그인 불가
        </p>
        <p className="text-[11px] text-amber-200/70 font-mono mt-0.5">
          {info.isAndroid
            ? <>우측 상단 <span className="text-white">⋯</span> → 다른 브라우저로 열기</>
            : <>하단 공유 버튼(↑) → Safari로 열기</>}
        </p>
        {info.isAndroid && (
          <a
            href={chromeUrl}
            className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30 transition-colors"
          >
            Chrome으로 열기
          </a>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-300 text-lg leading-none shrink-0 mt-0.5"
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
