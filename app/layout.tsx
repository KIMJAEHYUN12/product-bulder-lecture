import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ExpToast } from "@/components/ExpToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "오비젼의 팩폭 주식 상담소",
  description: "포트폴리오 올려봐요. 뼈 때려드릴게요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.wanted.co.kr/wanted-sans/v1.0/WantedSans-Variable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-REY0S5CDCH"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-REY0S5CDCH');`}
        </Script>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8523090652113599"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <UpdateBanner />
          <ExpToast />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
