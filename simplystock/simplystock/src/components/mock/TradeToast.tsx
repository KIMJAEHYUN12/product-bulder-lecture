"use client";

import { useEffect } from "react";

interface TradeToastProps {
  message: string;
  type: "buy" | "sell";
  onDismiss: () => void;
}

export function TradeToast({ message, type, onDismiss }: TradeToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        type === "buy" ? "bg-red-500/90" : "bg-blue-500/90"
      }`}
    >
      {message}
    </div>
  );
}
