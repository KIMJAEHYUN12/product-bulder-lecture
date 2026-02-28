"use client";

import { useEffect, useRef, useCallback } from "react";

const CHECK_INTERVAL = 2 * 60 * 1000; // 2분마다 체크

export function useVersionCheck(onNewVersion: () => void) {
  const currentVersion = useRef<string | null>(null);
  const onNewVersionRef = useRef(onNewVersion);
  onNewVersionRef.current = onNewVersion;

  const check = useCallback(async () => {
    try {
      const res = await fetch("/version.json", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      const v = data?.v;
      if (!v) return;

      if (currentVersion.current === null) {
        currentVersion.current = v; // 최초 로드 시 기준 버전 저장
        return;
      }

      if (currentVersion.current !== v) {
        onNewVersionRef.current();
      }
    } catch {
      // 네트워크 오류 무시
    }
  }, []);

  useEffect(() => {
    check();

    const interval = setInterval(check, CHECK_INTERVAL);

    // 탭 포커스 시에도 체크 (다른 탭에서 오래 있다가 돌아올 때)
    const handleFocus = () => check();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [check]);
}
