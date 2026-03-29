import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "회귀 채널 분석법",
  description:
    "선형 회귀 기반 7선 채널로 주가의 저평가·고평가 구간을 통계적으로 판단하는 방법을 안내합니다.",
};

const toc = [
  { id: "why", label: "왜 우리는 이평선에 속을까?" },
  { id: "seven-lines", label: "빗각 7선의 비밀" },
  { id: "how-to-use", label: "실전 활용법: 빗각으로 '돈의 길' 읽기" },
  { id: "period", label: "기간 설정의 중요성 (1M vs 1Y)" },
  { id: "caution", label: "주의사항" },
];

export default function RegressionChannelGuide() {
  return (
    <GuideLayout
      title="주식 투자의 내비게이션, '빗각(회귀 채널)' 완벽 분석"
      subtitle="이평선 너머, 주가가 달리는 '보이지 않는 도로'를 읽는 법"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
    >
      <Section id="why" title="1. 왜 우리는 이평선에 속을까?">
        <p>
          많은 투자자가 20일선, 60일선 같은 이동평균선을 봅니다.
          하지만 이평선은 <strong className="text-white">&lsquo;과거의 잔상&rsquo;</strong>입니다.
          이미 지나온 길의 평균일 뿐, 지금 주가가 어느 방향으로 힘을 쓰고 있는지,
          그리고 그 힘의 한계치가 어디인지는 알려주지 못합니다.
        </p>
        <p className="mt-3">
          마치 공장에서 기계가 고장 난 뒤에야 수리 보고서를 쓰는 것과 같습니다.
        </p>

        <HighlightBox variant="tip">
          <strong>SimplyStock의 빗각(회귀 채널)</strong>은 다릅니다.
          이는 현재의 데이터가 가진 &lsquo;기울기&rsquo;와 &lsquo;통계적 변동성&rsquo;을 계산해
          주가가 달리고 있는 <strong>&lsquo;보이지 않는 도로&rsquo;</strong>를 그려줍니다.
        </HighlightBox>

      </Section>

      <Section id="seven-lines" title="2. 회귀 채널의 심장, '빗각 7선'의 비밀">
        <p>
          차트에 그려진 7개의 선은 단순한 줄긋기가 아닙니다.
          통계학의 <strong className="text-white">선형 회귀(Linear Regression)</strong>와{" "}
          <strong className="text-white">표준편차(Standard Deviation)</strong>를 결합한
          정밀한 계측 도구입니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-white font-bold font-mono">중심선</span>
            <span className="text-xs text-zinc-300">
              주가의 평균적인 에너지 흐름입니다.
              주가가 이 선 위에 있다면 상승 에너지가 우위에 있다고 봅니다.
            </span>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-amber-400 font-bold font-mono">&plusmn;1&sigma;</span>
            <span className="text-xs text-zinc-300">
              주가가 <strong className="text-white">68%</strong>의 확률로 머무는 구간입니다.
              &lsquo;정상 범위&rsquo;의 움직임을 뜻합니다.
            </span>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-indigo-400 font-bold font-mono">&plusmn;2&sigma;</span>
            <span className="text-xs text-zinc-300">
              주가가 <strong className="text-white">95.4%</strong>의 확률로 이 안에 있습니다.
              이 선에 닿았다는 건 에너지가 상당히 쏠렸다는 뜻이며,
              반등이나 조정이 올 확률이 매우 높습니다.
            </span>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-red-400 font-bold font-mono">&plusmn;3&sigma;</span>
            <span className="text-xs text-zinc-300">
              주가가 이 선을 터치할 확률은 단 <strong className="text-white">0.3%</strong>에 불과합니다.
              이곳에 주가가 도달했다는 것은 &lsquo;비이성적 과열&rsquo; 혹은 &lsquo;패닉 셀링&rsquo; 구간임을 뜻하며,
              매우 강력한 변곡점이 됩니다.
            </span>
          </div>
        </div>

      </Section>

      <Section id="how-to-use" title="3. 실전 활용법: 빗각으로 '돈의 길' 읽기">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">기울기가 모든 것을 말한다</h3>
            <p>
              빗각의 각도가 우상향이라면 세력이 돈을 써서 주가를 밀어 올리고 있다는 증거입니다.
              반대로 주가가 오르는데 빗각이 평평해지거나 꺾인다면,
              그것은 <strong className="text-white">&lsquo;가짜 상승&rsquo;</strong>일 확률이 높습니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">이격도를 활용한 분석</h3>
            <p>
              주가가 하단 2~3선에 닿았을 때 수급이 들어온다면
              그것은 <strong className="text-white">확률 높은 반등 구간</strong>이 됩니다.
            </p>
            <p className="mt-2">
              반대로 상단 3선에 닿았는데 거래량이 터진다면
              수익을 실현해야 하는 <strong className="text-white">과열 구간</strong>입니다.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <HighlightBox variant="tip">
            <strong>하단 2~3&sigma; + 수급 유입</strong> = 통계적 저평가 구간에서 큰 자금이 들어오는 흐름.
            수급 흐름 차트와 함께 확인하면 분석의 정밀도가 올라갑니다.
          </HighlightBox>

          <HighlightBox variant="warn">
            <strong>상단 3&sigma; + 거래량 폭증</strong> = 통계적 과열 구간에서 거래가 급증하는 흐름.
            과열 여부를 점검할 수 있는 구간입니다.
          </HighlightBox>
        </div>

      </Section>

      <Section id="period" title="4. 기간 설정의 중요성 (1M vs 1Y)">
        <p>
          가장 많이 실수하는 게 기간 설정입니다.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">단기 매매 &rarr; 1M (1개월)</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              지금 당장의 &lsquo;세력 의도&rsquo;가 보입니다.
              최근 한 달간의 힘의 방향과 한계치를 정밀하게 측정합니다.
              마치 <strong className="text-gray-200">현미경</strong>으로 보는 것과 같습니다.
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">장기 투자 &rarr; 1Y (1년)</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              거대한 추세의 바닥이 어디인지 확인할 수 있습니다.
              1년간의 구조적 흐름을 파악합니다.
              마치 <strong className="text-gray-200">망원경</strong>으로 보는 것과 같습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          SimplyStock은 이 기간을 버튼 하나로 자유자재로 바꿀 수 있어,
          현미경과 망원경을 동시에 사용하는 효과를 줍니다.
        </HighlightBox>

      </Section>

      <Section id="caution" title="5. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>회귀 채널은 과거 데이터 기반의 통계 도구이며, 미래 주가를 예측하지 않습니다.</li>
            <li>급격한 실적 변화, 시장 이벤트 등으로 채널이 무력화될 수 있습니다.</li>
            <li>채널 위치는 참고 지표 중 하나이며, 단독으로 투자 판단의 근거가 될 수 없습니다.</li>
            <li>반드시 수급, 재무, 뉴스 등 다른 정보와 종합적으로 판단하세요.</li>
          </ul>
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">관련 종목 분석</p>
        <div className="flex flex-wrap gap-2">
          <a href="/stock/005930/" className="text-xs text-indigo-400 hover:underline">삼성전자 채널 분석 →</a>
          <a href="/stock/000660/" className="text-xs text-indigo-400 hover:underline">SK하이닉스 분석 →</a>
          <a href="/stock/" className="text-xs text-[var(--text-muted)] hover:underline">전체 종목 보기 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
