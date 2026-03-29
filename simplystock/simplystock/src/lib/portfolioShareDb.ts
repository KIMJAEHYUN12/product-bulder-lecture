import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc, Timestamp } from "firebase/firestore";

export interface PortfolioShareStock {
  name: string;
  position: number;
}

export interface PortfolioShareDoc {
  ownerName: string;
  avgPosition: number;
  bodyPart: string;
  stocks: PortfolioShareStock[];
  stockCount: number;
  createdAt: Timestamp;
}

const COLLECTION = "ss_portfolio_shares";

export async function savePortfolioShare(data: {
  ownerName: string;
  avgPosition: number;
  bodyPart: string;
  stocks: PortfolioShareStock[];
}): Promise<string> {
  const docRef = doc(collection(db, COLLECTION));
  await setDoc(docRef, {
    ownerName: data.ownerName,
    avgPosition: data.avgPosition,
    bodyPart: data.bodyPart,
    stocks: data.stocks,
    stockCount: data.stocks.length,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getPortfolioShare(shareId: string): Promise<PortfolioShareDoc | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, shareId));
    if (!snap.exists()) return null;
    return snap.data() as PortfolioShareDoc;
  } catch {
    return null;
  }
}

/* ── 공유 쿠폰 API ── */

export async function completeKakaoShareApi(shareId?: string): Promise<{ status: string; shareId: string }> {
  const res = await fetch(`/api/portfolio-share-coupon?action=complete_share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shareId ? { shareId } : {}),
  });
  if (!res.ok) throw new Error("complete_share failed");
  return res.json();
}

export async function visitShareApi(shareId: string): Promise<void> {
  fetch(`/api/portfolio-share-coupon?action=visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareId }),
  }).catch(() => {});
}

export async function checkShareCouponStatus(shareId: string): Promise<{ couponStatus: string; couponActivatedAt: number | null }> {
  const res = await fetch(`/api/portfolio-share-coupon?action=status&shareId=${encodeURIComponent(shareId)}`);
  if (!res.ok) throw new Error("status check failed");
  return res.json();
}
