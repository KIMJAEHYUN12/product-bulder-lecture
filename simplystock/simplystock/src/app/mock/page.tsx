"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, ArrowLeft, RotateCcw, Loader2, ChevronDown, ChevronUp, Share2, LogIn, LogOut, AlertTriangle, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareModal } from "@/components/ShareModal";
import { generateMockShareImage } from "@/lib/mockShareImage";
import { fetchStockPrices, searchStocks } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMockPortfolio } from "@/hooks/useMockPortfolio";
import { OrderModal } from "@/components/mock/OrderModal";
import { TradeToast } from "@/components/mock/TradeToast";
import { AssetSummaryBar } from "@/components/mock/AssetSummaryBar";
import { RankingBoard } from "@/components/mock/RankingBoard";
import { BotProfileModal } from "@/components/mock/BotProfileModal";
import { UserProfileModal } from "@/components/mock/UserProfileModal";
import { BotComparisonBanner } from "@/components/mock/BotComparisonBanner";
import { upsertRanking } from "@/lib/rankingApi";
import type { StockPrice, StockSearchResult } from "@/types";

function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

// 로그인 게이트
function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <a href="/" className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-semibold tracking-tight">SimplyStock</span>
          </a>
          <span className="text-sm text-[var(--text-muted)]">모의투자</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center px-4 pt-32">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
          <TrendingUp className="mx-auto mb-4 h-10 w-10 text-indigo-400" />
          <h2 className="text-xl font-bold mb-2">모의투자</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            로그인하면 포트폴리오가 클라우드에 저장되어<br />어디서든 이어서 투자할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Google로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

