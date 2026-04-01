/**
 * 경쟁사 자동 비교 데이터 수집
 *
 * 업종별 하드코딩 매핑 → 기존 stock-prices API로 기본 데이터 조회.
 * 매칭 실패/API 실패 시 null 반환.
 */

const { getStockInfo, getYahooSymbol } = require('./utils/stock-codes');

const API_HOST = process.env.API_HOST || 'https://bitgak.co.kr';

// 업종 키워드 → 경쟁사 코드 매핑 (현재 종목 제외는 호출 시 처리)
const SECTOR_COMPETITORS = {
  '반도체': ['005930', '000660'],           // 삼성전자, SK하이닉스
  '전자': ['005930', '000660'],             // 삼성전자, SK하이닉스
  '금융': ['105560', '055550'],             // KB금융, 신한지주
  '은행': ['105560', '055550'],             // KB금융, 신한지주
  '보험': ['032830', '005830'],             // 삼성생명, DB손해보험
  '증권': ['016360', '006800'],             // 삼성증권, 미래에셋증권
  '자동차': ['005380', '012330'],           // 현대차, 현대모비스
  '인터넷': ['035720', '035420'],           // 카카오, NAVER
  'IT': ['035720', '035420'],               // 카카오, NAVER
  '플랫폼': ['035720', '035420'],           // 카카오, NAVER
  '조선': ['009540', '042660'],             // HD한국조선, 대우조선
  '게임': ['036570', '112040'],             // 엔씨소프트, 위메이드
  '바이오': ['207940', '068270'],           // 삼성바이오, 셀트리온
  '제약': ['207940', '068270'],             // 삼성바이오, 셀트리온
  '화학': ['051910', '010950'],             // LG화학, S-Oil
  '정유': ['010950', '096770'],             // S-Oil, SK이노베이션
  '에너지': ['010950', '096770'],           // S-Oil, SK이노베이션
  '철강': ['005490', '004020'],             // POSCO홀딩스, 현대제철
  '건설': ['000720', '047040'],             // 현대건설, 대우건설
  '유통': ['004170', '023530'],             // 신세계, 롯데쇼핑
  '식품': ['097950', '005300'],             // CJ제일제당, 롯데칠성
  '통신': ['017670', '030200'],             // SK텔레콤, KT
  '전기': ['006400', '009150'],             // 삼성SDI, 삼성전기
  '배터리': ['006400', '373220'],           // 삼성SDI, LG에너지솔루션
  '엔터': ['352820', '041510'],             // 하이브, SM
  '항공': ['003490', '089590'],             // 대한항공, 제주항공
  '호텔': ['008770', '039130'],             // 호텔신라, 하나투어
  '면세': ['008770', '023150'],             // 호텔신라, MPC
};

/**
 * 업종 문자열에서 매칭되는 경쟁사 코드 찾기
 */
function findCompetitorCodes(industry, excludeCode) {
  if (!industry) return null;

  for (const [keyword, codes] of Object.entries(SECTOR_COMPETITORS)) {
    if (industry.includes(keyword)) {
      const filtered = codes.filter((c) => c !== excludeCode);
      return filtered.length > 0 ? filtered.slice(0, 2) : null;
    }
  }
  return null;
}

function formatMarketCap(val) {
  if (!val) return null;
  if (val >= 1e12) return `${(val / 1e12).toFixed(1)}조`;
  if (val >= 1e8) return `${(val / 1e8).toFixed(0)}억`;
  return `${val.toLocaleString('ko-KR')}`;
}

/**
 * 경쟁사 비교 데이터 수집
 * @param {string} stockCode - 분석 대상 종목코드
 * @param {string} industry - 업종명
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<{competitors: Array}|null>}
 */
async function fetchCompetitorData(stockCode, industry, onProgress = () => {}) {
  const codes = findCompetitorCodes(industry, stockCode);
  if (!codes) {
    onProgress(`업종 "${industry}" 경쟁사 매핑 없음 (스킵)`);
    return null;
  }

  onProgress(`경쟁사 ${codes.length}개 데이터 조회 중...`);

  try {
    const symbols = codes.map((c) => getYahooSymbol(c)).filter(Boolean);
    if (symbols.length === 0) return null;

    const res = await fetch(`${API_HOST}/api/stock-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      onProgress(`경쟁사 API 오류: ${res.status}`);
      return null;
    }

    const priceData = await res.json();
    const competitors = [];

    for (const code of codes) {
      const symbol = getYahooSymbol(code);
      const info = getStockInfo(code);
      const p = priceData[symbol];
      if (!p) continue;

      competitors.push({
        name: info?.name || code,
        code,
        price: p.price ?? null,
        marketCap: formatMarketCap(p.marketCap),
        per: p.trailingPE ? Number(p.trailingPE.toFixed(1)) : null,
        forwardPer: p.forwardPE ? Number(p.forwardPE.toFixed(1)) : null,
        pbr: p.priceToBook ? Number(p.priceToBook.toFixed(2)) : null,
      });
    }

    if (competitors.length === 0) {
      onProgress('경쟁사 데이터 조회 실패');
      return null;
    }

    onProgress(`경쟁사 ${competitors.length}개 데이터 완료`);
    return { competitors };
  } catch (err) {
    onProgress(`경쟁사 조회 실패: ${err.message}`);
    return null;
  }
}

module.exports = { fetchCompetitorData, SECTOR_COMPETITORS };
