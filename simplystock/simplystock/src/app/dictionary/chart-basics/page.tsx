import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "차트 기본 용어",
  description:
    "캔들 차트, 이동평균선, 거래량, 지지선과 저항선 등 주식 차트의 기본 용어를 쉽게 설명합니다.",
};

const toc = [
  { id: "candle", label: "캔들(봉) 차트" },
  { id: "moving-average", label: "이동평균선" },
  { id: "volume", label: "거래량" },
  { id: "support-resistance", label: "지지선과 저항선" },
];

export default function ChartBasicsDictionary() {
  return (
    <GuideLayout
      title="차트 기본 용어"
      subtitle="캔들, 이동평균선, 거래량, 지지/저항 등 차트 읽기의 기초"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
      backHref="/dictionary/"
      backLabel="용어 사전"
    >
      <Section id="candle" title="1. 캔들(봉) 차트">
        <p>
          캔들 차트는 일정 기간의 <strong className="text-white">시가, 고가, 저가, 종가</strong>(OHLC)를
          하나의 봉으로 표현합니다. 양봉(상승)은 빨간색, 음봉(하락)은 파란색으로 표시하는 것이
          한국 시장의 관례입니다.
        </p>

        <HighlightBox variant="tip">
          캔들의 <strong>몸통</strong>은 시가와 종가 사이의 범위를,
          <strong>꼬리(그림자)</strong>는 고가·저가까지의 범위를 나타냅니다.
          긴 아래꼬리는 매수세의 유입을, 긴 윗꼬리는 매도 압력을 시사합니다.
        </HighlightBox>
      </Section>

      <Section id="moving-average" title="2. 이동평균선">
        <p>
          이동평균선(Moving Average)은 일정 기간 동안의 종가 평균을 선으로 연결한 것입니다.
          <strong className="text-white">5일선(단기), 20일선(중기), 60일선(장기), 120일선(반기)</strong> 등이
          주로 사용됩니다.
        </p>

        <HighlightBox variant="info">
          이동평균선이 위로 정배열(단기선이 장기선 위)이면 상승 추세,
          아래로 역배열이면 하락 추세로 해석합니다.
          골든크로스(단기선이 장기선을 상향 돌파)와
          데드크로스(단기선이 장기선을 하향 돌파)는 추세 전환 신호입니다.
        </HighlightBox>
      </Section>

      <Section id="volume" title="3. 거래량">
        <p>
          거래량은 일정 기간 동안 거래된 주식의 수입니다.
          <strong className="text-white">가격 변동의 신뢰도</strong>를 판단하는 데 핵심적인 역할을 합니다.
          주가 상승 시 거래량이 동반되면 상승의 힘이 강하다고 해석합니다.
        </p>

        <HighlightBox variant="warn">
          거래량 없는 상승은 <strong>&lsquo;빈 깡통&rsquo;</strong>일 수 있습니다.
          반대로 하락 시 거래량이 급증하면 투매(패닉 셀링)가 발생하고 있을 수 있으니 주의가 필요합니다.
        </HighlightBox>
      </Section>

      <Section id="support-resistance" title="4. 지지선과 저항선">
        <p>
          <strong className="text-white">지지선</strong>은 주가가 하락할 때 더 이상 떨어지지 않고 반등하는 가격대이고,
          <strong className="text-white">저항선</strong>은 주가가 상승할 때 더 이상 오르지 못하고 되돌아오는 가격대입니다.
        </p>

        <HighlightBox variant="tip">
          지지선이 뚫리면 그 가격대가 새로운 저항선이 되고,
          저항선이 돌파되면 새로운 지지선이 됩니다.
          이전에 거래량이 많았던 가격대가 강한 지지/저항 역할을 합니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
