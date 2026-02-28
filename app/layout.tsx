import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { UpdateBanner } from "@/components/UpdateBanner";
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
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <UpdateBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
