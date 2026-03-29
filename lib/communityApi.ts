import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { PostCategory, BoardId, PostSnapshot } from "@/types/social";
import { BOARD_COLLECTIONS } from "@/types/social";

export interface CommunityPost {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
  category: PostCategory;
  likes: number;
  likedBy: string[];
  replyCount: number;
  snapshot?: PostSnapshot;
}

export async function addCommunityPost(
  userId: string,
  nickname: string,
  content: string,
  category: PostCategory = "insight",
  boardId: BoardId = "community",
  snapshot?: PostSnapshot
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const data: Record<string, unknown> = {
    userId,
    nickname,
    content: content.slice(0, 200),
    category,
    likes: 0,
    likedBy: [],
    replyCount: 0,
    createdAt: serverTimestamp(),
  };
  if (snapshot) data.snapshot = snapshot;
  await addDoc(collection(db, col), data);
}

export async function deleteCommunityPost(
  postId: string,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  await deleteDoc(doc(db, col, postId));
}

export async function fetchCommunityPosts(
  count = 30,
  boardId: BoardId = "community"
): Promise<CommunityPost[]> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const q = query(
    collection(db, col),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt;
    const createdAt =
      ts instanceof Timestamp ? ts.toDate().toISOString() : "";
    return {
      id: d.id,
      userId: data.userId as string,
      nickname: data.nickname as string,
      content: data.content as string,
      createdAt,
      category: (data.category as PostCategory) ?? "insight",
      likes: (data.likes as number) ?? 0,
      likedBy: (data.likedBy as string[]) ?? [],
      replyCount: (data.replyCount as number) ?? 0,
      ...(data.snapshot ? { snapshot: data.snapshot as PostSnapshot } : {}),
    };
  });
}
