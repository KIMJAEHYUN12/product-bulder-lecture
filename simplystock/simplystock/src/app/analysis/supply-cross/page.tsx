import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "개인이 팔 때 외인이 산다 — 수급 크로스의 의미",
  description:
    "개인-외국인 수급 크로스가 왜 중요한지, 기관 매매의 한계와 함께 역사적 패턴을 분석합니다.",
};

const toc = [
  { id: "why-cross", label: "왜 개인-외인 크로스에 주목하는가" },
  { id: "institution-limit", label: "기관 매매의 한계" },
  { id: "bullish-cross", label: "개인 매도 + 외인 매수 크로스" },
  { id: "bearish-cross", label: "개인 매수 + 외인 매도의 위험 신호" },
  { id: "how-to-read", label: "수급 흐름 차트에서 크로스 읽는 법" },
];

export default function SupplyCrossPage() {
  return (
    <GuideLayout
      title="개인이 팔 때 외인이 산다 — 수급 크로스의 의미"
      subtitle="수급의 교차점에서 시장의 방향이 바뀝니다"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
      backHref="/analysis/"
      backLabel="자료실"
    >
      <Section id="why-cross" title="1. 왜 개인-외인 크로스에 주목하는가">
        <p>
          주식 시장에는 세 주체가 있습니다.
          개인 투자자, 외국인 투자자, 그리고 기관 투자자.
          이 세 주체의 매매 방향이 엇갈리는 순간,
          시장에 중요한 변화가 일어나는 경우가 많습니다.
        </p>
        <p className="mt-3">
          그중에서도 <strong className="text-white">개인과 외국인의 매매 방향이 정반대로 교차</strong>하는 현상,
          이른바 &lsquo;수급 크로스&rsquo;는 특히 주목할 가치가 있습니다.
          이유는 간단합니다. 한국 주식 시장에서 개인과 외국인은
          정보력, 투자 기간, 행동 패턴이 가장 극명하게 다른 두 주체이기 때문입니다.
        </p>
        <p className="mt-3">
          개인 투자자는 뉴스와 감정에 반응하는 경향이 강하고,
          외국인 투자자는 글로벌 자금 흐름과 밸류에이션에 기반해 움직입니다.
          이 두 주체가 정반대로 행동할 때,
          누군가의 판단이 틀렸다는 뜻이고, 역사적으로 그 &lsquo;누군가&rsquo;는
          개인인 경우가 더 많았습니다.
        </p>

        <HighlightBox variant="info">
          수급 크로스는 &lsquo;누가 옳은가&rsquo;의 문제가 아닙니다.
          정보 비대칭과 투자 호라이즌의 차이에서 발생하는
          <strong> 구조적 패턴</strong>으로 이해해야 합니다.
          개인이 항상 틀리는 것이 아니라,
          대규모 수급 전환 시점에서 외국인의 판단이 더 오래 유효한 경향이 있다는 뜻입니다.
        </HighlightBox>
      </Section>

      <Section id="institution-limit" title="2. 기관 매매의 한계">
        <p>
          &lsquo;기관이 사면 좋은 거 아닌가?&rsquo;라는 질문을 자주 받습니다.
          하지만 한국 시장에서 기관 매매는 몇 가지 구조적 한계가 있어,
          수급 분석의 핵심 축으로 삼기 어렵습니다.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">프로그램 매매 비중</h3>
            <p>
              기관 매매의 상당 부분은 차익거래·인덱스 리밸런싱 등
              프로그램 매매로 구성됩니다.
              이는 해당 종목의 펀더멘탈에 대한 판단이 아니라,
              <strong className="text-white">기계적 수급</strong>에 가깝습니다.
              선물-현물 간 괴리율에 따라 자동으로 발생하기 때문에,
              종목의 방향성과 무관한 매매가 섞여 있습니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">단기 회전 성향</h3>
            <p>
              국내 운용사의 펀드 평가 주기가 짧아,
              기관은 분기·반기 성과에 민감합니다.
              이 때문에 <strong className="text-white">윈도우 드레싱</strong>(분기 말 포트폴리오 치장)이나
              단기 수익 실현이 빈번하게 나타납니다.
              오늘 산 종목을 내일 파는 것이 기관에서는 드문 일이 아닙니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">자금 성격의 혼합</h3>
            <p>
              &lsquo;기관&rsquo;이라는 카테고리 안에는 연기금, 보험, 투신, 사모 등
              성격이 전혀 다른 자금이 뒤섞여 있습니다.
              연기금은 장기 매수, 투신은 단기 매매를 하는데,
              이들이 합산되어 기관 순매수로 집계되면
              실제 의미를 파악하기 어렵습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="warn">
          기관 매매 데이터 자체가 무의미한 것은 아닙니다.
          다만 프로그램 매매, 단기 회전, 자금 성격 혼합 등으로 인해
          <strong> 방향성 지표로서의 신뢰도가 낮습니다.</strong>
          수급 분석의 핵심 축은 개인-외국인 크로스에 두는 것이 더 효과적입니다.
        </HighlightBox>
      </Section>

      <Section id="bullish-cross" title="3. 개인 매도 + 외인 매수 크로스">
        <p>
          개인이 순매도하면서 외국인이 순매수로 전환하는 패턴은
          한국 시장에서 반복적으로 관찰되는 <strong className="text-white">강세 전환 신호</strong>입니다.
          이 패턴이 의미를 가지는 이유를 구조적으로 살펴보겠습니다.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">발생 구조</h3>
            <p>
              주가가 하락하면 개인 투자자는 손절매 압력을 받습니다.
              &lsquo;더 떨어지기 전에 팔아야 한다&rsquo;는 공포 심리가 작동하면서
              매도 물량이 쏟아집니다. 이때 외국인은 반대로 행동합니다.
            </p>
            <p className="mt-2">
              외국인의 매수는 대개 글로벌 자산 배분 관점에서 이루어집니다.
              한국 시장의 밸류에이션이 글로벌 대비 매력적이라고 판단하거나,
              특정 섹터(반도체, 자동차 등)의 실적 개선 전망에 따라
              <strong className="text-white">중장기 포지션</strong>을 구축합니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">역사적 사례</h3>
            <p>
              KOSPI 기준으로, 외국인이 대규모 순매수로 전환한 시기는
              대체로 시장 바닥에서 6개월 이내에 위치해 있었습니다.
              물론 모든 외국인 순매수가 바닥을 의미하는 것은 아닙니다.
              하지만 <strong className="text-white">개인 투매 + 외국인 매집</strong>이
              동시에 나타나는 구간의 이후 수익률은 통계적으로 양호한 편입니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">확인 포인트</h3>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-300">
              <li>외국인 순매수가 <strong className="text-white">5거래일 이상</strong> 지속되는가</li>
              <li>개인 순매도가 거래량 증가와 함께 나타나는가 (투매 징후)</li>
              <li>환율(원/달러)이 안정적이거나 하락 추세인가</li>
              <li>해당 종목의 회귀 채널 하단(-2σ 이하)에 위치하는가</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="tip">
          수급 크로스와 채널 위치를 함께 보면 분석의 깊이가 달라집니다.
          <strong> 채널 하단(-2σ) + 개인 매도 + 외인 매수</strong>가
          동시에 나타나는 구간은 통계적으로 가장 주목할 만한 조합입니다.
        </HighlightBox>
      </Section>

      <Section id="bearish-cross" title="4. 개인 매수 + 외인 매도의 위험 신호">
        <p>
          반대 패턴도 있습니다.
          주가가 상승하는데 외국인이 지속적으로 매도하고,
          개인이 매수에 나서는 구간입니다.
          이 패턴은 <strong className="text-white">약세 전환 경고</strong>로 해석될 수 있습니다.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">왜 위험한가</h3>
            <p>
              외국인이 매도하는 데는 여러 이유가 있습니다.
              글로벌 리스크 오프, 환율 불리함, 실적 피크아웃 전망 등.
              하지만 이유가 무엇이든, 외국인의 지속적 매도는
              <strong className="text-white">대규모 자금이 빠져나가고 있다</strong>는 사실 자체가 중요합니다.
            </p>
            <p className="mt-2">
              개인은 &lsquo;저가 매수&rsquo;라고 생각하며 떨어지는 주가를 사들이지만,
              외국인의 매도 물량이 더 클 경우 주가는 계속 하락합니다.
              이른바 &lsquo;물타기&rsquo;로 평균 단가를 낮추려는 행동이
              오히려 손실을 키우는 결과로 이어지는 구간입니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">전형적 패턴</h3>
            <div className="rounded-lg bg-white/[0.03] p-4 text-xs text-zinc-300 space-y-2">
              <p><strong className="text-white">1단계</strong>: 외국인 소규모 매도 시작. 주가 소폭 조정. 개인 &lsquo;싸졌다&rsquo;고 매수.</p>
              <p><strong className="text-white">2단계</strong>: 외국인 매도 강도 증가. 주가 추가 하락. 개인 물타기.</p>
              <p><strong className="text-white">3단계</strong>: 외국인 매도 지속. 개인 투매 전환. 바닥은 개인이 파는 시점에 형성.</p>
            </div>
          </div>
        </div>

        <HighlightBox variant="warn">
          외국인이 5거래일 이상 연속 순매도하는 종목에서
          개인만 매수하고 있다면, 그것은 &lsquo;기회&rsquo;가 아니라
          <strong> 경고 신호</strong>입니다.
          &lsquo;왜 외국인이 파는가?&rsquo;를 먼저 파악하세요.
        </HighlightBox>
      </Section>

      <Section id="how-to-read" title="5. 수급 흐름 차트에서 크로스 읽는 법">
        <p>
          수급 흐름 차트에서 크로스를 실제로 어떻게 식별하는지 정리합니다.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">누적 수급 그래프 활용</h3>
            <p>
              일별 순매수/매도 데이터만 보면 노이즈가 많습니다.
              <strong className="text-white">누적 수급 그래프</strong>를 활용하면
              중장기 흐름이 한눈에 보입니다.
              누적 외국인 순매수 선이 상승 전환하면서
              누적 개인 순매수 선이 하락 전환하는 지점이
              바로 &lsquo;크로스&rsquo;입니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">크로스의 강도 판단</h3>
            <p>
              모든 크로스가 같은 의미를 가지는 것은 아닙니다.
              다음 조건을 충족할수록 크로스의 신뢰도가 높아집니다.
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1.5 text-zinc-300">
              <li>외국인 순매수 금액이 시가총액 대비 <strong className="text-white">유의미한 규모</strong>인가</li>
              <li>크로스 발생 후 <strong className="text-white">5거래일 이상</strong> 방향이 유지되는가</li>
              <li>거래량이 크로스 발생 전 대비 <strong className="text-white">증가</strong>했는가</li>
              <li>주가가 회귀 채널 하단에 위치하는가 (채널 분석 병행)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">주의사항</h3>
            <p>
              수급 크로스는 <strong className="text-white">후행 지표</strong>입니다.
              크로스가 확인되는 시점에는 이미 주가가 어느 정도 움직인 상태입니다.
              따라서 크로스를 &lsquo;매매 타이밍&rsquo;으로 사용하기보다는,
              현재 수급 구조가 긍정적인지 부정적인지를 판단하는
              <strong className="text-white"> 방향성 지표</strong>로 활용하는 것이 적절합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          수급 크로스는 단독으로 매매 근거가 될 수 없습니다.
          회귀 채널 위치, 거래량, 업종 흐름 등과 함께
          <strong> 종합적으로 판단</strong>할 때 의미 있는 분석 도구가 됩니다.
          본 자료는 분석 방법론을 소개하는 것이며, 특정 종목의 매매를 권유하지 않습니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
