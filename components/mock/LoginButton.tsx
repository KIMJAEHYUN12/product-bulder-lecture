"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import Image from "next/image";

interface LoginButtonProps {
  user: User | null;
  loading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function LoginButton({ user, loading, onSignIn, onSignOut }: LoginButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (user) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="계정 메뉴"
          className="flex items-center gap-2 rounded-lg hover:bg-white/5 px-1.5 py-1 transition-colors"
        >
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName ?? ""}
              width={28}
              height={28}
              className="rounded-full ring-2 ring-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-kim-red/30 flex items-center justify-center text-xs font-bold text-kim-red">
              {(user.displayName ?? "?")[0]}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-none truncate max-w-[80px]">
              {user.displayName}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">▾ 메뉴</div>
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-gray-900 border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-2.5 border-b border-white/10">
              <div className="text-xs font-bold text-white truncate">{user.displayName}</div>
              <div className="text-[10px] text-gray-500 font-mono truncate">{user.email}</div>
            </div>
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 font-mono transition-colors flex items-center gap-2"
            >
              <span>↩</span> 로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => Promise.resolve(onSignIn()).catch(() => {})}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition-colors text-xs font-bold whitespace-nowrap"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="hidden sm:inline">Google 로그인</span>
      <span className="sm:hidden">로그인</span>
    </button>
  );
}
