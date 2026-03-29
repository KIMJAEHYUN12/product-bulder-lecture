import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { WatchlistItem } from "@/hooks/useWatchlist";

const COLLECTION = "watchlists";

export async function loadWatchlistFromDb(userId: string): Promise<WatchlistItem[]> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.items as WatchlistItem[]) || [];
}

export async function saveWatchlistToDb(userId: string, items: WatchlistItem[]): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), { items, updatedAt: Date.now() });
}
