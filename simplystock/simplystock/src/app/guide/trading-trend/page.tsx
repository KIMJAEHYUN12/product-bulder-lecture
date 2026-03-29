import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "투자자별 매매동향 해석",
  description:
    "투자자별 매매동향 데이터 테이블을 PC와 모바일에서 효과적으로 해석하는 방법.",
};

const toc = [
  { id: "dashboard", label: "데이터 테이블은 공장의 '현황판'" },
  { id: "terms", label: "각 항목이 의미하는 '현장 용어' 풀이" },
  { id: "device", label: "PC와 모바일, 어떻게 다르게 봐야 할까?" },
  { id: "signal", label: "테이블에서 찾는 '반전의 신호'" },
  { id: "caution", label: "주의사항" },
];

export default function TradingTrendGuide() {
  return (
    <GuideLayout
      title="숫자에 숨은 의도, '투자자별 매매동향' 테이블 완벽 정복"
      subtitle="차트가 흐름을 보여주는 지도라면, 매매동향 테이블은 '공정 현황판'입니다"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
    >
      <Section id="dashboard" title="1. 데이터 테이블은 공장의 '현황판'입니다">
        <p>
          차트가 흐름을 보여주는 지도라면, 하단의 매매동향 테이블은
          실시간으로 돌아가는{" "}
          <strong className="text-white">&lsquo;공정 현황판&rsquo;</strong>입니다.
          누가 얼마나 샀고, 평균 단가는 얼마인지 숫자로 확인하는 과정이 필수입니다.
        </p>
        <p className="mt-3">
          빗각이 예뻐도 숫자가 뒷받침되지 않으면{" "}
          <strong className="text-white">&lsquo;속 빈 강정&rsquo;</strong>일 확률이 높기 때문입니다.
        </p>

        <HighlightBox variant="info">
          매매동향 테이블은 캔들 차트 아래에 위치하며,
          &ldquo;투자자별 매매동향&rdquo; 버튼을 눌러 펼칠 수 있습니다.
          PC에서는 전체 테이블, 모바일에서는 카드 형태로 표시됩니다.
        </HighlightBox>
      </Section>

      <Section id="terms" title="2. 각 항목이 의미하는 '현장 용어' 풀이">
        <div className="space-y-3">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs font-bold text-indigo-400 mb-2">외국인/기관 순매수</p>
            <p className="text-xs text-zinc-300">
              시장을 움직이는 두 개의 큰 톱니바퀴입니다.
              이 숫자가 <strong className="text-white">빨간색(양수)</strong>으로 지속된다는 건,
              누군가 계속해서 물량을 매집하며 상방 압력을 가하고 있다는 뜻입니다.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold text-amber-400 mb-2">프로그램 매매</p>
            <p className="text-xs text-zinc-300">
              이건 사람이 직접 사는 게 아니라{" "}
              <strong className="text-white">&lsquo;자동화된 로봇 공정&rsquo;</strong>과 같습니다.
              대량의 물량이 기계적으로 들어오거나 나갈 때 발생하며,
              빗각의 상하단 변동성을 키우는 주범이 되기도 합니다.
            </p>
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-xs font-bold text-cyan-400 mb-2">거래량과 거래대금</p>
            <p className="text-xs text-zinc-300">
              공장의 가동률입니다.
              주가는 오르는데 거래량이 줄어든다면,
              연료 없이 관성으로만 가고 있다는{" "}
              <strong className="text-white">주의 신호</strong>일 수 있습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          <strong>양수(+)</strong>는 순매수(산 게 더 많음),{" "}
          <strong>음수(-)</strong>는 순매도(판 게 더 많음)를 의미합니다.
          색상으로도 구분됩니다: 빨강=매수 우위, 파랑=매도 우위.
        </HighlightBox>
      </Section>

      <Section id="device" title="3. PC와 모바일, 어떻게 다르게 봐야 할까?">
        <p>
          SimplyStock은 MTS(모바일) 환경에 최적화되어 있습니다.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">PC (데스크톱)</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              넓은 화면을 활용해 빗각 7선과 긴 기간의 수급 테이블을 대조하며{" "}
              <strong className="text-gray-200">&lsquo;거시적인 추세&rsquo;</strong>를 확인하세요.
              모든 열이 한눈에 보이는 테이블 형태로 표시됩니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">모바일</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              이동 중에는{" "}
              <strong className="text-gray-200">&lsquo;최근 5일간의 수급&rsquo;</strong>과
              &lsquo;단기 빗각&rsquo; 위주로 보세요.
              카드 형태의 &quot;기본 정보&quot;와 &quot;수급 및 보유&quot; 탭으로
              깔끔하게 정리됩니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>PC</strong>에서는 빗각 7선과 수급 테이블을 나란히 대조하며 거시적 추세를 확인하고,
          <strong>모바일</strong>에서는 최근 5일 수급과 단기 빗각 위주로 빠르게 체크하는 것이 효율적입니다.
        </HighlightBox>
      </Section>

      <Section id="signal" title="4. 테이블에서 찾는 '반전의 신호'">
        <p>
          주가는 연일 하락하며 빗각 하단 3선에 닿았는데,
          테이블의 기관 숫자가 갑자기{" "}
          <strong className="text-white">&lsquo;플러스&rsquo;</strong>로 전환된다면?
        </p>
        <p className="mt-3">
          그것은 <strong className="text-white">&lsquo;공정 재가동&rsquo;</strong>의 전조현상입니다.
          가격은 낮아졌는데 큰손들은 사기 시작했다는,
          주목할 만한 구간이 됩니다.
        </p>

        <HighlightBox variant="tip">
          <strong>빗각 하단 + 기관 순매수 전환</strong>이 겹치는 구간은
          수급 흐름 차트와 함께 대조하면 분석의 정밀도가 올라갑니다.
          테이블에서 세부 수치를, 차트에서 전체 흐름을 각각 확인하세요.
        </HighlightBox>

      </Section>

      <Section id="caution" title="5. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>순매매 데이터는 장 마감 후 집계되며, 장중 실시간 데이터가 아닙니다.</li>
            <li>개인 순매매는 -(외국인 + 기관)으로 계산된 추정값입니다.</li>
            <li>기관/외국인 매수가 항상 주가 상승을 의미하지는 않습니다.</li>
            <li>매매동향은 여러 분석 도구 중 하나이며, 단독으로 투자 판단의 근거가 될 수 없습니다.</li>
            <li>반드시 채널 위치, 재무, 뉴스 등 다른 정보와 종합적으로 판단하세요.</li>
          </ul>
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">관련 종목 분석</p>
        <div className="flex flex-wrap gap-2">
          <a href="/stock/005930/" className="text-xs text-indigo-400 hover:underline">삼성전자 수급 동향 →</a>
          <a href="/stock/035420/" className="text-xs text-indigo-400 hover:underline">NAVER 수급 동향 →</a>
          <a href="/stock/" className="text-xs text-[var(--text-muted)] hover:underline">전체 종목 보기 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
