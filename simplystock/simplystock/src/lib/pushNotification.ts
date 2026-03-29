import { getToken } from "firebase/messaging";
import { getMessagingInstance } from "@/lib/firebase";
import { getDeviceId } from "@/lib/api";

const FIREBASE_HOST = "https://bitgak.co.kr";
const VAPID_KEY = "BNG2F_Ddyf8ggvog0NfT1rQJNrlCpxFNVxcTIdrSgapiQdCe0DIM4n_vfbbQOptGvyjq3oSlDfB2edZkCfBXG8Y";
const LS_TOKEN_KEY = "ss_push_token";
const LS_DISMISS_KEY = "ss_push_banner_dismissed";

export async function requestAndSavePushToken(): Promise<boolean> {
  try {
    const messaging = getMessagingInstance();
    if (!messaging) { console.warn("[push] messaging 미지원"); return false; }

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    // SW 활성화 대기
    const sw = await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") { console.warn("[push] 권한 거부:", permission); return false; }

    console.log("[push] getToken 시도...");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });
    if (!token) { console.warn("[push] 토큰 없음"); return false; }
    console.log("[push] 토큰 발급 성공:", token.slice(0, 20) + "...");

    const cached = localStorage.getItem(LS_TOKEN_KEY);
    if (cached === token) return true;

    await fetch(`${FIREBASE_HOST}/api/save-push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        deviceId: getDeviceId(),
        platform: "web",
      }),
      signal: AbortSignal.timeout(8000),
    });

    localStorage.setItem(LS_TOKEN_KEY, token);
    return true;
  } catch (err) {
    console.error("[push] 토큰 등록 실패:", err);
    return false;
  }
}

export function dismissPushBanner(): void {
  localStorage.setItem(LS_DISMISS_KEY, "1");
}

export function isPushBannerDismissed(): boolean {
  return localStorage.getItem(LS_DISMISS_KEY) === "1";
}
