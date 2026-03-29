/**
 * Step 4: OpenDART 재무제표 API 조회
 *
 * fnlttSinglAcntAll.json API로 최근 2년 분기별 재무제표 조회.
 * CFS(연결) 우선, 실패 시 OFS(개별) fallback.
 * IS 항목은 누적→개별분기 역산.
 */

const corpCodesData = require('../data/dartCorpCodes.json');

const DART_API_URL = 'https://opendart.fss.or.kr/api';

function getCorpCode(stockCode) {
  return corpCodesData[stockCode] || null;
}

// 보고서 코드: 1Q, 반기, 3Q, 사업보고서
const REPORT_CODES = [
  { code: '11013', label: '1Q', quarter: 1 },
  { code: '11012', label: '반기', quarter: 2 },
  { code: '11014', label: '3Q', quarter: 3 },
  { code: '11011', label: '사업보고서', quarter: 4 },
];

// 추출할 계정과목
const TARGET_ACCOUNTS = {
  IS: [
    { name: '매출액', keywords: ['매출액', '수익(매출액)'] },
    { name: '영업이익', keywords: ['영업이익', '영업이익(손실)'] },
    { name: '당기순이익', keywords: ['당기순이익', '당기순이익(손실)', '분기순이익', '반기순이익'] },
  ],
  BS: [
    { name: '자산총계', keywords: ['자산총계'] },
    { name: '부채총계', keywords: ['부채총계'] },
    { name: '자본총계', keywords: ['자본총계'] },
  ],
};

/**
 * 단일 보고서 API 호출
 */
