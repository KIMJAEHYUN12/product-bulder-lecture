"use client";

import { useState } from "react";
import { X, Link2, Download } from "lucide-react";
import { kakaoShareFeed } from "@/lib/kakaoShare";

interface Props {
  open: boolean;
  onClose: () => void;
  onShare?: () => void;
  imageDataUrl?: string;
  shareText: string;
  shareUrl?: string;
  imageFileName?: string;
  kakaoTitle?: string;
  kakaoDescription?: string;
  kakaoButtonTitle?: string;
}

const SITE_URL = "https://simplystock.co.kr";

export function ShareModal({
  open,
  onClose,
  onShare,
  imageDataUrl,
  shareText,
  shareUrl,
  imageFileName,
  kakaoTitle,
  kakaoDescription,
  kakaoButtonTitle,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const url = shareUrl ?? SITE_URL;

  const handleKakao = async () => {
    await kakaoShareFeed({
      title: kakaoTitle ?? shareText.slice(0, 50),
      description: kakaoDescription ?? shareText,
      imageDataUrl,
      shareUrl: url,
      buttonTitle: kakaoButtonTitle,
    });
    onShare?.();
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(shareText);
    const u = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${u}`, "_blank", "noopener");
    onShare?.();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = `${shareText}\n${url}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onShare?.();
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = imageFileName ?? "simplystock-share.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "shareModalIn 0.2s ease-out" }}
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-4 text-base font-semibold">공유하기</h3>

        {/* 이미지 미리보기 */}
        {imageDataUrl && (
          <div className="mb-4 overflow-hidden rounded-xl border border-[var(--border-secondary)]">
            <img src={imageDataUrl} alt="공유 이미지" className="w-full" />
          </div>
        )}

        {/* 공유 버튼들 */}
        <div className="space-y-2">
          {/* 카카오톡 */}
          <button
            type="button"
            onClick={handleKakao}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#3C1E1E] hover:bg-[#FDD835] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-.9 3.33c-.08.3.26.54.52.37l3.87-2.57c.6.08 1.22.13 1.85.13 5.52 0 10-3.58 10-7.93S17.52 3 12 3z" />
            </svg>
            카카오톡 공유
          </button>

          {/* 하단 3개 가로 배치 */}
          <div className="grid grid-cols-3 gap-2">
            {/* X/Twitter */}
            <button
              type="button"
              onClick={handleTwitter}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X</span>
            </button>

            {/* 링크 복사 */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <Link2 className="h-4 w-4" />
              <span>{copied ? "복사 완료!" : "링크 복사"}</span>
            </button>

            {/* 이미지 저장 */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageDataUrl}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>이미지 저장</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shareModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
