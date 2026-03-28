/**
 * Step 3: OpenDART API 공시 조회
 *
 * 11개 항목 자동 체크:
 * 블록딜, 임원매매, 신규시설투자, 단일판매공급, 자기주식, 대량보유,
 * 영업정지, 유상증자/전환사채, 소송, 최대주주변경, 감사의견
 */

const path = require('path');
const fs = require('fs');

const DART_API_URL = 'https://opendart.fss.or.kr/api';

// ── DART 기업 고유번호 매핑 ──────────────────────────────

let _corpCodes = null;

function loadCorpCodes() {
  if (_corpCodes) return _corpCodes;
  const filePath = path.resolve(__dirname, '../../../functions/data/dartCorpCodes.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    _corpCodes = JSON.parse(raw);
    return _corpCodes;
  } catch (err) {
    console.error('dartCorpCodes.json 로드 실패:', err.message);
    return {};
  }
}

function getCorpCode(stockCode) {
  const codes = loadCorpCodes();
  return codes[stockCode] || null;
}

// ── 공시 유형별 필터 키워드 ──────────────────────────────

const DISCLOSURE_TYPES = [
  { type: '블록딜', keywords: ['내부자거래'] },
  { type: '임원매매', keywords: ['임원ㆍ주요주주특정증권'] },
  { type: '신규시설투자', keywords: ['신규시설투자'] },
  { type: '단일판매공급', keywords: ['단일판매', '단일공급'] },
  { type: '자기주식', keywords: ['자기주식'] },
  { type: '대량보유', keywords: ['대량보유', '주식등의대량보유'] },
  { type: '영업정지', keywords: ['영업정지'] },
  { type: '유상증자', keywords: ['유상증자', '전환사채'] },
  { type: '소송', keywords: ['소송'] },
  { type: '최대주주변경', keywords: ['최대주주'] },
  { type: '감사의견', keywords: ['감사의견', '감사보고서'] },
];

// ── API 호출 ─────────────────────────────────────────────

async function fetchDartList(corpCode, bgnDate, endDate) {
  const dartKey = process.env.DART_API_KEY;
  if (!dartKey) throw new Error('DART_API_KEY 환경변수가 설정되지 않았습니다');

  const params = new URLSearchParams({
    crtfc_key: dartKey,
    corp_code: corpCode,
    bgn_de: bgnDate,
    end_de: endDate,
    page_count: '100',
  });

  const res = await fetch(`${DART_API_URL}/list.json?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`DART API ${res.status}`);
  const data = await res.json();

  if (data.status === '013') {
    // 조회 결과 없음
    return [];
  }

  if (data.status !== '000') {
    throw new Error(`DART API 오류: ${data.message || data.status}`);
  }

  return data.list || [];
}

// ── 메인 체크 함수 ───────────────────────────────────────

/**
 * 종목 DART 공시 10개 항목 체크
 * @param {string} stockCode - 6자리 종목코드
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<object>} { checked_at, corp_code, corp_name, hits, clean }
 */
async function checkDisclosures(stockCode, onProgress = () => {}) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) {
    return {
      checked_at: new Date().toISOString().slice(0, 10),
      corp_code: null,
      corp_name: stockCode,
      hits: [],
      clean: DISCLOSURE_TYPES.map(d => d.type),
      error: 'DART 기업 고유번호 매핑 없음',
    };
  }

  onProgress('DART 공시 목록 조회 중...');

  // 최근 1년간 공시 조회
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, '');

  const disclosures = await fetchDartList(corpCode, startDate, endDate);

  onProgress(`공시 ${disclosures.length}건 분석 중...`);

  const hits = [];
  const clean = [];

  for (const dtype of DISCLOSURE_TYPES) {
    const matched = disclosures.filter(d =>
      dtype.keywords.some(kw => d.report_nm.includes(kw))
    );

    if (matched.length > 0) {
      // 가장 최근 공시 선택
      const latest = matched.sort((a, b) => b.rcept_dt.localeCompare(a.rcept_dt))[0];

      hits.push({
        type: dtype.type,
        report_nm: latest.report_nm,
        rcept_dt: latest.rcept_dt,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${latest.rcept_no}`,
        matchCount: matched.length,
        screenshot: null, // Step 2에서 채워짐
        summary: null,    // 사용자가 수동 입력 또는 추후 AI 생성
      });
    } else {
      clean.push(dtype.type);
    }
  }

  onProgress(`히트 ${hits.length}건, 클린 ${clean.length}건`);

  return {
    checked_at: new Date().toISOString().slice(0, 10),
    corp_code: corpCode,
    corp_name: stockCode,
    hits,
    clean,
  };
}

module.exports = { checkDisclosures, getCorpCode, DISCLOSURE_TYPES };
