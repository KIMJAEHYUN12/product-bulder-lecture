"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StockGradeCard } from "./StockGradeCard";
import { ShareModal } from "./ShareModal";
import { generateAnalysisShareImage } from "@/lib/analysisShareImage";
import type { Grade, PortfolioScores, AnalysisMode } from "@/types";

/* ── 텍스트 포맷팅 헬퍼 ── */

const NUM_RE = /[+-]?\d[\d,.~]*%|\([+-]?\d[\d,.]*[만억천원$/\w]*\)|\$\d[\d,.]*[/\w]*|[+-]\d[\d,.]*[만억천원]+/g;

function highlightNumbers(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    const neg = s.startsWith("-") || s.startsWith("(-");
    const pos = s.startsWith("+") || s.startsWith("(+");
    const cls = neg
      ? "text-red-500 dark:text-red-400 font-bold"
      : pos
        ? "text-emerald-600 dark:text-emerald-400 font-bold"
        : "font-bold text-gray-900 dark:text-white";
    parts.push(<span key={k++} className={cls}>{s}</span>);
    last = m.index + s.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

function extractAdvice(text: string) {
  const kimRe = /💊\s*액막이\s*한마디\s*[:：]\s*([\s\S]*)/;
  const mcrRe = /📐\s*MC\.?R\s*결론\s*[:：]\s*([\s\S]*)/;
  const km = kimRe.exec(text);
  if (km) return { main: text.slice(0, km.index).trim(), advice: km[1].trim(), adviceType: "kim" as const };
  const mm = mcrRe.exec(text);
  if (mm) return { main: text.slice(0, mm.index).trim(), advice: mm[1].trim(), adviceType: "mcr" as const };
  return { main: text, advice: null, adviceType: "kim" as const };
}

function splitParagraphs(text: string): string[] {
  if (text.includes("\n")) return text.split(/\n+/).filter((s) => s.trim());
  if (text.length < 80) return [text];
  const safe = text.replace(/\.\.\./g, "\u2026");
  const sentences = safe.split(/(?<=[.?!])\s+/).map((s) => s.replace(/\u2026/g, "..."));
  if (sentences.length <= 2) return [text];
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const g = sentences.slice(i, Math.min(i + 2, sentences.length)).join(" ");
    if (g.trim()) result.push(g.trim());
  }
  return result;
}

/* ── 컴포넌트 ── */

interface Props {
  roast: string | null;
  error: string | null;
  grade: Grade;
  mode?: AnalysisMode;
  isStreaming?: boolean;
  scores?: PortfolioScores | null;
}

interface SharePreview {
  dataUrl: string;
  text: string;
  imageCopied: boolean;
}

const SITE_URL = "https://bitgak.co.kr";

function getShareUrl(mode: AnalysisMode): string {
  return mode === "makalong" ? `${SITE_URL}?mode=makalong` : SITE_URL;
}

export function RoastResult({ roast, error, grade, mode = "kim", isStreaming = false, scores }: Props) {
  const headerLines =
    mode === "makalong"
      ? ["================================", "      오비젼 빗각 분석 리포트       ", "================================"]
      : ["================================", "      오비젼의 팩폭 영수증       ", "================================"];

  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("ko-KR"));
  }, []);

  useEffect(() => {
    if (!roast) {
      setDisplayed("");
      setIsTyping(false);
      wasStreamingRef.current = false;
      return;
    }

    if (isStreaming) {
      wasStreamingRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTyping(false);
      setDisplayed(roast);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayed("");
    setIsTyping(true);

    let i = 0;
    const fullText = roast;

    function typeNext() {
      if (i < fullText.length) {
        setDisplayed(fullText.slice(0, i + 1));
        i++;
        timerRef.current = setTimeout(typeNext, 18);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 18);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roast, isStreaming]);

  async function handleShareImage() {
    if (!roast || !grade || sharingLoading) return;
    setSharingLoading(true);
    const shareUrl = getShareUrl(mode);
    const label = mode === "makalong" ? "오비젼 빗각 분석" : "오비젼 팩폭 진단";
    const preview = roast.slice(0, 60).replace(/\n/g, " ") + "...";
    const friendlyText = `[${label}] 등급: ${grade}급\n"${preview}"\n\n오비젼에서 분석 받아봐`;

    try {
      const blob = await generateAnalysisShareImage(grade, roast, scores ?? null, mode);
      if (!blob) return;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let imageCopied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        imageCopied = true;
      } catch { /* clipboard image not supported */ }

      setSharePreview({ dataUrl, text: friendlyText, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {(roast || error) && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-900 overflow-hidden shadow-xl"
          >
            {/* Receipt header */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <pre className="text-xs font-mono text-gray-500 dark:text-zinc-400 text-center leading-tight">
                {headerLines.join("\n")}
              </pre>
            </div>

            {/* Grade badge */}
            {grade && (
              <div className="flex justify-center pt-4 pb-2">
                <StockGradeCard grade={grade} />
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4">
              {error ? (
                <p className="text-red-500 dark:text-red-400 text-sm font-mono">
                  ⚠ {error}
                </p>
              ) : (
                (() => {
                  const showCursor = isStreaming || isTyping;
                  const isDone = !showCursor;
                  const { main, advice, adviceType } = isDone
                    ? extractAdvice(displayed)
                    : { main: displayed, advice: null, adviceType: "kim" as const };
                  const paragraphs = main ? splitParagraphs(main) : [];
                  return (
                    <div className="space-y-3">
                      {paragraphs.map((p, i) => (
                        <p key={i} className="text-gray-800 dark:text-gray-200 text-[13px] leading-[1.9]">
                          {highlightNumbers(p)}
                          {showCursor && i === paragraphs.length - 1 && (
                            <span className="inline-block w-0.5 h-4 bg-kim-red ml-0.5 animate-type-cursor align-text-bottom" />
                          )}
                        </p>
                      ))}
                      {advice && (
                        <div className={`mt-1 p-3.5 rounded-xl border-l-[3px] ${
                          adviceType === "mcr"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-l-blue-500 border border-blue-200 dark:border-blue-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 border-l-amber-500 border border-amber-200 dark:border-amber-500/20"
                        }`}>
                          <p className={`text-[11px] font-bold tracking-wide uppercase ${
                            adviceType === "mcr" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {adviceType === "mcr" ? "📐 오비젼 결론" : "💊 액막이 한마디"}
                          </p>
                          <p className="text-[13px] text-gray-800 dark:text-zinc-200 mt-1.5 font-semibold leading-relaxed">
                            {highlightNumbers(advice)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Receipt footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2">
              <p className="text-xs font-mono text-gray-400 text-center">
                본 분석은 정보 제공 목적이며 투자 권유가 아닙니다 · {dateStr}
              </p>
              {roast && !isStreaming && !isTyping && (
                <button
                  onClick={handleShareImage}
                  disabled={sharingLoading}
                  className="w-full py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-mono text-gray-500 dark:text-zinc-400 hover:border-kim-red/50 hover:text-kim-red transition-colors disabled:opacity-50"
                >
                  {sharingLoading ? "이미지 생성 중..." : `📤 ${mode === "makalong" ? "빗각 분석" : "팩폭 결과"} 이미지로 공유`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl={getShareUrl(mode)}
        imageFileName="ovision-analysis.png"
      />
    </>
  );
}
