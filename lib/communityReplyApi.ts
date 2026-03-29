import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { CommunityReply, BoardId } from "@/types/social";
import { BOARD_COLLECTIONS } from "@/types/social";

export async function toggleLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const ref = doc(db, col, postId);
  if (currentlyLiked) {
    await updateDoc(ref, {
      likes: increment(-1),
      likedBy: arrayRemove(userId),
    });
  } else {
    await updateDoc(ref, {
      likes: increment(1),
      likedBy: arrayUnion(userId),
    });
  }
}

export async function addReply(
  postId: string,
  userId: string,
  nickname: string,
  content: string,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].replies;
  const postCol = BOARD_COLLECTIONS[boardId].posts;
  await addDoc(collection(db, col), {
    postId,
    userId,
    nickname,
    content: content.slice(0, 200),
    createdAt: serverTimestamp(),
  });

  // replyCount 증가
  const postRef = doc(db, postCol, postId);
  await updateDoc(postRef, {
    replyCount: increment(1),
  });
}

export async function fetchReplies(
  postId: string,
  count = 20,
  boardId: BoardId = "community"
): Promise<CommunityReply[]> {
  const col = BOARD_COLLECTIONS[boardId].replies;
  const q = query(
    collection(db, col),
    where("postId", "==", postId),
    orderBy("createdAt", "asc"),
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
      postId: data.postId as string,
      userId: data.userId as string,
      nickname: data.nickname as string,
      content: data.content as string,
      createdAt,
    };
  });
}
