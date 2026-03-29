import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "가치 평가 지표",
  description:
    "PER, PBR, ROE, EPS 등 기업 가치를 평가하는 핵심 밸류에이션 지표를 정리합니다.",
};

const toc = [
  { id: "per", label: "PER (주가수익비율)" },
  { id: "pbr", label: "PBR (주가순자산비율)" },
  { id: "roe", label: "ROE (자기자본이익률)" },
  { id: "eps", label: "EPS (주당순이익)" },
];

export default function ValuationDictionary() {
  return (
    <GuideLayout
      title="가치 평가 지표"
      subtitle="PER, PBR, ROE, EPS 등 핵심 밸류에이션 용어 해설"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
      backHref="/dictionary/"
      backLabel="용어 사전"
    >
      <Section id="per" title="1. PER (주가수익비율)">
        <p>
          PER(Price to Earnings Ratio)은 주가를 주당순이익(EPS)으로 나눈 값입니다.
          현재 주가가 기업이 벌어들이는 이익의 몇 배인지를 나타내며,
          주식이 <strong className="text-white">비싼지 싼지</strong>를 판단하는 가장 기본적인 지표입니다.
        </p>

        <HighlightBox variant="tip">
          <strong>PER = 주가 / EPS</strong><br />
          PER이 낮을수록 이익 대비 주가가 저평가되어 있다고 볼 수 있지만,
          업종별 평균 PER과 비교해야 의미가 있습니다.
        </HighlightBox>
      </Section>

      <Section id="pbr" title="2. PBR (주가순자산비율)">
        <p>
          PBR(Price to Book Ratio)은 주가를 주당순자산(BPS)으로 나눈 값입니다.
          기업의 자산 가치 대비 주가 수준을 보여주며,
          PBR 1 미만이면 <strong className="text-white">장부가치보다 싸게 거래</strong>되고 있다는 의미입니다.
        </p>

        <HighlightBox variant="info">
          <strong>PBR = 주가 / BPS</strong><br />
          은행, 제조업 등 자산이 중요한 업종에서 특히 유용한 지표입니다.
          IT·바이오 등 무형자산 비중이 높은 업종에서는 해석에 주의가 필요합니다.
        </HighlightBox>
      </Section>

      <Section id="roe" title="3. ROE (자기자본이익률)">
        <p>
          ROE(Return on Equity)는 자기자본 대비 얼마나 이익을 냈는지를 나타냅니다.
          투자자가 맡긴 돈으로 기업이 <strong className="text-white">얼마나 효율적으로 수익을 창출</strong>하는지
          측정하는 핵심 수익성 지표입니다.
        </p>

        <HighlightBox variant="tip">
          <strong>ROE = 당기순이익 / 자기자본 x 100</strong><br />
          워런 버핏은 ROE 15% 이상을 우량 기업의 기준으로 제시한 바 있습니다.
          다만 부채 비율이 높으면 ROE가 인위적으로 높아질 수 있으므로 함께 확인해야 합니다.
        </HighlightBox>
      </Section>

      <Section id="eps" title="4. EPS (주당순이익)">
        <p>
          EPS(Earnings Per Share)는 기업의 순이익을 발행 주식 수로 나눈 값입니다.
          한 주당 얼마의 이익을 벌었는지를 보여주며,
          <strong className="text-white">PER 계산의 기초</strong>가 되는 중요한 지표입니다.
        </p>

        <HighlightBox variant="info">
          <strong>EPS = 당기순이익 / 발행주식수</strong><br />
          EPS가 꾸준히 증가하는 기업은 이익 성장력이 있다는 신호입니다.
          분기별 EPS 추이를 확인하면 실적 개선 여부를 파악할 수 있습니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
