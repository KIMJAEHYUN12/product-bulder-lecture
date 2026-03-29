# Ovision 프로젝트 컨텍스트 (1/2): 구조 + 페이지 + Lib

> 참고: 소스 코드 내부의 트리플 백틱(```)은 마크다운 코드블록 충돌 방지를 위해 `` ` ``로 이스케이프 되어 있습니다.

## 1. 프로젝트 개요

- **프레임워크**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **백엔드**: Firebase Functions v2 (Node.js) — Gemini 2.5 Flash
- **호스팅**: Firebase Hosting (static export, `output: 'export'`)
- **인증**: Firebase Auth (Google OAuth, browserSessionPersistence)
- **DB**: Firestore
- **차트**: lightweight-charts, recharts
- **테마**: next-themes (`darkMode: 'class'`, 기본 dark)
- **React**: 19 (`npm install --legacy-peer-deps` 필수)
- **도메인**: https://bitgak.co.kr (API 호스트: https://mylen-24263782-5d205.web.app)

## 2. 파일 트리

```
./.gitignore
./app/adventure/layout.tsx
./app/adventure/page.tsx
./app/backtest/page.tsx
./app/chart-game/page.tsx
./app/error.tsx
./app/globals.css
./app/layout.tsx
./app/mock-investment/page.tsx
./app/page.tsx
./app/privacy/page.tsx
./app/quiz/page.tsx
./app/stock-lab/page.tsx
./app/terms/page.tsx
./components/AdSlot.tsx
./components/AnalysisHistory.tsx
./components/AnalysisLoading.tsx
./components/AnalysisReport.tsx
./components/AnimatedNumber.tsx
./components/AttendanceCalendar.tsx
./components/BitgakChart.tsx
./components/BitgakInterpretCard.tsx
./components/ChartOverlay.tsx
./components/CrossNavigation.tsx
./components/DailyBriefing.tsx
./components/DailyDiscovery.tsx
./components/DashboardWidgets.tsx
./components/ExpToast.tsx
./components/ExpressionIcons.tsx
./components/FileDropZone.tsx
./components/HelpModal.tsx
./components/HeroLanding.tsx
./components/InvestorTrendCompact.tsx
./components/InviteCodeSection.tsx
./components/KimCharacter.tsx
./components/LevelUpModal.tsx
./components/PopularStocks.tsx
./components/RoastButton.tsx
./components/RoastResult.tsx
./components/ShareModal.tsx
./components/Skeleton.tsx
./components/StaggerContainer.tsx
./components/StockGradeCard.tsx
./components/StockRoastSection.tsx
./components/StreakBadge.tsx
./components/TechIndicatorCard.tsx
./components/ThemeToggle.tsx
./components/UpdateBanner.tsx
./components/Watchlist.tsx
./components/adventure/BattleArena.tsx
./components/adventure/BattlePanel.tsx
./components/adventure/BattleResultView.tsx
./components/adventure/CharacterCreation.tsx
./components/adventure/CharacterProfile.tsx
./components/adventure/EnhancePanel.tsx
./components/adventure/EquipmentSlots.tsx
./components/adventure/GachaPanel.tsx
./components/adventure/GachaResult.tsx
./components/adventure/GachaReveal.tsx
./components/adventure/StatsPanel.tsx
./components/chart-game/GameChart.tsx
./components/chart-game/GameControls.tsx
./components/chart-game/StreakCounter.tsx
./components/mock/CharacterSnapshotCard.tsx
./components/mock/CommunityBoard.tsx
./components/mock/InvestorProfileModal.tsx
./components/mock/InvestorQuizModal.tsx
./components/mock/InvestorShareCard.ts
./components/mock/LoginButton.tsx
./components/mock/NicknameModal.tsx
./components/mock/OrderModal.tsx
./components/mock/PortfolioSnapshotCard.tsx
./components/mock/PortfolioSummary.tsx
./components/mock/RankingBoard.tsx
./components/mock/SectorTabs.tsx
./components/mock/StockList.tsx
./components/mock/WebViewBanner.tsx
./components/stock-lab/AiBriefing.tsx
./components/stock-lab/BottomTabs.tsx
./components/stock-lab/ComparisonCards.tsx
./components/stock-lab/ComparisonChart.tsx
./components/stock-lab/InvestorTrend.tsx
./components/stock-lab/NewsPanel.tsx
./components/stock-lab/SectorCompare.tsx
./components/stock-lab/SignalScanner.tsx
./components/stock-lab/StockSearchBar.tsx
./data/krStocks.json
./firebase.json
./firestore.rules
./functions/data/dartCorpCodes.json
./functions/data/krStocks.json
./functions/data/sectorOverrides.json
./functions/index.js
./functions/package-lock.json
./functions/package.json
./hooks/useAttendance.ts
./hooks/useAuth.ts
./hooks/useBacktest.ts
./hooks/useInviteCode.ts
./hooks/useMarketData.ts
./hooks/useMockPortfolio.ts
./hooks/useRoastFlow.ts
./hooks/useRpgCharacter.ts
./hooks/useStockLab.ts
./hooks/useStockRoast.ts
./hooks/useStreak.ts
./hooks/useVersionCheck.ts
./hooks/useWatchlist.ts
./lib/adminConfig.ts
./lib/analysisShareImage.ts
./lib/analyzeApi.ts
./lib/backtestShareImage.ts
./lib/battleEngine.ts
./lib/bitgakEngine.ts
./lib/characterShareImage.ts
./lib/chartGameApi.ts
./lib/chartGameRankingApi.ts
./lib/communityApi.ts
./lib/communityReplyApi.ts
./lib/dailyBriefingApi.ts
./lib/dailyDiscoveryApi.ts
./lib/enhanceEngine.ts
./lib/firebase.ts
./lib/gachaEngine.ts
./lib/gachaPool.ts
./lib/investorQuiz.ts
./lib/investorRecommendApi.ts
./lib/investorTrendApi.ts
./lib/inviteApi.ts
./lib/kakaoShare.ts
./lib/kstDate.ts
./lib/popularStocksApi.ts
./lib/portfolioDb.ts
./lib/rankingApi.ts
./lib/rpgCharacterDb.ts
./lib/rpgConstants.ts
./lib/rpgExp.ts
./lib/rpgExpConfig.ts
./lib/signalScanApi.ts
./lib/stockBriefingApi.ts
./lib/stockChartApi.ts
./lib/stockPricesApi.ts
./lib/stockRoastApi.ts
./lib/stockSearchApi.ts
./lib/stoneReward.ts
./lib/watchlistDb.ts
./next.config.ts
./package-lock.json
./package.json
./postcss.config.mjs
./public/ads.txt
./public/favicon.svg
./public/og-image.png
./public/version.json
./scripts/gen-kr-stocks.mjs
./scripts/gen-version.js
./scripts/generate-og.js
./tailwind.config.ts
./tsconfig.json
./types/index.ts
./types/kakao.d.ts
./types/social.ts
```

## 3. package.json dependencies

```json
{
  "name": "ovision",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "prebuild": "node scripts/gen-version.js",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "firebase": "^12.9.0",
    "framer-motion": "^11.0.0",
    "lightweight-charts": "^5.1.0",
    "lucide-react": "^0.400.0",
    "next": "15.1.6",
    "next-themes": "^0.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^3.7.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^8",
    "eslint-config-next": "15.1.6",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

## 4. 주요 설정 파일

### tsconfig.json
```json
{
  "compilerOptions": {
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "target": "ES2017"
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "simplystock"
  ]
}
```

### tailwind.config.ts
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kim: {
          red: "#e63946",
          gold: "#f4a261",
          dark: "#1a1a2e",
          card: "#16213e",
          border: "#0f3460",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Wanted Sans"', 'system-ui', 'sans-serif'],
        mono: ["var(--font-geist-mono)", "Courier New", "monospace"],
      },
      animation: {
        "type-cursor": "blink 1s step-end infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### next.config.ts
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

### firebase.json
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "functions/**"],
    "headers": [
      {
        "source": "/",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "**/*.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "_next/static/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/version.json",
        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
      }
    ],
    "rewrites": [
      {
        "source": "/api/analyze",
        "function": "analyze"
      },
      {
        "source": "/api/kospi-futures",
        "function": "kospiFutures"
      },
      {
        "source": "/api/kospi-futures-night-test",
        "function": "kospiFuturesNightTest"
      },
      {
        "source": "/api/stock-chart",
        "function": "stockChart"
      },
      {
        "source": "/api/stock-prices",
        "function": "stockPrices"
      },
      {
        "source": "/api/investor-profile",
        "function": "investorProfile"
      },
      {
        "source": "/api/stock-roast",
        "function": "stockRoast"
      },
      {
        "source": "/api/chart-game",
        "function": "chartGame"
      },
      {
        "source": "/api/stock-briefing",
        "function": "stockBriefing"
      },
      {
        "source": "/api/stock-search",
        "function": "stockSearch"
      },
      {
        "source": "/api/market",
        "function": "market"
      },
      {
        "source": "/api/investor-trend",
        "function": "investorTrend"
      },
      {
        "source": "/api/popular-stocks",
        "function": "popularStocks"
      },
      {
        "source": "/api/investor-recommend",
        "function": "investorRecommend"
      },
      {
        "source": "/api/signals",
        "function": "signalsScanner"
      },
      {
        "source": "/api/signal-scan",
        "function": "signalScan"
      },
      {
        "source": "/api/golden-history",
        "function": "goldenHistory"
      },
      {
        "source": "/api/ss-watchlist",
        "function": "ssWatchlist"
      },
      {
        "source": "/api/per-band",
        "function": "perBand"
      },
      {
        "source": "/api/commodity-prices",
        "function": "commodityPrices"
      },
      {
        "source": "/api/earnings-calendar",
        "function": "earningsCalendar"
      },
      {
        "source": "/api/bot-init",
        "function": "botInit"
      },
      {
        "source": "/api/bot-force-trade",
        "function": "botForceTrade"
      },
      {
        "source": "/api/save-push-token",
        "function": "savePushToken"
      },
      {
        "source": "/api/portfolio-analyze",
        "function": "portfolioAnalyze"
      },
      {
        "source": "/api/portfolio-ocr",
        "function": "portfolioOcr"
      },
      {
        "source": "/api/stock-earnings",
        "function": "stockEarnings"
      }
    ]
  },
  "functions": {
    "source": "functions"
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

### firestore.rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 랭킹: 누구나 읽기 가능, 로그인한 사용자만 자신의 항목 쓰기, 관리자는 삭제 가능
    match /mock_rankings/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null &&
        (request.auth.uid == userId ||
         request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"]);
    }

    // SimplyStock 모의투자 랭킹
    match /ss_mock_rankings/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    // 포트폴리오: 로그인한 사용자만 자신의 문서 읽기/쓰기
    match /portfolios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 차트 게임 랭킹: 누구나 읽기, 로그인한 사용자만 자신의 항목 쓰기
    match /chart_game_rankings/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }

    // 투자 게시판: 누구나 읽기, 로그인한 사용자만 작성/삭제, 좋아요 토글 위해 로그인 유저 update 허용
    match /community_posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"]);
    }

    // 커뮤니티 답글
    match /community_replies/{replyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"]);
    }

    // 모험 게시판
    match /adventure_posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"]);
    }

    // 모험 답글
    match /adventure_replies/{replyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"]);
    }

    // SimplyStock 포트폴리오: 로그인 사용자면 누구나 읽기, 쓰기는 본인만
    match /ss_portfolios/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // SimplyStock 봇 프로필: 누구나 읽기 (Admin SDK만 쓰기)
    match /bot_profiles/{botId} {
      allow read: if true;
    }

    // SimplyStock 봇 매매 일지: 누구나 읽기
    match /bot_trade_logs/{botId}/trades/{tradeId} {
      allow read: if true;
    }

    // SimplyStock 봇 일일 스냅샷: 누구나 읽기
    match /bot_snapshots/{botId}/daily/{date} {
      allow read: if true;
    }

    // SimplyStock 봇 실행 로그
    match /bot_runs/{date} {
      allow read: if true;
    }

    // 초대코드
    match /invite_codes/{code} {
      allow read: if true;
      allow create, update: if request.auth != null;
    }

    // 초대 기록
    match /invite_records/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null;
    }

    // 유저 스트릭 (로그인 시 자기 문서 읽기/쓰기)
    match /user_streaks/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 관심종목 (로그인 시 자기 문서 읽기/쓰기)
    match /watchlists/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // RPG 캐릭터 (로그인 시 자기 문서 읽기/쓰기)
    match /rpg_characters/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 초대 보상 (본인 읽기, 로그인 사용자 생성/수정)
    match /invite_rewards/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create, update: if request.auth != null;
    }

    // SimplyStock 피드백 (비로그인 포함 create, 관리자만 read)
    match /ss_feedback/{docId} {
      allow create: if request.resource.data.message is string
        && request.resource.data.message.size() > 0
        && request.resource.data.message.size() <= 500;
      allow read: if request.auth != null
        && request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"];
    }

    // SimplyStock 설정 (누구나 읽기, 관리자만 쓰기)
    match /ss_config/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"];
    }

    // SimplyStock 업데이트 내역 (누구나 읽기, 관리자만 쓰기/삭제)
    match /ss_updates/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid in ["zqyi38VH6vPN6HQNiOxEVBbxCg03"];
    }
  }
}
```

## 5. app/ 페이지 전체 소스

### app/layout.tsx
```tsx
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
```

### app/error.tsx
```tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-6xl">😱</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">시스템 오류 발생</h2>
        <p className="text-gray-400 text-sm font-mono mb-2">
          잠시 서버가 흔들렸습니다. 다시 시도해주세요.
        </p>
        {error?.message && (
          <p className="text-gray-600 text-[10px] font-mono mb-4 max-w-xs mx-auto truncate">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-mono rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
```

### app/page.tsx
```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileDropZone } from "@/components/FileDropZone";
import { RoastButton } from "@/components/RoastButton";
import { KimCharacter } from "@/components/KimCharacter";
import { RoastResult } from "@/components/RoastResult";
import { AnalysisReport } from "@/components/AnalysisReport";
import {
  NewsTicker,
  DailyQuote,
  MarketSentimentGauge,
  CommodityTicker,
  EconomicCalendar,
  KospiNightFutures,
} from "@/components/DashboardWidgets";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { StockRoastSection } from "@/components/StockRoastSection";
import { BitgakChart } from "@/components/BitgakChart";
import { TechIndicatorCard } from "@/components/TechIndicatorCard";
import { PopularStocks } from "@/components/PopularStocks";
import { AnalysisHistory, addToHistory } from "@/components/AnalysisHistory";
import { HelpModal } from "@/components/HelpModal";
import { AdSlot } from "@/components/AdSlot";
import { DailyBriefing } from "@/components/DailyBriefing";
import { StreakBadge } from "@/components/StreakBadge";
import { Watchlist } from "@/components/Watchlist";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useRoastFlow } from "@/hooks/useRoastFlow";
import { useMarketData } from "@/hooks/useMarketData";
import { useStreak } from "@/hooks/useStreak";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/mock/LoginButton";
import { incrementAnalysisCount } from "@/lib/popularStocksApi";
import { grantExp } from "@/lib/rpgExp";
import { BitgakInterpretCard } from "@/components/BitgakInterpretCard";
import type { AnalysisMode, TechIndicators, BitgakMeta } from "@/types";

export default function Home() {
  const [mode, setMode] = useState<AnalysisMode>("kim");
  const { state, loadImage, startRoast, startBitgakRoast, reset, clearResult } = useRoastFlow();
  const { fearGreed, news, econCalendar, commodities, kimComment, isLoading: marketLoading } = useMarketData();
  const [bitgakSummary, setBitgakSummary] = useState<{ summary: string; stockName: string } | null>(null);
  const [techIndicators, setTechIndicators] = useState<TechIndicators | null>(null);
  const [bitgakMeta, setBitgakMeta] = useState<BitgakMeta | null>(null);
  const [externalStock, setExternalStock] = useState<{ symbol: string; name: string } | null>(null);
  const streak = useStreak();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  // URL 쿼리 파라미터 처리 (?mode=makalong, ?ref=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    if (modeParam === "makalong") {
      setMode("makalong");
    }
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("ovision_pending_invite", refCode.toUpperCase());
      // URL에서 ?ref= 제거
      params.delete("ref");
      const qs = params.toString();
      const cleanUrl = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  const handleBitgakReady = useCallback((summary: string, stockName: string, indicators?: TechIndicators, meta?: BitgakMeta) => {
    setBitgakSummary({ summary, stockName });
    setTechIndicators(indicators ?? null);
    setBitgakMeta(meta ?? null);

    // 인기 종목 카운트 증가 (Yahoo Finance symbol 우선 사용)
    if (stockName) {
      const sym = externalStock?.symbol || summary.match(/종목코드:\s*(\S+)/)?.[1] || stockName;
      incrementAnalysisCount(sym, stockName);
    }

    // 히스토리에 추가
    if (indicators) {
      const channelMatch = summary.match(/채널 방향:\s*(\S+)/);
      const posMatch = summary.match(/현재 위치:\s*(.+)/);
      addToHistory({
        symbol: externalStock?.symbol ?? stockName,
        name: stockName,
        date: new Date().toLocaleDateString("ko-KR"),
        channelDir: channelMatch?.[1] ?? "판별불가",
        position: posMatch?.[1] ?? "",
        rsi: indicators.rsi,
      });
    }

    grantExp("bitgak_analysis");
  }, [externalStock]);

  const handleExternalSelect = useCallback((stock: { symbol: string; name: string }) => {
    setExternalStock(stock);
  }, []);

  const switchMode = (newMode: AnalysisMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    clearResult();
    setBitgakSummary(null);
    setTechIndicators(null);
    setBitgakMeta(null);
    setExternalStock(null);
  };
  const {
    previewUrl,
    isLoading,
    roast,
    analysis,
    scores,
    sector,
    error,
    grade,
    kimExpression,
  } = state;

  const hasImage = !!previewUrl;
  const hasResult = !!roast || !!error;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white grid-bg transition-colors">
      {/* News Ticker */}
      <NewsTicker news={news} isLoading={marketLoading} />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <DailyBriefing />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
              {mode === "kim" ? (
                <>오비젼의{" "}<span className="text-kim-red">포폴 진단</span></>
              ) : (
                <>오비젼의{" "}<span className="text-blue-400">차트 분석</span></>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <StreakBadge currentStreak={streak.currentStreak} maxStreak={streak.maxStreak} />
              <KimCharacter expression={kimExpression} isLoading={isLoading} mode={mode} />
              <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
              <ThemeToggle />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">
            {mode === "kim"
              ? "포트폴리오 스크린샷 업로드 → AI 팩폭 진단"
              : "종목 선택 → 자동 빗각 작도 → AI 매매 판단"}
          </p>
          <div className="space-y-2 mt-3">
            {/* 핵심 2개 — 크게 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => switchMode("kim")}
                className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                  mode === "kim"
                    ? "border-kim-red text-white shadow-lg shadow-red-900/50"
                    : "border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:border-kim-red/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {mode === "kim" && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 bg-kim-red rounded-[10px]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative text-sm sm:text-base">🏭</span>
                <div className="relative text-left">
                  <div className="text-xs sm:text-sm font-black leading-none">포폴 진단</div>
                  <div className="text-[10px] opacity-75 leading-none mt-0.5 font-mono">스크린샷 분석</div>
                </div>
              </button>
              <button
                onClick={() => switchMode("makalong")}
                className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all ${
                  mode === "makalong"
                    ? "border-blue-500 text-white shadow-lg shadow-blue-900/50"
                    : "border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:border-blue-400/50 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {mode === "makalong" && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 bg-blue-500 rounded-[10px]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative text-sm sm:text-base">📐</span>
                <div className="relative text-left">
                  <div className="text-xs sm:text-sm font-black leading-none">차트 분석</div>
                  <div className="text-[10px] opacity-75 leading-none mt-0.5 font-mono">빗각 작도</div>
                </div>
              </button>
            </div>
            {/* 나머지 6개 — 3x2 균등 그리드 */}
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                href="/mock-investment"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500 dark:hover:border-emerald-400 transition-all text-center"
              >
                <span className="text-sm">📈</span>
                <div className="text-xs font-black leading-none">모의투자</div>
              </Link>
              <Link
                href="/stock-lab"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-cyan-500/50 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all text-center"
              >
                <span className="text-sm">🔬</span>
                <div className="text-xs font-black leading-none">분석실</div>
              </Link>
              <Link
                href="/chart-game"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-orange-500/50 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 hover:border-orange-500 dark:hover:border-orange-400 transition-all text-center"
              >
                <span className="text-sm">🎮</span>
                <div className="text-xs font-black leading-none">차트게임</div>
              </Link>
              <Link
                href="/quiz"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all text-center"
              >
                <span className="text-sm">🧠</span>
                <div className="text-xs font-black leading-none">투자성향</div>
              </Link>
              <Link
                href="/backtest"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-violet-500/50 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 hover:border-violet-500 dark:hover:border-violet-400 transition-all text-center"
              >
                <span className="text-sm">🔄</span>
                <div className="text-xs font-black leading-none">백테스트</div>
              </Link>
              <Link
                href="/adventure"
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 hover:border-amber-500 dark:hover:border-amber-400 transition-all text-center"
              >
                <span className="text-sm">⚔️</span>
                <div className="text-xs font-black leading-none">투자 모험</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Watchlist />
            {user && <AttendanceCalendar />}
            {mode === "kim" ? (
              <>
                <KospiNightFutures />
                <MarketSentimentGauge fearGreed={fearGreed} isLoading={marketLoading} />
                <CommodityTicker commodities={commodities} kimComment={kimComment} isLoading={marketLoading} />
              </>
            ) : (
              <>
                <PopularStocks onSelect={handleExternalSelect} />
                <AnalysisHistory onSelect={handleExternalSelect} />
              </>
            )}
          </div>

          {/* CENTER */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {mode === "kim" && <StockRoastSection />}
            {mode === "kim" && !hasImage && <DailyQuote />}

            {mode === "makalong" ? (
              <>
                <BitgakChart onAnalysisReady={handleBitgakReady} externalSymbol={externalStock} onExternalClear={() => setExternalStock(null)} />

                {techIndicators && <TechIndicatorCard indicators={techIndicators} />}

                {bitgakSummary && (
                  <RoastButton
                    disabled={!bitgakSummary}
                    isLoading={isLoading}
                    hasResult={hasResult}
                    onClick={() => startBitgakRoast(bitgakSummary.summary, bitgakSummary.stockName)}
                    mode={mode}
                  />
                )}

                {hasResult && !isLoading && (
                  <div className="text-center">
                    <button
                      onClick={() => { reset(); setBitgakSummary(null); setTechIndicators(null); setBitgakMeta(null); setExternalStock(null); }}
                      className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
                    >
                      새 차트 분석
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <FileDropZone previewUrl={previewUrl} onFile={loadImage} onClear={reset} mode={mode} />

                <RoastButton
                  disabled={!hasImage}
                  isLoading={isLoading}
                  hasResult={hasResult}
                  onClick={() => startRoast(mode, state.imageBase64 ?? "", state.mimeType ?? "")}
                  mode={mode}
                />

                {hasResult && !isLoading && (
                  <div className="text-center">
                    <button
                      onClick={reset}
                      className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors font-mono"
                    >
                      새 포트폴리오로 시작
                    </button>
                  </div>
                )}
              </>
            )}

            <AnalysisLoading isLoading={isLoading} mode={mode} />

            {mode === "makalong" && bitgakMeta && bitgakSummary ? (
              <BitgakInterpretCard meta={bitgakMeta} stockName={bitgakSummary.stockName} />
            ) : (
              <RoastResult roast={roast} error={error} grade={grade} mode={mode} isStreaming={state.isStreaming} scores={scores} />
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1">
            <AnalysisReport
              analysis={analysis}
              scores={scores}
              sector={sector}
              mode={mode}
              roast={mode === "makalong" ? roast : null}
            />
          </div>

        </div>

        {/* Bottom: Economic Calendar (포폴진단 모드만) */}
        {mode === "kim" && <EconomicCalendar events={econCalendar} />}

        {/* 광고 */}
        <AdSlot className="mt-6" />

        {/* SimplyStock 크로스 프로모션 */}
        <a
          href="https://simplystock-b3b85.web.app"
          target="_blank"
          rel="noopener"
          className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.08] group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-cyan-500 text-lg shrink-0">📊</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 font-mono">SimplyStock</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">회귀 채널과 수급 흐름으로 종목을 분석해보세요</p>
            </div>
          </div>
          <span className="text-xs text-cyan-500 group-hover:text-cyan-400 transition-colors shrink-0 ml-2 font-mono">바로가기 &rarr;</span>
        </a>

        {/* 면책조항 + 푸터 */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 text-center">
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono leading-relaxed mb-3 max-w-xl mx-auto">
            본 서비스는 정보 제공 목적이며 투자 권유·추천이 아닙니다. AI 분석 결과는 참고용이며, 투자 판단과 그에 따른 손익의 책임은 전적으로 이용자 본인에게 있습니다.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 font-mono">
            <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">개인정보처리방침</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">이용약관</Link>
            <span>·</span>
            <span>© 2026 오비젼</span>
          </div>
        </div>
      </div>
      <HelpModal />
    </main>
  );
}
```

### app/chart-game/page.tsx
```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GameChart } from "@/components/chart-game/GameChart";
import { GameControls } from "@/components/chart-game/GameControls";
import { StreakCounter } from "@/components/chart-game/StreakCounter";
import { NicknameModal } from "@/components/mock/NicknameModal";
import { fetchGameRound } from "@/lib/chartGameApi";
import {
  fetchChartGameRankings,
  upsertChartGameRanking,
  fetchMyChartGameRank,
} from "@/lib/chartGameRankingApi";
import { useAuth } from "@/hooks/useAuth";
import { LoginButton } from "@/components/mock/LoginButton";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { grantExp } from "@/lib/rpgExp";
import { claimChartStreakStone } from "@/lib/stoneReward";
import type { GamePhase, GameRound, ChartGameRankingEntry } from "@/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ChartGamePage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [streak, setStreak] = useState(0);
  const [userGuess, setUserGuess] = useState<"up" | "down" | null>(null);
  const [roundHistory, setRoundHistory] = useState<string[]>([]);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Ranking
  const [rankings, setRankings] = useState<ChartGameRankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [myRank, setMyRank] = useState<{ rank: number; entry: ChartGameRankingEntry } | null>(null);

  // Nickname modal
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Load rankings
  const loadRankings = useCallback(async (n = 20) => {
    setRankingsLoading(true);
    try {
      const data = await fetchChartGameRankings(n);
      setRankings(data);
      if (user) {
        const my = await fetchMyChartGameRank(user.uid).catch(() => null);
        setMyRank(my);
      }
    } catch {
      // ignore
    } finally {
      setRankingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRankings(5);
  }, [loadRankings]);

  // Load a new round
  const loadRound = useCallback(async (history: string[]) => {
    setPhase("loading");
    setError(null);
    setUserGuess(null);
    try {
      const round = await fetchGameRound(history);
      setCurrentRound(round);
      setRoundHistory((prev) => [...prev, round.stockSymbol]);
      setPhase("guessing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로드 실패");
      setPhase("intro");
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setStreak(0);
    setTotalCorrect(0);
    setTotalGames(0);
    setRoundHistory([]);
    setCurrentRound(null);
    setUserGuess(null);
    setError(null);
    setPhase("loading");
    // Directly call loadRound with empty history
    fetchGameRound([])
      .then((round) => {
        setCurrentRound(round);
        setRoundHistory([round.stockSymbol]);
        setPhase("guessing");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "로드 실패");
        setPhase("intro");
      });
  }, []);

  // Handle guess
  const handleGuess = useCallback((guess: "up" | "down") => {
    if (phase !== "guessing" || !currentRound) return;
    setUserGuess(guess);
    setPhase("revealing");
  }, [phase, currentRound]);

  // After reveal animation finishes
  const handleRevealComplete = useCallback(() => {
    if (!currentRound || !userGuess) return;
    const correct = userGuess === currentRound.direction;
    setTotalGames((g) => g + 1);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setTotalCorrect((c) => c + 1);
      grantExp("chart_game_correct");
      if (newStreak >= 5 && newStreak % 5 === 0) {
        claimChartStreakStone();
      }
      setPhase("result");
    } else {
      setPhase("result");
      setTimeout(() => setPhase("gameover"), 1800);
    }
  }, [currentRound, userGuess]);

  const isCorrect = currentRound && userGuess ? userGuess === currentRound.direction : false;

  // Next round
  const nextRound = useCallback(() => {
    setCurrentRound(null);
    setUserGuess(null);
    loadRound(roundHistory);
  }, [loadRound, roundHistory]);

  // Save ranking
  const saveRanking = useCallback(async (nickname: string) => {
    if (!user) return;
    setShowNicknameModal(false);
    setPendingSave(true);

    try {
      const existing = await fetchMyChartGameRank(user.uid).catch(() => null);
      const bestStreak = Math.max(streak, existing?.entry.bestStreak ?? 0);
      const prevTotal = existing?.entry.totalGames ?? 0;
      const prevCorrect = existing?.entry.totalCorrect ?? 0;

      await upsertChartGameRanking({
        userId: user.uid,
        nickname,
        bestStreak,
        totalGames: prevTotal + totalGames,
        totalCorrect: prevCorrect + totalCorrect,
        updatedAt: new Date().toISOString(),
      });

      localStorage.setItem(`ovision_chart_nick_${user.uid}`, nickname);
      await loadRankings(20);
    } catch {
      // ignore
    } finally {
      setPendingSave(false);
    }
  }, [user, streak, totalGames, totalCorrect, loadRankings]);

  // Share
  const [shareToast, setShareToast] = useState(false);

  const handleShare = useCallback(() => {
    const text = `오비젼 차트 업다운 게임에서 ${streak}연승!\n도전해봐 👉 https://bitgak.co.kr/chart-game`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }).catch(() => {});
    }
  }, [streak]);

  const handleTwitterShare = useCallback(() => {
    const text = `차트 업다운 게임 ${streak}연승! — 오비젼`;
    const url = "https://bitgak.co.kr/chart-game";
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [streak]);

  const savedNickname = typeof window !== "undefined" && user
    ? localStorage.getItem(`ovision_chart_nick_${user.uid}`) ?? undefined
    : undefined;

  // Should show chart? (once a round is loaded, keep it visible through revealing/result/gameover)
  const showChart = !!currentRound && (phase === "guessing" || phase === "revealing" || phase === "result" || phase === "gameover");
  // Map phase for chart component
  const chartPhase = (phase === "guessing" || phase === "revealing" || phase === "result" || phase === "gameover") ? phase : "guessing";

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
          >
            ← 홈
          </Link>
          <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
            📊 차트 업다운
          </h1>
          <div className="flex items-center gap-2">
            <StreakCounter streak={streak} />
            <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
          </div>
        </div>

        {/* ── Chart: stays mounted across phases ── */}
        {showChart && currentRound && (
          <div className="mb-4">
            <GameChart
              visibleCandles={currentRound.visibleCandles}
              hiddenCandles={currentRound.hiddenCandles}
              phase={chartPhase}
              onRevealComplete={handleRevealComplete}
            />
          </div>
        )}

        {/* ── Phase-specific UI ── */}
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center py-8">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-xl font-black mb-2">차트 업다운 게임</h2>
                <p className="text-sm text-gray-400 font-mono leading-relaxed max-w-sm mx-auto">
                  실제 주식 차트를 보고 올랐는지 내렸는지 맞춰보세요!<br />
                  종목명은 숨겨져 있습니다.
                </p>
              </div>

              {error && (
                <div className="text-xs text-red-400 font-mono text-center">{error}</div>
              )}

              <motion.button
                onClick={startGame}
                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-lg transition-all duration-300"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                🎮 게임 시작
              </motion.button>

              <RankingPreview
                rankings={rankings}
                loading={rankingsLoading}
                myUserId={user?.uid ?? null}
                myRank={myRank}
                limit={5}
              />
            </motion.div>
          )}

          {/* LOADING */}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <motion.div
                className="text-4xl"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                📊
              </motion.div>
              <p className="text-sm text-gray-500 font-mono">차트 불러오는 중...</p>
            </motion.div>
          )}

          {/* GUESSING (controls only — chart is above) */}
          {phase === "guessing" && currentRound && (
            <motion.div
              key="guessing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center">
                <p className="text-sm font-bold text-orange-400 mb-1">
                  이후 {currentRound.hiddenCandles.length}거래일 후, 올랐을까? 내렸을까?
                </p>
              </div>
              <GameControls onGuess={handleGuess} />
            </motion.div>
          )}

          {/* REVEALING */}
          {phase === "revealing" && currentRound && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="text-center text-sm text-gray-500 font-mono">
                나의 선택: {userGuess === "up" ? "📈 올랐다" : "📉 내렸다"}
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === "result" && currentRound && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-4"
            >
              <motion.div
                className={`text-center p-4 rounded-xl border ${
                  isCorrect
                    ? "bg-green-900/20 border-green-500/30"
                    : "bg-red-900/20 border-red-500/30"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-3xl mb-2">{isCorrect ? "🎉" : "💀"}</div>
                <div className="text-lg font-black mb-1">
                  {isCorrect ? "정답!" : "오답..."}
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  {currentRound.stockName} ·{" "}
                  <span className={currentRound.direction === "up" ? "text-red-400" : "text-blue-400"}>
                    {currentRound.direction === "up" ? "+" : ""}
                    {currentRound.changePct}%
                  </span>
                </div>
              </motion.div>

              {isCorrect && (
                <motion.button
                  onClick={nextRound}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  다음 라운드 →
                </motion.button>
              )}
            </motion.div>
          )}

          {/* GAMEOVER */}
          {phase === "gameover" && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center py-4">
                <motion.div
                  className="text-2xl font-black text-gray-500 tracking-widest mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  GAME OVER
                </motion.div>
                <motion.div
                  className="text-4xl font-black text-orange-400"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                >
                  🔥 {streak} 연승
                </motion.div>
                {currentRound && (
                  <div className="text-xs text-gray-500 font-mono mt-2">
                    마지막: {currentRound.stockName} ·{" "}
                    <span className={currentRound.direction === "up" ? "text-red-400" : "text-blue-400"}>
                      {currentRound.direction === "up" ? "+" : ""}
                      {currentRound.changePct}%
                    </span>
                  </div>
                )}
              </div>

              {user && streak > 0 && !pendingSave && (
                <motion.button
                  onClick={() => setShowNicknameModal(true)}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-lg transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  🏆 랭킹 등록
                </motion.button>
              )}

              {!user && streak > 0 && (
                <motion.button
                  onClick={() => signInWithGoogle().then(() => setShowNicknameModal(true)).catch(() => {})}
                  className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-sm hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Google 로그인하고 랭킹 등록
                </motion.button>
              )}

              {pendingSave && (
                <div className="text-center text-xs text-gray-500 font-mono">저장 중...</div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  onClick={startGame}
                  className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg text-sm transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  다시 도전
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-sm hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {shareToast ? "복사됨!" : "공유하기"}
                </motion.button>
                <motion.button
                  onClick={handleTwitterShare}
                  className="py-3 rounded-xl bg-black border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  X 공유
                </motion.button>
              </div>

              <RankingPreview
                rankings={rankings}
                loading={rankingsLoading}
                myUserId={user?.uid ?? null}
                myRank={myRank}
                limit={20}
                onRefresh={() => loadRankings(20)}
              />

              <AdSlot />
            </motion.div>
          )}
        </AnimatePresence>

        <CrossNavigation currentPath="/chart-game" />
      </div>

      {/* Nickname Modal */}
      {showNicknameModal && (
        <NicknameModal
          onConfirm={(nickname) => saveRanking(nickname)}
          onClose={() => setShowNicknameModal(false)}
          defaultNickname={savedNickname}
          defaultStrategy=""
        />
      )}
    </main>
  );
}

// ── Ranking Preview ──
function RankingPreview({
  rankings,
  loading,
  myUserId,
  myRank,
  limit,
  onRefresh,
}: {
  rankings: ChartGameRankingEntry[];
  loading: boolean;
  myUserId: string | null;
  myRank: { rank: number; entry: ChartGameRankingEntry } | null;
  limit: number;
  onRefresh?: () => void;
}) {
  const displayed = rankings.slice(0, limit);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-black">🏆 연승 랭킹</h3>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">TOP {limit}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[10px] text-gray-500 hover:text-white font-mono border border-white/10 hover:border-white/30 px-2 py-1 rounded transition-colors disabled:opacity-40"
          >
            새로고침
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono text-center py-4">
          아직 등록된 기록이 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-12 text-[10px] text-gray-500 font-mono px-2 pb-1 border-b border-white/10">
            <span className="col-span-1">#</span>
            <span className="col-span-5">닉네임</span>
            <span className="col-span-3 text-right">연승</span>
            <span className="col-span-3 text-right">정답률</span>
          </div>

          {displayed.map((entry, i) => {
            const isMe = entry.userId === myUserId;
            const accuracy = entry.totalGames > 0
              ? Math.round((entry.totalCorrect / entry.totalGames) * 100)
              : 0;

            return (
              <div
                key={entry.userId}
                className={`px-2 py-1.5 rounded-lg transition-colors ${
                  isMe ? "bg-orange-500/10 border border-orange-500/30" : "hover:bg-white/5"
                }`}
              >
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">
                    {i < 3 ? MEDALS[i] : `${i + 1}`}
                  </span>
                  <div className="col-span-5 min-w-0">
                    <div className={`truncate font-semibold ${isMe ? "text-orange-400" : "text-white"}`}>
                      {entry.nickname}
                      {isMe && <span className="ml-1 text-[10px] text-orange-400/70">나</span>}
                    </div>
                  </div>
                  <span className="col-span-3 text-right font-bold text-orange-400">
                    🔥 {entry.bestStreak}
                  </span>
                  <span className="col-span-3 text-right text-gray-500">
                    {accuracy}%
                  </span>
                </div>
              </div>
            );
          })}

          {myRank && !displayed.some((r) => r.userId === myUserId) && (
            <>
              <div className="flex items-center gap-2 py-1 px-2">
                <div className="flex-1 border-t border-dashed border-white/10" />
                <span className="text-[10px] text-gray-400 font-mono shrink-0">내 순위</span>
                <div className="flex-1 border-t border-dashed border-white/10" />
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="grid grid-cols-12 items-center text-xs font-mono">
                  <span className="col-span-1 text-gray-500">{myRank.rank}</span>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate font-semibold text-orange-400">
                      {myRank.entry.nickname}
                      <span className="ml-1 text-[10px] text-orange-400/70">나</span>
                    </div>
                  </div>
                  <span className="col-span-3 text-right font-bold text-orange-400">
                    🔥 {myRank.entry.bestStreak}
                  </span>
                  <span className="col-span-3 text-right text-gray-500">
                    {myRank.entry.totalGames > 0
                      ? Math.round((myRank.entry.totalCorrect / myRank.entry.totalGames) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

### app/mock-investment/page.tsx
```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SectorTabs, SECTORS, Sector } from "@/components/mock/SectorTabs";
import { StockList, StockInfo, ALL_STOCKS } from "@/components/mock/StockList";
import { OrderModal } from "@/components/mock/OrderModal";
import { PortfolioSummary } from "@/components/mock/PortfolioSummary";
import { NicknameModal } from "@/components/mock/NicknameModal";
import { RankingBoard } from "@/components/mock/RankingBoard";
import { CommunityBoard } from "@/components/mock/CommunityBoard";
import { WebViewBanner } from "@/components/mock/WebViewBanner";
import { InvestorType } from "@/lib/investorQuiz";
import { LoginButton } from "@/components/mock/LoginButton";
import { useMockPortfolio, Holding } from "@/hooks/useMockPortfolio";
import { useAuth } from "@/hooks/useAuth";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { upsertRanking } from "@/lib/rankingApi";
import { grantExp } from "@/lib/rpgExp";
import { claimMockDailyStone } from "@/lib/stoneReward";
import type { PortfolioSnapshot, PostCategory } from "@/types/social";

const STRATEGY_KEY = "ovision_strategy";
const PREV_RETURN_KEY = "ovision_prev_return";

function getAndUpdatePrevReturn(currentPct: number): number | undefined {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(PREV_RETURN_KEY);
    if (raw) {
      const { date, pct } = JSON.parse(raw);
      if (date === today) return pct;
      localStorage.setItem(PREV_RETURN_KEY, JSON.stringify({ date: today, pct }));
      return pct;
    }
  } catch { /* ignore */ }
  localStorage.setItem(PREV_RETURN_KEY, JSON.stringify({ date: today, pct: currentPct }));
  return undefined;
}
const NICKNAME_PREFIX = "ovision_rank_nick_";
const INVESTOR_TYPE_PREFIX = "ovision_investor_type_";

