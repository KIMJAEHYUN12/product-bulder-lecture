"use client";

import { SignalBadge, getSignalConfig } from "./SignalBadge";
import { formatVolume } from "@/lib/portfolioInterpret";
import type { PortfolioDiagnosisView, KeyFinding, ActionGuideItem } from "@/lib/portfolioAnalyzeApi";

interface Props {
  totalValue: number;
  totalReturn: number;
  stockCount: number;
  sectorCount: number;
  diagnosis: PortfolioDiagnosisView;
}

const findingIconMap: Record<string, string> = {
  conflict: "⚡",
  momentum: "📈",
  risk: "⚠️",
  positive: "✅",
};

const iconBorderColor: Record<string, string> = {
  risk: "#ef4444",
  conflict: "#f59e0b",
  momentum: "#f59e0b",
  positive: "#10b981",
};

const diagnosisBgStrong: Record<string, string> = {
  danger: "bg-red-500/25",
  warning: "bg-orange-500/25",
  caution: "bg-amber-500/25",
  good: "bg-emerald-500/25",
  strong: "bg-blue-500/25",
};

export function DiagnosisCard({ totalValue, totalReturn, stockCount, sectorCount, diagnosis }: Props) {
  const sig = getSignalConfig(diagnosis.overall_signal);
  const retColor = totalReturn >= 0 ? "text-red-400" : "text-blue-400";

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 space-y-4">
      {/* 상단: 평가액 + 수익률 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-[var(--text-muted)]">총 평가액</div>
          <div className="text-base font-bold text-[var(--text-primary)]">{formatVolume(totalValue)}원</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text-muted)]">총 수익률</div>
          <div className={`text-base font-bold ${retColor}`}>
            {totalReturn > 0 ? "+" : ""}{totalReturn.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        {stockCount}종목 · {sectorCount}섹터
      </div>

      {/* 종합 진단 박스 */}
      <div className={`rounded-lg border ${sig.border} ${diagnosisBgStrong[diagnosis.overall_signal] || sig.bg} p-3 space-y-1.5`}>
        <div className="flex items-center gap-2">
          <SignalBadge signal={diagnosis.overall_signal} size="md" />
          <span className={`text-sm font-bold ${sig.text}`}>종합 진단</span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {diagnosis.overall_summary}
        </p>
      </div>

      {/* 핵심 발견 */}
      {diagnosis.key_findings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-primary)]">핵심 발견</div>
          {diagnosis.key_findings.map((f, i) => (
            <KeyFindingItem key={i} finding={f} index={i} />
          ))}
        </div>
      )}

      {/* 검토 사항 */}
      {diagnosis.action_guide.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-primary)]">검토 사항</div>
          <div className="rounded-lg bg-[var(--bg-overlay)] p-3 space-y-2.5">
            {diagnosis.action_guide.map((item, i) => (
              <ActionItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* 면책 */}
      <p className="text-[9px] text-[var(--text-faint)] leading-relaxed border-t border-[var(--border-primary)] pt-2">
        위 내용은 투자 자문이 아닌 데이터 기반 정보 제공입니다. 투자 판단의 책임은 본인에게 있습니다.
      </p>
    </div>
  );
}

function KeyFindingItem({ finding, index }: { finding: KeyFinding; index: number }) {
  const icon = findingIconMap[finding.icon] || "⚡";
  const borderColor = iconBorderColor[finding.icon] || "var(--border-primary)";
  return (
    <div
      className="pl-3 py-1 animate-[fadeSlideIn_0.4s_ease-out_both]"
      style={{ animationDelay: `${index * 200}ms`, borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="text-[12px] font-medium text-[var(--text-primary)]">
        {icon} {finding.title}
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
        {finding.body}
      </p>
    </div>
  );
}

function ActionItem({ item, index }: { item: ActionGuideItem; index: number }) {
  return (
    <div
      className="animate-[fadeSlideIn_0.4s_ease-out_both]"
      style={{ animationDelay: `${300 + index * 150}ms` }}
    >
      <div className="text-[11px] font-medium text-[var(--text-primary)]">
        📌 {item.target}
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed pl-5">
        {item.action}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] pl-5">
        {item.reason}
      </p>
    </div>
  );
}
