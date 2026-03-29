/**
 * Step 3: OpenDART API 공시 조회
 *
 * 12개 항목 자동 체크:
 * 블록딜, 임원매매, 신규시설투자, 단일판매공급, 자기주식, 대량보유,
 * 영업정지, 유상증자/전환사채, 소송, 최대주주변경, 감사의견, 배당
 */

const corpCodesData = require('../data/dartCorpCodes.json');
const { enrichHitFromHtml } = require('./dart-html-parser');

const DART_API_URL = 'https://opendart.fss.or.kr/api';

function getCorpCode(stockCode) {
  return corpCodesData[stockCode] || null;
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
  { type: '배당', keywords: ['현금배당', '배당결정', '주주총회소집공고'] },
];

// ── 구조화 API 엔드포인트 매핑 ──────────────────────────
// OpenDART 주요사항보고서 API — corp_code + bgn_de + end_de로 조회

const ENRICHMENT_ENDPOINTS = {
  '자기주식': [
    { endpoint: 'tsstkAqDecsn.json', label: '자기주식취득결정' },
    { endpoint: 'tsstkDpDecsn.json', label: '자기주식처분결정' },
  ],
  '유상증자': [
    { endpoint: 'piicDecsn.json', label: '유상증자결정' },
    { endpoint: 'bdDecsn.json', label: '전환사채발행결정' },
  ],
  '신규시설투자': [
    { endpoint: 'nwFcltInvstDecsn.json', label: '신규시설투자결정' },
  ],
  '단일판매공급': [
    { endpoint: 'sglSaleSlcDecsn.json', label: '단일판매공급계약' },
  ],
  '소송': [
    { endpoint: 'lwstDecsn.json', label: '소송제기판결' },
  ],
};

// 메타/관리용 필드 — 요약에서 제외
const META_FIELDS = new Set([
  'rcept_no', 'rcept_dt', 'corp_code', 'corp_name', 'corp_cls',
  'stock_code', 'crtfc_key', 'status', 'message', 'report_nm',
]);

// 알려진 필드 → 한글 라벨
const FIELD_LABELS = {
  // 자기주식 취득
  aq_planqy: '취득예정수량', aq_sttd: '취득시작일', aq_endd: '취득종료일',
  aq_pp: '취득방법', aq_wtn_div_ostk: '보통주', aq_wtn_div_pstk: '우선주',
  // 자기주식 처분
  dp_planqy: '처분예정수량', dp_sttd: '처분시작일', dp_endd: '처분종료일',
  dp_pp: '처분방법', dp_wtn_div_ostk: '보통주', dp_wtn_div_pstk: '우선주',
  // 유상증자
  nstk_ostk_cnt: '보통주신주수', nstk_pstk_cnt: '우선주신주수',
  slprc: '발행가', fdpp_fclt: '자금용도', stk_parprc: '액면가',
  // 전환사채
  bd_knd: '사채종류', bd_fta: '사채총액', bd_intr_ex: '표면이자율',
  bd_intr_sf: '만기이자율', bd_mtd: '만기일', cv_prc: '전환가',
  // 신규시설투자
  inv_tm: '투자금액', inv_purps: '투자목적', inv_cmplt_pd: '완료예정일',
  tg_inv_tm: '투자총액', inv_std: '투자시작일', inv_edd: '투자종료일',
  // 단일판매공급
  cntr_amt: '계약금액', cntr_pp: '계약상대방', cntr_pd_bgn: '계약시작일',
  cntr_pd_end: '계약종료일', slcpnt: '판매처', cntr_cn: '계약내용',
  // 소송
  lwst_amt: '소송가액', lwst_cn: '소송내용', xpct_rslt_cn: '예상결과',
  lwst_dt: '소송일자', pltf: '원고', dfndt: '피고',
  // 공통
  bddd: '이사회결의일', od_a_at_t: '자산총액대비비율(%)',
  ftc_sttd: '효력발생일', rptg_sttd: '보고일',
};

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

// ── 구조화 API로 공시 상세 조회 ──────────────────────────