const MOCK_CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: "insight", label: "인사이트" },
  { key: "question", label: "질문" },
  { key: "brag", label: "수익자랑" },
  { key: "tip", label: "꿀팁" },
];

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function MockInvestmentPage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [activeSector, setActiveSector] = useState<Sector>(SECTORS[0]);
  const [orderTarget, setOrderTarget] = useState<{
    stock: StockInfo;
    type: "buy" | "sell";
    price: number;
    holding: Holding | null;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [strategy, setStrategy] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [investorType, setInvestorType] = useState<InvestorType | null>(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showLoginConfirm, setShowLoginConfirm] = useState(false);
  const [rankingRefresh, setRankingRefresh] = useState(0);
  const lastRankingUpdate = useRef<string>("");

  const {
    portfolio,
    prices,
    pricesLoading,
    settling,
    initialized,
    totalAsset,
    returnPct,
    refreshPrices,
    placeOrder,
    resetPortfolio,
  } = useMockPortfolio(user?.uid);

  // strategy 로드 (localStorage, 기기별)
  useEffect(() => {
    setStrategy(localStorage.getItem(STRATEGY_KEY) ?? "");
  }, []);

  // 닉네임 로드 (로그인 사용자별 커스텀 닉네임)
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`${NICKNAME_PREFIX}${user.uid}`);
      setNickname(saved ?? user.displayName ?? "");
    } else {
      setNickname("");
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // 투자 성향 로드
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`${INVESTOR_TYPE_PREFIX}${user.uid}`);
      if (saved) {
        try { setInvestorType(JSON.parse(saved)); } catch { /* ignore */ }
      }
    } else {
      setInvestorType(null);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // 섹터 변경 시 시세 로드
  useEffect(() => {
    const symbols = ALL_STOCKS.filter((s) => s.sector === activeSector).map((s) => s.symbol);
    refreshPrices(symbols);
  }, [activeSector, refreshPrices]);

  // 보유 종목 시세 로드
  useEffect(() => {
    if (!initialized) return;
    const heldSymbols = Object.keys(portfolio.holdings);
    if (heldSymbols.length > 0) refreshPrices(heldSymbols);
  }, [initialized, portfolio.holdings, refreshPrices]);

  // 랭킹 자동 업데이트 (로그인 유저만, 시세 로드 완료 후)
  useEffect(() => {
    if (!user || !initialized || pricesLoading) return;
    // 거래 이력 없는 유저는 랭킹에 등록하지 않음
    const hasTraded = (portfolio.history ?? []).length > 0;
    if (!hasTraded) return;
    // 보유종목이 있는데 prices에 하나도 없으면 아직 시세 미로드 → 스킵
    const heldSymbols = Object.keys(portfolio.holdings);
    if (heldSymbols.length > 0 && !heldSymbols.some(s => prices[s])) return;
    const key = `${Math.round(totalAsset)}_${returnPct.toFixed(2)}`;
    if (key === lastRankingUpdate.current) return;
    lastRankingUpdate.current = key;
    const displayNick = nickname || user.displayName || user.email || "익명";
    const topHolding = Object.entries(portfolio.holdings)
      .map(([sym, h]) => ({ name: h.name, value: (prices[sym]?.price ?? h.currentPrice) * h.qty }))
      .sort((a, b) => b.value - a.value)[0]?.name ?? "";
    upsertRanking({
      userId: user.uid,
      nickname: displayNick,
      strategy,
      totalAsset,
      returnPct,
      updatedAt: new Date().toISOString().slice(0, 10),
      ...(investorType ? { investorType: `${investorType.emoji} ${investorType.name}` } : {}),
      holdingCount: Object.keys(portfolio.holdings).length,
      topHolding,
      prevReturnPct: getAndUpdatePrevReturn(returnPct),
      pnlAmount: Math.round(totalAsset - 10_000_000),
    })
      .then(() => setRankingRefresh((n) => n + 1))
      .catch(() => {});
  }, [totalAsset, returnPct, user, strategy, nickname, investorType, initialized, pricesLoading, prices, portfolio.holdings]);

  // 포트폴리오 스냅샷 구성
  const portfolioSnapshot: PortfolioSnapshot | null = (() => {
    if (!initialized) return null;
    const entries = Object.entries(portfolio.holdings)
      .map(([, h]) => {
        const pnlPct = h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
        return { name: h.name, pct: 0, pnlPct };
      })
      .sort((a, b) => b.pnlPct - a.pnlPct)
      .slice(0, 3);
    return { type: "portfolio", totalAsset, returnPct, holdings: entries };
  })();

  // 수익률 +5% 이상 시 투자석 보상 (KST 일 1회)
  const mockStoneClaimedRef = useRef(false);
  useEffect(() => {
    if (!initialized || pricesLoading || mockStoneClaimedRef.current) return;
    if (returnPct >= 5) {
      mockStoneClaimedRef.current = true;
      claimMockDailyStone();
    }
  }, [initialized, pricesLoading, returnPct]);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleStrategyConfirm(nick: string, strat: string) {
    // 전략 저장
    localStorage.setItem(STRATEGY_KEY, strat);
    setStrategy(strat);
    // 닉네임 저장 (로그인 사용자)
    if (user) {
      localStorage.setItem(`${NICKNAME_PREFIX}${user.uid}`, nick);
      setNickname(nick);
    }
    setShowStrategyModal(false);
    // 랭킹 즉시 업데이트 강제
    lastRankingUpdate.current = "";
    showToast("닉네임/전략이 랭킹에 등록됩니다!");
    setRankingRefresh((n) => n + 1);
  }

  function handleOpenBuy(stock: StockInfo, price: number) {
    if (!user) {
      showToast("Google 로그인 후 거래에 참여할 수 있습니다", false);
      signInWithGoogle().catch(() => {});
      return;
    }
    setOrderTarget({ stock, type: "buy", price, holding: portfolio.holdings[stock.symbol] ?? null });
  }

  function handleOpenSell(stock: StockInfo, price: number, holding: Holding) {
    if (!user) {
      showToast("Google 로그인 후 거래에 참여할 수 있습니다", false);
      signInWithGoogle().catch(() => {});
      return;
    }
    setOrderTarget({ stock, type: "sell", price, holding });
  }

  // 보유 종목 패널에서 매도 클릭 시
  function handleSellFromPortfolio(symbol: string, holding: Holding, price: number) {
    const stock = ALL_STOCKS.find((s) => s.symbol === symbol);
    if (!stock) return;
    setOrderTarget({ stock, type: "sell", price, holding });
  }

  const handleConfirmOrder = useCallback(
    (qty: number) => {
      if (!orderTarget) return;
      try {
        placeOrder(orderTarget.stock.symbol, orderTarget.stock.name, orderTarget.type, qty);
        grantExp("mock_trade");
        showToast(
          `${orderTarget.stock.name} ${orderTarget.type === "buy" ? "매수" : "매도"} ${qty}주 체결`
        );
        setOrderTarget(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "주문 실패";
        showToast(msg, false);
      }
    },
    [orderTarget, placeOrder]
  );

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-400 font-mono animate-pulse">로딩 중...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        {/* 프리뷰 배경 */}
        <div aria-hidden="true" className="pointer-events-none select-none">
          {/* 헤더 */}
          <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur">
            <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">←</span>
                <h1 className="text-base font-black">모의투자</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-kim-gold/20 text-kim-gold font-bold">가상 1,000만원</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10" />
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto px-4 py-4 flex flex-col lg:flex-row gap-4">
            {/* 좌측: 자산 요약 + 섹터탭 + 종목 리스트 */}
            <div className="flex-1 space-y-4">
              {/* 자산 요약 */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-gray-400 mb-1">총 자산</div>
                <div className="text-2xl font-black text-white">10,834,200<span className="text-sm font-normal text-gray-400 ml-1">원</span></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-green-400">+8.34%</span>
                  <span className="text-xs text-gray-500">현금 3,210,000원</span>
                </div>
              </div>

              {/* 섹터 탭 */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['전체', 'IT', '바이오', '금융', '소비재', '에너지'].map((s, i) => (
                  <span key={s} className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 whitespace-nowrap ${i === 0 ? 'bg-kim-red/20 text-kim-red border border-kim-red/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}>{s}</span>
                ))}
              </div>

              {/* 종목 리스트 */}
              <div className="space-y-2">
                {[
                  { name: '삼성전자', price: '55,200', change: '+1.2%', up: true },
                  { name: 'SK하이닉스', price: '178,500', change: '-0.8%', up: false },
                  { name: 'NAVER', price: '203,000', change: '+2.1%', up: true },
                ].map((stock) => (
                  <div key={stock.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="text-sm font-bold">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{stock.price}원</div>
                      <div className={`text-xs font-bold ${stock.up ? 'text-green-400' : 'text-red-400'}`}>{stock.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측: 포트폴리오 카드 */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="text-xs font-bold text-gray-400">내 포트폴리오</div>
                <div className="text-lg font-black">10,834,200<span className="text-xs font-normal text-gray-400 ml-1">원</span></div>
                <div className="text-sm font-bold text-green-400">+834,200원 (+8.34%)</div>
                <div className="border-t border-white/10 pt-3 space-y-2">
                  {[
                    { name: '삼성전자', qty: '20주', value: '1,104,000원' },
                    { name: '카카오', qty: '15주', value: '742,500원' },
                  ].map((h) => (
                    <div key={h.name} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{h.name} <span className="text-gray-500">{h.qty}</span></span>
                      <span className="text-gray-400">{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 블러 오버레이 */}
          <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950/95" />
        </div>

        {/* 로그인 CTA */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-4xl mb-4">📈</div>
            <h2 className="text-lg font-black mb-2">모의투자</h2>
            <p className="text-sm text-gray-400 mb-6">로그인하면 가상 1,000만원으로<br />실제 주식 시세로 모의투자를 시작할 수 있습니다</p>
            <LoginButton user={null} loading={false} onSignIn={signInWithGoogle} onSignOut={signOut} />
            <Link href="/" className="block mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">← 메인으로</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white grid-bg">
      {/* 인앱 브라우저 차단 안내 */}
      <WebViewBanner />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kim-red/15 border border-kim-red/40 text-kim-red hover:bg-kim-red/25 hover:border-kim-red transition-all font-bold text-xs whitespace-nowrap"
            >
              ← 팩트폭격기
            </Link>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                모의투자{" "}
                <span className="text-kim-red text-xs font-mono font-normal">
                  가상 1,000만원
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 자산 요약 — 로그인 유저만 */}
            {user && (
              <div className="hidden sm:flex items-center gap-6 font-mono text-sm">
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">평가손익</div>
                  <div className={`font-bold ${returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"}`}>
                    {totalAsset - 10_000_000 > 0 ? "+" : ""}{fmt(Math.round(totalAsset - 10_000_000))}원
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">수익률</div>
                  <div className={`font-bold ${returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"}`}>
                    {returnPct > 0 ? "+" : ""}{returnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">현금</div>
                  <div className="text-gray-600 dark:text-zinc-300">{fmt(Math.round(portfolio.cash))}원</div>
                </div>
                <button
                  onClick={() => setShowStrategyModal(true)}
                  className="text-xs font-mono px-3 py-1.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  ✏️ 닉네임/전략
                </button>
              </div>
            )}

            <LoginButton
              user={user}
              loading={authLoading}
              onSignIn={signInWithGoogle}
              onSignOut={signOut}
            />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {/* 안내 배너 */}
        <div className="mb-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-2 text-xs text-yellow-500/80 font-mono">
          ※ 매수/매도 즉시 현재가로 체결됩니다. 오후 6시에 당일 종가로 보유 종목 평가금액이 업데이트됩니다.
          {settling && <span className="ml-2 animate-pulse text-yellow-300">종가 업데이트 중...</span>}
        </div>

        {/* 섹터 탭 */}
        <div className="mb-4">
          <SectorTabs active={activeSector} onChange={setActiveSector} />
        </div>

        {/* 메인 3컬럼 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* 종목 리스트 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">
                {activeSector}
                <span className="text-xs text-gray-500 font-mono ml-2">
                  {ALL_STOCKS.filter((s) => s.sector === activeSector).length}종목
                </span>
              </h2>
              {pricesLoading && (
                <span className="text-[10px] text-gray-500 font-mono animate-pulse">
                  시세 로딩중...
                </span>
              )}
            </div>
            <StockList
              sector={activeSector}
              prices={prices}
              pricesLoading={pricesLoading}
              holdings={portfolio.holdings}
              onBuy={handleOpenBuy}
              onSell={handleOpenSell}
            />
          </div>

          {/* 포트폴리오 or 로그인 CTA */}
          <div className="lg:col-span-1">
            {user ? (
              <div className="flex flex-col gap-3">
                <PortfolioSummary
                  portfolio={portfolio}
                  prices={prices}
                  totalAsset={totalAsset}
                  returnPct={returnPct}
                  settling={settling}
                  onSell={handleSellFromPortfolio}
                  onReset={() => {
                    if (confirm("포트폴리오를 초기화하면 모든 데이터가 삭제됩니다. 계속하시겠습니까?")) {
                      resetPortfolio();
                      showToast("초기화 완료");
                    }
                  }}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[220px]" >
                <div className="text-4xl">📈</div>
                <div>
                  <p className="text-gray-900 dark:text-white font-bold mb-1">모의투자 참여하기</p>
                  <p className="text-xs text-gray-500 font-mono leading-relaxed">
                    Google 로그인하면 가상 1,000만원으로<br />
                    실제 주식 시세로 모의투자를 시작하고<br />
                    랭킹에 도전할 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={() => setShowLoginConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition-colors text-sm font-bold"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google로 시작하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 랭킹 보드 — 누구나 열람 */}
        <RankingBoard myUserId={user?.uid ?? null} refreshTrigger={rankingRefresh} />

        {/* 투자 게시판 — 누구나 열람, 로그인 후 글쓰기 */}
        <CommunityBoard
          user={user}
          nickname={nickname}
          boardId="community"
          boardTitle="투자 게시판"
          boardSubtitle="투자 의견 · 수익 자랑 · 수다 · 누구나 열람"
          categories={MOCK_CATEGORIES}
          snapshotData={portfolioSnapshot}
          snapshotCategory="brag"
        />

        {/* 광고 */}
        <AdSlot className="mt-4" />

        <CrossNavigation currentPath="/mock-investment" />

        {/* 푸터 */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-center gap-4 text-xs text-gray-400 font-mono">
          <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">개인정보처리방침</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">이용약관</Link>
          <span>·</span>
          <span>© 2026 오비젼</span>
        </div>
      </div>

      {/* 주문 모달 */}
      {orderTarget && (
        <OrderModal
          stock={orderTarget.stock}
          type={orderTarget.type}
          currentPrice={orderTarget.price}
          cash={portfolio.cash}
          holding={orderTarget.holding}
          onConfirm={handleConfirmOrder}
          onClose={() => setOrderTarget(null)}
        />
      )}


      {/* 닉네임/전략 설정 모달 (로그인 유저만) */}
      {showStrategyModal && user && (
        <NicknameModal
          defaultNickname={nickname || (user.displayName ?? undefined)}
          defaultStrategy={strategy}
          onConfirm={handleStrategyConfirm}
          onClose={() => setShowStrategyModal(false)}
        />
      )}

      {/* Google 로그인 확인 모달 */}
      {showLoginConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-gray-900 border border-white/15 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-3xl mb-3">📈</div>
              <h2 className="text-base font-black text-white mb-1">모의투자 참여</h2>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Google 계정으로 로그인하면<br />
                가상 1,000만원으로 모의투자를 시작하고<br />
                수익률 랭킹에 참여할 수 있습니다.
              </p>
            </div>
            <div className="text-[10px] text-gray-600 font-mono text-center mb-4">
              ※ 닉네임은 로그인 후 자유롭게 변경 가능합니다.<br />
              ※ 브라우저를 닫으면 자동으로 로그아웃됩니다.
            </div>
            <button
              onClick={() => {
                setShowLoginConfirm(false);
                signInWithGoogle().catch(() => {});
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition-colors text-sm font-bold mb-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 로그인하기
            </button>
            <button
              onClick={() => setShowLoginConfirm(false)}
              className="w-full py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-mono shadow-lg transition-all ${
          toast.ok ? "bg-gray-800 text-white border border-white/20" : "bg-red-900/80 text-red-200 border border-red-500/30"
        }`}>
          {toast.msg}
        </div>
      )}
    </main>
  );
}
```

### app/stock-lab/page.tsx
```tsx
"use client";

import Link from "next/link";
import { StockSearchBar } from "@/components/stock-lab/StockSearchBar";
import { ComparisonChart } from "@/components/stock-lab/ComparisonChart";
import { ComparisonCards } from "@/components/stock-lab/ComparisonCards";
import { AiBriefing } from "@/components/stock-lab/AiBriefing";
import { BottomTabs } from "@/components/stock-lab/BottomTabs";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { LoginButton } from "@/components/mock/LoginButton";
import { useStockLab } from "@/hooks/useStockLab";
import { useAuth } from "@/hooks/useAuth";

export default function StockLabPage() {
  const {
    state,
    addStock,
    removeStock,
    setRange,
    requestBriefing,
    loadInvestorTrend,
    loadSectorComparison,
    loadSignalScan,
    getIndustry,
  } = useStockLab();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-500 hover:text-white transition-colors text-sm"
            >
              ← 홈
            </Link>
            <h1 className="text-xl font-black">
              🔬 <span className="text-blue-400">종목 분석실</span>
            </h1>
            <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
              최대 3종목 비교 · AI 브리핑 · 뉴스
            </span>
          </div>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>

        {/* 검색 바 — z-20으로 그리드 콘텐츠 위에 배치 */}
        <div className="mb-6 relative z-20">
          <StockSearchBar
            stocks={state.stocks}
            onAdd={addStock}
            onRemove={removeStock}
          />
        </div>

        {/* 에러 */}
        {state.error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
            {state.error}
          </div>
        )}

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 왼쪽: 차트 + 카드 (col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <ComparisonChart
              stocks={state.stocks}
              chartDataMap={state.chartDataMap}
              range={state.range}
              onRangeChange={setRange}
              isLoading={state.isLoadingChart}
            />
            <ComparisonCards
              stocks={state.stocks}
              priceMap={state.priceMap}
            />
          </div>

          {/* 오른쪽: AI 브리핑 + 뉴스 (col-span-1) */}
          <div className="lg:col-span-1 space-y-4">
            <AiBriefing
              stockCount={state.stocks.length}
              briefing={state.briefing}
              briefingResult={state.briefingResult}
              isBriefingStreaming={state.isBriefingStreaming}
              onRequest={requestBriefing}
            />
            <BottomTabs
              stocks={state.stocks}
              newsMap={state.newsMap}
              investorMap={state.investorMap}
              sectorPeers={state.sectorPeers}
              sectorPriceMap={state.sectorPriceMap}
              isLoadingInvestor={state.isLoadingInvestor}
              isLoadingSector={state.isLoadingSector}
              getIndustry={getIndustry}
              signalData={state.signalData}
              isLoadingSignal={state.isLoadingSignal}
              onLoadInvestor={loadInvestorTrend}
              onLoadSector={loadSectorComparison}
              onLoadSignal={loadSignalScan}
              onSelectStock={(symbol, name) => addStock({ symbol, name })}
            />
          </div>
        </div>

        {/* 광고 */}
        <AdSlot className="mt-6" />

        <CrossNavigation currentPath="/stock-lab" />

        {/* 면책조항 */}
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 font-mono leading-relaxed max-w-xl mx-auto">
            본 서비스는 정보 제공 목적이며 투자 권유·추천이 아닙니다. AI 분석 결과는 참고용이며, 투자 판단과 그에 따른 손익의 책임은 전적으로 이용자 본인에게 있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
```

### app/quiz/page.tsx
```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  QUIZ_QUESTIONS,
  calcInvestorType,
  InvestorType,
  InvestorTypeKey,
} from "@/lib/investorQuiz";
import { generateInvestorShareImage } from "@/components/mock/InvestorShareCard";
import { ShareModal } from "@/components/ShareModal";
import { grantExp } from "@/lib/rpgExp";
import { claimQuizStone } from "@/lib/stoneReward";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { LoginButton } from "@/components/mock/LoginButton";
import { useAuth } from "@/hooks/useAuth";
import type { RecommendedStock } from "@/types";
import { fetchInvestorRecommend } from "@/lib/investorRecommendApi";

const SITE_URL = "https://bitgak.co.kr/quiz";

interface SharePreview {
  dataUrl: string;
  text: string;
  imageCopied: boolean;
}

/* ── 투자 격언 카드 ── */
const INVESTMENT_QUOTES = [
  { text: "시장은 단기적으로 투표 기계이고, 장기적으로 저울이다.", author: "벤저민 그레이엄" },
  { text: "남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워져라.", author: "워런 버핏" },
  { text: "주식 시장은 인내심 없는 사람의 돈을 인내심 있는 사람에게 옮기는 장치다.", author: "워런 버핏" },
  { text: "위험은 자신이 무엇을 하고 있는지 모르는 데서 온다.", author: "워런 버핏" },
  { text: "가장 좋은 투자는 자기 자신에게 하는 투자다.", author: "워런 버핏" },
  { text: "시장이 비이성적인 상태는 당신이 지불능력을 유지할 수 있는 기간보다 오래 지속될 수 있다.", author: "존 메이너드 케인스" },
  { text: "복리는 세계 8번째 불가사의다. 이해하는 사람은 이자를 벌고, 모르는 사람은 이자를 낸다.", author: "알버트 아인슈타인" },
  { text: "주식을 10년 보유할 생각이 없다면 10분도 갖고 있지 마라.", author: "워런 버핏" },
  { text: "돈을 잃는 것은 괜찮다. 하지만 기회를 잃는 것은 치명적이다.", author: "잭 마" },
  { text: "투자의 첫 번째 규칙은 돈을 잃지 않는 것이고, 두 번째 규칙은 첫 번째 규칙을 잊지 않는 것이다.", author: "워런 버핏" },
  { text: "10월은 주식 투자에 위험한 달 중 하나다. 나머지는 7월, 1월, 9월...", author: "마크 트웨인" },
  { text: "아는 것에 투자하라.", author: "피터 린치" },
  { text: "중요한 것은 옳고 그름이 아니라, 옳을 때 얼마나 버는가와 틀릴 때 얼마나 잃는가이다.", author: "조지 소로스" },
  { text: "좋은 기업을 적정 가격에 사는 것이, 적정 기업을 좋은 가격에 사는 것보다 훨씬 낫다.", author: "워런 버핏" },
  { text: "분산 투자는 무지에 대한 보호장치다.", author: "워런 버핏" },
];

/* ── 레이더 프리뷰 (순수 SVG) ── */
const RADAR_LABELS: { key: InvestorTypeKey; label: string }[] = [
  { key: "visionary", label: "혁신가" },
  { key: "dealmaker", label: "딜메이커" },
  { key: "sage", label: "현인" },
  { key: "strategist", label: "전략가" },
  { key: "hunter", label: "사냥꾼" },
  { key: "observer", label: "관찰자" },
  { key: "contrarian", label: "역발상가" },
  { key: "explorer", label: "탐험가" },
];

function RadarPreview({ answers }: { answers: InvestorTypeKey[] }) {
  const scores = useMemo(() => {
    const map: Record<InvestorTypeKey, number> = {
      visionary: 0, dealmaker: 0, sage: 0, strategist: 0,
      hunter: 0, observer: 0, contrarian: 0, explorer: 0,
    };
    answers.forEach((a) => map[a]++);
    return map;
  }, [answers]);

  const maxScore = Math.max(1, ...Object.values(scores));
  const cx = 120, cy = 120, r = 80;
  const n = RADAR_LABELS.length;

  function vertex(i: number, ratio: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  }

  function polygon(ratio: number) {
    return RADAR_LABELS.map((_, i) => vertex(i, ratio))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  }

  const dataPoints = RADAR_LABELS.map((item, i) => {
    const ratio = scores[item.key] / maxScore;
    return vertex(i, Math.max(ratio, 0.05));
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[220px]">
        {/* 동심 팔각형 그리드 */}
        {[0.33, 0.66, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={polygon(ratio)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}
        {/* 축 선 */}
        {RADAR_LABELS.map((_, i) => {
          const p = vertex(i, 1);
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}
        {/* 데이터 영역 */}
        <motion.polygon
          points={dataPolygon}
          fill="rgba(79,70,229,0.2)"
          stroke="#4f46e5"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {/* 꼭짓점 점 */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" />
        ))}
        {/* 라벨 */}
        {RADAR_LABELS.map((item, i) => {
          const p = vertex(i, 1.22);
          return (
            <text
              key={i}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-500 text-[10px] font-mono"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
      <p className="text-[10px] text-gray-600 font-mono mt-1">실시간 유형 분석</p>
    </div>
  );
}

export default function QuizPage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [selected, setSelected] = useState<InvestorTypeKey | null>(null);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharePreview, setSharePreview] = useState<SharePreview | null>(null);
  const [recStocks, setRecStocks] = useState<RecommendedStock[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const question = QUIZ_QUESTIONS[currentIdx];
  const total = QUIZ_QUESTIONS.length;
  const isLast = currentIdx === total - 1;

  // 격언 인덱스 (결정적)
  const quoteIdx = (currentIdx * 7 + 3) % INVESTMENT_QUOTES.length;
  const quote = INVESTMENT_QUOTES[quoteIdx];

  // AI 추천 종목 fetch
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setRecLoading(true);
    setRecError(null);
    fetchInvestorRecommend(result.key)
      .then((data) => {
        if (!cancelled) setRecStocks(data);
      })
      .catch((err) => {
        if (!cancelled) setRecError(err instanceof Error ? err.message : "추천 종목 로드 실패");
      })
      .finally(() => {
        if (!cancelled) setRecLoading(false);
      });
    return () => { cancelled = true; };
  }, [result]);

  function handleSelect(type: InvestorTypeKey) {
    if (selected) return;
    setSelected(type);
    setTimeout(() => {
      const newAnswers = [...answers, type];
      if (isLast) {
        setAnswers(newAnswers);
        setResult(calcInvestorType(newAnswers));
        grantExp("quiz_complete");
        claimQuizStone();
      } else {
        setAnswers(newAnswers);
        setCurrentIdx((i) => i + 1);
        setSelected(null);
      }
    }, 420);
  }

  function handleRetry() {
    setCurrentIdx(0);
    setAnswers([]);
    setSelected(null);
    setResult(null);
    setSharePreview(null);
    setRecStocks(null);
    setRecLoading(false);
    setRecError(null);
  }

  async function handleShare() {
    if (!result || sharingLoading) return;
    setSharingLoading(true);
    const friendlyText =
      `나 ${result.character}(${result.name})래 ㅋㅋ\n` +
      `"${result.kimComment.slice(0, 45)}..."\n\n` +
      `오비젼 투자성향 테스트 해봐`;

    try {
      const blob = await generateInvestorShareImage(result);
      if (!blob) return;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let imageCopied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        imageCopied = true;
      } catch { /* clipboard image not supported */ }

      setSharePreview({ dataUrl, text: friendlyText, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-white transition-colors font-mono"
          >
            ← 오비젼 홈
          </Link>
          <h1 className="text-sm font-black">🧠 투자성향 테스트</h1>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {!result ? (
            <>
              {/* 진행 도트 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-mono">
                    {currentIdx + 1} / {total}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {Math.round(((currentIdx + (selected ? 1 : 0)) / total) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: total }, (_, i) => {
                    const isDone = i < currentIdx || (i === currentIdx && selected);
                    const isCurrent = i === currentIdx && !selected;
                    return (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          isDone
                            ? "bg-kim-red"
                            : isCurrent
                              ? "bg-kim-red animate-pulse scale-[1.3]"
                              : "bg-white/10"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 질문 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-lg font-bold text-white leading-relaxed mb-6">
                    Q{currentIdx + 1}. {question.q}
                  </h2>

                  <div className="flex flex-col gap-3">
                    {question.options.map((opt, i) => {
                      const isChosen = selected === opt.type;
                      const isDimmed = selected !== null && selected !== opt.type;
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleSelect(opt.type)}
                          disabled={selected !== null}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: isDimmed ? 0.3 : 1, x: 0, scale: isChosen ? 1.02 : 1 }}
                          transition={{ duration: 0.15, delay: i * 0.06 }}
                          className={`w-full text-left px-5 py-4 rounded-xl border text-sm font-mono transition-colors ${
                            isChosen
                              ? "bg-kim-red border-kim-red text-white"
                              : "bg-white/5 border-white/10 text-gray-300 hover:border-kim-red/50 hover:bg-kim-red/5"
                          } disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 레이더 프리뷰 + 격언 */}
              {answers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="mt-8 flex flex-col gap-4"
                >
                  <RadarPreview answers={answers} />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center"
                    >
                      <p className="text-xs text-gray-400 font-mono leading-relaxed">
                        &ldquo;{quote.text}&rdquo;
                      </p>
                      <p className="text-[10px] text-gray-600 font-mono mt-1">— {quote.author}</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          ) : (
            /* 결과 화면 */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring" }}
              className="flex flex-col gap-5"
            >
              {/* 유형 카드 */}
              <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10">
                <div className="mx-auto mb-4 w-28 h-28 rounded-full overflow-hidden border-2 border-kim-red/40 shadow-lg shadow-kim-red/20">
                  <img
                    src={result.image}
                    alt={result.character}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-kim-red font-black tracking-wide mb-1">
                  {result.character}
                </p>
                <div className="text-2xl font-black text-white mb-1">
                  {result.name}
                </div>
                <p className="text-xs text-gray-400 font-mono mb-3">
                  {result.subtitle}
                </p>
                <p className="text-xs text-gray-400 font-mono leading-relaxed px-6 max-w-sm mx-auto">
                  {result.description}
                </p>
              </div>

              {/* 특징 */}
              <div>
                <p className="text-[10px] text-gray-500 font-mono mb-2">투자 성향</p>
                <div className="flex flex-col gap-2">
                  {result.traits.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm font-mono">
                      <span className="text-kim-red shrink-0 mt-0.5">▸</span>
                      <span className="text-gray-300">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강점 / 주의점 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-green-400 font-mono font-bold mb-2">강점</p>
                  <div className="flex flex-col gap-1.5">
                    {result.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-[10px] text-orange-400 font-mono font-bold mb-2">주의</p>
                  <div className="flex flex-col gap-1.5">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* 추천 자산 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-mono mb-2">어울리는 자산</p>
                <div className="flex flex-wrap gap-2">
                  {result.assets.map((a, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-kim-red/10 border border-kim-red/20 text-xs font-mono text-kim-red"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI 추천 종목 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-mono mb-3">AI 추천 종목</p>
                {recLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : recError ? (
                  <p className="text-xs text-gray-500 font-mono text-center py-4">{recError}</p>
                ) : recStocks && recStocks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {recStocks.map((stock, i) => (
                      <Link
                        key={stock.symbol}
                        href={`/stock-lab?symbol=${stock.symbol}`}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm font-black text-kim-red shrink-0 w-5 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{stock.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{stock.symbol}</span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono leading-relaxed mt-0.5">{stock.reason}</p>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">→</span>
                      </Link>
                    ))}
                    <p className="text-[10px] text-gray-600 font-mono text-center mt-2">
                      AI 추천은 참고용이며 투자 권유가 아닙니다
                    </p>
                  </div>
                ) : null}
              </div>

              {/* 오비젼 한마디 */}
              <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-3">
                <div className="text-[10px] text-gray-500 font-mono mb-1">오비젼의 한마디</div>
                <p className="text-sm text-gray-300 font-mono">
                  &ldquo;{result.kimComment}&rdquo;
                </p>
              </div>

              {/* 공유 버튼 */}
              <button
                onClick={handleShare}
                disabled={sharingLoading}
                className="w-full py-3 rounded-xl bg-white/10 text-gray-200 font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sharingLoading ? "이미지 생성 중..." : "결과 이미지 공유하기"}
              </button>

              {/* CTA 3개 */}
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-kim-red/15 border border-kim-red/30 text-kim-red hover:bg-kim-red/25 transition-colors"
                >
                  <span className="text-lg">🔍</span>
                  <span className="text-xs font-bold">종목 진단</span>
                </Link>
                <Link
                  href="/"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"
                >
                  <span className="text-lg">🏭</span>
                  <span className="text-xs font-bold">포트폴리오</span>
                </Link>
                <Link
                  href="/mock-investment"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                >
                  <span className="text-lg">📈</span>
                  <span className="text-xs font-bold">모의투자</span>
                </Link>
              </div>

              {/* 다시하기 */}
              <button
                onClick={handleRetry}
                className="w-full py-2 text-xs text-gray-500 font-mono hover:text-gray-300 transition-colors underline underline-offset-2"
              >
                다시 테스트하기
              </button>

              <AdSlot />

              <CrossNavigation currentPath="/quiz" />
            </motion.div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <div className="py-4 text-center text-xs text-gray-600 font-mono">
        © 2026 오비젼
      </div>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl={SITE_URL}
        imageFileName="ovision-investor-type.png"
      />
    </main>
  );
}
```

### app/privacy/page.tsx
```tsx
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kim-red/15 border border-kim-red/40 text-kim-red hover:bg-kim-red/25 transition-all font-bold text-xs mb-6"
          >
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            개인정보처리방침
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            최종 수정일: 2026년 02월 26일
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">1. 개요</h2>
            <p>
              오비젼(이하 &quot;서비스&quot;)은 사용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 정보, 사용 방법 및 보호 방법을 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">2. 수집하는 정보</h2>
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Google 로그인 정보</p>
                <p>모의투자 기능 이용 시 Google OAuth를 통해 아래 정보를 수집합니다.</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-zinc-400 space-y-0.5">
                  <li>이름 (Google 계정 표시 이름)</li>
                  <li>이메일 주소</li>
                  <li>Google 계정 고유 ID (UID)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">서비스 이용 정보</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-zinc-400 space-y-0.5">
                  <li>모의투자 포트폴리오 및 거래 내역</li>
                  <li>투자 성향 퀴즈 결과</li>
                  <li>커뮤니티 게시판 작성 내용</li>
                  <li>닉네임 및 투자 전략 (사용자 직접 입력)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">자동 수집 정보</p>
                <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-zinc-400 space-y-0.5">
                  <li>접속 기기 정보 및 브라우저 정보</li>
                  <li>쿠키 및 로컬 스토리지 데이터</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">3. 정보의 이용 목적</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>모의투자 포트폴리오 저장 및 수익률 랭킹 운영</li>
              <li>커뮤니티 게시판 서비스 제공</li>
              <li>서비스 품질 개선 및 오류 분석</li>
              <li>Google AdSense를 통한 맞춤형 광고 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">4. 제3자 서비스</h2>
            <p className="mb-3">서비스는 아래 제3자 서비스를 이용하며, 각 서비스의 개인정보처리방침이 별도로 적용됩니다.</p>
            <div className="flex flex-col gap-2">
              {[
                { name: "Google Firebase", desc: "인증, 데이터베이스, 호스팅", url: "https://firebase.google.com/support/privacy" },
                { name: "Google AdSense", desc: "광고 서비스 (맞춤형 광고 포함)", url: "https://policies.google.com/privacy" },
                { name: "Yahoo Finance API", desc: "주식 시세 데이터 제공", url: "https://legal.yahoo.com/us/en/yahoo/privacy/index.html" },
                { name: "Google Gemini API", desc: "AI 포트폴리오 분석", url: "https://ai.google.dev/gemini-api/terms" },
              ].map((s) => (
                <div key={s.name} className="flex items-start justify-between gap-4 py-2 border-b border-gray-200 dark:border-white/10">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-kim-red hover:underline shrink-0"
                  >
                    방침 보기
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">5. 쿠키 및 광고</h2>
            <p className="mb-2">
              서비스는 Google AdSense를 통해 광고를 제공합니다. Google은 쿠키를 사용하여 사용자의 이전 방문 기록을 기반으로 맞춤형 광고를 표시할 수 있습니다.
            </p>
            <p>
              맞춤형 광고를 원하지 않는 경우{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-kim-red hover:underline"
              >
                Google 광고 설정
              </a>
              에서 해제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">6. 정보 보관 및 삭제</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>로그인 정보는 브라우저 세션 종료 시 자동 로그아웃됩니다.</li>
              <li>모의투자 데이터는 Firebase Firestore에 저장되며, 계정 삭제 요청 시 삭제됩니다.</li>
              <li>데이터 삭제를 원하시면 아래 이메일로 문의해 주세요.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">7. 사용자 권리</h2>
            <p>사용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-zinc-400 space-y-1">
              <li>수집된 개인정보 열람 요청</li>
              <li>개인정보 수정 또는 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">8. 문의</h2>
            <p>개인정보 관련 문의사항은 아래로 연락 주세요.</p>
            <div className="mt-2 bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">
              서비스명: 오비젼 (Ovision)<br />
              운영자: 오비젼 팀<br />
              이메일: <span className="text-kim-red">contact@ovision.kr</span>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
```

### app/adventure/layout.tsx
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투자 모험 RPG - 오비젼",
  description: "투자 활동으로 캐릭터를 성장시키는 RPG. 클래스 선택, 장비 강화, 배틀까지!",
  openGraph: {
    title: "투자 모험 RPG - 오비젼",
    description: "투자 활동으로 캐릭터를 성장시키는 RPG. 클래스 선택, 장비 강화, 배틀까지!",
    type: "website",
  },
};

export default function AdventureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### app/adventure/page.tsx
```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRpgCharacter } from "@/hooks/useRpgCharacter";
import CharacterCreation from "@/components/adventure/CharacterCreation";
import CharacterProfile from "@/components/adventure/CharacterProfile";
import StatsPanel from "@/components/adventure/StatsPanel";
import EquipmentSlots from "@/components/adventure/EquipmentSlots";
import EnhancePanel from "@/components/adventure/EnhancePanel";
import GachaPanel from "@/components/adventure/GachaPanel";
import BattlePanel from "@/components/adventure/BattlePanel";
import { LevelUpModal } from "@/components/LevelUpModal";
import { CommunityBoard } from "@/components/mock/CommunityBoard";
import { LoginButton } from "@/components/mock/LoginButton";
import { drainExpQueue, applyExp } from "@/lib/rpgExp";
import { drainStoneQueue } from "@/lib/stoneReward";
import { InviteCodeSection } from "@/components/InviteCodeSection";
import { activateInvite, claimInviteRewards } from "@/lib/inviteApi";
import { expForLevel, RPG_CLASSES } from "@/lib/rpgConstants";
import type { InvestorTypeKey } from "@/lib/investorQuiz";
import type { CharacterSnapshot, PostCategory } from "@/types/social";
import type { EquipmentSlotKey } from "@/types";
import CrossNavigation from "@/components/CrossNavigation";

type Tab = "character" | "enhance" | "gacha" | "battle" | "community";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "character", label: "캐릭터", emoji: "👤" },
  { key: "enhance", label: "강화", emoji: "🔨" },
  { key: "gacha", label: "뽑기", emoji: "🎰" },
  { key: "battle", label: "배틀", emoji: "⚔️" },
  { key: "community", label: "게시판", emoji: "💬" },
];

const ADVENTURE_CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: "char_brag", label: "캐릭터자랑" },
  { key: "guide", label: "공략" },
  { key: "battle_review", label: "배틀후기" },
  { key: "chat", label: "잡담" },
];

const SLOT_ORDER: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

export default function AdventurePage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { character, loading, totalStats, levelTitle, expNeeded, createCharacter, setCharacter } = useRpgCharacter(user?.uid ?? null);
  const [activeTab, setActiveTab] = useState<Tab>("character");
  const [recommendedClass, setRecommendedClass] = useState<InvestorTypeKey | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const processedRef = useRef(false);

  // 캐릭터 생성 + 초대 활성화 래퍼
  const handleCreateCharacter = useCallback(async (classKey: Parameters<typeof createCharacter>[0], nickname: string) => {
    const newChar = createCharacter(classKey, nickname);
    if (user) {
      const bonusStones = await activateInvite(user.uid).catch(() => 0);
      if (bonusStones > 0 && newChar) {
        setCharacter(prev => ({ ...prev, stones: prev.stones + bonusStones }));
      }
    }
  }, [user, createCharacter, setCharacter]);

  // EXP 큐 + 투자석 큐 + 초대 보상 처리
  useEffect(() => {
    if (!character || !user || processedRef.current) return;
    processedRef.current = true;

    (async () => {
      const queue = drainExpQueue();
      const pendingStones = drainStoneQueue();
      const inviteStones = await claimInviteRewards(user.uid).catch(() => 0);
      const totalPendingStones = pendingStones + inviteStones;

      if (queue.length === 0 && totalPendingStones === 0) return;
      const totalExp = queue.reduce((sum, item) => sum + item.exp, 0);
      const result = applyExp(character.exp, character.level, totalExp, expForLevel);
      const stonesToAdd = result.levelsGained + totalPendingStones;
      setCharacter(prev => ({
        ...prev,
        exp: result.exp,
        level: result.level,
        stones: prev.stones + stonesToAdd,
      }));
      if (result.leveledUp) setLevelUpLevel(result.level);
    })();
  }, [character, user, setCharacter]);

  // 캐릭터 스냅샷 구성
  const characterSnapshot: CharacterSnapshot | null = (() => {
    if (!character || !totalStats) return null;
    const classInfo = RPG_CLASSES[character.class];
    const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
    const equipment = SLOT_ORDER
      .map((slot) => character.equipment[slot])
      .filter((eq): eq is NonNullable<typeof eq> => eq !== null)
      .map((eq) => ({
        emoji: eq.emoji,
        name: eq.name,
        grade: eq.grade,
        enhanceLevel: eq.enhanceLevel,
      }));
    return {
      type: "character",
      classEmoji: classInfo.emoji,
      className: classInfo.className,
      nickname: character.nickname,
      level: character.level,
      combatPower,
      equipment,
      battleRecord: character.battleRecord,
    };
  })();

  // 투자성향 테스트 결과에서 추천 클래스 가져오기
  useEffect(() => {
    const key = user?.uid ? `ovision_investor_type_${user.uid}` : "ovision_investor_type_guest";
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.key) setRecommendedClass(parsed.key as InvestorTypeKey);
      } catch { /* ignore */ }
    }
  }, [user]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-400 font-mono animate-pulse">로딩 중...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
        {/* 프리뷰 배경 */}
        <div aria-hidden="true" className="pointer-events-none select-none">
          <div className="max-w-lg mx-auto px-4 py-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">←</span>
                <h1 className="text-lg font-black">⚔️ 투자 모험</h1>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10" />
            </div>

            {/* 탭 바 */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
              {['캐릭터', '강화', '뽑기', '배틀', '게시판'].map((tab, i) => (
                <span key={tab} className={`flex-1 text-center px-3 py-2 rounded-lg text-xs font-bold ${i === 0 ? 'bg-kim-red/20 text-kim-red' : 'text-gray-500'}`}>{tab}</span>
              ))}
            </div>

            {/* 캐릭터 프로필 카드 */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-2xl">🧙</div>
                <div>
                  <div className="text-sm font-black">전략가</div>
                  <div className="text-xs text-kim-gold font-bold">Lv.12</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-gray-500">투자석</div>
                  <div className="text-sm font-bold text-kim-gold">💎 23개</div>
                </div>
              </div>

              {/* 스탯 바 */}
              <div className="space-y-2">
                {[
                  { label: 'HP', value: 78, color: 'bg-green-500' },
                  { label: 'ATK', value: 62, color: 'bg-red-500' },
                  { label: 'DEF', value: 55, color: 'bg-blue-500' },
                  { label: 'SPD', value: 44, color: 'bg-yellow-500' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 w-7">{stat.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${stat.value}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 w-6 text-right">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* EXP 바 */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>EXP</span>
                  <span>45%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-kim-gold" style={{ width: '45%' }} />
                </div>
              </div>
            </div>

            {/* 장비 슬롯 */}
            <div className="grid grid-cols-4 gap-2">
              {['무기', '방어구', '마법서', '악세'].map((slot) => (
                <div key={slot} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <div className="w-8 h-8 mx-auto rounded-lg bg-white/5 border border-dashed border-white/20 mb-1" />
                  <div className="text-[10px] text-gray-500">{slot}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 블러 오버레이 */}
          <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-b from-gray-950/60 via-gray-950/80 to-gray-950/95" />
        </div>

        {/* 로그인 CTA */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-4xl mb-4">⚔️</div>
            <h2 className="text-lg font-black mb-2">투자 모험</h2>
            <p className="text-sm text-gray-400 mb-6">로그인하면 캐릭터를 생성하고<br />투자 활동으로 성장시킬 수 있습니다</p>
            <LoginButton user={null} loading={false} onSignIn={signInWithGoogle} onSignOut={signOut} />
            <Link href="/" className="block mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">← 메인으로</Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-gray-400 font-mono animate-pulse">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
              ←
            </Link>
            <h1 className="text-lg font-black">⚔️ 투자 모험</h1>
          </div>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>

        {/* 캐릭터 없음 → 생성 플로우 */}
        {!character ? (
          <CharacterCreation
            onComplete={handleCreateCharacter}
            recommendedClass={recommendedClass}
            isLoggedIn={!!user}
          />
        ) : (
          <>
            {/* 탭 바 */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                    activeTab === tab.key ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{tab.emoji}</span>
                  <span className="relative">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <AnimatePresence mode="wait">
              {activeTab === "character" && (
                <motion.div
                  key="character"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4"
                >
                  <CharacterProfile
                    character={character}
                    totalStats={totalStats ?? character.stats}
                    levelTitle={levelTitle}
                    expNeeded={expNeeded}
                  />
                  <StatsPanel baseStats={character.stats} totalStats={totalStats ?? character.stats} />
                  <EquipmentSlots equipment={character.equipment} />
                </motion.div>
              )}

              {activeTab === "enhance" && (
                <motion.div
                  key="enhance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <EnhancePanel character={character} setCharacter={setCharacter} />
                </motion.div>
              )}

              {activeTab === "gacha" && (
                <motion.div
                  key="gacha"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GachaPanel character={character} setCharacter={setCharacter} />
                </motion.div>
              )}

              {activeTab === "battle" && (
                <motion.div
                  key="battle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BattlePanel
                    character={character}
                    totalStats={totalStats ?? character.stats}
                    setCharacter={setCharacter}
                    onLevelUp={(lv) => setLevelUpLevel(lv)}
                  />
                </motion.div>
              )}

              {activeTab === "community" && (
                <motion.div
                  key="community"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CommunityBoard
                    user={user}
                    nickname={character?.nickname ?? user?.displayName ?? undefined}
                    boardId="adventure"
                    boardTitle="모험 게시판"
                    boardSubtitle="캐릭터 자랑 · 공략 · 배틀후기 · 잡담"
                    categories={ADVENTURE_CATEGORIES}
                    snapshotData={characterSnapshot}
                    snapshotCategory="char_brag"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 친구 초대 — 모든 탭 하단 */}
            {user && (
              <InviteCodeSection
                user={user}
                character={character}
                totalStats={totalStats}
                sharePath="/adventure"
              />
            )}
          </>
        )}

        <CrossNavigation currentPath="/adventure" />

        {/* 푸터 */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 font-mono">
            투자 활동으로 경험치를 쌓아 캐릭터를 성장시키세요
          </p>
        </div>
      </div>

      {levelUpLevel !== null && (
        <LevelUpModal level={levelUpLevel} onClose={() => setLevelUpLevel(null)} />
      )}
    </main>
  );
}
```

### app/backtest/page.tsx
```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useBacktest, type CustomPeriod } from "@/hooks/useBacktest";
import { searchStocks, type StockSearchResult } from "@/lib/stockSearchApi";
import { AdSlot } from "@/components/AdSlot";
import CrossNavigation from "@/components/CrossNavigation";
import { ShareModal } from "@/components/ShareModal";
import { LoginButton } from "@/components/mock/LoginButton";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { StaggerContainer } from "@/components/StaggerContainer";
import { Skeleton } from "@/components/Skeleton";
import { generateBacktestShareImage, generateBacktestShareText } from "@/lib/backtestShareImage";
import type { ChartRange, BacktestResult } from "@/types";

const AMOUNT_PRESETS = [
  { label: "100만", value: 1_000_000 },
  { label: "500만", value: 5_000_000 },
  { label: "1000만", value: 10_000_000 },
  { label: "5000만", value: 50_000_000 },
  { label: "1억", value: 100_000_000 },
];

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
];

const LINE_COLORS: Record<string, string> = {};
const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

function formatKrw(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString();
}

function StatCard({
  label,
  value,
  numericValue,
  color,
  accentFrom,
  accentTo,
}: {
  label: string;
  value: string;
  numericValue?: number;
  color?: string;
  accentFrom?: string;
  accentTo?: string;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center border ${
        accentFrom
          ? `bg-gradient-to-br ${accentFrom} ${accentTo ?? "to-transparent"} border-white/[0.08]`
          : "bg-white/[0.03] border-white/[0.08]"
      }`}
    >
      <p className="text-[10px] text-gray-500 font-mono mb-1">{label}</p>
      {numericValue !== undefined ? (
        <AnimatedNumber
          value={numericValue}
          format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          className={`text-lg font-black font-mono ${color ?? "text-white"}`}
        />
      ) : (
        <p className={`text-lg font-black font-mono ${color ?? "text-white"}`}>{value}</p>
      )}
    </div>
  );
}

function BacktestChart({ result, stockNames }: { result: BacktestResult; stockNames: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || result.dailyValues.length === 0) return;

    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;

    (async () => {
      const { createChart, LineSeries } = await import("lightweight-charts");
      const container = containerRef.current;
      if (!container) return;

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chartHeight = Math.min(container.clientWidth * 0.6, 350);
      chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        layout: {
          background: { color: "transparent" },
          textColor: "#9ca3af",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
          horzLine: { color: "rgba(59,130,246,0.3)", width: 1, style: 2 },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
        timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: false },
        localization: {
          priceFormatter: (price: number) => formatKrw(price),
        },
      });
      chartRef.current = chart;

      const portfolioSeries = chart.addSeries(LineSeries, {
        color: "#ffffff",
        lineWidth: 2,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      portfolioSeries.setData(result.dailyValues.map((d) => ({ time: d.date, value: d.value })));

      const kospiSeries = chart.addSeries(LineSeries, {
        color: "#6b7280",
        lineWidth: 1,
        lineStyle: 2,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      kospiSeries.setData(result.kospiValues.map((d) => ({ time: d.date, value: d.value })));

      const symbols = Object.keys(result.stockValues);
      symbols.forEach((sym, i) => {
        const data = result.stockValues[sym];
        if (data.length === 0) return;
        const series = chart!.addSeries(LineSeries, {
          color: STOCK_COLORS[i] || "#94a3b8",
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(data.map((d) => ({ time: d.date, value: d.value })));
      });

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (chart && container) {
          const h = Math.min(container.clientWidth * 0.6, 350);
          chart.applyOptions({ width: container.clientWidth, height: h });
        }
      });
      resizeObserver.observe(container);
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [result]);

  const symbols = Object.keys(result.stockValues);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-bold text-white font-mono">
          <span className="w-2.5 h-0.5 bg-white rounded" />
          포트폴리오
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-gray-400 font-mono">
          <span className="w-2.5 h-0.5 bg-gray-500 rounded" style={{ borderTop: "1px dashed #6b7280" }} />
          KOSPI
        </span>
        {symbols.map((sym, i) => (
          <span
            key={sym}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono"
            style={{
              backgroundColor: STOCK_COLORS[i] + "15",
              color: STOCK_COLORS[i],
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STOCK_COLORS[i] }} />
            {stockNames[sym] || sym}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden"
        style={{ minHeight: 220 }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant="card" className="h-28 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
      </div>
      <Skeleton variant="card" className="h-56 w-full" />
    </div>
  );
}

export default function BacktestPage() {
  const {
    stocks, amount, range, customPeriod, result, isLoading, error,
    addStock, removeStock, setAmount, setRange, setCustomPeriod, runBacktest,
  } = useBacktest();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [customAmountInput, setCustomAmountInput] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sharePreview, setSharePreview] = useState<{ dataUrl: string; text: string; imageCopied: boolean } | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const results = await searchStocks(q);
      setSearchResults(results.slice(0, 8));
      setShowDropdown(results.length > 0);
    }, 300);
  }, []);

  const handleSelectStock = useCallback((sr: StockSearchResult) => {
    addStock({ symbol: sr.symbol, name: sr.name });
    setQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  }, [addStock]);

  const stockNameMap: Record<string, string> = {};
  stocks.forEach((s) => { stockNameMap[s.symbol] = s.name; });

  const isProfit = result ? result.totalReturnPct >= 0 : false;
  const vsKospi = result ? result.totalReturnPct - result.kospiReturnPct : 0;

  const handleShare = useCallback(async () => {
    if (!result || sharingLoading) return;
    setSharingLoading(true);
    try {
      const blob = await generateBacktestShareImage({ result, stockNames: stockNameMap, amount });
      if (!blob) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      let imageCopied = false;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        imageCopied = true;
      } catch { /* not supported */ }
      const text = generateBacktestShareText(result, stockNameMap, amount);
      setSharePreview({ dataUrl, text, imageCopied });
    } finally {
      setSharingLoading(false);
    }
  }, [result, stockNameMap, amount, sharingLoading]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-white/10 bg-gray-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-mono"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            홈
          </Link>
          <div className="text-center">
            <h1 className="text-base font-black">만약 그때 샀다면?</h1>
            <p className="text-[10px] text-gray-500 font-mono">포트폴리오 시뮬레이터</p>
          </div>
          <LoginButton user={user} loading={authLoading} onSignIn={signInWithGoogle} onSignOut={signOut} />
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {/* 종목 검색 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-xs font-bold text-gray-300">종목 선택</p>
            <span className="text-[10px] text-gray-600 font-mono ml-auto">최대 3개</span>
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  e.preventDefault();
                  handleSelectStock(searchResults[0]);
                }
              }}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="종목명 또는 코드 검색..."
              disabled={stocks.length >= 3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 transition-colors"
            />
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden z-40 max-h-64 overflow-y-auto">
                {searchResults.map((sr) => (
                  <button
                    key={sr.symbol}
                    onMouseDown={() => handleSelectStock(sr)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-sm font-bold text-white">{sr.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{sr.symbol}</span>
                    <span className="text-[10px] text-gray-600 font-mono ml-auto">{sr.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {stocks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {stocks.map((s, i) => (
                <div
                  key={s.symbol}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono"
                  style={{
                    borderColor: STOCK_COLORS[i] + "40",
                    backgroundColor: STOCK_COLORS[i] + "15",
                    color: STOCK_COLORS[i],
                  }}
                >
                  {s.name}
                  <button
                    onClick={() => removeStock(s.symbol)}
                    className="ml-1 text-gray-500 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 투자 금액 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-xs font-bold text-gray-300">종목당 투자금</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setAmount(p.value); setCustomAmountInput(""); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  amount === p.value && !customAmountInput
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              inputMode="numeric"
              value={customAmountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setCustomAmountInput(raw);
                const num = parseInt(raw, 10);
                if (num > 0) setAmount(num);
              }}
              placeholder="직접 입력 (원)"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {customAmountInput && (
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {formatKrw(parseInt(customAmountInput, 10) || 0)}원
              </span>
            )}
          </div>
        </div>

        {/* 기간 선택 */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-xs font-bold text-gray-300">투자 기간</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  range === opt.value
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setRange("custom")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                range === "custom"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              직접 설정
            </button>
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="date"
                value={customPeriod.from}
                onChange={(e) => setCustomPeriod({ ...customPeriod, from: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark] transition-colors"
              />
              <span className="text-xs text-gray-500">~</span>
              <input
                type="date"
                value={customPeriod.to}
                onChange={(e) => setCustomPeriod({ ...customPeriod, to: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-indigo-500/50 [color-scheme:dark] transition-colors"
              />
            </div>
          )}
        </div>

        {/* 실행 버튼 */}
        <button
          onClick={runBacktest}
          disabled={stocks.length === 0 || isLoading}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              시뮬레이션 중...
            </span>
          ) : "백테스트 실행"}
        </button>

        {error && (
          <p className="text-xs text-red-400 font-mono text-center">{error}</p>
        )}

        {/* 로딩 스켈레톤 */}
        {isLoading && !result && <LoadingSkeleton />}

        {/* 결과 */}
        <AnimatePresence>
          {result && result.dailyValues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <StaggerContainer className="flex flex-col gap-4" staggerDelay={0.08}>
                {/* 최종 금액 */}
                <div
                  className={`text-center py-5 px-4 rounded-2xl border ${
                    isProfit
                      ? "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
                      : "bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20"
                  }`}
                >
                  <p className="text-[10px] text-gray-500 font-mono mb-1">최종 자산</p>
                  <div className="flex items-center justify-center gap-2">
                    <AnimatedNumber
                      value={result.finalAmount}
                      format={formatKrw}
                      className="text-3xl font-black text-white font-mono"
                    />
                    <span className="text-sm text-gray-400">원</span>
                    <span
                      className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isProfit
                          ? "bg-red-500/20 text-red-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {result.totalReturnPct >= 0 ? "+" : ""}{result.totalReturnPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-2">
                    종목당 {formatKrw(amount)}원 · 총 {formatKrw(amount * stocks.length)}원 투자
                  </p>
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="총 수익률"
                    value=""
                    numericValue={result.totalReturnPct}
                    color={result.totalReturnPct >= 0 ? "text-red-400" : "text-blue-400"}
                    accentFrom={result.totalReturnPct >= 0 ? "from-red-500/5" : "from-blue-500/5"}
                  />
                  <StatCard
                    label="최대 낙폭 (MDD)"
                    value={`-${result.maxDrawdownPct.toFixed(1)}%`}
                    accentFrom="from-blue-500/5"
                  />
                  <StatCard
                    label="연환산 수익률 (CAGR)"
                    value=""
                    numericValue={result.cagrPct}
                    color={result.cagrPct >= 0 ? "text-red-400" : "text-blue-400"}
                    accentFrom={result.cagrPct >= 0 ? "from-red-500/5" : "from-blue-500/5"}
                  />
                  <StatCard
                    label="vs KOSPI"
                    value={`${vsKospi >= 0 ? "+" : ""}${vsKospi.toFixed(1)}%p`}
                    color={vsKospi >= 0 ? "text-green-400" : "text-orange-400"}
                    accentFrom={vsKospi >= 0 ? "from-green-500/5" : "from-orange-500/5"}
                  />
                </div>

                {/* 차트 */}
                <BacktestChart result={result} stockNames={stockNameMap} />

                {/* 종목별 수익률 */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                  <p className="text-[10px] text-gray-500 font-mono mb-3">종목별 수익률</p>
                  <div className="flex flex-col gap-2.5">
                    {stocks.map((s, i) => {
                      const ret = result.stockReturns[s.symbol] ?? 0;
                      const maxAbs = Math.max(
                        ...stocks.map((st) => Math.abs(result.stockReturns[st.symbol] ?? 0)),
                        Math.abs(result.kospiReturnPct),
                        1,
                      );
                      const barWidth = Math.min(Math.abs(ret) / maxAbs * 100, 100);
                      return (
                        <div key={s.symbol} className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: STOCK_COLORS[i] }}
                            />
                            <span className="text-sm font-bold text-white flex-1">{s.name}</span>
                            <span className={`text-sm font-black font-mono ${ret >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                            </span>
                          </div>
                          <div className="ml-6 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ret >= 0 ? "bg-red-500/60" : "bg-blue-500/60"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-0.5 bg-gray-500 rounded shrink-0" />
                          <span className="text-sm text-gray-400 flex-1 font-mono">KOSPI</span>
                          <span className={`text-sm font-mono ${result.kospiReturnPct >= 0 ? "text-red-400" : "text-blue-400"}`}>
                            {result.kospiReturnPct >= 0 ? "+" : ""}{result.kospiReturnPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="ml-6 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              result.kospiReturnPct >= 0 ? "bg-red-500/40" : "bg-blue-500/40"
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.abs(result.kospiReturnPct) /
                                  Math.max(
                                    ...stocks.map((st) => Math.abs(result.stockReturns[st.symbol] ?? 0)),
                                    Math.abs(result.kospiReturnPct),
                                    1,
                                  ) * 100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 공유 버튼 */}
                <button
                  onClick={handleShare}
                  disabled={sharingLoading}
                  className="w-full py-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:border-indigo-500/50 hover:text-white transition-colors disabled:opacity-50"
                >
                  {sharingLoading ? "이미지 생성 중..." : "📤 백테스트 결과 공유하기"}
                </button>

                {/* 면책 */}
                <div className="border-t border-white/[0.06] pt-3 flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                    과거 데이터 기반 시뮬레이션이며 미래 수익을 보장하지 않습니다.
                    수수료, 세금, 슬리피지 미반영.
                  </p>
                </div>

                <AdSlot />
              </StaggerContainer>
            </motion.div>
          )}
        </AnimatePresence>

        <CrossNavigation currentPath="/backtest" />
      </div>

      {/* 푸터 */}
      <div className="py-4 text-center text-xs text-gray-600 font-mono">
        © 2026 오비젼
      </div>

      <ShareModal
        open={!!sharePreview}
        onClose={() => setSharePreview(null)}
        imageDataUrl={sharePreview?.dataUrl}
        imageCopied={sharePreview?.imageCopied}
        shareText={sharePreview?.text ?? ""}
        shareUrl="https://bitgak.co.kr/backtest"
        imageFileName="ovision-backtest.png"
      />
    </main>
  );
}
```

### app/terms/page.tsx
```tsx
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kim-red/15 border border-kim-red/40 text-kim-red hover:bg-kim-red/25 transition-all font-bold text-xs mb-6"
          >
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            이용약관
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            최종 수정일: 2026년 02월 28일
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-zinc-300">

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">1. 서비스 개요</h2>
            <p>
              오비젼(이하 &quot;서비스&quot;)은 AI 기반 주식 포트폴리오 분석, 차트 분석, 모의투자, 투자성향 테스트 등
              투자 관련 정보를 제공하는 웹 서비스입니다. 본 약관은 서비스 이용에 관한 기본적인 사항을 규정합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">2. 투자 면책 고지</h2>
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
              <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-2">
                <li>본 서비스에서 제공하는 모든 정보(AI 분석, 차트 분석, 종목 브리핑 등)는 <strong className="text-gray-800 dark:text-gray-200">투자 권유 또는 추천이 아닙니다.</strong></li>
                <li>AI 분석 결과는 참고 자료일 뿐이며, 정확성이나 수익을 보장하지 않습니다.</li>
                <li>투자 판단과 그에 따른 손익의 책임은 <strong className="text-gray-800 dark:text-gray-200">전적으로 이용자 본인</strong>에게 있습니다.</li>
                <li>모의투자 기능은 가상 자금으로 운영되며, 실제 투자와는 다릅니다.</li>
                <li>서비스 운영자는 이용자의 투자 결과에 대해 어떠한 법적 책임도 지지 않습니다.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">3. 서비스 이용 조건</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스는 만 14세 이상의 이용자가 사용할 수 있습니다.</li>
              <li>일부 기능(모의투자, 랭킹 등록)은 Google 계정 로그인이 필요합니다.</li>
              <li>이용자는 타인의 권리를 침해하거나 불법적인 목적으로 서비스를 이용해서는 안 됩니다.</li>
              <li>커뮤니티 게시판에 허위 정보, 욕설, 광고를 게시하는 행위는 금지됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">4. 광고 관련 고지</h2>
            <p className="mb-2">
              본 서비스는 Google AdSense를 통해 광고를 게재합니다. 광고 수익은 서비스 운영 및 개선에 사용됩니다.
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>광고 콘텐츠는 서비스 운영자가 직접 제작한 것이 아니며, Google의 광고 정책에 따라 게재됩니다.</li>
              <li>광고 내용의 정확성이나 신뢰성에 대해 서비스 운영자는 보증하지 않습니다.</li>
              <li>맞춤형 광고 설정은{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-kim-red hover:underline"
                >
                  Google 광고 설정
                </a>
                에서 변경할 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">5. 지적재산권</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스의 디자인, 로고, 텍스트, 코드 등 콘텐츠에 대한 저작권은 오비젼에 있습니다.</li>
              <li>서비스에서 제공하는 주식 시세 데이터는 Yahoo Finance 등 외부 데이터 제공자의 자산입니다.</li>
              <li>이용자가 커뮤니티에 게시한 콘텐츠의 저작권은 해당 이용자에게 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">6. 면책조항</h2>
            <ul className="list-disc list-inside text-gray-600 dark:text-zinc-400 space-y-1">
              <li>서비스는 &quot;있는 그대로&quot; 제공되며, 특정 목적에 대한 적합성을 보증하지 않습니다.</li>
              <li>시스템 장애, 데이터 오류, 서비스 중단 등으로 인한 손해에 대해 책임을 지지 않습니다.</li>
              <li>외부 API(Yahoo Finance, Google 등) 장애로 인한 데이터 누락이나 오류에 대해 책임을 지지 않습니다.</li>
              <li>서비스는 사전 고지 없이 변경, 중단될 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">7. 약관 변경</h2>
            <p>
              본 약관은 서비스 개선 및 법률 변경에 따라 수정될 수 있습니다.
              중요한 변경 사항은 서비스 내 공지를 통해 안내합니다.
              변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">8. 문의</h2>
            <p>서비스 이용 관련 문의사항은 아래로 연락 주세요.</p>
            <div className="mt-2 bg-gray-100 dark:bg-white/5 rounded-lg px-4 py-3 font-mono text-xs text-gray-600 dark:text-zinc-400">
              서비스명: 오비젼 (Ovision)<br />
              운영자: 오비젼 팀<br />
              이메일: <span className="text-kim-red">contact@ovision.kr</span>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
```

## 6. lib/ 전체 소스

### lib/adminConfig.ts
```ts
// 관리자 Firebase UID 목록
// 로그인 후 브라우저 콘솔에서 확인: firebase.auth().currentUser.uid
export const ADMIN_UIDS: string[] = [
  "zqyi38VH6vPN6HQNiOxEVBbxCg03",
];

export function isAdmin(uid: string | undefined | null): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}
```

### lib/analysisShareImage.ts
```ts
/**
 * Canvas-based share image generator for analysis results.
 * kim mode: 400×620 with radar chart
 * makalong mode: 400×520 without radar chart
 */
import type { Grade, PortfolioScores, AnalysisMode } from "@/types";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

const GRADE_COLORS: Record<NonNullable<Grade>, string> = {
  S: "#EAB308",
  A: "#22C55E",
  B: "#3B82F6",
  C: "#F97316",
  D: "#EF4444",
  F: "#6B7280",
};

const GRADE_DESC: Record<NonNullable<Grade>, string> = {
  S: "신의 한수",
  A: "제법인데요",
  B: "평범합니다",
  C: "걱정됩니다",
  D: "심각합니다",
  F: "손절하세요",
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scores: PortfolioScores,
  accent: string
) {
  const labels = ["분산투자", "수익률", "안정성", "모멘텀", "리스크"];
  const keys: (keyof PortfolioScores)[] = [
    "diversification",
    "returns",
    "stability",
    "momentum",
    "risk_management",
  ];
  const values = keys.map((k) => Math.max(0, Math.min(100, scores[k])) / 100);
  const n = 5;
  const angleOffset = -Math.PI / 2;

  function getPoint(i: number, r: number): [number, number] {
    const angle = angleOffset + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Background pentagons (50%, 100%)
  for (const pct of [0.5, 1.0]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = getPoint(i, radius * pct);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = accent + "30";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Data points
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }

  // Labels
  ctx.font = `10px ${KO_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius + 16);
    ctx.textAlign = "center";
    ctx.fillText(labels[i], px, py);
  }
}

export async function generateAnalysisShareImage(
  grade: NonNullable<Grade>,
  roast: string,
  scores: PortfolioScores | null,
  mode: AnalysisMode
): Promise<Blob | null> {
  try {
    const DPR = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2
    );
    const W = 400;
    const hasRadar = mode === "kim" && scores;
    const H = hasRadar ? 620 : 520;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const accent = GRADE_COLORS[grade];

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Center glow
    const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 180);
    glow.addColorStop(0, accent + "33");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Top branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `11px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const brandText =
      mode === "makalong"
        ? "오비젼 빗각 분석 리포트"
        : "오비젼 AI 팩폭 진단";
    ctx.fillText(brandText, W / 2, 30);

    // ── Grade circle ──
    const gcx = W / 2;
    const gcy = 105;
    const gr = 50;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(gcx, gcy, gr * 0.5, gcx, gcy, gr * 2);
    outerGlow.addColorStop(0, accent + "40");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr * 2, 0, Math.PI * 2);
    ctx.fill();

    // Circle border
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner fill
    ctx.fillStyle = accent + "1a";
    ctx.beginPath();
    ctx.arc(gcx, gcy, gr, 0, Math.PI * 2);
    ctx.fill();

    // Grade letter
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = accent + "80";
    ctx.fillStyle = accent;
    ctx.font = `bold 42px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(grade, gcx, gcy);
    ctx.restore();

    // ── Grade description ──
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${grade}급 — ${GRADE_DESC[grade]}`, W / 2, gcy + gr + 30);

    // Divider
    const divY = gcy + gr + 46;
    const divGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
    divGrad.addColorStop(0, "transparent");
    divGrad.addColorStop(0.5, accent + "70");
    divGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, divY);
    ctx.lineTo(W - 60, divY);
    ctx.stroke();

    let nextY = divY + 16;

    // ── Radar chart (kim mode only) ──
    if (hasRadar && scores) {
      const radarCy = nextY + 75;
      drawRadarChart(ctx, W / 2, radarCy, 60, scores, accent);
      nextY = radarCy + 60 + 30;
    }

    // ── Roast excerpt box ──
    const maxLines = hasRadar ? 2 : 3;
    const boxX = 32;
    const boxW = W - 64;
    const lineHeight = 18;
    const boxPadTop = 28;
    const boxPadBottom = 14;

    // Pre-calculate lines for box height
    ctx.font = `11px ${KO_FONT}`;
    const cleanRoast = roast.replace(/\n+/g, " ").trim();
    const roastLines = wrapText(ctx, `"${cleanRoast}"`, boxW - 28).slice(
      0,
      maxLines
    );
    const boxH = boxPadTop + roastLines.length * lineHeight + boxPadBottom;
    const boxY = nextY;

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = accent + "40";
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    // Box label
    ctx.fillStyle = accent;
    ctx.font = `10px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const boxLabel =
      mode === "makalong" ? "빗각 분석 코멘트" : "팩폭 발췌";
    ctx.fillText(`💬 ${boxLabel}`, boxX + 14, boxY + 15);

    // Roast text
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `11px ${KO_FONT}`;
    roastLines.forEach((line, i) => {
      const isLast = i === roastLines.length - 1;
      const display =
        isLast && cleanRoast.length > line.length * roastLines.length
          ? line.slice(0, -1) + "..."
          : line;
      ctx.fillText(display, boxX + 14, boxY + boxPadTop + 5 + i * lineHeight);
    });

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const bottomUrl = mode === "makalong"
      ? "bitgak.co.kr?mode=makalong"
      : "bitgak.co.kr";
    ctx.fillText(bottomUrl, W / 2, H - 18);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateAnalysisShareImage]", e);
    return null;
  }
}
```

### lib/analyzeApi.ts
```ts
import type { AnalyzeRequest, AnalyzeResponse, AnalysisMode } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  `${FIREBASE_HOST}/api/analyze`;

// 부분적으로 쌓인 JSON 텍스트에서 roast 필드를 추출
function extractRoastFromPartial(text: string): string | null {
  const match = text.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)/) ;
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/** SSE 버퍼를 파싱하여 메시지를 처리하는 공용 헬퍼 */
function processSSEBuffer(
  buffer: string,
  accumulated: string,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
): { buffer: string; accumulated: string; completed: boolean } {
  const parts = buffer.split("\n\n");
  buffer = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    const jsonStr = part.slice(6).trim();
    if (!jsonStr) continue;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(jsonStr);
    } catch {
      continue;
    }

    if (msg.error) {
      throw new Error(msg.error as string);
    }

    if (msg.done && msg.r) {
      const result = sanitizeResponse(msg.r as AnalyzeResponse);
      onComplete(result);
      return { buffer, accumulated, completed: true };
    }

    if (msg.t) {
      accumulated += msg.t as string;
      const partial = extractRoastFromPartial(accumulated);
      if (partial !== null) onRoastChunk(partial);
    }
  }

  return { buffer, accumulated, completed: false };
}

/** scores 값을 안전하게 숫자로 변환 */
function sanitizeScores(
  scores: Record<string, unknown> | null | undefined,
): AnalyzeResponse["scores"] {
  if (!scores || typeof scores !== "object") return null;
  const keys = ["diversification", "returns", "stability", "momentum", "risk_management"] as const;
  const result: Record<string, number> = {};
  for (const k of keys) {
    const v = scores[k];
    result[k] = typeof v === "number" ? v : (Number(v) || 0);
  }
  return result as unknown as AnalyzeResponse["scores"];
}

/** roast에 JSON 잔해가 섞여 있으면 정제 */
function sanitizeRoast(roast: string): string {
  if (!roast) return roast;
  // roast 안에 JSON 필드명이 보이면 원본 JSON이 그대로 들어온 것
  if (roast.includes('"sector"') || roast.includes('"grade"') || roast.trimStart().startsWith("`` ` ``")) {
    const match = roast.match(/"roast"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match) {
      return match[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }
  return roast;
}

/** 응답 데이터 정제 — 타입 안전성 확보 */
function sanitizeResponse(raw: AnalyzeResponse): AnalyzeResponse {
  return {
    ...raw,
    roast: sanitizeRoast(raw.roast),
    scores: sanitizeScores(raw.scores as unknown as Record<string, unknown>),
    grade: raw.grade ?? null,
    sector: raw.sector ?? null,
  };
}

export async function analyzePortfolioStream(
  req: AnalyzeRequest,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, mode: req.mode ?? "kim" }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error || `서버 오류 (${response.status})`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();

      // done=true 이더라도 value에 남은 데이터가 있을 수 있음
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      if (buffer.includes("\n\n")) {
        const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
        buffer = result.buffer;
        accumulated = result.accumulated;
        if (result.completed) return;
      }

      if (done) break;
    }

    // 버퍼에 남은 마지막 메시지 처리 (trailing \n\n 없는 경우)
    if (!completed && buffer.trim()) {
      buffer += "\n\n";
      const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
      if (result.completed) return;
      accumulated = result.accumulated;
    }

    // 스트림이 끝났는데 done 이벤트를 못 받은 경우 → 수동 파싱 시도
    if (!completed && accumulated) {
      const tryParse = (s: string) => { try { return JSON.parse(s) as AnalyzeResponse; } catch { return null; } };
      // 1) 원본 2) 코드블록 제거 3) { } 추출
      const stripped = accumulated.trim()
        .replace(/^[\s\S]*?`` ` ``(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*`` ` ``[\s\S]*$/, "");
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      const parsed = tryParse(accumulated.trim())
        || tryParse(stripped)
        || (jsonMatch ? tryParse(jsonMatch[0]) : null);

      if (parsed) {
        onComplete(sanitizeResponse(parsed));
      } else {
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || "분석 결과를 파싱하지 못했습니다. 다시 시도해주세요.",
          analysis: "응답 파싱 실패 — 서버 응답이 불완전합니다.",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// 텍스트 기반 MC.R 빗각 분석 (이미지 없이 데이터 요약으로 분석)
export async function analyzeBitgakStream(
  textSummary: string,
  stockName: string,
  onRoastChunk: (partial: string) => void,
  onComplete: (result: AnalyzeResponse) => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "makalong" as AnalysisMode, textSummary, stockName }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error || `서버 오류 (${response.status})`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }

      if (buffer.includes("\n\n")) {
        const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
        buffer = result.buffer;
        accumulated = result.accumulated;
        if (result.completed) return;
      }

      if (done) break;
    }

    // 버퍼에 남은 마지막 메시지 처리
    if (!completed && buffer.trim()) {
      buffer += "\n\n";
      const result = processSSEBuffer(buffer, accumulated, onRoastChunk, onComplete);
      if (result.completed) return;
      accumulated = result.accumulated;
    }

    if (!completed && accumulated) {
      const tryParse = (s: string) => { try { return JSON.parse(s) as AnalyzeResponse; } catch { return null; } };
      const stripped = accumulated.trim()
        .replace(/^[\s\S]*?`` ` ``(?:json)?\s*\n?/i, "")
        .replace(/\n?\s*`` ` ``[\s\S]*$/, "");
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      const parsed = tryParse(accumulated.trim())
        || tryParse(stripped)
        || (jsonMatch ? tryParse(jsonMatch[0]) : null);

      if (parsed) {
        onComplete(sanitizeResponse(parsed));
      } else {
        const roast = extractRoastFromPartial(accumulated);
        onComplete({
          roast: roast || "분석 결과를 파싱하지 못했습니다. 다시 시도해주세요.",
          analysis: "응답 파싱 실패",
          grade: null,
          sector: null,
          scores: null,
          chartLines: null,
        });
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// 레거시 non-streaming (호환성 유지)
export async function analyzePortfolio(
  req: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, mode: req.mode ?? "kim" }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await response.json();

  if (!response.ok) {
    throw new Error(raw.error || `서버 오류 (${response.status})`);
  }

  if (raw.text && !raw.roast) {
    return { roast: raw.text, analysis: null, grade: null, sector: null, scores: null };
  }

  return raw as AnalyzeResponse;
}
```

### lib/backtestShareImage.ts
```ts
/**
 * Canvas-based share image for backtest results.
 * 400×580 — stats + mini chart + stock bars
 */
import type { BacktestResult } from "@/types";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
const STOCK_COLORS = ["#ef4444", "#3b82f6", "#10b981"];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatKrw(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString();
}

interface ShareOptions {
  result: BacktestResult;
  stockNames: Record<string, string>;
  amount: number;
}

export async function generateBacktestShareImage({
  result,
  stockNames,
  amount,
}: ShareOptions): Promise<Blob | null> {
  try {
    const DPR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const W = 400;
    const H = 580;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const isProfit = result.totalReturnPct >= 0;
    const accent = isProfit ? "#EF4444" : "#3B82F6";

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Top glow
    const glow = ctx.createRadialGradient(W / 2, 100, 0, W / 2, 100, 180);
    glow.addColorStop(0, accent + "30");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 백테스트 시뮬레이터", W / 2, 22);

    // ── Title: 종목명 ──
    let y = 48;
    const names = Object.values(stockNames);
    const titleText = names.length === 1
      ? `만약 ${names[0]}을(를) 샀다면?`
      : `만약 ${names.join(", ")}을(를) 샀다면?`;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 16px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(titleText.length > 28 ? titleText.slice(0, 27) + "..." : titleText, W / 2, y);
    y += 14;

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${KO_FONT}`;
    ctx.fillText(`투자금 ${formatKrw(amount)}원 기준`, W / 2, y);
    y += 24;

    // ── Final Amount ──
    const finalBoxH = 60;
    roundRect(ctx, 24, y, W - 48, finalBoxH, 12);
    ctx.fillStyle = accent + "12";
    ctx.fill();
    ctx.strokeStyle = accent + "30";
    ctx.lineWidth = 1;
    roundRect(ctx, 24, y, W - 48, finalBoxH, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("최종 자산", W / 2, y + 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${KO_FONT}`;
    ctx.fillText(`${formatKrw(result.finalAmount)}원`, W / 2, y + 42);

    // Return badge
    const retText = `${isProfit ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`;
    ctx.font = `bold 12px ${KO_FONT}`;
    const retW = ctx.measureText(retText).width + 14;
    const badgeX = W / 2 + ctx.measureText(`${formatKrw(result.finalAmount)}원`).width / 2 + 8;
    roundRect(ctx, badgeX - retW / 2, y + 30, retW, 18, 9);
    ctx.fillStyle = accent + "30";
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = `bold 11px ${KO_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(retText, badgeX, y + 41);
    y += finalBoxH + 12;

    // ── 4 Stat Cards (2x2) ──
    const cardW = (W - 48 - 8) / 2;
    const cardH = 48;
    const stats = [
      { label: "총 수익률", value: `${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`, color: accent },
      { label: "MDD", value: `-${result.maxDrawdownPct.toFixed(1)}%`, color: "#3B82F6" },
      { label: "CAGR", value: `${result.cagrPct >= 0 ? "+" : ""}${result.cagrPct.toFixed(1)}%`, color: result.cagrPct >= 0 ? "#EF4444" : "#3B82F6" },
      { label: "vs KOSPI", value: `${(result.totalReturnPct - result.kospiReturnPct) >= 0 ? "+" : ""}${(result.totalReturnPct - result.kospiReturnPct).toFixed(1)}%p`, color: (result.totalReturnPct - result.kospiReturnPct) >= 0 ? "#22C55E" : "#F97316" },
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 24 + col * (cardW + 8);
      const cy = y + row * (cardH + 6);
      roundRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      roundRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `9px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(stats[i].label, cx + cardW / 2, cy + 16);
      ctx.fillStyle = stats[i].color;
      ctx.font = `bold 14px ${KO_FONT}`;
      ctx.fillText(stats[i].value, cx + cardW / 2, cy + 36);
    }
    y += cardH * 2 + 6 + 14;

    // ── Mini Line Chart ──
    const chartX = 28;
    const chartY = y;
    const chartW = W - 56;
    const chartH = 120;

    roundRect(ctx, chartX - 4, chartY - 4, chartW + 8, chartH + 8, 10);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();

    const values = result.dailyValues.map(d => d.value);
    if (values.length > 1) {
      const minV = Math.min(...values) * 0.98;
      const maxV = Math.max(...values) * 1.02;
      const rangeV = maxV - minV || 1;

      // Portfolio line
      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        const px = chartX + (i / (values.length - 1)) * chartW;
        const py = chartY + chartH - ((values[i] - minV) / rangeV) * chartH;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fill under
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.lineTo(chartX, chartY + chartH);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      fill.addColorStop(0, "rgba(255,255,255,0.08)");
      fill.addColorStop(1, "transparent");
      ctx.fillStyle = fill;
      ctx.fill();

      // KOSPI line
      const kospiValues = result.kospiValues.map(d => d.value);
      if (kospiValues.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < kospiValues.length; i++) {
          const px = chartX + (i / (kospiValues.length - 1)) * chartW;
          const py = chartY + chartH - ((kospiValues[i] - minV) / rangeV) * chartH;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(107,114,128,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Chart legend
    y = chartY + chartH + 14;
    ctx.font = `9px ${KO_FONT}`;
    ctx.textAlign = "left";
    // Portfolio label
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(chartX, y, 12, 2);
    ctx.fillText("포트폴리오", chartX + 16, y + 3);
    // KOSPI label
    ctx.fillStyle = "#6b7280";
    ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(chartX + 90, y + 1); ctx.lineTo(chartX + 102, y + 1); ctx.strokeStyle = "#6b7280"; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText("KOSPI", chartX + 106, y + 3);
    y += 18;

    // ── Stock Returns ──
    const symbols = Object.keys(result.stockValues);
    const maxAbs = Math.max(...symbols.map(s => Math.abs(result.stockReturns[s] ?? 0)), 1);
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const ret = result.stockReturns[sym] ?? 0;
      const name = stockNames[sym] || sym;
      const color = STOCK_COLORS[i] || "#94a3b8";
      const barW = Math.min(Math.abs(ret) / maxAbs * (chartW - 100), chartW - 100);

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 10px ${KO_FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(name.length > 8 ? name.slice(0, 7) + ".." : name, chartX, y + 10);

      // Bar
      roundRect(ctx, chartX + 70, y + 2, barW, 12, 3);
      ctx.fillStyle = color + "40";
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = `bold 10px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`, chartX + chartW, y + 11);
      y += 20;
    }

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("bitgak.co.kr/backtest", W / 2, H - 16);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateBacktestShareImage]", e);
    return null;
  }
}

/** 공유 텍스트 생성 */
export function generateBacktestShareText(
  result: BacktestResult,
  stockNames: Record<string, string>,
  amount: number,
): string {
  const names = Object.values(stockNames);
  const nameStr = names.join(", ");
  const isProfit = result.totalReturnPct >= 0;
  const retSign = isProfit ? "+" : "";
  return `[오비젼 백테스트] ${nameStr}\n투자금 ${formatKrw(amount)}원 → 최종 ${formatKrw(result.finalAmount)}원 (${retSign}${result.totalReturnPct.toFixed(1)}%)\n만약 그때 샀다면... 당신은?\n\n오비젼에서 시뮬레이션 해보기`;
}
```

### lib/battleEngine.ts
```ts
import { RPG_CLASSES } from "@/lib/rpgConstants";
import { getKSTDateString } from "@/lib/kstDate";
import type {
  RpgClassKey,
  RpgStats,
  BattleOpponent,
  TurnType,
  TurnResult,
  BattleResult,
  BattleHistoryEntry,
} from "@/types";

// ── 유틸 ──

export function sumStats(s: RpgStats): number {
  return s.attack + s.defense + s.intelligence + s.stamina + s.luck;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── 상대 생성 ──

const OPPONENT_NAMES = [
  "워렌의 후예", "월가의 늑대", "동학개미", "차트의 마법사",
  "배당왕", "숏셀러", "퀀트봇", "다이아몬드핸드",
  "종이손", "김치프리미엄", "존버의 왕", "풀매수전사",
  "손절의 달인", "물타기장인", "셀온뉴스", "바이더딥",
];

export function generateOpponent(myLevel: number): BattleOpponent {
  const level = Math.max(1, myLevel + rand(-3, 3));
  const classKeys = Object.keys(RPG_CLASSES) as RpgClassKey[];
  const classKey = classKeys[rand(0, classKeys.length - 1)];
  const cls = RPG_CLASSES[classKey];

  const stats: RpgStats = { ...cls.baseStats };
  const statKeys: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const levelBonus = Math.floor(level * 0.5);
  for (let i = 0; i < levelBonus; i++) {
    stats[statKeys[rand(0, 4)]]++;
  }
  const equipBonus = Math.floor(level * 0.3);
  for (let i = 0; i < equipBonus; i++) {
    stats[statKeys[rand(0, 4)]]++;
  }

  return {
    class: classKey,
    className: cls.className,
    emoji: cls.emoji,
    nickname: OPPONENT_NAMES[rand(0, OPPONENT_NAMES.length - 1)],
    level,
    stats,
    combatPower: sumStats(stats),
  };
}

// ── 플레이버 텍스트 ──

const FLAVOR_TEXTS: Record<TurnType, { player: string[]; opponent: string[] }> = {
  attack: {
    player: ["날카로운 분석이 적중!", "매수 타이밍을 포착!", "공격적 포지션 진입!"],
    opponent: ["상대의 반격이 쏟아진다!", "매도 압력에 밀린다!", "숏 포지션에 당했다!"],
  },
  intelligence: {
    player: ["펀더멘털 분석 완료!", "리서치가 빛을 발한다!", "시장을 꿰뚫어 본다!"],
    opponent: ["상대의 통찰이 날카롭다!", "정보력에서 밀린다!"],
  },
  stamina: {
    player: ["끈기 있는 존버가 빛난다!", "체력으로 밀어붙인다!"],
    opponent: ["상대의 지구력이 대단하다!", "체력에서 밀리기 시작한다!"],
  },
  luck: {
    player: ["운이 따라준다!", "절묘한 타이밍!", "행운의 여신이 미소짓는다!"],
    opponent: ["상대에게 운이 따른다!", "불운한 타이밍이다!"],
  },
  final: {
    player: ["최종 결산에서 우위를 점한다!", "총합 전력으로 압도!"],
    opponent: ["상대의 종합 실력이 앞선다!", "최종 대결에서 밀린다!"],
  },
};

function pickFlavor(type: TurnType, isPlayerWinning: boolean): string {
  const pool = isPlayerWinning ? FLAVOR_TEXTS[type].player : FLAVOR_TEXTS[type].opponent;
  return pool[rand(0, pool.length - 1)];
}

// ── 배틀 시뮬레이션 ──

const TURN_CONFIG: { type: TurnType; label: string; pStat: keyof RpgStats; oStat: keyof RpgStats }[] = [
  { type: "attack", label: "공격전", pStat: "attack", oStat: "defense" },
  { type: "intelligence", label: "지능전", pStat: "intelligence", oStat: "intelligence" },
  { type: "stamina", label: "체력전", pStat: "stamina", oStat: "stamina" },
  { type: "luck", label: "운빨", pStat: "luck", oStat: "luck" },
  { type: "final", label: "최종 결산", pStat: "attack", oStat: "attack" },
];

export function simulateBattle(playerStats: RpgStats, opponent: BattleOpponent): BattleResult {
  const playerMaxHp = sumStats(playerStats) * 10;
  const opponentMaxHp = sumStats(opponent.stats) * 10;
  let playerHp = playerMaxHp;
  let opponentHp = opponentMaxHp;
  const turns: TurnResult[] = [];

  for (let i = 0; i < 5; i++) {
    const cfg = TURN_CONFIG[i];

    let pDmg = Math.max(1, playerStats[cfg.pStat] * 2 - opponent.stats[cfg.oStat] * 0.8 + rand(-2, 2));
    let pCrit = false;
    if (Math.random() * 100 < playerStats.luck * 5) {
      pDmg = Math.floor(pDmg * 1.5);
      pCrit = true;
    }
    pDmg = Math.floor(pDmg);

    let oDmg = Math.max(1, opponent.stats[cfg.pStat] * 2 - playerStats[cfg.oStat] * 0.8 + rand(-2, 2));
    let oCrit = false;
    if (Math.random() * 100 < opponent.stats.luck * 5) {
      oDmg = Math.floor(oDmg * 1.5);
      oCrit = true;
    }
    oDmg = Math.floor(oDmg);

    opponentHp = Math.max(0, opponentHp - pDmg);
    playerHp = Math.max(0, playerHp - oDmg);

    const isPlayerWinning = pDmg >= oDmg;

    turns.push({
      turn: i + 1,
      type: cfg.type,
      label: cfg.label,
      playerDmg: oDmg,
      opponentDmg: pDmg,
      playerHp,
      opponentHp,
      isCritical: pCrit || oCrit,
      flavorText: pickFlavor(cfg.type, isPlayerWinning),
    });

    if (playerHp <= 0 || opponentHp <= 0) break;
  }

  let winner: "player" | "opponent" | "draw";
  if (playerHp <= 0 && opponentHp <= 0) {
    winner = "draw";
  } else if (opponentHp <= 0) {
    winner = "player";
  } else if (playerHp <= 0) {
    winner = "opponent";
  } else {
    const pRatio = playerHp / playerMaxHp;
    const oRatio = opponentHp / opponentMaxHp;
    if (Math.abs(pRatio - oRatio) < 0.05) winner = "draw";
    else winner = pRatio > oRatio ? "player" : "opponent";
  }

  const expReward = winner === "player" ? 30 : winner === "draw" ? 20 : 10;
  const stoneReward = winner === "player" ? 2 : winner === "draw" ? 1 : 0;

  return { turns, winner, expReward, stoneReward };
}

// ── 일일 횟수 (localStorage) ──

const MAX_FREE = 3;

function getAttemptsKey(): string {
  return `ovision_battle_${getKSTDateString()}`;
}

export function getBattleAttempts(): { used: number; remaining: number } {
  if (typeof window === "undefined") return { used: 0, remaining: MAX_FREE };
  const used = parseInt(localStorage.getItem(getAttemptsKey()) || "0", 10);
  return { used, remaining: Math.max(0, MAX_FREE - used) };
}

export function consumeBattleAttempt(): boolean {
  const { remaining } = getBattleAttempts();
  if (remaining <= 0) return false;
  const key = getAttemptsKey();
  const used = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(used + 1));
  return true;
}

export function consumePaidBattleAttempt(): void {
  // 유료(투자석) 배틀은 횟수에 포함하지 않음
}

// ── 연승 관리 (localStorage) ──

const STREAK_KEY = "ovision_battle_streak";

export function getWinStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
}

export function updateWinStreak(isWin: boolean): { streak: number; bonusStones: number } {
  if (typeof window === "undefined") return { streak: 0, bonusStones: 0 };
  let streak = getWinStreak();
  if (isWin) {
    streak++;
  } else {
    streak = 0;
  }
  localStorage.setItem(STREAK_KEY, String(streak));
  const bonusStones = streak > 0 && streak % 3 === 0 ? 1 : 0;
  return { streak, bonusStones };
}

// ── 전적 히스토리 (localStorage, 최근 10개) ──

const HISTORY_KEY = "ovision_battle_history";

export function getBattleHistory(): BattleHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addBattleHistory(entry: BattleHistoryEntry): void {
  if (typeof window === "undefined") return;
  const history = getBattleHistory();
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}
```

### lib/bitgakEngine.ts
```ts
import type { Candle, BitgakPivot, BitgakLine, BitgakResult, BitgakMeta, TechIndicators, ChartInterval, BitgakViewMode } from "@/types";

// ── 고점/저점 탐지 (Zigzag 방식) ──
function findPivots(candles: Candle[], windowSize: number = 5): { highs: BitgakPivot[]; lows: BitgakPivot[] } {
  const highs: BitgakPivot[] = [];
  const lows: BitgakPivot[] = [];

  for (let i = windowSize; i < candles.length - windowSize; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) {
      highs.push({ index: i, time: candles[i].time, price: candles[i].high, type: "high" });
    }
    if (isLow) {
      lows.push({ index: i, time: candles[i].time, price: candles[i].low, type: "low" });
    }
  }

  return { highs, lows };
}

// ── 선형회귀 ──
function linearRegression(points: { x: number; y: number; weight?: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    sumW += w;
    sumWX += w * p.x;
    sumWY += w * p.y;
    sumWXY += w * p.x * p.y;
    sumWX2 += w * p.x * p.x;
  }

  const denom = sumW * sumWX2 - sumWX * sumWX;
  if (denom === 0) return { slope: 0, intercept: sumWY / sumW, r2: 0 };

  const slope = (sumW * sumWXY - sumWX * sumWY) / denom;
  const intercept = (sumWY - slope * sumWX) / sumW;

  // R² 계산 (가중)
  const yMean = sumWY / sumW;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const w = p.weight ?? 1;
    const predicted = slope * p.x + intercept;
    ssRes += w * (p.y - predicted) ** 2;
    ssTot += w * (p.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ── 회귀선에서 Q3 기반 평행 채널 구축 ──
function buildChannel(
  candles: Candle[],
  pivots: BitgakPivot[],
  oppositePivots: BitgakPivot[],
  isUpperLine: boolean,
): { slope: number; intercept: number; parallelIntercept: number } | null {
  if (pivots.length < 2) return null;

  // 최근 30% 구간 피봇에 3배 가중치 → 최근 추세 각도 반영
  const lastIdx = Math.max(1, candles.length - 1);
  const regressionPoints = pivots.map((p) => ({
    x: p.index,
    y: p.price,
    weight: p.index / lastIdx > 0.7 ? 3 : 1,
  }));
  const reg = linearRegression(regressionPoints);

  // 전체 가격 범위 계산
  const allPrices = candles.map((c) => c.high).concat(candles.map((c) => c.low));
  const priceMin = Math.min(...allPrices);
  const priceMax = Math.max(...allPrices);
  const totalRange = priceMax - priceMin;
  const maxAllowedDist = totalRange * 0.6;

  // 반대편 피벗들에서 거리 수집 → 최신 피봇 가중 + Q3(75분위) (outlier 방지)
  const dists: number[] = [];
  for (const p of oppositePivots) {
    const predicted = reg.slope * p.index + reg.intercept;
    const dist = isUpperLine ? predicted - p.price : p.price - predicted;
    if (dist > 0) {
      // 최신 피봇(index가 뒤쪽)에 가중치 부여 → 최근 추세 반영
      const weight = Math.floor(p.index / Math.max(1, candles.length / 5)) + 1;
      for (let w = 0; w < weight; w++) dists.push(dist);
    }
  }

  // 피벗 거리가 없으면 캔들 전체에서 수집
  if (dists.length === 0) {
    for (let i = 0; i < candles.length; i++) {
      const predicted = reg.slope * i + reg.intercept;
      const price = isUpperLine ? candles[i].low : candles[i].high;
      const dist = isUpperLine ? predicted - price : price - predicted;
      if (dist > 0) dists.push(dist);
    }
  }

  dists.sort((a, b) => a - b);
  let maxDist = dists.length > 0 ? dists[Math.floor(dists.length * 0.75)] : 0;

  // 채널 폭이 가격 범위의 60%를 넘지 않도록 클램핑
  if (maxDist > maxAllowedDist) maxDist = maxAllowedDist;

  let parallelIntercept = isUpperLine
    ? reg.intercept - maxDist
    : reg.intercept + maxDist;

  // parallelIntercept 안전 보장 (range 기반 — log 공간에서도 수학적으로 정확)
  const rangeMargin = Math.max(totalRange * 0.15, (priceMax + priceMin) * 0.001);
  const safeFloor = priceMin - rangeMargin;
  const safeCeiling = priceMax + rangeMargin;
  const n = candles.length - 1;
  const v0 = reg.slope * 0 + parallelIntercept;
  const vN = reg.slope * n + parallelIntercept;
  const lineMin = Math.min(v0, vN);
  const lineMax = Math.max(v0, vN);
  if (lineMin < safeFloor) parallelIntercept += (safeFloor - lineMin);
  if (lineMax > safeCeiling) parallelIntercept -= (lineMax - safeCeiling);

  return { slope: reg.slope, intercept: reg.intercept, parallelIntercept };
}

// ── 채널 라인 좌표 생성 (5포인트 + floor/ceiling 클램핑) ──
function makeLinePoints(
  candles: Candle[],
  slope: number,
  intercept: number,
  priceFloor?: number,
  priceCeiling?: number,
): { time: number; value: number }[] {
  if (candles.length === 0) return [];
  const last = candles.length - 1;
  // 5포인트: 0%, 25%, 50%, 75%, 100%
  const rawIndices = [0, Math.round(last * 0.25), Math.round(last * 0.5), Math.round(last * 0.75), last];
  // 캔들 적을 때 중복 인덱스 제거
  const indices = [...new Set(rawIndices)];
  return indices.map((i) => {
    let value = slope * i + intercept;
    if (priceFloor !== undefined) value = Math.max(priceFloor, value);
    if (priceCeiling !== undefined) value = Math.min(priceCeiling, value);
    return { time: candles[i].time, value };
  });
}

// ── S/R Flip 탐지 ──
function findSRFlips(
  candles: Candle[],
  highs: BitgakPivot[],
  lows: BitgakPivot[],
): BitgakLine[] {
  const lines: BitgakLine[] = [];
  // 직전 고점이 이후 저점의 지지가 되는 패턴 찾기
  for (let i = 0; i < highs.length - 1; i++) {
    const resistancePrice = highs[i].price;
    // 이 고점 이후의 저점 중에서 이 가격 근처(±3%)에서 지지받는 저점 찾기
    const laterLows = lows.filter(
      (l) => l.index > highs[i].index && Math.abs(l.price - resistancePrice) / resistancePrice < 0.03
    );
    if (laterLows.length > 0) {
      const startTime = candles[highs[i].index].time;
      const endTime = candles[Math.min(laterLows[laterLows.length - 1].index + 5, candles.length - 1)].time;
      lines.push({
        type: "support_resistance",
        label: `S/R Flip ${Math.round(resistancePrice).toLocaleString()}`,
        style: "dashed",
        color: "#f59e0b",
        points: [
          { time: startTime, value: Math.round(resistancePrice) },
          { time: endTime, value: Math.round(resistancePrice) },
        ],
      });
    }
  }
  return lines.slice(0, 2); // 최대 2개
}

// ── RSI 계산 ──
export function computeRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

// ── MACD 계산 ──
function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function computeMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  sig: number = 9,
): { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < slow + sig) return { macd: 0, signal: 0, histogram: 0, trend: "bearish" };
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = fastEma.map((v, i) => v - slowEma[i]);
  const signalLine = ema(macdLine.slice(slow - 1), sig);
  const macdVal = macdLine[macdLine.length - 1];
  const sigVal = signalLine[signalLine.length - 1];
  return {
    macd: Math.round(macdVal * 100) / 100,
    signal: Math.round(sigVal * 100) / 100,
    histogram: Math.round((macdVal - sigVal) * 100) / 100,
    trend: macdVal > sigVal ? "bullish" : "bearish",
  };
}

// ── 볼린저 밴드 ──
export function computeBollingerBands(
  candles: Candle[],
  period: number = 20,
  mult: number = 2,
): { upper: number; middle: number; lower: number; position: "above" | "inside" | "below" } {
  const closes = candles.map((c) => c.close);
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, position: "inside" };
  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = Math.round(middle + mult * std);
  const lower = Math.round(middle - mult * std);
  const last = closes[closes.length - 1];
  const position = last > upper ? "above" : last < lower ? "below" : "inside";
  return { upper, middle: Math.round(middle), lower, position };
}

// ── 이동평균 (단일값) ──
export function computeMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  const slice = closes.slice(-period);
  return Math.round(slice.reduce((a, b) => a + b, 0) / period);
}

// ── 이동평균 배열 (차트 그리기용) ──
export function computeMAArray(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      result.push(Math.round(slice.reduce((a, b) => a + b, 0) / period));
    }
  }
  return result;
}

// ── 기술지표 종합 계산 ──
function computeIndicators(candles: Candle[]): TechIndicators {
  const closes = candles.map((c) => c.close);
  return {
    rsi: computeRSI(candles),
    macd: computeMACD(candles),
    bb: computeBollingerBands(candles),
    ma5: computeMA(closes, 5),
    ma20: computeMA(closes, 20),
    ma60: computeMA(closes, 60),
  };
}

// ── 메인 분석 함수 ──
export function analyzeBitgak(candles: Candle[], interval?: ChartInterval, logScale?: boolean, viewMode?: BitgakViewMode): BitgakResult {
  if (candles.length < 8) {
    return {
      highs: [],
      lows: [],
      lines: [],
      summary: `데이터 부족: 현재 ${candles.length}개 캔들 (최소 8개 필요). 기간을 늘리거나 봉 단위를 줄여주세요.`,
    };
  }

  const vm = viewMode ?? "auto";

  // LOG 모드: 가격을 log10 공간으로 변환하여 분석
  const analysisCandles: Candle[] = logScale
    ? candles.map((c) => ({
        ...c,
        open: Math.log10(Math.max(c.open, 0.01)),
        high: Math.log10(Math.max(c.high, 0.01)),
        low: Math.log10(Math.max(c.low, 0.01)),
        close: Math.log10(Math.max(c.close, 0.01)),
      }))
    : candles;

  // 윈도우 사이즈: 캔들 수 비율 기반 동적 계산 (interval별 계수)
  let windowSize: number;
  if (interval === "1mo") {
    windowSize = Math.max(1, Math.min(4, Math.round(candles.length * 0.06)));
  } else if (interval === "1wk") {
    windowSize = Math.max(2, Math.min(8, Math.round(candles.length * 0.07)));
  } else {
    // 일봉 (기본)
    windowSize = Math.max(2, Math.min(15, Math.round(candles.length * 0.08)));
  }

  // 후처리: 전체 가격 범위 대비 significance 미만 피봇 제거
  const allPrices = analysisCandles.map((c) => c.high).concat(analysisCandles.map((c) => c.low));
  const priceMax = Math.max(...allPrices);
  const priceMin = Math.min(...allPrices);
  const totalRange = priceMax - priceMin;

  function filterAndMerge(rawHighs: BitgakPivot[], rawLows: BitgakPivot[], ws: number, sigRate: number) {
    const minSig = totalRange * sigRate;

    function filterInsignificant(pivots: BitgakPivot[]): BitgakPivot[] {
      if (totalRange === 0) return pivots;
      return pivots.filter((p) => {
        const neighbors = analysisCandles.slice(
          Math.max(0, p.index - ws),
          Math.min(analysisCandles.length, p.index + ws + 1),
        );
        const avgPrice = neighbors.reduce((s, c) => s + (c.high + c.low) / 2, 0) / neighbors.length;
        return Math.abs(p.price - avgPrice) >= minSig;
      });
    }

    function mergeClose(pivots: BitgakPivot[], pickMax: boolean): BitgakPivot[] {
      if (pivots.length <= 1) return pivots;
      const merged: BitgakPivot[] = [pivots[0]];
      for (let i = 1; i < pivots.length; i++) {
        const last = merged[merged.length - 1];
        if (pivots[i].index - last.index < ws) {
          if (pickMax ? pivots[i].price > last.price : pivots[i].price < last.price) {
            merged[merged.length - 1] = pivots[i];
          }
        } else {
          merged.push(pivots[i]);
        }
      }
      return merged;
    }

    return {
      highs: mergeClose(filterInsignificant(rawHighs), true),
      lows: mergeClose(filterInsignificant(rawLows), false),
    };
  }

  // 캔들 수 기반 significance 임계값
  let significanceRate = candles.length < 30 ? 0.005 : candles.length < 60 ? 0.01 : candles.length < 100 ? 0.015 : 0.02;

  let rawPivots = findPivots(analysisCandles, windowSize);
  let filtered = filterAndMerge(rawPivots.highs, rawPivots.lows, windowSize, significanceRate);

  // 피봇 부족 시 재시도 (sensitivity fallback, 1회)
  if (filtered.highs.length + filtered.lows.length < 3) {
    const retryWs = Math.max(1, windowSize - 1);
    const retrySig = significanceRate / 2;
    const retryPivots = findPivots(analysisCandles, retryWs);
    const retryFiltered = filterAndMerge(retryPivots.highs, retryPivots.lows, retryWs, retrySig);
    if (retryFiltered.highs.length + retryFiltered.lows.length > filtered.highs.length + filtered.lows.length) {
      rawPivots = retryPivots;
      filtered = retryFiltered;
      windowSize = retryWs;
      significanceRate = retrySig;
    }
  }

  const highs = filtered.highs;
  const lows = filtered.lows;

  const lines: BitgakLine[] = [];

  // ── Dual 채널 로직: 항상 양쪽 채널 모두 시도 ──
  const rangeMargin = Math.max(totalRange * 0.15, (priceMax + priceMin) * 0.001);
  const lineFloor = priceMin - rangeMargin;
  const lineCeiling = priceMax + rangeMargin;

  let highChannel: { slope: number; intercept: number; parallelIntercept: number } | null = null;
  let lowChannel: { slope: number; intercept: number; parallelIntercept: number } | null = null;

  if (highs.length >= 2 && lows.length >= 1) {
    highChannel = buildChannel(analysisCandles, highs, lows, true);
  }
  if (lows.length >= 2 && highs.length >= 1) {
    lowChannel = buildChannel(analysisCandles, lows, highs, false);
  }

  const strongSide = highs.length >= lows.length ? "high" : "low";

  // 채널 라인 push 헬퍼
  function pushChannelLines(
    ch: { slope: number; intercept: number; parallelIntercept: number },
    side: "resist" | "support",
    opacity: number,
  ) {
    const topIntercept = side === "resist" ? ch.intercept : ch.parallelIntercept;
    const bottomIntercept = side === "resist" ? ch.parallelIntercept : ch.intercept;
    const midIntercept = (topIntercept + bottomIntercept) / 2;

    const topColor = side === "resist" ? "#ef4444" : "#86efac";
    const bottomColor = side === "resist" ? "#fca5a5" : "#22c55e";
    const midColor = side === "resist" ? "#f97316" : "#facc15";

    lines.push({
      type: "channel_top",
      label: side === "resist" ? "저항 상단" : "지지 상단",
      style: "solid",
      color: topColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, topIntercept, lineFloor, lineCeiling),
    });
    lines.push({
      type: "channel_bottom",
      label: side === "resist" ? "저항 하단" : "지지 하단",
      style: "solid",
      color: bottomColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, bottomIntercept, lineFloor, lineCeiling),
    });
    lines.push({
      type: "midline",
      label: side === "resist" ? "저항 중앙" : "지지 중앙",
      style: "dashed",
      color: midColor,
      opacity,
      points: makeLinePoints(candles, ch.slope, midIntercept, lineFloor, lineCeiling),
    });
  }

  if (vm === "bullish") {
    if (lowChannel) pushChannelLines(lowChannel, "support", 1.0);
    else if (highChannel) pushChannelLines(highChannel, "resist", 0.5);
  } else if (vm === "bearish") {
    if (highChannel) pushChannelLines(highChannel, "resist", 1.0);
    else if (lowChannel) pushChannelLines(lowChannel, "support", 0.5);
  } else {
    // auto: 둘 다 표시, 강한 쪽 진하게 / 약한 쪽 연하게
    if (highChannel) pushChannelLines(highChannel, "resist", strongSide === "high" ? 1.0 : 0.35);
    if (lowChannel) pushChannelLines(lowChannel, "support", strongSide === "low" ? 1.0 : 0.35);
  }

  const hasChannel = !!(highChannel || lowChannel);

  // ── Fallback 추세선 (양쪽 채널 모두 실패 시) ──
  if (!hasChannel && candles.length >= 2) {
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < analysisCandles.length; i++) {
      if (analysisCandles[i].low < analysisCandles[minIdx].low) minIdx = i;
      if (analysisCandles[i].high > analysisCandles[maxIdx].high) maxIdx = i;
    }
    const startIdx = Math.min(minIdx, maxIdx);
    const endIdx = Math.max(minIdx, maxIdx);
    if (startIdx !== endIdx) {
      const startPrice = startIdx === minIdx ? analysisCandles[startIdx].low : analysisCandles[startIdx].high;
      const endPrice = endIdx === minIdx ? analysisCandles[endIdx].low : analysisCandles[endIdx].high;
      lines.push({
        type: "trend_line",
        label: "추세선",
        style: "dashed",
        color: "#60a5fa",
        opacity: 1.0,
        points: [
          { time: candles[startIdx].time, value: logScale ? Math.round(Math.pow(10, startPrice)) : Math.round(startPrice) },
          { time: candles[endIdx].time, value: logScale ? Math.round(Math.pow(10, endPrice)) : Math.round(endPrice) },
        ],
      });
    }
  }

  // primary 채널 (추세/위치 판정용): 강한 쪽 우선
  const primaryChannel = strongSide === "high" ? (highChannel ?? lowChannel) : (lowChannel ?? highChannel);
  let channelSlope = 0;
  let channelTopIntercept = 0;
  let channelBottomIntercept = 0;
  if (primaryChannel) {
    channelSlope = primaryChannel.slope;
    if ((strongSide === "high" && highChannel) || (!lowChannel)) {
      channelTopIntercept = primaryChannel.intercept;
      channelBottomIntercept = primaryChannel.parallelIntercept;
    } else {
      channelBottomIntercept = primaryChannel.intercept;
      channelTopIntercept = primaryChannel.parallelIntercept;
    }
  }

  // LOG 모드: log 공간 좌표 → 실제 가격으로 복원 + 이중 클램핑
  if (logScale) {
    const realMin = Math.min(...candles.map((c) => c.low));
    const realMax = Math.max(...candles.map((c) => c.high));
    const realMargin = Math.max((realMax - realMin) * 0.15, realMin * 0.001);
    const realFloor = realMin - realMargin;
    const realCeiling = realMax + realMargin;
    for (const line of lines) {
      for (const p of line.points) {
        let v = Math.pow(10, p.value);
        v = Math.max(realFloor, Math.min(realCeiling, v));
        p.value = Math.round(v);
      }
    }
    for (const p of highs) p.price = Math.round(Math.pow(10, p.price));
    for (const p of lows) p.price = Math.round(Math.pow(10, p.price));
  } else {
    for (const line of lines) {
      for (const p of line.points) {
        p.value = Math.round(p.value);
      }
    }
  }

  // S/R Flip (실제 가격 기준으로 탐색)
  const srFlips = findSRFlips(candles, highs, lows);
  lines.push(...srFlips);

  // 요약 텍스트 생성 (Gemini에 넘길 데이터) — 항상 실제 가격 사용
  const first = candles[0];
  const last = candles[candles.length - 1];
  const highPrice = Math.max(...candles.map((c) => c.high));
  const lowPrice = Math.min(...candles.map((c) => c.low));
  const changePct = ((last.close - first.open) / first.open * 100).toFixed(1);

  // 추세 판정: 실제 가격 기반 (채널 시작~끝 가격 변화율)
  let trendDir: string;
  if (hasChannel) {
    const startVal = logScale
      ? Math.pow(10, channelSlope * 0 + (channelTopIntercept + channelBottomIntercept) / 2)
      : channelSlope * 0 + (channelTopIntercept + channelBottomIntercept) / 2;
    const endVal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + (channelTopIntercept + channelBottomIntercept) / 2)
      : channelSlope * (candles.length - 1) + (channelTopIntercept + channelBottomIntercept) / 2;
    const pctChange = (endVal - startVal) / startVal;
    trendDir = pctChange > 0.02 ? "상승" : pctChange < -0.02 ? "하락" : "횡보";
  } else if (lines.some((l) => l.type === "trend_line")) {
    // fallback 추세선으로 판정
    const tl = lines.find((l) => l.type === "trend_line")!;
    trendDir = tl.points[1].value > tl.points[0].value ? "상승" : "하락";
  } else {
    trendDir = "판별불가";
  }

  const lastPrice = last.close;
  let positionInChannel = "";
  if (hasChannel) {
    // 채널 위치 판정: 실제 가격 공간에서 비교
    const lastTopReal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelTopIntercept)
      : channelSlope * (candles.length - 1) + channelTopIntercept;
    const lastBottomReal = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelBottomIntercept)
      : channelSlope * (candles.length - 1) + channelBottomIntercept;
    const lastMid = (lastTopReal + lastBottomReal) / 2;
    if (lastPrice > lastMid) {
      positionInChannel = lastPrice > lastTopReal ? "채널 상단 돌파" : "채널 상단부";
    } else {
      positionInChannel = lastPrice < lastBottomReal ? "채널 하단 이탈" : "채널 하단부";
    }
  }

  const indicators = computeIndicators(candles);

  const maAlignment = indicators.ma5 > indicators.ma20 && indicators.ma20 > indicators.ma60
    ? "정배열" : indicators.ma5 < indicators.ma20 && indicators.ma20 < indicators.ma60
    ? "역배열" : "혼합";

  const summary = [
    `기간: ${new Date(first.time * 1000).toISOString().slice(0, 10)} ~ ${new Date(last.time * 1000).toISOString().slice(0, 10)}`,
    `캔들 수: ${candles.length}개`,
    `고가: ${highPrice.toLocaleString()} / 저가: ${lowPrice.toLocaleString()}`,
    `현재가: ${lastPrice.toLocaleString()} (변동률: ${changePct}%)`,
    `고점 피벗: ${highs.length}개 / 저점 피벗: ${lows.length}개`,
    `채널 방향: ${trendDir}`,
    positionInChannel ? `현재 위치: ${positionInChannel}` : "",
    `3-3 원칙: 고점 ${highs.length >= 3 ? "충족" : "미충족"}(${highs.length}개), 저점 ${lows.length >= 3 ? "충족" : "미충족"}(${lows.length}개)`,
    srFlips.length > 0 ? `S/R Flip: ${srFlips.map((l) => l.label).join(", ")}` : "",
    `RSI(14): ${indicators.rsi}`,
    `MACD: ${indicators.macd.macd} / Signal: ${indicators.macd.signal} (${indicators.macd.trend === "bullish" ? "강세" : "약세"})`,
    `볼린저밴드: 상단 ${indicators.bb.upper.toLocaleString()} / 중간 ${indicators.bb.middle.toLocaleString()} / 하단 ${indicators.bb.lower.toLocaleString()} (현재 ${indicators.bb.position === "above" ? "상단 이탈" : indicators.bb.position === "below" ? "하단 이탈" : "밴드 내"})`,
    `이동평균: MA5=${indicators.ma5.toLocaleString()} MA20=${indicators.ma20.toLocaleString()} MA60=${indicators.ma60.toLocaleString()} (${maAlignment})`,
  ].filter(Boolean).join("\n");

  // BitgakMeta 구성
  let positionPercent: number | null = null;
  if (hasChannel) {
    const lastTopMeta = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelTopIntercept)
      : channelSlope * (candles.length - 1) + channelTopIntercept;
    const lastBottomMeta = logScale
      ? Math.pow(10, channelSlope * (candles.length - 1) + channelBottomIntercept)
      : channelSlope * (candles.length - 1) + channelBottomIntercept;
    const metaRange = lastTopMeta - lastBottomMeta;
    if (metaRange > 0) {
      positionPercent = Math.round(((lastPrice - lastBottomMeta) / metaRange) * 100);
      positionPercent = Math.max(-10, Math.min(110, positionPercent));
    }
  }

  const meta: BitgakMeta = {
    channelDirection: trendDir as BitgakMeta["channelDirection"],
    channelPosition: positionInChannel || null,
    positionPercent,
    threeThree: {
      highsMet: highs.length >= 3,
      highsCount: highs.length,
      lowsMet: lows.length >= 3,
      lowsCount: lows.length,
    },
    srFlips: srFlips.map((l) => l.label),
    priceRange: {
      high: highPrice,
      low: lowPrice,
      current: lastPrice,
      changePct: parseFloat(changePct),
    },
    period: {
      start: new Date(first.time * 1000).toISOString().slice(0, 10),
      end: new Date(last.time * 1000).toISOString().slice(0, 10),
      candleCount: candles.length,
    },
  };

  return { highs, lows, lines, summary, indicators, meta };
}
```

### lib/characterShareImage.ts
```ts
/**
 * Canvas-based share image generator for RPG character card.
 * 400×560 — character info + stats radar + equipment slots
 */
import type { RpgCharacter, RpgStats, EquipmentSlotKey } from "@/types";
import { RPG_CLASSES, GRADE_LABELS, SLOT_LABELS, getLevelTitle, expForLevel } from "@/lib/rpgConstants";

const KO_FONT = `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

const STAT_COLORS: Record<keyof RpgStats, string> = {
  attack: "#EF4444",
  defense: "#3B82F6",
  intelligence: "#A855F7",
  stamina: "#22C55E",
  luck: "#F59E0B",
};

const STAT_LABELS: Record<keyof RpgStats, string> = {
  attack: "공격",
  defense: "방어",
  intelligence: "지능",
  stamina: "체력",
  luck: "행운",
};

const EQUIP_GRADE_HEX: Record<string, string> = {
  common: "#9CA3AF",
  uncommon: "#4ADE80",
  rare: "#60A5FA",
  epic: "#C084FC",
  legendary: "#FBBF24",
};

const SLOTS: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawStatsRadar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  stats: RpgStats, accent: string
) {
  const keys: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const labels = keys.map(k => STAT_LABELS[k]);
  const maxStat = Math.max(...Object.values(stats), 30);
  const values = keys.map(k => Math.min(stats[k] / maxStat, 1));
  const n = 5;
  const angleOffset = -Math.PI / 2;

  function getPoint(i: number, r: number): [number, number] {
    const angle = angleOffset + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Background pentagons
  for (const pct of [0.33, 0.66, 1.0]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [px, py] = getPoint(i, radius * pct);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = accent + "30";
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Data points + values
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius * values[i]);
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = STAT_COLORS[keys[i]];
    ctx.fill();
  }

  // Labels + values
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    const [px, py] = getPoint(i, radius + 18);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `10px ${KO_FONT}`;
    ctx.fillText(labels[i], px, py);
    const [vx, vy] = getPoint(i, radius + 30);
    ctx.fillStyle = STAT_COLORS[keys[i]];
    ctx.font = `bold 10px ${KO_FONT}`;
    ctx.fillText(String(stats[keys[i]]), vx, vy);
  }
}

export async function generateCharacterShareImage(
  character: RpgCharacter,
  totalStats: RpgStats,
): Promise<Blob | null> {
  try {
    const DPR = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2
    );
    const W = 400;
    const H = 560;
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(DPR, DPR);

    const classInfo = RPG_CLASSES[character.class] ?? RPG_CLASSES.visionary;
    const levelTitle = getLevelTitle(character.level);
    const expNeeded = expForLevel(character.level);
    const combatPower = Object.values(totalStats).reduce((a, b) => a + b, 0);
    const accent = "#6366F1"; // indigo

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a12");
    bg.addColorStop(1, "#0f0f1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Top glow
    const glow = ctx.createRadialGradient(W / 2, 80, 0, W / 2, 80, 160);
    glow.addColorStop(0, accent + "33");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // ── Header branding ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("오비젼 투자 모험 캐릭터", W / 2, 22);

    // ── Character image ──
    const imgSize = 72;
    const imgX = W / 2 - imgSize / 2;
    const imgY = 40;
    try {
      const img = await loadImage(`/investors/${character.class}.png`);
      // Circle clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
      ctx.restore();
      // Circle border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      // Fallback: emoji
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `36px ${KO_FONT}`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(classInfo.emoji, W / 2, imgY + imgSize / 2);
    }

    // ── Name + Class ──
    let y = imgY + imgSize + 16;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Level badge
    ctx.fillStyle = accent + "40";
    const badgeText = `${levelTitle} · Lv.${character.level}`;
    ctx.font = `10px ${KO_FONT}`;
    const badgeW = ctx.measureText(badgeText).width + 16;
    roundRect(ctx, W / 2 - badgeW / 2, y - 10, badgeW, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#C7D2FE";
    ctx.fillText(badgeText, W / 2, y);
    y += 20;

    // Nickname
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 18px ${KO_FONT}`;
    ctx.fillText(character.nickname, W / 2, y);
    y += 16;

    // Class subtitle
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${KO_FONT}`;
    ctx.fillText(`${classInfo.className} · ${classInfo.subtitle}`, W / 2, y);
    y += 20;

    // ── Combat Power + Stones ──
    const boxY = y;
    const boxW = 140;
    const boxH = 44;
    const gap = 12;
    // Combat power
    roundRect(ctx, W / 2 - boxW - gap / 2, boxY, boxW, boxH, 8);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.fillText("전투력", W / 2 - boxW / 2 - gap / 2, boxY + 16);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 14px ${KO_FONT}`;
    ctx.fillText(String(combatPower), W / 2 - boxW / 2 - gap / 2, boxY + 34);
    // Stones
    roundRect(ctx, W / 2 + gap / 2, boxY, boxW, boxH, 8);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `10px monospace`;
    ctx.fillText("투자석", W / 2 + boxW / 2 + gap / 2, boxY + 16);
    ctx.fillStyle = "#FBBF24";
    ctx.font = `bold 14px ${KO_FONT}`;
    ctx.fillText(String(character.stones), W / 2 + boxW / 2 + gap / 2, boxY + 34);
    y = boxY + boxH + 16;

    // ── Divider ──
    const divGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
    divGrad.addColorStop(0, "transparent");
    divGrad.addColorStop(0.5, accent + "60");
    divGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();
    y += 8;

    // ── Stats Radar ──
    const radarCy = y + 64;
    drawStatsRadar(ctx, W / 2, radarCy, 52, totalStats, accent);
    y = radarCy + 52 + 40;

    // ── Equipment Slots (2x2) ──
    const eqStartX = 28;
    const eqW = (W - 56 - 8) / 2;
    const eqH = 40;
    const eqGap = 8;
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ex = eqStartX + col * (eqW + eqGap);
      const ey = y + row * (eqH + eqGap);
      const slot = SLOTS[i];
      const item = character.equipment?.[slot];

      if (item) {
        const gradeColor = EQUIP_GRADE_HEX[item.grade] || "#9CA3AF";
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.fillStyle = gradeColor + "15";
        ctx.fill();
        ctx.strokeStyle = gradeColor + "50";
        ctx.lineWidth = 1;
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `14px ${KO_FONT}`;
        ctx.fillStyle = "#fff";
        ctx.fillText(item.emoji, ex + 8, ey + eqH / 2);
        ctx.font = `bold 10px ${KO_FONT}`;
        ctx.fillStyle = "#fff";
        const enhLabel = item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : "";
        ctx.fillText(item.name + enhLabel, ex + 28, ey + 14);
        ctx.font = `9px ${KO_FONT}`;
        ctx.fillStyle = gradeColor;
        ctx.fillText(GRADE_LABELS[item.grade], ex + 28, ey + 28);
        // Bonus stats
        const bonusStr = Object.entries(item.bonus)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k === "attack" ? "공" : k === "defense" ? "방" : k === "intelligence" ? "지" : k === "stamina" ? "체" : "운"}+${v}`)
          .join(" ");
        if (bonusStr) {
          ctx.textAlign = "right";
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = `9px monospace`;
          ctx.fillText(bonusStr, ex + eqW - 8, ey + eqH / 2);
          ctx.textAlign = "left";
        }
      } else {
        const slotInfo = SLOT_LABELS[slot];
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, ex, ey, eqW, eqH, 6);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = `10px ${KO_FONT}`;
        ctx.fillText(`${slotInfo.emoji} ${slotInfo.label} · 비어있음`, ex + eqW / 2, ey + eqH / 2);
      }
    }

    // ── Bottom URL ──
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("bitgak.co.kr/adventure", W / 2, H - 16);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (e) {
    console.error("[generateCharacterShareImage]", e);
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
```

### lib/chartGameApi.ts
```ts
import type { GameRound } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_CHART_GAME_API_URL ||
  `${FIREBASE_HOST}/api/chart-game`;

export async function fetchGameRound(exclude: string[] = []): Promise<GameRound> {
  const params = new URLSearchParams();
  if (exclude.length > 0) params.set("exclude", exclude.join(","));

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `게임 데이터 로드 실패 (${res.status})`);
  }

  return res.json();
}
```

### lib/chartGameRankingApi.ts
```ts
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import type { ChartGameRankingEntry } from "@/types";

const COLLECTION = "chart_game_rankings";

export async function upsertChartGameRanking(entry: ChartGameRankingEntry): Promise<void> {
  await setDoc(doc(db, COLLECTION, entry.userId), entry);
}

export async function fetchMyChartGameRank(
  userId: string
): Promise<{ rank: number; entry: ChartGameRankingEntry } | null> {
  const userSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const entry = userSnap.data() as ChartGameRankingEntry;
  const aboveSnap = await getCountFromServer(
    query(collection(db, COLLECTION), where("bestStreak", ">", entry.bestStreak))
  );
  return { rank: aboveSnap.data().count + 1, entry };
}

export async function fetchChartGameRankings(n = 20): Promise<ChartGameRankingEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("bestStreak", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChartGameRankingEntry);
}
```

### lib/communityApi.ts
```ts
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { PostCategory, BoardId, PostSnapshot } from "@/types/social";
import { BOARD_COLLECTIONS } from "@/types/social";

export interface CommunityPost {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
  category: PostCategory;
  likes: number;
  likedBy: string[];
  replyCount: number;
  snapshot?: PostSnapshot;
}

export async function addCommunityPost(
  userId: string,
  nickname: string,
  content: string,
  category: PostCategory = "insight",
  boardId: BoardId = "community",
  snapshot?: PostSnapshot
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const data: Record<string, unknown> = {
    userId,
    nickname,
    content: content.slice(0, 200),
    category,
    likes: 0,
    likedBy: [],
    replyCount: 0,
    createdAt: serverTimestamp(),
  };
  if (snapshot) data.snapshot = snapshot;
  await addDoc(collection(db, col), data);
}

export async function deleteCommunityPost(
  postId: string,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  await deleteDoc(doc(db, col, postId));
}

export async function fetchCommunityPosts(
  count = 30,
  boardId: BoardId = "community"
): Promise<CommunityPost[]> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const q = query(
    collection(db, col),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt;
    const createdAt =
      ts instanceof Timestamp ? ts.toDate().toISOString() : "";
    return {
      id: d.id,
      userId: data.userId as string,
      nickname: data.nickname as string,
      content: data.content as string,
      createdAt,
      category: (data.category as PostCategory) ?? "insight",
      likes: (data.likes as number) ?? 0,
      likedBy: (data.likedBy as string[]) ?? [],
      replyCount: (data.replyCount as number) ?? 0,
      ...(data.snapshot ? { snapshot: data.snapshot as PostSnapshot } : {}),
    };
  });
}
```

### lib/communityReplyApi.ts
```ts
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { CommunityReply, BoardId } from "@/types/social";
import { BOARD_COLLECTIONS } from "@/types/social";

export async function toggleLike(
  postId: string,
  userId: string,
  currentlyLiked: boolean,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].posts;
  const ref = doc(db, col, postId);
  if (currentlyLiked) {
    await updateDoc(ref, {
      likes: increment(-1),
      likedBy: arrayRemove(userId),
    });
  } else {
    await updateDoc(ref, {
      likes: increment(1),
      likedBy: arrayUnion(userId),
    });
  }
}

export async function addReply(
  postId: string,
  userId: string,
  nickname: string,
  content: string,
  boardId: BoardId = "community"
): Promise<void> {
  const col = BOARD_COLLECTIONS[boardId].replies;
  const postCol = BOARD_COLLECTIONS[boardId].posts;
  await addDoc(collection(db, col), {
    postId,
    userId,
    nickname,
    content: content.slice(0, 200),
    createdAt: serverTimestamp(),
  });

  // replyCount 증가
  const postRef = doc(db, postCol, postId);
  await updateDoc(postRef, {
    replyCount: increment(1),
  });
}

export async function fetchReplies(
  postId: string,
  count = 20,
  boardId: BoardId = "community"
): Promise<CommunityReply[]> {
  const col = BOARD_COLLECTIONS[boardId].replies;
  const q = query(
    collection(db, col),
    where("postId", "==", postId),
    orderBy("createdAt", "asc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt;
    const createdAt =
      ts instanceof Timestamp ? ts.toDate().toISOString() : "";
    return {
      id: d.id,
      postId: data.postId as string,
      userId: data.userId as string,
      nickname: data.nickname as string,
      content: data.content as string,
      createdAt,
    };
  });
}
```

### lib/dailyBriefingApi.ts
```ts
const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_DAILY_BRIEFING_API_URL ||
  `${FIREBASE_HOST}/api/daily-briefing`;

export interface DailyBriefingData {
  briefing: string;
  sentiment: "positive" | "neutral" | "negative";
  highlights: string[];
  cachedAt: string;
}

export async function fetchDailyBriefing(): Promise<DailyBriefingData | null> {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

### lib/dailyDiscoveryApi.ts
```ts
const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_DAILY_DISCOVERY_API_URL ||
  `${FIREBASE_HOST}/api/daily-discovery`;

export interface DailyDiscoveryData {
  fact: string;
  category: string;
  source: string;
  cachedAt: string;
}

export async function fetchDailyDiscovery(): Promise<DailyDiscoveryData | null> {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

### lib/enhanceEngine.ts
```ts
import type { EquipmentItem, EquipmentGrade, RpgStats } from "@/types";

export const MAX_ENHANCE_LEVEL = 10;

// ── 비용 (투자석) ──
const COST_TABLE: number[] = [1, 1, 1, 2, 2, 3, 3, 4, 5, 6];

export function getEnhanceCost(level: number): number {
  if (level < 0 || level >= MAX_ENHANCE_LEVEL) return 0;
  return COST_TABLE[level];
}

// ── 성공 확률 (%) ──
const RATE_TABLE: number[] = [100, 95, 90, 80, 70, 55, 40, 30, 20, 10];

export function getSuccessRate(level: number): number {
  if (level < 0 || level >= MAX_ENHANCE_LEVEL) return 0;
  return RATE_TABLE[level];
}

// ── 최대 레벨 체크 ──
export function canEnhance(item: EquipmentItem): boolean {
  return item.enhanceLevel < MAX_ENHANCE_LEVEL;
}

// ── 등급 배수 ──
const GRADE_MULT: Record<EquipmentGrade, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 2.5,
  legendary: 3,
};

// ── 보너스 계산 ──
export function computeEnhancedBonus(
  baseBonus: Partial<RpgStats>,
  level: number,
  grade: EquipmentGrade
): Partial<RpgStats> {
  const mult = GRADE_MULT[grade];
  const result: Partial<RpgStats> = {};
  for (const [key, val] of Object.entries(baseBonus)) {
    if (val != null) {
      result[key as keyof RpgStats] = val + Math.round(level * mult);
    }
  }
  return result;
}

// ── 실패 페널티 계산 ──
function applyFailurePenalty(level: number): number {
  if (level <= 3) return level; // 유지
  if (level <= 6) return Math.random() < 0.5 ? level - 1 : level; // 50% 하락
  return level - 1; // 확정 하락
}

// ── 강화 결과 ──
export interface EnhanceResult {
  success: boolean;
  newLevel: number;
  newBonus: Partial<RpgStats>;
  message: string;
}

// ── 강화 실행 ──
export function executeEnhance(item: EquipmentItem): EnhanceResult {
  const rate = getSuccessRate(item.enhanceLevel);
  const roll = Math.random() * 100;
  const success = roll < rate;

  if (success) {
    const newLevel = item.enhanceLevel + 1;
    const newBonus = computeEnhancedBonus(item.baseBonus, newLevel, item.grade);
    return {
      success: true,
      newLevel,
      newBonus,
      message: `+${newLevel} 강화 성공!`,
    };
  }

  const newLevel = applyFailurePenalty(item.enhanceLevel);
  const newBonus = computeEnhancedBonus(item.baseBonus, newLevel, item.grade);
  const dropped = newLevel < item.enhanceLevel;

  return {
    success: false,
    newLevel,
    newBonus,
    message: dropped
      ? `강화 실패... +${newLevel}로 하락`
      : "강화 실패... 레벨 유지",
  };
}
```

### lib/firebase.ts
```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9nYHNJVHcHczXfGOqX1JUYxUVXmyEr7E",
  authDomain: "mylen-24263782-5d205.firebaseapp.com",
  projectId: "mylen-24263782-5d205",
  storageBucket: "mylen-24263782-5d205.firebasestorage.app",
  messagingSenderId: "811979249105",
  appId: "1:811979249105:web:6b7f47325840de7850fcf0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### lib/gachaEngine.ts
```ts
import type { EquipmentItem, EquipmentGrade, RpgStats } from "@/types";
import { GACHA_POOL, type GachaItem } from "./gachaPool";

// ── 등급 확률 (%) ──
export const GRADE_RATES: Record<EquipmentGrade, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

// ── 비용 ──
export const SINGLE_COST = 3;
export const MULTI_COST = 13;
export const MULTI_COUNT = 5;

// ── 등급 결정 (가중 랜덤) ──
const GRADE_ORDER: EquipmentGrade[] = ["legendary", "epic", "rare", "uncommon", "common"];

function rollGrade(): EquipmentGrade {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const grade of GRADE_ORDER) {
    cumulative += GRADE_RATES[grade];
    if (roll < cumulative) return grade;
  }
  return "common";
}

// ── 해당 등급 풀에서 랜덤 아이템 선택 ──
function rollItem(): GachaItem {
  const grade = rollGrade();
  const pool = GACHA_POOL.filter((item) => item.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 뽑기 실행 ──
export function pullGacha(count: 1 | 5): GachaItem[] {
  const results: GachaItem[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rollItem());
  }

  // 5연뽑: uncommon 이상 1개 보장
  if (count === 5) {
    const hasUncommonOrAbove = results.some(
      (item) => item.grade !== "common"
    );
    if (!hasUncommonOrAbove) {
      const uncommonPool = GACHA_POOL.filter((item) => item.grade === "uncommon");
      results[count - 1] = uncommonPool[Math.floor(Math.random() * uncommonPool.length)];
    }
  }

  return results;
}

// ── GachaItem → EquipmentItem 변환 ──
export function gachaItemToEquipment(item: GachaItem): EquipmentItem {
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    grade: item.grade,
    baseBonus: { ...item.baseBonus },
    bonus: { ...item.baseBonus },
    enhanceLevel: 0,
  };
}

// ── 현재 vs 새 장비 스탯 차이 계산 ──
export interface StatDiff {
  stat: keyof RpgStats;
  current: number;
  incoming: number;
  diff: number;
}

export function compareWithCurrent(
  current: EquipmentItem | null,
  incoming: EquipmentItem
): StatDiff[] {
  const allStats: (keyof RpgStats)[] = ["attack", "defense", "intelligence", "stamina", "luck"];
  const diffs: StatDiff[] = [];

  for (const stat of allStats) {
    const cur = current?.bonus[stat] ?? 0;
    const inc = incoming.bonus[stat] ?? 0;
    if (cur !== 0 || inc !== 0) {
      diffs.push({ stat, current: cur, incoming: inc, diff: inc - cur });
    }
  }

  return diffs;
}
```

### lib/gachaPool.ts
```ts
import type { EquipmentSlotKey, EquipmentGrade, RpgStats } from "@/types";

export interface GachaItem {
  id: string;
  slot: EquipmentSlotKey;
  name: string;
  emoji: string;
  grade: EquipmentGrade;
  baseBonus: Partial<RpgStats>;
}

export const GACHA_POOL: GachaItem[] = [
  // common (baseBonus 합계 1~2)
  { id: "c_weapon_01", slot: "weapon", name: "수련생의 볼펜", emoji: "🖊️", grade: "common", baseBonus: { attack: 1 } },
  { id: "c_armor_01", slot: "armor", name: "구겨진 와이셔츠", emoji: "👕", grade: "common", baseBonus: { defense: 1 } },
  { id: "c_spell_01", slot: "spellbook", name: "찢어진 경제신문", emoji: "📰", grade: "common", baseBonus: { intelligence: 1 } },
  { id: "c_acc_01", slot: "accessory", name: "녹슨 동전", emoji: "🪙", grade: "common", baseBonus: { luck: 1 } },

  // uncommon (합계 2~3)
  { id: "u_weapon_01", slot: "weapon", name: "애널리스트의 레이저포인터", emoji: "🔦", grade: "uncommon", baseBonus: { attack: 2, intelligence: 1 } },
  { id: "u_armor_01", slot: "armor", name: "브랜드 정장", emoji: "🧥", grade: "uncommon", baseBonus: { defense: 2, stamina: 1 } },
  { id: "u_spell_01", slot: "spellbook", name: "기술적 분석 입문서", emoji: "📊", grade: "uncommon", baseBonus: { intelligence: 2, attack: 1 } },
  { id: "u_acc_01", slot: "accessory", name: "가죽 시계", emoji: "⌚", grade: "uncommon", baseBonus: { luck: 1, stamina: 1 } },

  // rare (합계 3~5)
  { id: "r_weapon_01", slot: "weapon", name: "헤지펀드의 칼날", emoji: "🗡️", grade: "rare", baseBonus: { attack: 3, intelligence: 2 } },
  { id: "r_armor_01", slot: "armor", name: "월가의 방탄조끼", emoji: "🦺", grade: "rare", baseBonus: { defense: 3, stamina: 2 } },
  { id: "r_spell_01", slot: "spellbook", name: "퀀트 알고리즘 노트", emoji: "🧮", grade: "rare", baseBonus: { intelligence: 3, attack: 1 } },
  { id: "r_acc_01", slot: "accessory", name: "황소상 미니어처", emoji: "🐂", grade: "rare", baseBonus: { luck: 2, attack: 2 } },

  // epic (합계 5~7)
  { id: "e_weapon_01", slot: "weapon", name: "공매도의 대낫", emoji: "⚔️", grade: "epic", baseBonus: { attack: 5, intelligence: 2 } },
  { id: "e_armor_01", slot: "armor", name: "리스크관리의 갑옷", emoji: "🛡️", grade: "epic", baseBonus: { defense: 4, stamina: 3 } },
  { id: "e_spell_01", slot: "spellbook", name: "가치투자 바이블", emoji: "📕", grade: "epic", baseBonus: { intelligence: 5, defense: 2 } },
  { id: "e_acc_01", slot: "accessory", name: "내부자의 귓속말", emoji: "👂", grade: "epic", baseBonus: { luck: 3, intelligence: 3 } },

  // legendary (합계 7~10)
  { id: "l_weapon_01", slot: "weapon", name: "버핏의 연례서한", emoji: "📜", grade: "legendary", baseBonus: { attack: 6, intelligence: 4 } },
  { id: "l_armor_01", slot: "armor", name: "불패의 포트폴리오", emoji: "💼", grade: "legendary", baseBonus: { defense: 5, stamina: 3, intelligence: 2 } },
  { id: "l_spell_01", slot: "spellbook", name: "시장의 예언서", emoji: "🔮", grade: "legendary", baseBonus: { intelligence: 6, luck: 4 } },
  { id: "l_acc_01", slot: "accessory", name: "미다스의 손", emoji: "✋", grade: "legendary", baseBonus: { luck: 5, attack: 3, intelligence: 2 } },
];
```

### lib/investorQuiz.ts
```ts
export type InvestorTypeKey =
  | "visionary"
  | "dealmaker"
  | "sage"
  | "strategist"
  | "hunter"
  | "observer"
  | "contrarian"
  | "explorer";

export interface InvestorType {
  key: InvestorTypeKey;
  emoji: string;
  image: string;
  character: string;
  name: string;
  subtitle: string;
  description: string;
  traits: string[];
  strengths: string[];
  warnings: string[];
  assets: string[];
  kimComment: string;
}

export const INVESTOR_TYPES: Record<InvestorTypeKey, InvestorType> = {
  visionary: {
    key: "visionary",
    emoji: "🚀",
    image: "/investors/visionary.png",
    character: "일론머스터드",
    name: "화성행 티켓을 쥔 혁신가",
    subtitle: "미래에 투자하는 대담한 선구자",
    description:
      "10년 후를 보고 오늘 베팅하는 파괴적 혁신의 신봉자. 남들이 '미쳤다'고 할 때 확신을 갖고 올인하며, 기존 산업을 뒤집을 기술과 비전에 투자한다. 단기 변동성 따위는 화성 가는 길의 작은 흔들림일 뿐.",
    traits: [
      "파괴적 혁신 기업에 장기 올인",
      "남들이 이해 못하는 미래 기술에 베팅",
      "단기 손실에도 흔들리지 않는 확신",
      "전기차·우주·AI 등 미래 산업 집중",
      "실패해도 비전이 맞으면 추가 매수",
    ],
    strengths: [
      "시대를 앞서가는 투자 안목",
      "확신에 기반한 장기 보유 능력",
      "혁신 산업의 초기 수혜 가능성",
    ],
    warnings: [
      "과도한 집중 투자로 리스크 극대화",
      "비전과 망상의 경계가 모호할 수 있음",
      "현금흐름 없는 기업에 장기 묶일 위험",
    ],
    assets: ["테슬라", "우주항공 ETF", "AI/로봇 ETF", "비트코인"],
    kimComment:
      "비전은 멋진데, 화성 가기 전에 지구에서 밥은 먹고 살아야지. 확신과 고집은 한 끗 차이야.",
  },
  dealmaker: {
    key: "dealmaker",
    emoji: "🏛️",
    image: "/investors/dealmaker.png",
    character: "맥도널드 트럼펫",
    name: "승부를 거는 딜메이커",
    subtitle: "레버리지와 협상의 달인",
    description:
      "투자도 비즈니스처럼 접근하는 거래의 기술자. 실물 자산과 브랜드 가치를 중시하고, 레버리지를 무기 삼아 큰 판을 벌인다. 남들이 겁먹을 때 과감하게 딜을 성사시키는 배짱이 핵심.",
    traits: [
      "실물 자산(부동산·금) 중심 포트폴리오",
      "레버리지를 전략적으로 활용",
      "브랜드 파워와 독점적 가치 중시",
      "위기를 저가 매수 기회로 활용",
      "협상과 거래 구조에 강한 관심",
    ],
    strengths: [
      "실물 자산 기반의 안정적 수익",
      "레버리지 활용으로 수익 극대화",
      "위기 상황에서의 과감한 의사결정",
    ],
    warnings: [
      "레버리지 과다 시 큰 손실 가능",
      "자신감 과잉으로 리스크 과소평가",
      "유동성 부족 시 실물 자산 처분 어려움",
    ],
    assets: ["리츠(REITs)", "금", "고배당주", "부동산 ETF"],
    kimComment:
      "딜은 잘 치는데 레버리지가 양날의 검인 거 알지? 빚으로 번 돈은 빚으로 날아갈 수도 있어.",
  },
  sage: {
    key: "sage",
    emoji: "🦉",
    image: "/investors/sage.png",
    character: "왓더 버핏",
    name: "시간을 이기는 현인",
    subtitle: "복리와 인내의 철학자",
    description:
      "좋은 기업을 적정 가격에 사서 영원히 보유하는 가치 투자의 정석. 기업의 경제적 해자(moat)를 꿰뚫어 보고, 시간이 만드는 복리의 마법을 믿는다. 시장이 공포에 떨 때가 바로 매수 타이밍.",
    traits: [
      "경제적 해자(moat) 있는 기업만 선별",
      "적정 가격 이하에서만 매수 (안전마진)",
      "보유 기간은 영원이 기본",
      "시장 공포 = 매수 기회",
      "단순하지만 흔들리지 않는 원칙",
    ],
    strengths: [
      "장기 복리 효과 극대화",
      "심리적으로 가장 안정적인 투자",
      "검증된 우량 기업 중심의 안정성",
    ],
    warnings: [
      "성장 기회를 놓칠 수 있음",
      "가치 함정(value trap)에 빠질 위험",
      "시장 변화에 대한 적응이 느릴 수 있음",
    ],
    assets: ["S&P500 ETF", "삼성전자", "코카콜라", "배당성장 ETF"],
    kimComment:
      "인내심은 인정인데, 세상이 너무 빨리 변하잖아. 해자가 메워지는 속도도 체크해야지.",
  },
  strategist: {
    key: "strategist",
    emoji: "⚙️",
    image: "/investors/strategist.png",
    character: "레이 걸어요",
    name: "시스템을 설계하는 전략가",
    subtitle: "원칙과 분산의 설계자",
    description:
      "감정이 아닌 시스템으로 투자하는 원칙주의자. 모든 시나리오에 대비한 올웨더 포트폴리오를 구축하고, 리밸런싱 규칙을 철저히 따른다. 어떤 시장 환경에서도 살아남는 것이 최우선 목표.",
    traits: [
      "자산 배분 원칙을 시스템화",
      "주식·채권·원자재·금 글로벌 분산",
      "정기 리밸런싱 규칙 철저히 준수",
      "감정 배제, 데이터 기반 의사결정",
      "최악의 시나리오에도 대비하는 설계",
    ],
    strengths: [
      "어떤 시장에서도 방어 가능한 안정성",
      "감정에 흔들리지 않는 일관된 실행",
      "장기적으로 변동성 대비 우수한 성과",
    ],
    warnings: [
      "상승장에서 수익률이 상대적으로 낮음",
      "시스템 과신으로 예외 상황 대응 부족",
      "지나친 분산으로 집중 수익 불가",
    ],
    assets: ["올웨더 포트폴리오", "채권 ETF", "원자재 ETF", "글로벌 분산 ETF"],
    kimComment:
      "시스템은 완벽한데 시장이 시스템대로 안 움직이면? 원칙도 좋지만 유연함도 필요해.",
  },
  hunter: {
    key: "hunter",
    emoji: "🦅",
    image: "/investors/hunter.png",
    character: "조지 쏘아스",
    name: "시장의 빈틈을 노리는 사냥꾼",
    subtitle: "거시경제를 읽는 승부사",
    description:
      "거시 경제의 흐름을 읽고 시장의 구조적 불균형을 파고드는 매크로 투자자. 평소에는 인내하다가 확신이 생기면 한 방에 크게 베팅한다. 시장의 재귀성을 이해하고 군중 심리의 반대편에 선다.",
    traits: [
      "거시 경제 지표를 항상 추적",
      "시장의 구조적 불균형을 포착",
      "확신이 있을 때만 크게 베팅",
      "통화·금리·정책 변화에 민감",
      "군중 심리의 반대편에서 기회 포착",
    ],
    strengths: [
      "거시 흐름 적중 시 폭발적 수익",
      "시장 구조를 꿰뚫는 통찰력",
      "위기를 기회로 전환하는 능력",
    ],
    warnings: [
      "타이밍 실패 시 큰 손실 가능",
      "거시 분석이 틀릴 수도 있음",
      "집중 베팅의 리스크가 매우 높음",
    ],
    assets: ["외환", "신흥국 ETF", "원유 선물 ETF", "매크로 전략 펀드"],
    kimComment:
      "빈틈을 잘 찾는데, 그게 진짜 빈틈인지 함정인지 구분이 중요해. 사냥감이 되지 않도록.",
  },
  observer: {
    key: "observer",
    emoji: "🔍",
    image: "/investors/observer.png",
    character: "파티 런치",
    name: "일상에서 보석을 캐는 관찰자",
    subtitle: "아는 것에만 투자하는 현실주의자",
    description:
      "마트에서, 거리에서, 일상 속에서 투자 아이디어를 발견하는 생활 밀착형 투자자. '내가 아는 것에 투자한다'는 원칙으로 이해할 수 있는 기업에만 집중하며, 성장하는 기업을 합리적 가격에 사는 것을 추구한다.",
    traits: [
      "일상에서 소비 트렌드 변화를 포착",
      "이해 가능한 비즈니스 모델에만 투자",
      "PEG 비율로 성장 대비 가격 평가",
      "직접 발로 뛰어 기업을 조사",
      "숨은 보석 같은 중소형주 발굴",
    ],
    strengths: [
      "누구나 실천 가능한 투자 방법",
      "기업 이해도가 높아 리스크 관리 용이",
      "조기 발굴 시 높은 수익 가능",
    ],
    warnings: [
      "관찰 범위가 경험에 한정될 수 있음",
      "감각과 데이터의 괴리 발생 가능",
      "소형주 유동성 리스크",
    ],
    assets: ["소비재 ETF", "유통/리테일", "일상 브랜드 대형주", "중소형 성장주"],
    kimComment:
      "관찰력은 좋은데, 마트에서 잘 팔린다고 주가도 오르는 건 아니야. 숫자도 같이 봐.",
  },
  contrarian: {
    key: "contrarian",
    emoji: "🐻",
    image: "/investors/contrarian.png",
    character: "마이클 뿌리",
    name: "세상과 반대로 가는 역발상가",
    subtitle: "위기 속에서 기회를 찾는 독행자",
    description:
      "모두가 사고 싶을 때 팔고, 모두가 도망칠 때 산다. 시장의 광기와 공포를 이용해 극단적 저평가 자산을 발굴하며, 깊은 리서치와 소신으로 세상과 반대 방향에 베팅하는 역발상 투자자.",
    traits: [
      "군중 심리의 정반대로 행동",
      "극단적 저평가 자산을 깊이 리서치",
      "위기 상황에서 과감하게 매수",
      "시장의 과열/버블 신호를 주시",
      "소신 있게 장기간 반대 포지션 유지",
    ],
    strengths: [
      "버블 붕괴 시 큰 수익 가능",
      "남들이 못 보는 가치를 발견하는 눈",
      "시장 과열에 대한 경각심",
    ],
    warnings: [
      "시장이 비이성적 상태를 오래 유지할 수 있음",
      "너무 이른 진입으로 장기 손실 가능",
      "주변의 반대 의견에 외로운 싸움",
    ],
    assets: ["가치주 ETF", "경기방어주", "인버스 ETF", "침체 수혜 섹터"],
    kimComment:
      "역발상은 좋은데, '시장이 틀렸다'와 '내가 틀렸다'의 차이를 아는 게 핵심이야.",
  },
  explorer: {
    key: "explorer",
    emoji: "🧭",
    image: "/investors/explorer.png",
    character: "캐시 옹드",
    name: "미래를 선점하는 탐험가",
    subtitle: "파괴적 혁신 테마의 선구자",
    description:
      "아직 시장이 주목하지 않는 파괴적 혁신 테마를 먼저 발굴하고 선점하는 테마 투자 전문가. 높은 확신으로 미래 성장 산업에 집중 투자하며, 단기 변동성보다 5년 후의 세상을 그리며 투자한다.",
    traits: [
      "파괴적 혁신 테마 선점 투자",
      "2차전지·바이오·핀테크 등 신산업 집중",
      "높은 확신으로 성장주에 집중 투자",
      "기술 트렌드 리포트를 꼼꼼히 분석",
      "5년 후 세상을 그리며 포트폴리오 구성",
    ],
    strengths: [
      "성장 산업 초기 진입으로 높은 수익 가능",
      "트렌드 변화를 빠르게 읽는 감각",
      "테마별 분산으로 리스크 조절",
    ],
    warnings: [
      "테마 소멸 시 큰 손실 가능",
      "실적 없는 기업에 과도한 기대",
      "높은 변동성에 심리적 부담",
    ],
    assets: ["2차전지 ETF", "바이오 ETF", "핀테크", "ARK 스타일 테마 ETF"],
    kimComment:
      "탐험은 좋은데, 지도 없이 가면 조난당해. 테마 열풍과 진짜 혁신을 구분하는 눈이 필요해.",
  },
};

export interface QuizQuestion {
  q: string;
  options: { label: string; type: InvestorTypeKey }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── 1. 투자 시나리오 (급등/급락/폭락) ──
  {
    q: "보유 종목이 하루 만에 +20% 급등했습니다. 어떻게 하시겠습니까?",
    options: [
      { label: "비전이 맞았으니 그대로 보유, 화성까지 간다", type: "visionary" },
      { label: "수익 일부로 레버리지 추가 투자", type: "dealmaker" },
      { label: "좋은 기업이면 그냥 보유, 흔들리지 않는다", type: "sage" },
      { label: "시스템 규칙에 따라 리밸런싱", type: "strategist" },
    ],
  },
  {
    q: "보유 종목이 -15% 하락했습니다. 당신의 선택은?",
    options: [
      { label: "거시 분석 결과 추세 전환이면 전량 매도", type: "hunter" },
      { label: "내가 이해하는 기업이니 추가 매수", type: "observer" },
      { label: "오히려 공포에 사야 할 때, 과감히 줍줍", type: "contrarian" },
      { label: "테마 자체가 살아있으면 분할 매수", type: "explorer" },
    ],
  },
  {
    q: "시장이 갑자기 -8% 폭락했습니다. 당신의 반응은?",
    options: [
      { label: "레버리지 반등 매매 기회!", type: "dealmaker" },
      { label: "이런 날이 바로 매수 기회, 현금 투입", type: "sage" },
      { label: "공포 지수 급등 = 최고의 매수 타이밍", type: "contrarian" },
      { label: "포트폴리오 비중 재점검 후 규칙대로 대응", type: "strategist" },
    ],
  },
  {
    q: "투자한 종목이 3개월째 횡보 중입니다. 어떻게 합니까?",
    options: [
      { label: "혁신 기업이면 3년도 기다릴 수 있다", type: "visionary" },
      { label: "거시 환경 변화가 없으면 유지", type: "hunter" },
      { label: "일상에서 이 기업 제품이 잘 팔리는지 확인", type: "observer" },
      { label: "테마 모멘텀이 살아있는지 체크 후 결정", type: "explorer" },
    ],
  },
  // ── 2. 정보 소스 & 의사결정 ──
  {
    q: "투자 판단 시 가장 중요하게 보는 것은?",
    options: [
      { label: "기술 혁신성과 CEO의 비전", type: "visionary" },
      { label: "재무제표와 경제적 해자(moat)", type: "sage" },
      { label: "금리·환율·통화정책 등 거시 지표", type: "hunter" },
      { label: "산업 리포트와 기술 트렌드 분석", type: "explorer" },
    ],
  },
  {
    q: "새로운 종목에 투자하기 전, 당신의 조사 방식은?",
    options: [
      { label: "자산 배분 모델에 맞는지 시뮬레이션 돌려봄", type: "strategist" },
      { label: "그 기업 제품을 직접 써보고 주변 반응 확인", type: "observer" },
      { label: "시장 컨센서스와 반대 논리가 있는지 탐색", type: "contrarian" },
      { label: "실물 자산 가치와 현금흐름 분석", type: "dealmaker" },
    ],
  },
  {
    q: "친구가 특정 종목을 강력 추천합니다. 당신의 반응은?",
    options: [
      { label: "그 기업이 세상을 바꿀 수 있는지만 본다", type: "visionary" },
      { label: "모두가 좋다고 하면 오히려 경계한다", type: "contrarian" },
      { label: "관련 섹터의 성장 가능성을 리서치", type: "explorer" },
      { label: "해자가 있는 기업인지 재무제표부터 확인", type: "sage" },
    ],
  },
  // ── 3. 리스크 & 손절 ──
  {
    q: "당신의 손절 기준은?",
    options: [
      { label: "비전이 유효하면 손절 안 함, 오히려 추가 매수", type: "visionary" },
      { label: "거시 환경이 바뀌면 즉시 전량 매도", type: "hunter" },
      { label: "시스템에 미리 설정한 룰에 따라 자동 실행", type: "strategist" },
      { label: "테마가 끝났다 판단되면 빠르게 전환", type: "explorer" },
    ],
  },
  {
    q: "레버리지 ETF나 파생상품, 활용합니까?",
    options: [
      { label: "레버리지는 나의 무기, 확신 있을 때 적극 활용", type: "dealmaker" },
      { label: "리스크 계산 후 포트폴리오의 일부로만 편입", type: "strategist" },
      { label: "인버스/풋옵션으로 하락에 베팅하기도 한다", type: "contrarian" },
      { label: "절대 사용 안 함, 원금 보전이 우선", type: "sage" },
    ],
  },
  {
    q: "포트폴리오에 손실 종목이 있는데 뉴스에서 악재가 터졌습니다.",
    options: [
      { label: "기업 해자가 건재하면 악재는 노이즈일 뿐", type: "sage" },
      { label: "군중이 패닉할 때 역으로 줍는다", type: "contrarian" },
      { label: "매장이나 서비스를 직접 가서 확인해본다", type: "observer" },
      { label: "거시 흐름과 연결된 악재인지 분석", type: "hunter" },
    ],
  },
  // ── 4. 자산 배분 & 시간 ──
  {
    q: "이상적인 투자 기간은?",
    options: [
      { label: "10년 이상, 미래 산업이 현실이 될 때까지", type: "visionary" },
      { label: "5~10년, 복리가 마법을 부릴 때까지", type: "sage" },
      { label: "사이클에 따라 유동적, 수개월~수년", type: "hunter" },
      { label: "테마 성장기에 집중, 2~5년", type: "explorer" },
    ],
  },
  {
    q: "1억 원이 생겼습니다. 어떻게 투자하시겠습니까?",
    options: [
      { label: "부동산·리츠에 레버리지 끼고 투자", type: "dealmaker" },
      { label: "주식·채권·금·원자재 4등분 분산", type: "strategist" },
      { label: "내가 자주 가는 가게의 상장 기업에 투자", type: "observer" },
      { label: "2차전지·AI·바이오 성장 테마에 분배", type: "explorer" },
    ],
  },
  {
    q: "투자 관련 정보를 얼마나 자주 확인합니까?",
    options: [
      { label: "분기 1회, 리밸런싱 때만 확인하면 충분", type: "strategist" },
      { label: "매일 경제 뉴스·거시 지표 모니터링", type: "hunter" },
      { label: "마트·거리에서 항상 트렌드를 관찰 중", type: "observer" },
      { label: "혁신 기업 뉴스는 실시간으로 챙겨봄", type: "visionary" },
    ],
  },
  // ── 5. 투자 철학 & 가치관 ──
  {
    q: "투자에서 가장 중요한 것은?",
    options: [
      { label: "미래를 바꿀 비전과 혁신", type: "visionary" },
      { label: "실물 가치와 현금흐름", type: "dealmaker" },
      { label: "기업의 본질적 가치와 안전마진", type: "sage" },
      { label: "원칙과 시스템에 따른 일관된 실행", type: "strategist" },
    ],
  },
  {
    q: "주식 투자를 한마디로 표현한다면?",
    options: [
      { label: "전쟁. 거시 흐름을 읽고 크게 승부하는 것", type: "hunter" },
      { label: "보물찾기. 일상 속에서 숨은 보석을 캐는 것", type: "observer" },
      { label: "역주행. 남들과 반대로 가야 큰돈을 번다", type: "contrarian" },
      { label: "탐험. 아직 아무도 가지 않은 길을 개척하는 것", type: "explorer" },
    ],
  },
  {
    q: "가장 존경하는 투자 철학은?",
    options: [
      { label: "기업의 해자를 찾아 영원히 보유하라", type: "sage" },
      { label: "모든 시나리오에 대비하는 시스템을 만들어라", type: "strategist" },
      { label: "남들이 탐욕스러울 때 두려워하라", type: "contrarian" },
      { label: "아는 것에 투자하고, 모르면 공부하라", type: "observer" },
    ],
  },
  {
    q: "연간 목표 수익률은?",
    options: [
      { label: "100%+, 혁신 기업은 10배도 가능", type: "visionary" },
      { label: "20~30%, 레버리지 활용하면 충분히", type: "dealmaker" },
      { label: "10~15%, 시장 수익률만 꾸준히 이기면 충분", type: "sage" },
      { label: "시장 상황별로 다름, 수익률보다 리스크 관리", type: "strategist" },
    ],
  },
  // ── 6. 재미 가상 시나리오 ──
  {
    q: "타임머신이 있다면 어떤 투자를 하시겠습니까?",
    options: [
      { label: "2010년에 테슬라 IPO 올인", type: "visionary" },
      { label: "2008년 금융위기 직전에 풋옵션 매수", type: "contrarian" },
      { label: "1990년대 맨해튼 부동산 매입", type: "dealmaker" },
      { label: "2000년에 아마존 사서 아직까지 보유", type: "sage" },
    ],
  },
  {
    q: "무인도에 딱 하나의 투자 도구만 가져갈 수 있다면?",
    options: [
      { label: "글로벌 거시 경제 대시보드", type: "hunter" },
      { label: "소비자 트렌드 리포트", type: "observer" },
      { label: "자동 리밸런싱 시스템", type: "strategist" },
      { label: "미래 기술 트렌드 보고서", type: "explorer" },
    ],
  },
  {
    q: "투자 세계에서 당신의 별명은?",
    options: [
      { label: "미래에서 온 사람 — 남들보다 10년 앞서 생각", type: "visionary" },
      { label: "부동산 황제 — 실물로 제국을 건설", type: "dealmaker" },
      { label: "공포의 매수자 — 시장이 울 때 웃는다", type: "contrarian" },
      { label: "테마 사냥꾼 — 다음 빅 트렌드를 먼저 발견", type: "explorer" },
    ],
  },
];

export function calcInvestorType(answers: InvestorTypeKey[]): InvestorType {
  const scores: Record<InvestorTypeKey, number> = {
    visionary: 0,
    dealmaker: 0,
    sage: 0,
    strategist: 0,
    hunter: 0,
    observer: 0,
    contrarian: 0,
    explorer: 0,
  };
  answers.forEach((a) => scores[a]++);
  const topKey = (Object.keys(scores) as InvestorTypeKey[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b
  );
  return INVESTOR_TYPES[topKey];
}
```

### lib/investorRecommendApi.ts
```ts
import type { RecommendedStock } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_RECOMMEND_API_URL ||
  `${FIREBASE_HOST}/api/investor-recommend`;

export async function fetchInvestorRecommend(
  investorType: string,
): Promise<RecommendedStock[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ investorType }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `추천 종목 조회 실패 (${res.status})`);
  }

  const data = await res.json();
  return data.stocks ?? [];
}
```

### lib/investorTrendApi.ts
```ts
import type { InvestorTrendData } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_INVESTOR_TREND_API_URL ||
  `${FIREBASE_HOST}/api/investor-trend`;

export async function fetchInvestorTrend(
  symbol: string
): Promise<InvestorTrendData> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`investor-trend API error: ${res.status}`);
  return res.json();
}
```

### lib/inviteApi.ts
```ts
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import type { InviteCode, InviteRecord } from "@/types/social";

// I,O,0,1 제외 영숫자
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function getOrCreateInviteCode(
  userId: string,
  nickname: string
): Promise<InviteCode> {
  // 이미 생성된 코드가 있는지 확인
  const q = query(
    collection(db, "invite_codes"),
    where("ownerId", "==", userId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0].data();
    return {
      code: snap.docs[0].id,
      ownerId: d.ownerId,
      ownerNickname: d.ownerNickname,
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? "",
      usedCount: d.usedCount ?? 0,
    };
  }

  // 새 코드 생성 (충돌 방지: 최대 5회 시도)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const ref = doc(db, "invite_codes", code);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ownerId: userId,
        ownerNickname: nickname,
        createdAt: serverTimestamp(),
        usedCount: 0,
      });
      return {
        code,
        ownerId: userId,
        ownerNickname: nickname,
        createdAt: new Date().toISOString(),
        usedCount: 0,
      };
    }
  }
  throw new Error("코드 생성에 실패했습니다. 다시 시도해주세요.");
}

export async function lookupInviteCode(
  code: string
): Promise<InviteCode | null> {
  const ref = doc(db, "invite_codes", code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    code: snap.id,
    ownerId: d.ownerId,
    ownerNickname: d.ownerNickname,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? "",
    usedCount: d.usedCount ?? 0,
  };
}

export async function registerInvite(
  newUserId: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const upperCode = code.toUpperCase();

  // 이미 초대받은 사용자인지 확인
  const recordRef = doc(db, "invite_records", newUserId);
  const existing = await getDoc(recordRef);
  if (existing.exists()) {
    return { success: false, message: "이미 초대코드를 사용했습니다" };
  }

  // 코드 유효성 확인
  const inviteCode = await lookupInviteCode(upperCode);
  if (!inviteCode) {
    return { success: false, message: "존재하지 않는 초대코드입니다" };
  }

  // 자기 초대 방지
  if (inviteCode.ownerId === newUserId) {
    return { success: false, message: "자신의 초대코드는 사용할 수 없습니다" };
  }

  // 초대 기록 생성
  await setDoc(recordRef, {
    inviteeId: newUserId,
    inviterCode: upperCode,
    inviterId: inviteCode.ownerId,
    activated: false,
    rewardGranted: false,
    createdAt: serverTimestamp(),
  });

  return { success: true, message: `${inviteCode.ownerNickname}님의 초대를 받았습니다!` };
}

export async function getInviteStats(
  userId: string
): Promise<{ code: string | null; count: number }> {
  // 내 코드 조회
  const q = query(
    collection(db, "invite_codes"),
    where("ownerId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return { code: null, count: 0 };

  const d = snap.docs[0].data();
  return {
    code: snap.docs[0].id,
    count: d.usedCount ?? 0,
  };
}

/** 캐릭터 생성 시 호출 — 초대 활성화 + 보상 적립 */
export async function activateInvite(inviteeId: string): Promise<number> {
  const recordRef = doc(db, "invite_records", inviteeId);
  const snap = await getDoc(recordRef);
  if (!snap.exists()) return 0;

  const data = snap.data();
  if (data.activated) return 0; // 이미 활성화됨

  const inviterId: string = data.inviterId;
  const inviterCode: string = data.inviterCode;

  // 초대 기록 활성화
  await setDoc(recordRef, { activated: true, rewardGranted: true }, { merge: true });

  // 초대코드 usedCount 증가
  const codeRef = doc(db, "invite_codes", inviterCode);
  await setDoc(codeRef, { usedCount: increment(1) }, { merge: true });

  // 공유자에게 pending stones 적립
  const rewardRef = doc(db, "invite_rewards", inviterId);
  await setDoc(rewardRef, { pendingStones: increment(3) }, { merge: true });

  return 3; // 받는 사람에게 줄 stones
}

/** adventure 진입 시 호출 — 공유자 보상 수령 */
export async function claimInviteRewards(userId: string): Promise<number> {
  const rewardRef = doc(db, "invite_rewards", userId);
  const snap = await getDoc(rewardRef);
  if (!snap.exists()) return 0;

  const stones = snap.data().pendingStones ?? 0;
  if (stones <= 0) return 0;

  await deleteDoc(rewardRef);
  return stones;
}

// 타입 export (InviteRecord 사용처 지원)
export type { InviteCode, InviteRecord };
```

### lib/kakaoShare.ts
```ts
const KAKAO_APP_KEY = "879eb3c1fc8e7d5bc8bd539d81a5c02b";
const SITE_URL = "https://bitgak.co.kr";

function initKakao() {
  const Kakao = window.Kakao;
  if (!Kakao) return false;
  if (!Kakao.isInitialized()) {
    Kakao.init(KAKAO_APP_KEY);
  }
  return true;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

interface KakaoShareFeedOptions {
  title: string;
  description: string;
  imageDataUrl?: string;
  shareUrl?: string;
}

export async function kakaoShareFeed({
  title,
  description,
  imageDataUrl,
  shareUrl = SITE_URL,
}: KakaoShareFeedOptions): Promise<void> {
  if (!initKakao() || !window.Kakao) {
    alert("카카오 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  let imageUrl = `${SITE_URL}/og-image.png`;

  if (imageDataUrl) {
    try {
      const file = dataUrlToFile(imageDataUrl, "ovision-share.png");
      const result = await window.Kakao.Share.uploadImage({ file: [file] });
      imageUrl = result.infos.original.url;
    } catch {
      // 업로드 실패 시 OG 이미지 fallback
    }
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
    },
    buttons: [
      {
        title: "나도 분석 받기",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
    ],
  });
}
```

### lib/kstDate.ts
```ts
/** KST(UTC+9) 기준 오늘 날짜 문자열 (YYYY-MM-DD) */
export function getKSTDateString(date?: Date): string {
  const d = date ?? new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 어제 날짜 문자열 (YYYY-MM-DD) */
export function getKSTYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getKSTDateString(d);
}

/** KST 기준 ISO 주차 (2026-W09 형식) */
export function getKSTWeekId(date?: Date): string {
  const d = date ?? new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  // ISO week 계산
  const tmp = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** KST 기준 이번 주 월요일 날짜 (YYYY-MM-DD) */
export function getKSTMonday(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay() || 7; // 일요일=7
  kst.setUTCDate(kst.getUTCDate() - day + 1);
  return kst.toISOString().slice(0, 10);
}

/** KST 기준 이번 주 금요일 날짜 (YYYY-MM-DD) */
export function getKSTFriday(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay() || 7;
  kst.setUTCDate(kst.getUTCDate() - day + 5);
  return kst.toISOString().slice(0, 10);
}
```

### lib/popularStocksApi.ts
```ts
const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL = process.env.NEXT_PUBLIC_POPULAR_STOCKS_API_URL || `${FIREBASE_HOST}/api/popular-stocks`;

export interface PopularStockEntry {
  symbol: string;
  name: string;
  count: number;
}

export async function incrementAnalysisCount(symbol: string, name: string): Promise<void> {
  try {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment", symbol, name }),
    }).catch(() => {});
  } catch {
    // fire-and-forget
  }
}

let cachedResult: { data: PopularStockEntry[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function fetchPopularStocks(): Promise<PopularStockEntry[]> {
  if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL) {
    return cachedResult.data;
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("인기 종목 조회 실패");
  const data: PopularStockEntry[] = await res.json();
  cachedResult = { data, fetchedAt: Date.now() };
  return data;
}
```

### lib/portfolioDb.ts
```ts
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Portfolio } from "@/hooks/useMockPortfolio";

const COLLECTION = "portfolios";

export async function loadPortfolioFromDb(userId: string): Promise<Portfolio | null> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data() as Portfolio;
}

export async function savePortfolioToDb(userId: string, portfolio: Portfolio): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), portfolio);
}
```

### lib/rankingApi.ts
```ts
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";

const COLLECTION = "mock_rankings";

export interface RankingEntry {
  userId: string;
  nickname: string;
  strategy: string;
  totalAsset: number;
  returnPct: number;
  updatedAt: string;
  investorType?: string;   // "⚡ 공격형 트레이더" 형태
  holdingCount?: number;       // 보유 종목 수
  topHolding?: string;         // 대표 종목명 (평가액 최대)
  prevReturnPct?: number;      // 전일 수익률 (변동 계산용)
  pnlAmount?: number;          // 평가손익 금액 (원 단위)
}

export async function upsertRanking(entry: RankingEntry): Promise<void> {
  await setDoc(doc(db, COLLECTION, entry.userId), entry);
}

export async function fetchMyRank(userId: string): Promise<{ rank: number; entry: RankingEntry } | null> {
  const userSnap = await getDoc(doc(db, COLLECTION, userId));
  if (!userSnap.exists()) return null;
  const entry = userSnap.data() as RankingEntry;
  const aboveSnap = await getCountFromServer(
    query(collection(db, COLLECTION), where("returnPct", ">", entry.returnPct))
  );
  return { rank: aboveSnap.data().count + 1, entry };
}

export async function deleteRanking(userId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, userId));
}

export async function fetchTopRankings(n = 200): Promise<RankingEntry[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("returnPct", "desc"),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RankingEntry);
}
```

### lib/rpgCharacterDb.ts
```ts
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { RpgCharacter } from "@/types";

const COLLECTION = "rpg_characters";

export async function loadRpgCharacter(userId: string): Promise<RpgCharacter | null> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return null;
  return snap.data() as RpgCharacter;
}

