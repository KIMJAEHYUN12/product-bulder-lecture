import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "수급 흐름 읽는 법",
  description:
    "외국인·기관·개인 투자자의 누적 순매매 흐름으로 세력의 매집과 이탈을 파악하는 방법.",
};

const toc = [
  { id: "why", label: "왜 '오늘의 매매동향'만 보면 당할까?" },
  { id: "cross", label: "수급 크로스(Cross)의 진정한 의미" },
  { id: "cumulative", label: "누적 수급으로 보는 세력의 의도" },
  { id: "combo", label: "실전! 수급과 빗각의 콜라보레이션" },
  { id: "summary", label: "핵심 요약" },
];

export default function InvestorFlowGuide() {
  return (
    <GuideLayout
      title="큰손들의 발자국, '수급 흐름(Investor Flow)' 해석하기"
      subtitle="수급은 거짓말을 하지 않습니다"
      updatedAt="최종 수정일: 2026년 03월 04일"
      toc={toc}
    >
      <Section id="why" title="1. 왜 '오늘의 매매동향'만 보면 당할까?">
        <p>
          대부분의 초보 투자자는 당일의 매매동향(외국인/기관 순매수)만 보고
          &ldquo;아, 오늘 들어왔네!&rdquo;라고 판단합니다.
          하지만 이것은 공장에서{" "}
          <strong className="text-white">&lsquo;오늘 생산량&rsquo;</strong>만 보고
          전체 재고 상황을 모르는 것과 같습니다.
        </p>
        <p className="mt-3">
          수급은 <strong className="text-white">&lsquo;누적&rsquo;</strong>이 핵심입니다.
          외국인이 3일 연속 팔다가 오늘 하루 조금 샀다고 해서 추세가 전환된 게 아닙니다.
        </p>

        <HighlightBox variant="info">
          SimplyStock의 수급 흐름 차트는 일별 순매매를 날짜순으로 누적 합산하여 보여줍니다.
          당일 수치가 아닌 <strong>흐름의 방향</strong>을 읽는 것이 핵심입니다.
        </HighlightBox>
      </Section>

      <Section id="cross" title="2. '수급 크로스(Cross)'의 진정한 의미">
        <p>
          수급을 읽을 때 가장 중요한 것은{" "}
          <strong className="text-white">&lsquo;주체별 포지션 변화&rsquo;</strong>입니다.
          빗각 분석에서 말하는 채널 하단이 나왔을 때, 수급이 어떻게 움직이는지 살펴보세요.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold text-emerald-400 mb-2">기관과 외국인의 동행 (쌍끌이 매수)</p>
            <p className="text-xs text-zinc-300">
              이들이 함께 쌍끌이 매수를 한다면?
              그 종목은 이미 대세 상승의 초입에 진입했을 확률이 높습니다.
              공장으로 치면 <strong className="text-white">메인 라인이 풀가동</strong>되는 것과 같습니다.
            </p>
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 mb-2">개인의 역행 (주의 구간)</p>
            <p className="text-xs text-zinc-300">
              외국인과 기관이 팔고 있는데, 개인들만 받아내는 구간이 있습니다.
              차트상으로는 버티는 것처럼 보이지만,
              이는 <strong className="text-white">&lsquo;정리 구간&rsquo;</strong>일 가능성이 높습니다.
              스마트 머니가 빠져나간 자리를 개인의 기대감이 채우고 있는 흐름입니다.
            </p>
          </div>
        </div>

      </Section>

      <Section id="cumulative" title="3. '누적 수급'으로 보는 세력의 의도">
        <p>
          SimplyStock에서 제공하는 수급 테이블은 단순 당일 수치가 아닙니다.
          일정 기간(1개월, 3개월 등)의 누적 수급을 확인하세요.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs font-bold text-indigo-400 mb-2">매집의 흔적</p>
            <p className="text-xs text-zinc-300">
              주가는 횡보하는데 기관의 누적 순매수 그래프가 우상향하고 있다면?
              그것은 누군가 물량을 조용히 <strong className="text-white">&lsquo;매집&rsquo;</strong>하고 있다는
              흔적입니다. 빗각이 평평하게 유지되면서 이런 수급이 포착된다면,
              그곳이 바로 <strong className="text-white">&lsquo;기다림의 끝&rsquo;</strong>입니다.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold text-amber-400 mb-2">이탈의 징후</p>
            <p className="text-xs text-zinc-300">
              고점에서 기관/외국인의 누적 수급이 꺾이기 시작했다면,
              그건 수익 실현을 하고 있다는 뜻입니다.
              빗각이 상단에 닿았을 때 수급까지 이탈한다면,
              수익을 확정 짓는 <strong className="text-white">&lsquo;대응&rsquo;</strong>이 필요합니다.
            </p>
          </div>
        </div>

      </Section>

      <Section id="combo" title="4. 실전! 수급과 빗각의 콜라보레이션">
        <p>
          주목할 만한 타이밍은{" "}
          <strong className="text-white">[빗각 하단 지지] + [기관/외국인의 3일 이상 누적 순매수]</strong>가
          겹칠 때입니다.
        </p>

        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs font-bold text-cyan-400">빗각 하단</span>
            <span className="text-xs text-zinc-300">
              &lsquo;가격적 메리트&rsquo;를 제공합니다.
              통계적으로 평균 대비 많이 떨어진 구간입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs font-bold text-cyan-400">수급 유입</span>
            <span className="text-xs text-zinc-300">
              &lsquo;시장의 관심&rsquo;을 보여줍니다.
              큰 자금이 해당 가격대에서 움직이고 있다는 흔적입니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="tip">
          이 두 가지가 합쳐진 자리는 단순한 기술적 반등이 아니라{" "}
          <strong>&lsquo;추세 전환의 가능성&rsquo;</strong>을 시사하는 구간이 됩니다.
          반드시 다른 지표와 함께 종합적으로 확인하세요.
        </HighlightBox>

      </Section>

      <Section id="summary" title="핵심 요약">
        <HighlightBox variant="info">
          수급은 거짓말을 하지 않습니다.
          차트가 캔들이라는 &lsquo;가면&rsquo;을 쓰고 있다면,
          수급은 그 가면 뒤에 숨은 세력의 &lsquo;진짜 얼굴&rsquo;입니다.
          빗각이라는 도로 위에서 큰손들이 어떤 차를 타고 이동하는지,
          SimplyStock으로 확인해 보세요.
        </HighlightBox>

        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>수급 흐름은 과거 데이터의 시각화이며, 미래 주가 방향을 보장하지 않습니다.</li>
            <li>특정 주체의 매수/매도가 반드시 주가 상승/하락으로 이어지는 것은 아닙니다.</li>
            <li>수급은 여러 분석 지표 중 하나이며, 단독으로 투자 판단의 근거가 될 수 없습니다.</li>
            <li>반드시 채널 위치, 재무, 뉴스 등 다른 정보와 종합적으로 판단하세요.</li>
          </ul>
        </HighlightBox>
      </Section>

      <div className="mt-6 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
        <p className="text-[10px] font-medium text-[var(--text-faint)] mb-2">관련 종목 분석</p>
        <div className="flex flex-wrap gap-2">
          <a href="/stock/005930/" className="text-xs text-indigo-400 hover:underline">삼성전자 수급 흐름 →</a>
          <a href="/stock/035720/" className="text-xs text-indigo-400 hover:underline">카카오 수급 흐름 →</a>
          <a href="/stock/" className="text-xs text-[var(--text-muted)] hover:underline">전체 종목 보기 →</a>
        </div>
      </div>
    </GuideLayout>
  );
}
