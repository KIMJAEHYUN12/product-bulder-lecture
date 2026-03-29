import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "백테스트 시뮬레이터 사용법",
  description:
    "SimplyStock 백테스트로 투자 전략을 과거 데이터로 검증하는 방법. 결과 지표 해석, 좋은 결과 판단, 한계점까지 안내합니다.",
};

const toc = [
  { id: "what-is", label: "백테스트란 무엇인가" },
  { id: "how-to", label: "SimplyStock 백테스트 사용법" },
  { id: "metrics", label: "결과 지표 읽는 법" },
  { id: "good-vs-bad", label: "좋은 백테스트 결과 vs 나쁜 결과" },
  { id: "limitations", label: "백테스트의 한계와 주의사항" },
];

export default function BacktestGuide() {
  return (
    <GuideLayout
      title="백테스트 시뮬레이터 사용법"
      subtitle="과거 데이터로 투자 전략을 검증하는 가장 확실한 방법"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
    >
      <Section id="what-is" title="1. 백테스트란 무엇인가">
        <p>
          백테스트(Backtest)란 <strong className="text-white">과거 주가 데이터에 투자 전략을 적용해보는 시뮬레이션</strong>입니다.
          &ldquo;만약 3년 전에 삼성전자와 SK하이닉스에 500만 원씩 투자했다면 지금 얼마가 되었을까?&rdquo;
          같은 질문에 정확한 숫자로 답해주는 도구입니다.
        </p>
        <p className="mt-3">
          투자에서 가장 위험한 것은 &ldquo;느낌&rdquo;으로 판단하는 것입니다.
          백테스트는 이 느낌을 <strong className="text-white">객관적인 수치</strong>로 바꿔줍니다.
          내가 생각한 종목 조합이 실제로 시장 평균보다 나았는지,
          최악의 경우 얼마나 손실이 났는지를 미리 확인할 수 있습니다.
        </p>

        <HighlightBox variant="warn">
          <strong>주의: 생존자 편향(Survivorship Bias)</strong>에 빠지지 마세요.
          지금 잘 나가는 종목만 골라서 백테스트하면 당연히 좋은 결과가 나옵니다.
          하지만 그 종목이 &ldquo;미래에도&rdquo; 잘 나갈 거라는 보장은 없습니다.
        </HighlightBox>
      </Section>

      <Section id="how-to" title="2. SimplyStock 백테스트 사용법">
        <p>
          SimplyStock의 백테스트는 복잡한 설정 없이 3단계로 간단하게 시작할 수 있습니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 1. 종목 선택 (최대 3개)</p>
            <p className="text-xs text-zinc-300">
              검색창에서 비교하고 싶은 종목을 최대 3개까지 선택합니다.
              다양한 업종의 종목을 섞어보면 분산투자 효과를 확인할 수 있습니다.
              예를 들어 반도체 + 바이오 + 금융 조합을 테스트해볼 수 있습니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 2. 기간 설정</p>
            <p className="text-xs text-zinc-300">
              1년, 3년, 5년 등 백테스트 기간을 선택합니다.
              기간이 길수록 다양한 시장 상황(상승장, 하락장, 횡보장)을 포함하므로
              더 신뢰할 수 있는 결과를 얻을 수 있습니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 3. 시작 금액 입력</p>
            <p className="text-xs text-zinc-300">
              투자할 가상 금액을 입력합니다. 기본값은 1,000만 원이며,
              금액은 선택한 종목에 균등 분배됩니다.
              시작 버튼을 누르면 자동으로 과거 데이터를 분석하여 결과를 보여줍니다.
            </p>
          </div>
        </div>
      </Section>

      <Section id="metrics" title="3. 결과 지표 읽는 법">
        <p>
          백테스트가 완료되면 여러 가지 성과 지표가 표시됩니다.
          각 지표의 의미를 정확히 이해해야 올바른 판단을 내릴 수 있습니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-white font-bold">총 수익률</span>
            <span className="text-xs text-zinc-300">
              투자 기간 전체의 누적 수익률입니다.
              &ldquo;1,000만 원이 1,350만 원이 되었다&rdquo;면 총 수익률은 +35%입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-indigo-400 font-bold">CAGR</span>
            <span className="text-xs text-zinc-300">
              연평균 복합 성장률입니다. 3년간 35% 수익이면 연평균 약 10.5%입니다.
              은행 금리, KOSPI 연평균 수익률과 비교하는 데 유용합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-red-400 font-bold">MDD</span>
            <span className="text-xs text-zinc-300">
              최대 낙폭(Maximum Drawdown)입니다. 투자 기간 중 고점 대비 최대 하락 폭을 나타냅니다.
              MDD가 -30%라면, 한때 1,000만 원이 700만 원까지 떨어진 적이 있다는 뜻입니다.
              <strong className="text-white"> 이 수치를 버틸 수 있는지</strong> 반드시 자문하세요.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-white font-bold">KOSPI 대비</span>
            <span className="text-xs text-zinc-300">
              같은 기간 KOSPI 지수 수익률과 비교합니다.
              내 포트폴리오가 시장 평균을 이겼는지(초과수익) 확인할 수 있습니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>가장 중요한 지표는 MDD입니다.</strong>
          수익률이 아무리 높아도 MDD를 견디지 못하면 중간에 공포에 빠져 손절하게 됩니다.
          &ldquo;이 정도 하락을 버틸 수 있는가?&rdquo;를 먼저 판단하세요.
        </HighlightBox>
      </Section>

      <Section id="good-vs-bad" title="4. 좋은 백테스트 결과 vs 나쁜 결과">
        <p>
          백테스트 결과를 보고 &ldquo;좋다, 나쁘다&rdquo;를 판단하는 기준이 필요합니다.
          다음은 일반적인 가이드라인입니다.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold text-emerald-400 mb-2">좋은 결과</p>
            <ul className="text-[11px] text-zinc-300 leading-relaxed space-y-1">
              <li>- CAGR이 KOSPI 연평균 상회</li>
              <li>- MDD가 -20% 이내</li>
              <li>- 수익 곡선이 안정적으로 우상향</li>
              <li>- 하락 후 회복 기간이 짧음</li>
            </ul>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-2">나쁜 결과</p>
            <ul className="text-[11px] text-zinc-300 leading-relaxed space-y-1">
              <li>- CAGR이 예금 금리 수준 이하</li>
              <li>- MDD가 -40% 이상</li>
              <li>- 수익 곡선이 널뛰기</li>
              <li>- 특정 시점에만 수익 집중</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="info">
          MDD -20% 이내이면서 CAGR이 KOSPI를 꾸준히 상회하는 조합을 찾았다면,
          해당 포트폴리오는 실전에서도 참고할 만한 조합입니다.
          다만 과거 성과가 미래를 보장하지 않는다는 점을 항상 기억하세요.
        </HighlightBox>
      </Section>

      <Section id="limitations" title="5. 백테스트의 한계와 주의사항">
        <p>
          백테스트는 강력한 도구이지만 맹신해서는 안 됩니다.
          다음과 같은 본질적인 한계가 있습니다.
        </p>

        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>과적합(Overfitting):</strong> 과거에 잘 맞는 조합을 찾는 것은 쉽지만,
              그것이 미래에도 통할지는 알 수 없습니다.
            </li>
            <li>
              <strong>거래 비용 미반영:</strong> 실제 매매에는 수수료(0.015%), 세금(0.2%),
              슬리피지 등이 발생하여 실제 수익률은 백테스트보다 낮습니다.
            </li>
            <li>
              <strong>심리 요소 미반영:</strong> 백테스트는 기계적으로 보유하지만,
              실전에서는 -20% 하락 시 대부분의 투자자가 공포 매도합니다.
            </li>
            <li>
              <strong>미래 보장 불가:</strong> 과거의 시장 환경과 미래의 시장 환경은 다릅니다.
              코로나, 금리 인상 등 예측 불가능한 이벤트가 결과를 완전히 바꿀 수 있습니다.
            </li>
          </ul>
        </HighlightBox>

        <p className="mt-3">
          백테스트의 올바른 활용법은 <strong className="text-white">&ldquo;이 전략이 과거에도 통했다&rdquo;를 확인</strong>하는 것이지,
          &ldquo;미래에도 반드시 통할 것이다&rdquo;를 증명하는 것이 아닙니다.
          참고 지표의 하나로 활용하되, 맹신하지 마세요.
        </p>
      </Section>
    </GuideLayout>
  );
}
