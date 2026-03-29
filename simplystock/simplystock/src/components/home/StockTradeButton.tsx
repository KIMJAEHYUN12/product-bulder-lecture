"use client";

import { useState, useCallback } from "react";
import { LogIn } from "lucide-react";
import { useMockPortfolio } from "@/hooks/useMockPortfolio";
import { fetchStockPrices } from "@/lib/api";
import { OrderModal } from "@/components/mock/OrderModal";
import { TradeToast } from "@/components/mock/TradeToast";

interface StockTradeButtonProps {
  symbol: string;
  name: string;
  userId: string | null;
  onSignIn: () => void;
}

export function StockTradeButton({ symbol, name, userId, onSignIn }: StockTradeButtonProps) {
  const mock = useMockPortfolio(userId);
  const [orderModal, setOrderModal] = useState<{ type: "buy" | "sell"; price: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "buy" | "sell" } | null>(null);
  const [loading, setLoading] = useState(false);

  const holding = mock?.portfolio.holdings[symbol];

  const openOrder = useCallback(async (type: "buy" | "sell") => {
    setLoading(true);
    try {
      const data = await fetchStockPrices([symbol]);
      const px = data[symbol];
      if (!px) return;
      setOrderModal({ type, price: Math.round(px.price) });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const confirmOrder = (qty: number) => {
    if (!orderModal || !mock) return;
    try {
      mock.placeOrder(symbol, name, orderModal.type, qty, orderModal.price);
      const action = orderModal.type === "buy" ? "매수" : "매도";
      setToast({ message: `${name} ${qty}주 ${action} 완료`, type: orderModal.type });
      setOrderModal(null);
    } catch {
      // silent
    }
  };

  if (!userId) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
      >
        <LogIn className="h-3.5 w-3.5" />
        로그인하고 모의투자
      </button>
    );
  }

  if (!mock?.initialized) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => openOrder("buy")}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          모의 매수
        </button>
        {holding && (
          <button
            type="button"
            disabled={loading}
            onClick={() => openOrder("sell")}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
          >
            모의 매도
          </button>
        )}
        {holding && (
          <span className="text-[10px] text-[var(--text-muted)]">
            보유 {holding.qty}주
          </span>
        )}
      </div>

      {orderModal && mock && (
        <OrderModal
          stock={{ symbol, name }}
          price={orderModal.price}
          type={orderModal.type}
          holding={holding}
          cash={mock.portfolio.cash}
          onConfirm={confirmOrder}
          onClose={() => setOrderModal(null)}
        />
      )}

      {toast && (
        <TradeToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
