"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  const handleNewVersion = useCallback(() => {
    setShow(true);
  }, []);

  useVersionCheck(handleNewVersion);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center px-4 py-2.5 bg-kim-red text-white text-xs font-mono shadow-lg"
        >
          <span className="mr-3">🔄 새 버전이 업데이트됐습니다</span>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded bg-white text-kim-red font-bold hover:bg-gray-100 transition-colors"
          >
            새로고침
          </button>
          <button
            onClick={() => setShow(false)}
            className="ml-2 px-2 py-1 rounded text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
