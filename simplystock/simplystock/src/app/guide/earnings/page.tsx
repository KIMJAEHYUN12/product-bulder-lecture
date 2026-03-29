import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "실적 캘린더 사용법",
  description:
    "상장사 분기·반기·사업년도 실적 공시 일정을 달력으로 확인하는 방법을 안내합니다.",
};

const toc = [
  { id: "what", label: "1. 실적 캘린더란?" },
  { id: "how", label: "2. 사용 방법" },
  { id: "types", label: "3. 공시 유형 이해" },
  { id: "strategy", label: "4. 실적 발표 전후 전략" },
  { id: "caution", label: "5. 주의사항" },
];

export default function EarningsGuidePage() {
  return (
    <GuideLayout
      title="실적 캘린더 사용법"
      subtitle="상장사 실적 공시 일정을 한눈에 확인하세요"
      updatedAt="최종 수정일: 2026년 03월 08일"
      toc={toc}
      backHref="/guide/"
      backLabel="가이드 목록"
    >
      <Section id="what" title="1. 실적 캘린더란?">
        <p>
          실적 캘린더는 상장사의 <strong className="text-white">분기·반기·사업년도 실적 공시 일정</strong>을
          달력 형태로 보여주는 도구입니다. 어떤 기업이 언제 실적을 발표하는지
          미리 파악하면, 투자 의사결정의 타이밍을 잡는 데 큰 도움이 됩니다.
        </p>

        <HighlightBox variant="info">
          실적 발표일 전후로 주가 변동성이 커지는 경향이 있습니다.
          보유 종목의 실적 발표 일정을 미리 확인해두면
          예상치 못한 급등·급락에 대비할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="how" title="2. 사용 방법">
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-2">Step 1. 월 이동</h3>
            <p>
              상단의 좌우 화살표를 눌러 원하는 월로 이동합니다.
              과거 실적 발표일을 확인하거나, 다가오는 일정을 미리 볼 수 있습니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-2">Step 2. 날짜 선택</h3>
            <p>
              실적 공시가 있는 날짜에는 <strong className="text-white">점 표시와 건수</strong>가 표시됩니다.
              해당 날짜를 클릭하면 아래에 공시 기업 목록이 나타납니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="text-sm font-bold text-indigo-400 mb-2">Step 3. 종목 분석</h3>
            <p>
              기업명을 클릭하면 해당 종목의 차트 분석 페이지로 이동합니다.
              &ldquo;원문&rdquo; 링크를 누르면 DART 공시 원문을 직접 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </Section>

      <Section id="types" title="3. 공시 유형 이해">
        <p>실적 공시는 유형에 따라 다른 색상의 배지로 구분됩니다.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="text-sm font-bold text-red-400 mb-1">잠정 실적</h3>
            <p className="text-xs">
              정식 감사 전 발표하는 속보성 실적입니다.
              수치가 변경될 수 있지만, 시장에 가장 큰 영향을 미칩니다.
            </p>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <h3 className="text-sm font-bold text-blue-400 mb-1">분기 보고서</h3>
            <p className="text-xs">
              1·2·3분기 실적을 담은 공식 보고서입니다.
              매출, 영업이익, 순이익 등의 확정 수치를 확인할 수 있습니다.
            </p>
          </div>

          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-1">반기 보고서</h3>
            <p className="text-xs">
              상반기(6개월) 실적을 종합한 보고서입니다.
              중간 결산으로서 연간 실적 추정에 활용됩니다.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3 className="text-sm font-bold text-emerald-400 mb-1">사업 보고서</h3>
            <p className="text-xs">
              1년 전체 실적을 담은 연간 보고서입니다.
              외부 감사를 거친 확정 재무제표가 포함됩니다.
            </p>
          </div>
        </div>
      </Section>

      <Section id="strategy" title="4. 실적 발표 전후 전략">
        <HighlightBox variant="tip">
          실적 캘린더의 핵심 활용법은 <strong>일정 관리</strong>입니다.
          보유 종목의 실적 발표일을 미리 확인하고,
          어닝 서프라이즈(예상 초과) 또는 어닝 쇼크(예상 미달) 가능성에 대비하세요.
        </HighlightBox>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="text-sm font-bold text-white mb-2">실적 발표 전</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>컨센서스(시장 예상치) 대비 실적이 어떨지 점검</li>
              <li>수급 흐름(외인/기관 매매동향)으로 사전 신호 확인</li>
              <li>변동성 확대에 대비한 포지션 조절 검토</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="text-sm font-bold text-white mb-2">실적 발표 후</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>실제 실적과 시장 반응(주가)을 비교</li>
              <li>PER 밴드에서 밸류에이션 변화 확인</li>
              <li>수급 변화(외인/기관 매수·매도 전환 여부) 모니터링</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="caution" title="5. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>실적 캘린더는 DART 공시 기반이며, 공시 시점에 따라 반영이 지연될 수 있습니다.</li>
            <li>잠정 실적은 추후 확정 수치와 다를 수 있습니다.</li>
            <li>실적이 좋아도 이미 주가에 반영된 경우(선반영) 하락할 수 있습니다.</li>
            <li>실적 발표일 전후의 매매는 변동성이 크므로 신중하게 판단하세요.</li>
            <li>캘린더 데이터는 참고용이며, 단독으로 투자 판단의 근거가 될 수 없습니다.</li>
          </ul>
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">바로가기</p>
        <div className="flex flex-wrap gap-2">
          <a href="/earnings/" className="text-xs text-indigo-400 hover:underline">실적 캘린더 열기 →</a>
          <a href="/stock/" className="text-xs text-[var(--text-muted)] hover:underline">종목 분석 목록 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
