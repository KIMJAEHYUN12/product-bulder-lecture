"use client";

import type { StockReportData } from "@/types/stockReport";
import {
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Brain,
  Shield,
} from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  S: "from-amber-400 to-yellow-500 text-amber-900",
  A: "from-emerald-400 to-green-500 text-emerald-900",
  B: "from-blue-400 to-indigo-500 text-white",
  C: "from-orange-400 to-amber-500 text-orange-900",
  D: "from-red-400 to-rose-500 text-white",
};

const GRADE_BG: Record<string, string> = {
  S: "border-amber-500/30 bg-amber-500/5",
  A: "border-emerald-500/30 bg-emerald-500/5",
  B: "border-blue-500/30 bg-blue-500/5",
  C: "border-orange-500/30 bg-orange-500/5",
  D: "border-red-500/30 bg-red-500/5",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-blue-500" : "bg-rose-500";
  return (
    <div className="text-center">
      <div className="text-[10px] text-[var(--text-faint)] mb-1">{label}</div>
      <div className="h-1.5 rounded-full bg-[var(--bg-secondary)]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(5, score)}%` }}
        />
      </div>
      <div className="mt-0.5 text-xs font-semibold">{score}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  iconColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconColor}`}
        >
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function formatVolume(n: number | null): string {
  if (n == null) return "-";
  const abs = Math.abs(n);
  if (abs >= 10000) return `${n > 0 ? "+" : ""}${(n / 10000).toFixed(1)}만`;
  return `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
}

function formatBillion(n: number | null): string {
  if (n == null) return "-";
  return `${(n / 100000000).toFixed(0)}억`;
}