/**
 * 히트된 공시의 상세 데이터를 구조화 API로 조회
 * @param {string} corpCode - DART 기업 고유번호
 * @param {Array} hits - checkDisclosures에서 추출한 히트 배열
 * @param {string} startDate - 조회 시작일 (YYYYMMDD)
 * @param {string} endDate - 조회 종료일 (YYYYMMDD)
 * @param {Function} onProgress
 */
async function enrichHitsWithDetails(corpCode, hits, startDate, endDate, onProgress) {
  const dartKey = process.env.DART_API_KEY;
  if (!dartKey) return hits;

  for (const hit of hits) {
    const endpoints = ENRICHMENT_ENDPOINTS[hit.type];
    if (!endpoints) {
      onProgress(`${hit.type}: 구조화 API 없음 — 기본 정보만 사용`);
      continue;
    }

    let found = false;
    for (const { endpoint, label } of endpoints) {
      if (found) break;
      try {
        const params = new URLSearchParams({
          crtfc_key: dartKey,
          corp_code: corpCode,
          bgn_de: startDate,
          end_de: endDate,
        });

        const res = await fetch(`${DART_API_URL}/${endpoint}?${params}`, {
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) continue;
        const data = await res.json();
        if (data.status !== '000' || !data.list || data.list.length === 0) continue;

        // rcept_no로 정확 매칭
        let matched = data.list.find(item => item.rcept_no === hit.rcept_no);

        // 매칭 안 되면 가장 최근 항목 사용
        if (!matched) {
          matched = data.list.sort((a, b) =>
            (b.rcept_dt || '').localeCompare(a.rcept_dt || '')
          )[0];
        }

        if (matched) {
          hit.summary = formatDetailSummary(label, matched);
          hit.detail = matched;
          found = true;
          onProgress(`${hit.type}: ${label} 상세 데이터 추출 완료`);
        }
      } catch (err) {
        onProgress(`${hit.type} ${endpoint} 오류: ${err.message}`);
      }
    }

    if (!found) {
      onProgress(`${hit.type}: 구조화 API 매칭 실패 — 기본 정보만 사용`);
    }
  }

  // ── 2차 패스: summary가 null인 히트에 대해 HTML 파싱 ──
  const needsHtmlParse = hits.filter(h => !h.summary);
  if (needsHtmlParse.length > 0) {
    onProgress(`HTML 파싱 2차 패스: ${needsHtmlParse.length}건 처리 중...`);
    for (const hit of needsHtmlParse) {
      await enrichHitFromHtml(hit, onProgress);
      // DART rate limit 방지: 요청 간 500ms 대기
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return hits;
}

/**
 * 구조화 API 응답을 한글 요약으로 변환
 */
function formatDetailSummary(label, data) {
  const lines = [`[${label}]`];

  for (const [key, value] of Object.entries(data)) {
    if (META_FIELDS.has(key)) continue;
    if (!value || value === '-' || value === '' || value === ' ') continue;

    const fieldLabel = FIELD_LABELS[key] || key;
    lines.push(`${fieldLabel}: ${value}`);
  }

  return lines.join('\n');
}

// ── 메인 체크 함수 ───────────────────────────────────────

/**
 * 종목 DART 공시 10개 항목 체크 + 상세 조회
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
        rcept_no: latest.rcept_no,
        rcept_dt: latest.rcept_dt,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${latest.rcept_no}`,
        matchCount: matched.length,
        screenshot: null,
        summary: null,
        detail: null,
      });
    } else {
      clean.push(dtype.type);
    }
  }

  onProgress(`히트 ${hits.length}건, 클린 ${clean.length}건`);

  // ── 히트 공시 상세 조회 ──
  if (hits.length > 0) {
    onProgress('히트 공시 상세 데이터 조회 중...');
    await enrichHitsWithDetails(corpCode, hits, startDate, endDate, onProgress);
  }

  return {
    checked_at: new Date().toISOString().slice(0, 10),
    corp_code: corpCode,
    corp_name: stockCode,
    hits,
    clean,
  };
}

module.exports = { checkDisclosures, getCorpCode, DISCLOSURE_TYPES };
