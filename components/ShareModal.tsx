"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { kakaoShareFeed } from "@/lib/kakaoShare";
import { grantExp } from "@/lib/rpgExp";

const SITE_URL = "https://bitgak.co.kr";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl?: string;
  imageCopied?: boolean;
  shareText: string;
  shareUrl?: string;
  imageFileName?: string;
}

export function ShareModal({
  open,
  onClose,
  imageDataUrl,
  imageCopied,
  shareText,
  shareUrl = SITE_URL,
  imageFileName = "ovision-share.png",
}: ShareModalProps) {
  const [copyTextDone, setCopyTextDone] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  function handleDownload() {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = imageFileName;
    a.click();
    grantExp("share_content");
  }

  function handleTwitter() {
    const url =
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    grantExp("share_content");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopyLinkDone(true);
    setTimeout(() => setCopyLinkDone(false), 2000);
    grantExp("share_content");
  }

  async function handleKakao() {
    setKakaoLoading(true);
    try {
      await kakaoShareFeed({
        title: shareText.split("\n")[0] || "오비젼 AI 팩폭 진단",
        description: shareText.split("\n").slice(1).join(" ").trim() || "포트폴리오 분석 결과를 확인하세요",
        imageDataUrl,
        shareUrl,
      });
      grantExp("share_content");
    } finally {
      setKakaoLoading(false);
    }
  }

  async function handleCopyText() {
    await navigator.clipboard
      .writeText(`${shareText}\n\n${shareUrl}`)
      .catch(() => {});
    setCopyTextDone(true);
    setTimeout(() => setCopyTextDone(false), 2000);
    grantExp("share_content");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
          >
            {/* Image preview */}
            {imageDataUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageDataUrl}
                alt="공유 카드"
                className="w-full block"
              />
            )}

            <div className="p-4 flex flex-col gap-2">
              {/* Clipboard image banner */}
              {imageCopied ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 font-bold text-sm mb-0.5">
                    이미지가 클립보드에 복사됐어요!
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">
                      Ctrl+V
                    </kbd>
                    로 붙여넣기
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-mono text-center">
                  이미지를 저장하거나 공유하세요
                </p>
              )}

              {/* button grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleKakao}
                  disabled={kakaoLoading}
                  className="col-span-2 py-3 rounded-xl bg-[#FEE500] text-[#191919] font-bold text-sm hover:bg-[#FDD835] transition-colors disabled:opacity-60"
                >
                  {kakaoLoading ? "공유 준비중..." : "카카오톡 공유"}
                </button>
                {imageDataUrl && (
                  <button
                    onClick={handleDownload}
                    className="py-2.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors"
                  >
                    이미지 저장
                  </button>
                )}
                <button
                  onClick={handleTwitter}
                  className="py-2.5 rounded-xl bg-black text-white font-bold text-sm border border-white/20 hover:bg-white/10 transition-colors"
                >
                  X / Twitter
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    copyLinkDone
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-gray-200 hover:bg-white/20"
                  }`}
                >
                  {copyLinkDone ? "복사됨!" : "링크 복사"}
                </button>
                <button
                  onClick={handleCopyText}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    copyTextDone
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-gray-200 hover:bg-white/20"
                  }`}
                >
                  {copyTextDone ? "복사됨!" : "텍스트 복사"}
                </button>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-gray-600 font-mono hover:text-gray-400 transition-colors"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
