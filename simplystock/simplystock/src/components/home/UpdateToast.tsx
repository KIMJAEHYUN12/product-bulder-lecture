"use client";

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const LS_KEY = "ss-update-seen";

interface UpdateItem {
  id: string;
  title: string;
  createdAt: string;
}

export function UpdateToast() {
  const [visible, setVisible] = useState(false);
  const [latest, setLatest] = useState<UpdateItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [allItems, setAllItems] = useState<UpdateItem[]>([]);
  const [listLoaded, setListLoaded] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "ss_updates"),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    getDocs(q)
      .then((snap) => {
        if (snap.empty) return;
        const d = snap.docs[0];
        const data = d.data();
        const ts = data.createdAt?.toDate?.();
        const item: UpdateItem = {
          id: d.id,
          title: data.title || "",
          createdAt: ts ? ts.toLocaleDateString("ko-KR") : "-",
        };
        setLatest(item);
        const seen = localStorage.getItem(LS_KEY);
        if (seen !== d.id) {
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (latest) {
      localStorage.setItem(LS_KEY, latest.id);
    }
    setVisible(false);
  };

  const loadAll = async () => {
    if (listLoaded) return;
    try {
      const q = query(
        collection(db, "ss_updates"),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const snap = await getDocs(q);
      const items: UpdateItem[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt?.toDate?.();
        return {
          id: d.id,
          title: data.title || "",
          createdAt: ts ? ts.toLocaleDateString("ko-KR") : "-",
        };
      });
      setAllItems(items);
      setListLoaded(true);
    } catch {
      /* ignore */
    }
  };

  const handleOpenModal = () => {
    if (latest) {
      localStorage.setItem(LS_KEY, latest.id);
    }
    setVisible(false);
    setModalOpen(true);
    loadAll();
  };

  if (!visible && !modalOpen) return null;

  return (
    <>
      {/* 토스트 */}
      {visible && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm cursor-pointer"
          onClick={handleOpenModal}
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/30 bg-[var(--bg-secondary)] px-4 py-3 shadow-lg shadow-black/20">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <p className="flex-1 text-xs text-[var(--text-secondary)] leading-snug line-clamp-2">
              <span className="font-semibold text-indigo-400 mr-1">업데이트</span>
              {latest?.title}
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
      )}

      {/* 전체 목록 모달 */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">업데이트 내역</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {allItems.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">불러오는 중...</p>
            ) : (
              <ul className="space-y-2.5 max-h-80 overflow-y-auto">
                {allItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-3 py-2.5"
                  >
                    <p className="text-sm text-[var(--text-primary)] leading-snug">{item.title}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-faint)]">{item.createdAt}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
