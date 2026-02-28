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

export interface CommunityPost {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export async function addCommunityPost(
  userId: string,
  nickname: string,
  content: string
): Promise<void> {
  await addDoc(collection(db, "community_posts"), {
    userId,
    nickname,
    content: content.slice(0, 200),
    createdAt: serverTimestamp(),
  });
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "community_posts", postId));
}

export async function fetchCommunityPosts(count = 30): Promise<CommunityPost[]> {
  const q = query(
    collection(db, "community_posts"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const d = doc.data();
    const ts = d.createdAt;
    const createdAt =
      ts instanceof Timestamp ? ts.toDate().toISOString() : "";
    return {
      id: doc.id,
      userId: d.userId as string,
      nickname: d.nickname as string,
      content: d.content as string,
      createdAt,
    };
  });
}
