import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "주문 유형 용어",
  description:
    "시장가, 지정가, 조건부, IOC, FOK 등 주식 주문 유형을 쉽게 정리합니다.",
};

const toc = [
  { id: "market-order", label: "시장가 주문" },
  { id: "limit-order", label: "지정가 주문" },
  { id: "conditional", label: "조건부 주문" },
  { id: "special-orders", label: "특수 주문 유형 (IOC, FOK)" },
];

export default function OrderTypesDictionary() {
  return (
    <GuideLayout
      title="주문 유형 용어"
      subtitle="시장가, 지정가, 조건부, IOC, FOK 등 주문 방식 완전 정리"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
      backHref="/dictionary/"
      backLabel="용어 사전"
    >
      <Section id="market-order" title="1. 시장가 주문">
        <p>
          시장가 주문은 현재 호가창에 나와 있는 <strong className="text-white">가장 유리한 가격에 즉시 체결</strong>되는
          주문 방식입니다. 체결 속도가 가장 빠르지만, 원하는 가격에 체결되지 않을 수 있습니다.
        </p>

        <HighlightBox variant="warn">
          거래량이 적은 종목에서 시장가 주문을 하면
          <strong>&lsquo;슬리피지&rsquo;</strong>(예상과 다른 가격에 체결)가 크게 발생할 수 있습니다.
          대량 주문 시에는 지정가 주문이 더 안전합니다.
        </HighlightBox>
      </Section>

      <Section id="limit-order" title="2. 지정가 주문">
        <p>
          지정가 주문은 투자자가 <strong className="text-white">원하는 가격을 직접 지정</strong>하여
          그 가격 이하(매수) 또는 이상(매도)에서만 체결되도록 하는 주문입니다.
          원하는 가격에 거래할 수 있지만, 체결이 되지 않을 수도 있습니다.
        </p>

        <HighlightBox variant="tip">
          호가 단위에 맞춰 주문해야 합니다.
          예를 들어 5만 원 이상 종목은 100원 단위, 10만 원 이상은 500원 단위입니다.
          <strong>보통가</strong>(지정가의 기본형)가 가장 널리 사용되는 주문 방식입니다.
        </HighlightBox>
      </Section>

      <Section id="conditional" title="3. 조건부 주문">
        <p>
          조건부 주문(조건부 지정가)은 장 종료 직전까지 지정가로 주문을 넣되,
          <strong className="text-white">체결되지 않으면 장 마감 시 시장가로 자동 전환</strong>되는 주문입니다.
          &lsquo;오늘 안에 반드시 거래하고 싶지만, 가능하면 원하는 가격에&rsquo;라는 전략에 적합합니다.
        </p>

        <HighlightBox variant="info">
          조건부 주문은 <strong>장 마감 동시호가(15:20~15:30)</strong>에
          시장가로 전환됩니다. 종가 기준으로 매매하고 싶을 때 유용하지만,
          마감 직전 급변동 시에는 예상치 못한 가격에 체결될 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="special-orders" title="4. 특수 주문 유형 (IOC, FOK)">
        <p>
          <strong className="text-white">IOC(Immediate or Cancel)</strong>는
          주문 즉시 체결 가능한 수량만 체결하고 나머지는 자동 취소하는 방식입니다.
          <strong className="text-white">FOK(Fill or Kill)</strong>는
          전량 즉시 체결이 불가능하면 주문 전체를 취소합니다.
        </p>

        <HighlightBox variant="tip">
          IOC와 FOK는 주로 <strong>대량 매매나 알고리즘 트레이딩</strong>에서 사용됩니다.
          일반 개인 투자자가 자주 쓰지는 않지만, HTS/MTS에서 주문 조건을 설정할 때
          이 옵션이 있다는 것을 알아두면 도움이 됩니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
