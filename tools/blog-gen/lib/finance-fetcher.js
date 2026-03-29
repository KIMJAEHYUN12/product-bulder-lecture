/**
 * Step 4: OpenDART 재무제표 API 조회
 *
 * fnlttSinglAcntAll.json API로 최근 2년 분기별 재무제표 조회.
 * CFS(연결) 우선, 실패 시 OFS(개별) fallback.
 *
 * 핵심 필드:
 * - thstrm_amount: 해당 분기 개별 금액 (3개월분)
 * - thstrm_add_amount: 기초~해당분기 누적 금액
 * - 사업보고서: thstrm_amount = 12개월 전체 (누적 없음)
 *
 * Q4 = 사업보고서 thstrm_amount - 3Q thstrm_add_amount
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

// 추출할 계정과목 (account_id 우선 매칭, account_nm fallback)
const TARGET_ACCOUNTS = {
  IS: [
    {
      name: '매출액',
      accountIds: ['ifrs-full_Revenue'],
      keywords: ['매출액', '영업수익', '수익(매출액)'],
    },
    {
      name: '영업이익',
      accountIds: ['dart_OperatingIncomeLoss'],
      keywords: ['영업이익', '영업이익(손실)'],
    },
    {
      name: '당기순이익',
      accountIds: ['ifrs-full_ProfitLoss'],
      keywords: ['당기순이익', '당기순이익(손실)', '분기순이익(손실)', '반기순이익(손실)'],
    },
  ],
  BS: [
    {
      name: '자산총계',
      accountIds: ['ifrs-full_Assets'],
      keywords: ['자산총계'],
    },
    {
      name: '부채총계',
      accountIds: ['ifrs-full_Liabilities'],
      keywords: ['부채총계'],
    },
    {
      name: '자본총계',
      accountIds: ['ifrs-full_Equity'],
      keywords: ['자본총계'],
    },
  ],
};

/**
 * 단일 보고서 API 호출
 */
async function fetchSingleReport(corpCode, year, reportCode, fsDiv) {
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

  if (data.status === '013') return null;
  if (data.status !== '000') return null;

  return data.list || null;
}

/**
 * 금액 문자열 → 숫자
 */
