"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { Skeleton } from "@/components/Skeleton";
import { StaggerContainer } from "@/components/StaggerContainer";
import { PortfolioSnapshotCard } from "@/components/mock/PortfolioSnapshotCard";
import { CharacterSnapshotCard } from "@/components/mock/CharacterSnapshotCard";
import { fetchCommunityPosts, addCommunityPost, deleteCommunityPost, CommunityPost } from "@/lib/communityApi";
import { toggleLike, addReply, fetchReplies } from "@/lib/communityReplyApi";
import { isAdmin } from "@/lib/adminConfig";
import type { PostCategory, BoardId, PostSnapshot, CommunityReply } from "@/types/social";

const DEFAULT_CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: "insight", label: "인사이트" },
  { key: "question", label: "질문" },
  { key: "brag", label: "수익자랑" },
  { key: "tip", label: "꿀팁" },
];

interface CommunityBoardProps {
  user: User | null;
  nickname?: string;
  boardId?: BoardId;
  boardTitle?: string;
  boardSubtitle?: string;
  categories?: { key: PostCategory; label: string }[];
  snapshotData?: PostSnapshot | null;
  snapshotCategory?: PostCategory;
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

export function CommunityBoard({
  user,
  nickname,
  boardId = "community",
  boardTitle = "투자 게시판",
  boardSubtitle = "투자 의견 · 수익 자랑 · 수다 · 누구나 열람",
  categories = DEFAULT_CATEGORIES,
  snapshotData,
  snapshotCategory,
}: CommunityBoardProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeCategory, setActiveCategory] = useState<PostCategory | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>(categories[0]?.key ?? "insight");
  const [attachSnapshot, setAttachSnapshot] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>({});
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const allCategories: { key: PostCategory | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    ...categories,
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await fetchCommunityPosts(30, boardId));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  // 카테고리 변경 시 스냅샷 첨부 토글 리셋
  useEffect(() => {
    setAttachSnapshot(false);
  }, [selectedCategory]);

  const filteredPosts = activeCategory === "all"
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  const categoryLabelMap = Object.fromEntries(allCategories.map((c) => [c.key, c.label]));

  async function handleDelete(postId: string) {
    if (!user) return;
    setDeletingId(postId);
    try {
      await deleteCommunityPost(postId, boardId);
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
      const snap = attachSnapshot && snapshotData && selectedCategory === snapshotCategory
        ? snapshotData
        : undefined;
      await addCommunityPost(user.uid, nick, trimmed, selectedCategory, boardId, snap);
      setContent("");
      setAttachSnapshot(false);
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

  async function handleToggleLike(post: CommunityPost) {
    if (!user) return;
    const liked = post.likedBy.includes(user.uid);

    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: liked ? p.likes - 1 : p.likes + 1,
              likedBy: liked
                ? p.likedBy.filter((id) => id !== user.uid)
                : [...p.likedBy, user.uid],
            }
          : p
      )
    );

