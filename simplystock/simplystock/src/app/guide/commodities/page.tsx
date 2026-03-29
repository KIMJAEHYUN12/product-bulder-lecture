import type { Metadata } from "next";
import { GuideLayout, Section, HighlightBox } from "@/components/guide/GuideLayout";

export const metadata: Metadata = {
  title: "원자재 시세 보는 법",
  description:
    "주식 투자자를 위한 원자재 시세 활용법. 금, 유가, 구리, 곡물 등 주요 원자재와 주식시장의 연결고리를 안내합니다.",
};

const toc = [
  { id: "why-commodities", label: "왜 주식 투자자도 원자재를 봐야 하는가" },
  { id: "how-to-use", label: "SimplyStock 원자재 시세 활용법" },
  { id: "key-commodities", label: "주요 원자재별 핵심 포인트" },
  { id: "stock-link", label: "원자재와 주식의 연결고리" },
  { id: "caution", label: "원자재 투자 시 주의사항" },
];

export default function CommoditiesGuide() {
  return (
    <GuideLayout
      title="원자재 시세 보는 법"
      subtitle="금, 유가, 구리, 곡물... 주식 투자자가 알아야 할 매크로 신호"
      updatedAt="최종 수정일: 2026년 03월 05일"
      toc={toc}
    >
      <Section id="why-commodities" title="1. 왜 주식 투자자도 원자재를 봐야 하는가">
        <p>
          &ldquo;나는 주식만 하는데 왜 원자재를 봐야 하지?&rdquo;라고 생각할 수 있습니다.
          하지만 원자재 가격은 <strong className="text-white">주식시장의 선행 지표</strong> 역할을 합니다.
          유가가 오르면 정유주와 항공주가 움직이고, 구리 가격이 오르면 건설주와 전기차주가 반응합니다.
        </p>
        <p className="mt-3">
          원자재는 인플레이션의 핵심 원인이기도 합니다.
          원자재 가격이 전반적으로 상승하면 물가가 오르고, 중앙은행이 금리를 올리며,
          이는 주식시장 전체에 하방 압력을 가합니다.
          즉 원자재를 모니터링하면 <strong className="text-white">매크로 환경 변화를 미리 감지</strong>할 수 있습니다.
        </p>

        <HighlightBox variant="tip">
          <strong>원자재는 실물 경제의 체온계입니다.</strong>
          경기가 좋으면 원자재 수요가 늘어 가격이 오르고,
          경기가 나빠지면 수요가 줄어 가격이 내립니다.
          주식만 보면 놓치기 쉬운 매크로 신호를 원자재가 먼저 보내줍니다.
        </HighlightBox>
      </Section>

      <Section id="how-to-use" title="2. SimplyStock 원자재 시세 활용법">
        <p>
          SimplyStock은 주요 원자재 시세를 6개 카테고리, 30개 품목으로 정리하여 제공합니다.
          각 품목의 현재 가격과 변동률을 한눈에 확인할 수 있습니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-amber-400 font-bold">귀금속</span>
            <span className="text-xs text-zinc-300">
              금(Gold), 은(Silver), 백금(Platinum), 팔라듐(Palladium).
              안전자산 수요와 산업용 수요를 동시에 반영합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-white font-bold">에너지</span>
            <span className="text-xs text-zinc-300">
              WTI 원유, 브렌트유, 천연가스, 난방유.
              경기 순환과 지정학적 리스크를 가장 민감하게 반영하는 카테고리입니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-cyan-400 font-bold">산업금속</span>
            <span className="text-xs text-zinc-300">
              구리, 알루미늄, 아연, 니켈, 주석.
              제조업 경기와 건설/인프라 투자 수준을 반영합니다.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-20 shrink-0 text-xs text-emerald-400 font-bold">농산물</span>
            <span className="text-xs text-zinc-300">
              옥수수, 밀, 대두, 쌀, 커피, 설탕.
              기상 이변, 수급 불균형, 식량 안보 이슈와 직결됩니다.
            </span>
          </div>
        </div>

        <HighlightBox variant="info">
          원자재 카테고리 탭을 전환하며 각 품목의 일간/주간 변동률을 확인하세요.
          여러 품목이 동시에 급등하면 인플레이션 압력이 커지고 있다는 신호이고,
          동시에 급락하면 경기 둔화 우려가 확산되고 있다는 뜻입니다.
        </HighlightBox>
      </Section>

      <Section id="key-commodities" title="3. 주요 원자재별 핵심 포인트">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-amber-400 mb-2">금(Gold) — 공포의 바로미터</h3>
            <p>
              금은 대표적인 안전자산입니다. 주식시장이 불안할 때, 달러가 약세일 때,
              인플레이션이 심할 때 금값이 오릅니다.
              금값이 급등한다면 시장이 &ldquo;위험&rdquo;을 감지하고 있다는 신호로 읽을 수 있습니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-2">유가(WTI/Brent) — 경기의 맥박</h3>
            <p>
              유가는 글로벌 경기 상황을 가장 직접적으로 반영합니다.
              경기가 좋으면 석유 수요가 늘어 유가가 오르고,
              경기 침체 우려가 커지면 유가가 하락합니다.
              다만 OPEC 감산, 지정학적 충돌 등 공급 측 변수도 크게 작용합니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2">구리(Copper) — Dr. Copper</h3>
            <p>
              구리는 경제학 박사라는 별명(&ldquo;Dr. Copper&rdquo;)이 있을 만큼 경기 예측력이 높습니다.
              건설, 전기, 전자 등 거의 모든 산업에 쓰이기 때문에
              구리 가격 상승은 실물 경제 활황을, 하락은 둔화를 시사합니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-400 mb-2">곡물(Corn/Wheat) — 물가의 뇌관</h3>
            <p>
              곡물 가격은 식료품 물가와 직결됩니다.
              이상 기후, 전쟁, 수출 규제 등으로 곡물 가격이 급등하면
              식품 인플레이션으로 이어져 소비자 지출과 기업 마진에 영향을 줍니다.
            </p>
          </div>
        </div>
      </Section>

      <Section id="stock-link" title="4. 원자재와 주식의 연결고리">
        <p>
          원자재 가격 변동은 관련 업종의 주가에 직접적으로 영향을 미칩니다.
          다음은 주요 연결 고리입니다.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-white font-bold">유가 &uarr;</span>
            <span className="text-xs text-zinc-300">
              정유주(SK이노베이션, S-Oil) 수혜, 항공주(대한항공, 아시아나) 비용 증가,
              화학주(LG화학, 롯데케미칼) 원가 부담 증가.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-white font-bold">구리 &uarr;</span>
            <span className="text-xs text-zinc-300">
              전기차/2차전지 관련주 비용 증가, 건설주 원가 부담,
              비철금속 업체(풍산) 수혜.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-white font-bold">금 &uarr;</span>
            <span className="text-xs text-zinc-300">
              금 관련 ETF 및 광산주 수혜. 위험자산(성장주) 선호도 하락 가능성.
              달러 약세 시 수출 기업에 긍정적.
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-3">
            <span className="w-16 shrink-0 text-xs text-white font-bold">곡물 &uarr;</span>
            <span className="text-xs text-zinc-300">
              식품주(CJ제일제당, 오뚜기) 원가 부담, 사료주(팜한농) 비용 증가,
              비료주 수혜 가능성.
            </span>
          </div>
        </div>

        <HighlightBox variant="tip">
          <strong>원자재 시세를 매일 체크하는 습관</strong>을 들이세요.
          보유 종목과 관련된 원자재가 갑자기 급등/급락하면
          해당 종목의 주가에도 곧 영향이 올 수 있습니다.
        </HighlightBox>
      </Section>

      <Section id="caution" title="5. 원자재 투자 시 주의사항">
        <p>
          원자재를 직접 투자 대상으로 삼을 때는 주식과 다른 특성을 이해해야 합니다.
        </p>

        <HighlightBox variant="warn">
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>선물 롤오버 비용:</strong> 원자재 ETF는 선물 계약을 매달 교체(롤오버)하는데,
              이 과정에서 비용이 발생하여 장기 보유 시 원자재 현물 가격과 괴리가 생깁니다.
            </li>
            <li>
              <strong>콘탱고(Contango):</strong> 미래 가격이 현재 가격보다 높은 상태에서
              선물을 교체하면 &ldquo;비싸게 사서 싸게 파는&rdquo; 효과가 누적됩니다.
            </li>
            <li>
              <strong>환율 영향:</strong> 원자재는 달러로 거래되므로
              원/달러 환율 변동이 원화 기준 수익률에 큰 영향을 줍니다.
              달러 강세 시 원자재 가격이 하락해도 원화 기준으로는 손실이 제한될 수 있고, 그 반대도 가능합니다.
            </li>
            <li>
              <strong>ETF vs 선물:</strong> 개인 투자자는 선물 직접 거래보다
              원자재 ETF/ETN을 통한 간접 투자가 안전합니다.
              다만 ETF의 구조(합성형 vs 실물형)를 반드시 확인하세요.
            </li>
          </ul>
        </HighlightBox>

        <p className="mt-3">
          원자재 시세는 직접 투자하지 않더라도{" "}
          <strong className="text-white">매크로 환경을 읽는 도구</strong>로서 큰 가치가 있습니다.
          SimplyStock의 원자재 탭을 통해 글로벌 경기 흐름을 파악하고,
          보유 종목에 미칠 영향을 미리 예측하는 습관을 기르세요.
        </p>
      </Section>
    </GuideLayout>
  );
}
