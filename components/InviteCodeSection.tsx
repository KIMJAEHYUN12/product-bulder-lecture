"use client";

import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { useInviteCode } from "@/hooks/useInviteCode";
import { generateCharacterShareImage } from "@/lib/characterShareImage";
import type { RpgCharacter, RpgStats } from "@/types";

interface InviteCodeSectionProps {
  user: User | null;
  character?: RpgCharacter | null;
  totalStats?: RpgStats | null;
  sharePath?: string;
}

export function InviteCodeSection({ user, character, totalStats, sharePath }: InviteCodeSectionProps) {
  const {
    myCode,
    inviteCount,
    loading,
    message,
    shareLink,
    shareKakao,
    copyLink,
    submitCode,
  } = useInviteCode(user, sharePath);

  const [inputCode, setInputCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 캐릭터 카드 이미지 생성 → 카카오 공유
  const handleKakaoShare = useCallback(async () => {
    if (!character || !totalStats) {
      shareKakao();
      return;
    }
    setGenerating(true);
    try {
      const blob = await generateCharacterShareImage(character, totalStats);
      if (blob) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        shareKakao(dataUrl);
      } else {
        shareKakao();
      }
    } catch {
      shareKakao();
    } finally {
      setGenerating(false);
    }
  }, [character, totalStats, shareKakao]);

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mt-4">
      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">
        친구 초대
      </h3>
      <p className="text-[10px] text-gray-500 font-mono mb-3">
        {character ? "내 캐릭터 카드와 함께 공유하고 투자석 보상을 받으세요" : "링크를 공유하고 투자석 보상을 받으세요"}
      </p>

      {user ? (
        <>
          {/* 메인 공유 버튼 */}
          <button
            onClick={shareLink}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 mb-2"
          >
            {loading ? "준비 중..." : "링크 공유하기"}
          </button>

          {/* 보조 버튼 */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleKakaoShare}
              disabled={loading || generating}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#FEE500] text-[#191919] text-xs font-bold hover:bg-[#FDD835] transition-colors disabled:opacity-40"
            >
              <span className="text-sm">💬</span>
              {generating ? "생성중..." : character ? "캐릭터 공유" : "카카오"}
            </button>
            <button
              onClick={copyLink}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
            >
              <span className="text-sm">📋</span>
              복사
            </button>
          </div>

          {/* 초대 현황 */}
          {myCode && (
            <p className="text-[10px] text-gray-500 font-mono text-center mb-2">
              내 코드: {myCode} · {inviteCount}명 초대
            </p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-gray-400 font-mono mb-2">
          로그인하면 초대 링크를 만들 수 있습니다
        </p>
      )}

      {/* 접이식 수동 입력 */}
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono transition-colors"
      >
        {showManual ? "▲ 닫기" : "▼ 초대코드가 있나요?"}
      </button>

      {showManual && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) =>
              setInputCode(e.target.value.toUpperCase().slice(0, 6))
            }
            placeholder="초대코드 입력"
            maxLength={6}
            className="flex-1 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={() => {
              submitCode(inputCode);
              setInputCode("");
            }}
            disabled={loading || inputCode.length < 6}
            className="shrink-0 px-3 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            등록
          </button>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <p
          className={`text-[10px] font-mono text-center mt-2 ${
            message.ok
              ? "text-green-600 dark:text-green-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
