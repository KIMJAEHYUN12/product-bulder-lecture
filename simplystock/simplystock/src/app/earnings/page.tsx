"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { fetchEarnings } from "@/lib/api";
import type { EarningsItem } from "@/lib/api";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getBadge(reportName: string): { label: string; color: string } {
  if (reportName.includes("잠정")) return { label: "잠정", color: "bg-red-500/20 text-red-400" };
  if (reportName.includes("분기")) return { label: "분기", color: "bg-blue-500/20 text-blue-400" };
  if (reportName.includes("반기")) return { label: "반기", color: "bg-purple-500/20 text-purple-400" };
  if (reportName.includes("사업")) return { label: "사업", color: "bg-green-500/20 text-green-400" };
  return { label: "실적", color: "bg-gray-500/20 text-gray-400" };
}

/** "20260307" → "2026-03-07" 형태가 아닌, Date 파싱용 */
function parseReceiptDate(d: string): Date | null {
  if (!d || d.length !== 8) return null;
  return new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8));
}

function formatDayLabel(dateKey: string): string {
  const d = parseReceiptDate(dateKey);
  if (!d) return dateKey;
  const day = d.getDate();
  const dow = DAY_LABELS[d.getDay()];
  return `${d.getMonth() + 1}월 ${day}일 (${dow})`;
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings()
      .then((r) => setEarnings(r.earnings))
      .catch(() => setEarnings([]))
      .finally(() => setLoading(false));
  }, []);

  // receiptDate(YYYYMMDD) 별 그룹
  const byDate = useMemo(() => {
    const map = new Map<string, EarningsItem[]>();
    for (const e of earnings) {
      if (!e.receiptDate) continue;
      const arr = map.get(e.receiptDate) || [];
      arr.push(e);
      map.set(e.receiptDate, arr);
    }
    return map;
  }, [earnings]);

  // 해당 월 캘린더 그리드 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    // 앞쪽 빈칸
    for (let i = 0; i < startDow; i++) cells.push(null);
    // 날짜
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const dateKey = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}${mm}${dd}`;
  };

  const selectedItems = selectedDate ? (byDate.get(selectedDate) || []) : [];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <a
            href="/"
            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </a>
          <h1 className="text-sm font-semibold">실적 캘린더</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* 월 이동 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold">
            {year}년 {month + 1}월
          </h2>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : (
          <>
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className={`py-1.5 text-center text-[11px] font-medium ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[var(--text-muted)]"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-[var(--border-primary)] bg-[var(--border-primary)] overflow-hidden">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="bg-[var(--bg-secondary)] min-h-[48px]" />;
                }
                const key = dateKey(day);
                const count = byDate.get(key)?.length || 0;
                const isSelected = selectedDate === key;
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dow = (idx) % 7;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(isSelected ? null : count > 0 ? key : null)}
                    className={`relative flex flex-col items-center justify-start min-h-[48px] py-1.5 transition-colors ${
                      isSelected
                        ? "bg-indigo-500/20"
                        : count > 0
                          ? "bg-[var(--bg-secondary)] hover:bg-[var(--bg-overlay)] cursor-pointer"
                          : "bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <span
                      className={`text-xs leading-none ${
                        isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white font-semibold"
                          : dow === 0
                            ? "text-red-400"
                            : dow === 6
                              ? "text-blue-400"
                              : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {day}
                    </span>
                    {count > 0 && (
                      <div className="mt-1 flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        {count > 1 && (
                          <span className="text-[9px] text-indigo-400 font-medium">{count}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 선택된 날짜 공시 목록 */}
            {selectedDate && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                  {formatDayLabel(selectedDate)} — {selectedItems.length}건
                </h3>
                <div className="space-y-1.5">
                  {selectedItems.map((e) => {
                    const { label, color } = getBadge(e.reportName);
                    return (
                      <div
                        key={e.receiptNo}
                        className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2.5 hover:bg-[var(--bg-overlay)] transition-colors"
                      >
                        <a
                          href={`/?ticker=${encodeURIComponent(e.symbol)}&name=${encodeURIComponent(e.name)}`}
                          className="flex items-center gap-2 text-left min-w-0 flex-1"
                        >
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                            {e.name}
                          </span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
                            {label}
                          </span>
                        </a>
                        <a
                          href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${e.receiptNo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 ml-2 flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          원문
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 데이터 없는 경우 안내 */}
            {earnings.length === 0 && (
              <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
                최근 실적 공시 데이터가 없습니다
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
