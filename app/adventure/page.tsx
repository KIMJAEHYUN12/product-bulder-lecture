"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRpgCharacter } from "@/hooks/useRpgCharacter";
import CharacterCreation from "@/components/adventure/CharacterCreation";
import CharacterProfile from "@/components/adventure/CharacterProfile";
import StatsPanel from "@/components/adventure/StatsPanel";
import EquipmentSlots from "@/components/adventure/EquipmentSlots";
import EnhancePanel from "@/components/adventure/EnhancePanel";
import GachaPanel from "@/components/adventure/GachaPanel";
import BattlePanel from "@/components/adventure/BattlePanel";
import { LevelUpModal } from "@/components/LevelUpModal";
import { CommunityBoard } from "@/components/mock/CommunityBoard";
import { LoginButton } from "@/components/mock/LoginButton";
import { drainExpQueue, applyExp } from "@/lib/rpgExp";
import { drainStoneQueue } from "@/lib/stoneReward";
import { InviteCodeSection } from "@/components/InviteCodeSection";
import { activateInvite, claimInviteRewards } from "@/lib/inviteApi";
import { expForLevel, RPG_CLASSES } from "@/lib/rpgConstants";
import type { InvestorTypeKey } from "@/lib/investorQuiz";
import type { CharacterSnapshot, PostCategory } from "@/types/social";
import type { EquipmentSlotKey } from "@/types";
import CrossNavigation from "@/components/CrossNavigation";

type Tab = "character" | "enhance" | "gacha" | "battle" | "community";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "character", label: "캐릭터", emoji: "👤" },
  { key: "enhance", label: "강화", emoji: "🔨" },
  { key: "gacha", label: "뽑기", emoji: "🎰" },
  { key: "battle", label: "배틀", emoji: "⚔️" },
  { key: "community", label: "게시판", emoji: "💬" },
];

const ADVENTURE_CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: "char_brag", label: "캐릭터자랑" },
  { key: "guide", label: "공략" },
  { key: "battle_review", label: "배틀후기" },
  { key: "chat", label: "잡담" },
];

const SLOT_ORDER: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

