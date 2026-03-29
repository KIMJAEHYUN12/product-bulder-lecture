import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import NativeProvider from "@/components/NativeProvider";
import AdSenseScript from "@/components/AdSenseScript";
import { UpdateToast } from "@/components/home/UpdateToast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.simplystock.co.kr";

export const metadata: Metadata = {
  title: {
    default: "심플리스톡(SimplyStock) — 주식 차트 분석 도구",
    template: "%s | 심플리스톡(SimplyStock)",
  },
  description:
    "심플리스톡(SimplyStock) — 회귀 채널, 투자자 수급 흐름, 수급 스캔까지. 데이터 기반 주식 차트 분석 도구.",
  keywords: [
    "심플리스톡",
    "SimplyStock",
    "주식 차트",
    "회귀 채널",
    "수급 분석",
    "투자자 동향",
    "기술적 분석",
    "주식 분석 도구",
    "PER 밴드",
    "밸류에이션",
  ],
  authors: [{ name: "심플리스톡(SimplyStock)" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "심플리스톡(SimplyStock)",
    title: "심플리스톡(SimplyStock) — 주식 차트 분석 도구",
    description:
      "심플리스톡 — 회귀 채널, 투자자 수급 흐름, 수급 스캔까지. 데이터 기반 주식 차트 분석 도구.",
  },
  twitter: {
    card: "summary",
    title: "심플리스톡(SimplyStock) — 주식 차트 분석 도구",
    description:
      "심플리스톡 — 회귀 채널, 투자자 수급 흐름, 수급 스캔까지. 데이터 기반 주식 차트 분석 도구.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="naver-site-verification" content="a362cc81988bddb8d38b50d9d4fdf2df76c0b75a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ss-theme');if(!t)t='dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-34LEGLVB4E"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-34LEGLVB4E');`}
        </Script>
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="afterInteractive"
        />
        <AdSenseScript />
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(function(reg){reg.onupdatefound=function(){var nw=reg.installing;if(nw){nw.onstatechange=function(){if(nw.state==='activated'){window.location.reload()}}}}})}`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "심플리스톡(SimplyStock)",
              alternateName: ["심플리스톡", "SimplyStock"],
              url: "https://www.simplystock.co.kr",
              description:
                "심플리스톡 — 회귀 채널, 투자자 수급 흐름, 수급 스캔까지. 데이터 기반 주식 차트 분석 도구.",
              inLanguage: "ko",
            }),
          }}
        />
        <NativeProvider>
          {children}
          <UpdateToast />
        </NativeProvider>
      </body>
    </html>
  );
}
