"use client";

import { Sector } from "./SectorTabs";
import { StockPrice } from "@/lib/stockPricesApi";
import { Holding } from "@/hooks/useMockPortfolio";

export interface StockInfo {
  symbol: string;
  name: string;
  sector: Sector;
}

export const ALL_STOCKS: StockInfo[] = [
  // ── 반도체 ──
  { symbol: "005930.KS", name: "삼성전자",         sector: "반도체" },
  { symbol: "000660.KS", name: "SK하이닉스",       sector: "반도체" },
  { symbol: "009150.KS", name: "삼성전기",         sector: "반도체" },
  { symbol: "011070.KS", name: "LG이노텍",        sector: "반도체" },
  { symbol: "042700.KS", name: "한미반도체",       sector: "반도체" },
  { symbol: "058470.KS", name: "리노공업",         sector: "반도체" },
  { symbol: "403870.KQ", name: "HPSP",             sector: "반도체" },
  { symbol: "098460.KQ", name: "고영",             sector: "반도체" },
  { symbol: "036930.KQ", name: "주성엔지니어링",   sector: "반도체" },
  { symbol: "240810.KQ", name: "원익IPS",          sector: "반도체" },
  { symbol: "357780.KQ", name: "솔브레인",         sector: "반도체" },
  { symbol: "039030.KQ", name: "이오테크닉스",     sector: "반도체" },
  { symbol: "000990.KS", name: "DB하이텍",         sector: "반도체" },
  { symbol: "402340.KS", name: "SK스퀘어",         sector: "반도체" },
  { symbol: "353200.KQ", name: "대덕전자",         sector: "반도체" },
  { symbol: "007660.KQ", name: "이수페타시스",     sector: "반도체" },
  { symbol: "025950.KQ", name: "동진쎄미켐",       sector: "반도체" },
  { symbol: "089030.KQ", name: "테크윙",           sector: "반도체" },
  { symbol: "095340.KQ", name: "ISC",              sector: "반도체" },
  { symbol: "067310.KQ", name: "하나마이크론",     sector: "반도체" },
  { symbol: "064760.KQ", name: "티씨케이",         sector: "반도체" },
  { symbol: "014680.KS", name: "한솔케미칼",       sector: "반도체" },
  { symbol: "195870.KS", name: "해성디에스",       sector: "반도체" },
  { symbol: "187220.KQ", name: "디오",             sector: "반도체" },
  { symbol: "166090.KQ", name: "피엔티",           sector: "반도체" },
  { symbol: "078340.KQ", name: "컴투스",           sector: "반도체" },
  // ── 전력기기 ──
  { symbol: "267260.KS", name: "HD현대일렉트릭",   sector: "전력기기" },
  { symbol: "267270.KS", name: "효성중공업",       sector: "전력기기" },
  { symbol: "010120.KS", name: "LS ELECTRIC",      sector: "전력기기" },
  { symbol: "033100.KS", name: "제룡전기",         sector: "전력기기" },
  { symbol: "006260.KS", name: "LS",               sector: "전력기기" },
  { symbol: "103590.KS", name: "일진전기",         sector: "전력기기" },
  { symbol: "112610.KS", name: "씨에스윈드",       sector: "전력기기" },
  { symbol: "015760.KS", name: "한국전력",         sector: "전력기기" },
  { symbol: "051600.KS", name: "한전KPS",          sector: "전력기기" },
  { symbol: "034220.KS", name: "LG디스플레이",     sector: "전력기기" },
  { symbol: "052690.KS", name: "한전기술",         sector: "전력기기" },
  { symbol: "001440.KS", name: "대한전선",         sector: "전력기기" },
  // ── 이차전지 ──
  { symbol: "373220.KS", name: "LG에너지솔루션",   sector: "이차전지" },
  { symbol: "086520.KS", name: "에코프로",         sector: "이차전지" },
  { symbol: "003670.KS", name: "포스코퓨처엠",     sector: "이차전지" },
  { symbol: "066970.KS", name: "엘앤에프",         sector: "이차전지" },
  { symbol: "247540.KS", name: "에코프로비엠",     sector: "이차전지" },
  { symbol: "006400.KS", name: "삼성SDI",          sector: "이차전지" },
  { symbol: "348370.KQ", name: "엔켐",             sector: "이차전지" },
  { symbol: "012510.KS", name: "더블유씨피",       sector: "이차전지" },
  { symbol: "005070.KS", name: "코스모신소재",     sector: "이차전지" },
  { symbol: "108320.KQ", name: "LX세미콘",         sector: "이차전지" },
  { symbol: "361610.KS", name: "SK아이이테크놀로지", sector: "이차전지" },
  { symbol: "383310.KQ", name: "에코프로에이치엔",  sector: "이차전지" },
  { symbol: "278280.KQ", name: "천보",             sector: "이차전지" },
  { symbol: "365340.KQ", name: "성일하이텍",       sector: "이차전지" },
  // ── 바이오/제약 ──
  { symbol: "207940.KS", name: "삼성바이오로직스", sector: "바이오" },
  { symbol: "068270.KS", name: "셀트리온",         sector: "바이오" },
  { symbol: "196170.KQ", name: "알테오젠",         sector: "바이오" },
  { symbol: "000100.KS", name: "유한양행",         sector: "바이오" },
  { symbol: "326030.KS", name: "SK바이오팜",       sector: "바이오" },
  { symbol: "145020.KQ", name: "휴젤",             sector: "바이오" },
  { symbol: "028300.KQ", name: "HLB",              sector: "바이오" },
  { symbol: "141080.KQ", name: "리가켐바이오",     sector: "바이오" },
  { symbol: "128940.KS", name: "한미약품",         sector: "바이오" },
  { symbol: "185750.KS", name: "종근당",           sector: "바이오" },
  { symbol: "006280.KS", name: "녹십자",           sector: "바이오" },
  { symbol: "069620.KS", name: "대웅제약",         sector: "바이오" },
  { symbol: "302440.KQ", name: "SK바이오사이언스", sector: "바이오" },
  { symbol: "195990.KQ", name: "에이비엘바이오",   sector: "바이오" },
  { symbol: "950170.KQ", name: "JW중외제약",       sector: "바이오" },
  { symbol: "003850.KS", name: "보령",             sector: "바이오" },
  { symbol: "009420.KS", name: "한올바이오파마",   sector: "바이오" },
  { symbol: "003090.KS", name: "대웅",             sector: "바이오" },
  { symbol: "008930.KS", name: "한미사이언스",     sector: "바이오" },
  { symbol: "007570.KS", name: "일양약품",         sector: "바이오" },
  { symbol: "009290.KS", name: "광동제약",         sector: "바이오" },
  { symbol: "086900.KQ", name: "메디톡스",         sector: "바이오" },
  { symbol: "019170.KQ", name: "신풍제약",         sector: "바이오" },
  // ── 엔터/플랫폼 ──
  { symbol: "035420.KS", name: "네이버",           sector: "엔터/플랫폼" },
  { symbol: "035720.KS", name: "카카오",           sector: "엔터/플랫폼" },
  { symbol: "352820.KS", name: "HYBE",             sector: "엔터/플랫폼" },
  { symbol: "035900.KS", name: "JYP Ent.",         sector: "엔터/플랫폼" },
  { symbol: "259960.KS", name: "크래프톤",         sector: "엔터/플랫폼" },
  { symbol: "263750.KS", name: "펄어비스",         sector: "엔터/플랫폼" },
  { symbol: "251270.KS", name: "넷마블",           sector: "엔터/플랫폼" },
  { symbol: "293490.KQ", name: "카카오게임즈",     sector: "엔터/플랫폼" },
  { symbol: "041510.KQ", name: "SM",               sector: "엔터/플랫폼" },
  { symbol: "323410.KS", name: "카카오뱅크",       sector: "엔터/플랫폼" },
  { symbol: "067160.KQ", name: "아프리카TV",       sector: "엔터/플랫폼" },
  { symbol: "036570.KS", name: "엔씨소프트",       sector: "엔터/플랫폼" },
  { symbol: "112040.KQ", name: "위메이드",         sector: "엔터/플랫폼" },
  { symbol: "122870.KQ", name: "YG엔터테인먼트",   sector: "엔터/플랫폼" },
  { symbol: "377300.KS", name: "카카오페이",       sector: "엔터/플랫폼" },
  { symbol: "035760.KS", name: "CJ ENM",           sector: "엔터/플랫폼" },
  { symbol: "253450.KQ", name: "스튜디오드래곤",   sector: "엔터/플랫폼" },
  { symbol: "018260.KS", name: "삼성SDS",          sector: "엔터/플랫폼" },
  // ── 자동차 ──
  { symbol: "005380.KS", name: "현대차",           sector: "자동차" },
  { symbol: "000270.KS", name: "기아",             sector: "자동차" },
  { symbol: "012330.KS", name: "현대모비스",       sector: "자동차" },
  { symbol: "204320.KS", name: "HL만도",           sector: "자동차" },
  { symbol: "018880.KS", name: "한온시스템",       sector: "자동차" },
  { symbol: "161390.KS", name: "한국타이어앤테크놀로지", sector: "자동차" },
  { symbol: "011210.KS", name: "현대위아",         sector: "자동차" },
  { symbol: "298050.KS", name: "효성첨단소재",     sector: "자동차" },
  { symbol: "298040.KS", name: "현대트랜시스",     sector: "자동차" },
  { symbol: "307950.KS", name: "현대오토에버",     sector: "자동차" },
  // ── 정유/화학 ──
  { symbol: "051910.KS", name: "LG화학",           sector: "정유/화학" },
  { symbol: "096770.KS", name: "SK이노베이션",     sector: "정유/화학" },
  { symbol: "010950.KS", name: "S-Oil",            sector: "정유/화학" },
  { symbol: "011780.KS", name: "금호석유",         sector: "정유/화학" },
  { symbol: "078930.KS", name: "GS",               sector: "정유/화학" },
  { symbol: "011170.KS", name: "롯데케미칼",       sector: "정유/화학" },
  { symbol: "009830.KS", name: "한화솔루션",       sector: "정유/화학" },
  { symbol: "010060.KS", name: "OCI홀딩스",        sector: "정유/화학" },
  { symbol: "298000.KS", name: "효성화학",         sector: "정유/화학" },
  { symbol: "011790.KS", name: "SKC",              sector: "정유/화학" },
  { symbol: "006650.KS", name: "대한유화",         sector: "정유/화학" },
  { symbol: "298020.KS", name: "효성티앤씨",       sector: "정유/화학" },
  // ── 금융/증권 ──
  { symbol: "039490.KS", name: "키움증권",         sector: "금융/증권" },
  { symbol: "006800.KS", name: "미래에셋증권",     sector: "금융/증권" },
  { symbol: "105560.KS", name: "KB금융",           sector: "금융/증권" },
  { symbol: "016360.KS", name: "삼성증권",         sector: "금융/증권" },
  { symbol: "055550.KS", name: "신한지주",         sector: "금융/증권" },
  { symbol: "086790.KS", name: "하나금융지주",     sector: "금융/증권" },
  { symbol: "316140.KS", name: "우리금융지주",     sector: "금융/증권" },
  { symbol: "138040.KS", name: "메리츠금융지주",   sector: "금융/증권" },
  { symbol: "005940.KS", name: "NH투자증권",       sector: "금융/증권" },
  { symbol: "071050.KS", name: "한국금융지주",     sector: "금융/증권" },
  { symbol: "032830.KS", name: "삼성화재",         sector: "금융/증권" },
  { symbol: "001450.KS", name: "현대해상",         sector: "금융/증권" },
  { symbol: "005830.KS", name: "DB손해보험",       sector: "금융/증권" },
  { symbol: "138930.KS", name: "BNK금융지주",      sector: "금융/증권" },
  { symbol: "139130.KS", name: "DGB금융지주",      sector: "금융/증권" },
  { symbol: "175330.KS", name: "JB금융지주",       sector: "금융/증권" },
  // ── 의료기기 ──
  { symbol: "214150.KQ", name: "클래시스",         sector: "의료기기" },
  { symbol: "214450.KQ", name: "파마리서치",       sector: "의료기기" },
  { symbol: "145720.KQ", name: "덴티움",           sector: "의료기기" },
  { symbol: "328130.KQ", name: "루닛",             sector: "의료기기" },
  { symbol: "085660.KQ", name: "차바이오텍",       sector: "의료기기" },
  { symbol: "950160.KQ", name: "코오롱티슈진",     sector: "의료기기" },
  { symbol: "322510.KQ", name: "제이앤티씨",       sector: "의료기기" },
  { symbol: "389030.KQ", name: "지놈앤컴퍼니",     sector: "의료기기" },
  { symbol: "041830.KQ", name: "인바디",           sector: "의료기기" },
  { symbol: "043150.KQ", name: "바텍",             sector: "의료기기" },
  // ── 조선/방산 ──
  { symbol: "329180.KS", name: "HD현대중공업",     sector: "조선/방산" },
  { symbol: "042660.KS", name: "한화오션",         sector: "조선/방산" },
  { symbol: "009540.KS", name: "HD한국조선해양",   sector: "조선/방산" },
  { symbol: "012450.KS", name: "한화에어로스페이스", sector: "조선/방산" },
  { symbol: "047810.KS", name: "한국항공우주",     sector: "조선/방산" },
  { symbol: "272210.KS", name: "한화시스템",       sector: "조선/방산" },
  { symbol: "079550.KS", name: "LIG넥스원",        sector: "조선/방산" },
  { symbol: "010620.KS", name: "HD현대미포",       sector: "조선/방산" },
  { symbol: "064350.KS", name: "현대로템",         sector: "조선/방산" },
  { symbol: "010140.KS", name: "삼성중공업",       sector: "조선/방산" },
  // ── 건설/인프라 ──
  { symbol: "000720.KS", name: "현대건설",         sector: "건설/인프라" },
  { symbol: "047040.KS", name: "대우건설",         sector: "건설/인프라" },
  { symbol: "006360.KS", name: "GS건설",           sector: "건설/인프라" },
  { symbol: "028260.KS", name: "삼성물산",         sector: "건설/인프라" },
  { symbol: "375500.KS", name: "DL이앤씨",         sector: "건설/인프라" },
  { symbol: "294870.KS", name: "HDC현대산업개발",  sector: "건설/인프라" },
  { symbol: "028050.KS", name: "삼성엔지니어링",   sector: "건설/인프라" },
  { symbol: "009410.KS", name: "태영건설",         sector: "건설/인프라" },
  // ── 철강/소재 ──
  { symbol: "005490.KS", name: "포스코홀딩스",     sector: "철강/소재" },
  { symbol: "004020.KS", name: "현대제철",         sector: "철강/소재" },
  { symbol: "010130.KS", name: "고려아연",         sector: "철강/소재" },
  { symbol: "001230.KS", name: "동국제강",         sector: "철강/소재" },
  { symbol: "058430.KS", name: "포스코스틸리온",   sector: "철강/소재" },
  { symbol: "002240.KS", name: "고려제강",         sector: "철강/소재" },
  { symbol: "047050.KS", name: "포스코인터내셔널", sector: "철강/소재" },
  { symbol: "103140.KS", name: "풍산",             sector: "철강/소재" },
  { symbol: "022100.KS", name: "POSCO DX",         sector: "철강/소재" },
  // ── 소비재 ──
  { symbol: "097950.KS", name: "CJ제일제당",       sector: "소비재" },
  { symbol: "271560.KS", name: "오리온",           sector: "소비재" },
  { symbol: "033780.KS", name: "KT&G",             sector: "소비재" },
  { symbol: "004370.KS", name: "농심",             sector: "소비재" },
  { symbol: "000080.KS", name: "하이트진로",       sector: "소비재" },
  { symbol: "090430.KS", name: "아모레퍼시픽",     sector: "소비재" },
  { symbol: "051900.KS", name: "LG생활건강",       sector: "소비재" },
  { symbol: "192820.KS", name: "코스맥스",         sector: "소비재" },
  { symbol: "280360.KS", name: "롯데웰푸드",       sector: "소비재" },
  { symbol: "005440.KS", name: "현대그린푸드",     sector: "소비재" },
  { symbol: "002790.KS", name: "아모레G",          sector: "소비재" },
  { symbol: "049770.KS", name: "동원F&B",          sector: "소비재" },
  { symbol: "021240.KS", name: "코웨이",           sector: "소비재" },
  { symbol: "383220.KS", name: "F&F",              sector: "소비재" },
  { symbol: "111770.KS", name: "영원무역",         sector: "소비재" },
  { symbol: "003230.KS", name: "삼양식품",         sector: "소비재" },
  { symbol: "005180.KS", name: "빙그레",           sector: "소비재" },
  { symbol: "008770.KS", name: "호텔신라",         sector: "소비재" },
  { symbol: "161890.KQ", name: "한국콜마",         sector: "소비재" },
  { symbol: "267980.KS", name: "매일유업",         sector: "소비재" },
  // ── 운송/물류 ──
  { symbol: "003490.KS", name: "대한항공",         sector: "운송/물류" },
  { symbol: "011200.KS", name: "HMM",              sector: "운송/물류" },
  { symbol: "000120.KS", name: "CJ대한통운",       sector: "운송/물류" },
  { symbol: "180640.KS", name: "한진칼",           sector: "운송/물류" },
  { symbol: "241560.KS", name: "두산밥캣",         sector: "운송/물류" },
  { symbol: "086280.KS", name: "현대글로비스",     sector: "운송/물류" },
  { symbol: "028670.KS", name: "팬오션",           sector: "운송/물류" },
  { symbol: "089590.KS", name: "제주항공",         sector: "운송/물류" },
  { symbol: "002320.KS", name: "한진",             sector: "운송/물류" },
  // ── 통신 ──
  { symbol: "017670.KS", name: "SK텔레콤",         sector: "통신" },
  { symbol: "030200.KS", name: "KT",               sector: "통신" },
  { symbol: "032640.KS", name: "LG유플러스",       sector: "통신" },
  // ── 유통 ──
  { symbol: "139480.KS", name: "이마트",           sector: "유통" },
  { symbol: "004170.KS", name: "신세계",           sector: "유통" },
  { symbol: "069960.KS", name: "현대백화점",       sector: "유통" },
  { symbol: "007070.KS", name: "GS리테일",         sector: "유통" },
  { symbol: "282330.KS", name: "BGF리테일",        sector: "유통" },
  { symbol: "023530.KS", name: "롯데쇼핑",         sector: "유통" },
  // ── 지주/기타 ──
  { symbol: "034730.KS", name: "SK",               sector: "지주/기타" },
  { symbol: "003550.KS", name: "LG",               sector: "지주/기타" },
  { symbol: "000880.KS", name: "한화",             sector: "지주/기타" },
  { symbol: "034020.KS", name: "두산에너빌리티",   sector: "지주/기타" },
  { symbol: "267250.KS", name: "HD현대",           sector: "지주/기타" },
  { symbol: "001040.KS", name: "CJ",               sector: "지주/기타" },
  { symbol: "004990.KS", name: "롯데지주",         sector: "지주/기타" },
  { symbol: "036460.KS", name: "한국가스공사",     sector: "지주/기타" },
  { symbol: "066570.KS", name: "LG전자",           sector: "지주/기타" },
  { symbol: "000150.KS", name: "두산",             sector: "지주/기타" },
  // ── ETF ──
  { symbol: "069500.KS", name: "KODEX 200",              sector: "ETF" },
  { symbol: "102110.KS", name: "TIGER 200",              sector: "ETF" },
  { symbol: "229200.KS", name: "KODEX 코스닥150",        sector: "ETF" },
  { symbol: "360750.KS", name: "TIGER 미국S&P500",       sector: "ETF" },
  { symbol: "122630.KS", name: "KODEX 레버리지",         sector: "ETF" },
  { symbol: "305720.KS", name: "TIGER 2차전지테마",      sector: "ETF" },
  { symbol: "381180.KS", name: "TIGER 미국나스닥100",    sector: "ETF" },
  { symbol: "461500.KS", name: "KODEX 미국반도체MV",     sector: "ETF" },
  { symbol: "252670.KS", name: "KODEX 200선물인버스2X",  sector: "ETF" },
  { symbol: "114800.KS", name: "KODEX 인버스",           sector: "ETF" },
  { symbol: "091160.KS", name: "KODEX 반도체",           sector: "ETF" },
  { symbol: "143850.KS", name: "TIGER 미국S&P500선물(H)", sector: "ETF" },
];

