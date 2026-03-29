"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  User,
} from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 브라우저 세션 단위로만 로그인 유지 (탭/창 닫으면 자동 로그아웃)
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(() => {});
    // 모바일 redirect 결과 처리
    getRedirectResult(auth).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await setPersistence(auth, browserSessionPersistence);
    try {
      await signInWithPopup(auth, provider);
    } catch {
      // 모바일 인앱 브라우저 등에서 팝업 차단 시 redirect 폴백
      await signInWithRedirect(auth, provider);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return { user, loading, signInWithGoogle, signOut };
}