    try {
      await toggleLike(post.id, user.uid, liked, boardId);
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likes: liked ? p.likes + 1 : p.likes - 1,
                likedBy: liked
                  ? [...p.likedBy, user.uid]
                  : p.likedBy.filter((id) => id !== user.uid),
              }
            : p
        )
      );
    }
  }

  async function handleExpandReplies(postId: string) {
    if (expandedReplies === postId) {
      setExpandedReplies(null);
      return;
    }
    setExpandedReplies(postId);
    if (!replies[postId]) {
      try {
        const fetched = await fetchReplies(postId, 20, boardId);
        setReplies((prev) => ({ ...prev, [postId]: fetched }));
      } catch {
        // silent
      }
    }
  }

  async function handleSubmitReply(postId: string) {
    if (!user || replyContent.trim().length < 1) return;
    const nick = nickname || user.displayName || "익명";
    setReplySubmitting(true);
    try {
      await addReply(postId, user.uid, nick, replyContent.trim(), boardId);
      setReplyContent("");
      // replyCount optimistic
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p
        )
      );
      // 답글 새로고침
      const fetched = await fetchReplies(postId, 20, boardId);
      setReplies((prev) => ({ ...prev, [postId]: fetched }));
    } catch {
      setNotice({ msg: "답글 등록 실패", ok: false });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setReplySubmitting(false);
    }
  }

  // 스냅샷 첨부 가능 여부
  const canAttach =
    snapshotData && snapshotCategory && selectedCategory === snapshotCategory;
  const snapshotLabel =
    snapshotData?.type === "portfolio" ? "포트폴리오 정보 첨부" : "캐릭터 정보 첨부";

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-gray-900 dark:text-white">{boardTitle}</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            {boardSubtitle}
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

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {allCategories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
              activeCategory === cat.key
                ? "bg-kim-red text-white"
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Write area */}
      {user ? (
        <div className="mb-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 font-mono">
              <span className="text-kim-red font-bold">{nickname || user.displayName || "익명"}</span>
              {" "}으로 등록됩니다
            </span>
          </div>
          {/* Category select */}
          <div className="flex gap-1 mb-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-kim-red/20 text-kim-red font-bold"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/* Snapshot attach checkbox */}
          {canAttach && (
            <label className="flex items-center gap-1.5 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachSnapshot}
                onChange={(e) => setAttachSnapshot(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-white/20 text-kim-red focus:ring-kim-red/50 bg-transparent"
              />
              <span className="text-[10px] font-mono text-gray-500">
                {snapshotLabel}
              </span>
            </label>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder="의견이나 자랑을 남겨보세요 (200자)"
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
            <Skeleton key={i} variant="card" className="h-14" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-6">
          아직 글이 없습니다. 첫 번째 의견을 남겨보세요!
        </div>
      ) : (
        <StaggerContainer className="flex flex-col gap-1.5">
          {filteredPosts.map((post) => {
            const liked = user ? post.likedBy.includes(user.uid) : false;
            const isExpanded = expandedReplies === post.id;

            return (
              <div key={post.id}>
                <div
                  className={`rounded-lg px-3 py-2.5 border text-xs ${
                    post.userId === user?.uid
                      ? "bg-kim-red/5 border-kim-red/20"
                      : "bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold font-mono text-xs ${
                        post.userId === user?.uid ? "text-kim-red" : "text-gray-700 dark:text-zinc-300"
                      }`}>
                        {post.nickname}
                        {post.userId === user?.uid && (
                          <span className="ml-1 text-[10px] text-kim-red/60">나</span>
                        )}
                        {isAdmin(user?.uid) && post.userId !== user?.uid && (
                          <span className="ml-1 text-[10px] text-yellow-500/70">관리자</span>
                        )}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-white/10 text-gray-500 dark:text-gray-500">
                        {categoryLabelMap[post.category] ?? post.category}
                      </span>
                    </div>
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
                  <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">{post.content}</p>

                  {/* Snapshot card */}
                  {post.snapshot?.type === "portfolio" && (
                    <PortfolioSnapshotCard snapshot={post.snapshot} />
                  )}
                  {post.snapshot?.type === "character" && (
                    <CharacterSnapshotCard snapshot={post.snapshot} />
                  )}

                  {/* Like & Reply buttons */}
                  <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={() => handleToggleLike(post)}
                      disabled={!user}
                      className={`flex items-center gap-1 text-[11px] font-mono transition-colors ${
                        liked
                          ? "text-red-500"
                          : "text-gray-400 hover:text-red-400"
                      } disabled:opacity-40`}
                    >
                      <span>{liked ? "\u2665" : "\u2661"}</span>
                      <span>{post.likes > 0 ? post.likes : ""}</span>
                    </button>
                    <button
                      onClick={() => handleExpandReplies(post.id)}
                      className="flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <span>&#128172;</span>
                      <span>{post.replyCount > 0 ? post.replyCount : ""}</span>
                    </button>
                  </div>
                </div>

                {/* Reply section */}
                {isExpanded && (
                  <div className="ml-3 mt-1 border-l-2 border-gray-200 dark:border-white/10 pl-3">
                    {replies[post.id]?.map((r) => (
                      <div
                        key={r.id}
                        className="text-[11px] py-1.5 border-b border-gray-100 dark:border-white/5 last:border-0"
                      >
                        <span className="font-bold font-mono text-gray-700 dark:text-zinc-300">
                          {r.nickname}
                        </span>
                        <span className="ml-1.5 text-gray-500 dark:text-zinc-500 font-mono">
                          {timeAgo(r.createdAt)}
                        </span>
                        <p className="text-gray-600 dark:text-zinc-400 mt-0.5">
                          {r.content}
                        </p>
                      </div>
                    ))}
                    {(!replies[post.id] || replies[post.id].length === 0) && (
                      <p className="text-[10px] text-gray-500 font-mono py-2">
                        아직 답글이 없습니다
                      </p>
                    )}
                    {user && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) =>
                            setReplyContent(e.target.value.slice(0, 200))
                          }
                          placeholder="답글 입력..."
                          className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-[11px] font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSubmitReply(post.id)}
                          disabled={
                            replySubmitting || replyContent.trim().length < 1
                          }
                          className="shrink-0 px-2 py-1 rounded bg-kim-red text-white text-[10px] font-mono font-bold hover:bg-red-600 transition-colors disabled:opacity-40"
                        >
                          {replySubmitting ? "..." : "등록"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
