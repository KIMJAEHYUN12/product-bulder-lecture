import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import type { ChartGameRankingEntry } from "@/types";

const COLLECTION = "chart_game_rankings";

export async function upsertChartGameRanking(entry: ChartGameRankingEntry): Promise<void> {
  await setDoc(doc(db, COLLECTION, entry.userId), entry);
}

export async function fetchMyChartGameRank(
  userId: string
): Promise<{ rank: number; entry: ChartGameRankingEntry } | null> {
  const userSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const entry = userSnap.data() as ChartGameRankingEntry;
  const aboveSnap = await getCountFromServer(
    query(collection(db, COLLECTION), where("bestStreak", ">", entry.bestStreak))
  );
  return { rank: aboveSnap.data().count + 1, entry };
}

export async function fetchChartGameRankings(n = 20): Promise<ChartGameRankingEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("bestStreak", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChartGameRankingEntry);
}
