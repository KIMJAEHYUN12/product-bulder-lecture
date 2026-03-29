"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastItem {
  id: number;
  exp: number;
  label: string;
  type: "exp" | "stone";
}

let nextId = 0;

export function ExpToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleExpGranted = useCallback((e: Event) => {
    const { exp, label } = (e as CustomEvent).detail;
    if (!exp || exp <= 0) return;

    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, exp, label, type: "exp" }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const handleStoneGranted = useCallback((e: Event) => {
    const { amount, label } = (e as CustomEvent).detail;
    if (!amount || amount <= 0) return;

    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, exp: amount, label, type: "stone" }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  useEffect(() => {
    window.addEventListener("ovision-exp-granted", handleExpGranted);
    window.addEventListener("ovision-stone-granted", handleStoneGranted);
    return () => {
      window.removeEventListener("ovision-exp-granted", handleExpGranted);
      window.removeEventListener("ovision-stone-granted", handleStoneGranted);
    };
  }, [handleExpGranted, handleStoneGranted]);

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="px-4 py-2 rounded-xl bg-indigo-600/90 backdrop-blur border border-indigo-400/30 shadow-lg shadow-indigo-900/40"
          >
            <div className="flex items-center gap-2">
              {t.type === "stone" ? (
                <>
                  <span className="text-indigo-300 text-sm font-black">+{t.exp}</span>
                  <span className="text-white/80 text-xs font-mono">투자석</span>
                </>
              ) : (
                <>
                  <span className="text-amber-300 text-sm font-black">+{t.exp}</span>
                  <span className="text-white/80 text-xs font-mono">EXP</span>
                </>
              )}
              <span className="text-white/50 text-[10px] font-mono">{t.label}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
