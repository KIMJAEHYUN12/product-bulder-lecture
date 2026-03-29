import type { ViewSignal } from "@/lib/portfolioAnalyzeApi";

const config: Record<ViewSignal, { label: string; bg: string; border: string; text: string; dot: string }> = {
  danger: { label: "위험", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
  warning: { label: "경고", bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-400" },
  caution: { label: "주의", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  good: { label: "양호", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  strong: { label: "강세", bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-400" },
};

export function getSignalConfig(signal: ViewSignal) {
  return config[signal] || config.caution;
}

export function SignalBadge({ signal, size = "sm" }: { signal: ViewSignal; size?: "sm" | "md" }) {
  const c = getSignalConfig(signal);
  const cls = size === "md"
    ? `text-[10px] px-2 py-1 rounded-md ${c.bg} ${c.text} ${c.border} border font-medium`
    : `text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border`;
  return <span className={cls}>{c.label}</span>;
}

export function SignalDot({ signal }: { signal: ViewSignal }) {
  const c = getSignalConfig(signal);
  return <div className={`w-2 h-2 rounded-full ${c.dot}`} />;
}
