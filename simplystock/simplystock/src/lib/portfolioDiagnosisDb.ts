import { db, auth } from "@/lib/firebase";
import { collection, doc, setDoc, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import type { ViewSignal } from "@/lib/portfolioAnalyzeApi";

export interface DiagnosisSummary {
  totalValue: number;
  totalReturn: number;
  signal: ViewSignal;
  stockCount: number;
}

export interface DiagnosisStockRecord {
  code: string;
  name: string;
  signal: ViewSignal;
  returnPct: number | null;
  perPosition: number | null;
}

export interface DiagnosisRecord {
  userId: string;
  createdAt: Date;
  summary: DiagnosisSummary;
  stocks: DiagnosisStockRecord[];
}

const COLLECTION = "ss_portfolio_diagnoses";
const LS_KEY = "ss_last_diagnosis";

export async function saveDiagnosis(
  summary: DiagnosisSummary,
  stocks: DiagnosisStockRecord[],
): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    const ts = Date.now();
    const docId = `${user.uid}_${ts}`;
    await setDoc(doc(collection(db, COLLECTION), docId), {
      userId: user.uid,
      createdAt: Timestamp.now(),
      summary,
      stocks,
    });
  } else {
    // 비로그인: localStorage에 최근 1건
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        createdAt: new Date().toISOString(),
        summary,
        stocks,
      }));
    } catch { /* quota exceeded 등 무시 */ }
  }
}

export async function getLastDiagnosis(): Promise<{
  createdAt: Date;
  summary: DiagnosisSummary;
  stocks: DiagnosisStockRecord[];
} | null> {
  const user = auth.currentUser;
  if (user) {
    const q = query(
      collection(db, COLLECTION),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(2), // 최근 2건 (현재 + 이전)
    );
    const snap = await getDocs(q);
    // 2번째가 "이전" 검진
    if (snap.docs.length >= 2) {
      const data = snap.docs[1].data();
      return {
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
        summary: data.summary,
        stocks: data.stocks,
      };
    }
    return null;
  } else {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        createdAt: new Date(parsed.createdAt),
        summary: parsed.summary,
        stocks: parsed.stocks,
      };
    } catch {
      return null;
    }
  }
}
