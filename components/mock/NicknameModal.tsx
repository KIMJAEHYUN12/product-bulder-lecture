"use client";

import { useState } from "react";

interface NicknameModalProps {
  onConfirm: (nickname: string, strategy: string) => void;
  onClose?: () => void;
  defaultNickname?: string; // 초기값 (편집 가능)
  defaultStrategy?: string; // 기존 전략 초기값
}

export function NicknameModal({ onConfirm, onClose, defaultNickname, defaultStrategy }: NicknameModalProps) {
  const [nickname, setNickname] = useState(defaultNickname ?? "");
  const [strategy, setStrategy] = useState(defaultStrategy ?? "");
  const [error, setError] = useState("");

  function handleConfirm() {
    const nick = nickname.trim();
    if (nick.length < 2) { setError("닉네임은 2자 이상 입력하세요."); return; }
    if (nick.length > 20) { setError("닉네임이 너무 깁니다."); return; }
    onConfirm(nick, strategy.trim().slice(0, 20));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="bg-gray-900 border border-white/15 rounded-xl p-6 w-full max-w-[320px] shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-2">🏆</div>
          <h2 className="text-base font-black text-white">닉네임 & 전략 설정</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            랭킹에 표시될 닉네임과 투자 전략을 설정하세요
          </p>
        </div>

        {/* 닉네임 — 항상 편집 가능 */}
        <label className="block text-xs text-gray-500 font-mono mb-1">
          닉네임 <span className="text-gray-600">(2–20자)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder="ex) 반도체왕, 주식고수"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          autoFocus
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-kim-red mb-3"
        />

        {/* 한줄 전략 */}
        <label className="block text-xs text-gray-500 font-mono mb-1">
          나의 투자 전략 <span className="text-gray-600">(선택 · 20자 이내)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder='ex) "반도체 올인", "분산이 답"'
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-kim-red mb-1"
        />
        <div className="text-right text-[10px] text-gray-600 font-mono mb-4">
          {strategy.trim().length}/20
        </div>

        {error && (
          <p className="text-xs text-red-400 font-mono text-center mb-3">{error}</p>
        )}

        <div className="text-[10px] text-gray-600 font-mono text-center mb-4">
          ※ 닉네임과 전략은 공개됩니다. 개인정보 입력 금지.
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-2 rounded-lg bg-kim-red text-white text-sm font-mono font-bold hover:bg-red-600 transition-colors mb-2"
        >
          저장 & 랭킹 등록
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