interface StockListProps {
  sector: Sector;
  prices: Record<string, StockPrice>;
  pricesLoading: boolean;
  holdings: Record<string, Holding>;
  onBuy: (stock: StockInfo, price: number) => void;
  onSell: (stock: StockInfo, price: number, holding: Holding) => void;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export function StockList({
  sector,
  prices,
  pricesLoading,
  holdings,
  onBuy,
  onSell,
}: StockListProps) {
  const stocks = ALL_STOCKS.filter((s) => s.sector === sector);

  return (
    <div className="flex flex-col gap-1">
      {stocks.map((stock) => {
        const px = prices[stock.symbol];
        const holding = holdings[stock.symbol];
        const changePct = px?.changePct ?? 0;
        const price = px?.price ?? null;

        return (
          <div
            key={stock.symbol}
            className="flex items-center justify-between bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 gap-2"
          >
            {/* 종목 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {stock.name}
                </span>
                {holding && (
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
                    {holding.qty}주
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">{stock.symbol}</div>
            </div>

            {/* 가격 */}
            <div className="text-right min-w-[90px]">
              {pricesLoading && !price ? (
                <div className="text-xs text-gray-400 font-mono">로딩중...</div>
              ) : price ? (
                <>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {fmt(Math.round(price))}
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      changePct > 0
                        ? "text-red-500 dark:text-red-400"
                        : changePct < 0
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-gray-500"
                    }`}
                  >
                    {changePct > 0 ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 font-mono">—</div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-1">
              <button
                disabled={!price}
                onClick={() => price && onBuy(stock, price)}
                className="text-xs font-mono px-2 py-1 rounded bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                매수
              </button>
              <button
                disabled={!price || !holding}
                onClick={() => price && holding && onSell(stock, price, holding)}
                className="text-xs font-mono px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                매도
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
