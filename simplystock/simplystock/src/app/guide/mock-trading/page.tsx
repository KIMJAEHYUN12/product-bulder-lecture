import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "모의투자 완벽 활용법",
  description:
    "SimplyStock 모의투자로 실전 투자 전 연습하는 방법. 가상 자본 운용, 매수·매도 주문, 포트폴리오 전략까지 단계별로 안내합니다.",
};

const toc = [
  { id: "why-mock", label: "왜 모의투자부터 시작해야 하는가" },
  { id: "system", label: "SimplyStock 모의투자 시스템 이해하기" },
  { id: "order", label: "매수·매도 주문 넣는 법" },
  { id: "portfolio", label: "포트폴리오 관리 전략" },
  { id: "real-trading", label: "모의투자에서 실전으로" },
];

export default function MockTradingGuide() {
  return (
    <GuideLayout
      title="모의투자 완벽 활용법"
      subtitle="실전 전 반드시 거쳐야 할 가상 매매 연습의 모든 것"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
    >
      <Section id="why-mock" title="1. 왜 모의투자부터 시작해야 하는가">
        <p>
          주식 투자를 처음 시작할 때 가장 위험한 것은 지식 부족이 아니라{" "}
          <strong className="text-white">경험 부족</strong>입니다.
          아무리 책을 많이 읽어도 실제로 주문 버튼을 누르는 순간의 긴장감,
          보유 종목이 하락할 때의 불안감, 수익이 날 때 더 벌고 싶은 욕심은
          직접 겪어봐야 비로소 이해할 수 있습니다.
        </p>
        <p className="mt-3">
          모의투자는 이런 심리적 훈련을 <strong className="text-white">돈 한 푼 잃지 않고</strong> 할 수 있는
          유일한 방법입니다. 프로 운동선수가 경기 전에 연습 경기를 하듯이,
          투자자도 실전 전에 충분한 시뮬레이션을 거쳐야 합니다.
        </p>

        <HighlightBox variant="tip">
          <strong>핵심 포인트:</strong> 모의투자의 목적은 수익을 내는 것이 아니라,
          자신만의 매매 규칙을 만들고 그 규칙을 지킬 수 있는 습관을 기르는 데 있습니다.
          실전에서 감정에 휘둘리지 않으려면 모의투자에서 충분히 연습하세요.
        </HighlightBox>
      </Section>

      <Section id="system" title="2. SimplyStock 모의투자 시스템 이해하기">
        <p>
          SimplyStock의 모의투자는 실제 시장과 최대한 동일한 환경을 제공합니다.
          처음 시작하면 <strong className="text-white">가상 자본 1,000만 원</strong>이 지급됩니다.
          이 금액은 실제 초보 투자자가 시작하기에 현실적인 규모로 설정되었습니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-white font-bold">실시간 시세</span>
            <span className="text-xs text-zinc-300">
              실제 주식 시장의 현재가를 반영하여 매매합니다.
              장 마감 후에는 종가 기준으로 포트폴리오가 평가됩니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-white font-bold">18시 정산</span>
            <span className="text-xs text-zinc-300">
              매일 오후 6시에 포트폴리오 수익률이 정산되어 랭킹에 반영됩니다.
              일일 수익률 변동을 추적할 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-white font-bold">섹터 분류</span>
            <span className="text-xs text-zinc-300">
              종목이 업종별로 분류되어 있어 관심 있는 섹터의 종목을 빠르게 찾을 수 있습니다.
              반도체, 2차전지, 바이오 등 주요 테마별 탐색이 가능합니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="info">
          모의투자는 로그인 없이도 게스트 모드로 이용할 수 있습니다.
          다만 로그인하면 포트폴리오가 클라우드에 저장되어 기기 간 동기화가 가능하고,
          랭킹 참여도 할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="order" title="3. 매수·매도 주문 넣는 법">
        <p>
          SimplyStock의 주문 과정은 실제 증권사 앱과 유사하게 설계되었습니다.
          다음 단계를 따라 첫 주문을 넣어보세요.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 1. 섹터 탭에서 업종 선택</p>
            <p className="text-xs text-zinc-300">
              상단 섹터 탭을 가로 스크롤하여 관심 업종을 선택합니다.
              &lsquo;전체&rsquo; 탭을 누르면 모든 종목이 표시됩니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 2. 종목 선택</p>
            <p className="text-xs text-zinc-300">
              종목 리스트에서 매수하고 싶은 종목을 탭합니다.
              현재가, 등락률, 거래량 정보를 확인할 수 있습니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-cyan-400 mb-1">Step 3. 수량 설정 및 주문</p>
            <p className="text-xs text-zinc-300">
              주문 모달에서 수량을 직접 입력하거나, 10%/25%/50%/100% 퍼센트 버튼으로
              보유 현금 대비 비율을 설정합니다. 매수/매도 버튼을 눌러 주문을 완료합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="warn">
          모의투자에서는 <strong>시장가 즉시 체결</strong> 방식입니다.
          실전에서는 호가 단위, 체결 대기 시간, 미체결 등의 변수가 있으므로
          이 차이를 인지하고 있어야 합니다.
        </HighlightBox>
      </Section>

      <Section id="portfolio" title="4. 포트폴리오 관리 전략">
        <p>
          모의투자에서 수익을 내는 것보다 중요한 것은{" "}
          <strong className="text-white">포트폴리오를 관리하는 습관</strong>을 기르는 것입니다.
          다음 원칙들을 모의투자에서 연습해보세요.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">분산투자</span>
            <span className="text-xs text-zinc-300">
              1,000만 원을 한 종목에 몰빵하지 마세요.
              3~5개 종목에 나누어 투자하면 한 종목의 급락이 전체 포트폴리오에 미치는 충격을 줄일 수 있습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">현금 비중</span>
            <span className="text-xs text-zinc-300">
              항상 전체 자산의 20~30%는 현금으로 보유하세요.
              좋은 매수 기회가 왔을 때 투자할 여력이 없으면 아무 의미가 없습니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">손절 기준</span>
            <span className="text-xs text-zinc-300">
              매수 전에 &lsquo;몇 퍼센트 손실에서 손절할 것인가&rsquo;를 미리 정하세요.
              보통 -5%~-10%가 일반적입니다. 규칙 없이 버티는 것은 투자가 아니라 도박입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">익절 기준</span>
            <span className="text-xs text-zinc-300">
              목표 수익률에 도달하면 일부 또는 전부를 매도하세요.
              &lsquo;더 오를 것 같은데&rsquo;라는 욕심은 수익을 날리는 가장 흔한 원인입니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>수익률 읽는 법:</strong> 포트폴리오 상단에 표시되는 총 수익률은
          (현재 평가금액 - 투자 원금) / 투자 원금 &times; 100으로 계산됩니다.
          개별 종목의 수익률도 같은 방식으로 산출됩니다.
        </HighlightBox>
      </Section>

      <Section id="real-trading" title="5. 모의투자에서 실전으로">
        <p>
          모의투자에서 꾸준히 수익을 냈다고 바로 실전에 뛰어들면 안 됩니다.
          모의투자와 실전 사이에는 몇 가지 중요한 차이가 있습니다.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">모의투자</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 즉시 체결, 슬리피지 없음</li>
              <li>- 감정적 압박 적음</li>
              <li>- 수수료/세금 없음</li>
              <li>- 손실해도 타격 없음</li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">실전 투자</p>
            <ul className="text-[11px] text-gray-400 leading-relaxed space-y-1">
              <li>- 호가 차이로 불리한 체결</li>
              <li>- 공포·탐욕에 판단 흐림</li>
              <li>- 수수료 0.015% + 세금 0.2%</li>
              <li>- 실제 자산 감소의 고통</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="warn">
          <strong>실전 전환 체크리스트:</strong>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>모의투자에서 최소 1개월 이상 꾸준히 매매했는가?</li>
            <li>자신만의 매매 규칙(진입/손절/익절)이 정립되었는가?</li>
            <li>감정적 매매 없이 규칙을 지킬 수 있는가?</li>
            <li>잃어도 생활에 지장 없는 여유 자금인가?</li>
          </ul>
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
