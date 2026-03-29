import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "기술적 분석 용어",
  description:
    "RSI, MACD, 볼린저밴드, 스토캐스틱 등 기술적 분석에 사용되는 주요 지표를 설명합니다.",
};

const toc = [
  { id: "rsi", label: "RSI (상대강도지수)" },
  { id: "macd", label: "MACD" },
  { id: "bollinger", label: "볼린저 밴드" },
  { id: "stochastic", label: "스토캐스틱" },
];

export default function TechnicalDictionary() {
  return (
    <GuideLayout
      title="기술적 분석 용어"
      subtitle="RSI, MACD, 볼린저밴드 등 주요 보조지표 해설"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
      backHref="/dictionary/"
      backLabel="용어 사전"
    >
      <Section id="rsi" title="1. RSI (상대강도지수)">
        <p>
          RSI(Relative Strength Index)는 일정 기간 동안 상승폭과 하락폭의 비율로
          <strong className="text-white">과매수·과매도 상태</strong>를 판단하는 지표입니다.
          0~100 사이의 값을 가지며, 일반적으로 14일 기준을 사용합니다.
        </p>

        <HighlightBox variant="tip">
          <strong>RSI 70 이상</strong>: 과매수 구간 (매도 고려)<br />
          <strong>RSI 30 이하</strong>: 과매도 구간 (매수 고려)<br />
          다만 강한 추세에서는 70 이상에서 오래 머무를 수 있으므로,
          다른 지표와 함께 종합적으로 판단해야 합니다.
        </HighlightBox>
      </Section>

      <Section id="macd" title="2. MACD">
        <p>
          MACD(Moving Average Convergence Divergence)는
          <strong className="text-white">두 이동평균선의 차이</strong>를 이용하여 추세의 방향과 강도를 파악합니다.
          MACD선(12일 EMA - 26일 EMA)과 시그널선(MACD의 9일 EMA)으로 구성됩니다.
        </p>

        <HighlightBox variant="info">
          <strong>MACD선이 시그널선을 상향 돌파</strong>: 매수 신호<br />
          <strong>MACD선이 시그널선을 하향 돌파</strong>: 매도 신호<br />
          히스토그램(MACD - 시그널)이 양수에서 감소하기 시작하면 상승 모멘텀이 약해지고 있다는 뜻입니다.
        </HighlightBox>
      </Section>

      <Section id="bollinger" title="3. 볼린저 밴드">
        <p>
          볼린저 밴드(Bollinger Bands)는 이동평균선을 중심으로
          <strong className="text-white">표준편차를 상하로 더하고 뺀 밴드</strong>를 그린 것입니다.
          주가의 변동성과 추세를 동시에 파악할 수 있습니다.
        </p>

        <HighlightBox variant="tip">
          밴드 폭이 <strong>좁아지면(스퀴즈)</strong> 곧 큰 움직임이 올 수 있다는 신호입니다.
          주가가 상단 밴드에 닿으면 과매수, 하단 밴드에 닿으면 과매도로 해석하지만,
          강한 추세에서는 밴드를 따라 움직이는 <strong>&lsquo;밴드 워킹&rsquo;</strong>이 나타납니다.
        </HighlightBox>
      </Section>

      <Section id="stochastic" title="4. 스토캐스틱">
        <p>
          스토캐스틱(Stochastic Oscillator)은 일정 기간의 가격 범위에서
          <strong className="text-white">현재 종가의 위치</strong>를 백분율로 나타낸 지표입니다.
          %K선(빠른 선)과 %D선(느린 선)으로 구성됩니다.
        </p>

        <HighlightBox variant="info">
          <strong>80 이상</strong>: 과매수 구간<br />
          <strong>20 이하</strong>: 과매도 구간<br />
          %K가 %D를 상향 돌파하면 매수 신호, 하향 돌파하면 매도 신호로 봅니다.
          RSI와 함께 사용하면 신뢰도가 높아집니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