export async function saveRpgCharacter(userId: string, character: RpgCharacter): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), character);
}
```

### lib/rpgConstants.ts
```ts
import type { RpgClassKey, RpgStats, EquipmentItem, EquipmentSlotKey, EquipmentGrade } from "@/types";

// ── 클래스 정보 ──
export interface RpgClassInfo {
  emoji: string;
  className: string;
  subtitle: string;
  baseStats: RpgStats;
}

export const RPG_CLASSES: Record<RpgClassKey, RpgClassInfo> = {
  visionary: {
    emoji: "🚀",
    className: "혁신가",
    subtitle: "미래에 투자하는 선구자",
    baseStats: { attack: 8, defense: 3, intelligence: 7, stamina: 4, luck: 6 },
  },
  dealmaker: {
    emoji: "🏛️",
    className: "딜메이커",
    subtitle: "레버리지의 달인",
    baseStats: { attack: 7, defense: 5, intelligence: 5, stamina: 6, luck: 5 },
  },
  sage: {
    emoji: "🦉",
    className: "현인",
    subtitle: "복리와 인내의 철학자",
    baseStats: { attack: 4, defense: 8, intelligence: 8, stamina: 5, luck: 3 },
  },
  strategist: {
    emoji: "⚙️",
    className: "전략가",
    subtitle: "시스템 설계자",
    baseStats: { attack: 5, defense: 7, intelligence: 7, stamina: 6, luck: 3 },
  },
  hunter: {
    emoji: "🦅",
    className: "사냥꾼",
    subtitle: "거시경제의 승부사",
    baseStats: { attack: 9, defense: 3, intelligence: 6, stamina: 4, luck: 6 },
  },
  observer: {
    emoji: "🔍",
    className: "관찰자",
    subtitle: "일상 속 보석 발굴자",
    baseStats: { attack: 5, defense: 5, intelligence: 6, stamina: 7, luck: 5 },
  },
  contrarian: {
    emoji: "🐻",
    className: "역발상가",
    subtitle: "세상과 반대로 가는 독행자",
    baseStats: { attack: 7, defense: 6, intelligence: 5, stamina: 5, luck: 5 },
  },
  explorer: {
    emoji: "🧭",
    className: "탐험가",
    subtitle: "미래 선점의 선구자",
    baseStats: { attack: 6, defense: 4, intelligence: 7, stamina: 4, luck: 7 },
  },
};

