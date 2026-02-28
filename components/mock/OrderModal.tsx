"use client";

import { useState } from "react";
import { StockInfo } from "./StockList";
import { Holding } from "@/hooks/useMockPortfolio";

interface OrderModalProps {
  stock: StockInfo;
  type: "buy" | "sell";
  currentPrice: number;
  cash: number;
  holding: Holding | null;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export function OrderModal({
  stock,
  type,
  currentPrice,
  cash,
  holding,
  onConfirm,
  onClose,
}: OrderModalProps) {
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  const price = Math.round(currentPrice);
  const total = price * qty;
  const maxBuy = Math.floor(cash / price);
  const maxSell = holding?.qty ?? 0;
  const max = type === "buy" ? maxBuy : maxSell;

  function handleConfirm() {
    if (qty <= 0) { setError("수량을 입력하세요."); return; }
    if (qty > max) {
      setError(type === "buy" ? "잔액이 부족합니다." : "보유 수량이 부족합니다.");
      return;
    }
    onConfirm(qty);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-gray-900 border border-white/15 rounded-xl p-6 w-full max-w-[320px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded mr-2 ${
                type === "buy"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {type === "buy" ? "매수" : "매도"}
            </span>
            <span className="text-sm font-bold text-white">{stock.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Price info */}
        <div className="bg-white/5 rounded-lg p-3 mb-4 space-y-1.5 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">현재가</span>
            <span className="text-white font-bold">{fmt(price)}원</span>
          </div>
          {type === "buy" && (
            <div className="flex justify-between">
              <span className="text-gray-400">보유 현금</span>
              <span className="text-white">{fmt(cash)}원</span>
            </div>
          )}
          {type === "sell" && holding && (
            <div className="flex justify-between">
              <span className="text-gray-400">평균 단가</span>
              <span className="text-white">{fmt(holding.avgPrice)}원</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">최대 {type === "buy" ? "매수" : "매도"}</span>
            <span className="text-white">{fmt(max)}주</span>
          </div>
        </div>

        {/* Qty input */}
        <div className="mb-4">
          <label className="block text-xs text-gray-400 font-mono mb-1">수량</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={max}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setQty(Math.max(1, Math.min(max, v)));
              }}
              className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-center text-white font-mono text-sm focus:outline-none focus:border-white/40"
            />
            <button
              onClick={() => setQty((q) => Math.min(max, q + 1))}
              className="w-8 h-8 rounded bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
          {/* Quick buttons */}
          <div className="flex gap-1 mt-2">
            {[0.25, 0.5, 1].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setQty(Math.max(1, Math.floor(max * ratio)))}
                className="flex-1 text-[11px] font-mono py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
              >
                {ratio === 1 ? "최대" : `${ratio * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between text-sm font-mono mb-4 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-gray-400">주문 금액</span>
          <span className={`font-bold ${type === "buy" ? "text-red-300" : "text-blue-300"}`}>
            {fmt(total)}원
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-mono mb-3 text-center">{error}</p>
        )}

        <div className="text-[10px] text-gray-600 font-mono text-center mb-3">
          ※ 현재가로 즉시 체결됩니다
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm font-mono border border-white/10 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2 rounded-lg text-white text-sm font-mono font-bold transition-colors ${
              type === "buy"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {type === "buy" ? "매수" : "매도"}
          </button>
        </div>
      </div>
    </div>
  );
}
