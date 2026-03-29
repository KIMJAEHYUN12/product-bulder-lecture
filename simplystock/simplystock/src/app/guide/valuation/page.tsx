import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "PER 밴드 분석 활용법",
  description:
    "PER 밴드 차트로 주식의 고평가·저평가를 판단하는 방법. EPS, Forward PER, 업종별 해석 차이까지 체계적으로 안내합니다.",
};

const toc = [
  { id: "expensive-or-cheap", label: "주식이 비싼지 싼지, 어떻게 알 수 있을까" },
  { id: "per-band", label: "PER 밴드 차트 읽는 법" },
  { id: "eps-forward", label: "EPS와 Forward PER의 의미" },
  { id: "sector-diff", label: "업종별 PER 해석 차이" },
  { id: "pitfalls", label: "PER 밴드만 보면 안 되는 이유" },
];

export default function ValuationGuide() {
  return (
    <GuideLayout
      title="PER 밴드 분석 활용법"
      subtitle="주식의 가격표를 읽는 가장 기본적이면서 강력한 도구"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
    >
      <Section id="expensive-or-cheap" title="1. 주식이 비싼지 싼지, 어떻게 알 수 있을까">
        <p>
          삼성전자가 6만 원이면 싼 걸까요, 비싼 걸까요?
          주가의 <strong className="text-white">절대 금액만으로는 판단할 수 없습니다</strong>.
          10만 원짜리 주식이 저평가일 수도 있고, 1,000원짜리 주식이 고평가일 수도 있습니다.
        </p>
        <p className="mt-3">
          주식의 &ldquo;비싸다/싸다&rdquo;를 판단하려면{" "}
          <strong className="text-white">기업이 벌어들이는 돈(이익) 대비 주가가 어느 수준인지</strong>를 봐야 합니다.
          이것이 바로 PER(주가수익비율)이며, PER 밴드 차트는 이 비율의 역사적 흐름을 시각화한 것입니다.
        </p>

        <HighlightBox variant="tip">
          <strong>비유하자면:</strong> 아파트 가격이 5억이라고 해서 비싼지 싼지 알 수 없지만,
          &ldquo;연간 임대 수익 대비 몇 배인가&rdquo;를 보면 판단할 수 있습니다.
          PER이 바로 이 &ldquo;몇 배&rdquo;에 해당합니다.
        </HighlightBox>
      </Section>

      <Section id="per-band" title="2. PER 밴드 차트 읽는 법">
        <p>
          SimplyStock의 PER 밴드 차트는 과거 PER 범위를 5개 밴드로 나누어 보여줍니다.
          현재 주가가 이 밴드 중 어디에 위치하는지를 확인하면 됩니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-red-400 font-bold">최대 PER</span>
            <span className="text-xs text-zinc-300">
              과거에 기록한 가장 높은 PER 수준입니다.
              현재 주가가 이 선에 가까우면 역사적으로 가장 비싼 구간에 있다는 뜻입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">75% 밴드</span>
            <span className="text-xs text-zinc-300">
              과거 PER 분포의 상위 25% 구간입니다.
              시장이 이 기업에 대해 상당히 낙관적인 상태를 반영합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-white font-bold">중앙값</span>
            <span className="text-xs text-zinc-300">
              과거 PER의 중간값입니다. 시장이 이 기업을 &ldquo;평균적&rdquo;으로 평가하는 수준입니다.
              매수/매도 판단의 기준선으로 활용합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10 px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-cyan-400 font-bold">25% 밴드</span>
            <span className="text-xs text-zinc-300">
              과거 PER 분포의 하위 25% 구간입니다.
              시장이 비관적이거나, 저평가 가능성이 있는 영역입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-emerald-400 font-bold">최소 PER</span>
            <span className="text-xs text-zinc-300">
              과거에 기록한 가장 낮은 PER 수준입니다.
              이 선 부근이면 역사적으로 가장 저평가된 구간이지만, 실적 악화 가능성도 점검해야 합니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="info">
          주가가 중앙값 밴드 아래에 있으면서 실적(EPS)이 성장하고 있다면,
          통계적으로 매수를 고려할 수 있는 구간입니다.
          반대로 최대 밴드 근처에서 실적이 둔화되고 있다면 주의가 필요합니다.
        </HighlightBox>
      </Section>

      <Section id="eps-forward" title="3. EPS와 Forward PER의 의미">
        <p>
          PER을 제대로 이해하려면 그 분모인{" "}
          <strong className="text-white">EPS(주당순이익)</strong>를 알아야 합니다.
          PER = 주가 / EPS이므로, EPS가 변하면 PER도 변합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">Trailing PER (과거 기준)</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              최근 4분기 실적을 기준으로 계산한 PER입니다.
              이미 확정된 숫자이므로 정확하지만, 과거를 반영할 뿐 미래를 보여주지 않습니다.
              실적이 급변하는 기업에서는 오해를 유발할 수 있습니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">Forward PER (미래 기준)</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              향후 12개월 예상 실적을 기준으로 계산한 PER입니다.
              시장의 기대치를 반영하므로 주가 방향성 판단에 더 유용합니다.
              다만 애널리스트 추정치에 기반하므로 실제와 다를 수 있습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>EPS 추이를 함께 보세요.</strong>
          PER이 낮아 보여도 EPS가 하락 추세라면 &ldquo;저평가&rdquo;가 아니라 &ldquo;실적 악화&rdquo;일 수 있습니다.
          반대로 PER이 높아 보여도 EPS가 급성장 중이라면 합리적인 수준일 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="sector-diff" title="4. 업종별 PER 해석 차이">
        <p>
          PER의 적정 수준은 업종마다 크게 다릅니다.
          <strong className="text-white"> 같은 PER 20배라도 업종에 따라 의미가 완전히 다릅니다</strong>.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-indigo-400 font-bold">IT/반도체</span>
            <span className="text-xs text-zinc-300">
              성장 기대가 높은 업종이므로 PER 15~30배도 정상 범위입니다.
              경기 사이클에 따라 PER이 크게 변동하는 특성이 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-emerald-400 font-bold">바이오/헬스</span>
            <span className="text-xs text-zinc-300">
              미래 성장 가능성에 베팅하는 업종이라 PER 50배 이상도 흔합니다.
              적자 기업은 PER 자체가 산출되지 않으므로 PSR(주가매출비율) 등을 대신 사용합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-amber-400 font-bold">금융/은행</span>
            <span className="text-xs text-zinc-300">
              안정적이지만 성장성이 낮은 업종이므로 PER 5~10배가 일반적입니다.
              PER 15배 이상이면 오히려 고평가를 의심해야 합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-24 shrink-0 text-xs text-cyan-400 font-bold">제조/화학</span>
            <span className="text-xs text-zinc-300">
              경기 민감 업종으로 PER 8~15배가 보통입니다.
              호황기에는 PER이 낮아 보이고(이익 급증), 불황기에는 PER이 높아지는(이익 급감) 역설이 있습니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="warn">
          <strong>동일 업종 내에서 비교하세요.</strong>
          삼성전자(반도체)와 KB금융(은행)의 PER을 직접 비교하는 것은 의미가 없습니다.
          반드시 같은 업종, 비슷한 규모의 기업끼리 비교해야 합니다.
        </HighlightBox>
      </Section>

      <Section id="pitfalls" title="5. PER 밴드만 보면 안 되는 이유">
        <p>
          PER 밴드는 강력한 도구이지만, 이것만으로 투자 결정을 내리면 안 됩니다.
          다음과 같은 함정이 있습니다.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-red-400 mb-2">적자 전환의 함정</h3>
            <p>
              기업이 적자로 전환하면 EPS가 마이너스가 되어 PER 자체가 의미를 잃습니다.
              PER 밴드 차트에서 갑자기 밴드가 뒤집히거나 사라지는 경우가 이에 해당합니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-400 mb-2">일회성 이익의 함정</h3>
            <p>
              부동산 매각, 소송 보상금 등 일회성 이익으로 EPS가 급증하면
              PER이 갑자기 낮아져 &ldquo;저평가&rdquo;처럼 보입니다.
              하지만 이는 지속 가능한 이익이 아니므로 다음 분기에 PER이 원래 수준으로 돌아갑니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-400 mb-2">성장 둔화의 함정</h3>
            <p>
              과거 고성장으로 높은 PER을 받던 기업이 성장이 둔화되면,
              시장은 PER을 대폭 낮춰 평가합니다. 과거 PER 밴드가 더 이상 유효하지 않게 되는 것입니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          PER 밴드 분석은 반드시 <strong>수급 흐름, 실적 추이, 업황 분석</strong>과 함께 종합적으로 활용하세요.
          SimplyStock의 다른 분석 도구(회귀 채널, 수급 분석)와 결합하면 판단의 정밀도가 크게 올라갑니다.
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">관련 종목 분석</p>
        <div className="flex flex-wrap gap-2">
          <a href="/stock/005930/" className="text-xs text-indigo-400 hover:underline">삼성전자 PER 밴드 분석 →</a>
          <a href="/stock/005380/" className="text-xs text-indigo-400 hover:underline">현대차 밸류에이션 →</a>
          <a href="/stock/" className="text-xs text-[var(--text-muted)] hover:underline">전체 종목 보기 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