// ── 기본 장비 ──
export const DEFAULT_EQUIPMENT: Record<EquipmentSlotKey, EquipmentItem> = {
  weapon: {
    id: "default_weapon",
    name: "수습생의 연필",
    emoji: "✏️",
    grade: "common",
    baseBonus: { attack: 1 },
    bonus: { attack: 1 },
    enhanceLevel: 0,
  },
  armor: {
    id: "default_armor",
    name: "수습생의 양복",
    emoji: "👔",
    grade: "common",
    baseBonus: { defense: 1 },
    bonus: { defense: 1 },
    enhanceLevel: 0,
  },
  spellbook: {
    id: "default_spellbook",
    name: "입문 경제학 교과서",
    emoji: "📖",
    grade: "common",
    baseBonus: { intelligence: 1 },
    bonus: { intelligence: 1 },
    enhanceLevel: 0,
  },
  accessory: {
    id: "default_accessory",
    name: "행운의 동전",
    emoji: "🪙",
    grade: "common",
    baseBonus: { luck: 1 },
    bonus: { luck: 1 },
    enhanceLevel: 0,
  },
};

// ── 레벨 & 칭호 ──
const LEVEL_TITLES: [number, string][] = [
  [1, "수습 투자자"],
  [5, "견습 트레이더"],
  [10, "투자 기사"],
  [20, "시장 마법사"],
  [30, "전설의 펀드매니저"],
  [50, "투자의 신"],
];