function parseAmount(val) {
  if (val == null || val === '' || val === '-') return null;
  const num = parseInt(String(val).replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
}

/**
 * 계정과목 검색 — sj_div 필터 + account_id 우선 + account_nm fallback
 * @returns {{ amount: number|null, cumAmount: number|null }}
 */
function findAccount(items, sjDiv, acctDef) {
  const filtered = items.filter(i => i.sj_div === sjDiv);

  // 1차: account_id로 매칭
  for (const id of acctDef.accountIds) {
    const found = filtered.find(i => i.account_id === id);
    if (found) {
      return {
        amount: parseAmount(found.thstrm_amount),
        cumAmount: parseAmount(found.thstrm_add_amount),
      };
    }
  }

  // 2차: account_nm으로 매칭
  for (const kw of acctDef.keywords) {
    const found = filtered.find(i => i.account_nm?.trim() === kw);
    if (found) {
      return {
        amount: parseAmount(found.thstrm_amount),
        cumAmount: parseAmount(found.thstrm_add_amount),
      };
    }
  }

  return { amount: null, cumAmount: null };
}

/**
 * 억원 단위 변환 (소수 첫째자리)
 */
function toEok(val) {
  if (val == null) return null;
  return Math.round(val / 1e7) / 10;
}

/**
 * 재무제표 데이터 조회 + 가공
 */
async function fetchFinanceData(stockCode, onProgress = () => {}) {
  const corpCode = getCorpCode(stockCode);
  if (!corpCode) {
    onProgress('DART 기업 고유번호 매핑 없음 — 재무제표 스킵');
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  // 사업보고서는 보통 3월 말에 제출 → currentYear-1이 최신
  // currentYear-2도 포함해 2년치 확보
  const years = [currentYear - 1, currentYear - 2];

  // 연도별 × 보고서별 조회
  const rawData = {};

  for (const year of years) {
    for (const report of REPORT_CODES) {
      const key = `${year}_${report.label}`;
      onProgress(`${key} 재무제표 조회 중...`);

      // CFS(연결) 우선
      let items = await fetchSingleReport(corpCode, year, report.code, 'CFS');
      let fsType = 'CFS';

      if (!items) {
        items = await fetchSingleReport(corpCode, year, report.code, 'OFS');
        fsType = 'OFS';
      }

      if (!items) {
        onProgress(`${key}: 데이터 없음`);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // IS 항목: CIS(포괄손익계산서) 또는 IS(손익계산서)에서 추출
      const hasCIS = items.some(i => i.sj_div === 'CIS');
      const isSjDiv = hasCIS ? 'CIS' : 'IS';

      const extracted = { fsType, year, quarter: report.quarter, label: report.label };

      for (const acct of TARGET_ACCOUNTS.IS) {
        const result = findAccount(items, isSjDiv, acct);
        extracted[acct.name] = result.amount;
        extracted[`${acct.name}_cum`] = result.cumAmount;
      }

      for (const acct of TARGET_ACCOUNTS.BS) {
        const result = findAccount(items, 'BS', acct);
        extracted[acct.name] = result.amount;
      }

      rawData[key] = extracted;
      onProgress(`${key}: ${fsType} 추출 완료`);

      await new Promise(r => setTimeout(r, 300));
    }
  }

  const keys = Object.keys(rawData);
  if (keys.length === 0) {
    onProgress('재무제표 데이터 없음');
    return null;
  }

  // 개별분기 배열 생성
  const quarters = buildQuarters(rawData, years);

  // 비율 + YoY 계산
  enrichWithRatios(quarters);
  enrichWithYoY(quarters);

  // 이상치 검증
  validateQuarters(quarters);

  const result = {
    raw: rawData,
    quarters,
    summary: buildSummary(quarters),
  };

  onProgress(`재무제표 ${keys.length}건 조회 완료`);
  return result;
}

/**
 * 개별분기 배열 생성
 *
 * - Q1/Q2/Q3: thstrm_amount가 이미 개별분기 값
 * - Q4: 사업보고서 thstrm_amount(FY) - 3Q thstrm_add_amount(9M 누적)
 */
function buildQuarters(rawData, years) {
  const quarters = [];
  const isNames = TARGET_ACCOUNTS.IS.map(a => a.name);
  const bsNames = TARGET_ACCOUNTS.BS.map(a => a.name);

  for (const year of years) {
    for (const report of REPORT_CODES) {
      const key = `${year}_${report.label}`;
      const data = rawData[key];
      if (!data) continue;

      const displayLabel = report.quarter === 4 ? 'Q4' : report.label;
      const q = {
        year,
        quarter: report.quarter,
        label: `${year} ${displayLabel}`,
        fsType: data.fsType,
      };

      // BS: 시점값 그대로
      for (const name of bsNames) {
        q[name] = data[name];
      }

      // IS: 개별분기 처리
      if (report.quarter <= 3) {
        // Q1/Q2/Q3: thstrm_amount = 개별분기 값
        for (const name of isNames) {
          q[name] = data[name];
        }
      } else {
        // Q4: FY - 9M 누적
        const q3Key = `${year}_3Q`;
        const q3Data = rawData[q3Key];

        for (const name of isNames) {
          const fyVal = data[name]; // 사업보고서 = 12개월 전체
          const cumQ3 = q3Data?.[`${name}_cum`]; // 3Q 누적(9M)

          if (fyVal != null && cumQ3 != null) {
            q[name] = fyVal - cumQ3;
          } else if (fyVal != null) {
            // 3Q 누적 없으면 FY 전체로 표시 + 플래그
            q[name] = fyVal;
            q.isFullYear = true;
          } else {
            q[name] = null;
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
 * 영업이익률, 순이익률, 부채비율
 */
function enrichWithRatios(quarters) {
  for (const q of quarters) {
    const rev = q['매출액'];
    if (rev && rev !== 0) {
      if (q['영업이익'] != null) {
        q['영업이익률'] = ((q['영업이익'] / rev) * 100).toFixed(1);
      }
      if (q['당기순이익'] != null) {
        q['순이익률'] = ((q['당기순이익'] / rev) * 100).toFixed(1);
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
    if (q.isFullYear) continue; // FY 전체값으로는 YoY 비교 불가
    const prev = quarters.find(p =>
      p.year === q.year - 1 && p.quarter === q.quarter && !p.isFullYear
    );
    if (!prev) continue;

    for (const name of ['매출액', '영업이익', '당기순이익']) {
      if (q[name] != null && prev[name] != null && prev[name] !== 0) {
        q[`${name}_YoY`] = (((q[name] - prev[name]) / Math.abs(prev[name])) * 100).toFixed(1);
      }
    }
  }
}

/**
 * 이상치 검증 — 비정상 비율 플래그
 */
function validateQuarters(quarters) {
  for (const q of quarters) {
    const opRate = parseFloat(q['영업이익률']);
    const npRate = parseFloat(q['순이익률']);

    if (!isNaN(opRate) && Math.abs(opRate) > 100) {
      q.anomaly = (q.anomaly || '') + `영업이익률 ${opRate}% 이상치; `;
    }
    if (!isNaN(npRate) && Math.abs(npRate) > 200) {
      q.anomaly = (q.anomaly || '') + `순이익률 ${npRate}% 이상치; `;
    }
    // 순이익 > 매출 (절대값)
    if (q['매출액'] && q['당기순이익'] && Math.abs(q['당기순이익']) > Math.abs(q['매출액']) * 2) {
      q.anomaly = (q.anomaly || '') + '순이익이 매출의 2배 초과; ';
    }
  }
}

/**
 * 요약 테이블 생성
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
    const note = q.isFullYear ? '(연간)' : '';
    const anomalyMark = q.anomaly ? ' ⚠️' : '';

    lines.push(
      `| ${q.label}${note}${anomalyMark} | ${rev != null ? rev.toLocaleString() : '-'} | ${op != null ? op.toLocaleString() : '-'} | ${q['영업이익률'] || '-'}% | ${np != null ? np.toLocaleString() : '-'} | ${q['순이익률'] || '-'}% | ${q['부채비율'] || '-'}% |`
    );
  }

  // YoY 요약 (isFullYear 아닌 최신 분기)
  const latest = quarters.find(q => !q.isFullYear);
  if (latest) {
    const yoyItems = [];
    if (latest['매출액_YoY']) yoyItems.push(`매출 YoY ${latest['매출액_YoY']}%`);
    if (latest['영업이익_YoY']) yoyItems.push(`영업이익 YoY ${latest['영업이익_YoY']}%`);
    if (latest['당기순이익_YoY']) yoyItems.push(`순이익 YoY ${latest['당기순이익_YoY']}%`);

    if (yoyItems.length) {
      lines.push('');
      lines.push(`최신 분기(${latest.label}) 전년 동기 대비: ${yoyItems.join(', ')}`);
    }
  }

  // BS 요약
  const latestBS = quarters[0];
  const assets = toEok(latestBS['자산총계']);
  const liabilities = toEok(latestBS['부채총계']);
  const equity = toEok(latestBS['자본총계']);
  if (assets != null) {
    lines.push('');
    lines.push(`재무상태(${latestBS.label}): 자산 ${assets.toLocaleString()}억, 부채 ${liabilities?.toLocaleString() || '-'}억, 자본 ${equity?.toLocaleString() || '-'}억, 부채비율 ${latestBS['부채비율'] || '-'}%`);
  }

  return lines.join('\n');
}

module.exports = { fetchFinanceData, toEok };
