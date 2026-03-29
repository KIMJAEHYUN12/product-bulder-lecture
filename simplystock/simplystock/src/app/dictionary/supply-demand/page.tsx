import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "수급 용어 정리",
  description:
    "순매수, 순매도, 프로그램 매매, 공매도, 투자 주체별 구분 등 수급 관련 핵심 용어.",
};

const toc = [
  { id: "net-buying", label: "순매수와 순매도" },
  { id: "program-trading", label: "프로그램 매매" },
  { id: "short-selling", label: "공매도" },
  { id: "investor-types", label: "투자 주체별 구분" },
];

export default function SupplyDemandDictionary() {
  return (
    <GuideLayout
      title="수급 용어 정리"
      subtitle="순매수, 프로그램매매, 공매도 등 수급 분석의 핵심 용어"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
      backHref="/dictionary/"
      backLabel="용어 사전"
    >
      <Section id="net-buying" title="1. 순매수와 순매도">
        <p>
          <strong className="text-white">순매수</strong>는 특정 투자 주체가 매수한 금액(또는 수량)에서
          매도한 금액을 뺀 값입니다. 양수이면 매수 우위, 음수이면 매도 우위(순매도)를 의미합니다.
        </p>

        <HighlightBox variant="tip">
          외국인과 기관의 순매수가 동시에 발생하는 종목은
          <strong>&lsquo;쌍끌이 매수&rsquo;</strong>로 불리며, 주가 상승의 강한 동력이 됩니다.
          반대로 동반 매도는 하락 압력이 큽니다.
        </HighlightBox>
      </Section>

      <Section id="program-trading" title="2. 프로그램 매매">
        <p>
          프로그램 매매는 컴퓨터가 미리 정해진 조건에 따라 자동으로 실행하는 매매입니다.
          <strong className="text-white">차익 거래</strong>(선물·현물 가격 차이를 이용)와
          <strong className="text-white">비차익 거래</strong>(바스켓 매매 등)로 나뉩니다.
        </p>

        <HighlightBox variant="info">
          프로그램 매수 잔고가 높으면 향후 매물 출회 가능성이 있고,
          프로그램 매도가 집중되면 일시적인 수급 악화가 발생할 수 있습니다.
          만기일(선물·옵션 동시 만기)에는 프로그램 물량이 크게 출렁이므로 주의가 필요합니다.
        </HighlightBox>
      </Section>

      <Section id="short-selling" title="3. 공매도">
        <p>
          공매도(Short Selling)는 주식을 보유하지 않은 상태에서 빌려서 먼저 매도한 뒤,
          나중에 더 낮은 가격에 다시 사들여 갚는 거래 방식입니다.
          <strong className="text-white">주가 하락에 베팅</strong>하는 전략입니다.
        </p>

        <HighlightBox variant="warn">
          공매도 잔고가 높은 종목은 향후 <strong>숏커버링</strong>(공매도 상환을 위한 매수)이
          발생하면 급등할 수 있지만, 공매도 세력이 강하다는 것은
          해당 종목에 하락 압력이 있다는 신호이기도 합니다.
        </HighlightBox>
      </Section>

      <Section id="investor-types" title="4. 투자 주체별 구분">
        <p>
          한국 주식시장의 투자 주체는 크게
          <strong className="text-white">외국인, 기관(금융투자·보험·투신·연기금 등), 개인</strong>으로 구분됩니다.
          각 주체의 매매 패턴은 시장의 방향성을 판단하는 중요한 참고 지표입니다.
        </p>

        <HighlightBox variant="tip">
          일반적으로 외국인과 기관은 정보력과 자금력에서 우위를 가지므로,
          이들의 수급 흐름을 추종하는 전략이 많이 활용됩니다.
          다만 모든 수급 지표는 <strong>후행 데이터</strong>이므로 맹신은 금물입니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
