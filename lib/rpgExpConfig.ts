export type ExpActivityType =
  | "daily_login"
  | "chart_game_correct"
  | "bitgak_analysis"
  | "mock_trade"
  | "quiz_complete"
  | "share_content"
  | "attendance_bonus"
  | "invite_reward"
  | "battle_win"
  | "battle_lose"
  | "battle_draw";

export interface ExpActivityConfig {
  baseExp: number;
  dailyCap: number; // 0 = 무제한
  label: string;
}

export const EXP_ACTIVITIES: Record<ExpActivityType, ExpActivityConfig> = {
  daily_login: { baseExp: 30, dailyCap: 1, label: "출석 보상" },
  chart_game_correct: { baseExp: 15, dailyCap: 20, label: "차트게임 정답" },
  bitgak_analysis: { baseExp: 25, dailyCap: 10, label: "빗각 분석" },
  mock_trade: { baseExp: 10, dailyCap: 15, label: "모의투자 거래" },
  quiz_complete: { baseExp: 50, dailyCap: 3, label: "성향 테스트" },
  share_content: { baseExp: 15, dailyCap: 3, label: "콘텐츠 공유" },
  attendance_bonus: { baseExp: 0, dailyCap: 1, label: "출석 보너스" },
  invite_reward: { baseExp: 50, dailyCap: 10, label: "친구 초대 보상" },
  battle_win: { baseExp: 30, dailyCap: 10, label: "배틀 승리" },
  battle_lose: { baseExp: 10, dailyCap: 10, label: "배틀 패배" },
  battle_draw: { baseExp: 20, dailyCap: 10, label: "배틀 무승부" },
};
