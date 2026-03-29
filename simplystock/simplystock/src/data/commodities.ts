export type CommodityCategory =
  | "귀금속"
  | "에너지"
  | "산업금속"
  | "농산물"
  | "ETF/지수"
  | "기타";

export interface CommodityInfo {
  slug: string;
  name: string;
  nameEn: string;
  symbol: string;
  category: CommodityCategory;
  unit: string;
  exchange: string;
  description: string;
  priceDrivers: string[];
  investmentMethods: string[];
  relatedEtfs: string[];
  riskFactors: string[];
}

export const CATEGORIES: CommodityCategory[] = [
  "귀금속",
  "에너지",
  "산업금속",
  "농산물",
  "ETF/지수",
  "기타",
];

export const ALL_COMMODITIES: CommodityInfo[] = [
  // ── 귀금속 ──────────────────────────────────────────
  {
    slug: "gold",
    name: "금",
    nameEn: "Gold",
    symbol: "GC=F",
    category: "귀금속",
    unit: "트로이온스(oz)",
    exchange: "COMEX",
    description:
      "금은 수천 년간 가치 저장 수단으로 사용되어 온 대표적인 귀금속입니다. 인플레이션 헤지, 안전자산 수요, 중앙은행 매입 등으로 수요가 결정되며, 달러 가치와 역의 상관관계를 가지는 경향이 있습니다. 보석 수요(약 50%), 투자 수요(약 25%), 중앙은행 매입(약 15%), 산업용(약 10%)으로 구성됩니다.",
    priceDrivers: [
      "미국 달러 인덱스(DXY) — 달러 약세 시 금값 상승 경향",
      "실질금리 — 실질금리 하락 시 금의 기회비용 감소로 상승",
      "지정학적 리스크 — 전쟁, 금융위기 시 안전자산 수요 급증",
      "중앙은행 금 매입량 — 2022년 이후 역대급 매입 지속",
      "인플레이션 기대 — 물가 상승 시 실물자산 선호 증가",
    ],
    investmentMethods: [
      "금 선물(GC) — COMEX에서 거래, 레버리지 가능",
      "금 ETF(GLD, IAU) — 실물 금 보유 ETF로 간편 투자",
      "KRX 금시장 — 한국거래소에서 1g 단위 매매 가능",
      "골드바/금화 — 실물 보유, 부가세 면제(KRX 경유)",
    ],
    relatedEtfs: ["GLD", "IAU", "SGOL"],
    riskFactors: [
      "금리 인상기에 상대적 매력 감소",
      "달러 초강세 시 하락 압력",
      "배당·이자 수익 없음",
    ],
  },
  {
    slug: "silver",
    name: "은",
    nameEn: "Silver",
    symbol: "SI=F",
    category: "귀금속",
    unit: "트로이온스(oz)",
    exchange: "COMEX",
    description:
      "은은 귀금속이면서 동시에 산업용 금속의 성격을 가집니다. 전체 수요의 약 50%가 산업용(태양광 패널, 전자부품, 의료기기)이며, 나머지가 투자·보석 수요입니다. 금보다 변동성이 크고, 금/은 비율(Gold/Silver Ratio)이 투자 판단의 주요 지표로 활용됩니다.",
    priceDrivers: [
      "산업 수요 — 태양광 패널 설치량 증가가 핵심 변수",
      "금/은 비율 — 80 이상이면 은이 상대적 저평가",
      "달러 가치와 금리 — 금과 유사한 방향성",
      "광산 공급 — 은 전용 광산 비중이 낮아 공급 경직적",
    ],
    investmentMethods: [
      "은 선물(SI) — COMEX 거래",
      "은 ETF(SLV, SIVR) — 실물 은 보유 ETF",
      "은 관련 광산주 — First Majestic Silver 등",
    ],
    relatedEtfs: ["SLV", "SIVR"],
    riskFactors: [
      "금 대비 2~3배 높은 변동성",
      "경기 침체 시 산업 수요 감소",
      "보관·운송 비용이 금보다 높음",
    ],
  },
  {
    slug: "platinum",
    name: "백금",
    nameEn: "Platinum",
    symbol: "PL=F",
    category: "귀금속",
    unit: "트로이온스(oz)",
    exchange: "NYMEX",
    description:
      "백금(플래티넘)은 자동차 촉매변환기, 수소연료전지, 보석, 화학 공정에 사용되는 희귀 귀금속입니다. 전 세계 공급의 약 70%가 남아프리카공화국에서 생산되어 공급 리스크가 높습니다. 디젤차 촉매 수요가 감소하는 반면, 수소경제 확대로 새로운 수요처가 부각되고 있습니다.",
    priceDrivers: [
      "자동차 촉매 수요 — 디젤차 비중 변화에 민감",
      "수소연료전지 성장 — 장기 수요 동력",
      "남아공 광산 리스크 — 전력난, 파업 등 공급 차질",
      "금과의 스프레드 — 금보다 싸면 저평가 신호",
    ],
    investmentMethods: [
      "백금 선물(PL) — NYMEX 거래",
      "백금 ETF(PPLT) — 실물 보유 ETF",
    ],
    relatedEtfs: ["PPLT"],
    riskFactors: [
      "전기차 전환으로 촉매 수요 감소 우려",
      "남아공 공급 집중 리스크",
      "유동성이 금·은 대비 낮음",
    ],
  },
  {
    slug: "palladium",
    name: "팔라듐",
    nameEn: "Palladium",
    symbol: "PA=F",
    category: "귀금속",
    unit: "트로이온스(oz)",
    exchange: "NYMEX",
    description:
      "팔라듐은 가솔린차 촉매변환기의 핵심 소재로, 전 세계 공급의 약 40%가 러시아에서 생산됩니다. 2018~2022년 공급 부족으로 사상 최고가를 기록했으나, 전기차 전환과 대체 기술 개발로 구조적 수요 변화를 겪고 있습니다.",
    priceDrivers: [
      "가솔린차 생산량 — 촉매변환기 수요 결정",
      "러시아 공급 리스크 — 제재, 지정학적 변수",
      "전기차 전환 속도 — 장기 수요 감소 요인",
      "백금 대체 기술 — 촉매에 백금 사용 확대 시 수요 이전",
    ],
    investmentMethods: [
      "팔라듐 선물(PA) — NYMEX 거래",
      "팔라듐 ETF(PALL) — 실물 보유 ETF",
    ],
    relatedEtfs: ["PALL"],
    riskFactors: [
      "전기차 전환으로 장기 수요 감소",
      "러시아 공급 의존도 높음",
      "극도로 낮은 유동성",
    ],
  },

  // ── 에너지 ──────────────────────────────────────────
  {
    slug: "wti-crude-oil",
    name: "WTI 원유",
    nameEn: "WTI Crude Oil",
    symbol: "CL=F",
    category: "에너지",
    unit: "배럴(bbl)",
    exchange: "NYMEX",
    description:
      "WTI(West Texas Intermediate)는 미국 텍사스주에서 생산되는 경질 저유황 원유로, 세계 원유 가격의 기준 중 하나입니다. NYMEX에서 거래되며, OPEC+ 감산 정책, 미국 셰일오일 생산량, 글로벌 경기에 의해 가격이 결정됩니다. 원유 가격은 인플레이션, 운송비, 화학제품 원가에 직접 영향을 미칩니다.",
    priceDrivers: [
      "OPEC+ 감산/증산 결정 — 공급량 직접 조절",
      "미국 원유 재고(EIA 주간보고) — 수급 바로미터",
      "글로벌 경기 — PMI, GDP 성장률과 상관",
      "미국 셰일오일 생산량 — 리그 카운트 모니터링",
      "지정학적 리스크 — 중동 긴장, 러시아 제재",
    ],
    investmentMethods: [
      "WTI 선물(CL) — NYMEX 거래, 콘탱고/백워데이션 주의",
      "원유 ETF(USO, BNO) — 선물 기반 ETF",
      "정유/에너지 주식 — SK이노베이션, S-Oil, Exxon 등",
    ],
    relatedEtfs: ["USO", "BNO", "XLE"],
    riskFactors: [
      "극심한 변동성 (마이너스 유가 사례 존재)",
      "선물 롤오버 비용 (콘탱고 시 손실)",
      "탈탄소 정책에 따른 장기 수요 불확실성",
    ],
  },
  {
    slug: "brent-crude-oil",
    name: "브렌트유",
    nameEn: "Brent Crude Oil",
    symbol: "BZ=F",
    category: "에너지",
    unit: "배럴(bbl)",
    exchange: "ICE",
    description:
      "브렌트유는 북해에서 생산되는 원유로, 전 세계 원유 가격 결정의 약 60%가 브렌트유를 기준으로 합니다. WTI와 함께 양대 원유 벤치마크이며, 아시아·유럽·아프리카 시장의 기준가로 사용됩니다. WTI 대비 프리미엄이 존재하며, 그 차이(스프레드)는 물류·수급 상황을 반영합니다.",
    priceDrivers: [
      "OPEC+ 정책 — WTI와 동일하게 영향",
      "유럽·아시아 수요 — 글로벌 정제 수요 변화",
      "WTI-브렌트 스프레드 — 지역 수급 차이 반영",
      "해상 운송 비용 — 물류비 변동",
    ],
    investmentMethods: [
      "브렌트 선물(BZ) — ICE 거래",
      "브렌트 ETF(BNO) — 선물 기반",
    ],
    relatedEtfs: ["BNO"],
    riskFactors: [
      "WTI와 유사한 리스크",
      "유럽 에너지 정책 변화에 민감",
      "ICE 거래 시간 주의",
    ],
  },
  {
    slug: "natural-gas",
    name: "천연가스",
    nameEn: "Natural Gas",
    symbol: "NG=F",
    category: "에너지",
    unit: "MMBtu",
    exchange: "NYMEX",
    description:
      "천연가스는 발전, 난방, 산업용으로 사용되는 핵심 에너지원입니다. 미국은 세계 최대 천연가스 생산국이며, 헨리허브(Henry Hub) 가격이 글로벌 기준이 됩니다. 계절성이 강하며(겨울 난방 수요), LNG 수출 증가로 글로벌 가격 연동성이 높아지고 있습니다.",
    priceDrivers: [
      "기온/날씨 — 혹한·폭염 시 수요 급증",
      "미국 천연가스 재고(EIA) — 주간 보고 주목",
      "LNG 수출량 — 아시아·유럽 수요 연동",
      "셰일가스 생산량 — 미국 국내 공급",
      "석탄-가스 전환 정책 — 탄소중립 정책 효과",
    ],
    investmentMethods: [
      "천연가스 선물(NG) — NYMEX 거래",
      "천연가스 ETF(UNG) — 선물 기반, 콘탱고 주의",
      "LNG 관련주 — Cheniere Energy 등",
    ],
    relatedEtfs: ["UNG", "BOIL"],
    riskFactors: [
      "원자재 중 가장 높은 변동성",
      "계절성에 따른 급등락",
      "선물 롤오버 손실 크",
    ],
  },
  {
    slug: "heating-oil",
    name: "난방유",
    nameEn: "Heating Oil",
    symbol: "HO=F",
    category: "에너지",
    unit: "갤런(gal)",
    exchange: "NYMEX",
    description:
      "난방유(No.2 Fuel Oil)는 미국 동북부 지역의 주요 난방 연료이며, 디젤유 가격의 선행지표 역할을 합니다. 원유 정제 과정에서 생산되므로 원유 가격과 밀접한 상관관계를 가지며, 겨울철 수요 증가와 정제 마진에 의해 가격이 결정됩니다.",
    priceDrivers: [
      "원유 가격 — 정제 원가의 핵심",
      "겨울철 기온 — 미국 동북부 난방 수요",
      "정제 마진(크랙 스프레드) — 정유사 수익성 지표",
      "디젤 수요 — 산업·운송용 디젤 연동",
    ],
    investmentMethods: [
      "난방유 선물(HO) — NYMEX 거래",
      "에너지 섹터 ETF — XLE 등으로 간접 투자",
    ],
    relatedEtfs: ["XLE"],
    riskFactors: [
      "원유 가격 변동에 직접 노출",
      "계절성 강함",
      "친환경 전환으로 장기 수요 감소",
    ],
  },
  {
    slug: "gasoline",
    name: "휘발유",
    nameEn: "RBOB Gasoline",
    symbol: "RB=F",
    category: "에너지",
    unit: "갤런(gal)",
    exchange: "NYMEX",
    description:
      "RBOB 휘발유(Reformulated Blendstock for Oxygenate Blending)는 미국 휘발유 선물의 벤치마크입니다. 미국인의 자동차 중심 생활 방식으로 수요가 막대하며, 여름 드라이빙 시즌(5~9월)에 수요가 정점에 달합니다. 정유사의 수익 구조를 이해하는 데 핵심적인 에너지 상품입니다.",
    priceDrivers: [
      "원유 가격 — 정제 원가",
      "드라이빙 시즌 — 여름철 수요 증가",
      "정유 시설 가동률 — 허리케인, 정비 시 공급 차질",
      "에탄올 혼합 비율 — 정책 변수",
    ],
    investmentMethods: [
      "휘발유 선물(RB) — NYMEX 거래",
      "에너지 섹터 ETF — 간접 투자",
    ],
    relatedEtfs: ["UGA"],
    riskFactors: [
      "전기차 보급 확대에 따른 수요 감소",
      "환경 규제 강화",
      "원유 가격 변동 직접 노출",
    ],
  },

  // ── 산업금속 ────────────────────────────────────────
  {
    slug: "copper",
    name: "구리",
    nameEn: "Copper",
    symbol: "HG=F",
    category: "산업금속",
    unit: "파운드(lb)",
    exchange: "COMEX",
    description:
      "구리는 '닥터 코퍼(Dr. Copper)'라는 별명처럼 경기 선행지표로 불립니다. 전기 배선, 건설, 전자제품, 전기차에 필수적인 금속으로, 전기차 1대에 내연기관차 대비 3~4배의 구리가 사용됩니다. 칠레와 페루가 전 세계 공급의 약 40%를 차지합니다.",
    priceDrivers: [
      "중국 경기 — 전 세계 구리 수요의 약 50% 차지",
      "전기차/재생에너지 성장 — 구조적 수요 증가",
      "칠레·페루 광산 공급 — 파업, 정책 변화에 민감",
      "달러 가치 — 달러 약세 시 상승 경향",
      "LME 재고 수준 — 수급 바로미터",
    ],
    investmentMethods: [
      "구리 선물(HG) — COMEX 거래",
      "구리 ETF(CPER) — 선물 기반",
      "구리 광산주 — Freeport-McMoRan, Southern Copper 등",
    ],
    relatedEtfs: ["CPER", "COPX"],
    riskFactors: [
      "중국 경기 둔화 시 급락",
      "대체 소재(알루미늄) 사용 증가",
      "광산 환경 규제 강화",
    ],
  },
  {
    slug: "aluminum",
    name: "알루미늄",
    nameEn: "Aluminum",
    symbol: "ALI=F",
    category: "산업금속",
    unit: "파운드(lb)",
    exchange: "COMEX",
    description:
      "알루미늄은 지구에서 가장 풍부한 금속 원소로, 가볍고 내식성이 뛰어나 운송(자동차, 항공기), 건설, 포장, 전자제품에 폭넓게 사용됩니다. 생산에 막대한 전기가 필요하여 '고체화된 전기'로 불리며, 에너지 가격과 밀접한 상관관계를 가집니다.",
    priceDrivers: [
      "에너지 비용 — 제련 전기비가 생산원가의 30~40%",
      "중국 생산 정책 — 감산 명령, 탄소 규제",
      "글로벌 건설·자동차 수요 — 경량화 트렌드",
      "러시아 공급 — 전 세계 생산의 약 6%",
    ],
    investmentMethods: [
      "알루미늄 선물(ALI) — COMEX 거래",
      "관련 ETF — 산업금속 ETF로 간접 투자",
      "알루미늄 기업 — Alcoa, Norsk Hydro 등",
    ],
    relatedEtfs: ["JJU"],
    riskFactors: [
      "에너지 가격 급등 시 생산 차질",
      "중국 과잉 공급 리스크",
      "재활용 알루미늄 비중 증가",
    ],
  },
  {
    slug: "zinc",
    name: "아연",
    nameEn: "Zinc",
    symbol: "ZN=F",
    category: "산업금속",
    unit: "파운드(lb)",
    exchange: "COMEX",
    description:
      "아연은 주로 철강의 부식 방지(아연도금)에 사용되며, 전 세계 아연 수요의 약 50%가 아연도금에 쓰입니다. 건설, 자동차, 인프라 투자와 밀접한 관계가 있으며, 아연 배터리 기술 발전으로 에너지 저장 시장에서 새로운 수요가 기대됩니다.",
    priceDrivers: [
      "철강 생산량 — 아연도금 수요의 핵심",
      "건설/인프라 투자 — 선진국 인프라 갱신 수요",
      "광산 공급 — 주요 광산의 품위 저하 이슈",
      "LME 재고 — 수급 지표",
    ],
    investmentMethods: [
      "아연 선물 — LME/COMEX 거래",
      "산업금속 ETF — 바스켓 투자",
      "아연 광산주 — Teck Resources 등",
    ],
    relatedEtfs: ["DBB"],
    riskFactors: [
      "철강 수요 감소 시 직접 영향",
      "중국 제련소 가동률 변화",
      "환경 규제에 따른 공급 차질",
    ],
  },
  {
    slug: "lithium-etf",
    name: "리튬 ETF",
    nameEn: "Lithium ETF",
    symbol: "LIT",
    category: "산업금속",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "리튬은 전기차 배터리(리튬이온)의 핵심 소재로, 전기차 시장 성장과 직결됩니다. 직접 선물 시장이 없어 Global X Lithium & Battery Tech ETF(LIT)를 통해 투자합니다. 호주, 칠레, 중국이 주요 생산국이며, '하얀 석유'로 불립니다.",
    priceDrivers: [
      "전기차 판매량 — 배터리 수요 직결",
      "배터리 기술 변화 — LFP vs NMC 비중 변화",
      "리튬 현물 가격 — 탄산리튬/수산화리튬 시세",
      "호주·칠레 광산 공급 — 신규 광산 개발 속도",
      "중국 배터리 정책 — 보조금, 환경 규제",
    ],
    investmentMethods: [
      "LIT ETF — 리튬·배터리 밸류체인 기업 바스켓",
      "리튬 관련주 — Albemarle, SQM, 포스코퓨처엠 등",
      "배터리 ETF — BATT 등",
    ],
    relatedEtfs: ["LIT", "BATT"],
    riskFactors: [
      "리튬 가격 급락(2023년 사례)",
      "대체 배터리 기술(나트륨이온 등) 부상",
      "공급 과잉 리스크",
    ],
  },

  // ── 농산물 ──────────────────────────────────────────
  {
    slug: "corn",
    name: "옥수수",
    nameEn: "Corn",
    symbol: "ZC=F",
    category: "농산물",
    unit: "부셸(bu)",
    exchange: "CBOT",
    description:
      "옥수수는 세계에서 가장 많이 생산되는 곡물로, 사료(약 40%), 에탄올(약 30%), 식품·산업용(약 30%)으로 사용됩니다. 미국이 세계 최대 생산·수출국이며, 미국 중서부 '콘벨트'의 날씨가 가격에 결정적 영향을 미칩니다. USDA 수급 보고서가 핵심 변수입니다.",
    priceDrivers: [
      "미국 중서부 날씨 — 파종·성장기 가뭄, 홍수",
      "USDA 수급보고서(WASDE) — 월간 재고 전망",
      "에탄올 수요 — 미국 옥수수의 30%가 에탄올 원료",
      "중국 수입량 — 사료 곡물 수요",
      "대두·밀과의 대체 관계 — 작부면적 경쟁",
    ],
    investmentMethods: [
      "옥수수 선물(ZC) — CBOT 거래",
      "농산물 ETF(DBA) — 바스켓 투자",
      "곡물 관련주 — ADM, Bunge 등",
    ],
    relatedEtfs: ["CORN", "DBA"],
    riskFactors: [
      "기상 이변에 따른 극심한 변동성",
      "정부 보조금·무역 정책 영향",
      "저장·운송 비용",
    ],
  },
  {
    slug: "soybean",
    name: "대두",
    nameEn: "Soybean",
    symbol: "ZS=F",
    category: "농산물",
    unit: "부셸(bu)",
    exchange: "CBOT",
    description:
      "대두(콩)는 세계 식물성 단백질의 핵심 공급원으로, 대두유(식용유)와 대두박(사료)으로 가공됩니다. 미국과 브라질이 양대 생산국이며, 중국이 세계 최대 수입국입니다. 미·중 무역관계, 남미 날씨, 사료 수요가 가격의 3대 변수입니다.",
    priceDrivers: [
      "브라질·아르헨티나 날씨 — 남반구 수확기 영향",
      "중국 수입 수요 — 돼지 사육두수와 연동",
      "미·중 무역관계 — 관세 정책",
      "대두유 바이오디젤 수요 — 재생에너지 정책",
      "USDA 수급보고서 — 재고·작황 전망",
    ],
    investmentMethods: [
      "대두 선물(ZS) — CBOT 거래",
      "농산물 ETF(DBA, SOYB) — 바스켓/단일",
      "곡물 메이저 — Cargill, ADM 등 관련주",
    ],
    relatedEtfs: ["SOYB", "DBA"],
    riskFactors: [
      "남미 기상 리스크",
      "미·중 무역 갈등 시 급변",
      "환율(브라질 헤알) 영향",
    ],
  },
  {
    slug: "wheat",
    name: "밀",
    nameEn: "Wheat",
    symbol: "ZW=F",
    category: "농산물",
    unit: "부셸(bu)",
    exchange: "CBOT",
    description:
      "밀은 인류 식량의 근간으로, 빵·면류·과자 등 식품의 핵심 원료입니다. 러시아, EU, 미국, 캐나다, 호주가 주요 생산·수출국이며, 2022년 러시아-우크라이나 전쟁으로 가격이 급등한 바 있습니다. 식량 안보와 직결되어 지정학적 민감도가 높습니다.",
    priceDrivers: [
      "흑해 지역 리스크 — 러시아·우크라이나 수출 비중 약 30%",
      "글로벌 날씨 — 가뭄, 홍수, 한파",
      "USDA 수급보고서 — 글로벌 재고율",
      "인도 수출 정책 — 수출 금지/제한 시 가격 급등",
    ],
    investmentMethods: [
      "밀 선물(ZW) — CBOT 거래",
      "농산물 ETF(DBA, WEAT) — 간편 투자",
    ],
    relatedEtfs: ["WEAT", "DBA"],
    riskFactors: [
      "지정학적 리스크에 극도로 민감",
      "정부 수출 제한 정책",
      "기후변화에 따른 수확량 변동",
    ],
  },
  {
    slug: "sugar",
    name: "설탕",
    nameEn: "Sugar",
    symbol: "SB=F",
    category: "농산물",
    unit: "파운드(lb)",
    exchange: "ICE",
    description:
      "설탕은 세계에서 가장 많이 거래되는 소프트 커머디티 중 하나입니다. 브라질이 세계 최대 생산·수출국이며, 사탕수수에서 설탕과 에탄올을 동시에 생산합니다. 유가가 오르면 브라질이 에탄올 생산을 늘려 설탕 공급이 줄어드는 독특한 구조를 가집니다.",
    priceDrivers: [
      "브라질 사탕수수 작황 — 세계 공급의 약 25%",
      "유가와 에탄올 연동 — 유가 상승 시 설탕 공급 감소",
      "인도 수출 정책 — 2위 생산국의 정책 영향",
      "엘니뇨/라니냐 — 아시아 사탕수수 생산 영향",
    ],
    investmentMethods: [
      "설탕 선물(SB) — ICE 거래",
      "소프트 커머디티 ETF — 바스켓 투자",
    ],
    relatedEtfs: ["CANE", "DBA"],
    riskFactors: [
      "정부 보조금·가격 통제 정책",
      "건강 트렌드에 따른 수요 감소",
      "브라질 에탄올 정책 변화",
    ],
  },
  {
    slug: "coffee",
    name: "커피",
    nameEn: "Coffee",
    symbol: "KC=F",
    category: "농산물",
    unit: "파운드(lb)",
    exchange: "ICE",
    description:
      "커피는 석유 다음으로 세계에서 많이 거래되는 원자재입니다. 아라비카(고품질, ICE 거래)와 로부스타(저품질, LIFFE 거래) 두 품종이 있으며, 브라질이 세계 최대 생산국입니다. 2024~2025년 기후변화로 브라질·베트남 작황이 악화되면서 역사적 고가를 기록했습니다.",
    priceDrivers: [
      "브라질 날씨 — 서리, 가뭄에 극도로 민감",
      "베트남 로부스타 생산 — 2위 생산국 작황",
      "달러 가치/브라질 헤알 환율 — 수출 경쟁력",
      "글로벌 카페 체인 수요 — 소비 트렌드",
      "기후변화 — 재배 적지 감소 추세",
    ],
    investmentMethods: [
      "커피 선물(KC) — ICE 거래",
      "커피 ETF(JO) — 선물 기반",
      "커피 기업 — 스타벅스, JDE Peet's 등",
    ],
    relatedEtfs: ["JO"],
    riskFactors: [
      "기상 이변에 극도로 민감",
      "투기적 포지션 비중 높음",
      "생산국 정치·사회 리스크",
    ],
  },
  {
    slug: "cocoa",
    name: "코코아",
    nameEn: "Cocoa",
    symbol: "CC=F",
    category: "농산물",
    unit: "메트릭톤(MT)",
    exchange: "ICE",
    description:
      "코코아는 초콜릿의 원료로, 서아프리카(코트디부아르, 가나)가 전 세계 생산의 약 60%를 차지합니다. 2024년 엘니뇨와 병충해로 공급이 급감하면서 사상 최고가를 경신했습니다. 소규모 농가 의존도가 높아 공급 구조가 불안정합니다.",
    priceDrivers: [
      "서아프리카 날씨·병충해 — 공급의 60%를 좌우",
      "유럽 초콜릿 수요 — 최대 소비 시장",
      "파운드/달러 환율 — 런던 선물 기준",
      "카카오 재배 지속가능성 — 삼림 파괴 규제",
    ],
    investmentMethods: [
      "코코아 선물(CC) — ICE 거래",
      "소프트 커머디티 ETF — 바스켓 투자",
    ],
    relatedEtfs: ["NIB"],
    riskFactors: [
      "서아프리카 집중 리스크",
      "기후변화에 매우 취약",
      "유동성 낮음",
    ],
  },
  {
    slug: "cotton",
    name: "면화",
    nameEn: "Cotton",
    symbol: "CT=F",
    category: "농산물",
    unit: "파운드(lb)",
    exchange: "ICE",
    description:
      "면화는 세계 최대 천연섬유로, 의류·텍스타일 산업의 핵심 원료입니다. 중국, 인도, 미국이 주요 생산국이며, 합성섬유(폴리에스터)와의 가격 경쟁이 수요에 영향을 미칩니다. 미국 면화는 텍사스주 작황에 크게 좌우됩니다.",
    priceDrivers: [
      "중국·인도 작황 — 1, 2위 생산국 공급",
      "미국 텍사스 날씨 — 3위 생산국 가뭄 리스크",
      "폴리에스터 가격 — 대체재와의 경쟁",
      "글로벌 패션/의류 수요 — 소비 경기 연동",
    ],
    investmentMethods: [
      "면화 선물(CT) — ICE 거래",
      "농산물 ETF(DBA) — 바스켓 투자",
    ],
    relatedEtfs: ["BAL", "DBA"],
    riskFactors: [
      "합성섬유와의 대체 경쟁",
      "재배국 정치 리스크",
      "무역 분쟁(신장 면화 이슈 등)",
    ],
  },
  {
    slug: "lean-hogs",
    name: "돼지(삼겹살 선물)",
    nameEn: "Lean Hogs",
    symbol: "LH=F",
    category: "농산물",
    unit: "파운드(lb)",
    exchange: "CME",
    description:
      "린 호그(Lean Hogs)는 미국 돼지고기 선물로, 미국은 세계 3위 돼지고기 생산국입니다. 사료비(옥수수, 대두박)가 생산 원가의 60~70%를 차지하며, 미국 돼지고기 수출(특히 중국·멕시코向)이 가격에 큰 영향을 미칩니다. 계절성이 있어 여름 바비큐 시즌에 수요가 증가합니다.",
    priceDrivers: [
      "사료비(옥수수·대두) — 생산 원가의 핵심",
      "미국 돼지 사육두수(USDA Hogs & Pigs) — 분기 보고",
      "중국 수입 수요 — ASF(아프리카돼지열병) 이후 변동",
      "여름 바비큐 시즌 — 계절적 수요 증가",
    ],
    investmentMethods: [
      "린 호그 선물(LH) — CME 거래",
      "축산물 ETF — 바스켓 투자",
    ],
    relatedEtfs: ["COW"],
    riskFactors: [
      "전염병 리스크(ASF 등)",
      "사료비 변동에 민감",
      "무역 정책(관세) 영향",
    ],
  },
  {
    slug: "live-cattle",
    name: "소(생우 선물)",
    nameEn: "Live Cattle",
    symbol: "LE=F",
    category: "농산물",
    unit: "파운드(lb)",
    exchange: "CME",
    description:
      "라이브 캐틀(Live Cattle)은 미국 소고기 선물로, 미국은 세계 최대 소고기 생산·소비국입니다. 소는 사육 기간이 길어(2~3년) 공급 조절이 느리며, 이로 인해 '소 사이클(Cattle Cycle)'이라는 장기 가격 변동 패턴이 존재합니다.",
    priceDrivers: [
      "소 사이클(Cattle Cycle) — 8~12년 장기 순환",
      "사료비 — 옥수수·건초 가격",
      "미국 소 사육두수(USDA) — 반기 보고",
      "소고기 수출 — 일본, 한국, 중국向 수요",
      "가뭄 — 목초지 상태에 영향",
    ],
    investmentMethods: [
      "라이브 캐틀 선물(LE) — CME 거래",
      "축산물 ETF(COW) — 바스켓 투자",
    ],
    relatedEtfs: ["COW"],
    riskFactors: [
      "사육 기간이 길어 공급 반응 느림",
      "전염병(BSE 등) 리스크",
      "환경·동물복지 규제 강화",
    ],
  },

  // ── ETF/지수 ────────────────────────────────────────
  {
    slug: "uranium-etf",
    name: "우라늄 ETF",
    nameEn: "Uranium ETF",
    symbol: "URA",
    category: "ETF/지수",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "Global X Uranium ETF(URA)는 우라늄 채굴·가공 기업에 투자하는 ETF입니다. 원자력이 탄소중립 달성의 핵심 에너지원으로 재부각되면서 우라늄 수요가 구조적으로 증가하고 있습니다. 카자흐스탄이 세계 생산의 약 45%를 차지하며, Cameco, Kazatomprom 등이 주요 기업입니다.",
    priceDrivers: [
      "원전 건설·재가동 계획 — 글로벌 탈탄소 정책",
      "우라늄 현물 가격(Sprott Physical Uranium) — 수급 지표",
      "카자흐스탄 생산 정책 — 최대 생산국 공급",
      "SMR(소형모듈원자로) 시장 성장 — 신규 수요",
    ],
    investmentMethods: [
      "URA ETF — 우라늄 기업 바스켓",
      "URNM ETF — 순수 우라늄 기업 집중",
      "Sprott Physical Uranium Trust — 실물 우라늄 투자",
      "개별주 — Cameco, NexGen Energy 등",
    ],
    relatedEtfs: ["URA", "URNM"],
    riskFactors: [
      "원전 사고 시 정책 급변",
      "우라늄 가격 변동성",
      "지정학적 리스크(카자흐스탄)",
    ],
  },
  {
    slug: "agriculture-etf",
    name: "농산물 ETF",
    nameEn: "Agriculture ETF",
    symbol: "DBA",
    category: "ETF/지수",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "Invesco DB Agriculture Fund(DBA)는 옥수수, 밀, 대두, 설탕, 커피, 코코아, 면화, 소, 돼지 등 주요 농산물 선물에 분산 투자하는 ETF입니다. 단일 농산물의 리스크를 줄이면서 농산물 전체 시장에 노출되고 싶은 투자자에게 적합합니다.",
    priceDrivers: [
      "글로벌 식량 수급 — USDA WASDE 보고서",
      "기상 이변 빈도 — 기후변화 가속",
      "바이오연료 정책 — 옥수수·대두유 수요",
      "달러 가치 — 달러 약세 시 농산물 가격 상승",
    ],
    investmentMethods: [
      "DBA ETF — 농산물 바스켓 간편 투자",
      "개별 농산물 선물 — 특정 품목 집중 투자",
    ],
    relatedEtfs: ["DBA", "MOO"],
    riskFactors: [
      "선물 롤오버 비용",
      "개별 농산물 비중 편중",
      "콘탱고 손실",
    ],
  },
  {
    slug: "commodity-index-etf",
    name: "원자재 종합지수 ETF",
    nameEn: "Commodity Index ETF",
    symbol: "DBC",
    category: "ETF/지수",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "Invesco DB Commodity Index Tracking Fund(DBC)는 에너지, 귀금속, 산업금속, 농산물을 포괄하는 원자재 종합지수 ETF입니다. 원유·금·알루미늄·옥수수 등 14개 원자재 선물에 분산 투자하여, 원자재 시장 전체의 흐름을 추종합니다.",
    priceDrivers: [
      "글로벌 인플레이션 — 원자재와 물가의 상관",
      "달러 가치 — 역의 상관관계",
      "글로벌 경기 사이클 — PMI, GDP 연동",
      "공급 측 이벤트 — 전쟁, 팬데믹, 자연재해",
    ],
    investmentMethods: [
      "DBC ETF — 원자재 종합 바스켓",
      "GSG(iShares) — 대안 원자재 종합 ETF",
    ],
    relatedEtfs: ["DBC", "GSG", "PDBC"],
    riskFactors: [
      "에너지 비중이 높아 유가 편향",
      "선물 롤오버 비용",
      "세금 이슈(K-1 양식)",
    ],
  },
  {
    slug: "gold-etf",
    name: "금 ETF (GLD)",
    nameEn: "Gold ETF",
    symbol: "GLD",
    category: "ETF/지수",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "SPDR Gold Shares(GLD)는 세계 최대 금 ETF로, 실물 금을 보유하는 방식으로 금 가격을 추종합니다. 선물 롤오버 비용 없이 금에 투자할 수 있는 가장 간편한 방법이며, 운용자산(AUM)이 500억 달러를 넘습니다. 금 선물에 직접 투자하기 어려운 개인 투자자에게 적합합니다.",
    priceDrivers: [
      "금 현물 가격 — 거의 1:1 추종",
      "ETF 자금 유입/유출 — 투자 심리 지표",
      "실질금리 — 금 가격의 핵심 변수",
      "중앙은행 금 매입 — 구조적 수요",
    ],
    investmentMethods: [
      "GLD ETF — 세계 최대 금 ETF",
      "IAU(iShares) — 더 낮은 보수",
      "SGOL — 스위스 금고 보관",
    ],
    relatedEtfs: ["GLD", "IAU", "SGOL"],
    riskFactors: [
      "보수(0.40%) 장기 보유 시 비용",
      "금 가격 하락 리스크",
      "실물 인출 불가",
    ],
  },
  {
    slug: "crude-oil-etf",
    name: "원유 ETF (USO)",
    nameEn: "Crude Oil ETF",
    symbol: "USO",
    category: "ETF/지수",
    unit: "ETF 주가(USD)",
    exchange: "NYSE",
    description:
      "United States Oil Fund(USO)는 WTI 원유 선물에 투자하는 ETF입니다. 원유 가격을 직접 추종하지만, 선물 롤오버 시 콘탱고(contango) 구조에 의한 손실이 발생할 수 있어 장기 보유에는 주의가 필요합니다. 2020년 마이너스 유가 사태 이후 구조가 변경되었습니다.",
    priceDrivers: [
      "WTI 원유 선물 가격 — 근월물 추종",
      "선물 커브 구조 — 콘탱고/백워데이션",
      "OPEC+ 정책 — 원유 가격 직접 영향",
      "글로벌 원유 수급 — EIA 주간보고",
    ],
    investmentMethods: [
      "USO ETF — WTI 선물 기반",
      "BNO ETF — 브렌트 선물 기반",
      "에너지 섹터 ETF(XLE) — 에너지 기업 주식",
    ],
    relatedEtfs: ["USO", "BNO", "XLE"],
    riskFactors: [
      "콘탱고 손실 — 장기 보유 시 가격 괴리",
      "극심한 변동성",
      "원유 가격과 ETF 가격의 괴리",
    ],
  },

  // ── 기타 ────────────────────────────────────────────
  {
    slug: "orange-juice",
    name: "오렌지주스",
    nameEn: "Orange Juice",
    symbol: "OJ=F",
    category: "기타",
    unit: "파운드(lb)",
    exchange: "ICE",
    description:
      "냉동 농축 오렌지주스(FCOJ)는 플로리다와 브라질이 주요 생산지인 소프트 커머디티입니다. 2023~2025년 감귤 그린병(HLB)과 기상 이변으로 공급이 급감하면서 사상 최고가를 기록했습니다. 영화 '트레이딩 플레이스(1983)'에도 등장한 유명한 원자재입니다.",
    priceDrivers: [
      "플로리다·브라질 감귤 작황 — 허리케인, 서리, 병충해",
      "감귤 그린병(HLB) — 감귤나무 감염병으로 수확량 급감",
      "건강 트렌드 — 주스 소비 변화",
      "브라질 헤알 환율 — 수출 가격 영향",
    ],
    investmentMethods: [
      "오렌지주스 선물(OJ) — ICE 거래",
      "농산물 ETF — 간접 투자",
    ],
    relatedEtfs: ["DBA"],
    riskFactors: [
      "유동성 매우 낮음",
      "기상·질병에 극도로 민감",
      "장기 소비 감소 추세",
    ],
  },
  {
    slug: "lumber",
    name: "목재",
    nameEn: "Lumber",
    symbol: "LBS=F",
    category: "기타",
    unit: "보드피트(1,000 bd ft)",
    exchange: "CME",
    description:
      "목재(Lumber)는 주로 주택 건설에 사용되는 원자재로, 미국 주택시장의 선행지표 역할을 합니다. 2021년 코로나 이후 리모델링 붐으로 사상 최고가를 기록한 바 있습니다. 캐나다가 주요 공급국이며, 미국 주택착공 건수와 밀접한 상관관계를 가집니다.",
    priceDrivers: [
      "미국 주택착공 건수 — 건설 수요의 핵심",
      "모기지 금리 — 주택 수요에 직접 영향",
      "캐나다 산림 정책 — 벌채 허가량",
      "산불·병충해 — 공급 차질",
    ],
    investmentMethods: [
      "목재 선물(LBS) — CME 거래",
      "목재 REIT — Weyerhaeuser, Rayonier 등",
      "주택건설 ETF(XHB) — 간접 수혜",
    ],
    relatedEtfs: ["WOOD", "CUT"],
    riskFactors: [
      "극심한 변동성 (2021년 6배 등락)",
      "주택시장 냉각 리스크",
      "유동성 낮음",
    ],
  },
];

export function getCommodityBySlug(slug: string): CommodityInfo | undefined {
  return ALL_COMMODITIES.find((c) => c.slug === slug);
}

export function getCommoditiesByCategory(category: CommodityCategory): CommodityInfo[] {
  return ALL_COMMODITIES.filter((c) => c.category === category);
}

export function getCommoditySlugFromKey(key: string): string | undefined {
  const keyToSlug: Record<string, string> = {
    gold: "gold",
    silver: "silver",
    palladium: "palladium",
    oil: "wti-crude-oil",
    natgas: "natural-gas",
    uranium: "uranium-etf",
    copper: "copper",
    nickel: "zinc",
    aluminum: "aluminum",
    lithium: "lithium-etf",
  };
  return keyToSlug[key];
}
