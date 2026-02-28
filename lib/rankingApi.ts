import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";

const COLLECTION = "mock_rankings";

export interface RankingEntry {
  userId: string;
  nickname: string;
  strategy: string;
  totalAsset: number;
  returnPct: number;
  updatedAt: string;
  investorType?: string;   // "⚡ 공격형 트레이더" 형태
}

export async function upsertRanking(entry: RankingEntry): Promise<void> {
  await setDoc(doc(db, COLLECTION, entry.userId), entry);
}

export async function fetchMyRank(userId: string): Promise<{ rank: number; entry: RankingEntry } | null> {
  const userSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const entry = userSnap.data() as RankingEntry;
  const aboveSnap = await getCountFromServer(
    query(collection(db, COLLECTION), where("returnPct", ">", entry.returnPct))
  );
  return { rank: aboveSnap.data().count + 1, entry };
}

export async function deleteRanking(userId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, userId));
}

export async function fetchTopRankings(n = 20): Promise<RankingEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("returnPct", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RankingEntry);
}
