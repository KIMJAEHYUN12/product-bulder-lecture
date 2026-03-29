// ── 초대코드 ──
export interface InviteCode {
  code: string;
  ownerId: string;
  ownerNickname: string;
  createdAt: string; // ISO
  usedCount: number;
}

export interface InviteRecord {
  inviteeId: string;
  inviterCode: string;
  inviterId: string;
  activated: boolean;
  rewardGranted: boolean;
  createdAt: string;
}

// ── 출석 ──
export interface DayReward {
  day: number; // 1~7
  exp: number;
  stones?: number;
  label: string;
}

export interface AttendanceData {
  currentDay: number; // 1~7
  lastCheckIn: string; // YYYY-MM-DD
  totalDays: number;
  checkedToday: boolean;
  history: string[]; // 최근 7일 날짜
}

// ── 커뮤니티 ──
export type MockPostCategory = "insight" | "question" | "brag" | "tip";
export type AdventurePostCategory = "char_brag" | "guide" | "battle_review" | "chat";
export type PostCategory = MockPostCategory | AdventurePostCategory;

export type BoardId = "community" | "adventure";

export const BOARD_COLLECTIONS: Record<BoardId, { posts: string; replies: string }> = {
  community: { posts: "community_posts", replies: "community_replies" },
  adventure: { posts: "adventure_posts", replies: "adventure_replies" },
};

// ── 스냅샷 ──
export interface PortfolioSnapshot {
  type: "portfolio";
  totalAsset: number;
  returnPct: number;
  holdings: { name: string; pct: number; pnlPct: number }[];
}

export interface CharacterSnapshot {
  type: "character";
  classEmoji: string;
  className: string;
  nickname: string;
  level: number;
  combatPower: number;
  equipment: { emoji: string; name: string; grade: string; enhanceLevel: number }[];
  battleRecord: { wins: number; losses: number; draws: number };
}

export type PostSnapshot = PortfolioSnapshot | CharacterSnapshot;

export interface CommunityReply {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface CommunityPostExtended {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
  category: PostCategory;
  likes: number;
  likedBy: string[];
  replyCount: number;
  snapshot?: PostSnapshot;
}
