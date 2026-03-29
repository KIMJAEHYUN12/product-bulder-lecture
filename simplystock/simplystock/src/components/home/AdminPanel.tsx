"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, Trash2, Send, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";

const ADMIN_UID = "zqyi38VH6vPN6HQNiOxEVBbxCg03";

interface FeedbackItem {
  id: string;
  message: string;
  createdAt: string;
  nickname?: string;
  userId?: string;
  category?: string;
  status?: string;
  adminReply?: string;
  adminRepliedAt?: string;
}

interface ReplyDoc {
  id: string;
  role: "user" | "admin";
  message: string;
  createdAt: string;
}

const CATEGORY_STYLE: Record<string, { label: string; cls: string }> = {
  bug: { label: "버그", cls: "bg-red-500/20 text-red-400" },
  feature: { label: "기능요청", cls: "bg-blue-500/20 text-blue-400" },
  question: { label: "질문", cls: "bg-purple-500/20 text-purple-400" },
  other: { label: "기타", cls: "bg-gray-500/20 text-gray-400" },
};

const STATUS_OPTIONS = [
  { key: "received", label: "접수" },
  { key: "confirmed", label: "확인중" },
  { key: "resolved", label: "완료" },
];

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  received: { label: "접수", cls: "bg-gray-500/20 text-gray-400" },
  confirmed: { label: "확인중", cls: "bg-amber-500/20 text-amber-400" },
  resolved: { label: "완료", cls: "bg-emerald-500/20 text-emerald-400" },
};

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "received", label: "접수" },
  { key: "confirmed", label: "확인중" },
  { key: "resolved", label: "완료" },
];

interface Props {
  user: User | null;
}

