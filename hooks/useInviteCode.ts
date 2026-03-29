"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  getOrCreateInviteCode,
  registerInvite,
  getInviteStats,
} from "@/lib/inviteApi";
import { kakaoShareFeed } from "@/lib/kakaoShare";

const SHARE_BASE = "https://bitgak.co.kr";

const PENDING_KEY = "ovision_pending_invite";

export function useInviteCode(user: User | null, basePath = "") {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  // 로그인 시 내 코드 + 대기 중 코드 처리
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // 통계 로드
      const stats = await getInviteStats(user.uid).catch(() => null);
      if (cancelled) return;
      if (stats?.code) {
        setMyCode(stats.code);
        setInviteCount(stats.count);
      }

      // 대기 중 코드 처리
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) {
        localStorage.removeItem(PENDING_KEY);
        const res = await registerInvite(user.uid, pending).catch(() => null);
        if (!cancelled && res) {
          setMessage({ text: res.message, ok: res.success });
          setTimeout(() => setMessage(null), 4000);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const generateCode = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getOrCreateInviteCode(
        user.uid,
        user.displayName || "익명"
      );
      setMyCode(result.code);
      setInviteCount(result.usedCount);
    } catch {
      setMessage({ text: "코드 생성 실패", ok: false });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const copyCode = useCallback(async () => {
    if (!myCode) return;
    await navigator.clipboard.writeText(myCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [myCode]);

  const submitCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) {
        setMessage({ text: "6자리 코드를 입력해주세요", ok: false });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      if (!user) {
        // 미로그인: localStorage에 저장
        localStorage.setItem(PENDING_KEY, trimmed);
        setMessage({
          text: "로그인 후 자동으로 적용됩니다",
          ok: true,
        });
        setTimeout(() => setMessage(null), 4000);
        return;
      }

      setLoading(true);
      try {
        const res = await registerInvite(user.uid, trimmed);
        setMessage({ text: res.message, ok: res.success });
        setTimeout(() => setMessage(null), 4000);
      } catch {
        setMessage({ text: "오류가 발생했습니다", ok: false });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const ensureCode = useCallback(async (): Promise<string | null> => {
    if (myCode) return myCode;
    if (!user) return null;
    setLoading(true);
    try {
      const result = await getOrCreateInviteCode(user.uid, user.displayName || "익명");
      setMyCode(result.code);
      setInviteCount(result.usedCount);
      return result.code;
    } catch {
      setMessage({ text: "코드 생성 실패", ok: false });
      setTimeout(() => setMessage(null), 3000);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, myCode]);

  const shareLink = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    const shareData = { title: "오비젼 — AI 투자 분석", text: "AI가 분석하는 투자 리포트, 같이 해봐!", url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* 취소 */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setMessage({ text: "링크가 복사되었습니다", ok: true });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [ensureCode, basePath]);

  const shareKakao = useCallback(async (imageDataUrl?: string) => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    kakaoShareFeed({
      title: "오비젼 — AI 투자 분석",
      description: imageDataUrl ? "내 투자 모험 캐릭터를 확인해봐!" : "AI가 분석하는 투자 리포트, 같이 해봐!",
      imageDataUrl,
      shareUrl: url,
    });
  }, [ensureCode, basePath]);

  const copyLink = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setMessage({ text: "링크가 복사되었습니다", ok: true });
    setTimeout(() => setMessage(null), 3000);
  }, [ensureCode, basePath]);

  return {
    myCode,
    inviteCount,
    loading,
    codeCopied,
    message,
    generateCode,
    copyCode,
    submitCode,
    shareLink,
    shareKakao,
    copyLink,
  };
}
