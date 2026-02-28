export type InvestorTypeKey = "aggressive" | "analytical" | "stable" | "momentum";

export interface InvestorType {
  key: InvestorTypeKey;
  emoji: string;
  name: string;
  description: string;
  traits: string[];
  strengths: string[];
  warnings: string[];
  kimComment: string;
}

export const INVESTOR_TYPES: Record<InvestorTypeKey, InvestorType> = {
  aggressive: {
    key: "aggressive",
    emoji: "⚡",
    name: "공격형 트레이더",
    description: "단기 수익 극대화에 최적화된 스피드형 투자자. 확신이 생기면 과감하게 베팅하고, 손절도 빠르다. 시장의 변동성을 두려워하지 않고 오히려 기회로 활용한다.",
    traits: [
      "빠른 진입·퇴출 — 타이밍이 전부",
      "집중 투자 선호 — 한 종목에 몰빵도 가능",
      "변동성을 기회로 인식",
      "손절 원칙 철저, 미련 없음",
      "장중 실시간 모니터링 습관",
    ],
    strengths: [
      "시장 기회를 빠르게 포착",
      "수익 극대화 가능성 높음",
      "감정에 치우치지 않는 빠른 손절",
    ],
    warnings: [
      "과도한 거래 비용 누적 주의",
      "확신 과잉으로 인한 무리한 베팅",
      "단기 노이즈에 흔들릴 가능성",
    ],
    kimComment: "타이밍은 좋은데, 그 자신감이 데이터 기반인지 감 기반인지부터 따져봐. 둘의 차이가 수익률 차이임.",
  },
  analytical: {
    key: "analytical",
    emoji: "🔬",
    name: "냉철한 분석가",
    description: "숫자와 논리로만 움직이는 가치 투자자. 재무제표를 직접 뜯어보고, 싸게 사서 제값 받을 때까지 기다리는 인내심이 강점이다. 모르는 곳엔 절대 투자하지 않는다.",
    traits: [
      "재무제표·PER·PBR 등 정량 지표 중시",
      "저평가 종목 발굴이 핵심",
      "장기 보유 — 최소 6개월~수년",
      "투자 전 철저한 리서치 필수",
      "실적 발표·공시 분석 습관",
    ],
    strengths: [
      "근거 있는 투자로 성공 확률 높음",
      "장기 복리 효과 극대화",
      "심리적 흔들림 없는 안정감",
    ],
    warnings: [
      "분석에 너무 오래 걸려 기회를 놓치는 '분석 마비'",
      "시장 심리·수급 무시로 단기 손실 감내 필요",
      "저평가 종목이 영원히 저평가일 수도 있음",
    ],
    kimComment: "분석력은 인정. 근데 실행 안 하면 그냥 공부하는 거임. 아는 것과 버는 것은 다른 얘기야.",
  },
  stable: {
    key: "stable",
    emoji: "🛡️",
    name: "안정형 투자자",
    description: "잃지 않는 투자를 최우선으로 하는 수비형 플레이어. 화려한 수익보다 꾸준한 복리를 선호하며, ETF·우량주 중심의 분산 투자로 리스크를 최소화한다.",
    traits: [
      "리스크 관리가 수익보다 우선",
      "ETF·우량주·배당주 중심",
      "10개 이상 분산 투자 선호",
      "적립식 투자 — 꾸준함이 무기",
      "레버리지·파생 절대 사용 안 함",
    ],
    strengths: [
      "심리적 안정감 — 시장 폭락에도 동요 없음",
      "장기 복리의 안정적 수혜",
      "투자 시간 절약 — 삶과 균형 유지",
    ],
    warnings: [
      "인플레이션 대비 실질 수익률 낮을 수 있음",
      "큰 기회가 와도 과감하게 베팅 못함",
      "분산 과다로 집중 수익 불가능",
    ],
    kimComment: "안전하긴 한데 이 정도면 그냥 예금 넣지. S&P500이라도 꾸준히 사면 시장 평균은 따라가겠지만, 그게 목표야?",
  },
  momentum: {
    key: "momentum",
    emoji: "🎯",
    name: "테마 사냥꾼",
    description: "시장 흐름과 뉴스를 읽는 모멘텀 투자자. 트렌드에 올라타는 타이밍이 생명이며, 핫한 섹터를 빠르게 파악하고 관련주를 선점하는 데 특화되어 있다.",
    traits: [
      "테마·섹터 로테이션 전문",
      "뉴스·정책·수급에 민감하게 반응",
      "트렌드 선점 — 남들보다 한 발 앞서",
      "매일 시장 이슈 모니터링",
      "어닝 서프라이즈·수주 공시 주목",
    ],
    strengths: [
      "트렌드 적중 시 단기 고수익 가능",
      "시장 흐름 읽는 직관이 뛰어남",
      "섹터 로테이션으로 리스크 분산",
    ],
    warnings: [
      "뉴스 후행 진입으로 이미 늦은 경우 다반사",
      "테마 소멸 후 고점 물림 위험",
      "잦은 매매로 수수료 비용 누적",
    ],
    kimComment: "뉴스 보고 사면 이미 늦은 거 알고 있냐? 테마주는 선점이 전부야. 1등이 아니면 폭탄 돌리기임.",
  },
};

