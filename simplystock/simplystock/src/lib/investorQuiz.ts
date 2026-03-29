export type InvestorTypeKey =
  | "visionary"
  | "dealmaker"
  | "sage"
  | "strategist"
  | "hunter"
  | "observer"
  | "contrarian"
  | "explorer";

export interface InvestorType {
  key: InvestorTypeKey;
  emoji: string;
  name: string;
  subtitle: string;
  description: string;
  traits: string[];
  strengths: string[];
  warnings: string[];
  assets: string[];
  comment: string;
}

export const INVESTOR_TYPES: Record<InvestorTypeKey, InvestorType> = {
  visionary: {
    key: "visionary",
    emoji: "🚀",
    name: "화성행 티켓을 쥔 혁신가",
    subtitle: "미래에 투자하는 대담한 선구자",
    description:
      "10년 후를 보고 오늘 베팅하는 파괴적 혁신의 신봉자. 남들이 '미쳤다'고 할 때 확신을 갖고 올인하며, 기존 산업을 뒤집을 기술과 비전에 투자한다.",
    traits: [
      "파괴적 혁신 기업에 장기 올인",
      "남들이 이해 못하는 미래 기술에 베팅",
      "단기 손실에도 흔들리지 않는 확신",
      "전기차·우주·AI 등 미래 산업 집중",
    ],
    strengths: [
      "시대를 앞서가는 투자 안목",
      "확신에 기반한 장기 보유 능력",
      "혁신 산업의 초기 수혜 가능성",
    ],
    warnings: [
      "과도한 집중 투자로 리스크 극대화",
      "비전과 망상의 경계가 모호할 수 있음",
      "현금흐름 없는 기업에 장기 묶일 위험",
    ],
    assets: ["테슬라", "우주항공 ETF", "AI/로봇 ETF", "비트코인"],
    comment:
      "비전은 멋진데, 화성 가기 전에 지구에서 밥은 먹고 살아야지. 확신과 고집은 한 끗 차이야.",
  },
  dealmaker: {
    key: "dealmaker",
    emoji: "🏛️",
    name: "승부를 거는 딜메이커",
    subtitle: "레버리지와 협상의 달인",
    description:
      "투자도 비즈니스처럼 접근하는 거래의 기술자. 실물 자산과 브랜드 가치를 중시하고, 레버리지를 무기 삼아 큰 판을 벌인다.",
    traits: [
      "실물 자산(부동산·금) 중심 포트폴리오",
      "레버리지를 전략적으로 활용",
      "브랜드 파워와 독점적 가치 중시",
      "위기를 저가 매수 기회로 활용",
    ],
    strengths: [
      "실물 자산 기반의 안정적 수익",
      "레버리지 활용으로 수익 극대화",
      "위기 상황에서의 과감한 의사결정",
    ],
    warnings: [
      "레버리지 과다 시 큰 손실 가능",
      "자신감 과잉으로 리스크 과소평가",
      "유동성 부족 시 실물 자산 처분 어려움",
    ],
    assets: ["리츠(REITs)", "금", "고배당주", "부동산 ETF"],
    comment:
      "딜은 잘 치는데 레버리지가 양날의 검인 거 알지? 빚으로 번 돈은 빚으로 날아갈 수도 있어.",
  },
  sage: {
    key: "sage",
    emoji: "🦉",
    name: "시간을 이기는 현인",
    subtitle: "복리와 인내의 철학자",
    description:
      "좋은 기업을 적정 가격에 사서 영원히 보유하는 가치 투자의 정석. 기업의 경제적 해자(moat)를 꿰뚫어 보고, 시간이 만드는 복리의 마법을 믿는다.",
    traits: [
      "경제적 해자(moat) 있는 기업만 선별",
      "적정 가격 이하에서만 매수 (안전마진)",
      "보유 기간은 영원이 기본",
      "시장 공포 = 매수 기회",
    ],
    strengths: [
      "장기 복리 효과 극대화",
      "심리적으로 가장 안정적인 투자",
      "검증된 우량 기업 중심의 안정성",
    ],
    warnings: [
      "성장 기회를 놓칠 수 있음",
      "가치 함정(value trap)에 빠질 위험",
      "시장 변화에 대한 적응이 느릴 수 있음",
    ],
    assets: ["S&P500 ETF", "삼성전자", "코카콜라", "배당성장 ETF"],
    comment:
      "인내심은 인정인데, 세상이 너무 빨리 변하잖아. 해자가 메워지는 속도도 체크해야지.",
  },
  strategist: {
    key: "strategist",
    emoji: "⚙️",
    name: "시스템을 설계하는 전략가",
    subtitle: "원칙과 분산의 설계자",
    description:
      "감정이 아닌 시스템으로 투자하는 원칙주의자. 모든 시나리오에 대비한 올웨더 포트폴리오를 구축하고, 리밸런싱 규칙을 철저히 따른다.",
    traits: [
      "자산 배분 원칙을 시스템화",
      "주식·채권·원자재·금 글로벌 분산",
      "정기 리밸런싱 규칙 철저히 준수",
      "감정 배제, 데이터 기반 의사결정",
    ],
    strengths: [
      "어떤 시장에서도 방어 가능한 안정성",
      "감정에 흔들리지 않는 일관된 실행",
      "장기적으로 변동성 대비 우수한 성과",
    ],
    warnings: [
      "상승장에서 수익률이 상대적으로 낮음",
      "시스템 과신으로 예외 상황 대응 부족",
      "지나친 분산으로 집중 수익 불가",
    ],
    assets: ["올웨더 포트폴리오", "채권 ETF", "원자재 ETF", "글로벌 분산 ETF"],
    comment:
      "시스템은 완벽한데 시장이 시스템대로 안 움직이면? 원칙도 좋지만 유연함도 필요해.",
  },
  hunter: {
    key: "hunter",
    emoji: "🦅",
    name: "시장의 빈틈을 노리는 사냥꾼",
    subtitle: "거시경제를 읽는 승부사",
    description:
      "거시 경제의 흐름을 읽고 시장의 구조적 불균형을 파고드는 매크로 투자자. 평소에는 인내하다가 확신이 생기면 한 방에 크게 베팅한다.",
    traits: [
      "거시 경제 지표를 항상 추적",
      "시장의 구조적 불균형을 포착",
      "확신이 있을 때만 크게 베팅",
      "통화·금리·정책 변화에 민감",
    ],
    strengths: [
      "거시 흐름 적중 시 폭발적 수익",
      "시장 구조를 꿰뚫는 통찰력",
      "위기를 기회로 전환하는 능력",
    ],
    warnings: [
      "타이밍 실패 시 큰 손실 가능",
      "거시 분석이 틀릴 수도 있음",
      "집중 베팅의 리스크가 매우 높음",
    ],
    assets: ["외환", "신흥국 ETF", "원유 선물 ETF", "매크로 전략 펀드"],
    comment:
      "빈틈을 잘 찾는데, 그게 진짜 빈틈인지 함정인지 구분이 중요해. 사냥감이 되지 않도록.",
  },
  observer: {
    key: "observer",
    emoji: "🔍",
    name: "일상에서 보석을 캐는 관찰자",
    subtitle: "아는 것에만 투자하는 현실주의자",
    description:
      "마트에서, 거리에서, 일상 속에서 투자 아이디어를 발견하는 생활 밀착형 투자자. '내가 아는 것에 투자한다'는 원칙으로 이해할 수 있는 기업에만 집중한다.",
    traits: [
      "일상에서 소비 트렌드 변화를 포착",
      "이해 가능한 비즈니스 모델에만 투자",
      "PEG 비율로 성장 대비 가격 평가",
      "직접 발로 뛰어 기업을 조사",
    ],
    strengths: [
      "누구나 실천 가능한 투자 방법",
      "기업 이해도가 높아 리스크 관리 용이",
      "조기 발굴 시 높은 수익 가능",
    ],
    warnings: [
      "관찰 범위가 경험에 한정될 수 있음",
      "감각과 데이터의 괴리 발생 가능",
      "소형주 유동성 리스크",
    ],
    assets: ["소비재 ETF", "유통/리테일", "일상 브랜드 대형주", "중소형 성장주"],
    comment:
      "관찰력은 좋은데, 마트에서 잘 팔린다고 주가도 오르는 건 아니야. 숫자도 같이 봐.",
  },
  contrarian: {
    key: "contrarian",
    emoji: "🐻",
    name: "세상과 반대로 가는 역발상가",
    subtitle: "위기 속에서 기회를 찾는 독행자",
    description:
      "모두가 사고 싶을 때 팔고, 모두가 도망칠 때 산다. 시장의 광기와 공포를 이용해 극단적 저평가 자산을 발굴하며, 소신으로 세상과 반대 방향에 베팅한다.",
    traits: [
      "군중 심리의 정반대로 행동",
      "극단적 저평가 자산을 깊이 리서치",
      "위기 상황에서 과감하게 매수",
      "시장의 과열/버블 신호를 주시",
    ],
    strengths: [
      "버블 붕괴 시 큰 수익 가능",
      "남들이 못 보는 가치를 발견하는 눈",
      "시장 과열에 대한 경각심",
    ],
    warnings: [
      "시장이 비이성적 상태를 오래 유지할 수 있음",
      "너무 이른 진입으로 장기 손실 가능",
      "주변의 반대 의견에 외로운 싸움",
    ],
    assets: ["가치주 ETF", "경기방어주", "인버스 ETF", "침체 수혜 섹터"],
    comment:
      "역발상은 좋은데, '시장이 틀렸다'와 '내가 틀렸다'의 차이를 아는 게 핵심이야.",
  },
  explorer: {
    key: "explorer",
    emoji: "🧭",
    name: "미래를 선점하는 탐험가",
    subtitle: "파괴적 혁신 테마의 선구자",
    description:
      "아직 시장이 주목하지 않는 파괴적 혁신 테마를 먼저 발굴하고 선점하는 테마 투자 전문가. 높은 확신으로 미래 성장 산업에 집중 투자한다.",
    traits: [
      "파괴적 혁신 테마 선점 투자",
      "2차전지·바이오·핀테크 등 신산업 집중",
      "높은 확신으로 성장주에 집중 투자",
      "기술 트렌드 리포트를 꼼꼼히 분석",
    ],
    strengths: [
      "성장 산업 초기 진입으로 높은 수익 가능",
      "트렌드 변화를 빠르게 읽는 감각",
      "테마별 분산으로 리스크 조절",
    ],
    warnings: [
      "테마 소멸 시 큰 손실 가능",
      "실적 없는 기업에 과도한 기대",
      "높은 변동성에 심리적 부담",
    ],
    assets: ["2차전지 ETF", "바이오 ETF", "핀테크", "ARK 스타일 테마 ETF"],
    comment:
      "탐험은 좋은데, 지도 없이 가면 조난당해. 테마 열풍과 진짜 혁신을 구분하는 눈이 필요해.",
  },
};

