import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "이동평균선 매매 기법 가이드",
  description:
    "224일선을 중심으로 밥그릇, 공구리, 하이힐, 256, 이평때리기 등 실전 이평선 매매 기법을 정리합니다.",
};

const toc = [
  { id: "intro", label: "이동평균선이란?" },
  { id: "ma224", label: "224일선 — 세력의 기준선" },
  { id: "babgeureut", label: "밥그릇 기법" },
  { id: "gongguri", label: "공구리 기법" },
  { id: "highhill", label: "하이힐 기법" },
  { id: "ma256", label: "256 기법" },
  { id: "hitting", label: "이평때리기 기법" },
  { id: "share", label: "지분 기법" },
  { id: "symmetry", label: "대칭이론" },
  { id: "caution", label: "주의사항" },
];

export default function MovingAverageGuide() {
  return (
    <GuideLayout
      title="이동평균선 매매 기법 가이드"
      subtitle="224일선을 중심으로 한 8가지 실전 기법 총정리"
      updatedAt="최종 수정일: 2026년 03월 15일"
      toc={toc}
    >
      <Section id="intro" title="1. 이동평균선이란?">
        <p>
          이동평균선(Moving Average)은 일정 기간 동안의 종가 평균을 연결한 선입니다.
          단기적인 가격 변동을 완화하여 <strong className="text-white">추세의 방향</strong>을 파악하는 데 사용합니다.
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-red-400 w-16 shrink-0">5일선</span>
            <span className="text-xs text-zinc-400">1주일 평균 — 초단기 추세</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-amber-400 w-16 shrink-0">20일선</span>
            <span className="text-xs text-zinc-400">1개월 평균 — 단기 추세, 생명선이라 불림</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-emerald-400 w-16 shrink-0">60일선</span>
            <span className="text-xs text-zinc-400">3개월 평균 — 중기 추세</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-blue-400 w-16 shrink-0">112일선</span>
            <span className="text-xs text-zinc-400">약 5.5개월 — 중장기 추세 (224의 절반)</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-white w-16 shrink-0">224일선</span>
            <span className="text-xs text-zinc-400">약 11개월 — 장기 추세의 핵심 기준선</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-bold text-violet-400 w-16 shrink-0">448일선</span>
            <span className="text-xs text-zinc-400">약 22개월 — 초장기 추세</span>
          </div>
        </div>

        <HighlightBox variant="info">
          <strong>정배열</strong>: 5일 &gt; 20일 &gt; 60일 &gt; 224일 — 강한 상승 추세<br />
          <strong>역배열</strong>: 224일 &gt; 60일 &gt; 20일 &gt; 5일 — 강한 하락 추세<br />
          배열 상태를 파악하는 것만으로도 현재 추세를 빠르게 판단할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="ma224" title="2. 224일선 — 세력의 기준선">
        <p>
          일반적으로 200일선이 장기 추세의 기준으로 알려져 있지만,
          한국 시장에서는 <strong className="text-white">224일선</strong>(약 11개월 영업일)을
          기준으로 사용하는 기법들이 있습니다.
        </p>
        <p className="mt-3">
          224일선의 핵심적인 역할은 다음과 같습니다:
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">1</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">추세 판단의 기준</strong> — 주가가 224일선 위에 있으면 장기 상승 추세, 아래면 하락 추세
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">2</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">지지/저항 역할</strong> — 상승 추세에서는 하락 시 지지선, 하락 추세에서는 상승 시 저항선
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">3</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">기울기로 국면 판단</strong> — 224일선의 기울기가 상향이면 상승 국면, 하향이면 하락 국면, 평탄하면 전환 구간
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          이후 소개하는 기법들 대부분이 224일선을 기준으로 합니다.
          종목 차트를 볼 때 &lsquo;주가가 224일선 대비 어디에 있는가&rsquo;를
          먼저 확인하는 습관을 들이면 전체적인 맥락 파악이 빨라집니다.
        </HighlightBox>
      </Section>

      <Section id="babgeureut" title="3. 밥그릇 기법">
        <p>
          224일선을 기준으로 주가가 <strong className="text-white">밥그릇 모양</strong>을 그리는 패턴입니다.
          세력이 매집하는 종목에서 자주 나타나며, 4단계로 구분합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">1</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">가격 조정 (하락)</p>
              <p className="text-xs text-zinc-400">
                224일선 아래로 주가가 하락합니다. 어디까지 빠질지 알 수 없어 진입하기 어려운 구간입니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">2</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">기간 조정 (매집)</p>
              <p className="text-xs text-zinc-400">
                바닥에서 횡보합니다. 최소 4개월 이상 걸리며, 세력이 물량을 조용히 매집하는 구간입니다.
                거래량이 줄어들고 변동성이 작아집니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">3</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">흔들기</p>
              <p className="text-xs text-zinc-400">
                약간 반등했다가 다시 하락하여 개인 투자자를 흔듭니다.
                초보자에게 권장되는 진입 시점은 이 구간입니다.
                이전 저점을 깨지 않는 것이 포인트입니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">4</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">급등</p>
              <p className="text-xs text-zinc-400">
                거래량이 터지며 주가가 224일선을 돌파합니다.
                여기서 진입하면 이미 상당 부분 올라간 후이므로, 3번 구간에서 진입하는 것이 유리합니다.
              </p>
            </div>
          </div>
        </div>

        <HighlightBox variant="tip">
          밥그릇의 핵심은 &lsquo;기간 조정&rsquo;의 길이입니다.
          횡보 기간이 길수록 매집 물량이 많고,
          이후 상승 폭도 커지는 경향이 있습니다.
        </HighlightBox>
      </Section>

      <Section id="gongguri" title="4. 공구리 기법">
        <p>
          건물을 지을 때 맨 처음 공구리(콘크리트)를 쳐서 바닥을 다지는 것에서 유래한 이름입니다.
          224일선 아래에서 주가가 <strong className="text-white">바닥을 단단하게 다지는 패턴</strong>입니다.
        </p>
        <p className="mt-3">
          밥그릇 기법의 2번(기간 조정)과 유사하지만, 공구리 기법은 특히
          <strong className="text-white"> 하락 박스 추세를 돌파</strong>하는 시점에 주목합니다.
          이전 고점(언덕)이 지지선 역할을 하는 것이 확인되면 바닥이 형성되었다고 판단합니다.
        </p>
        <p className="mt-3">
          엘리엇 1파 눌림 시에도 이전 고점이 지지되면 같은 원리로 봅니다.
        </p>

        <HighlightBox variant="info">
          공구리 = &lsquo;이전 고점이 지지선으로 전환&rsquo;을 확인하는 기법입니다.
          하락하던 주가가 멈추고, 바로 직전의 작은 고점 위에서 지지되면
          바닥을 다졌다고 해석합니다.
        </HighlightBox>
      </Section>

      <Section id="highhill" title="5. 하이힐 기법">
        <p>
          주가가 단기간에 <strong className="text-white">급락(낙폭과대)</strong>한 후
          빠르게 회복하면서 224일선 근처에서 횡보하는 패턴입니다.
          급락과 회복 구간이 하이힐의 굽 모양과 유사하여 붙은 이름입니다.
        </p>
        <p className="mt-3">
          주가가 하이힐 발끝에서 상승으로 전환되면 추세 전환 신호로 봅니다.
          단, 회복하지 못하고 횡보만 하면 밥그릇 기법으로 전환하여 관찰합니다.
        </p>

        <HighlightBox variant="tip">
          하이힐 기법의 핵심 조건:
          <strong> 급락이 단기간(1~2주)에 발생</strong>하고,
          이후 <strong>빠르게 회복(V자 반등)</strong>한 후
          224일선 근처에서 안정화되어야 합니다.
          서서히 빠진 종목에는 적용하기 어렵습니다.
        </HighlightBox>
      </Section>

      <Section id="ma256" title="6. 256 기법">
        <p>
          <strong className="text-white">2</strong>0일선,{" "}
          <strong className="text-white">5</strong>일선,{" "}
          <strong className="text-white">6</strong>0일선 —
          세 이평선의 앞글자를 따서 &lsquo;256 기법&rsquo;이라 합니다.
        </p>
        <p className="mt-3">
          밥그릇 2번의 끝단부(상승 초입)에서 이평선이{" "}
          <strong className="text-white">역배열</strong>인 상태일 때 사용하는 기법입니다.
        </p>

        <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-bold text-indigo-400 mb-2">매매 조건</p>
          <div className="space-y-2 text-xs text-zinc-400">
            <p>1. 주가가 쌍바닥(짝궁뎅이)을 형성</p>
            <p>2. <strong className="text-white">5일선이 20일선을 골든크로스</strong> (단기 지지 확인)</p>
            <p>3. 20일선을 손절라인으로 설정</p>
            <p>4. 주가가 <strong className="text-white">60일선(추세선)을 돌파</strong>하면 수익 구간</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          중장기 매매에 활용하려면 20일 → 112일선, 60일 → 224일선으로 변경하여 적용할 수도 있습니다.
        </p>

        <HighlightBox variant="info">
          SimplyStock의 골든크로스 스캔 기능에서 5/20 교차, 20/60 교차를 자동으로 감지합니다.
          256 기법의 첫 번째 조건(골든크로스)을 자동으로 확인할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="hitting" title="7. 이평때리기 기법">
        <p>
          많이 빠졌던 주가가 회복 국면에 들어서면,
          역배열 상태에서 위에 있는 이평선을 하나씩 돌파해 나갑니다.
          이를 <strong className="text-white">&lsquo;이평때리기&rsquo;</strong>라 합니다.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">1</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">112일선 돌파</p>
              <p className="text-xs text-zinc-400">
                &lsquo;작은 형님&rsquo;을 먼저 깨는 단계입니다.
                돌파 후 되돌림이 나올 수 있으며, 112일선 위에서 지지되는지 확인합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">2</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">224일선 도전</p>
              <p className="text-xs text-zinc-400">
                핵심 기준선인 224일선에 도전합니다.
                한 번에 돌파하기 어려워 저항을 받고 되돌림이 나온 후 재차 도전하는 패턴이 흔합니다.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">3</span>
            <div>
              <p className="text-xs font-bold text-white mb-1">448일선까지</p>
              <p className="text-xs text-zinc-400">
                224일선을 안정적으로 돌파한 후, 448일선까지 도전합니다.
                여기까지 돌파하면 장기 추세 전환이 완성됩니다.
              </p>
            </div>
          </div>
        </div>

        <HighlightBox variant="tip">
          각 이평선을 돌파할 때마다 저항 → 되돌림 → 재도전 패턴이 나타납니다.
          되돌림 시 <strong>이전에 돌파한 이평선 위에서 지지되는지</strong> 확인하는 것이 핵심입니다.
          지지되지 않으면 가짜 돌파(fakeout)입니다.
        </HighlightBox>
      </Section>

      <Section id="share" title="8. 지분 기법">
        <p>
          224일선을 기준으로 주가가 <strong className="text-white">아래에 있으면 매도세</strong>,{" "}
          <strong className="text-white">위에 있으면 매수세</strong>가 강하다고 판단하는 기법입니다.
        </p>
        <p className="mt-3">
          차트에서 224일선과 주가 사이의 면적을 보면,
          매도세 구간(아래)의 면적이 줄어들고 매수세 구간(위)의 면적이 늘어나는 시점이
          매수 타이밍입니다.
        </p>

        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-bold text-emerald-400 mb-2">핵심 원리</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            매수세가 들어오는 구간에서는 거래량이 터지면서 급등할 확률이 높습니다.
            비싸게 사서 더 비싸게 파는 것이 시간적으로 효율적이며 수익률도 극대화됩니다.
            256이나 이평때리기가 본인 스타일에 맞지 않는다면,
            매수세가 들어오는 구간에서 매매하는 것도 좋은 전략입니다.
          </p>
        </div>
      </Section>

      <Section id="symmetry" title="9. 대칭이론">
        <p>
          주가는 시간과 가격에서 <strong className="text-white">대칭성</strong>을 보이는 경향이 있습니다.
          이를 활용하면 급등 후 눌림목 자리를 잡을 때 유용합니다.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">기간 대칭</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              빠진 기간만큼 오르고, 오른 기간만큼 빠지는 패턴입니다.
              예: 하락 4일 → 상승 4일 → 하락 10일 → 상승 10일.
              정확히 맞아떨어지진 않지만, 근사치에서 추세 전환을 예상할 수 있습니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">가격 대칭</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              오른 가격만큼 오르고, 빠진 가격만큼 빠지는 패턴입니다.
              급등 후 눌림이 왔을 때, 이전 상승폭만큼 조정되는 지점을 지지선으로 예상할 수 있습니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          대칭이론은 <strong>급등 후 눌림목 자리</strong>를 잡을 때 가장 유용합니다.
          &lsquo;얼마나 빠질 것인가&rsquo;를 가격/기간 대칭으로 가늠하여
          진입 시점을 결정할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="caution" title="10. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>이동평균선 기법은 과거 가격의 평균에 기반하므로, 후행 지표입니다.</li>
            <li>밥그릇, 공구리 등의 패턴은 사후적으로는 잘 보이지만, 실시간으로 판단하기는 어렵습니다.</li>
            <li>224일선은 절대적 기준이 아닙니다. 업종, 시장 상황에 따라 다를 수 있습니다.</li>
            <li>골든크로스가 나왔다고 반드시 상승하는 것이 아닙니다. 횡보장에서는 오탐이 잦습니다.</li>
            <li>하나의 기법에만 의존하지 말고, 수급, 거래량, 재무 등을 종합적으로 판단하세요.</li>
            <li>본 가이드의 기법들은 교육 목적으로 정리한 것이며, 특정 종목의 매수/매도를 권유하지 않습니다.</li>
          </ul>
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
