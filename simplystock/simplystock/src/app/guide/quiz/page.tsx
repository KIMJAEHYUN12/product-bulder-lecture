import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "투자성향 테스트 이해하기",
  description:
    "나의 투자 성향을 파악하고 맞춤 전략을 세우는 방법. 8가지 투자자 유형, 결과 해석, 유형별 포트폴리오 가이드를 안내합니다.",
};

const toc = [
  { id: "know-yourself", label: "나를 알아야 돈을 지킨다" },
  { id: "eight-types", label: "8가지 투자자 유형 소개" },
  { id: "interpret", label: "테스트 결과 해석하기" },
  { id: "portfolio", label: "투자 유형별 맞춤 포트폴리오" },
  { id: "change", label: "성향은 변한다" },
];

export default function QuizGuide() {
  return (
    <GuideLayout
      title="투자성향 테스트 이해하기"
      subtitle="나를 알아야 돈을 지킨다 — 감정적 매매를 막는 첫걸음"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
    >
      <Section id="know-yourself" title="1. 나를 알아야 돈을 지킨다">
        <p>
          투자에서 가장 큰 적은 시장이 아니라{" "}
          <strong className="text-white">자기 자신</strong>입니다.
          똑같은 종목을 사도 어떤 사람은 수익을 내고 어떤 사람은 손실을 봅니다.
          차이는 종목 선택이 아니라 <strong className="text-white">매매 과정에서의 심리</strong>에서 갈립니다.
        </p>
        <p className="mt-3">
          하락장에서 공포에 빠져 바닥에서 파는 사람이 있고,
          상승장에서 탐욕에 휩쓸려 꼭대기에서 사는 사람이 있습니다.
          자신의 투자 성향을 객관적으로 파악하면 이런 실수를 미리 방지할 수 있습니다.
        </p>

        <HighlightBox variant="tip">
          <strong>투자성향 테스트의 목적</strong>은 &ldquo;좋은 유형&rdquo;을 찾는 것이 아닙니다.
          자신의 강점은 살리고, 약점은 보완할 수 있도록
          자기 객관화의 도구로 활용하는 것입니다.
        </HighlightBox>
      </Section>

      <Section id="eight-types" title="2. 8가지 투자자 유형 소개">
        <p>
          SimplyStock의 투자성향 테스트는 응답 패턴을 분석하여
          8가지 투자자 유형 중 하나로 분류합니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-indigo-400 font-bold">비전가</span>
            <span className="text-xs text-zinc-300">
              미래 트렌드를 읽고 성장주에 집중하는 유형입니다.
              높은 수익을 추구하지만, 과도한 낙관으로 위험을 과소평가할 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-amber-400 font-bold">딜메이커</span>
            <span className="text-xs text-zinc-300">
              단기 매매에 능숙하고 빠른 판단력이 강점입니다.
              거래 빈도가 높아 수수료 부담과 피로도가 약점이 될 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-emerald-400 font-bold">현자</span>
            <span className="text-xs text-zinc-300">
              펀더멘털 분석을 중시하고 장기 보유를 선호합니다.
              인내심이 강하지만, 변화하는 시장에 대한 유연성이 부족할 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-cyan-400 font-bold">전략가</span>
            <span className="text-xs text-zinc-300">
              체계적인 규칙과 데이터 기반 매매를 추구합니다.
              규칙에 지나치게 얽매여 시장 감각을 놓칠 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-red-400 font-bold">헌터</span>
            <span className="text-xs text-zinc-300">
              급등주와 테마주를 포착하는 데 탁월합니다.
              높은 수익과 높은 손실이 공존하며, 리스크 관리가 핵심 과제입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-violet-400 font-bold">관찰자</span>
            <span className="text-xs text-zinc-300">
              신중하게 관망하다 확신이 생길 때만 매수합니다.
              기회를 놓치는 것이 약점이지만, 큰 손실을 피하는 능력이 강점입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-pink-400 font-bold">역발상가</span>
            <span className="text-xs text-zinc-300">
              남들이 팔 때 사고, 살 때 파는 역발상 투자를 합니다.
              타이밍이 맞으면 큰 수익을 내지만, 추세에 역행하는 위험이 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-teal-400 font-bold">탐험가</span>
            <span className="text-xs text-zinc-300">
              다양한 자산과 전략을 시도하는 호기심형 투자자입니다.
              경험이 다양하지만, 한 가지에 집중하지 못하는 것이 약점입니다.
            </span>
          </div>
        </div>
      </Section>

      <Section id="interpret" title="3. 테스트 결과 해석하기">
        <p>
          테스트가 완료되면 주요 유형과 함께 세부 점수 분포를 확인할 수 있습니다.
          단순히 유형 이름만 보지 말고 다음 항목들을 주의 깊게 살펴보세요.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">점수 분포</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              대부분의 사람은 하나의 유형에 100% 해당하지 않습니다.
              주요 유형 70%, 부차 유형 20%, 나머지 10%처럼 복합적인 성향을 가집니다.
              부차 유형의 특성도 자신의 투자 행동에 영향을 미치므로 함께 이해하세요.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">강점과 약점</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              각 유형에는 투자에서 유리한 강점과 주의해야 할 약점이 있습니다.
              강점은 살리되, 약점에 해당하는 상황에서는 의식적으로 경계하세요.
              예를 들어 &ldquo;헌터&rdquo;라면 리스크 관리 규칙을 더 엄격하게 적용하는 식입니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">추천 전략과 위험 요소</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              유형별로 궁합이 좋은 투자 전략과 피해야 할 상황이 제시됩니다.
              이를 참고하여 자신에게 맞는 매매 방식과 종목 선택 기준을 세워보세요.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          테스트 결과는 절대적인 판정이 아니라 <strong>자기 이해의 출발점</strong>입니다.
          &ldquo;나는 이런 경향이 있구나&rdquo;를 인식하는 것 자체가
          감정적 매매를 줄이는 데 큰 도움이 됩니다.
        </HighlightBox>
      </Section>

      <Section id="portfolio" title="4. 투자 유형별 맞춤 포트폴리오">
        <p>
          투자 유형에 따라 적합한 자산 배분 전략이 다릅니다.
          다음은 유형별 추천 포트폴리오 비율의 예시입니다.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-indigo-400 mb-2">공격형 (비전가, 헌터)</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 성장주 60%</li>
              <li>- 가치주 20%</li>
              <li>- 현금/채권 20%</li>
              <li>- 업종: IT, 바이오, 신재생</li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-emerald-400 mb-2">안정형 (현자, 관찰자)</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 배당주/가치주 50%</li>
              <li>- 채권/ETF 30%</li>
              <li>- 현금 20%</li>
              <li>- 업종: 금융, 유틸리티, 필수소비</li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-2">균형형 (전략가, 역발상가)</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 대형 우량주 40%</li>
              <li>- 중소형 성장주 30%</li>
              <li>- 현금/채권 30%</li>
              <li>- 업종: 분산 투자</li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-amber-400 mb-2">탐색형 (딜메이커, 탐험가)</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 단기 트레이딩 40%</li>
              <li>- 중장기 보유 30%</li>
              <li>- 현금(기회 포착용) 30%</li>
              <li>- 업종: 테마/이벤트 중심</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="warn">
          위 배분은 일반적인 가이드라인이며, 실제 투자는 개인의 재정 상황, 투자 기간,
          리스크 허용 범위 등을 종합적으로 고려하여 결정해야 합니다.
        </HighlightBox>
      </Section>

      <Section id="change" title="5. 성향은 변한다">
        <p>
          투자 성향은 고정된 것이 아닙니다.
          <strong className="text-white"> 경험이 쌓이고, 시장 환경이 바뀌면 자연스럽게 변합니다</strong>.
          처음에 공격적이었던 투자자가 큰 손실을 겪고 보수적으로 바뀌기도 하고,
          반대로 신중했던 사람이 성공 경험으로 과감해지기도 합니다.
        </p>
        <p className="mt-3">
          중요한 것은 이런 변화를 <strong className="text-white">의식적으로 인지</strong>하는 것입니다.
          자신이 변했다는 사실을 모른 채 예전 전략을 고수하면 위험합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">재검사 권장 시점</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 큰 수익 또는 큰 손실을 경험한 후</li>
              <li>- 투자 경력 1년이 지난 후</li>
              <li>- 시장 환경이 크게 바뀌었을 때 (강세장 &harr; 약세장)</li>
              <li>- 매매 패턴이 이전과 달라졌다고 느낄 때</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>3~6개월마다 한 번씩</strong> 투자성향 테스트를 다시 해보세요.
          이전 결과와 비교하면 자신의 투자 심리가 어떻게 변화하고 있는지
          객관적으로 확인할 수 있습니다. 이것이 진정한 의미의 자기 객관화입니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