export interface QuizQuestion {
  q: string;
  options: { label: string; type: InvestorTypeKey }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: "보유 종목이 하루 만에 +20% 급등했습니다. 어떻게 하시겠습니까?",
    options: [
      { label: "비전이 맞았으니 그대로 보유, 화성까지 간다", type: "visionary" },
      { label: "수익 일부로 레버리지 추가 투자", type: "dealmaker" },
      { label: "좋은 기업이면 그냥 보유, 흔들리지 않는다", type: "sage" },
      { label: "시스템 규칙에 따라 리밸런싱", type: "strategist" },
    ],
  },
  {
    q: "보유 종목이 -15% 하락했습니다. 당신의 선택은?",
    options: [
      { label: "거시 분석 결과 추세 전환이면 전량 매도", type: "hunter" },
      { label: "내가 이해하는 기업이니 추가 매수", type: "observer" },
      { label: "오히려 공포에 사야 할 때, 과감히 줍줍", type: "contrarian" },
      { label: "테마 자체가 살아있으면 분할 매수", type: "explorer" },
    ],
  },
  {
    q: "시장이 갑자기 -8% 폭락했습니다. 당신의 반응은?",
    options: [
      { label: "레버리지 반등 매매 기회!", type: "dealmaker" },
      { label: "이런 날이 바로 매수 기회, 현금 투입", type: "sage" },
      { label: "공포 지수 급등 = 최고의 매수 타이밍", type: "contrarian" },
      { label: "포트폴리오 비중 재점검 후 규칙대로 대응", type: "strategist" },
    ],
  },
  {
    q: "투자한 종목이 3개월째 횡보 중입니다. 어떻게 합니까?",
    options: [
      { label: "혁신 기업이면 3년도 기다릴 수 있다", type: "visionary" },
      { label: "거시 환경 변화가 없으면 유지", type: "hunter" },
      { label: "일상에서 이 기업 제품이 잘 팔리는지 확인", type: "observer" },
      { label: "테마 모멘텀이 살아있는지 체크 후 결정", type: "explorer" },
    ],
  },
  {
    q: "투자 판단 시 가장 중요하게 보는 것은?",
    options: [
      { label: "기술 혁신성과 CEO의 비전", type: "visionary" },
      { label: "재무제표와 경제적 해자(moat)", type: "sage" },
      { label: "금리·환율·통화정책 등 거시 지표", type: "hunter" },
      { label: "산업 리포트와 기술 트렌드 분석", type: "explorer" },
    ],
  },
  {
    q: "새로운 종목에 투자하기 전, 당신의 조사 방식은?",
    options: [
      { label: "자산 배분 모델에 맞는지 시뮬레이션 돌려봄", type: "strategist" },
      { label: "그 기업 제품을 직접 써보고 주변 반응 확인", type: "observer" },
      { label: "시장 컨센서스와 반대 논리가 있는지 탐색", type: "contrarian" },
      { label: "실물 자산 가치와 현금흐름 분석", type: "dealmaker" },
    ],
  },
  {
    q: "친구가 특정 종목을 강력 추천합니다. 당신의 반응은?",
    options: [
      { label: "그 기업이 세상을 바꿀 수 있는지만 본다", type: "visionary" },
      { label: "모두가 좋다고 하면 오히려 경계한다", type: "contrarian" },
      { label: "관련 섹터의 성장 가능성을 리서치", type: "explorer" },
      { label: "해자가 있는 기업인지 재무제표부터 확인", type: "sage" },
    ],
  },
  {
    q: "당신의 손절 기준은?",
    options: [
      { label: "비전이 유효하면 손절 안 함, 오히려 추가 매수", type: "visionary" },
      { label: "거시 환경이 바뀌면 즉시 전량 매도", type: "hunter" },
      { label: "시스템에 미리 설정한 룰에 따라 자동 실행", type: "strategist" },
      { label: "테마가 끝났다 판단되면 빠르게 전환", type: "explorer" },
    ],
  },
  {
    q: "레버리지 ETF나 파생상품, 활용합니까?",
    options: [
      { label: "레버리지는 나의 무기, 확신 있을 때 적극 활용", type: "dealmaker" },
      { label: "리스크 계산 후 포트폴리오의 일부로만 편입", type: "strategist" },
      { label: "인버스/풋옵션으로 하락에 베팅하기도 한다", type: "contrarian" },
      { label: "절대 사용 안 함, 원금 보전이 우선", type: "sage" },
    ],
  },
  {
    q: "포트폴리오에 손실 종목이 있는데 뉴스에서 악재가 터졌습니다.",
    options: [
      { label: "기업 해자가 건재하면 악재는 노이즈일 뿐", type: "sage" },
      { label: "군중이 패닉할 때 역으로 줍는다", type: "contrarian" },
      { label: "매장이나 서비스를 직접 가서 확인해본다", type: "observer" },
      { label: "거시 흐름과 연결된 악재인지 분석", type: "hunter" },
    ],
  },
  {
    q: "이상적인 투자 기간은?",
    options: [
      { label: "10년 이상, 미래 산업이 현실이 될 때까지", type: "visionary" },
      { label: "5~10년, 복리가 마법을 부릴 때까지", type: "sage" },
      { label: "사이클에 따라 유동적, 수개월~수년", type: "hunter" },
      { label: "테마 성장기에 집중, 2~5년", type: "explorer" },
    ],
  },
  {
    q: "1억 원이 생겼습니다. 어떻게 투자하시겠습니까?",
    options: [
      { label: "부동산·리츠에 레버리지 끼고 투자", type: "dealmaker" },
      { label: "주식·채권·금·원자재 4등분 분산", type: "strategist" },
      { label: "내가 자주 가는 가게의 상장 기업에 투자", type: "observer" },
      { label: "2차전지·AI·바이오 성장 테마에 분배", type: "explorer" },
    ],
  },
  {
    q: "투자 관련 정보를 얼마나 자주 확인합니까?",
    options: [
      { label: "분기 1회, 리밸런싱 때만 확인하면 충분", type: "strategist" },
      { label: "매일 경제 뉴스·거시 지표 모니터링", type: "hunter" },
      { label: "마트·거리에서 항상 트렌드를 관찰 중", type: "observer" },
      { label: "혁신 기업 뉴스는 실시간으로 챙겨봄", type: "visionary" },
    ],
  },
  {
    q: "투자에서 가장 중요한 것은?",
    options: [
      { label: "미래를 바꿀 비전과 혁신", type: "visionary" },
      { label: "실물 가치와 현금흐름", type: "dealmaker" },
      { label: "기업의 본질적 가치와 안전마진", type: "sage" },
      { label: "원칙과 시스템에 따른 일관된 실행", type: "strategist" },
    ],
  },
  {
    q: "주식 투자를 한마디로 표현한다면?",
    options: [
      { label: "전쟁. 거시 흐름을 읽고 크게 승부하는 것", type: "hunter" },
      { label: "보물찾기. 일상 속에서 숨은 보석을 캐는 것", type: "observer" },
      { label: "역주행. 남들과 반대로 가야 큰돈을 번다", type: "contrarian" },
      { label: "탐험. 아직 아무도 가지 않은 길을 개척하는 것", type: "explorer" },
    ],
  },
  {
    q: "가장 존경하는 투자 철학은?",
    options: [
      { label: "기업의 해자를 찾아 영원히 보유하라", type: "sage" },
      { label: "모든 시나리오에 대비하는 시스템을 만들어라", type: "strategist" },
      { label: "남들이 탐욕스러울 때 두려워하라", type: "contrarian" },
      { label: "아는 것에 투자하고, 모르면 공부하라", type: "observer" },
    ],
  },
  {
    q: "연간 목표 수익률은?",
    options: [
      { label: "100%+, 혁신 기업은 10배도 가능", type: "visionary" },
      { label: "20~30%, 레버리지 활용하면 충분히", type: "dealmaker" },
      { label: "10~15%, 시장 수익률만 꾸준히 이기면 충분", type: "sage" },
      { label: "시장 상황별로 다름, 수익률보다 리스크 관리", type: "strategist" },
    ],
  },
  {
    q: "타임머신이 있다면 어떤 투자를 하시겠습니까?",
    options: [
      { label: "2010년에 테슬라 IPO 올인", type: "visionary" },
      { label: "2008년 금융위기 직전에 풋옵션 매수", type: "contrarian" },
      { label: "1990년대 맨해튼 부동산 매입", type: "dealmaker" },
      { label: "2000년에 아마존 사서 아직까지 보유", type: "sage" },
    ],
  },
  {
    q: "무인도에 딱 하나의 투자 도구만 가져갈 수 있다면?",
    options: [
      { label: "글로벌 거시 경제 대시보드", type: "hunter" },
      { label: "소비자 트렌드 리포트", type: "observer" },
      { label: "자동 리밸런싱 시스템", type: "strategist" },
      { label: "미래 기술 트렌드 보고서", type: "explorer" },
    ],
  },
  {
    q: "투자 세계에서 당신의 별명은?",
    options: [
      { label: "미래에서 온 사람 — 남들보다 10년 앞서 생각", type: "visionary" },
      { label: "부동산 황제 — 실물로 제국을 건설", type: "dealmaker" },
      { label: "공포의 매수자 — 시장이 울 때 웃는다", type: "contrarian" },
      { label: "테마 사냥꾼 — 다음 빅 트렌드를 먼저 발견", type: "explorer" },
    ],
  },
];

export function calcInvestorType(answers: InvestorTypeKey[]): InvestorType {
  const scores: Record<InvestorTypeKey, number> = {
    visionary: 0,
    dealmaker: 0,
    sage: 0,
    strategist: 0,
    hunter: 0,
    observer: 0,
    contrarian: 0,
    explorer: 0,
  };
  answers.forEach((a) => scores[a]++);
  const topKey = (Object.keys(scores) as InvestorTypeKey[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b,
  );
  return INVESTOR_TYPES[topKey];
}
