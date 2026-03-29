"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Holding } from "@/hooks/useMockPortfolio";
function fmt(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

interface OrderModalProps {
  stock: { symbol: string; name: string };
  price: number;
  type: "buy" | "sell";
  holding?: Holding;
  cash: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}

export function OrderModal({ stock, price, type, holding, cash, onConfirm, onClose }: OrderModalProps) {
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const isBuy = type === "buy";
  const maxQty = isBuy ? Math.floor(cash / price) : (holding?.qty ?? 0);

  const handleQuick = (pct: number) => {
    setQty(Math.max(1, Math.floor(maxQty * (pct / 100))));
    setError("");
  };

  const handleConfirm = () => {
    if (qty <= 0) { setError("수량을 입력하세요"); return; }
    if (isBuy && qty * price > cash) { setError("잔액이 부족합니다"); return; }
    if (!isBuy && qty > (holding?.qty ?? 0)) { setError("보유 수량 초과"); return; }
    onConfirm(qty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-base font-semibold mb-1">
          {stock.name} <span className={isBuy ? "text-red-400" : "text-blue-400"}>{isBuy ? "매수" : "매도"}</span>
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">현재가 {fmt(price)}원</p>

        <div className="mb-3">
          <label className="text-xs text-[var(--text-muted)] mb-1 block">수량</label>
          <input
            type="number"
            value={qty}
            min={1}
            max={maxQty}
            onChange={(e) => { setQty(Math.max(0, parseInt(e.target.value) || 0)); setError(""); }}
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="mb-4 flex gap-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handleQuick(pct)}
              className="flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-lg bg-[var(--bg-overlay)] p-3 text-sm">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>{isBuy ? "매수 금액" : "매도 금액"}</span>
            <span className="font-medium text-[var(--text-primary)]">{fmt(qty * price)}원</span>
          </div>
          {isBuy && (
            <div className="flex justify-between text-[var(--text-muted)] mt-1">
              <span>잔여 현금</span>
              <span>{fmt(cash - qty * price)}원</span>
            </div>
          )}
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleConfirm}
          className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
            isBuy ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isBuy ? "매수" : "매도"} 확인
        </button>
      </div>
    </div>
  );
}
