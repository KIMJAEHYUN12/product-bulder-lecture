"use client";

import { useEffect, useState } from "react";
import { fetchAllBotReturns } from "@/lib/rankingApi";

interface BotComparisonBannerProps {
  myReturnPct: number;
}

interface BotReturn {
  returnPct: number;
  totalAsset: number;
  nickname: string;
}

const BOT_CONFIG: Record<string, { emoji: string; color: string }> = {
  bot_signal: { emoji: "\u{1F4E1}", color: "text-cyan-400" },
  bot_gold: { emoji: "\u{2728}", color: "text-amber-400" },
  bot_ant: { emoji: "\u{1F41C}", color: "text-rose-400" },
};

interface Badge {
  label: string;
  style: string;
}

function getBadges(myReturn: number, bots: Record<string, BotReturn>): Badge[] {
  const badges: Badge[] = [];
  const ant = bots.bot_ant;
  const gold = bots.bot_gold;
  const signal = bots.bot_signal;

  const beatAnt = ant && myReturn > ant.returnPct;
  const beatGold = gold && myReturn > gold.returnPct;
  const beatSignal = signal && myReturn > signal.returnPct;

  if (beatAnt && beatGold && beatSignal) {
    badges.push({ label: "AI 정복자", style: "bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 text-white" });
  } else {
    if (beatSignal) badges.push({ label: "시그널 마스터", style: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" });
    if (beatGold) badges.push({ label: "골드 브레이커", style: "bg-amber-500/20 text-amber-300 border border-amber-500/30" });
    if (beatAnt) badges.push({ label: "개미 헌터", style: "bg-rose-500/20 text-rose-300 border border-rose-500/30" });
  }

  return badges;
}

export function BotComparisonBanner({ myReturnPct }: BotComparisonBannerProps) {
  const [bots, setBots] = useState<Record<string, BotReturn>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchAllBotReturns()
      .then(setBots)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || Object.keys(bots).length === 0) return null;

  const badges = getBadges(myReturnPct, bots);

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-3 mb-4">
      <div className="text-[10px] text-[var(--text-muted)] font-mono mb-2">
        AI 봇 vs 나
      </div>

      <div className="space-y-1.5">
        {/* 내 수익률 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-indigo-400 font-medium">나</span>
          <span
            className={`text-xs font-bold ${
              myReturnPct > 0 ? "text-red-400" : myReturnPct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
            }`}
          >
            {myReturnPct > 0 ? "+" : ""}{myReturnPct.toFixed(2)}%
          </span>
        </div>

        {/* 봇 수익률 */}
        {Object.entries(bots).map(([botId, bot]) => {
          const config = BOT_CONFIG[botId];
          if (!config) return null;
          const isBeaten = myReturnPct > bot.returnPct;
          return (
            <div key={botId} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                {config.emoji} {bot.nickname}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold ${
                    bot.returnPct > 0 ? "text-red-400" : bot.returnPct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"
                  }`}
                >
                  {bot.returnPct > 0 ? "+" : ""}{bot.returnPct.toFixed(2)}%
                </span>
                {isBeaten && (
                  <span className="text-[9px] text-green-400 font-bold">WIN</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 배지 */}
      {badges.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-primary)] flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.style}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
