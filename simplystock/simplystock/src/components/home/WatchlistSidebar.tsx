"use client";

import { useState, useRef, useCallback } from "react";
import { Star, X, Plus, GripVertical, FolderPlus, Pencil, Trash2, Folder } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WatchlistItem, WatchlistFolder, SignalEntry, GoldenSignalEntry, BSSignalEntry } from "@/lib/api";
import type { StockPrice } from "@/types";

const QUICK_ADD_STOCKS = [
  { symbol: "005930.KS", name: "삼성전자" },
  { symbol: "000660.KS", name: "SK하이닉스" },
  { symbol: "005380.KS", name: "현대차" },
];

function channelLabel(pct: number): string {
  if (pct <= -50) return "채널 하단 (크게 이탈)";
  if (pct <= -10) return "채널 하단 (저평가 구간)";
  if (pct <= 30) return "채널 중단";
  if (pct <= 70) return "채널 상단 (과열 주의)";
  return "채널 상단 (크게 돌파)";
}

interface WatchlistSidebarProps {
  watchlist: WatchlistItem[];
  watchlistLoading: boolean;
  selectedSymbol: string;
  onSelectStock: (stock: { symbol: string; name: string; exchange: string; type: string }) => void;
  onRemove: (symbol: string, name: string, e?: React.MouseEvent) => void;
  onRename?: (symbol: string, customName: string) => void;
  onReorder?: (symbols: string[]) => void;
  variant: "mobile" | "desktop";
  prices?: Record<string, StockPrice>;
  onQuickAdd?: () => void;
  signals?: SignalEntry[];
  goldenSignals?: GoldenSignalEntry[];
  bsSignals?: BSSignalEntry[];
  folders?: WatchlistFolder[];
  onManageFolders?: (folders: WatchlistFolder[]) => void;
  onSetFolder?: (symbol: string, folderId: string | null) => void;
}

function SignalBadges({
  symbol,
  signals,
  goldenSignals,
  bsSignals,
}: {
  symbol: string;
  signals?: SignalEntry[];
  goldenSignals?: GoldenSignalEntry[];
  bsSignals?: BSSignalEntry[];
}) {
  const hasSupply = signals?.some((s) => s.symbol === symbol);
  const hasGolden = goldenSignals?.some((g) => g.symbol === symbol);
  const bs = bsSignals?.find((b) => b.symbol === symbol);

  if (!hasSupply && !hasGolden && !bs) return null;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
      {hasSupply && (
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" title="수급 신호" />
      )}
      {hasGolden && (
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="골든크로스" />
      )}
      {bs?.signalType === "buy" && (
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" title="BUY 신호" />
      )}
      {bs?.signalType === "sell" && (
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" title="SELL 신호" />
      )}
    </span>
  );
}