export function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0][1];
  for (const [minLevel, t] of LEVEL_TITLES) {
    if (level >= minLevel) title = t;
    else break;
  }
  return title;
}

export function expForLevel(level: number): number {
  return level * 100;
}

// ── 스탯 라벨 & 색상 ──
export const STAT_LABELS: Record<keyof RpgStats, { label: string; color: string; bg: string }> = {
  attack: { label: "공격력", color: "text-red-400", bg: "bg-red-500" },
  defense: { label: "방어력", color: "text-blue-400", bg: "bg-blue-500" },
  intelligence: { label: "지능", color: "text-purple-400", bg: "bg-purple-500" },
  stamina: { label: "체력", color: "text-green-400", bg: "bg-green-500" },
  luck: { label: "행운", color: "text-amber-400", bg: "bg-amber-500" },
};

// ── 등급 색상 ──
export const GRADE_COLORS: Record<EquipmentGrade, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

export const GRADE_BG_COLORS: Record<EquipmentGrade, string> = {
  common: "border-gray-600 bg-gray-800/50",
  uncommon: "border-green-600 bg-green-900/30",
  rare: "border-blue-600 bg-blue-900/30",
  epic: "border-purple-600 bg-purple-900/30",
  legendary: "border-amber-500 bg-amber-900/30",
};