export default function StockReport({ data }: { data: StockReportData }) {
  const { scores, technical, financial, supply, checklist } = data;

  return (
    <div className="space-y-4">
      {/* 1. 종합 등급 카드 */}
      <div
        className={`rounded-xl border p-5 ${GRADE_BG[data.grade] || GRADE_BG.B}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-2xl ${GRADE_COLORS[data.grade] || GRADE_COLORS.B}`}
          >
            {data.grade}
          </div>
          <div>
            <div className="text-lg font-bold">{data.name}</div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>{data.gradeLabel}</span>
              <span className="text-[var(--text-faint)]">·</span>
              <span>종합 {scores.overall}점</span>
              {data.sector && (
                <>
                  <span className="text-[var(--text-faint)]">·</span>
                  <span className="text-xs">{data.sector}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          <ScoreBar label="기술" score={scores.technical} />
          <ScoreBar label="재무" score={scores.financial} />
          <ScoreBar label="수급" score={scores.supply} />
          <ScoreBar label="밸류" score={scores.valuation} />
          <ScoreBar label="종합" score={scores.overall} />
        </div>
      </div>

      {/* 2. 기술적 분석 */}
      <Section
        icon={<BarChart3 className="h-4 w-4 text-indigo-400" />}
        title="기술적 분석"
        iconColor="bg-indigo-500/10"
      >
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">추세</div>
              <div className="mt-0.5 font-medium">{technical.trend}</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">이평선</div>
              <div className="mt-0.5 font-medium text-xs">{technical.maStatus}</div>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">RSI(14)</div>
              <div className="mt-0.5 font-medium">
                {technical.rsi ?? "-"}
                <span className="ml-1 text-[10px] text-[var(--text-faint)]">
                  {technical.rsi != null
                    ? technical.rsi > 70
                      ? "과매수"
                      : technical.rsi < 30
                        ? "과매도"
                        : "중립"
                    : ""}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">볼린저</div>
              <div className="mt-0.5 font-medium">
                {technical.bbPosition != null ? `${technical.bbPosition}%` : "-"}
              </div>
            </div>
          </div>
          {technical.rsiComment && (
            <p className="text-[var(--text-secondary)]">{technical.rsiComment}</p>
          )}
          {technical.macdCross && (
            <p className="text-[var(--text-secondary)]">MACD: {technical.macdCross}</p>
          )}
          {technical.volumeComment && (
            <p className="text-[var(--text-secondary)]">{technical.volumeComment}</p>
          )}
          {technical.keyLevels && (
            <div className="flex gap-4 text-xs text-[var(--text-faint)]">
              <span>지지: {technical.keyLevels.support?.toLocaleString()}</span>
              <span>저항: {technical.keyLevels.resistance?.toLocaleString()}</span>
            </div>
          )}
          <p className="text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-secondary)] pt-2 mt-2">
            {technical.summary}
          </p>
        </div>
      </Section>

      {/* 3. 재무 분석 */}
      <Section
        icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        title="재무 분석"
        iconColor="bg-emerald-500/10"
      >
        <div className="space-y-2 text-sm">
          {financial.revenue.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {financial.revenue.map((f) => (
                <div
                  key={f.year}
                  className="rounded-lg bg-[var(--bg-secondary)] p-2.5 text-center"
                >
                  <div className="text-[10px] text-[var(--text-faint)]">
                    {f.year}년
                  </div>
                  <div className="mt-0.5 text-xs font-medium">
                    {f.netIncome != null ? (
                      <span
                        className={
                          f.netIncome > 0 ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        순이익 {formatBillion(f.netIncome)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-faint)]">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 text-xs">
            {financial.per != null && (
              <span>PER {financial.per.toFixed(1)}배</span>
            )}
            {financial.forwardPer != null && (
              <span className="text-[var(--text-faint)]">
                Forward {financial.forwardPer.toFixed(1)}배
              </span>
            )}
          </div>
          {financial.revenueComment && (
            <p className="text-[var(--text-secondary)]">
              {financial.revenueComment}
            </p>
          )}
          {financial.perComment && (
            <p className="text-[var(--text-secondary)]">{financial.perComment}</p>
          )}
          <p className="text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-secondary)] pt-2 mt-2">
            {financial.summary}
          </p>
        </div>
      </Section>

      {/* 4. 수급 분석 */}
      <Section
        icon={<Users className="h-4 w-4 text-cyan-400" />}
        title="수급 분석"
        iconColor="bg-cyan-500/10"
      >
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">
                외국인 30일 순매수
              </div>
              <div
                className={`mt-0.5 font-medium ${
                  (supply.foreignNet30d ?? 0) > 0
                    ? "text-red-400"
                    : (supply.foreignNet30d ?? 0) < 0
                      ? "text-blue-400"
                      : ""
                }`}
              >
                {formatVolume(supply.foreignNet30d)}주
              </div>
            </div>
            <div className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
              <div className="text-[10px] text-[var(--text-faint)]">
                기관 30일 순매수
              </div>
              <div
                className={`mt-0.5 font-medium ${
                  (supply.institutionNet30d ?? 0) > 0
                    ? "text-red-400"
                    : (supply.institutionNet30d ?? 0) < 0
                      ? "text-blue-400"
                      : ""
                }`}
              >
                {formatVolume(supply.institutionNet30d)}주
              </div>
            </div>
          </div>
          {supply.foreignStreak != null && (
            <div className="text-xs text-[var(--text-faint)]">
              외국인 연속{" "}
              {supply.foreignStreak > 0
                ? `${supply.foreignStreak}일 순매수`
                : `${Math.abs(supply.foreignStreak)}일 순매도`}
              {supply.foreignPct != null && ` · 보유율 ${supply.foreignPct}%`}
            </div>
          )}
          {supply.foreignComment && (
            <p className="text-[var(--text-secondary)]">
              {supply.foreignComment}
            </p>
          )}
          <p className="text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-secondary)] pt-2 mt-2">
            {supply.summary}
          </p>
        </div>
      </Section>

      {/* 5. DART 공시 */}
      {financial.recentDisclosures.length > 0 && (
        <Section
          icon={<FileText className="h-4 w-4 text-amber-400" />}
          title="최근 공시"
          iconColor="bg-amber-500/10"
        >
          <ul className="space-y-1.5">
            {financial.recentDisclosures.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 text-xs text-[var(--text-faint)] mt-0.5">
                  {d.date}
                </span>
                <a
                  href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${d.receiptNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-indigo-400 transition-colors truncate"
                >
                  {d.title}
                </a>
              </li>
            ))}
          </ul>
          {financial.disclosureComment && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {financial.disclosureComment}
            </p>
          )}
        </Section>
      )}

      {/* 6. AI 종합 의견 */}
      <Section
        icon={<Brain className="h-4 w-4 text-purple-400" />}
        title="AI 종합 의견"
        iconColor="bg-purple-500/10"
      >
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
          {data.opinion}
        </p>
      </Section>

      {/* 7. 투자 체크리스트 */}
      {checklist.length > 0 && (
        <Section
          icon={<Shield className="h-4 w-4 text-teal-400" />}
          title="투자 체크리스트"
          iconColor="bg-teal-500/10"
        >
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {item.checked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span
                  className={
                    item.checked
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 업데이트 시각 */}
      <p className="text-center text-[10px] text-[var(--text-faint)]">
        {new Date(data.updatedAt).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        })}{" "}
        기준 · 24시간 캐시
      </p>
    </div>
  );
}
