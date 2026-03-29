"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import {
  requestAndSavePushToken,
  dismissPushBanner,
  isPushBannerDismissed,
} from "@/lib/pushNotification";

export function PushNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "fail" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const perm = Notification.permission;
    if (perm === "denied") return;
    if (perm === "granted") {
      requestAndSavePushToken();
      return;
    }
    if (isPushBannerDismissed()) return;
    setVisible(true);
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    const ok = await requestAndSavePushToken();
    setLoading(false);
    setResult(ok ? "success" : "fail");
    if (ok) {
      setTimeout(() => setVisible(false), 1500);
    }
  };

  const handleDismiss = () => {
    dismissPushBanner();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 mt-2">
      <div className="flex items-start gap-2 rounded-lg border-l-4 border-amber-500 bg-[var(--bg-overlay)] px-3 py-2.5">
        <Bell className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            장 마감 후 골든크로스·수급 신호 알림을 받아보세요
          </p>
          {result === "success" && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Check className="h-3 w-3" /> 알림이 설정되었습니다
            </p>
          )}
          {result === "fail" && (
            <p className="text-xs text-red-400 mt-1">
              알림 설정에 실패했습니다. 브라우저 설정을 확인해주세요.
            </p>
          )}
        </div>
        {!result && (
          <button
            type="button"
            onClick={handleAllow}
            disabled={loading}
            className="shrink-0 rounded-md bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "알림 받기"
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