export default function AdventurePage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { character, loading, totalStats, levelTitle, expNeeded, createCharacter, setCharacter } = useRpgCharacter(user?.uid ?? null);
  const [activeTab, setActiveTab] = useState<Tab>("character");
  const [recommendedClass, setRecommendedClass] = useState<InvestorTypeKey | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const processedRef = useRef(false);

  // 캐릭터 생성 + 초대 활성화 래퍼
  const handleCreateCharacter = useCallback(async (classKey: Parameters<typeof createCharacter>[0], nickname: string) => {
    const newChar = createCharacter(classKey, nickname);
    if (user) {
      const bonusStones = await activateInvite(user.uid).catch(() => 0);
      if (bonusStones > 0 && newChar) {
        setCharacter(prev => ({ ...prev, stones: prev.stones + bonusStones }));
      }
    }
  }, [user, createCharacter, setCharacter]);

  // EXP 큐 + 투자석 큐 + 초대 보상 처리
  useEffect(() => {
    if (!character || !user || processedRef.current) return;
    processedRef.current = true;

    (async () => {
      const queue = drainExpQueue();
      const pendingStones = drainStoneQueue();
      const inviteStones = await claimInviteRewards(user.uid).catch(() => 0);
      const totalPendingStones = pendingStones + inviteStones;

      if (queue.length === 0 && totalPendingStones === 0) return;
      const totalExp = queue.reduce((sum, item) => sum + item.exp, 0);
      const result = applyExp(character.exp, character.level, totalExp, expForLevel);
      const stonesToAdd = result.levelsGained + totalPendingStones;
      setCharacter(prev => ({
        ...prev,
        exp: result.exp,
        level: result.level,
        stones: prev.stones + stonesToAdd,
      }));
      if (result.leveledUp) setLevelUpLevel(result.level);
    })();
  }, [character, user, setCharacter]);

  // 캐릭터 스냅샷 구성
  const characterSnapshot: CharacterSnapshot | null = (() => {
    if (!character || !totalStats) return null;
    const classInfo = RPG_CLASSES[character.class];
    const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
    const equipment = SLOT_ORDER
      .map((slot) => character.equipment[slot])
      .filter((eq): eq is NonNullable<typeof eq> => eq !== null)
      .map((eq) => ({
        emoji: eq.emoji,
        name: eq.name,
        grade: eq.grade,
        enhanceLevel: eq.enhanceLevel,
      }));
    return {
      type: "character",
      classEmoji: classInfo.emoji,
      className: classInfo.className,
      nickname: character.nickname,
      level: character.level,
      combatPower,
      equipment,
      battleRecord: character.battleRecord,
    };
  })();

  // 투자성향 테스트 결과에서 추천 클래스 가져오기
  useEffect(() => {
    const key = user?.uid ? `ovision_investor_type_${user.uid}` : "ovision_investor_type_guest";
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.key) setRecommendedClass(parsed.key as InvestorTypeKey);
      } catch { /* ignore */ }
    }
  }, [user]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-400 font-mono animate-pulse">로딩 중...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        {/* 프리뷰 배경 */}
        <div aria-hidden="true" className="pointer-events-none select-none">
          <div className="max-w-lg mx-auto px-4 py-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">←</span>
                <h1 className="text-lg font-black">⚔️ 투자 모험</h1>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10" />
            </div>

            {/* 탭 바 */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
              {['캐릭터', '강화', '뽑기', '배틀', '게시판'].map((tab, i) => (
                <span key={tab} className={`flex-1 text-center px-3 py-2 rounded-lg text-xs font-bold ${i === 0 ? 'bg-kim-red/20 text-kim-red' : 'text-gray-500'}`}>{tab}</span>
              ))}
            </div>

            {/* 캐릭터 프로필 카드 */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-2xl">🧙</div>
                <div>
                  <div className="text-sm font-black">전략가</div>
                  <div className="text-xs text-kim-gold font-bold">Lv.12</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-gray-500">투자석</div>
                  <div className="text-sm font-bold text-kim-gold">💎 23개</div>
                </div>
              </div>

              {/* 스탯 바 */}
              <div className="space-y-2">
                {[
                  { label: 'HP', value: 78, color: 'bg-green-500' },
                  { label: 'ATK', value: 62, color: 'bg-red-500' },
                  { label: 'DEF', value: 55, color: 'bg-blue-500' },
                  { label: 'SPD', value: 44, color: 'bg-yellow-500' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 w-7">{stat.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${stat.value}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-6 text-right">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* EXP 바 */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>EXP</span>
                  <span>45%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-kim-gold" style={{ width: '45%' }} />
                </div>
              </div>
            </div>

            {/* 장비 슬롯 */}
            <div className="grid grid-cols-4 gap-2">
              {['무기', '방어구', '마법서', '악세'].map((slot) => (
                <div key={slot} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <div className="w-8 h-8 mx-auto rounded-lg bg-white/5 border border-dashed border-white/20 mb-1" />
                  <div className="text-[10px] text-gray-500">{slot}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 블러 오버레이 */}
          <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950/95" />
        </div>

        {/* 로그인 CTA */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-4xl mb-4">⚔️</div>
            <h2 className="text-lg font-black mb-2">투자 모험</h2>
            <p className="text-sm text-gray-400 mb-6">로그인하면 캐릭터를 생성하고<br />투자 활동으로 성장시킬 수 있습니다</p>
            <LoginButton user={null} loading={false} onSignIn={signInWithGoogle} onSignOut={signOut} />
            <Link href="/" className="block mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">← 메인으로</Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-400 font-mono animate-pulse">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              ←
            </Link>
            <h1 className="text-lg font-black">⚔️ 투자 모험</h1>
          </div>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>

        {/* 캐릭터 없음 → 생성 플로우 */}
        {!character ? (
          <CharacterCreation
            onComplete={handleCreateCharacter}
            recommendedClass={recommendedClass}
            isLoggedIn={!!user}
          />
        ) : (
          <>
            {/* 탭 바 */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                    activeTab === tab.key ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{tab.emoji}</span>
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <AnimatePresence mode="wait">
              {activeTab === "character" && (
                <motion.div
                  key="character"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4"
                >
                  <CharacterProfile
                    character={character}
                    totalStats={totalStats ?? character.stats}
                    levelTitle={levelTitle}
                    expNeeded={expNeeded}
                  />
                  <StatsPanel baseStats={character.stats} totalStats={totalStats ?? character.stats} />
                  <EquipmentSlots equipment={character.equipment} />
                </motion.div>
              )}

              {activeTab === "enhance" && (
                <motion.div
                  key="enhance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <EnhancePanel character={character} setCharacter={setCharacter} />
                </motion.div>
              )}

              {activeTab === "gacha" && (
                <motion.div
                  key="gacha"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GachaPanel character={character} setCharacter={setCharacter} />
                </motion.div>
              )}

              {activeTab === "battle" && (
                <motion.div
                  key="battle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BattlePanel
                    character={character}
                    totalStats={totalStats ?? character.stats}
                    setCharacter={setCharacter}
                    onLevelUp={(lv) => setLevelUpLevel(lv)}
                  />
                </motion.div>
              )}

              {activeTab === "community" && (
                <motion.div
                  key="community"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CommunityBoard
                    user={user}
                    nickname={character?.nickname ?? user?.displayName ?? undefined}
                    boardId="adventure"
                    boardTitle="모험 게시판"
                    boardSubtitle="캐릭터 자랑 · 공략 · 배틀후기 · 잡담"
                    categories={ADVENTURE_CATEGORIES}
                    snapshotData={characterSnapshot}
                    snapshotCategory="char_brag"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 친구 초대 — 모든 탭 하단 */}
            {user && (
              <InviteCodeSection
                user={user}
                character={character}
                totalStats={totalStats}
                sharePath="/adventure"
              />
            )}
          </>
        )}

        <CrossNavigation currentPath="/adventure" />

        {/* 푸터 */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 font-mono">
            투자 활동으로 경험치를 쌓아 캐릭터를 성장시키세요
          </p>
        </div>
      </div>

      {levelUpLevel !== null && (
        <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
      )}
    </main>
  );
}