// 메인 모의투자 UI (로그인 후)
function MockContent({ userId }: { userId: string }) {
  const mock = useMockPortfolio(userId);
  const { user, signOut } = useAuth();
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [orderModal, setOrderModal] = useState<{
    stock: { symbol: string; name: string };
    price: number;
    type: "buy" | "sell";
  } | null>(null);
  const [showHoldings, setShowHoldings] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareImage, setShareImage] = useState<string | undefined>();
  const [rankingRefresh, setRankingRefresh] = useState(0);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [tradeToast, setTradeToast] = useState<{ message: string; type: "buy" | "sell" } | null>(null);
  const [stockQuery, setStockQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
  const [stockPriceLoading, setStockPriceLoading] = useState(false);
  const lastRankingUpdateRef = useRef(0);
  const orderJustPlacedRef = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const holdingsValue = Object.entries(mock.portfolio.holdings).reduce((sum, [symbol, h]) => {
      const px = prices[symbol]?.price ?? h.currentPrice;
      return sum + px * h.qty;
    }, 0);
    const total = mock.portfolio.cash + holdingsValue;
    const ret = ((total - 10_000_000) / 10_000_000) * 100;
    const img = await generateMockShareImage(total, mock.portfolio.cash, ret, mock.portfolio.holdings, prices);
    setShareImage(img);
    setShareOpen(true);
  };

  // 보유 종목 시세 로드
  const loadHeldPrices = useCallback(async () => {
    const heldSymbols = Object.keys(mock.portfolio.holdings);
    if (heldSymbols.length === 0) return;
    try {
      const data = await fetchStockPrices(heldSymbols);
      setPrices((prev) => ({ ...prev, ...data }));
    } catch {
      // silent
    }
  }, [mock.portfolio.holdings]);

  useEffect(() => {
    if (mock.initialized) loadHeldPrices();
  }, [mock.initialized, loadHeldPrices]);

  // 종목 검색 debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!stockQuery.trim() || justSelectedRef.current) {
      justSelectedRef.current = false;
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchStocks(stockQuery);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [stockQuery]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStockSelect = async (stock: StockSearchResult) => {
    setSelectedStock({ symbol: stock.symbol, name: stock.name });
    setStockQuery(stock.name);
    justSelectedRef.current = true;
    setShowDropdown(false);
    setSearchResults([]);
    setStockPriceLoading(true);
    try {
      const data = await fetchStockPrices([stock.symbol]);
      const px = data[stock.symbol];
      if (px) {
        setStockPrice(px);
        setPrices((prev) => ({ ...prev, [stock.symbol]: px }));
      } else {
        setStockPrice(null);
      }
    } catch {
      setStockPrice(null);
    } finally {
      setStockPriceLoading(false);
    }
  };

  const handleSearchOrder = (type: "buy" | "sell") => {
    if (!selectedStock || !stockPrice) return;
    setOrderModal({ stock: selectedStock, price: Math.round(stockPrice.price), type });
  };

  const confirmOrder = (qty: number) => {
    if (!orderModal) return;
    try {
      mock.placeOrder(orderModal.stock.symbol, orderModal.stock.name, orderModal.type, qty, orderModal.price);
      orderJustPlacedRef.current = true;
      const action = orderModal.type === "buy" ? "매수" : "매도";
      setTradeToast({ message: `${orderModal.stock.name} ${qty}주 ${action} 완료`, type: orderModal.type });
      setOrderModal(null);
    } catch {
      // silent
    }
  };

  const holdingsValue = Object.entries(mock.portfolio.holdings).reduce((sum, [symbol, h]) => {
    const px = prices[symbol]?.price ?? h.currentPrice;
    return sum + px * h.qty;
  }, 0);
  const totalAsset = mock.portfolio.cash + holdingsValue;
  const returnPct = ((totalAsset - 10_000_000) / 10_000_000) * 100;

  // 랭킹 자동 업데이트 (60초 스로틀, 매매 직후에는 즉시)
  useEffect(() => {
    if (!mock.initialized) return;
    const now = Date.now();
    const elapsed = now - lastRankingUpdateRef.current;
    const immediate = orderJustPlacedRef.current;
    if (immediate) orderJustPlacedRef.current = false;
    if (!immediate && elapsed < 60_000) return;
    lastRankingUpdateRef.current = now;
    upsertRanking({
      userId,
      nickname: user?.displayName || "익명",
      totalAsset,
      returnPct,
      updatedAt: new Date().toISOString().slice(0, 10),
    })
      .then(() => setRankingRefresh((n) => n + 1))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAsset, returnPct, mock.initialized]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <a href="/" className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-semibold tracking-tight">SimplyStock</span>
          </a>
          <span className="text-sm text-[var(--text-muted)]">모의투자</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (confirm("포트폴리오를 초기화하시겠습니까?")) mock.resetPortfolio(); }}
              className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                )}
                <span className="hidden sm:inline text-sm text-[var(--text-secondary)] max-w-[100px] truncate">
                  {user.displayName}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 모바일 자산 요약 sticky 바 */}
      {mock.initialized && (
        <AssetSummaryBar totalAsset={totalAsset} returnPct={returnPct} cash={mock.portfolio.cash} />
      )}

      <main className="mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-6">
        {/* AI 봇 비교 배너 (모바일에서도 상단) */}
        <div className="mb-4">
          <BotComparisonBanner myReturnPct={returnPct} />
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* 종목 리스트 (2col) */}
          <div className="lg:col-span-2">
            {/* 종목 검색 */}
            <div className="mb-4 relative" ref={dropdownRef}>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  placeholder="종목명 또는 심볼 검색"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                />
                {stockQuery && (
                  <button
                    type="button"
                    onClick={() => { setStockQuery(""); setSearchResults([]); setShowDropdown(false); setSelectedStock(null); setStockPrice(null); }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-xl">
                  {searchResults.map((r) => (
                    <button
                      key={r.symbol}
                      type="button"
                      onClick={() => handleStockSelect(r)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium">{r.name}</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)] font-mono">{r.symbol}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{r.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 선택된 종목 카드 */}
            {selectedStock ? (
              <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{selectedStock.name}</span>
                      {mock.portfolio.holdings[selectedStock.symbol] && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                          {mock.portfolio.holdings[selectedStock.symbol].qty}주 보유
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{selectedStock.symbol}</span>
                  </div>
                  <div className="text-right">
                    {stockPriceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                    ) : stockPrice ? (
                      <>
                        <div className="text-lg font-bold font-mono">{fmt(Math.round(stockPrice.price))}</div>
                        <div className={`text-xs font-mono ${stockPrice.changePct > 0 ? "text-red-400" : stockPrice.changePct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                          {stockPrice.changePct > 0 ? "+" : ""}{stockPrice.changePct.toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">시세 없음</span>
                    )}
                  </div>
                </div>
                {stockPrice && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleSearchOrder("buy")}
                      className="flex-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 py-2 text-sm font-semibold transition-colors"
                    >
                      매수
                    </button>
                    <button
                      type="button"
                      disabled={!mock.portfolio.holdings[selectedStock.symbol]}
                      onClick={() => handleSearchOrder("sell")}
                      className="flex-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 py-2 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      매도
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-overlay)]/50 p-6 mb-4 text-center">
                <Search className="mx-auto h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm text-[var(--text-muted)]">종목을 검색해서 매수·매도하세요</p>
              </div>
            )}
          </div>

          {/* 포트폴리오 사이드바 (1col) */}
          <div className="mt-6 lg:mt-0">
            {/* 요약 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">포트폴리오</h3>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  <Share2 className="h-3 w-3" />
                  공유
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">총 자산</span>
                  <span className="font-bold">{fmt(totalAsset)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">현금</span>
                  <span>{fmt(mock.portfolio.cash)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">평가 금액</span>
                  <span>{fmt(holdingsValue)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">수익률</span>
                  <span className={`font-medium ${returnPct >= 0 ? "text-red-400" : "text-blue-400"}`}>
                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-[var(--text-faint)] leading-relaxed">
                시세는 실시간 조회 기준이며, 매일 18시에 종가로 정산됩니다.
              </p>
            </div>

            {/* 보유 종목 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] mb-4">
              <button
                type="button"
                onClick={() => setShowHoldings((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-sm font-semibold"
              >
                보유 종목 ({Object.keys(mock.portfolio.holdings).length})
                {showHoldings ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
              </button>
              {showHoldings && (
                <div className="border-t border-[var(--border-secondary)] p-3 space-y-2">
                  {Object.keys(mock.portfolio.holdings).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-2 text-center">보유 종목이 없습니다</p>
                  ) : (
                    Object.entries(mock.portfolio.holdings).map(([symbol, h]) => {
                      const px = prices[symbol]?.price ?? h.currentPrice;
                      const pnl = ((px - h.avgPrice) / h.avgPrice) * 100;
                      return (
                        <div key={symbol} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{h.name}</span>
                            <span className="text-xs text-[var(--text-muted)] ml-1">{h.qty}주</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-[var(--text-muted)]">평균 {fmt(h.avgPrice)}</div>
                            <div className={`text-xs font-medium ${pnl >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 거래 내역 */}
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] mb-4">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-sm font-semibold"
              >
                거래 내역 ({mock.portfolio.history?.length ?? 0})
                {showHistory ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
              </button>
              {showHistory && (
                <div className="border-t border-[var(--border-secondary)] p-3 space-y-2 max-h-64 overflow-y-auto">
                  {(mock.portfolio.history?.length ?? 0) === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-2 text-center">거래 내역이 없습니다</p>
                  ) : (
                    [...(mock.portfolio.history ?? [])].reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${h.type === "buy" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                            {h.type === "buy" ? "매수" : "매도"}
                          </span>
                          <span className="text-[var(--text-secondary)]">{h.name}</span>
                        </div>
                        <div className="text-right text-[var(--text-muted)]">
                          <span>{h.qty}주 @ {fmt(h.price)}</span>
                          <span className="ml-2">{h.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 랭킹보드 */}
            <RankingBoard myUserId={userId} refreshTrigger={rankingRefresh} onBotClick={setSelectedBot} onUserClick={setSelectedUser} />
          </div>
        </div>
      </main>

      {/* 주문 모달 */}
      {orderModal && (
        <OrderModal
          stock={orderModal.stock}
          price={orderModal.price}
          type={orderModal.type}
          holding={mock.portfolio.holdings[orderModal.stock.symbol]}
          cash={mock.portfolio.cash}
          onConfirm={confirmOrder}
          onClose={() => setOrderModal(null)}
        />
      )}

      {/* 매매 완료 토스트 */}
      {tradeToast && (
        <TradeToast
          message={tradeToast.message}
          type={tradeToast.type}
          onDismiss={() => setTradeToast(null)}
        />
      )}

      {mock.saveFailed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-amber-600/90 px-4 py-2 text-sm text-white shadow-lg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          저장에 실패했습니다. 네트워크를 확인해주세요.
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareImage(undefined); }}
        imageDataUrl={shareImage}
        shareText={`[SimplyStock 모의투자] 총자산 ${fmt(totalAsset)}원 (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%)`}
        shareUrl="https://simplystock.co.kr/mock"
        imageFileName="simplystock-mock.png"
        kakaoTitle="모의투자 성적표"
        kakaoDescription={`총자산 ${fmt(totalAsset)}원 (${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%)`}
        kakaoButtonTitle="나도 모의투자하기"
      />

      {selectedBot && (
        <BotProfileModal botId={selectedBot} onClose={() => setSelectedBot(null)} />
      )}

      {selectedUser && (
        <UserProfileModal userId={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

export default function MockPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginGate onLogin={signInWithGoogle} />;
  }

  return <MockContent userId={user.uid} />;
}
