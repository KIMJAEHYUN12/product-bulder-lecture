"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";
import { isNative } from "@/lib/platform";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    await setPersistence(auth, browserLocalPersistence);

    if (isNative()) {
      try {
        const { FirebaseAuthentication } = await import(
          "@capacitor-firebase/authentication"
        );
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
        }
      } catch (e: unknown) {
        console.error("네이티브 Google 로그인 실패:", e);
      }
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") return;
      console.error("Google 로그인 실패:", code, e);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return { user, loading, signInWithGoogle, signOut };
}
