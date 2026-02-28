"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { fetchCommunityPosts, addCommunityPost, deleteCommunityPost, CommunityPost } from "@/lib/communityApi";
import { isAdmin } from "@/lib/adminConfig";

interface CommunityBoardProps {
  user: User | null;
  nickname?: string;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}초 전`;
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function CommunityBoard({ user, nickname }: CommunityBoardProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchCommunityPosts(30));
    } catch {
      // silent — permission denied or network error
    } finally {
      setLoading(false);
    }
  }, []);

  // .catch(() => {}) ensures any edge-case rejection doesn't propagate to React error boundary
  useEffect(() => { load().catch(() => {}); }, [load]);

  async function handleDelete(postId: string) {
    if (!user) return;
    setDeletingId(postId);
    try {
      await deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      setNotice({ msg: "삭제 실패", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    const trimmed = content.trim();
    if (trimmed.length < 2) return;
    const nick = nickname || user.displayName || "익명";
    setSubmitting(true);
    try {
      await addCommunityPost(user.uid, nick, trimmed);
      setContent("");
      setNotice({ msg: "등록되었습니다!", ok: true });
      setTimeout(() => setNotice(null), 3000);
      load().catch(() => {});
    } catch {
      setNotice({ msg: "오류가 발생했습니다", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">💬 투자 게시판</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            투자 의견 · 수익 자랑 · 수다 · 누구나 열람
          </p>
        </div>
        <button
          onClick={() => load().catch(() => {})}
          disabled={loading}
          className="text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-mono border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
        >
          새로고침
        </button>
      </div>

      {/* Write area */}
      {user ? (
        <div className="mb-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-200 dark:border-white/10">
          <div className="text-[10px] text-gray-500 font-mono mb-1.5">
            <span className="text-kim-red font-bold">{nickname || user.displayName || "익명"}</span>
            {" "}으로 등록됩니다
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder="투자 의견이나 수익 자랑을 남겨보세요 (200자)"
            rows={2}
            className="w-full bg-transparent text-gray-900 dark:text-white font-mono text-xs focus:outline-none resize-none placeholder:text-gray-400 dark:placeholder:text-gray-700"
          />
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-200 dark:border-white/10">
            <span className="text-[10px] text-gray-500 font-mono">{content.trim().length}/200</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || content.trim().length < 2}
              className="text-xs font-mono px-3 py-1 rounded bg-kim-red text-white hover:bg-red-600 transition-colors disabled:opacity-40"
            >
              {submitting ? "..." : "등록"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 text-center text-xs text-gray-500 font-mono py-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg border border-gray-200 dark:border-white/5">
          로그인 후 글을 남길 수 있습니다
        </div>
      )}

      {notice && (
        <div className={`mb-2 text-center text-xs font-mono py-1 rounded ${
          notice.ok ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
        }`}>
          {notice.msg}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 글이 없습니다. 첫 번째 의견을 남겨보세요! 📝
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`rounded-lg px-3 py-2.5 border text-xs ${
                post.userId === user?.uid
                  ? "bg-kim-red/5 border-kim-red/20"
                  : "bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold font-mono text-[11px] ${
                  post.userId === user?.uid ? "text-kim-red" : "text-gray-700 dark:text-gray-300"
                }`}>
                  {post.nickname}
                  {post.userId === user?.uid && (
                    <span className="ml-1 text-[9px] text-kim-red/60">나</span>
                  )}
                  {isAdmin(user?.uid) && post.userId !== user?.uid && (
                    <span className="ml-1 text-[9px] text-yellow-500/70">관리자</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {timeAgo(post.createdAt)}
                  </span>
                  {(post.userId === user?.uid || isAdmin(user?.uid)) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="text-[10px] text-gray-400 hover:text-red-500 font-mono transition-colors disabled:opacity-40"
                    >
                      {deletingId === post.id ? "..." : "삭제"}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{post.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
