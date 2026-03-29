"use client";

import Script from "next/script";
import { isNative } from "@/lib/platform";

export default function AdSenseScript() {
  if (isNative()) return null;
  return (
    <Script
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8523090652113599"
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