async function fetchSingleReport(corpCode, year, reportCode, fsDiv, onProgress) {
  const dartKey = process.env.DART_API_KEY;
  if (!dartKey) throw new Error('DART_API_KEY 환경변수가 설정되지 않았습니다');

  const params = new URLSearchParams({
    crtfc_key: dartKey,
    corp_code: corpCode,
    bsns_year: String(year),
    reprt_code: reportCode,
    fs_div: fsDiv,
  });

  const res = await fetch(`${DART_API_URL}/fnlttSinglAcntAll.json?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const data = await res.json();

  if (data.status === '013') return null; // 조회 결과 없음
  if (data.status !== '000') return null;

  return data.list || null;
}

/**
 * 계정과목 검색 - thstrm_amount(당기) 반환
 */
function findAccountAmount(items, keywords) {
  for (const kw of keywords) {
    const found = items.find(item =>
      item.account_nm?.trim() === kw && item.thstrm_amount != null
    );
    if (found) {
      const raw = String(found.thstrm_amount).replace(/,/g, '');
      const val = parseInt(raw, 10);
      return isNaN(val) ? null : val;
    }
  }
  return null;
}

/**
 * 억원 단위 변환 (소수 첫째자리)
 */
function toEok(val) {
  if (val == null) return null;
  return Math.round(val / 1e7) / 10; // 억원, 소수 1자리
}

/**
 * 재무제표 데이터 조회 + 가공
 * @param {string} stockCode - 6자리 종목코드
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<object|null>}
 */
async function fetchFinanceData(stockCode, onProgress = () => {}) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) {
    onProgress('DART 기업 고유번호 매핑 없음 — 재무제표 스킵');
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear - 1];

  // 연도별 × 보고서별 조회
  const rawData = {}; // { '2025_1Q': { IS: {...}, BS: {...} }, ... }

  for (const year of years) {
    for (const report of REPORT_CODES) {
      const key = `${year}_${report.label}`;
      onProgress(`${key} 재무제표 조회 중...`);

      // CFS(연결) 우선
      let items = await fetchSingleReport(corpCode, year, report.code, 'CFS', onProgress);
      let fsType = 'CFS';

      if (!items) {
        // OFS(개별) fallback
        items = await fetchSingleReport(corpCode, year, report.code, 'OFS', onProgress);
        fsType = 'OFS';
      }

      if (!items) {
        onProgress(`${key}: 데이터 없음`);
        continue;
      }

      // 계정과목 추출
      const extracted = { fsType };
      for (const [category, accounts] of Object.entries(TARGET_ACCOUNTS)) {
        for (const acct of accounts) {
          extracted[acct.name] = findAccountAmount(items, acct.keywords);
        }
      }

      rawData[key] = { year, quarter: report.quarter, label: report.label, ...extracted };
      onProgress(`${key}: ${fsType} 추출 완료`);

      // DART rate limit 방지
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const keys = Object.keys(rawData);
  if (keys.length === 0) {
    onProgress('재무제표 데이터 없음');
    return null;
  }

  // 개별분기 역산 (IS 항목만)
  const quarters = calcIndividualQuarters(rawData, years);

  // 자동 계산: 비율 + YoY
  enrichWithRatios(quarters);
  enrichWithYoY(quarters);

  const result = {
    raw: rawData,
    quarters,
    summary: buildSummary(quarters),
  };

  onProgress(`재무제표 ${keys.length}건 조회 완료`);
  return result;
}

/**
 * 누적 IS → 개별분기 역산
 * BS 항목은 시점값이므로 그대로 사용
 */
function calcIndividualQuarters(rawData, years) {
  const quarters = [];
  const isAccounts = TARGET_ACCOUNTS.IS.map(a => a.name);
  const bsAccounts = TARGET_ACCOUNTS.BS.map(a => a.name);

  for (const year of years) {
    for (const report of REPORT_CODES) {
      const key = `${year}_${report.label}`;
      const data = rawData[key];
      if (!data) continue;

      const q = {
        year,
        quarter: report.quarter,
        label: `${year} ${report.label}`,
        fsType: data.fsType,
        isCumulative: false,
      };

      // BS 항목: 시점값 그대로
      for (const name of bsAccounts) {
        q[name] = data[name];
      }

      // IS 항목: 개별분기 역산
      for (const name of isAccounts) {
        const cumVal = data[name];
        if (cumVal == null) {
          q[name] = null;
          continue;
        }

        if (report.quarter === 1) {
          // Q1: 누적값 = 개별분기값
          q[name] = cumVal;
        } else {
          // Q2~Q4: 이전 보고서 누적값을 빼야 함
          const prevReport = REPORT_CODES[report.quarter - 2]; // Q2→1Q, Q3→반기, Q4→3Q
          const prevKey = `${year}_${prevReport.label}`;
          const prevData = rawData[prevKey];
          const prevVal = prevData?.[name];

          if (prevVal != null) {
            q[name] = cumVal - prevVal;
          } else {
            // 이전 분기 없으면 누적값 그대로 + 플래그
            q[name] = cumVal;
            q.isCumulative = true;
          }
        }
      }

      quarters.push(q);
    }
  }

  // 최신순 정렬
  quarters.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarter - a.quarter;
  });

  return quarters;
}

/**
 * 영업이익률, 순이익률, 부채비율 계산
 */
function enrichWithRatios(quarters) {
  for (const q of quarters) {
    if (q['매출액'] && q['매출액'] !== 0) {
      if (q['영업이익'] != null) {
        q['영업이익률'] = ((q['영업이익'] / q['매출액']) * 100).toFixed(1);
      }
      if (q['당기순이익'] != null) {
        q['순이익률'] = ((q['당기순이익'] / q['매출액']) * 100).toFixed(1);
      }
    }
    if (q['자본총계'] && q['자본총계'] !== 0 && q['부채총계'] != null) {
      q['부채비율'] = ((q['부채총계'] / q['자본총계']) * 100).toFixed(1);
    }
  }
}

/**
 * YoY 성장률 (전년 동기 대비)
 */
function enrichWithYoY(quarters) {
  for (const q of quarters) {
    const prev = quarters.find(p => p.year === q.year - 1 && p.quarter === q.quarter);
    if (!prev) continue;

    for (const name of ['매출액', '영업이익', '당기순이익']) {
      if (q[name] != null && prev[name] != null && prev[name] !== 0) {
        q[`${name}_YoY`] = (((q[name] - prev[name]) / Math.abs(prev[name])) * 100).toFixed(1);
      }
    }
  }
}

/**
 * 요약 텍스트 생성 (blog-writer에 전달)
 */
function buildSummary(quarters) {
  if (!quarters.length) return '재무제표 데이터 없음';

  const lines = [];
  lines.push('| 분기 | 매출액(억) | 영업이익(억) | 영업이익률 | 순이익(억) | 순이익률 | 부채비율 |');
  lines.push('|------|-----------|-------------|-----------|-----------|---------|---------|');

  for (const q of quarters) {
    const rev = toEok(q['매출액']);
    const op = toEok(q['영업이익']);
    const np = toEok(q['당기순이익']);
    const cumNote = q.isCumulative ? '(누적)' : '';

    lines.push(
      `| ${q.label}${cumNote} | ${rev != null ? rev.toLocaleString() : '-'} | ${op != null ? op.toLocaleString() : '-'} | ${q['영업이익률'] || '-'}% | ${np != null ? np.toLocaleString() : '-'} | ${q['순이익률'] || '-'}% | ${q['부채비율'] || '-'}% |`
    );
  }

  // YoY 요약
  const latest = quarters[0];
  const yoyItems = [];
  if (latest['매출액_YoY']) yoyItems.push(`매출 YoY ${latest['매출액_YoY']}%`);
  if (latest['영업이익_YoY']) yoyItems.push(`영업이익 YoY ${latest['영업이익_YoY']}%`);
  if (latest['당기순이익_YoY']) yoyItems.push(`순이익 YoY ${latest['당기순이익_YoY']}%`);

  if (yoyItems.length) {
    lines.push('');
    lines.push(`최신 분기(${latest.label}) 전년 동기 대비: ${yoyItems.join(', ')}`);
  }

  // BS 요약 (최신 분기)
  const assets = toEok(latest['자산총계']);
  const liabilities = toEok(latest['부채총계']);
  const equity = toEok(latest['자본총계']);
  if (assets != null) {
    lines.push('');
    lines.push(`재무상태(${latest.label}): 자산 ${assets.toLocaleString()}억, 부채 ${liabilities?.toLocaleString() || '-'}억, 자본 ${equity?.toLocaleString() || '-'}억, 부채비율 ${latest['부채비율'] || '-'}%`);
  }

  return lines.join('\n');
}

module.exports = { fetchFinanceData, toEok };
