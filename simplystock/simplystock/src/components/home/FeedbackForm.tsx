"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle, LogIn, MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "firebase/auth";

const LS_KEY = "ss-feedback-last";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type SendStatus = "idle" | "sending" | "sent" | "cooldown" | "error";
type Category = "bug" | "feature" | "question" | "other";

interface FeedbackDoc {
  id: string;
  message: string;
  category: Category;
  status: string;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  createdAt: string;
}

interface ReplyDoc {
  id: string;
  role: "user" | "admin";
  message: string;
  createdAt: string;
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "bug", label: "버그" },
  { key: "feature", label: "기능요청" },
  { key: "question", label: "질문" },
  { key: "other", label: "기타" },
];

const CATEGORY_STYLE: Record<Category, string> = {
  bug: "bg-red-500/20 text-red-400",
  feature: "bg-blue-500/20 text-blue-400",
  question: "bg-purple-500/20 text-purple-400",
  other: "bg-gray-500/20 text-gray-400",
};

const CATEGORY_LABEL: Record<Category, string> = {
  bug: "버그",
  feature: "기능요청",
  question: "질문",
  other: "기타",
};

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  received: { label: "접수", cls: "bg-gray-500/20 text-gray-400" },
  confirmed: { label: "확인중", cls: "bg-amber-500/20 text-amber-400" },
  resolved: { label: "완료", cls: "bg-emerald-500/20 text-emerald-400" },
};

interface Props {
  user: User | null;
}

