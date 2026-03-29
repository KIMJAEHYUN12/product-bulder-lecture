"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/platform";

export function useCapacitor() {
  useEffect(() => {
    if (!isNative()) return;

    (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0a0a14" });

      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide();
    })().catch(() => {
      // StatusBar/SplashScreen unavailable on web
    });
  }, []);
}
