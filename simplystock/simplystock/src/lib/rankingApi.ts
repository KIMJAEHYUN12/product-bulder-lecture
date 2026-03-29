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
import type {
  BotType,
  BotProfile,
  BotTradeEntry,
  BotDailySnapshot,
  BotFullData,
  BotHolding,
} from "@/types";

const COLLECTION = "ss_mock_rankings";

export interface RankingEntry {
  userId: string;
  nickname: string;
  totalAsset: number;
  returnPct: number;
  updatedAt: string;
}

export async function upsertRanking(entry: RankingEntry): Promise<void> {
  await setDoc(doc(db, COLLECTION, entry.userId), entry);
}

export async function fetchMyRank(
  userId: string,
): Promise<{ rank: number; entry: RankingEntry } | null> {
  const userSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const entry = userSnap.data() as RankingEntry;
  const aboveSnap = await getCountFromServer(
    query(collection(db, COLLECTION), where("returnPct", ">", entry.returnPct)),
  );
  return { rank: aboveSnap.data().count + 1, entry };
}

export async function fetchTopRankings(n = 200): Promise<RankingEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("returnPct", "desc"),
    limit(n),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RankingEntry);
}

// ── 봇 유틸리티 ──────────────────────────────────────────────────

const BOT_IDS = ["bot_signal", "bot_gold", "bot_ant"] as const;

export function isBotUser(userId: string): boolean {
  return BOT_IDS.some((id) => userId === id);
}

export function getBotType(userId: string): BotType | null {
  if (userId === "bot_signal") return "signal";
  if (userId === "bot_gold") return "golden";
  if (userId === "bot_ant") return "ant";
  return null;
}

export function getBotEmoji(userId: string): string {
  if (userId === "bot_signal") return "\u{1F4E1}";
  if (userId === "bot_gold") return "\u{2728}";
  if (userId === "bot_ant") return "\u{1F41C}";
  return "";
}

export async function fetchBotData(botId: string): Promise<BotFullData | null> {
  try {
    // 프로필
    const profileSnap = await getDoc(doc(db, "bot_profiles", botId));
    if (!profileSnap.exists()) return null;
    const profile = profileSnap.data() as BotProfile;

    // 포트폴리오
    const portSnap = await getDoc(doc(db, "ss_portfolios", botId));
    const port = portSnap.exists()
      ? (portSnap.data() as { cash: number; holdings: Record<string, BotHolding> })
      : { cash: 10_000_000, holdings: {} };

    // 최근 매매 일지 (최신 20건)
    const tradesQuery = query(
      collection(db, `bot_trade_logs/${botId}/trades`),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const tradesSnap = await getDocs(tradesQuery);
    const recentTrades = tradesSnap.docs.map((d) => d.data() as BotTradeEntry);

    // 일일 스냅샷 (최근 30일)
    const snapsQuery = query(
      collection(db, `bot_snapshots/${botId}/daily`),
      orderBy("date", "desc"),
      limit(30),
    );
    const snapsSnap = await getDocs(snapsQuery);
    const dailySnapshots = snapsSnap.docs
      .map((d) => d.data() as BotDailySnapshot)
      .reverse();

    // 총자산 계산
    const holdingsValue = Object.values(port.holdings).reduce(
      (sum, h) => sum + h.currentPrice * h.qty,
      0,
    );
    const totalAsset = port.cash + holdingsValue;
    const returnPct = ((totalAsset - 10_000_000) / 10_000_000) * 100;

    return {
      profile,
      totalAsset,
      returnPct,
      cash: port.cash,
      holdings: port.holdings,
      recentTrades,
      dailySnapshots,
    };
  } catch (err) {
    console.error(`fetchBotData(${botId}) error:`, err);
    return null;
  }
}

// ── 사용자 포트폴리오 조회 ──────────────────────────────────────

export interface UserPortfolioData {
  nickname: string;
  totalAsset: number;
  returnPct: number;
  cash: number;
  holdings: Record<string, BotHolding>;
  history: { date: string; type: "buy" | "sell"; symbol: string; name: string; qty: number; price: number }[];
}

export async function fetchUserPortfolio(userId: string): Promise<UserPortfolioData | null> {
  try {
    const [portSnap, rankSnap] = await Promise.all([
      getDoc(doc(db, "ss_portfolios", userId)),
      getDoc(doc(db, COLLECTION, userId)),
    ]);
    if (!portSnap.exists()) return null;

    const port = portSnap.data() as {
      cash: number;
      holdings: Record<string, BotHolding>;
      history?: { date: string; type: "buy" | "sell"; symbol: string; name: string; qty: number; price: number }[];
    };
    const nickname = rankSnap.exists()
      ? (rankSnap.data() as RankingEntry).nickname
      : "익명";

    const holdingsValue = Object.values(port.holdings ?? {}).reduce(
      (sum, h) => sum + h.currentPrice * h.qty,
      0,
    );
    const totalAsset = port.cash + holdingsValue;
    const returnPct = ((totalAsset - 10_000_000) / 10_000_000) * 100;
    const history = (port.history ?? []).slice(-20);

    return { nickname, totalAsset, returnPct, cash: port.cash, holdings: port.holdings ?? {}, history };
  } catch (err) {
    console.error(`fetchUserPortfolio(${userId}) error:`, err);
    return null;
  }
}

export async function fetchAllBotReturns(): Promise<
  Record<string, { returnPct: number; totalAsset: number; nickname: string }>
> {
  const result: Record<string, { returnPct: number; totalAsset: number; nickname: string }> = {};
  for (const botId of BOT_IDS) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, botId));
      if (snap.exists()) {
        const data = snap.data() as RankingEntry;
        result[botId] = {
          returnPct: data.returnPct,
          totalAsset: data.totalAsset,
          nickname: data.nickname,
        };
      }
    } catch {
      // skip
    }
  }
  return result;
}