export function FeedbackForm({ user }: Props) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("feature");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [myFeedbacks, setMyFeedbacks] = useState<FeedbackDoc[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 스레드 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ReplyDoc[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // 24시간 쿨다운 체크
  useEffect(() => {
    const last = localStorage.getItem(LS_KEY);
    if (last && Date.now() - Number(last) < ONE_DAY_MS) {
      setSendStatus("cooldown");
    }
  }, []);

  // 본인 피드백 목록 로드 (복합 인덱스 불필요하도록 클라이언트 정렬)
  const loadMyFeedbacks = useCallback(async () => {
    if (!user) return;
    try {
      setLoadError(false);
      const q = query(
        collection(db, "ss_feedback"),
        where("userId", "==", user.uid),
      );
      const snap = await getDocs(q);
      const sortedDocs = [...snap.docs].sort((a, b) => {
        const ta = a.data().createdAt?.toDate?.()?.getTime() || 0;
        const tb = b.data().createdAt?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });
      const items: FeedbackDoc[] = sortedDocs.slice(0, 20).map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.();
        return {
          id: d.id,
          message: data.message || "",
          category: data.category || "other",
          status: data.status || "received",
          adminReply: data.adminReply || null,
          adminRepliedAt: data.adminRepliedAt || null,
          createdAt: ts ? ts.toLocaleString("ko-KR") : "-",
        };
      });
      setMyFeedbacks(items);
      setListLoaded(true);
    } catch (err) {
      console.error("피드백 목록 로드 실패:", err);
      setLoadError(true);
      setListLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadMyFeedbacks();
  }, [user, loadMyFeedbacks]);

  // 스레드 답글 로드
  const loadReplies = async (feedbackId: string) => {
    setRepliesLoading(true);
    try {
      const q = query(
        collection(db, "ss_feedback", feedbackId, "replies"),
        orderBy("createdAt", "asc"),
      );
      const snap = await getDocs(q);
      const items: ReplyDoc[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.();
        return {
          id: d.id,
          role: data.role || "admin",
          message: data.message || "",
          createdAt: ts ? ts.toLocaleString("ko-KR") : "-",
        };
      });
      setReplies((prev) => ({ ...prev, [feedbackId]: items }));
    } catch (err) {
      console.error("답글 로드 실패:", err);
    } finally {
      setRepliesLoading(false);
    }
  };

  // 피드백 펼치기/접기
  const toggleExpand = (feedbackId: string) => {
    if (expandedId === feedbackId) {
      setExpandedId(null);
      setReplyText("");
      return;
    }
    setExpandedId(feedbackId);
    setReplyText("");
    // 답글 읽음 처리
    markRead(feedbackId);
    // 답글 캐시 없으면 로드
    if (!replies[feedbackId]) {
      loadReplies(feedbackId);
    }
  };

  // 사용자 답글 전송
  const handleSendReply = async (feedbackId: string) => {
    if (!user || !replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      await addDoc(collection(db, "ss_feedback", feedbackId, "replies"), {
        userId: user.uid,
        role: "user",
        message: replyText.trim(),
        createdAt: Timestamp.now(),
      });
      setReplyText("");
      // 답글 목록 갱신
      await loadReplies(feedbackId);
    } catch (err) {
      console.error("답글 전송 실패:", err);
    } finally {
      setReplySending(false);
    }
  };

  // NEW 뱃지: 답글 있고 + localStorage에 읽음 기록 없으면
  const isNewReply = (docId: string) => {
    return !localStorage.getItem(`ss-fb-read-${docId}`);
  };
  const markRead = (docId: string) => {
    localStorage.setItem(`ss-fb-read-${docId}`, "1");
  };

  const handleSubmit = async () => {
    if (!user) return;
    const text = message.trim();
    if (!text || sendStatus === "sending") return;

    setSendStatus("sending");
    try {
      await addDoc(collection(db, "ss_feedback"), {
        userId: user.uid,
        nickname: user.displayName || "익명",
        message: text,
        category,
        status: "received",
        adminReply: null,
        adminRepliedAt: null,
        createdAt: Timestamp.now(),
      });
      localStorage.setItem(LS_KEY, String(Date.now()));
      setMessage("");
      setSendStatus("sent");
      loadMyFeedbacks();
      setTimeout(() => setSendStatus("cooldown"), 2000);
    } catch {
      setSendStatus("error");
    }
  };

  // 비로그인 상태
  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-2 sm:px-4 mt-6">
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-3">
          <LogIn className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">
            로그인 후 의견을 보내주세요
          </span>
        </div>
      </div>
    );
  }

  // 스레드 메시지 렌더링: 기존 adminReply + sub-collection replies 통합
  const renderThread = (fb: FeedbackDoc) => {
    const threadReplies = replies[fb.id] || [];
    // 기존 adminReply가 있고 sub-collection에 답글이 없으면 → 마이그레이션 호환
    const hasLegacyOnly = !!fb.adminReply && threadReplies.length === 0;
    const allMessages: ReplyDoc[] = hasLegacyOnly
      ? [{ id: "legacy", role: "admin", message: fb.adminReply!, createdAt: fb.adminRepliedAt || "" }]
      : threadReplies;

    return (
      <div className="mt-2 space-y-1.5">
        {repliesLoading && expandedId === fb.id && threadReplies.length === 0 ? (
          <div className="flex items-center gap-1.5 py-2">
            <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">불러오는 중...</span>
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-[10px] text-[var(--text-faint)] py-1">아직 답변이 없습니다</p>
        ) : (
          allMessages.map((r) => (
            <div
              key={r.id}
              className={`flex ${r.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  r.role === "admin"
                    ? "bg-indigo-500/15 border border-indigo-500/20"
                    : "bg-[var(--bg-primary)] border border-[var(--border-primary)]"
                }`}
              >
                <span className={`text-[10px] font-medium ${r.role === "admin" ? "text-indigo-400" : "text-[var(--text-muted)]"}`}>
                  {r.role === "admin" ? "관리자" : "나"}
                </span>
                <p className="text-xs text-[var(--text-primary)] mt-0.5 break-all">{r.message}</p>
                {r.createdAt && (
                  <p className="text-[9px] text-[var(--text-faint)] mt-0.5">{r.createdAt}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 mt-6">
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-3">
        {/* 입력 영역 */}
        <p className="text-xs text-[var(--text-muted)] mb-2">
          개선 의견이나 원하는 기능이 있으면 알려주세요
        </p>

        {/* 카테고리 칩 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                category === c.key
                  ? CATEGORY_STYLE[c.key] + " ring-1 ring-current"
                  : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 입력 + 전송 */}
        {sendStatus === "cooldown" ? (
          <div className="flex items-center gap-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2">
            <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-xs text-[var(--text-muted)]">
              오늘 피드백을 보내주셨습니다. 감사합니다!
            </span>
          </div>
        ) : sendStatus === "sent" ? (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
            <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-xs text-green-400">
              피드백이 전송되었습니다!
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="한 줄 피드백 (최대 500자)"
              maxLength={500}
              className="flex-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-indigo-500/50"
              disabled={sendStatus === "sending"}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || sendStatus === "sending"}
              className="flex items-center gap-1 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              보내기
            </button>
          </div>
        )}
        {sendStatus === "error" && (
          <p className="mt-1.5 text-xs text-red-400">
            전송에 실패했습니다. 다시 시도해주세요.
          </p>
        )}

        {/* 로드 에러 */}
        {listLoaded && loadError && (
          <p className="mt-3 text-xs text-red-400">
            피드백 목록을 불러올 수 없습니다. 새로고침해 주세요.
          </p>
        )}

        {/* 내 피드백 목록 */}
        {listLoaded && !loadError && myFeedbacks.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-primary)] pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                내 피드백
              </span>
            </div>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {myFeedbacks.map((fb) => {
                const hasNewReply = !!fb.adminReply && isNewReply(fb.id);
                const isExpanded = expandedId === fb.id;

                const catStyle = CATEGORY_STYLE[fb.category] || CATEGORY_STYLE.other;
                const catLabel = CATEGORY_LABEL[fb.category] || "기타";
                const statusInfo = STATUS_STYLE[fb.status] || STATUS_STYLE.received;

                return (
                  <li
                    key={fb.id}
                    className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)]"
                  >
                    {/* 클릭 가능한 요약 행 */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(fb.id)}
                      className="w-full text-left px-3 py-2"
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${catStyle}`}
                        >
                          {catLabel}
                        </span>
                        <p className="flex-1 text-xs text-[var(--text-primary)] break-all line-clamp-2">
                          {fb.message}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {fb.adminReply && (
                            <MessageSquare className="h-3 w-3 text-indigo-400" />
                          )}
                          {hasNewReply && (
                            <span className="rounded bg-red-500 px-1 py-px text-[9px] font-bold text-white leading-tight">
                              NEW
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}
                          >
                            {statusInfo.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-[var(--text-faint)]" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-[var(--text-faint)]" />
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-faint)]">
                        {fb.createdAt}
                      </p>
                    </button>

                    {/* 펼친 상태: 스레드 */}
                    {isExpanded && (
                      <div className="border-t border-[var(--border-primary)] px-3 py-2">
                        {renderThread(fb)}

                        {/* 답글 입력 (resolved가 아닐 때만) */}
                        {fb.status !== "resolved" ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSendReply(fb.id);
                              }}
                              placeholder="추가 의견 입력..."
                              maxLength={500}
                              className="flex-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-indigo-500/50"
                              disabled={replySending}
                            />
                            <button
                              type="button"
                              onClick={() => handleSendReply(fb.id)}
                              disabled={!replyText.trim() || replySending}
                              className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                            >
                              {replySending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[var(--text-faint)] mt-2">
                            완료된 피드백입니다
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
