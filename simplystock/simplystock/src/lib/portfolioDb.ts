import { db } from "./firebase";
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import type { Portfolio } from "@/hooks/useMockPortfolio";

const COLLECTION = "ss_portfolios";

export class VersionConflictError extends Error {
  latestPortfolio: Portfolio;
  constructor(latest: Portfolio) {
    super("VERSION_CONFLICT");
    this.name = "VersionConflictError";
    this.latestPortfolio = latest;
  }
}

export async function loadPortfolioFromDb(userId: string): Promise<Portfolio | null> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data() as Portfolio;
}

export async function savePortfolioToDb(userId: string, portfolio: Portfolio): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const remote = snap.data() as Portfolio;
      const remoteVersion = remote.version ?? 0;
      const localVersion = portfolio.version ?? 0;
      if (remoteVersion > localVersion) {
        throw new VersionConflictError(remote);
      }
    }
    tx.set(ref, { ...portfolio, version: (portfolio.version ?? 0) + 1 });
  });
}