export interface QuizQuestion {
  q: string;
  options: { label: string; type: InvestorTypeKey }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: "보유 종목이 하루 만에 +15% 급등했습니다. 어떻게 하시겠습니까?",
    options: [
      { label: "즉시 전량 매도, 수익 확정", type: "aggressive" },
      { label: "고평가 여부 분석 후 부분 매도", type: "analytical" },
      { label: "장기 목표 유지, 그냥 보유", type: "stable" },
      { label: "뉴스 확인 후 추가 매수도 고려", type: "momentum" },
    ],
  },
  {
    q: "보유 종목이 -10% 하락했습니다. 당신의 선택은?",
    options: [
      { label: "바로 손절, 다음 종목으로", type: "aggressive" },
      { label: "펀더멘털 점검 후 추가 매수", type: "analytical" },
      { label: "분할 매수로 평단가 낮춤", type: "stable" },
      { label: "섹터 전반 문제면 다른 테마로 이동", type: "momentum" },
    ],
  },
  {
    q: "투자 판단 시 가장 많이 참고하는 것은?",
    options: [
      { label: "최근 주가 흐름과 거래량", type: "aggressive" },
      { label: "재무제표, PER, PBR 등 기본 지표", type: "analytical" },
      { label: "ETF 비중, 시장 전체 흐름", type: "stable" },
      { label: "뉴스, 정책, 테마 동향", type: "momentum" },
    ],
  },
  {
    q: "한 종목에 최대 얼마까지 집중 투자할 수 있습니까?",
    options: [
      { label: "50% 이상도 가능, 확신 있으면", type: "aggressive" },
      { label: "30% 이하, 집중하되 적당히", type: "analytical" },
      { label: "20% 이하, 항상 분산", type: "stable" },
      { label: "상황마다 다름, 테마 따라 결정", type: "momentum" },
    ],
  },
  {
    q: "시장이 갑자기 -5% 폭락했습니다. 당신의 반응은?",
    options: [
      { label: "지금이 기회! 단기 반등 노리고 즉시 매수", type: "aggressive" },
      { label: "보유 종목 펀더멘털 재점검", type: "analytical" },
      { label: "장기 관점에서 이 정도는 노이즈", type: "stable" },
      { label: "어떤 섹터가 빠졌는지, 반등 테마 파악", type: "momentum" },
    ],
  },
  {
    q: "새로운 종목에 투자하기 전, 얼마나 조사합니까?",
    options: [
      { label: "당일~1일, 차트 보고 바로 결정", type: "aggressive" },
      { label: "1~2주 이상, 재무제표 직접 분석", type: "analytical" },
      { label: "ETF라면 별도 조사 거의 없음", type: "stable" },
      { label: "테마 파악되면 빠르게 진입", type: "momentum" },
    ],
  },
  {
    q: "당신의 손절 기준은?",
    options: [
      { label: "-5~10% 내외, 빠른 손절이 원칙", type: "aggressive" },
      { label: "펀더멘털 훼손 없으면 손절 안 함", type: "analytical" },
      { label: "-15% 이하면 손절, 분산으로 타격 최소화", type: "stable" },
      { label: "테마가 끝났다 판단되면 즉시 손절", type: "momentum" },
    ],
  },
  {
    q: "배당주 vs 성장주, 당신의 선택은?",
    options: [
      { label: "성장주, 배당은 너무 느림", type: "aggressive" },
      { label: "저평가 배당주 (가치+배당 조합)", type: "analytical" },
      { label: "고배당 ETF, 안정적 현금흐름", type: "stable" },
      { label: "성장 테마주, 배당보단 상승 차익", type: "momentum" },
    ],
  },
  {
    q: "투자 관련 정보를 얼마나 자주 확인합니까?",
    options: [
      { label: "하루 여러 번, 실시간 모니터링", type: "aggressive" },
      { label: "주 1~2회, 주요 공시·리포트 위주", type: "analytical" },
      { label: "월 1~2회면 충분", type: "stable" },
      { label: "매일 확인, 핫한 이슈 놓치면 안 됨", type: "momentum" },
    ],
  },
  {
    q: "투자로 큰 손실이 났을 때 당신의 반응은?",
    options: [
      { label: "빠르게 손절하고 다음 기회를 찾음", type: "aggressive" },
      { label: "왜 틀렸는지 철저히 분석하고 복기", type: "analytical" },
      { label: "분산 덕분에 큰 타격 없음, 그냥 기다림", type: "stable" },
      { label: "테마 판단 실수 인정, 빠르게 전환", type: "momentum" },
    ],
  },
  {
    q: "연간 목표 수익률은?",
    options: [
      { label: "30% 이상, 그 이하면 의미 없음", type: "aggressive" },
      { label: "10~20%, 시장 대비 알파 추구", type: "analytical" },
      { label: "5~10%, 안정적으로", type: "stable" },
      { label: "테마 적중 시 50% 이상도 가능", type: "momentum" },
    ],
  },
  {
    q: "레버리지 ETF나 파생상품, 활용합니까?",
    options: [
      { label: "확신 있을 때 레버리지 적극 활용", type: "aggressive" },
      { label: "리스크 계산 후 소량만 활용", type: "analytical" },
      { label: "절대 사용 안 함", type: "stable" },
      { label: "상승 테마에 단기 레버리지 활용", type: "momentum" },
    ],
  },
  {
    q: "친구가 특정 종목을 강력 추천했습니다.",
    options: [
      { label: "차트 보고 괜찮으면 즉시 매수", type: "aggressive" },
      { label: "재무제표부터 직접 뜯어봄", type: "analytical" },
      { label: "내 포트폴리오 전략과 맞지 않으면 패스", type: "stable" },
      { label: "해당 섹터 테마 파악 후 관련주 검토", type: "momentum" },
    ],
  },
  {
    q: "투자에서 가장 중요한 것은 무엇이라고 생각합니까?",
    options: [
      { label: "타이밍과 실행 속도", type: "aggressive" },
      { label: "기업의 본질적 가치", type: "analytical" },
      { label: "자본 보전과 리스크 관리", type: "stable" },
      { label: "시장 흐름과 수급 파악", type: "momentum" },
    ],
  },
  {
    q: "주식 투자를 한마디로 표현한다면?",
    options: [
      { label: "전쟁. 빠른 자가 이긴다", type: "aggressive" },
      { label: "공부. 아는 만큼 번다", type: "analytical" },
      { label: "마라톤. 꾸준함이 답이다", type: "stable" },
      { label: "서핑. 파도를 잘 타야 한다", type: "momentum" },
    ],
  },
];

export function calcInvestorType(answers: InvestorTypeKey[]): InvestorType {
  const scores: Record<InvestorTypeKey, number> = {
    aggressive: 0,
    analytical: 0,
    stable: 0,
    momentum: 0,
  };
  answers.forEach((a) => scores[a]++);
  const topKey = (Object.keys(scores) as InvestorTypeKey[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b
  );
  return INVESTOR_TYPES[topKey];
}
