import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Portfolio } from "@/hooks/useMockPortfolio";

const COLLECTION = "portfolios";

export async function loadPortfolioFromDb(userId: string): Promise<Portfolio | null> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data() as Portfolio;
}

export async function savePortfolioToDb(userId: string, portfolio: Portfolio): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), portfolio);
}
