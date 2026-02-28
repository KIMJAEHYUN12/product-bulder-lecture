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
import { InvestorQuizModal } from "@/components/mock/InvestorQuizModal";
import { WebViewBanner } from "@/components/mock/WebViewBanner";
import { InvestorType } from "@/lib/investorQuiz";
import { LoginButton } from "@/components/mock/LoginButton";
import { useMockPortfolio, Holding } from "@/hooks/useMockPortfolio";
import { useAuth } from "@/hooks/useAuth";
import { upsertRanking } from "@/lib/rankingApi";

const STRATEGY_KEY = "ovision_strategy";
const NICKNAME_PREFIX = "ovision_rank_nick_";
const INVESTOR_TYPE_PREFIX = "ovision_investor_type_";

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
  const [showQuizModal, setShowQuizModal] = useState(false);
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

  // 투자 성향 로드 + 최초 로그인 시 퀴즈 자동 오픈
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`${INVESTOR_TYPE_PREFIX}${user.uid}`);
      if (saved) {
        try { setInvestorType(JSON.parse(saved)); } catch { /* ignore */ }
      } else {
        // 퀴즈 결과 없으면 자동으로 모달 오픈 (첫 로그인)
        setShowQuizModal(true);
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

  // 랭킹 자동 업데이트 (로그인 유저만)
  useEffect(() => {
    if (!user || !initialized) return;
    const key = `${Math.round(totalAsset)}_${returnPct.toFixed(2)}`;
    if (key === lastRankingUpdate.current) return;
    lastRankingUpdate.current = key;
    const displayNick = nickname || user.displayName || user.email || "익명";
    upsertRanking({
      userId: user.uid,
      nickname: displayNick,
      strategy,
      totalAsset,
      returnPct,
      updatedAt: new Date().toISOString().slice(0, 10),
      ...(investorType ? { investorType: `${investorType.emoji} ${investorType.name}` } : {}),
    })
      .then(() => setRankingRefresh((n) => n + 1))
      .catch(() => {});
  }, [totalAsset, returnPct, user, strategy, nickname, investorType, initialized]);

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

  function handleQuizComplete(result: InvestorType) {
    setInvestorType(result);
    if (user) {
      localStorage.setItem(`${INVESTOR_TYPE_PREFIX}${user.uid}`, JSON.stringify(result));
      // 랭킹에 투자 성향 즉시 반영
      const displayNick = nickname || user.displayName || user.email || "익명";
      upsertRanking({
        userId: user.uid,
        nickname: displayNick,
        strategy,
        totalAsset,
        returnPct,
        updatedAt: new Date().toISOString().slice(0, 10),
        investorType: `${result.emoji} ${result.name}`,
      })
        .then(() => setRankingRefresh((n) => n + 1))
        .catch(() => {});
    }
    showToast(`${result.emoji} ${result.name} 등록 완료!`);
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
                  <div className="text-[10px] text-gray-500">총 자산</div>
                  <div className="text-gray-900 dark:text-white font-bold">{fmt(Math.round(totalAsset))}원</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">수익률</div>
                  <div className={`font-bold ${returnPct > 0 ? "text-red-500 dark:text-red-400" : returnPct < 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-500"}`}>
                    {returnPct > 0 ? "+" : ""}{returnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">현금</div>
                  <div className="text-gray-600 dark:text-gray-300">{fmt(Math.round(portfolio.cash))}원</div>
                </div>
                <button
                  onClick={() => setShowStrategyModal(true)}
                  className="text-xs font-mono px-3 py-1.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
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
        <div className="mb-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-2 text-[11px] text-yellow-500/80 font-mono">
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
                {/* 투자 성향 퀴즈 버튼 */}
                {investorType ? (
                  <button
                    onClick={() => setShowQuizModal(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    <span className="text-indigo-600 dark:text-indigo-300">
                      {investorType.emoji} {investorType.name}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">다시하기</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowQuizModal(true)}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    🧠 내 투자 성향 분석하기
                  </button>
                )}
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
        <CommunityBoard user={user} nickname={nickname} />

        {/* 푸터 */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-center gap-4 text-[11px] text-gray-400 font-mono">
          <Link href="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">개인정보처리방침</Link>
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

      {/* 투자 성향 퀴즈 모달 */}
      {showQuizModal && (
        <InvestorQuizModal
          onComplete={handleQuizComplete}
          onClose={() => setShowQuizModal(false)}
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
