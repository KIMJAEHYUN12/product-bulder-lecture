import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "수급 스캔 활용법",
  description:
    "채널 하단(-2σ 이하) + 외인/기관 순매수 조건으로 종목을 자동 탐색하는 수급 스캔 사용법.",
};

const toc = [
  { id: "why", label: "2,500개 종목을 언제 다 봅니까?" },
  { id: "conditions", label: "스캔의 핵심 조건: '가격'과 '수급'의 만남" },
  { id: "workflow", label: "스캔 카드 읽는 법 및 워크플로우" },
  { id: "filter", label: "시장별 필터 활용" },
  { id: "caution", label: "주의사항" },
];

export default function SupplyScanGuide() {
  return (
    <GuideLayout
      title="노다지 발굴기, '수급 스캔' 200% 활용법"
      subtitle="엄격한 조건을 통과한 종목만 골라내는 자동 선별 시스템"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
    >
      <Section id="why" title="1. 2,500개 종목을 언제 다 봅니까?">
        <p>
          대한민국 상장 종목은 너무 많습니다.
          일일이 차트를 돌려보는 건 비효율적인 수동 작업입니다.
        </p>
        <p className="mt-3">
          <strong className="text-white">&lsquo;수급 스캔&rsquo;</strong>은
          시간을 아껴주는{" "}
          <strong className="text-white">&lsquo;자동 선별 시스템&rsquo;</strong>입니다.
          설정된 엄격한 기준을 통과한 종목만 골라내어
          관심 종목 탐색의 효율을 높여줍니다.
        </p>

        <HighlightBox variant="info">
          메인 화면의 &ldquo;수급 분석 스캔&rdquo; 버튼을 눌러 결과를 확인할 수 있습니다.
          스캔 결과는 <strong>30분마다 자동 갱신</strong>되며,
          코스피/코스닥 주요 종목을 대상으로 분석합니다.
        </HighlightBox>
      </Section>

      <Section id="conditions" title="2. 스캔의 핵심 조건: '가격'과 '수급'의 만남">
        <p>
          수급 스캔의 기본 알고리즘은 두 가지 필터를{" "}
          <strong className="text-white">동시에</strong> 통과해야 합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs font-bold text-indigo-400 mb-2">조건 1: 가격 필터</p>
            <p className="text-xs text-zinc-300">
              주가가 빗각 채널의 하단부(<strong className="text-white">-2&sigma;</strong> 이하)에 위치하여{" "}
              <strong className="text-white">&lsquo;통계적으로 낮은 구간&rsquo;</strong>에 있어야 합니다.
              3개월 회귀 채널 기준으로 평균 대비 많이 떨어진 상태를 의미합니다.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold text-emerald-400 mb-2">조건 2: 수급 필터</p>
            <p className="text-xs text-zinc-300">
              그 낮은 가격대에서 외국인이나 기관이{" "}
              <strong className="text-white">&lsquo;사고 있어야&rsquo;</strong> 합니다.
              최근 3거래일 동안 외국인과 기관의 순매매 합계가 양수(+)인 종목만 통과합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          이 두 조건이 만나는 종목만 &lsquo;카드&rsquo; 형태로 화면에 표시됩니다.
          두 조건을 동시에 만족하는 종목은 많지 않습니다.
          시장 상황에 따라 0개일 수도 있고, 10개 이상일 수도 있습니다.
        </HighlightBox>
      </Section>

      <Section id="workflow" title="3. 스캔 카드 읽는 법 및 워크플로우">
        <p>스캔 결과를 활용하는 3단계 워크플로우:</p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              1
            </span>
            <div>
              <p className="text-xs font-bold text-white mb-1">카드 확인</p>
              <p className="text-xs text-zinc-400">
                스캔 페이지에 뜬 종목들의 수급 강도와 현재 위치를 훑어봅니다.
                종목명, 현재가, 외인+기관 순매수 합계, 채널 하단 위치가 표시됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              2
            </span>
            <div>
              <p className="text-xs font-bold text-white mb-1">차트 정밀 검수</p>
              <p className="text-xs text-zinc-400">
                마음에 드는 종목을 클릭해 실제 빗각의 각도가 살아있는지,
                채널 하단에서 지지되고 있는지 확인합니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              3
            </span>
            <div>
              <p className="text-xs font-bold text-white mb-1">종합 판단</p>
              <p className="text-xs text-zinc-400">
                테이블의 누적 수급, 수급 흐름 차트, 재무 정보, 뉴스까지
                종합적으로 확인한 후 최종 판단합니다.
              </p>
            </div>
          </div>
        </div>


        <HighlightBox variant="info">
          스캔은 관심 종목을 발견하는 <strong>출발점</strong>입니다.
          스캔 결과만으로 매매를 결정하지 마시고,
          반드시 차트, 수급, 재무 등을 종합적으로 확인한 후 판단하세요.
        </HighlightBox>
      </Section>

      <Section id="filter" title="4. 시장별 필터 활용">
        <p>
          스캔 결과 상단의 탭으로 시장별 필터링이 가능합니다.
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-white w-16 shrink-0">전체</span>
            <span className="text-xs text-zinc-400">코스피 + 코스닥 모든 결과</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-white w-16 shrink-0">코스피</span>
            <span className="text-xs text-zinc-400">코스피(KS) 종목만 — 대형주 위주로 볼 때</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-white w-16 shrink-0">코스닥</span>
            <span className="text-xs text-zinc-400">코스닥(KQ) 종목만 — 중소형주 위주로 볼 때</span>
          </div>
        </div>

        <HighlightBox variant="tip">
          시총 상위주 위주로 볼지, 거래량이 활발한 종목 위주로 볼지 —
          본인의 투자 성향에 따라 시장 필터를 활용하면
          더 효율적인 종목 탐색이 가능합니다.
        </HighlightBox>
      </Section>

      <Section id="caution" title="5. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>스캔 결과는 통계적 조건 충족 여부를 보여줄 뿐, 투자를 권유하지 않습니다.</li>
            <li>채널 하단에 있다고 반드시 반등하는 것은 아닙니다.</li>
            <li>3일 순매수가 양수여도 이후 매도로 전환될 수 있습니다.</li>
            <li>스캔 대상은 주요 시가총액 종목 + 최근 분석 종목 기준이며, 전 종목을 커버하지 않습니다.</li>
            <li>데이터는 30분마다 갱신되며, 실시간 데이터가 아닙니다.</li>
            <li>반드시 채널 위치, 재무, 뉴스 등 다른 정보와 종합적으로 판단하세요.</li>
          </ul>
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">관련 종목 분석</p>
        <div className="flex flex-wrap gap-2">
          <a href="/stock/" className="text-xs text-indigo-400 hover:underline">최신 종목 분석 목록 보기 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
