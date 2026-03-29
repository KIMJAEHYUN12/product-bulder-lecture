import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "수급 스캔 종목, 선정 후 이렇게 확인하세요",
  description:
    "수급 스캔으로 추출된 종목을 5단계 체크리스트로 검증하고, 탈락 조건과 모니터링 루틴까지 정리합니다.",
};

const toc = [
  { id: "why-not-now", label: "스캔 결과를 바로 매매하면 안 되는 이유" },
  { id: "five-steps", label: "5단계 검증 체크리스트" },
  { id: "disqualify", label: "탈락 조건: 이런 종목은 걸러야 한다" },
  { id: "monitoring", label: "관심종목 등록 후 모니터링 루틴" },
  { id: "summary", label: "정리: 스캔은 시작이지 끝이 아니다" },
];

export default function ScanChecklistPage() {
  return (
    <GuideLayout
      title="수급 스캔 종목, 선정 후 이렇게 확인하세요"
      subtitle="스캔은 출발점입니다. 검증 없는 매매는 도박과 같습니다."
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
      backHref="/analysis/"
      backLabel="자료실"
    >
      <Section id="why-not-now" title="1. 스캔 결과를 바로 매매하면 안 되는 이유">
        <p>
          수급 스캔은 특정 조건에 부합하는 종목을 자동으로 추출해 주는 도구입니다.
          예를 들어 &lsquo;회귀 채널 하단 근접 + 외국인 순매수 전환&rsquo; 같은
          조건을 설정하면, 해당 조건을 충족하는 종목 리스트가 나옵니다.
        </p>
        <p className="mt-3">
          문제는 여기서 시작됩니다.
          리스트에 이름이 올랐다는 것은 <strong className="text-white">조건을 통과했다는 뜻이지,
          좋은 종목이라는 뜻이 아닙니다.</strong>
          스캔 조건은 수치 기반의 1차 필터일 뿐이며,
          그 뒤에 숨어 있는 맥락은 사람이 직접 확인해야 합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-white/[0.03] p-4">
            <p className="text-xs font-bold text-white mb-1">스캔이 잡아내지 못하는 것들</p>
            <ul className="text-xs text-zinc-300 list-disc list-inside space-y-1">
              <li>임박한 실적 발표나 공시 (악재 가능성)</li>
              <li>업종 전체의 구조적 하락 (개별 종목 문제가 아닌 경우)</li>
              <li>유동성 부족으로 인한 가격 왜곡</li>
              <li>환율, 원자재 가격 등 외부 변수의 영향</li>
              <li>경영진 리스크, 지배구조 이슈</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="warn">
          스캔 결과를 보고 &lsquo;기계가 골라줬으니 맞겠지&rsquo;라고 생각하면 위험합니다.
          <strong> 스캔은 후보 선정 도구</strong>이며, 최종 판단은 반드시 직접 검증한 후에 내려야 합니다.
        </HighlightBox>
      </Section>

      <Section id="five-steps" title="2. 5단계 검증 체크리스트">
        <p>
          스캔으로 추출된 종목은 아래 5단계를 순서대로 통과해야
          &lsquo;관심종목&rsquo;으로 등록할 가치가 있습니다.
          순서가 중요합니다. 앞 단계에서 탈락하면 뒷 단계는 볼 필요가 없습니다.
        </p>

        <div className="mt-4 space-y-5">
          {/* Step 1 */}
          <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/25 text-xs font-bold text-indigo-400">1</span>
              <h3 className="text-sm font-bold text-white">채널 위치 확인</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              스캔에서 &lsquo;채널 하단&rsquo;이라고 나왔더라도, 직접 차트를 열어
              현재 위치를 눈으로 확인합니다.
              <strong className="text-white"> 중심선의 기울기가 우상향 또는 최소 평행</strong>인지 확인하세요.
              기울기가 꺾이고 있다면 추세 전환 가능성이 있으며,
              채널 하단의 의미가 달라집니다.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed mt-2">
              또한 분석 기간 설정에 따라 채널 모양이 달라집니다.
              단기(1개월)와 장기(1년) 채널을 모두 확인해서
              두 시간축에서 모두 하단에 위치하는지 교차 검증하면 신뢰도가 높아집니다.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/25 text-xs font-bold text-cyan-400">2</span>
              <h3 className="text-sm font-bold text-white">수급 지속성 확인</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              외국인이나 기관의 순매수가 단발성인지, 지속적인지 확인합니다.
              <strong className="text-white"> 최소 3거래일, 이상적으로는 5거래일 이상</strong>
              순매수가 이어지고 있는지 봅니다.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed mt-2">
              하루 큰 금액을 사고 다음 날 파는 것은
              프로그램 매매나 리밸런싱일 가능성이 높습니다.
              방향이 며칠에 걸쳐 일관되게 유지될 때
              &lsquo;의도적 매집&rsquo;의 가능성이 올라갑니다.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-xs font-bold text-emerald-400">3</span>
              <h3 className="text-sm font-bold text-white">거래량 검증</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              거래량은 수급의 &lsquo;진정성&rsquo;을 검증하는 도구입니다.
              <strong className="text-white"> 20일 평균 거래량 대비 현재 거래량이 증가세</strong>인지 확인합니다.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed mt-2">
              특히 주의할 패턴은 두 가지입니다.
              첫째, 거래량 바닥에서 갑자기 터지는 경우 — 새로운 자금 유입 신호.
              둘째, 양봉 거래량이 음봉 거래량보다 큰 경우 — 매수 의지가 매도 압력보다 강하다는 의미입니다.
              반대로 거래량이 계속 줄고 있다면, 관심이 사라진 종목일 수 있습니다.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-xs font-bold text-amber-400">4</span>
              <h3 className="text-sm font-bold text-white">업종 흐름 확인</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              개별 종목이 아무리 좋아 보여도, 속한 업종 자체가 하락 추세라면
              독자적으로 상승하기 어렵습니다.
              <strong className="text-white"> 동종 업종 대표 종목 2~3개의 차트</strong>를 함께 확인하세요.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed mt-2">
              업종 전체가 채널 하단에 있다면 업종 사이클 하락일 가능성이 높고,
              해당 종목만 유독 빠졌다면 개별 이슈를 의심해야 합니다.
              업종이 상승 반전 중인데 해당 종목만 하단에 머물러 있다면,
              상대적 약세의 원인을 파악해야 합니다.
            </p>
          </div>

          {/* Step 5 */}
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/25 text-xs font-bold text-rose-400">5</span>
              <h3 className="text-sm font-bold text-white">리스크 점검</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              마지막으로 해당 종목의 리스크 요인을 확인합니다.
              이 단계를 건너뛰는 것이 가장 흔한 실수입니다.
            </p>
            <ul className="text-xs text-zinc-300 list-disc list-inside space-y-1 mt-2">
              <li>최근 공시에 실적 경고, 유상증자, 전환사채 발행 등이 있는가</li>
              <li>대주주 지분 변동(특히 매도)이 있었는가</li>
              <li>부채비율이 업종 평균 대비 과도하지 않은가</li>
              <li>최근 뉴스에 소송, 규제, 경영진 교체 등 부정적 이슈가 있는가</li>
              <li>시가총액이 너무 작아 유동성 리스크가 있지 않은가</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="tip">
          5단계를 모두 통과한 종목만 &lsquo;관심종목&rsquo;으로 등록하세요.
          단계별 탈락률이 높을수록 필터의 품질이 좋다는 뜻입니다.
          10개 스캔 결과 중 2~3개만 살아남는 것이 정상입니다.
        </HighlightBox>
      </Section>

      <Section id="disqualify" title="3. 탈락 조건: 이런 종목은 걸러야 한다">
        <p>
          5단계 체크리스트 중 어느 시점에서든 아래 조건에 해당하면
          즉시 후보에서 제외하는 것이 좋습니다.
          &lsquo;한번 보자&rsquo;는 미련이 손실의 시작입니다.
        </p>

        <div className="mt-4 space-y-2">
          {[
            { label: "채널 기울기 우하향", desc: "중심선이 하락하고 있다면, 채널 하단은 저평가가 아니라 하락 추세의 연장입니다." },
            { label: "외국인 연속 매도 5일 이상", desc: "스캔 시점에 외국인 매수가 있었더라도, 직전까지 연속 매도였다면 단발 반등일 수 있습니다." },
            { label: "거래량 20일 평균의 50% 미만", desc: "시장의 관심이 사라진 종목입니다. 유동성 부족으로 호가 스프레드가 넓어 실제 매매가 어렵습니다." },
            { label: "최근 유상증자/전환사채 공시", desc: "주식 수 증가로 인한 희석 효과가 주가에 부정적으로 작용합니다. 특히 전환사채의 전환가가 현재가 근처라면 오버행 리스크가 큽니다." },
            { label: "업종 전체 하락 + 개별 악재", desc: "업종 사이클 하락에 개별 악재까지 겹친 종목은 반등 시점을 예측하기 매우 어렵습니다." },
            { label: "시가총액 500억 미만 (소형주)", desc: "소형주는 수급 데이터의 의미가 약합니다. 소량의 거래로 수급 지표가 크게 흔들리기 때문입니다." },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3">
              <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400" />
              <div>
                <p className="text-xs font-bold text-red-400 mb-0.5">{item.label}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <HighlightBox variant="warn">
          탈락 조건은 엄격할수록 좋습니다.
          &lsquo;아깝지만 걸러야&rsquo; 하는 종목을 과감하게 제외하는 것이
          장기적으로 포트폴리오의 품질을 높입니다.
        </HighlightBox>
      </Section>

      <Section id="monitoring" title="4. 관심종목 등록 후 모니터링 루틴">
        <p>
          5단계를 통과한 종목을 관심종목으로 등록한 뒤,
          바로 행동하지 말고 다음 루틴으로 모니터링합니다.
          <strong className="text-white"> 관심종목 등록은 &lsquo;지켜보겠다&rsquo;는 결정이지,
          &lsquo;사겠다&rsquo;는 결정이 아닙니다.</strong>
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-white/[0.03] p-4">
            <p className="text-xs font-bold text-white mb-2">일간 체크 (매일 장 마감 후)</p>
            <ul className="text-xs text-zinc-300 list-disc list-inside space-y-1">
              <li>수급 방향이 유지되고 있는가 (외국인/기관 순매수 지속 여부)</li>
              <li>거래량 추이가 증가 또는 유지되고 있는가</li>
              <li>채널 내 위치 변화 (하단에서 중심선 방향으로 이동 중인가)</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white/[0.03] p-4">
            <p className="text-xs font-bold text-white mb-2">주간 체크 (주말)</p>
            <ul className="text-xs text-zinc-300 list-disc list-inside space-y-1">
              <li>한 주간의 누적 수급 변화 (일별 노이즈 제거)</li>
              <li>업종 흐름 변화 확인</li>
              <li>주요 공시, 뉴스 점검</li>
              <li>같은 업종 내 다른 종목과의 상대 강도 비교</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white/[0.03] p-4">
            <p className="text-xs font-bold text-white mb-2">관심종목 제거 기준</p>
            <ul className="text-xs text-zinc-300 list-disc list-inside space-y-1">
              <li>수급 방향이 반전된 채 3거래일 이상 유지되면 제거</li>
              <li>채널 하단 이탈 후 회복 조짐 없으면 제거</li>
              <li>새로운 악재 공시가 나오면 즉시 제거</li>
              <li>2주 이상 특별한 변화 없으면 재검토 (기회비용)</li>
            </ul>
          </div>
        </div>

        <HighlightBox variant="info">
          관심종목은 <strong>최대 5~7개</strong>로 유지하는 것을 권장합니다.
          너무 많으면 각 종목에 대한 모니터링 품질이 떨어지고,
          &lsquo;눈에 익어서&rsquo; 객관성을 잃기 쉽습니다.
        </HighlightBox>
      </Section>

      <Section id="summary" title="5. 정리: 스캔은 시작이지 끝이 아니다">
        <p>
          수급 스캔은 수천 개 종목 중에서 조건에 맞는 후보를
          빠르게 추려주는 유용한 도구입니다.
          하지만 스캔 결과 자체가 투자 판단이 될 수는 없습니다.
        </p>

        <div className="mt-4 rounded-lg bg-white/[0.03] p-5">
          <p className="text-xs font-bold text-white mb-3">전체 프로세스 요약</p>
          <div className="space-y-2 text-xs text-zinc-300">
            <p><strong className="text-indigo-400">스캔</strong> → 조건 부합 종목 추출 (자동)</p>
            <p><strong className="text-cyan-400">검증</strong> → 5단계 체크리스트 통과 여부 확인 (수동)</p>
            <p><strong className="text-emerald-400">필터링</strong> → 탈락 조건 해당 종목 제거 (수동)</p>
            <p><strong className="text-amber-400">모니터링</strong> → 관심종목 등록 후 일간/주간 추적 (수동)</p>
            <p><strong className="text-rose-400">판단</strong> → 모든 조건이 지속 충족될 때 투자 결정 (본인 책임)</p>
          </div>
        </div>

        <p className="mt-4">
          이 프로세스에서 자동화된 부분은 첫 단계(스캔)뿐입니다.
          나머지는 모두 투자자 본인이 직접 판단해야 합니다.
          시간이 걸리더라도 검증 과정을 거치는 습관이
          장기적으로 투자 성과를 결정짓습니다.
        </p>

        <HighlightBox variant="info">
          본 자료는 수급 스캔 결과의 검증 방법론을 소개하는 교육 자료입니다.
          특정 종목의 매수·매도를 권유하지 않으며,
          모든 투자 판단과 책임은 이용자 본인에게 있습니다.
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
