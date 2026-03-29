"use client";

import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const LS_KEY = "ss-announce-dismissed";

export function AnnounceBanner() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [announceId, setAnnounceId] = useState("");

  useEffect(() => {
    getDoc(doc(db, "ss_config", "announce"))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const t = data.text || "";
        const id = data.id || "";
        if (!t) return;
        setText(t);
        setAnnounceId(id);
        const dismissed = localStorage.getItem(LS_KEY);
        if (dismissed !== id) {
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(LS_KEY, announceId);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 mt-2">
      <div className="flex items-start gap-2 rounded-lg border-l-4 border-indigo-500 bg-[var(--bg-overlay)] px-3 py-2.5">
        <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="flex-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          {text}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