// ── 드래그 가능한 종목 아이템 ──
function SortableStockItem({
  w,
  selectedSymbol,
  editingSymbol,
  editValue,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onStartEdit,
  onClick,
  onRemove,
  priceLine,
  channelLine,
  signals,
  goldenSignals,
  bsSignals,
  compact,
  folders,
  onSetFolder,
}: {
  w: WatchlistItem;
  selectedSymbol: string;
  editingSymbol: string | null;
  editValue: string;
  onEditChange: (v: string) => void;
  onCommitEdit: (symbol: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (w: WatchlistItem) => void;
  onClick: (w: WatchlistItem) => void;
  onRemove: (symbol: string, name: string, e?: React.MouseEvent) => void;
  priceLine: React.ReactNode;
  channelLine: React.ReactNode;
  signals?: SignalEntry[];
  goldenSignals?: GoldenSignalEntry[];
  bsSignals?: BSSignalEntry[];
  compact?: boolean;
  folders?: WatchlistFolder[];
  onSetFolder?: (symbol: string, folderId: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: w.symbol });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const maxNameW = compact ? "max-w-[100px]" : "max-w-[120px]";

  return (
    <li ref={setNodeRef} style={style} className="group">
      <div
        className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--bg-overlay)] ${
          selectedSymbol === w.symbol
            ? "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            : "text-[var(--text-secondary)]"
        }`}
      >
        {/* 드래그 핸들 */}
        <button
          type="button"
          className="shrink-0 mr-1 cursor-grab active:cursor-grabbing text-[var(--text-faint)] hover:text-[var(--text-muted)] touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* 메인 클릭 영역 */}
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => onClick(w)}
        >
          <div className="flex items-center">
            {editingSymbol === w.symbol ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitEdit(w.symbol);
                  if (e.key === "Escape") onCancelEdit();
                }}
                onBlur={() => onCommitEdit(w.symbol)}
                onClick={(e) => e.stopPropagation()}
                className={`${maxNameW} bg-[var(--bg-overlay)] border border-indigo-500/50 rounded px-1 py-0 text-sm text-[var(--text-primary)] outline-none`}
              />
            ) : (
              <span
                className={`truncate ${maxNameW} cursor-default`}
                onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(w); }}
                onTouchStart={() => { longPressTimer.current = setTimeout(() => onStartEdit(w), 500); }}
                onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              >
                {w.customName || w.name}
              </span>
            )}
            <SignalBadges
              symbol={w.symbol}
              signals={signals}
              goldenSignals={goldenSignals}
              bsSignals={bsSignals}
            />
          </div>
          {priceLine}
          {channelLine}
        </button>

        {/* 폴더 + 삭제 */}
        <div className="flex items-center shrink-0 ml-1 gap-0.5">
          {folders && folders.length > 0 && onSetFolder && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(!folderMenuOpen); }}
                className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[var(--text-faint)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                title="폴더 이동"
              >
                <Folder className="h-3 w-3" />
                {w.folderId && (
                  <span className="text-[9px] text-indigo-400 max-w-[40px] truncate">
                    {folders.find((f) => f.id === w.folderId)?.name}
                  </span>
                )}
              </button>
              {folderMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg py-1 min-w-[100px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => { onSetFolder(w.symbol, null); setFolderMenuOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-overlay)] ${!w.folderId ? "text-indigo-400 font-medium" : "text-[var(--text-secondary)]"}`}
                  >
                    전체
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { onSetFolder(w.symbol, f.id); setFolderMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-overlay)] ${w.folderId === f.id ? "text-indigo-400 font-medium" : "text-[var(--text-secondary)]"}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => onRemove(w.symbol, w.name, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-red-400 p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ── 폴더 탭 ──
function FolderTabs({
  folders,
  activeFolder,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: {
  folders: WatchlistFolder[];
  activeFolder: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (folder: WatchlistFolder) => void;
  onDelete: (folder: WatchlistFolder) => void;
}) {
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allFolders = [{ id: "all", name: "전체", order: -1 }, ...folders];

  const handleXDelete = (f: WatchlistFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`'${f.name}' 폴더를 삭제하시겠습니까? 소속 종목은 전체로 이동됩니다.`)) {
      onDelete(f);
    }
  };

  const handleLongPressDelete = (f: WatchlistFolder) => {
    if (confirm(`'${f.name}' 폴더를 삭제하시겠습니까? 소속 종목은 전체로 이동됩니다.`)) {
      onDelete(f);
    }
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide mb-2 -mx-1 px-1">
      {allFolders.map((f) => (
        <div key={f.id} className="relative shrink-0 group/folder">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => { setContextMenu(null); onSelect(f.id); }}
              onContextMenu={(e) => {
                if (f.id === "all") return;
                e.preventDefault();
                setContextMenu(contextMenu === f.id ? null : f.id);
              }}
              onTouchStart={() => {
                if (f.id === "all") return;
                longPressRef.current = setTimeout(() => handleLongPressDelete(f as WatchlistFolder), 500);
              }}
              onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
              onTouchMove={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                f.id !== "all" ? "pr-1" : ""
              } ${
                activeFolder === f.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
              }`}
            >
              {f.name}
            </button>
            {f.id !== "all" && (
              <button
                type="button"
                onClick={(e) => handleXDelete(f as WatchlistFolder, e)}
                className="opacity-0 group-hover/folder:opacity-100 transition-opacity -ml-1 mr-1 p-0.5 text-[var(--text-faint)] hover:text-red-400"
                title="폴더 삭제"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {contextMenu === f.id && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg py-1 min-w-[100px]">
              <button
                type="button"
                onClick={() => { setContextMenu(null); onEdit(f); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
              >
                <Pencil className="h-3 w-3" /> 이름 변경
              </button>
              <button
                type="button"
                onClick={() => { setContextMenu(null); onDelete(f); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-[var(--bg-overlay)]"
              >
                <Trash2 className="h-3 w-3" /> 삭제
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] text-[var(--text-faint)] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
      >
        <FolderPlus className="h-3 w-3" /> 추가
      </button>
    </div>
  );
}

// ── 폴더 이름 입력 모달 ──
function FolderNameModal({
  open,
  initialValue,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  initialValue: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-[280px] rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)] p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium text-[var(--text-primary)]">폴더 이름</div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            if (e.key === "Escape") onCancel();
          }}
          maxLength={20}
          placeholder="예: 반도체, 배당주"
          className="w-full rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-overlay)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
            className="flex-1 rounded-lg bg-indigo-500/20 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──
export function WatchlistSidebar({
  watchlist,
  watchlistLoading,
  selectedSymbol,
  onSelectStock,
  onRemove,
  onRename,
  onReorder,
  variant,
  prices,
  onQuickAdd,
  signals,
  goldenSignals,
  bsSignals,
  folders = [],
  onManageFolders,
  onSetFolder,
}: WatchlistSidebarProps) {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeFolder, setActiveFolder] = useState("all");
  const [folderModal, setFolderModal] = useState<{ mode: "add" | "edit"; folder?: WatchlistFolder } | null>(null);

  // dnd-kit 센서: 포인터 + 터치
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const startEdit = useCallback((w: WatchlistItem) => {
    setEditingSymbol(w.symbol);
    setEditValue(w.customName || w.name);
  }, []);

  const commitEdit = useCallback((symbol: string) => {
    const trimmed = editValue.trim();
    setEditingSymbol(null);
    if (onRename) {
      const item = watchlist.find((w) => w.symbol === symbol);
      if (!item) return;
      if (trimmed && trimmed !== item.name) {
        onRename(symbol, trimmed);
      } else if (!trimmed || trimmed === item.name) {
        onRename(symbol, "");
      }
    }
  }, [editValue, onRename, watchlist]);

  const cancelEdit = useCallback(() => {
    setEditingSymbol(null);
  }, []);

  const handleClick = (w: WatchlistItem) => {
    onSelectStock({ symbol: w.symbol, name: w.name, exchange: "", type: "equity" });
  };

  const getSignalPosition = (symbol: string): number | null => {
    const sig = signals?.find((s) => s.symbol === symbol);
    return sig ? sig.positionPct : null;
  };

  const getEffectiveChangePct = (symbol: string, pricePct: number | undefined): number | null => {
    if (pricePct !== undefined && pricePct !== 0) return pricePct;
    const sig = signals?.find((s) => s.symbol === symbol);
    if (sig) return sig.changeRate;
    return pricePct ?? null;
  };

  // 폴더 필터
  const filteredList = activeFolder === "all"
    ? watchlist
    : watchlist.filter((w) => w.folderId === activeFolder);

  // 드래그 종료
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredList.findIndex((w) => w.symbol === active.id);
    const newIndex = filteredList.findIndex((w) => w.symbol === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredList, oldIndex, newIndex);

    if (activeFolder === "all") {
      onReorder?.(reordered.map((w) => w.symbol));
    } else {
      // 폴더 내 순서 변경: 전체 목록에서 이 폴더 항목의 위치를 재배치
      const otherItems = watchlist.filter((w) => w.folderId !== activeFolder);
      const newAll = [...otherItems, ...reordered];
      onReorder?.(newAll.map((w) => w.symbol));
    }
  }, [filteredList, activeFolder, watchlist, onReorder]);

  // 폴더 관리
  const handleAddFolder = useCallback(() => {
    setFolderModal({ mode: "add" });
  }, []);

  const handleEditFolder = useCallback((folder: WatchlistFolder) => {
    setFolderModal({ mode: "edit", folder });
  }, []);

  const handleDeleteFolder = useCallback((folder: WatchlistFolder) => {
    if (!onManageFolders || !onSetFolder) return;
    // 해당 폴더의 종목은 전체로 이동
    watchlist.filter((w) => w.folderId === folder.id).forEach((w) => {
      onSetFolder(w.symbol, null);
    });
    const updated = folders.filter((f) => f.id !== folder.id);
    onManageFolders(updated);
    if (activeFolder === folder.id) setActiveFolder("all");
  }, [folders, watchlist, activeFolder, onManageFolders, onSetFolder]);

  const handleFolderModalConfirm = useCallback((name: string) => {
    if (!onManageFolders) return;
    if (folderModal?.mode === "add") {
      const newId = `folder_${Date.now()}`;
      const maxOrder = folders.reduce((m, f) => Math.max(m, f.order), 0);
      onManageFolders([...folders, { id: newId, name, order: maxOrder + 1 }]);
    } else if (folderModal?.mode === "edit" && folderModal.folder) {
      const updated = folders.map((f) =>
        f.id === folderModal.folder!.id ? { ...f, name } : f
      );
      onManageFolders(updated);
    }
    setFolderModal(null);
  }, [folderModal, folders, onManageFolders]);

  const emptyState = (
    <div>
      <p className="text-xs text-[var(--text-faint)] leading-relaxed">
        종목명 옆 별 버튼으로 관심종목을 추가하세요
      </p>
      {onQuickAdd && (
        <button
          type="button"
          onClick={onQuickAdd}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors w-full justify-center"
        >
          <Plus className="h-3.5 w-3.5" />
          인기종목 바로 추가
        </button>
      )}
    </div>
  );

  const renderList = (compact?: boolean) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredList.map((w) => w.symbol)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0.5">
          {filteredList.map((w) => {
            const p = prices?.[w.symbol];
            const posPct = getSignalPosition(w.symbol);
            const ePct = getEffectiveChangePct(w.symbol, p?.changePct);

            const priceLine = compact && p ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {p.price.toLocaleString()}{p.currency === "KRW" ? "원" : ""}
                </span>
                {ePct !== null && ePct !== 0 && (
                  <span className={`text-[11px] font-medium ${ePct > 0 ? "text-red-400" : ePct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                    {ePct > 0 ? "+" : ""}{ePct.toFixed(2)}%
                  </span>
                )}
              </div>
            ) : !compact && ePct !== null && ePct !== 0 ? (
              <span className={`text-xs font-medium ${ePct > 0 ? "text-red-400" : ePct < 0 ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                {ePct > 0 ? "+" : ""}{ePct.toFixed(2)}%
              </span>
            ) : null;

            const channelLine = posPct !== null ? (
              <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                {channelLabel(posPct)}
              </div>
            ) : null;

            return (
              <SortableStockItem
                key={w.symbol}
                w={w}
                selectedSymbol={selectedSymbol}
                editingSymbol={editingSymbol}
                editValue={editValue}
                onEditChange={setEditValue}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onStartEdit={startEdit}
                onClick={handleClick}
                onRemove={onRemove}
                priceLine={priceLine}
                channelLine={channelLine}
                signals={signals}
                goldenSignals={goldenSignals}
                bsSignals={bsSignals}
                compact={compact}
                folders={folders}
                onSetFolder={onSetFolder}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );

  if (variant === "mobile") {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
          <Star className="h-3 w-3 text-amber-400" />
          관심종목
          {watchlist.length > 0 && (
            <span className="text-[var(--text-faint)]">{watchlist.length}/50</span>
          )}
        </div>

        {onManageFolders && (folders.length > 0 || watchlist.length >= 3) && (
          <FolderTabs
            folders={folders}
            activeFolder={activeFolder}
            onSelect={setActiveFolder}
            onAdd={handleAddFolder}
            onEdit={handleEditFolder}
            onDelete={handleDeleteFolder}
          />
        )}

        {watchlistLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-[var(--bg-overlay)]" />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          activeFolder !== "all" ? (
            <p className="text-xs text-[var(--text-faint)]">이 폴더에 종목이 없습니다</p>
          ) : emptyState
        ) : (
          renderList(false)
        )}

        <FolderNameModal
          open={folderModal !== null}
          initialValue={folderModal?.mode === "edit" ? folderModal.folder?.name ?? "" : ""}
          onConfirm={handleFolderModalConfirm}
          onCancel={() => setFolderModal(null)}
        />
      </div>
    );
  }

  // desktop variant
  return (
    <aside className="hidden lg:block lg:w-56 shrink-0">
      <div className="sticky top-6 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
          <Star className="h-4 w-4 text-amber-400" />
          관심종목
          {watchlist.length > 0 && (
            <span className="text-[10px] text-[var(--text-faint)]">{watchlist.length}/50</span>
          )}
        </div>

        {onManageFolders && (folders.length > 0 || watchlist.length >= 3) && (
          <FolderTabs
            folders={folders}
            activeFolder={activeFolder}
            onSelect={setActiveFolder}
            onAdd={handleAddFolder}
            onEdit={handleEditFolder}
            onDelete={handleDeleteFolder}
          />
        )}

        {watchlistLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-[var(--bg-overlay)]" />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          activeFolder !== "all" ? (
            <p className="text-xs text-[var(--text-faint)]">이 폴더에 종목이 없습니다</p>
          ) : emptyState
        ) : (
          renderList(true)
        )}
      </div>

      {/* 건강검진 유도 카드 */}
      {watchlist.length >= 1 && (
        <a
          href="/portfolio?ref=watchlist"
          className="mt-3 block rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-2.5 transition-colors hover:bg-indigo-500/15"
        >
          <div className="text-xs font-medium text-[var(--text-primary)] mb-0.5">
            내 종목 건강검진 받기
          </div>
          <div className="text-[10px] text-indigo-400">
            관심종목 {watchlist.length}개 기준 · 무료
          </div>
        </a>
      )}

      <FolderNameModal
        open={folderModal !== null}
        initialValue={folderModal?.mode === "edit" ? folderModal.folder?.name ?? "" : ""}
        onConfirm={handleFolderModalConfirm}
        onCancel={() => setFolderModal(null)}
      />
    </aside>
  );
}
