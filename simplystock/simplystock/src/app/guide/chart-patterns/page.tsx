import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "차트 패턴 완벽 가이드",
  description:
    "쌍바닥, 컵앤핸들, 더블탑, 트라이앵글 등 대표적인 차트 패턴의 형성 원리와 매매 활용법을 정리합니다.",
};

const toc = [
  { id: "what", label: "차트 패턴이란?" },
  { id: "bottom", label: "바닥 패턴 — 매수 기회를 알리는 신호" },
  { id: "top", label: "천장 패턴 — 매도 타이밍을 알리는 신호" },
  { id: "converge", label: "수렴 패턴 — 방향 전환의 전조" },
  { id: "trendline", label: "추세선 — 모든 패턴의 기초" },
  { id: "volume", label: "거래량 — 패턴의 신뢰도를 결정하는 열쇠" },
  { id: "caution", label: "주의사항" },
];

export default function ChartPatternsGuide() {
  return (
    <GuideLayout
      title="차트 패턴 완벽 가이드"
      subtitle="반복되는 가격 움직임 속에서 매매 타이밍을 읽는 법"
      updatedAt="최종 수정일: 2026년 03월 15일"
      toc={toc}
    >
      <Section id="what" title="1. 차트 패턴이란?">
        <p>
          주가는 무작위로 움직이는 것 같지만,
          특정 구간에서 <strong className="text-white">반복되는 형태</strong>를 만들어냅니다.
          이를 &lsquo;차트 패턴&rsquo;이라 하며,
          과거 수많은 트레이더들이 경험적으로 정리한 가격 움직임의 유형입니다.
        </p>
        <p className="mt-3">
          패턴은 크게 세 가지로 분류됩니다:
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
            <span className="text-xs font-bold text-emerald-400 w-20 shrink-0">바닥 패턴</span>
            <span className="text-xs text-zinc-400">하락 후 반등을 암시 — 매수 기회 탐색</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2.5">
            <span className="text-xs font-bold text-red-400 w-20 shrink-0">천장 패턴</span>
            <span className="text-xs text-zinc-400">상승 후 하락을 암시 — 매도 타이밍 탐색</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-violet-500/5 border border-violet-500/20 px-3 py-2.5">
            <span className="text-xs font-bold text-violet-400 w-20 shrink-0">수렴 패턴</span>
            <span className="text-xs text-zinc-400">변동성 축소 후 방향 결정 — 이탈 방향 주시</span>
          </div>
        </div>

        <HighlightBox variant="info">
          패턴 자체만으로 매매를 결정하는 것은 위험합니다.
          패턴은 <strong>확률</strong>의 도구이지, 확정의 도구가 아닙니다.
          반드시 거래량, 수급, 시장 상황 등을 함께 확인해야 합니다.
        </HighlightBox>
      </Section>

      <Section id="bottom" title="2. 바닥 패턴 — 매수 기회를 알리는 신호">
        <p>
          하락이 끝나고 반등이 시작될 수 있는 구간에서 나타나는 패턴입니다.
          바닥 패턴이 완성되었다는 것은 매도 세력이 소진되고
          매수 세력이 유입되기 시작했다는 의미입니다.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">쌍바닥 (Double Bottom)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              주가가 비슷한 가격대에서 <strong className="text-white">두 번</strong> 바닥을 찍고 반등하는 패턴입니다.
              알파벳 &lsquo;W&rsquo; 모양과 유사합니다.
              두 번째 바닥에서 거래량이 줄어들고,
              기준선(중간 고점)을 돌파할 때 거래량이 급증하면 신뢰도가 높습니다.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              매수 타이밍: 하락 추세선 돌파 시(공격적) 또는 기준선 돌파 후 눌림 시(보수적)
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">3중 바닥 (Triple Bottom)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              쌍바닥의 강화 버전으로, 비슷한 가격대에서 <strong className="text-white">세 번</strong> 바닥을 다집니다.
              역헤드앤숄더의 변형으로 볼 수도 있습니다.
              세 번이나 지지되었다는 것은 그만큼 바닥의 견고함을 의미합니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">컵앤핸들 (Cup &amp; Handle)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              시장 주도주나 강한 테마에서 자주 나타나는 패턴입니다.
              완만한 U자형 하락과 회복(컵)이 형성된 후,
              전고점 근처에서 소폭 조정(핸들)이 나타납니다.
              핸들 부분에서 <strong className="text-white">거래량이 줄어들고</strong>,
              기준선(전고점)을 돌파할 때 <strong className="text-white">거래량이 급증</strong>해야 합니다.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              핸들 없이 바로 돌파하는 변형도 있지만, 핸들이 있는 쪽이 성공률이 높습니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">역헤드앤숄더 (Inverse Head &amp; Shoulders)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              왼쪽 어깨 → 머리(더 깊은 저점) → 오른쪽 어깨 순서로
              세 개의 저점이 형성됩니다.
              넥라인(양쪽 어깨 사이 고점 연결선)을 돌파하면 상승 전환 신호입니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">라운드 바텀 (원형 바닥)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              U자 모양으로 서서히 바닥을 형성하는 장기 패턴입니다.
              급격한 반전이 아니라 서서히 매도세가 줄고 매수세가 유입되는 형태로,
              완성까지 수개월이 걸리기도 합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          바닥 패턴의 공통점: <strong>거래량이 줄어든 상태에서 바닥을 다지고,
          돌파 시점에 거래량이 급증</strong>해야 신뢰도가 높습니다.
          거래량 없는 돌파는 &lsquo;속임수(fakeout)&rsquo;일 가능성이 있습니다.
        </HighlightBox>
      </Section>

      <Section id="top" title="3. 천장 패턴 — 매도 타이밍을 알리는 신호">
        <p>
          상승이 끝나고 하락이 시작될 수 있는 구간에서 형성됩니다.
          바닥 패턴을 뒤집어 놓은 형태가 대부분입니다.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">더블탑 (Double Top)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              비슷한 가격대에서 두 번 고점을 찍고 하락하는 &lsquo;M&rsquo; 자 패턴입니다.
              두 번째 고점에서 거래량이 감소하면 상승 동력이 약해진 신호입니다.
              기준선(중간 저점)을 하향 이탈하면 패턴이 완성됩니다.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              단, 더블탑처럼 보이는 형태가 고점이 아닌 구간에서 나타나면
              오히려 상승 플래그 패턴일 수 있으니 <strong className="text-white">주가의 위치</strong>를 반드시 확인하세요.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">헤드앤숄더 (Head &amp; Shoulders)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              왼쪽 어깨 → 머리(더 높은 고점) → 오른쪽 어깨 순서로 세 개의 고점이 형성됩니다.
              가장 전통적이고 신뢰도 높은 천장 패턴 중 하나입니다.
              넥라인을 하향 이탈하면 본격적인 하락 시작으로 봅니다.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border-secondary)] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white mb-2">브로드닝 탑 / 다이아몬드 탑</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              고점과 저점이 동시에 확대되는 형태(브로드닝)나
              확대 후 수렴하는 형태(다이아몬드)입니다.
              변동성이 극도로 커진 상태에서 나타나며,
              시장의 불안정성이 최고조에 달했음을 의미합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="warn">
          천장 패턴은 확인이 어렵습니다.
          &lsquo;고점일 수 있다&rsquo;고 판단하기보다,
          <strong>기준선(넥라인) 이탈을 확인한 후</strong> 대응하는 것이 안전합니다.
          미리 매도하면 이후 추가 상승을 놓칠 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="converge" title="4. 수렴 패턴 — 방향 전환의 전조">
        <p>
          가격 변동폭이 점점 좁아지면서 에너지를 축적하는 패턴입니다.
          수렴이 끝나면 한쪽 방향으로 강하게 이탈하는 경향이 있습니다.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold text-emerald-400 mb-2">어센딩 트라이앵글 (상승 삼각형)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-white">수평선 저항</strong> + <strong className="text-white">상승 추세 지지</strong>로 이루어진 패턴입니다.
              저점이 점점 높아지면서 수평 저항선에 반복 도전합니다.
              상승 확률이 높은 패턴으로 분류되며,
              바닥권뿐 아니라 상승 중에도 자주 나타납니다.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              돌파 시 거래량이 급증해야 하며,
              돌파 후 저항선이 지지선으로 바뀌는지 확인합니다.
            </p>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-2">디센딩 트라이앵글 (하락 삼각형)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-white">수평선 지지</strong> + <strong className="text-white">하락 추세 저항</strong>으로 이루어집니다.
              고점이 점점 낮아지면서 수평 지지선을 반복 테스트합니다.
              하락 확률이 높으며, 천장권이나 추가 하락 시 자주 나타납니다.
            </p>
          </div>

          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs font-bold text-violet-400 mb-2">대칭 트라이앵글 (시메티컬)</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              고점은 낮아지고 저점은 높아지면서 삼각형이 형성됩니다.
              어디서나 발생하는 수렴 패턴이며,
              <strong className="text-white">이탈 방향에 따라</strong> 상승 또는 하락이 결정됩니다.
              방향 예측보다 이탈 후 추종하는 전략이 유효합니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          수렴 패턴의 핵심:
          변동폭이 줄어드는 구간에서는 관망하고,
          <strong>이탈 방향이 확인된 후</strong> 진입하는 것이 원칙입니다.
          이탈 전에 방향을 예측해서 진입하면 반대로 갈 위험이 있습니다.
        </HighlightBox>
      </Section>

      <Section id="trendline" title="5. 추세선 — 모든 패턴의 기초">
        <p>
          차트 패턴을 읽으려면 먼저 추세선을 그릴 줄 알아야 합니다.
        </p>

        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-bold text-white mb-1">상승 추세선</p>
            <p className="text-xs text-zinc-400">
              저점과 저점을 연결합니다. 저점이 높아지면 상승 추세입니다.
              이 선 아래로 주가가 이탈하면 추세 전환 가능성을 의미합니다.
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-bold text-white mb-1">하락 추세선</p>
            <p className="text-xs text-zinc-400">
              고점과 고점을 연결합니다. 고점이 낮아지면 하락 추세입니다.
              이 선 위로 주가가 돌파하면 추세 전환을 기대할 수 있습니다.
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-bold text-white mb-1">횡보 추세 (박스권)</p>
            <p className="text-xs text-zinc-400">
              고점은 비슷하고 저점도 비슷한 구간입니다.
              박스 상단을 돌파하면 상승, 하단을 이탈하면 하락으로 방향이 결정됩니다.
            </p>
          </div>
        </div>

        <HighlightBox variant="info">
          추세선은 <strong>최소 2개의 점</strong>을 연결해야 하고,
          3번째 접점에서 지지/저항이 확인되면 신뢰도가 높아집니다.
          처음에는 고점과 저점을 찾기 어렵지만,
          차트를 많이 보면 자연스럽게 눈에 들어옵니다.
        </HighlightBox>
      </Section>

      <Section id="volume" title="6. 거래량 — 패턴의 신뢰도를 결정하는 열쇠">
        <p>
          차트 패턴에서 가장 중요한 확인 지표는 <strong className="text-white">거래량</strong>입니다.
          같은 패턴이라도 거래량의 양상에 따라 신뢰도가 크게 달라집니다.
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">O</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">돌파 시 거래량 급증</strong> — 많은 참여자가 같은 방향으로 움직이고 있다는 증거
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">O</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">조정(핸들/눌림) 시 거래량 감소</strong> — 매도 압력이 약하다는 의미
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">X</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">거래량 없는 돌파</strong> — 속임수(fakeout) 가능성 높음, 다시 원래 범위로 회귀할 수 있음
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">X</span>
            <p className="text-xs text-zinc-400">
              <strong className="text-white">지지 구간에서 거래량 급증 + 하락</strong> — 매도 세력이 강하다는 경고 신호
            </p>
          </div>
        </div>

        <HighlightBox variant="tip">
          SimplyStock의 차트 하단 거래량 바와 수급 흐름 차트를 함께 확인하면,
          단순 거래량뿐 아니라 <strong>&lsquo;누가&rsquo; 사고 파는지</strong>까지 파악할 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="caution" title="7. 주의사항">
        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>차트 패턴은 과거 통계에 기반한 확률적 도구이며, 미래를 보장하지 않습니다.</li>
            <li>같은 패턴이라도 시장 상황, 업종, 개별 종목 특성에 따라 결과가 다릅니다.</li>
            <li>교과서적인 패턴은 드뭅니다. 실제 차트는 노이즈가 많아 패턴 판단이 주관적일 수 있습니다.</li>
            <li>패턴이 &lsquo;완성&rsquo;되기 전에 미리 진입하면 실패 확률이 높아집니다.</li>
            <li>하나의 패턴만으로 판단하지 말고, 거래량, 수급, 이동평균선 등 복합적으로 확인하세요.</li>
            <li>확증 편향에 주의하세요. 보고 싶은 패턴만 보이는 경향이 있습니다.</li>
          </ul>
        </HighlightBox>
      </Section>
    </GuideLayout>
  );
}