export const GRADE_LABELS: Record<EquipmentGrade, string> = {
  common: "일반",
  uncommon: "고급",
  rare: "희귀",
  epic: "영웅",
  legendary: "전설",
};

// ── 슬롯 라벨 ──
export const SLOT_LABELS: Record<EquipmentSlotKey, { label: string; emoji: string }> = {
  weapon: { label: "무기", emoji: "⚔️" },
  armor: { label: "방어구", emoji: "🛡️" },
  spellbook: { label: "마법서", emoji: "📚" },
  accessory: { label: "장신구", emoji: "💎" },
};
```

### lib/rpgExp.ts
```ts
import { getKSTDateString } from "@/lib/kstDate";
import { EXP_ACTIVITIES, type ExpActivityType } from "@/lib/rpgExpConfig";

// ── localStorage 키 ──
const QUEUE_KEY = "ovision_exp_queue";
const CAPS_KEY = "ovision_exp_daily_caps";

// ── 큐 아이템 ──
export interface ExpQueueItem {
  type: ExpActivityType;
  exp: number;
  label: string;
  ts: number; // timestamp
}

// ── 일일 캡 상태 ──
interface DailyCaps {
  date: string; // YYYY-MM-DD (KST)
  counts: Partial<Record<ExpActivityType, number>>;
}