export function AdminPanel({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  const [announceText, setAnnounceText] = useState("");
  const [announceId, setAnnounceId] = useState("");
  const [announceDraft, setAnnounceDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [updateDraft, setUpdateDraft] = useState("");
  const [updates, setUpdates] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [updateSaving, setUpdateSaving] = useState(false);

  // 상태 변경 드래프트 (status만)
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [statusSaving, setStatusSaving] = useState<Record<string, boolean>>({});

  // 스레드 상태
  const [expandedFbId, setExpandedFbId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, ReplyDoc[]>>({});
  const [adminReplyText, setAdminReplyText] = useState<Record<string, string>>({});
  const [adminReplySending, setAdminReplySending] = useState<Record<string, boolean>>({});
  const [addToUpdatesCheck, setAddToUpdatesCheck] = useState<Record<string, boolean>>({});
  const [threadLoading, setThreadLoading] = useState<Record<string, boolean>>({});

  if (!user || user.uid !== ADMIN_UID) return null;

  const loadFeedbacks = async (filter: string) => {
    setFeedbackLoading(true);
    try {
      const constraints = [
        ...(filter !== "all" ? [where("status", "==", filter)] : []),
        orderBy("createdAt", "desc"),
        limit(30),
      ];
      const q = query(collection(db, "ss_feedback"), ...constraints);
      const snap = await getDocs(q);
      const items: FeedbackItem[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.();
        return {
          id: d.id,
          message: data.message || "",
          createdAt: ts ? ts.toLocaleString("ko-KR") : "-",
          nickname: data.nickname,
          userId: data.userId,
          category: data.category,
          status: data.status || "received",
          adminReply: data.adminReply || "",
          adminRepliedAt: data.adminRepliedAt || "",
        };
      });
      setFeedbacks(items);

      // 상태 드래프트 초기화
      const drafts: Record<string, string> = {};
      for (const fb of items) {
        drafts[fb.id] = fb.status || "received";
      }
      setStatusDrafts(drafts);
    } catch (err) {
      console.error("Feedback load error:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const loadData = async () => {
    setFeedbackLoading(true);
    try {
      await loadFeedbacks(feedbackFilter);

      const annDoc = await getDoc(doc(db, "ss_config", "announce"));
      if (annDoc.exists()) {
        const d = annDoc.data();
        setAnnounceText(d.text || "");
        setAnnounceId(d.id || "");
        setAnnounceDraft(d.text || "");
      }

      const uq = query(
        collection(db, "ss_updates"),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const uSnap = await getDocs(uq);
      setUpdates(
        uSnap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.();
          return {
            id: d.id,
            title: data.title || "",
            createdAt: ts ? ts.toLocaleString("ko-KR") : "-",
          };
        }),
      );
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && feedbacks.length === 0) {
      loadData();
    }
  };

  const handleFilterChange = (filter: string) => {
    setFeedbackFilter(filter);
    loadFeedbacks(filter);
  };

  // 상태만 변경 저장
  const handleSaveStatus = async (fbId: string) => {
    const newStatus = statusDrafts[fbId];
    if (!newStatus) return;
    setStatusSaving((prev) => ({ ...prev, [fbId]: true }));
    try {
      await updateDoc(doc(db, "ss_feedback", fbId), { status: newStatus });
      setFeedbacks((prev) =>
        prev.map((fb) => (fb.id === fbId ? { ...fb, status: newStatus } : fb)),
      );
    } catch (err) {
      console.error("Status save error:", err);
      alert("저장 실패");
    } finally {
      setStatusSaving((prev) => ({ ...prev, [fbId]: false }));
    }
  };

  // 스레드 답글 로드
  const loadThreadReplies = async (feedbackId: string) => {
    setThreadLoading((prev) => ({ ...prev, [feedbackId]: true }));
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
      setThreadReplies((prev) => ({ ...prev, [feedbackId]: items }));
    } catch (err) {
      console.error("Thread load error:", err);
    } finally {
      setThreadLoading((prev) => ({ ...prev, [feedbackId]: false }));
    }
  };

  // 피드백 펼치기/접기
  const toggleFbExpand = (feedbackId: string) => {
    if (expandedFbId === feedbackId) {
      setExpandedFbId(null);
      return;
    }
    setExpandedFbId(feedbackId);
    if (!threadReplies[feedbackId]) {
      loadThreadReplies(feedbackId);
    }
  };

  // 관리자 답글 전송
  const handleAdminReply = async (fbId: string) => {
    const text = (adminReplyText[fbId] || "").trim();
    if (!text) return;
    setAdminReplySending((prev) => ({ ...prev, [fbId]: true }));
    try {
      // sub-collection에 추가
      await addDoc(collection(db, "ss_feedback", fbId, "replies"), {
        userId: ADMIN_UID,
        role: "admin",
        message: text,
        createdAt: Timestamp.now(),
      });

      // 부모 문서 adminReply 동기화 (하위호환)
      await updateDoc(doc(db, "ss_feedback", fbId), {
        adminReply: text,
        adminRepliedAt: new Date().toISOString(),
      });

      // 업데이트 내역에도 추가
      if (addToUpdatesCheck[fbId]) {
        await addDoc(collection(db, "ss_updates"), {
          title: `[피드백 답변] ${text.slice(0, 50)}`,
          createdAt: serverTimestamp(),
        });
        setAddToUpdatesCheck((prev) => ({ ...prev, [fbId]: false }));
      }

      // 로컬 상태 갱신
      setAdminReplyText((prev) => ({ ...prev, [fbId]: "" }));
      setFeedbacks((prev) =>
        prev.map((fb) =>
          fb.id === fbId
            ? { ...fb, adminReply: text, adminRepliedAt: new Date().toISOString() }
            : fb,
        ),
      );
      // 답글 목록 갱신
      await loadThreadReplies(fbId);
    } catch (err) {
      console.error("Admin reply error:", err);
      alert("전송 실패");
    } finally {
      setAdminReplySending((prev) => ({ ...prev, [fbId]: false }));
    }
  };

  // 스레드 메시지 렌더링
  const renderAdminThread = (fb: FeedbackItem) => {
    const replies = threadReplies[fb.id] || [];
    const hasLegacyOnly = !!fb.adminReply && replies.length === 0;
    const allMessages: ReplyDoc[] = hasLegacyOnly
      ? [{ id: "legacy", role: "admin", message: fb.adminReply!, createdAt: fb.adminRepliedAt || "" }]
      : replies;

    return (
      <div className="space-y-1.5">
        {threadLoading[fb.id] && replies.length === 0 ? (
          <div className="flex items-center gap-1.5 py-2">
            <Loader2 className="h-3 w-3 animate-spin text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">불러오는 중...</span>
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-[10px] text-[var(--text-faint)] py-1">대화 없음</p>
        ) : (
          allMessages.map((r) => (
            <div
              key={r.id}
              className={`flex ${r.role === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  r.role === "admin"
                    ? "bg-indigo-500/15 border border-indigo-500/20"
                    : "bg-[var(--bg-primary)] border border-[var(--border-primary)]"
                }`}
              >
                <span className={`text-[10px] font-medium ${r.role === "admin" ? "text-indigo-400" : "text-[var(--text-muted)]"}`}>
                  {r.role === "admin" ? "관리자" : "사용자"}
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

  const handleSaveAnnounce = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const newId = `announce-${Date.now()}`;
      await setDoc(doc(db, "ss_config", "announce"), {
        text: announceDraft.trim(),
        id: newId,
        updatedAt: serverTimestamp(),
      });
      setAnnounceText(announceDraft.trim());
      setAnnounceId(newId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Announce save error:", err);
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAnnounce = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "ss_config", "announce"), {
        text: "",
        id: "",
        updatedAt: serverTimestamp(),
      });
      setAnnounceText("");
      setAnnounceId("");
      setAnnounceDraft("");
    } catch (err) {
      console.error("Announce clear error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUpdate = async () => {
    const title = updateDraft.trim();
    if (!title) return;
    setUpdateSaving(true);
    try {
      const ref = await addDoc(collection(db, "ss_updates"), {
        title,
        createdAt: serverTimestamp(),
      });
      setUpdates((prev) => [
        { id: ref.id, title, createdAt: new Date().toLocaleString("ko-KR") },
        ...prev,
      ]);
      setUpdateDraft("");
    } catch (err) {
      console.error("Update save error:", err);
      alert("저장 실패");
    } finally {
      setUpdateSaving(false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    try {
      await deleteDoc(doc(db, "ss_updates", id));
      setUpdates((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Update delete error:", err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 mt-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5">
        <button
          type="button"
          onClick={handleToggle}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-amber-400"
        >
          <span>관리자 패널</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {open && (
          <div className="border-t border-amber-500/20 px-4 py-4 space-y-6">
            {/* 공지 편집 */}
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">공지 배너 편집</h3>
              {announceText && (
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  현재: {announceText}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={announceDraft}
                  onChange={(e) => setAnnounceDraft(e.target.value)}
                  placeholder="공지 텍스트 (비우면 배너 숨김)"
                  className="flex-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={handleSaveAnnounce}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-md bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  저장
                </button>
                {announceText && (
                  <button
                    type="button"
                    onClick={handleClearAnnounce}
                    disabled={saving}
                    className="flex items-center gap-1 rounded-md bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                )}
              </div>
              {saved && (
                <p className="mt-1 text-[11px] text-green-400">저장 완료 (새 ID 발급됨 — 모든 사용자에게 재노출)</p>
              )}
            </section>

            {/* 업데이트 내역 */}
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">업데이트 내역</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={updateDraft}
                  onChange={(e) => setUpdateDraft(e.target.value)}
                  placeholder="업데이트 제목 (예: 관심종목 현재가 추가)"
                  className="flex-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none focus:border-amber-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddUpdate();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddUpdate}
                  disabled={updateSaving || !updateDraft.trim()}
                  className="flex items-center gap-1 rounded-md bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  {updateSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  저장
                </button>
              </div>
              {updates.length > 0 && (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {updates.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-1.5"
                    >
                      <div>
                        <p className="text-xs text-[var(--text-primary)]">{u.title}</p>
                        <p className="text-[10px] text-[var(--text-faint)]">{u.createdAt}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteUpdate(u.id)}
                        className="p-1 text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 피드백 목록 */}
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                피드백 목록 (최근 30건)
              </h3>

              {/* 상태 필터 칩 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleFilterChange(tab.key)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      feedbackFilter === tab.key
                        ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                        : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {feedbackLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  불러오는 중...
                </div>
              ) : feedbacks.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">피드백이 없습니다</p>
              ) : (
                <ul className="space-y-3 max-h-[600px] overflow-y-auto">
                  {feedbacks.map((fb) => {
                    const catInfo = CATEGORY_STYLE[fb.category || "other"] || CATEGORY_STYLE.other;
                    const statusInfo = STATUS_STYLE[fb.status || "received"] || STATUS_STYLE.received;
                    const isExpanded = expandedFbId === fb.id;

                    return (
                      <li
                        key={fb.id}
                        className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-overlay)]"
                      >
                        {/* 클릭 가능한 요약 행 */}
                        <button
                          type="button"
                          onClick={() => toggleFbExpand(fb.id)}
                          className="w-full text-left px-3 py-2"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${catInfo.cls}`}>
                              {catInfo.label}
                            </span>
                            {fb.nickname && (
                              <span className="shrink-0 text-[10px] font-medium text-indigo-400">
                                {fb.nickname}
                              </span>
                            )}
                            <p className="flex-1 text-sm text-[var(--text-primary)] break-all line-clamp-2">
                              {fb.message}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {fb.adminReply && (
                                <MessageSquare className="h-3 w-3 text-indigo-400" />
                              )}
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusInfo.cls}`}>
                                {statusInfo.label}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 text-[var(--text-faint)]" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-[var(--text-faint)]" />
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[10px] text-[var(--text-faint)]">{fb.createdAt}</p>
                        </button>

                        {/* 펼친 상태: 상태 변경 + 스레드 + 답글 입력 */}
                        {isExpanded && (
                          <div className="border-t border-[var(--border-primary)] px-3 py-2 space-y-3">
                            {/* 상태 변경 */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)]">상태:</span>
                              <select
                                value={statusDrafts[fb.id] || fb.status || "received"}
                                onChange={(e) =>
                                  setStatusDrafts((prev) => ({ ...prev, [fb.id]: e.target.value }))
                                }
                                className="rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-0.5 text-[11px] text-[var(--text-primary)] outline-none"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              {statusDrafts[fb.id] !== fb.status && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveStatus(fb.id)}
                                  disabled={statusSaving[fb.id]}
                                  className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                                >
                                  {statusSaving[fb.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Save className="h-3 w-3" />
                                  )}
                                  저장
                                </button>
                              )}
                            </div>

                            {/* 스레드 대화 */}
                            {renderAdminThread(fb)}

                            {/* 관리자 답글 입력 */}
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={adminReplyText[fb.id] || ""}
                                  onChange={(e) =>
                                    setAdminReplyText((prev) => ({
                                      ...prev,
                                      [fb.id]: e.target.value.slice(0, 500),
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAdminReply(fb.id);
                                  }}
                                  placeholder="답글 입력..."
                                  maxLength={500}
                                  className="flex-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)] focus:border-amber-500/50"
                                  disabled={adminReplySending[fb.id]}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdminReply(fb.id)}
                                  disabled={!(adminReplyText[fb.id] || "").trim() || adminReplySending[fb.id]}
                                  className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                                >
                                  {adminReplySending[fb.id] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3" />
                                  )}
                                  전송
                                </button>
                              </div>
                              <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={addToUpdatesCheck[fb.id] || false}
                                  onChange={(e) =>
                                    setAddToUpdatesCheck((prev) => ({
                                      ...prev,
                                      [fb.id]: e.target.checked,
                                    }))
                                  }
                                  className="rounded"
                                />
                                업데이트 내역에도 추가
                              </label>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
