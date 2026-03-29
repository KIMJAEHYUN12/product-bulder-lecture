import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "회귀 채널로 보는 저평가 구간 판단법",
  description:
    "회귀 채널 하단(-2σ, -3σ)의 통계적 의미와 저평가 구간 진입 시 확인해야 할 핵심 지표를 정리합니다.",
};

const toc = [
  { id: "feeling-trap", label: '"싸다"는 느낌의 함정' },
  { id: "sigma-meaning", label: "채널 하단(-2σ, -3σ)의 통계적 의미" },
  { id: "confirm-checklist", label: "저평가 구간 진입 시 확인할 것" },
  { id: "trap-cases", label: "채널 하단이 매수 기회가 아닌 경우" },
  { id: "practical-checklist", label: "실전 체크리스트" },
];

export default function RegressionUndervaluePage() {
  return (
    <GuideLayout
      title="회귀 채널로 보는 저평가 구간 판단법"
      subtitle={'"싸 보인다"와 "통계적으로 저평가"는 완전히 다릅니다'}
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
      backHref="/analysis/"
      backLabel="자료실"
    >
      <Section id="feeling-trap" title={'1. "싸다"는 느낌의 함정'}>
        <p>
          주가가 많이 떨어지면 자연스럽게 &lsquo;싸졌다&rsquo;는 생각이 듭니다.
          고점 대비 30% 빠졌으니 지금이 기회라고 느끼는 것이죠.
          하지만 이 판단에는 치명적인 오류가 숨어 있습니다.
        </p>
        <p className="mt-3">
          &lsquo;싸다&rsquo;는 감각은 <strong className="text-white">기준점이 과거 고점</strong>에
          고정되어 있기 때문에 생기는 착각입니다.
          행동경제학에서는 이를 <strong className="text-white">앵커링 편향(Anchoring Bias)</strong>이라고 부릅니다.
          고점이 5만 원이었던 종목이 3만 5천 원이 되면 싸 보이지만,
          그 종목의 적정 가치가 2만 원이라면 여전히 비싼 것입니다.
        </p>
        <p className="mt-3">
          반대로, 꾸준히 우상향하던 종목이 일시적으로 조정을 받아
          채널 하단에 위치한다면, 절대 가격은 높아 보여도
          통계적으로는 저평가 구간일 수 있습니다.
          중요한 것은 <strong className="text-white">절대 가격이 아니라 추세 대비 위치</strong>입니다.
        </p>

        <HighlightBox variant="warn">
          &lsquo;반 토막 났으니 싸다&rsquo;는 판단은 앵커링 편향의 대표적 예시입니다.
          가격의 절대값이 아니라, 현재 추세 안에서 주가가 어디에 있는지를 봐야 합니다.
        </HighlightBox>
      </Section>

      <Section id="sigma-meaning" title="2. 채널 하단(-2σ, -3σ)의 통계적 의미">
        <p>
          회귀 채널은 선형 회귀선을 중심으로 표준편차(σ) 배수만큼
          상하로 밴드를 그린 것입니다.
          각 밴드는 주가가 해당 범위 안에 머물 통계적 확률을 나타냅니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-14 shrink-0 text-xs text-amber-400 font-bold font-mono">&plusmn;1&sigma;</span>
            <span className="text-xs text-zinc-300">
              주가가 <strong className="text-white">68.2%</strong> 확률로 머무는 정상 범위.
              이 안에서의 등락은 일상적인 변동으로 볼 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-3 py-3">
            <span className="w-14 shrink-0 text-xs text-indigo-400 font-bold font-mono">-2&sigma;</span>
            <span className="text-xs text-zinc-300">
              하단 2σ 밖에 있을 확률은 약 <strong className="text-white">2.3%</strong>.
              통계적으로 &lsquo;드문 하락&rsquo;이며, 평균 회귀 가능성이 높아지는 구간입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-3">
            <span className="w-14 shrink-0 text-xs text-red-400 font-bold font-mono">-3&sigma;</span>
            <span className="text-xs text-zinc-300">
              이 구간에 도달할 확률은 약 <strong className="text-white">0.15%</strong>.
              극단적 패닉이거나 펀더멘탈 자체가 변한 경우입니다.
              반등 확률이 높지만, 펀더멘탈 훼손이라면 채널 자체가 재설정됩니다.
            </span>
          </div>
        </div>

        <p className="mt-4">
          핵심은 이것입니다. -2σ 이하에 주가가 위치한다는 것은
          <strong className="text-white">&lsquo;현재 추세가 유지된다는 전제 하에&rsquo;</strong>
          통계적으로 과매도 상태라는 뜻입니다.
          하지만 추세 자체가 꺾일 수 있기 때문에,
          이 수치만으로 매수 근거를 삼아서는 안 됩니다.
        </p>

        <HighlightBox variant="info">
          표준편차 기반 밴드는 <strong>정규분포</strong>를 전제합니다.
          실제 주가는 꼬리가 두꺼운(fat-tail) 분포를 따르기 때문에,
          -3σ 이탈이 이론적 확률(0.15%)보다 더 자주 발생할 수 있습니다.
          통계적 확률은 참고 지표이지 절대적 기준이 아닙니다.
        </HighlightBox>
      </Section>

      <Section id="confirm-checklist" title="3. 저평가 구간 진입 시 확인할 것">
        <p>
          채널 하단에 주가가 도달했다면, 바로 행동하기보다
          다음 세 가지를 순서대로 확인해야 합니다.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">A. 거래량 패턴</h3>
            <p>
              채널 하단 도달 시 거래량이 <strong className="text-white">급증하면서 양봉</strong>이 나온다면,
              큰 자금이 매집에 나섰을 가능성이 있습니다.
              반대로 거래량 없이 하락이 이어진다면,
              관심 자체가 사라진 종목일 수 있습니다.
            </p>
            <p className="mt-2">
              특히 &lsquo;거래량 바닥 → 거래량 급증&rsquo; 패턴은
              세력의 매집 시작 신호로 해석되는 경우가 많습니다.
              다만 거래량 급증이 공매도 청산이나 프로그램 매매에 의한 것일 수도 있으므로,
              수급 데이터와 교차 확인이 필요합니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">B. 수급 흐름</h3>
            <p>
              개인이 투매하는 동안 외국인이나 기관이 순매수로 전환했는지 확인합니다.
              특히 <strong className="text-white">개인 순매도 + 외국인 순매수</strong> 조합은
              역사적으로 반등 전 자주 나타나는 패턴입니다.
            </p>
            <p className="mt-2">
              수급이 한두 거래일만 바뀐 것이 아니라,
              <strong className="text-white">3~5거래일 이상 지속적으로</strong> 외국인이나 기관이
              매수세를 유지하는지가 중요합니다.
              하루 반짝 매수는 의미가 약합니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">C. 채널 기울기</h3>
            <p>
              가장 간과하기 쉬운 요소입니다.
              채널의 중심선(회귀선) 기울기가 <strong className="text-white">우상향을 유지</strong>하고 있다면,
              하단 터치는 추세 내 일시적 조정으로 볼 수 있습니다.
            </p>
            <p className="mt-2">
              하지만 기울기가 평평해지거나 우하향으로 전환되었다면,
              추세 자체가 꺾이고 있다는 신호입니다.
              이 경우 채널 하단은 &lsquo;저평가&rsquo;가 아니라
              <strong className="text-white">&lsquo;새로운 하락 추세의 시작&rsquo;</strong>일 수 있습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          세 가지 조건을 정리하면: <strong>(1) 거래량이 살아나고 (2) 수급이 전환되며 (3) 기울기가 유지</strong>될 때,
          채널 하단은 통계적 저평가 구간으로서 의미를 가집니다.
          셋 중 하나라도 빠지면 신뢰도가 크게 떨어집니다.
        </HighlightBox>
      </Section>

      <Section id="trap-cases" title="4. 채널 하단이 매수 기회가 아닌 경우">
        <p>
          채널 하단 도달이 항상 반등으로 이어지지는 않습니다.
          다음과 같은 상황에서는 채널 분석이 무력화되므로 주의가 필요합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-1">펀더멘탈 훼손</p>
            <p className="text-xs text-zinc-300">
              대규모 적자 전환, 주력 사업 철수, 회계 이슈 등으로
              기업의 본질적 가치가 변한 경우, 과거 데이터로 만든 채널은
              더 이상 유효하지 않습니다. 채널이 아래로 재설정될 뿐입니다.
            </p>
          </div>

          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-1">업종 전체 하락</p>
            <p className="text-xs text-zinc-300">
              개별 종목이 아니라 업종 자체가 구조적으로 하락하는 경우,
              해당 업종 내 모든 종목의 채널이 동시에 무너집니다.
              예를 들어 반도체 다운사이클에서는 우량주도 채널 하단을 이탈하지만,
              이는 저평가가 아니라 사이클 하락입니다.
            </p>
          </div>

          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-1">유동성 고갈</p>
            <p className="text-xs text-zinc-300">
              거래량이 극히 적어진 종목은 호가 스프레드가 벌어지고,
              소량의 매도만으로도 주가가 크게 움직입니다.
              이런 종목에서 채널 하단 도달은 통계적 의미보다
              유동성 부족에 따른 가격 왜곡일 가능성이 큽니다.
            </p>
          </div>

          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-1">외부 충격 (시스템 리스크)</p>
            <p className="text-xs text-zinc-300">
              금융위기, 전쟁, 팬데믹 같은 시스템 리스크 상황에서는
              모든 통계 모델이 무력화됩니다.
              과거 데이터의 정규성 가정이 무너지기 때문에,
              표준편차 기반 밴드는 참고 가치를 잃습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="warn">
          채널 하단 도달 시 &lsquo;왜 떨어졌는가?&rsquo;를 먼저 파악하세요.
          일시적 수급 이탈인지, 펀더멘탈 변화인지에 따라
          같은 -2σ 위치라도 의미가 완전히 달라집니다.
        </HighlightBox>
      </Section>

      <Section id="practical-checklist" title="5. 실전 체크리스트">
        <p>
          채널 하단에 위치한 종목을 발견했을 때,
          아래 체크리스트를 순서대로 점검해 보세요.
        </p>

        <div className="mt-4 space-y-2">
          {[
            { step: "1", title: "채널 기울기 확인", desc: "중심선이 우상향 또는 최소한 평행인가? 우하향이면 추세 전환 가능성." },
            { step: "2", title: "하락 원인 파악", desc: "시장 전체 조정인가, 업종 하락인가, 개별 악재인가? 개별 악재라면 내용을 정확히 확인." },
            { step: "3", title: "수급 전환 여부", desc: "외국인 또는 기관의 순매수 전환이 3거래일 이상 지속되는가?" },
            { step: "4", title: "거래량 회복", desc: "최근 거래량이 20일 평균 대비 증가세인가? 양봉 거래량이 음봉보다 큰가?" },
            { step: "5", title: "동종 업종 비교", desc: "같은 업종 내 다른 종목도 비슷한 위치인가? 해당 종목만 유독 빠졌다면 개별 리스크 의심." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[11px] font-bold text-indigo-400">
                {item.step}
              </span>
              <div>
                <p className="text-xs font-bold text-white mb-0.5">{item.title}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <HighlightBox variant="info">
          위 5가지 중 4개 이상 충족될 때 &lsquo;통계적 저평가 구간&rsquo;으로서
          의미 있는 관심 대상이 됩니다.
          단, 이는 분석 기준일 뿐 매수 신호가 아닙니다.
          최종 투자 판단은 반드시 본인의 책임 하에 이루어져야 합니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