// ── 내부 유틸 ──
function loadQueue(): ExpQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: ExpQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function loadCaps(): DailyCaps {
  const today = getKSTDateString();
  if (typeof window === "undefined") return { date: today, counts: {} };
  try {
    const raw = localStorage.getItem(CAPS_KEY);
    if (raw) {
      const caps: DailyCaps = JSON.parse(raw);
      if (caps.date === today) return caps;
    }
  } catch { /* ignore */ }
  return { date: today, counts: {} };
}

function saveCaps(caps: DailyCaps) {
  localStorage.setItem(CAPS_KEY, JSON.stringify(caps));
}

/**
 * 활동 EXP 적립. 캡 체크 → 큐 추가 → CustomEvent 발사.
 * @returns 적립된 EXP (0이면 캡 도달)
 */
export function grantExp(type: ExpActivityType): number {
  if (typeof window === "undefined") return 0;

  const config = EXP_ACTIVITIES[type];
  if (!config) return 0;

  // 일일 캡 체크
  const caps = loadCaps();
  const count = caps.counts[type] ?? 0;
  if (config.dailyCap > 0 && count >= config.dailyCap) return 0;

  // 캡 카운트 증가
  caps.counts[type] = count + 1;
  saveCaps(caps);

  // 큐에 추가
  const item: ExpQueueItem = {
    type,
    exp: config.baseExp,
    label: config.label,
    ts: Date.now(),
  };
  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);

  // CustomEvent 발사 (ExpToast가 수신)
  window.dispatchEvent(
    new CustomEvent("ovision-exp-granted", {
      detail: { exp: config.baseExp, label: config.label },
    })
  );

  return config.baseExp;
}

/**
 * 큐 전체 반환 후 비움 (adventure 페이지에서 호출).
 */
export function drainExpQueue(): ExpQueueItem[] {
  if (typeof window === "undefined") return [];
  const queue = loadQueue();
  if (queue.length > 0) {
    localStorage.removeItem(QUEUE_KEY);
  }
  return queue;
}

/**
 * 동적 EXP 적립 (출석 보너스 등 가변 EXP용).
 * grantExp와 동일 로직이지만 baseExp 대신 인자로 받은 exp 사용.
 */
export function grantExpDynamic(
  type: ExpActivityType,
  exp: number,
  label?: string
): number {
  if (typeof window === "undefined") return 0;

  const config = EXP_ACTIVITIES[type];
  if (!config) return 0;

  // 일일 캡 체크
  const caps = loadCaps();
  const count = caps.counts[type] ?? 0;
  if (config.dailyCap > 0 && count >= config.dailyCap) return 0;

  caps.counts[type] = count + 1;
  saveCaps(caps);

  const item: ExpQueueItem = {
    type,
    exp,
    label: label ?? config.label,
    ts: Date.now(),
  };
  const queue = loadQueue();
  queue.push(item);
  saveQueue(queue);

  window.dispatchEvent(
    new CustomEvent("ovision-exp-granted", {
      detail: { exp, label: label ?? config.label },
    })
  );

  return exp;
}

/**
 * 레벨업 계산.
 * @param currentExp 현재 EXP
 * @param currentLevel 현재 레벨
 * @param addedExp 추가 EXP
 * @param expForLevelFn 레벨별 필요 EXP 함수
 */
export function applyExp(
  currentExp: number,
  currentLevel: number,
  addedExp: number,
  expForLevelFn: (level: number) => number
): { exp: number; level: number; leveledUp: boolean; levelsGained: number } {
  let exp = currentExp + addedExp;
  let level = currentLevel;
  let levelsGained = 0;

  while (exp >= expForLevelFn(level)) {
    exp -= expForLevelFn(level);
    level++;
    levelsGained++;
  }

  return {
    exp,
    level,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}
```

### lib/rpgExpConfig.ts
```ts
export type ExpActivityType =
  | "daily_login"
  | "chart_game_correct"
  | "bitgak_analysis"
  | "mock_trade"
  | "quiz_complete"
  | "share_content"
  | "attendance_bonus"
  | "invite_reward"
  | "battle_win"
  | "battle_lose"
  | "battle_draw";

export interface ExpActivityConfig {
  baseExp: number;
  dailyCap: number; // 0 = 무제한
  label: string;
}

export const EXP_ACTIVITIES: Record<ExpActivityType, ExpActivityConfig> = {
  daily_login: { baseExp: 30, dailyCap: 1, label: "출석 보상" },
  chart_game_correct: { baseExp: 15, dailyCap: 20, label: "차트게임 정답" },
  bitgak_analysis: { baseExp: 25, dailyCap: 10, label: "빗각 분석" },
  mock_trade: { baseExp: 10, dailyCap: 15, label: "모의투자 거래" },
  quiz_complete: { baseExp: 50, dailyCap: 3, label: "성향 테스트" },
  share_content: { baseExp: 15, dailyCap: 3, label: "콘텐츠 공유" },
  attendance_bonus: { baseExp: 0, dailyCap: 1, label: "출석 보너스" },
  invite_reward: { baseExp: 50, dailyCap: 10, label: "친구 초대 보상" },
  battle_win: { baseExp: 30, dailyCap: 10, label: "배틀 승리" },
  battle_lose: { baseExp: 10, dailyCap: 10, label: "배틀 패배" },
  battle_draw: { baseExp: 20, dailyCap: 10, label: "배틀 무승부" },
};
```

### lib/signalScanApi.ts
```ts
import type { SignalScanResponse } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL = `${FIREBASE_HOST}/api/signal-scan`;

export async function fetchSignalScan(): Promise<SignalScanResponse> {
  const res = await fetch(API_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `신호 스캔 실패 (${res.status})`);
  }
  return res.json();
}
```

### lib/stockBriefingApi.ts
```ts
import type { StockBriefingResponse } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL = `${FIREBASE_HOST}/api/stock-briefing`;

function extractBriefingFromPartial(text: string): string | null {
  const match = text.match(/"briefing"\s*:\s*"((?:[^"\\]|\\.)*)/) ;
  if (!match) return null;
  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export async function streamStockBriefing(
  stocks: { symbol: string; name: string; chartSummary: string }[],
  news: { stockName: string; headlines: string[] }[],
  mode: "single" | "compare",
  onChunk: (partial: string) => void,
  onComplete: (result: StockBriefingResponse) => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stocks, news, mode }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string }).error || `서버 오류 (${response.status})`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const jsonStr = part.slice(6).trim();
        if (!jsonStr) continue;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (msg.error) throw new Error(msg.error as string);

        if (msg.done && msg.r) {
          completed = true;
          onComplete(msg.r as StockBriefingResponse);
          return;
        }

        if (msg.t) {
          accumulated += msg.t as string;
          const partial = extractBriefingFromPartial(accumulated);
          if (partial !== null) onChunk(partial);
        }
      }
    }

    if (!completed && accumulated) {
      const cleaned = accumulated.trim()
        .replace(/^`` ` ``(?:json)?\n?/, "")
        .replace(/\n?`` ` ``$/, "");
      try {
        const parsed = JSON.parse(cleaned) as StockBriefingResponse;
        onComplete(parsed);
      } catch {
        onComplete({
          briefing: accumulated.slice(0, 500),
          verdict: "관망",
          riskLevel: "medium",
          keyPoints: [],
        });
      }
    }
  } catch (err) {
    onError(err as Error);
  }
}
```

### lib/stockChartApi.ts
```ts
import type { StockChartResponse, ChartRange, ChartInterval } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_CHART_API_URL ||
  `${FIREBASE_HOST}/api/stock-chart`;

export async function fetchStockChart(
  symbol: string,
  range: ChartRange = "6mo",
  interval: ChartInterval = "1d",
  period?: { from: number; to: number },
): Promise<StockChartResponse> {
  const params = new URLSearchParams({ symbol, interval });
  if (period) {
    params.set("period1", String(period.from));
    params.set("period2", String(period.to));
  } else {
    params.set("range", range);
  }
  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `차트 데이터 조회 실패 (${res.status})`);
  }

  return res.json();
}
```

### lib/stockPricesApi.ts
```ts
const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_PRICES_API_URL ||
  `${FIREBASE_HOST}/api/stock-prices`;

export interface StockPrice {
  price: number;
  changePct: number;
  name: string;
  currency: string;
}

export async function fetchStockPrices(
  symbols: string[]
): Promise<Record<string, StockPrice>> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error(`stock-prices API error: ${res.status}`);
  return res.json();
}
```

### lib/stockRoastApi.ts
```ts
import type { StockRoastResult } from "@/types";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL = `${FIREBASE_HOST}/api/stock-roast`;

export async function fetchStockRoast(
  symbol: string,
  name: string
): Promise<StockRoastResult> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `서버 오류 (${res.status})`);
  }
  return res.json();
}
```

### lib/stockSearchApi.ts
```ts
import krStocksRaw from "@/data/krStocks.json";

const FIREBASE_HOST = "https://bitgak.co.kr";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_SEARCH_API_URL ||
  `${FIREBASE_HOST}/api/stock-search`;

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  industry?: string;
}

interface KrStockEntry {
  s: string;
  n: string;
  m: string;
  i?: string;
}

const KR_STOCKS: StockSearchResult[] = (krStocksRaw as KrStockEntry[]).map(
  (r) => ({
    symbol: r.s,
    name: r.n,
    exchange: r.m === "P" ? "코스피" : "코스닥",
    type: "Equity",
    industry: r.i || "",
  })
);

export function findSectorPeers(
  symbol: string,
  limit = 5
): StockSearchResult[] {
  const target = KR_STOCKS.find((s) => s.symbol === symbol);
  if (!target || !target.industry) return [];
  return KR_STOCKS.filter(
    (s) => s.industry === target.industry && s.symbol !== symbol
  ).slice(0, limit);
}

export function getIndustry(symbol: string): string {
  return KR_STOCKS.find((s) => s.symbol === symbol)?.industry || "";
}

function isKorean(text: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);
}

// 초성 배열 (가~힣 유니코드 순서)
const CHOSUNG = [
  "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ",
  "ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ",
];

function getChosung(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHOSUNG[Math.floor((code - 0xAC00) / 588)];
  }
  return ch;
}

function matchKorean(name: string, query: string): boolean {
  // 1. 일반 포함 검색
  if (name.includes(query)) return true;

  // 2. 초성 검색: 쿼리의 각 글자를 초성으로 변환하여 비교
  const qChars = [...query];
  const isAllChosung = qChars.every((c) => /[ㄱ-ㅎ]/.test(c));

  if (isAllChosung) {
    // 순수 초성 입력 (ㅅㅈ → 삼성전자)
    const nameChosungs = [...name].map(getChosung);
    for (let i = 0; i <= nameChosungs.length - qChars.length; i++) {
      if (qChars.every((c, j) => nameChosungs[i + j] === c)) return true;
    }
    return false;
  }

  // 3. 혼합 입력 (삼ㅅ → 삼성): 완성 글자는 직접 비교, 마지막 자음은 초성 비교
  const lastChar = qChars[qChars.length - 1];
  if (/[ㄱ-ㅎ]/.test(lastChar)) {
    const prefix = query.slice(0, -1);
    if (prefix && name.startsWith(prefix)) {
      const nextChar = name[prefix.length];
      if (nextChar && getChosung(nextChar) === lastChar) return true;
    }
  }

  return false;
}

export async function searchStocks(
  query: string
): Promise<StockSearchResult[]> {
  if (!query.trim()) return [];

  const q = query.trim();

  // 한글 입력 → 로컬 매핑 우선 (초성 검색 지원)
  if (isKorean(q)) {
    const local = KR_STOCKS.filter((s) => matchKorean(s.name, q)).slice(0, 12);
    if (local.length > 0) return local;
  }

  // 영문/숫자/로컬 미매칭 → API 호출
  try {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const results: StockSearchResult[] = await res.json();

    // API 결과에 한글명 매핑
    return results.map((r) => {
      const mapped = KR_STOCKS.find((s) => s.symbol === r.symbol);
      return mapped ? { ...r, name: mapped.name } : r;
    });
  } catch {
    return [];
  }
}
```

### lib/stoneReward.ts
```ts
import { getKSTDateString } from "@/lib/kstDate";

// ── localStorage 키 ──
const QUEUE_KEY = "ovision_stone_queue";
const QUIZ_CLAIMED_KEY = "ovision_quiz_stone_claimed";

// ── 큐 아이템 ──
interface StoneQueueItem {
  amount: number;
  label: string;
  ts: number;
}

// ── 내부 유틸 ──
function loadQueue(): StoneQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: StoneQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * 투자석 큐에 추가 + CustomEvent 발사 (토스트용).
 */
export function queueStone(amount: number, label: string) {
  if (typeof window === "undefined") return;
  const queue = loadQueue();
  queue.push({ amount, label, ts: Date.now() });
  saveQueue(queue);

  window.dispatchEvent(
    new CustomEvent("ovision-stone-granted", {
      detail: { amount, label },
    })
  );
}

/**
 * 큐 합산 반환 후 비움 (adventure 페이지에서 호출).
 */
export function drainStoneQueue(): number {
  if (typeof window === "undefined") return 0;
  const queue = loadQueue();
  if (queue.length === 0) return 0;
  localStorage.removeItem(QUEUE_KEY);
  return queue.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * 퀴즈 투자석 수령 (영구 1회).
 */
export function claimQuizStone(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(QUIZ_CLAIMED_KEY)) return false;
  localStorage.setItem(QUIZ_CLAIMED_KEY, "1");
  queueStone(1, "투자성향 퀴즈 완료");
  return true;
}

/**
 * 모의투자 수익률 투자석 (KST 일 1회).
 */
export function claimMockDailyStone(): boolean {
  if (typeof window === "undefined") return false;
  const today = getKSTDateString();
  const key = `ovision_mock_stone_${today}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, "1");
  queueStone(1, "모의투자 수익률 +5%");
  return true;
}

/**
 * 차트게임 연승 투자석 (KST 일 1회).
 */
export function claimChartStreakStone(): boolean {
  if (typeof window === "undefined") return false;
  const today = getKSTDateString();
  const key = `ovision_chart_streak_stone_${today}`;
  if (localStorage.getItem(key)) return false;
  localStorage.setItem(key, "1");
  queueStone(1, "차트게임 5연승");
  return true;
}
```

### lib/watchlistDb.ts
```ts
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { WatchlistItem } from "@/hooks/useWatchlist";

const COLLECTION = "watchlists";

export async function loadWatchlistFromDb(userId: string): Promise<WatchlistItem[]> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.items as WatchlistItem[]) || [];
}

export async function saveWatchlistToDb(userId: string, items: WatchlistItem[]): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), { items, updatedAt: Date.now() });
}
```

## 7. hooks/ 전체 소스

### hooks/useAttendance.ts
```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { getKSTDateString } from "@/lib/kstDate";
import type { AttendanceData, DayReward } from "@/types/social";

const STORAGE_KEY = "ovision_attendance";

// 7일 사이클 보상 테이블
export const CYCLE_REWARDS: DayReward[] = [
  { day: 1, exp: 30, label: "30 EXP" },
  { day: 2, exp: 40, label: "40 EXP" },
  { day: 3, exp: 50, stones: 1, label: "50 EXP + 1 투자석" },
  { day: 4, exp: 30, label: "30 EXP" },
  { day: 5, exp: 40, label: "40 EXP" },
  { day: 6, exp: 50, stones: 1, label: "50 EXP + 1 투자석" },
  { day: 7, exp: 100, label: "100 EXP (사이클 완료!)" },
];

function loadAttendance(): AttendanceData {
  if (typeof window === "undefined") {
    return {
      currentDay: 0,
      lastCheckIn: "",
      totalDays: 0,
      checkedToday: false,
      history: [],
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    currentDay: 0,
    lastCheckIn: "",
    totalDays: 0,
    checkedToday: false,
    history: [],
  };
}

function saveAttendance(data: AttendanceData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isYesterday(dateStr: string): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getKSTDateString(yesterday) === dateStr;
}

export function useAttendance() {
  const [data, setData] = useState<AttendanceData>(loadAttendance);

  // 날짜 변경 시 checkedToday 리셋
  useEffect(() => {
    const today = getKSTDateString();
    const saved = loadAttendance();
    if (saved.lastCheckIn === today) {
      saved.checkedToday = true;
    } else {
      saved.checkedToday = false;
    }
    setData(saved);
  }, []);

  // ovision-daily-checkin 이벤트 수신
  useEffect(() => {
    function handleCheckIn() {
      checkIn();
    }
    window.addEventListener("ovision-daily-checkin", handleCheckIn);
    return () =>
      window.removeEventListener("ovision-daily-checkin", handleCheckIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIn = useCallback((): DayReward | null => {
    const today = getKSTDateString();
    const current = loadAttendance();

    // 이미 오늘 체크인 완료
    if (current.lastCheckIn === today) return null;

    // 연속 여부 판단
    let nextDay: number;
    if (isYesterday(current.lastCheckIn)) {
      // 연속 출석
      nextDay = current.currentDay >= 7 ? 1 : current.currentDay + 1;
    } else {
      // 끊김 → 1일차 리셋
      nextDay = 1;
    }

    const reward = CYCLE_REWARDS[nextDay - 1];
    const history = [...current.history, today].slice(-7);

    const updated: AttendanceData = {
      currentDay: nextDay,
      lastCheckIn: today,
      totalDays: current.totalDays + 1,
      checkedToday: true,
      history,
    };
    saveAttendance(updated);
    setData(updated);

    return reward;
  }, []);

  const isMilestone = data.totalDays > 0 && data.totalDays % 28 === 0;

  return {
    data,
    checkIn,
    rewards: CYCLE_REWARDS,
    isMilestone,
  };
}
```

### hooks/useAuth.ts
```ts
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
```

### hooks/useBacktest.ts
```ts
import { useState, useCallback } from "react";
import { fetchStockChart } from "@/lib/stockChartApi";
import type { BacktestStock, BacktestResult, ChartRange, Candle } from "@/types";

function toDateStr(ts: number) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calculateBacktest(
  stockCandles: Record<string, Candle[]>,
  kospiCandles: Candle[],
  totalAmount: number,
): BacktestResult {
  const symbols = Object.keys(stockCandles);
  const perStock = totalAmount;

  // 날짜 문자열(YYYY-MM-DD) 기준 매핑 — 미장/한국장 시간대 차이로 인한 타임스탬프 불일치 해소
  const stockMap: Record<string, Map<string, number>> = {};
  for (const sym of symbols) {
    const m = new Map<string, number>();
    stockCandles[sym].forEach((c) => m.set(toDateStr(c.time), c.close));
    stockMap[sym] = m;
  }
  const kospiMap = new Map<string, number>();
  kospiCandles.forEach((c) => kospiMap.set(toDateStr(c.time), c.close));

  // 모든 날짜 수집
  const allDates = new Set<string>();
  for (const sym of symbols) {
    for (const key of stockMap[sym].keys()) allDates.add(key);
  }
  for (const key of kospiMap.keys()) allDates.add(key);
  const sortedDates = [...allDates].sort();

  // 모든 종목 + KOSPI가 존재하는 날짜만 필터
  const validDates = sortedDates.filter((d) => {
    if (!kospiMap.has(d)) return false;
    return symbols.every((sym) => stockMap[sym].has(d));
  });

  if (validDates.length < 2) {
    return {
      dailyValues: [],
      kospiValues: [],
      stockValues: {},
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      cagrPct: 0,
      kospiReturnPct: 0,
      stockReturns: {},
      finalAmount: totalAmount,
    };
  }

  // 첫째 날 기준 매수 수량
  const firstDate = validDates[0];
  const shares: Record<string, number> = {};
  for (const sym of symbols) {
    const price = stockMap[sym].get(firstDate)!;
    shares[sym] = perStock / price;
  }
  const kospiShares = (totalAmount * symbols.length) / kospiMap.get(firstDate)!;

  // 일별 가치 계산
  const dailyValues: { date: string; value: number }[] = [];
  const kospiValues: { date: string; value: number }[] = [];
  const stockValueArrays: Record<string, { date: string; value: number }[]> = {};
  for (const sym of symbols) stockValueArrays[sym] = [];

  let peak = 0;
  let maxDrawdown = 0;

  for (const dateStr of validDates) {
    // 포트폴리오 가치
    let portfolioValue = 0;
    for (const sym of symbols) {
      const price = stockMap[sym].get(dateStr)!;
      const stockValue = shares[sym] * price;
      portfolioValue += stockValue;
      stockValueArrays[sym].push({ date: dateStr, value: stockValue });
    }
    dailyValues.push({ date: dateStr, value: portfolioValue });

    // KOSPI 가치
    const kospiValue = kospiShares * kospiMap.get(dateStr)!;
    kospiValues.push({ date: dateStr, value: kospiValue });

    // MDD
    if (portfolioValue > peak) peak = portfolioValue;
    const drawdown = (peak - portfolioValue) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const initial = dailyValues[0].value;
  const final = dailyValues[dailyValues.length - 1].value;
  const totalReturnPct = ((final - initial) / initial) * 100;

  const kospiInitial = kospiValues[0].value;
  const kospiFinal = kospiValues[kospiValues.length - 1].value;
  const kospiReturnPct = ((kospiFinal - kospiInitial) / kospiInitial) * 100;

  // CAGR (252 거래일 기준)
  const years = validDates.length / 252;
  const cagrPct = years > 0 ? (Math.pow(final / initial, 1 / years) - 1) * 100 : 0;

  // 개별 종목 수익률
  const stockReturns: Record<string, number> = {};
  for (const sym of symbols) {
    const arr = stockValueArrays[sym];
    if (arr.length >= 2) {
      stockReturns[sym] = ((arr[arr.length - 1].value - arr[0].value) / arr[0].value) * 100;
    } else {
      stockReturns[sym] = 0;
    }
  }

  return {
    dailyValues,
    kospiValues,
    stockValues: stockValueArrays,
    totalReturnPct,
    maxDrawdownPct: maxDrawdown * 100,
    cagrPct,
    kospiReturnPct,
    stockReturns,
    finalAmount: final,
  };
}

export interface CustomPeriod {
  from: string; // YYYY-MM-DD
  to: string;
}

export function useBacktest() {
  const [stocks, setStocks] = useState<BacktestStock[]>([]);
  const [amount, setAmount] = useState(10_000_000);
  const [range, setRange] = useState<ChartRange | "custom">("6mo");
  const [customPeriod, setCustomPeriod] = useState<CustomPeriod>({ from: "", to: "" });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStock = useCallback((stock: BacktestStock) => {
    setStocks((prev) => {
      if (prev.length >= 3 || prev.some((s) => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });
  }, []);

  const removeStock = useCallback((symbol: string) => {
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    setResult(null);
  }, []);

  const runBacktest = useCallback(async () => {
    if (stocks.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // 커스텀 기간 처리
      let period: { from: number; to: number } | undefined;
      let rangeParam: ChartRange = "6mo";

      if (range === "custom") {
        if (!customPeriod.from || !customPeriod.to) {
          setError("시작일과 종료일을 모두 입력하세요");
          setIsLoading(false);
          return;
        }
        const fromTs = Math.floor(new Date(customPeriod.from).getTime() / 1000);
        const toTs = Math.floor(new Date(customPeriod.to).getTime() / 1000) + 86400; // 종료일 포함
        if (fromTs >= toTs) {
          setError("시작일이 종료일보다 이전이어야 합니다");
          setIsLoading(false);
          return;
        }
        period = { from: fromTs, to: toTs };
      } else {
        rangeParam = range;
      }

      // 종목 + KOSPI 캔들 병렬 fetch
      const [kospiRes, ...stockResults] = await Promise.all([
        fetchStockChart("^KS11", rangeParam, "1d", period),
        ...stocks.map((s) => fetchStockChart(s.symbol, rangeParam, "1d", period)),
      ]);

      const stockCandles: Record<string, Candle[]> = {};
      stocks.forEach((s, i) => {
        stockCandles[s.symbol] = stockResults[i].candles;
      });

      const backtestResult = calculateBacktest(stockCandles, kospiRes.candles, amount);
      setResult(backtestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "백테스트 실행 실패");
    } finally {
      setIsLoading(false);
    }
  }, [stocks, amount, range, customPeriod]);

  return {
    stocks,
    amount,
    range,
    customPeriod,
    result,
    isLoading,
    error,
    addStock,
    removeStock,
    setAmount,
    setRange: setRange as (r: ChartRange | "custom") => void,
    setCustomPeriod,
    runBacktest,
  };
}
```

### hooks/useInviteCode.ts
```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  getOrCreateInviteCode,
  registerInvite,
  getInviteStats,
} from "@/lib/inviteApi";
import { kakaoShareFeed } from "@/lib/kakaoShare";

const SHARE_BASE = "https://bitgak.co.kr";

const PENDING_KEY = "ovision_pending_invite";

export function useInviteCode(user: User | null, basePath = "") {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  // 로그인 시 내 코드 + 대기 중 코드 처리
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // 통계 로드
      const stats = await getInviteStats(user.uid).catch(() => null);
      if (cancelled) return;
      if (stats?.code) {
        setMyCode(stats.code);
        setInviteCount(stats.count);
      }

      // 대기 중 코드 처리
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) {
        localStorage.removeItem(PENDING_KEY);
        const res = await registerInvite(user.uid, pending).catch(() => null);
        if (!cancelled && res) {
          setMessage({ text: res.message, ok: res.success });
          setTimeout(() => setMessage(null), 4000);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const generateCode = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getOrCreateInviteCode(
        user.uid,
        user.displayName || "익명"
      );
      setMyCode(result.code);
      setInviteCount(result.usedCount);
    } catch {
      setMessage({ text: "코드 생성 실패", ok: false });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const copyCode = useCallback(async () => {
    if (!myCode) return;
    await navigator.clipboard.writeText(myCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [myCode]);

  const submitCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) {
        setMessage({ text: "6자리 코드를 입력해주세요", ok: false });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      if (!user) {
        // 미로그인: localStorage에 저장
        localStorage.setItem(PENDING_KEY, trimmed);
        setMessage({
          text: "로그인 후 자동으로 적용됩니다",
          ok: true,
        });
        setTimeout(() => setMessage(null), 4000);
        return;
      }

      setLoading(true);
      try {
        const res = await registerInvite(user.uid, trimmed);
        setMessage({ text: res.message, ok: res.success });
        setTimeout(() => setMessage(null), 4000);
      } catch {
        setMessage({ text: "오류가 발생했습니다", ok: false });
        setTimeout(() => setMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const ensureCode = useCallback(async (): Promise<string | null> => {
    if (myCode) return myCode;
    if (!user) return null;
    setLoading(true);
    try {
      const result = await getOrCreateInviteCode(user.uid, user.displayName || "익명");
      setMyCode(result.code);
      setInviteCount(result.usedCount);
      return result.code;
    } catch {
      setMessage({ text: "코드 생성 실패", ok: false });
      setTimeout(() => setMessage(null), 3000);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, myCode]);

  const shareLink = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    const shareData = { title: "오비젼 — AI 투자 분석", text: "AI가 분석하는 투자 리포트, 같이 해봐!", url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* 취소 */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setMessage({ text: "링크가 복사되었습니다", ok: true });
      setTimeout(() => setMessage(null), 3000);
    }
  }, [ensureCode, basePath]);

  const shareKakao = useCallback(async (imageDataUrl?: string) => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    kakaoShareFeed({
      title: "오비젼 — AI 투자 분석",
      description: imageDataUrl ? "내 투자 모험 캐릭터를 확인해봐!" : "AI가 분석하는 투자 리포트, 같이 해봐!",
      imageDataUrl,
      shareUrl: url,
    });
  }, [ensureCode, basePath]);

  const copyLink = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const url = `${SHARE_BASE}${basePath}?ref=${code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setMessage({ text: "링크가 복사되었습니다", ok: true });
    setTimeout(() => setMessage(null), 3000);
  }, [ensureCode, basePath]);

  return {
    myCode,
    inviteCount,
    loading,
    codeCopied,
    message,
    generateCode,
    copyCode,
    submitCode,
    shareLink,
    shareKakao,
    copyLink,
  };
}
```

### hooks/useMarketData.ts
```ts
"use client";

import { useState, useEffect } from "react";

export interface FearGreedData {
  value: number;
  label: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

export interface EconEvent {
  date: string;
  event: string;
  tag: string;
  hot: boolean;
  url?: string;
}

export interface CommodityItem {
  key: string;
  name: string;
  price: number;
  changePct: number;
  currency: string;
  note: string;
}

export interface NewsItem {
  title: string;
  url: string;
}

export interface MarketData {
  fearGreed: FearGreedData | null;
  news: NewsItem[];
  econCalendar: EconEvent[];
  commodities: CommodityItem[];
  kimComment: string;
  isLoading: boolean;
}

const FIREBASE_HOST = "https://bitgak.co.kr";
const MARKET_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL ||
  `${FIREBASE_HOST}/api/market`;

export function useMarketData(): MarketData {
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [econCalendar, setEconCalendar] = useState<EconEvent[]>([]);
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [kimComment, setKimComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    fetch(MARKET_URL, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.fearGreed) setFearGreed(d.fearGreed);
        if (d.news?.length > 0) setNews(d.news);
        if (d.econCalendar?.length > 0) setEconCalendar(d.econCalendar);
        if (d.commodities?.length > 0) setCommodities(d.commodities);
        if (d.kimComment) setKimComment(d.kimComment);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return { fearGreed, news, econCalendar, commodities, kimComment, isLoading };
}
```

### hooks/useMockPortfolio.ts
```ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockPrices, StockPrice } from "@/lib/stockPricesApi";
import { loadPortfolioFromDb, savePortfolioToDb } from "@/lib/portfolioDb";

const STORAGE_KEY = "ovision_mock_portfolio";
const INITIAL_CASH = 10_000_000;

export interface Holding {
  qty: number;
  avgPrice: number;
  currentPrice: number;
  name: string;
}

export interface HistoryEntry {
  date: string;
  type: "buy" | "sell";
  symbol: string;
  name: string;
  qty: number;
  price: number;
}

export interface Portfolio {
  cash: number;
  holdings: Record<string, Holding>;
  settledAt: string | null;
  history: HistoryEntry[];
}

function defaultPortfolio(): Portfolio {
  return { cash: INITIAL_CASH, holdings: {}, settledAt: null, history: [] };
}

function loadLocalPortfolio(): Portfolio {
  if (typeof window === "undefined") return defaultPortfolio();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPortfolio();
    const p = JSON.parse(raw) as Portfolio;
    if ("pendingOrders" in p) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldPending: Array<{ type: string }> = (p as any).pendingOrders ?? [];
      if (oldPending.some((o) => o.type === "buy") && Object.keys(p.holdings ?? {}).length === 0) {
        p.cash = INITIAL_CASH;
      }
      delete (p as Record<string, unknown>).pendingOrders;
    }
    for (const [sym, h] of Object.entries(p.holdings ?? {})) {
      if (!h.currentPrice) p.holdings[sym] = { ...h, currentPrice: h.avgPrice };
    }
    return p;
  } catch {
    return defaultPortfolio();
  }
}

function saveLocalPortfolio(p: Portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function todayKST(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    .toISOString()
    .slice(0, 10);
}

function isSettlementTime(): boolean {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })).getHours() >= 18;
}

export function useMockPortfolio(userId?: string | null) {
  const [portfolio, setPortfolioState] = useState<Portfolio>(defaultPortfolio);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // 저장 (로그인 여부에 따라 Firestore 또는 localStorage)
  const setPortfolio = useCallback((p: Portfolio) => {
    setPortfolioState(p);
    if (userId) {
      savePortfolioToDb(userId, p).catch(() => saveLocalPortfolio(p));
    } else {
      saveLocalPortfolio(p);
    }
  }, [userId]);

  // 포트폴리오 로드 (userId 바뀔 때마다 재실행)
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    setInitialized(false);

    if (userId) {
      // 로그인 상태: Firestore에서 로드, 없으면 신규 포트폴리오 초기화
      loadPortfolioFromDb(userId).then((dbPortfolio) => {
        if (dbPortfolio) {
          // Firestore 문서에 필드 누락 방어
          setPortfolioState({
            ...defaultPortfolio(),
            ...dbPortfolio,
            holdings: dbPortfolio.holdings ?? {},
            history: dbPortfolio.history ?? [],
          });
        } else {
          // 신규 계정: 항상 빈 포트폴리오로 시작 (다른 계정 localStorage 오염 방지)
          const fresh = defaultPortfolio();
          setPortfolioState(fresh);
          savePortfolioToDb(userId, fresh).catch(() => {});
        }
        setInitialized(true);
      }).catch(() => {
        setPortfolioState(defaultPortfolio());
        setInitialized(true);
      });
    } else {
      // 비로그인: localStorage
      setPortfolioState(loadLocalPortfolio());
      setInitialized(true);
    }
  }, [userId]);

  const refreshPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setPricesLoading(true);
    try {
      const data = await fetchStockPrices(symbols);
      setPrices((prev) => ({ ...prev, ...data }));
    } catch {
      // 시세 로드 실패 — 조용히 무시 (unhandled rejection 방지)
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // 18시 정산
  const runSettlement = useCallback(async (p: Portfolio): Promise<Portfolio> => {
    const symbols = Object.keys(p.holdings);
    if (symbols.length === 0) return { ...p, settledAt: todayKST() };
    let priceData: Record<string, StockPrice> = {};
    try { priceData = await fetchStockPrices(symbols); } catch { return p; }
    const holdings = { ...p.holdings };
    for (const [symbol, holding] of Object.entries(holdings)) {
      const stock = priceData[symbol];
      if (stock) holdings[symbol] = { ...holding, currentPrice: Math.round(stock.price) };
    }
    return { ...p, holdings, settledAt: todayKST() };
  }, []);

  // 18시 이후 자동 정산
  useEffect(() => {
    if (!initialized) return;
    const p = userId ? portfolio : loadLocalPortfolio();
    const today = todayKST();
    if (p.settledAt !== today && isSettlementTime() && Object.keys(p.holdings).length > 0) {
      setSettling(true);
      runSettlement(p).then((updated) => {
        setPortfolio(updated);
        setSettling(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // 30초마다 보유 종목 시세 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      const heldSymbols = Object.keys(portfolio.holdings);
      if (heldSymbols.length > 0) refreshPrices(heldSymbols);
    }, 30000);
    return () => clearInterval(interval);
  }, [portfolio.holdings, refreshPrices]);

  // 즉시 체결
  const placeOrder = useCallback(
    (symbol: string, name: string, type: "buy" | "sell", qty: number) => {
      const currentPrice = prices[symbol]?.price;
      if (!currentPrice) throw new Error("현재가를 불러올 수 없습니다.");
      const price = Math.round(currentPrice);
      const p = { ...portfolio, holdings: { ...portfolio.holdings } };

      if (type === "buy") {
        const cost = price * qty;
        if (p.cash < cost) throw new Error("잔액이 부족합니다.");
        p.cash -= cost;
        const existing = p.holdings[symbol];
        if (existing) {
          const totalQty = existing.qty + qty;
          const avgPrice = Math.round((existing.avgPrice * existing.qty + price * qty) / totalQty);
          p.holdings[symbol] = { qty: totalQty, avgPrice, currentPrice: price, name };
        } else {
          p.holdings[symbol] = { qty, avgPrice: price, currentPrice: price, name };
        }
      } else {
        const existing = p.holdings[symbol];
        if (!existing || existing.qty < qty) throw new Error("보유 수량이 부족합니다.");
        p.cash += price * qty;
        const remaining = existing.qty - qty;
        if (remaining === 0) delete p.holdings[symbol];
        else p.holdings[symbol] = { ...existing, qty: remaining };
      }

      p.history = [...(p.history ?? []), { date: todayKST(), type, symbol, name, qty, price }];
      setPortfolio(p);
    },
    [prices, portfolio, setPortfolio]
  );

  const resetPortfolio = useCallback(() => {
    const fresh = defaultPortfolio();
    setPortfolio(fresh);
    setPrices({});
  }, [setPortfolio]);

  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [symbol, h]) => {
    const px = prices[symbol]?.price ?? h.currentPrice;
    return sum + px * h.qty;
  }, 0);
  const totalAsset = portfolio.cash + holdingsValue;
  const returnPct = ((totalAsset - INITIAL_CASH) / INITIAL_CASH) * 100;

  return {
    portfolio,
    prices,
    pricesLoading,
    settling,
    initialized,
    holdingsValue,
    totalAsset,
    returnPct,
    refreshPrices,
    placeOrder,
    resetPortfolio,
  };
}
```

### hooks/useRoastFlow.ts
```ts
"use client";

import { useState, useCallback, useRef } from "react";
import type { RoastState, Grade, KimExpression, AnalysisMode } from "@/types";
import { analyzePortfolioStream, analyzeBitgakStream } from "@/lib/analyzeApi";

function deriveExpression(grade: Grade): KimExpression {
  switch (grade) {
    case "S":
    case "A":
      return "smug";
    case "B":
    case "C":
      return "neutral";
    case "D":
      return "pity";
    case "F":
      return "angry";
    default:
      return "neutral";
  }
}

const initialState: RoastState = {
  imageBase64: null,
  mimeType: null,
  previewUrl: null,
  isLoading: false,
  isStreaming: false,
  roast: null,
  analysis: null,
  scores: null,
  sector: null,
  chartLines: null,
  error: null,
  grade: null,
  kimExpression: "neutral",
};

export function useRoastFlow() {
  const [state, setState] = useState<RoastState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setState((prev) => ({
        ...prev,
        imageBase64: base64,
        mimeType: file.type,
        previewUrl: dataUrl,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        grade: null,
        isStreaming: false,
        kimExpression: "neutral",
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const startRoast = useCallback(
    async (mode: AnalysisMode = "kim", imageBase64: string, mimeType: string) => {
      if (!imageBase64 || !mimeType) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: false,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        kimExpression: "shocked",
      }));

      await analyzePortfolioStream(
        { imageBase64, mimeType, mode },

        // 스트리밍 청크: roast 텍스트가 조금씩 쌓임
        (partial) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: true,
            roast: partial,
          }));
        },

        // 완료: 전체 결과 세팅
        (data) => {
          const kimExpression = deriveExpression(data.grade);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            roast: data.roast,
            analysis: data.analysis,
            scores: data.scores,
            sector: data.sector ?? null,
            chartLines: data.chartLines ?? null,
            grade: data.grade,
            kimExpression,
          }));
        },

        // 오류
        (err) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error: err.message,
            kimExpression: "shocked",
          }));
        }
      );
    },
    []
  );

  const startBitgakRoast = useCallback(
    async (textSummary: string, stockName: string) => {
      if (!textSummary) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isStreaming: false,
        roast: null,
        analysis: null,
        scores: null,
        sector: null,
        error: null,
        kimExpression: "shocked",
      }));

      await analyzeBitgakStream(
        textSummary,
        stockName,
        (partial) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: true,
            roast: partial,
          }));
        },
        (data) => {
          const kimExpression = deriveExpression(data.grade);
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            roast: data.roast,
            analysis: data.analysis,
            scores: data.scores,
            sector: data.sector ?? null,
            chartLines: null,
            grade: data.grade,
            kimExpression,
          }));
        },
        (err) => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            error: err.message,
            kimExpression: "shocked",
          }));
        }
      );
    },
    []
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      roast: null,
      analysis: null,
      scores: null,
      sector: null,
      chartLines: null,
      error: null,
      grade: null,
      kimExpression: "neutral",
    }));
  }, []);

  return { state, loadImage, startRoast, startBitgakRoast, reset, clearResult };
}
```

### hooks/useRpgCharacter.ts
```ts
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { loadRpgCharacter, saveRpgCharacter } from "@/lib/rpgCharacterDb";
import { RPG_CLASSES, DEFAULT_EQUIPMENT, getLevelTitle, expForLevel } from "@/lib/rpgConstants";
import type { RpgCharacter, RpgClassKey, RpgStats, EquipmentSlotKey } from "@/types";

const STORAGE_KEY = "ovision_rpg_character";

/** Firestore/localStorage에서 불러온 캐릭터 데이터 유효성 검증 */
function isValidCharacter(c: unknown): c is RpgCharacter {
  if (!c || typeof c !== "object") return false;
  const obj = c as Record<string, unknown>;
  return typeof obj.class === "string" && obj.class in RPG_CLASSES;
}

/** 불완전한 캐릭터 데이터 정규화 (Firestore/localStorage에서 필드 누락 방지) */
function normalizeCharacter(c: RpgCharacter): RpgCharacter {
  const classInfo = RPG_CLASSES[c.class] ?? RPG_CLASSES.visionary;
  const normalized = { ...c };

  // class 키가 유효하지 않으면 visionary 로 보정
  if (!(c.class in RPG_CLASSES)) {
    normalized.class = "visionary";
  }

  // stats 누락 시 기본값
  if (!normalized.stats || typeof normalized.stats !== "object") {
    normalized.stats = { ...classInfo.baseStats };
  }

  // equipment 누락 시 기본 장비 세팅
  if (!normalized.equipment || typeof normalized.equipment !== "object") {
    normalized.equipment = {
      weapon: { ...DEFAULT_EQUIPMENT.weapon },
      armor: { ...DEFAULT_EQUIPMENT.armor },
      spellbook: { ...DEFAULT_EQUIPMENT.spellbook },
      accessory: { ...DEFAULT_EQUIPMENT.accessory },
    };
  } else {
    // 개별 슬롯 누락 복구
    const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
    for (const slot of slots) {
      if (normalized.equipment[slot] && typeof normalized.equipment[slot] === "object") {
        const item = normalized.equipment[slot]!;
        // emoji 누락 시 기본값
        if (!item.emoji) item.emoji = DEFAULT_EQUIPMENT[slot].emoji;
        if (!item.name) item.name = DEFAULT_EQUIPMENT[slot].name;
        if (!item.bonus) item.bonus = {};
      }
    }
  }

  // battleRecord 누락 시 기본값
  if (!normalized.battleRecord || typeof normalized.battleRecord !== "object") {
    normalized.battleRecord = { wins: 0, losses: 0, draws: 0 };
  }

  // stones 누락 시 기본값
  if (typeof normalized.stones !== "number") {
    normalized.stones = 0;
  }

  return normalized;
}

/** 기존 캐릭터에 baseBonus가 없으면 bonus에서 복사 */
function migrateBaseBonus(c: RpgCharacter): RpgCharacter {
  if (!c.equipment) return c;
  let changed = false;
  const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
  for (const slot of slots) {
    const item = c.equipment[slot];
    if (item && !item.baseBonus) {
      item.baseBonus = { ...(item.bonus ?? {}) };
      changed = true;
    }
  }
  return changed ? { ...c } : c;
}

function loadLocal(): RpgCharacter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidCharacter(parsed)) return null;
    return normalizeCharacter(migrateBaseBonus(parsed));
  } catch {
    return null;
  }
}

function saveLocal(c: RpgCharacter) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

function computeTotalStats(character: RpgCharacter): RpgStats {
  const total = { ...character.stats };
  if (!character.equipment) return total;
  const slots: EquipmentSlotKey[] = ["weapon", "armor", "spellbook", "accessory"];
  for (const slot of slots) {
    const item = character.equipment[slot];
    if (!item?.bonus) continue;
    for (const [key, val] of Object.entries(item.bonus)) {
      if (val) total[key as keyof RpgStats] += val;
    }
  }
  return total;
}

export type SetCharacterArg = RpgCharacter | ((prev: RpgCharacter) => RpgCharacter);

export function useRpgCharacter(userId?: string | null) {
  const [character, setCharacterState] = useState<RpgCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const characterRef = useRef<RpgCharacter | null>(null);

  // characterRef를 항상 최신 character와 동기화
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  const setCharacter = useCallback((arg: SetCharacterArg) => {
    const prev = characterRef.current;
    if (!prev) return;
    const next = typeof arg === "function" ? arg(prev) : arg;
    const updated = { ...next, updatedAt: new Date().toISOString() };
    characterRef.current = updated;
    setCharacterState(updated);
    saveLocal(updated);
    if (userId) {
      saveRpgCharacter(userId, updated).catch(() => {});
    }
  }, [userId]);

  // 로드
  useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    setLoading(true);

    if (userId) {
      loadRpgCharacter(userId)
        .then((dbChar) => {
          if (dbChar && isValidCharacter(dbChar)) {
            setCharacterState(normalizeCharacter(migrateBaseBonus(dbChar)));
          } else {
            // Firestore에 없으면 localStorage에서 마이그레이션
            const local = loadLocal();
            if (local) {
              const migrated = normalizeCharacter(migrateBaseBonus(local));
              setCharacterState(migrated);
              saveRpgCharacter(userId, migrated).catch(() => {});
            } else {
              setCharacterState(null);
            }
          }
          setLoading(false);
        })
        .catch(() => {
          const fallback = loadLocal();
          setCharacterState(fallback ? normalizeCharacter(fallback) : null);
          setLoading(false);
        });
    } else {
      const local = loadLocal();
      setCharacterState(local ? normalizeCharacter(local) : null);
      setLoading(false);
    }
  }, [userId]);

  const createCharacter = useCallback((classKey: RpgClassKey, nickname: string) => {
    const classInfo = RPG_CLASSES[classKey];
    const now = new Date().toISOString();
    const newChar: RpgCharacter = {
      class: classKey,
      nickname,
      level: 1,
      exp: 0,
      stats: { ...classInfo.baseStats },
      equipment: {
        weapon: { ...DEFAULT_EQUIPMENT.weapon },
        armor: { ...DEFAULT_EQUIPMENT.armor },
        spellbook: { ...DEFAULT_EQUIPMENT.spellbook },
        accessory: { ...DEFAULT_EQUIPMENT.accessory },
      },
      stones: 3,
      battleRecord: { wins: 0, losses: 0, draws: 0 },
      achievements: [],
      createdAt: now,
      updatedAt: now,
    };
    setCharacter(newChar);
    return newChar;
  }, [setCharacter]);

  const totalStats = useMemo(() => {
    if (!character) return null;
    return computeTotalStats(character);
  }, [character]);

  const levelTitle = character ? getLevelTitle(character.level) : "";
  const expNeeded = character ? expForLevel(character.level) : 0;

  return {
    character,
    loading,
    totalStats,
    levelTitle,
    expNeeded,
    createCharacter,
    setCharacter,
  };
}
```

### hooks/useStockLab.ts
```ts
"use client";

import { useState, useCallback, useRef } from "react";
import { fetchStockChart } from "@/lib/stockChartApi";
import { fetchStockPrices, type StockPrice } from "@/lib/stockPricesApi";
import { fetchStockRoast } from "@/lib/stockRoastApi";
import { streamStockBriefing } from "@/lib/stockBriefingApi";
import { fetchInvestorTrend } from "@/lib/investorTrendApi";
import { findSectorPeers, getIndustry, type StockSearchResult } from "@/lib/stockSearchApi";
import { fetchSignalScan } from "@/lib/signalScanApi";
import type {
  StockChartResponse,
  StockNewsItem,
  StockBriefingResponse,
  InvestorTrendData,
  SignalScanResponse,
  ChartRange,
  Candle,
} from "@/types";

export interface StockLabStock {
  symbol: string;
  name: string;
}

export interface StockLabState {
  stocks: StockLabStock[];
  chartDataMap: Record<string, StockChartResponse>;
  priceMap: Record<string, StockPrice>;
  newsMap: Record<string, StockNewsItem[]>;
  range: ChartRange;
  briefing: string | null;
  briefingResult: StockBriefingResponse | null;
  isBriefingStreaming: boolean;
  isLoadingChart: boolean;
  investorMap: Record<string, InvestorTrendData>;
  sectorPeers: Record<string, StockSearchResult[]>;
  sectorPriceMap: Record<string, StockPrice>;
  isLoadingInvestor: boolean;
  isLoadingSector: boolean;
  signalData: SignalScanResponse | null;
  isLoadingSignal: boolean;
  error: string | null;
}

function buildChartSummary(candles: Candle[], name: string): string {
  if (candles.length === 0) return `${name}: 데이터 없음`;
  const first = candles[0];
  const last = candles[candles.length - 1];
  const changePct = ((last.close - first.close) / first.close * 100).toFixed(1);
  const high = Math.max(...candles.map((c) => c.high));
  const low = Math.min(...candles.map((c) => c.low));
  const recent5 = candles.slice(-5);
  const recentTrend = recent5.length > 1
    ? recent5[recent5.length - 1].close > recent5[0].close ? "상승" : "하락"
    : "N/A";
  return `${name}: 현재가 ${last.close.toLocaleString()}원, 기간등락률 ${changePct}%, 고가 ${high.toLocaleString()}, 저가 ${low.toLocaleString()}, 최근5일 ${recentTrend}`;
}

export function useStockLab() {
  const [state, setState] = useState<StockLabState>({
    stocks: [],
    chartDataMap: {},
    priceMap: {},
    newsMap: {},
    range: "3mo",
    briefing: null,
    briefingResult: null,
    isBriefingStreaming: false,
    isLoadingChart: false,
    investorMap: {},
    sectorPeers: {},
    sectorPriceMap: {},
    isLoadingInvestor: false,
    isLoadingSector: false,
    signalData: null,
    isLoadingSignal: false,
    error: null,
  });

  const loadingRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const addStock = useCallback(async (stock: StockLabStock) => {
    setState((prev) => {
      if (prev.stocks.length >= 3) return prev;
      if (prev.stocks.some((s) => s.symbol === stock.symbol)) return prev;
      return {
        ...prev,
        stocks: [...prev.stocks, stock],
        isLoadingChart: true,
        error: null,
        briefing: null,
        briefingResult: null,
      };
    });

    try {
      const [chartData, priceData, newsData] = await Promise.all([
        fetchStockChart(stock.symbol, state.range),
        fetchStockPrices([stock.symbol]),
        fetchStockRoast(stock.symbol, stock.name),
      ]);

      setState((prev) => ({
        ...prev,
        chartDataMap: { ...prev.chartDataMap, [stock.symbol]: chartData },
        priceMap: { ...prev.priceMap, ...priceData },
        newsMap: { ...prev.newsMap, [stock.symbol]: newsData.news },
        isLoadingChart: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingChart: false,
        error: err instanceof Error ? err.message : "데이터 로딩 실패",
      }));
    }
  }, [state.range]);

  const removeStock = useCallback((symbol: string) => {
    setState((prev) => {
      const { [symbol]: _chart, ...restChart } = prev.chartDataMap;
      const { [symbol]: _price, ...restPrice } = prev.priceMap;
      const { [symbol]: _news, ...restNews } = prev.newsMap;
      const { [symbol]: _inv, ...restInv } = prev.investorMap;
      const { [symbol]: _sec, ...restSec } = prev.sectorPeers;
      return {
        ...prev,
        stocks: prev.stocks.filter((s) => s.symbol !== symbol),
        chartDataMap: restChart,
        priceMap: restPrice,
        newsMap: restNews,
        investorMap: restInv,
        sectorPeers: restSec,
        briefing: null,
        briefingResult: null,
      };
    });
  }, []);

  const setRange = useCallback(async (range: ChartRange) => {
    setState((prev) => ({ ...prev, range, isLoadingChart: true, error: null }));

    // Need to read current stocks from state
    setState((prev) => {
      const stocks = prev.stocks;
      if (stocks.length === 0) return { ...prev, isLoadingChart: false };

      // Fire off fetch in a microtask
      Promise.all(
        stocks.map((s) => fetchStockChart(s.symbol, range))
      ).then((results) => {
        setState((p) => {
          const chartDataMap = { ...p.chartDataMap };
          stocks.forEach((s, i) => {
            chartDataMap[s.symbol] = results[i];
          });
          return { ...p, chartDataMap, isLoadingChart: false };
        });
      }).catch((err) => {
        setState((p) => ({
          ...p,
          isLoadingChart: false,
          error: err instanceof Error ? err.message : "차트 로딩 실패",
        }));
      });

      return prev;
    });
  }, []);

  const requestBriefing = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setState((prev) => ({
      ...prev,
      briefing: null,
      briefingResult: null,
      isBriefingStreaming: true,
      error: null,
    }));

    // stateRef에서 현재 상태 직접 읽기 (React 18 batching 안전)
    const { stocks: currentStocks, chartDataMap: currentChartDataMap, newsMap: currentNewsMap } = stateRef.current;

    const stocksPayload = currentStocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      chartSummary: currentChartDataMap[s.symbol]
        ? buildChartSummary(currentChartDataMap[s.symbol].candles, s.name)
        : "",
    }));

    const newsPayload = currentStocks.map((s) => ({
      stockName: s.name,
      headlines: (currentNewsMap[s.symbol] || []).map((n) => n.title),
    }));

    const mode = currentStocks.length === 1 ? "single" : "compare";

    await streamStockBriefing(
      stocksPayload,
      newsPayload,
      mode,
      (partial) => {
        setState((prev) => ({ ...prev, briefing: partial }));
      },
      (result) => {
        setState((prev) => ({
          ...prev,
          briefingResult: result,
          briefing: result.briefing,
          isBriefingStreaming: false,
        }));
        loadingRef.current = false;
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          isBriefingStreaming: false,
          error: err.message,
        }));
        loadingRef.current = false;
      },
    );
  }, []);

  const loadInvestorTrend = useCallback(async (symbol: string) => {
    if (stateRef.current.investorMap[symbol]) return;
    setState((prev) => ({ ...prev, isLoadingInvestor: true }));
    try {
      const data = await fetchInvestorTrend(symbol);
      setState((prev) => ({
        ...prev,
        investorMap: { ...prev.investorMap, [symbol]: data },
        isLoadingInvestor: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingInvestor: false,
        error: err instanceof Error ? err.message : "투자자 데이터 로딩 실패",
      }));
    }
  }, []);

  const loadSignalScan = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingSignal: true, error: null }));
    try {
      const data = await fetchSignalScan();
      setState((prev) => ({ ...prev, signalData: data, isLoadingSignal: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingSignal: false,
        error: err instanceof Error ? err.message : "신호 스캔 실패",
      }));
    }
  }, []);

  const loadSectorComparison = useCallback(async (symbol: string) => {
    if (stateRef.current.sectorPeers[symbol]) return;
    setState((prev) => ({ ...prev, isLoadingSector: true }));
    try {
      const peers = findSectorPeers(symbol, 5);
      if (peers.length === 0) {
        setState((prev) => ({
          ...prev,
          sectorPeers: { ...prev.sectorPeers, [symbol]: [] },
          isLoadingSector: false,
        }));
        return;
      }
      const peerSymbols = peers.map((p) => p.symbol);
      const prices = await fetchStockPrices(peerSymbols);
      setState((prev) => ({
        ...prev,
        sectorPeers: { ...prev.sectorPeers, [symbol]: peers },
        sectorPriceMap: { ...prev.sectorPriceMap, ...prices },
        isLoadingSector: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoadingSector: false,
        error: err instanceof Error ? err.message : "섹터 데이터 로딩 실패",
      }));
    }
  }, []);

  return {
    state,
    addStock,
    removeStock,
    setRange,
    requestBriefing,
    loadInvestorTrend,
    loadSectorComparison,
    loadSignalScan,
    getIndustry,
  };
}
```

### hooks/useStockRoast.ts
```ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchStockRoast } from "@/lib/stockRoastApi";
import { searchStocks } from "@/lib/stockSearchApi";
import type { StockRoastResult } from "@/types";

export interface StockOption {
  symbol: string;
  name: string;
}

export function useStockRoast() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StockOption | null>(null);
  const [suggestions, setSuggestions] = useState<StockOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StockRoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 API 검색
  useEffect(() => {
    if (selected || !query.trim() || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        setSuggestions(results.map((r) => ({ symbol: r.symbol, name: r.name })));
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const selectStock = useCallback((stock: StockOption) => {
    setSelected(stock);
    setQuery(stock.name);
    setResult(null);
    setError(null);
  }, []);

  // 종목 선택 시 자동으로 시세+뉴스 로딩
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setResult(null);

    fetchStockRoast(selected.symbol, selected.name)
      .then((data) => { if (!cancelled) setResult(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "조회 실패"); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [selected]);

  const reset = useCallback(() => {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    selected,
    selectStock,
    isLoading,
    result,
    error,
    reset,
  };
}
```

### hooks/useStreak.ts
```ts
"use client";

import { useState, useEffect } from "react";
import { getKSTDateString } from "@/lib/kstDate";
import { grantExp } from "@/lib/rpgExp";

const STORAGE_KEY = "ovision_streak";

interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastVisitDate: string;
}

function loadStreak(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 0, maxStreak: 0, lastVisitDate: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { currentStreak: 0, maxStreak: 0, lastVisitDate: "" };
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    maxStreak: 0,
    lastVisitDate: "",
  });

  useEffect(() => {
    const today = getKSTDateString();
    const saved = loadStreak();

    if (saved.lastVisitDate === today) {
      // 오늘 이미 방문함
      setStreak(saved);
      return;
    }

    // 어제 방문했는지 확인
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKSTDateString(yesterday);

    let newStreak: StreakData;
    if (saved.lastVisitDate === yesterdayStr) {
      // 연속 방문
      const current = saved.currentStreak + 1;
      newStreak = {
        currentStreak: current,
        maxStreak: Math.max(saved.maxStreak, current),
        lastVisitDate: today,
      };
    } else {
      // 연속 끊김 또는 첫 방문
      newStreak = {
        currentStreak: 1,
        maxStreak: Math.max(saved.maxStreak, 1),
        lastVisitDate: today,
      };
    }

    saveStreak(newStreak);
    setStreak(newStreak);
    grantExp("daily_login");
    window.dispatchEvent(new CustomEvent("ovision-daily-checkin"));
  }, []);

  return streak;
}
```

### hooks/useVersionCheck.ts
```ts
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
```

### hooks/useWatchlist.ts
```ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockPrices, type StockPrice } from "@/lib/stockPricesApi";
import { loadWatchlistFromDb, saveWatchlistToDb } from "@/lib/watchlistDb";

const STORAGE_KEY = "ovision_watchlist";
const MAX_ITEMS = 50;
const REFRESH_INTERVAL = 60_000; // 1분

export interface WatchlistItem {
  symbol: string;
  name: string;
}

function loadLocal(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLocal(items: WatchlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** 두 리스트를 병합 (중복 symbol 제거, Firestore 우선) */
function mergeItems(dbItems: WatchlistItem[], localItems: WatchlistItem[]): WatchlistItem[] {
  const map = new Map<string, WatchlistItem>();
  for (const item of dbItems) map.set(item.symbol, item);
  for (const item of localItems) {
    if (!map.has(item.symbol)) map.set(item.symbol, item);
  }
  return Array.from(map.values()).slice(0, MAX_ITEMS);
}

export function useWatchlist(userId?: string | null) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  // 초기 로드: 로그인 → Firestore + localStorage 병합, 비로그인 → localStorage
  useEffect(() => {
    initializedRef.current = false;
    let cancelled = false;

    async function init() {
      if (userId) {
        try {
          const [dbItems, localItems] = await Promise.all([
            loadWatchlistFromDb(userId),
            Promise.resolve(loadLocal()),
          ]);
          if (cancelled) return;
          const merged = mergeItems(dbItems, localItems);
          setItems(merged);
          // localStorage에만 있던 항목이 있으면 Firestore에 병합 저장
          if (localItems.length > 0 && merged.length !== dbItems.length) {
            await saveWatchlistToDb(userId, merged);
          }
          // localStorage도 병합 결과로 동기화 (캐시 역할)
          saveLocal(merged);
        } catch {
          // Firestore 실패 시 localStorage 폴백
          if (!cancelled) setItems(loadLocal());
        }
      } else {
        setItems(loadLocal());
      }
      if (!cancelled) initializedRef.current = true;
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  // 가격 조회
  const refreshPrices = useCallback(async (list: WatchlistItem[]) => {
    if (list.length === 0) return;
    setLoading(true);
    try {
      const symbols = list.map((i) => i.symbol);
      const data = await fetchStockPrices(symbols);
      setPrices(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // items 변경 시 가격 갱신 + 주기적 갱신
  useEffect(() => {
    refreshPrices(items);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (items.length > 0) {
      intervalRef.current = setInterval(() => refreshPrices(items), REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items, refreshPrices]);

  // 저장 헬퍼: localStorage는 항상 캐시로 유지
  const persist = useCallback((next: WatchlistItem[]) => {
    saveLocal(next);
    if (userId) {
      saveWatchlistToDb(userId, next).catch(() => {});
    }
  }, [userId]);

  const addItem = useCallback((item: WatchlistItem) => {
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) return prev;
      if (prev.some((i) => i.symbol === item.symbol)) return prev;
      const next = [...prev, item];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeItem = useCallback((symbol: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.symbol !== symbol);
      persist(next);
      return next;
    });
  }, [persist]);

  return { items, prices, loading, addItem, removeItem, isFull: items.length >= MAX_ITEMS };
}
```

## 8. types/ 전체 소스

### types/index.ts
```ts
export type Grade = "S" | "A" | "B" | "C" | "D" | "F" | null;

export type KimExpression = "neutral" | "shocked" | "smug" | "angry" | "pity";

export type Sector =
  | "이차전지"
  | "반도체"
  | "전력"
  | "AI"
  | "바이오"
  | "자동차"
  | "혼합"
  | "기타";

export interface PortfolioScores {
  diversification: number;
  returns: number;
  stability: number;
  momentum: number;
  risk_management: number;
}

export type AnalysisMode = "kim" | "makalong";

export interface AnalyzeRequest {
  imageBase64: string;
  mimeType: string;
  mode?: AnalysisMode;
}

export interface ChartPoint {
  x: number; // 이미지 너비 대비 % (0~100)
  y: number; // 이미지 높이 대비 % (0~100)
}

export interface ChartLine {
  type: "channel_top" | "channel_bottom" | "midline" | "support" | "resistance" | "trendline";
  label: string;
  points: ChartPoint[];
  style?: "solid" | "dashed";
}

export interface AnalyzeResponse {
  roast: string;
  analysis: string | null;
  grade: Grade;
  sector: Sector | null;
  scores: PortfolioScores | null;
  chartLines?: ChartLine[] | null;
  error?: string;
}

export interface StockNewsItem {
  title: string;
  url: string;
}

export interface StockRoastResult {
  news: StockNewsItem[];
}

// ── 빗각 차트 관련 타입 ──
export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockChartResponse {
  symbol: string;
  name: string;
  currency: string;
  candles: Candle[];
}

export type BitgakViewMode = "auto" | "bullish" | "bearish";

export interface BitgakLine {
  type: "channel_top" | "channel_bottom" | "midline" | "support_resistance" | "trend_line";
  label: string;
  style: "solid" | "dashed";
  color: string;
  opacity?: number;
  /** Array of {time, value} for lightweight-charts LineSeries */
  points: { time: number; value: number }[];
}

export interface BitgakPivot {
  index: number;
  time: number;
  price: number;
  type: "high" | "low";
}

export interface TechIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number; trend: "bullish" | "bearish" };
  bb: { upper: number; middle: number; lower: number; position: "above" | "inside" | "below" };
  ma5: number;
  ma20: number;
  ma60: number;
}

export interface AnalysisHistoryItem {
  symbol: string;
  name: string;
  date: string;
  channelDir: string;
  position: string;
  rsi: number;
}

export interface BitgakMeta {
  channelDirection: "상승" | "하락" | "횡보" | "판별불가";
  channelPosition: string | null;
  positionPercent: number | null;
  threeThree: { highsMet: boolean; highsCount: number; lowsMet: boolean; lowsCount: number };
  srFlips: string[];
  priceRange: { high: number; low: number; current: number; changePct: number };
  period: { start: string; end: string; candleCount: number };
}

export interface BitgakResult {
  highs: BitgakPivot[];
  lows: BitgakPivot[];
  lines: BitgakLine[];
  summary: string; // 데이터 요약 (Gemini에 넘길 텍스트)
  indicators?: TechIndicators;
  meta?: BitgakMeta;
}

export type ChartRange = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";

// ── 차트 업다운 게임 ──
export type GamePhase = "intro" | "loading" | "guessing" | "revealing" | "result" | "gameover";

export interface GameCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GameRound {
  roundId: string;
  visibleCandles: GameCandle[];
  hiddenCandles: GameCandle[];
  direction: "up" | "down";
  changePct: number;
  stockName: string;
  stockSymbol: string;
}

export interface ChartGameRankingEntry {
  userId: string;
  nickname: string;
  bestStreak: number;
  totalGames: number;
  totalCorrect: number;
  updatedAt: string;
}
export type ChartInterval = "1d" | "1wk" | "1mo";

// ── AI 추천 종목 ──
export interface RecommendedStock {
  symbol: string;
  name: string;
  reason: string;
}

// ── 백테스트 ──
export interface BacktestStock {
  symbol: string;
  name: string;
}

export interface BacktestResult {
  dailyValues: { date: string; value: number }[];
  kospiValues: { date: string; value: number }[];
  stockValues: Record<string, { date: string; value: number }[]>;
  totalReturnPct: number;
  maxDrawdownPct: number;
  cagrPct: number;
  kospiReturnPct: number;
  stockReturns: Record<string, number>;
  finalAmount: number;
}

// ── 수급 신호 스캐너 ──
export interface SignalStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  crossType: "5_20" | "20_60";
  crossDate: string;
  daysAfterCross: number;
  foreignNet: number;
  institutionNet: number;
  individualNet: number;
  foreignPct: number;
}

export interface SignalScanResponse {
  scannedAt: string;
  totalScanned: number;
  results: SignalStock[];
}

// ── 종목 분석실 ──
export interface StockBriefingResponse {
  briefing: string;
  verdict: string;
  riskLevel: "low" | "medium" | "high";
  keyPoints: string[];
}

export interface InvestorTrendDaily {
  date: string;
  foreign: number;
  institution: number;
  individual: number;
}

export interface InvestorTrendData {
  symbol: string;
  summary: { foreign: number; institution: number; individual: number };
  daily: InvestorTrendDaily[];
}

export interface SectorStock {
  symbol: string;
  name: string;
  industry: string;
}

export interface RoastState {
  imageBase64: string | null;
  mimeType: string | null;
  previewUrl: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  roast: string | null;
  analysis: string | null;
  scores: PortfolioScores | null;
  sector: Sector | null;
  chartLines: ChartLine[] | null;
  error: string | null;
  grade: Grade;
  kimExpression: KimExpression;
}

// ── 투자 RPG ──
export type RpgClassKey = "visionary" | "dealmaker" | "sage" | "strategist" | "hunter" | "observer" | "contrarian" | "explorer";
export type EquipmentGrade = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type EquipmentSlotKey = "weapon" | "armor" | "spellbook" | "accessory";

export interface RpgStats {
  attack: number;
  defense: number;
  intelligence: number;
  stamina: number;
  luck: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  emoji: string;
  grade: EquipmentGrade;
  baseBonus: Partial<RpgStats>;
  bonus: Partial<RpgStats>;
  enhanceLevel: number;
}

export interface BattleRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface BattleOpponent {
  class: RpgClassKey;
  className: string;
  emoji: string;
  nickname: string;
  level: number;
  stats: RpgStats;
  combatPower: number;
}

export type TurnType = "attack" | "intelligence" | "stamina" | "luck" | "final";

export interface TurnResult {
  turn: number;
  type: TurnType;
  label: string;
  playerDmg: number;
  opponentDmg: number;
  playerHp: number;
  opponentHp: number;
  isCritical: boolean;
  flavorText: string;
}

export interface BattleResult {
  turns: TurnResult[];
  winner: "player" | "opponent" | "draw";
  expReward: number;
  stoneReward: number;
}

export interface BattleHistoryEntry {
  date: string;
  winner: "player" | "opponent" | "draw";
  opponentClassName: string;
  opponentLevel: number;
  expReward: number;
  stoneReward: number;
}

export interface RpgCharacter {
  class: RpgClassKey;
  nickname: string;
  level: number;
  exp: number;
  stats: RpgStats;
  equipment: Record<EquipmentSlotKey, EquipmentItem | null>;
  stones: number;
  battleRecord: BattleRecord;
  achievements: string[];
  createdAt: string;
  updatedAt: string;
}
```

### types/kakao.d.ts
```ts
interface KakaoShareContent {
  title: string;
  description?: string;
  imageUrl?: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoShareButton {
  title: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoShareFeedParams {
  objectType: "feed";
  content: KakaoShareContent;
  buttons?: KakaoShareButton[];
}

interface KakaoShareUploadImageParams {
  file: File[];
}

interface KakaoShareUploadImageResult {
  infos: {
    original: { url: string; length: number; content_type: string; width: number; height: number };
  };
}

interface KakaoSDK {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(params: KakaoShareFeedParams): void;
    uploadImage(params: KakaoShareUploadImageParams): Promise<KakaoShareUploadImageResult>;
  };
}

interface Window {
  Kakao?: KakaoSDK;
}
```

### types/social.ts
```ts
// ── 초대코드 ──
export interface InviteCode {
  code: string;
  ownerId: string;
  ownerNickname: string;
  createdAt: string; // ISO
  usedCount: number;
}

export interface InviteRecord {
  inviteeId: string;
  inviterCode: string;
  inviterId: string;
  activated: boolean;
  rewardGranted: boolean;
  createdAt: string;
}

// ── 출석 ──
export interface DayReward {
  day: number; // 1~7
  exp: number;
  stones?: number;
  label: string;
}

export interface AttendanceData {
  currentDay: number; // 1~7
  lastCheckIn: string; // YYYY-MM-DD
  totalDays: number;
  checkedToday: boolean;
  history: string[]; // 최근 7일 날짜
}

// ── 커뮤니티 ──
export type MockPostCategory = "insight" | "question" | "brag" | "tip";
export type AdventurePostCategory = "char_brag" | "guide" | "battle_review" | "chat";
export type PostCategory = MockPostCategory | AdventurePostCategory;

export type BoardId = "community" | "adventure";

export const BOARD_COLLECTIONS: Record<BoardId, { posts: string; replies: string }> = {
  community: { posts: "community_posts", replies: "community_replies" },
  adventure: { posts: "adventure_posts", replies: "adventure_replies" },
};

// ── 스냅샷 ──
export interface PortfolioSnapshot {
  type: "portfolio";
  totalAsset: number;
  returnPct: number;
  holdings: { name: string; pct: number; pnlPct: number }[];
}

export interface CharacterSnapshot {
  type: "character";
  classEmoji: string;
  className: string;
  nickname: string;
  level: number;
  combatPower: number;
  equipment: { emoji: string; name: string; grade: string; enhanceLevel: number }[];
  battleRecord: { wins: number; losses: number; draws: number };
}

export type PostSnapshot = PortfolioSnapshot | CharacterSnapshot;

export interface CommunityReply {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface CommunityPostExtended {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
  category: PostCategory;
  likes: number;
  likedBy: string[];
  replyCount: number;
  snapshot?: PostSnapshot;
}
```

## 9. API 엔드포인트 목록 (firebase.json rewrites)

| Source Path | Function Name |
|---|---|
| `/api/analyze` | `analyze` |
| `/api/kospi-futures` | `kospiFutures` |
| `/api/kospi-futures-night-test` | `kospiFuturesNightTest` |
| `/api/stock-chart` | `stockChart` |
| `/api/stock-prices` | `stockPrices` |
| `/api/investor-profile` | `investorProfile` |
| `/api/stock-roast` | `stockRoast` |
| `/api/chart-game` | `chartGame` |
| `/api/stock-briefing` | `stockBriefing` |
| `/api/stock-search` | `stockSearch` |
| `/api/market` | `market` |
| `/api/investor-trend` | `investorTrend` |
| `/api/popular-stocks` | `popularStocks` |
| `/api/investor-recommend` | `investorRecommend` |
| `/api/signals` | `signalsScanner` |
| `/api/signal-scan` | `signalScan` |
| `/api/golden-history` | `goldenHistory` |
| `/api/ss-watchlist` | `ssWatchlist` |
| `/api/per-band` | `perBand` |
| `/api/commodity-prices` | `commodityPrices` |
| `/api/earnings-calendar` | `earningsCalendar` |
| `/api/bot-init` | `botInit` |
| `/api/bot-force-trade` | `botForceTrade` |
| `/api/save-push-token` | `savePushToken` |
| `/api/portfolio-analyze` | `portfolioAnalyze` |
| `/api/portfolio-ocr` | `portfolioOcr` |
| `/api/stock-earnings` | `stockEarnings` |

---

*Generated: 2026-03-25T12:35:57.696376*