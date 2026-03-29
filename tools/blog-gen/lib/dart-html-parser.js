/**
 * DART 공시 HTML 파싱 모듈
 *
 * 구조화 API가 없는 7개 공시 타입의 HTML을 파싱하여 핵심 데이터 추출:
 * 임원매매, 영업정지, 대량보유, 최대주주변경, 감사의견, 블록딜, 배당
 */

const cheerio = require('cheerio');

const DART_BASE = 'https://dart.fss.or.kr';

// ── 유틸 ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 원 단위 숫자 → 억원 포맷 */
function formatBillion(raw) {
  if (!raw) return '';
  const num = Number(String(raw).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return raw;
  const abs = Math.abs(num);
  if (abs >= 1e8) {
    const val = num / 1e8;
    return `${val >= 0 ? '' : '-'}${Math.abs(val).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억원`;
  }
  if (abs >= 1e4) {
    const val = num / 1e4;
    return `${val >= 0 ? '' : '-'}${Math.abs(val).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`;
  }
  return `${num.toLocaleString('ko-KR')}원`;
}

/** 주식수 포맷 (47만주 등) */
function formatShares(raw) {
  if (!raw) return '';
  const num = Number(String(raw).replace(/[^0-9]/g, ''));
  if (isNaN(num) || num === 0) return raw;
  if (num >= 10000) {
    const man = num / 10000;
    return `${man.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만주`;
  }
  return `${num.toLocaleString('ko-KR')}주`;
}

/** DART 날짜 "2026년 04월 27일" → "4/27" */
function shortDate(raw) {
  if (!raw) return '';
  const m = raw.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (m) return `${parseInt(m[1])}/${parseInt(m[2])}`;
  return raw;
}

// ── DART 페이지 Fetch ───────────────────────────────────────

async function fetchDartPage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`DART fetch ${res.status}: ${url}`);

  const contentType = res.headers.get('content-type') || '';
  const buffer = await res.arrayBuffer();

  if (contentType.includes('euc-kr') || contentType.includes('EUC-KR')) {
    return new TextDecoder('euc-kr').decode(buffer);
  }

  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (utf8.includes('charset=euc-kr') || utf8.includes('charset=EUC-KR')) {
    return new TextDecoder('euc-kr').decode(buffer);
  }

  return utf8;
}

// ── 메인 페이지에서 문서 트리 추출 ─────────────────────────

function extractTreeNodes(mainHtml) {
  const nodes = [];
  const blocks = mainHtml.split(/treeData\.push\s*\(\s*node\d+\s*\)/);
  const assignPattern = /node\d+\['(\w+)'\]\s*=\s*"([^"]*)"/g;

  for (let i = 0; i < blocks.length - 1; i++) {
    const block = blocks[i];
    const props = {};
    let m;
    while ((m = assignPattern.exec(block)) !== null) {
      props[m[1]] = m[2];
    }
    assignPattern.lastIndex = 0;

    if (props.rcpNo && props.dcmNo) {
      nodes.push({
        id: props.id || String(i),
        text: props.text || '',
        rcpNo: props.rcpNo,
        dcmNo: props.dcmNo,
        eleId: props.eleId || '',
        offset: props.offset || '0',
        length: props.length || '0',
        dtd: props.dtd || 'dart4.xsd',
      });
    }
  }

  return nodes;
}

function extractInitialViewDoc(mainHtml) {
  const m = mainHtml.match(/viewDoc\("(\d+)",\s*"(\d+)",\s*"([^"]*)",\s*"(\d+)",\s*"(\d+)",\s*"([^"]*)",\s*"([^"]*)"\)/);
  if (!m) return null;
  return {
    rcpNo: m[1], dcmNo: m[2], eleId: m[3],
    offset: m[4], length: m[5], dtd: m[6] || 'dart4.xsd',
  };
}

function buildViewerUrl(node) {
  const params = new URLSearchParams({
    rcpNo: node.rcpNo, dcmNo: node.dcmNo,
    eleId: node.eleId || '', offset: node.offset || '0',
    length: node.length || '0', dtd: node.dtd || 'dart4.xsd',
  });
  return `${DART_BASE}/report/viewer.do?${params}`;
}

// ── cheerio 테이블 → 행 배열 변환 ──────────────────────────

function extractAllRows(html) {
  const $ = cheerio.load(html);
  const allRows = [];
  $('table, TABLE').each((_, table) => {
    $(table).find('tr, TR').each((__, row) => {
      const cells = [];
      $(row).find('td, TD, th, TH').each((___, cell) => {
        cells.push($(cell).text().replace(/\s+/g, ' ').trim());
      });
      if (cells.some(c => c.length > 0)) allRows.push(cells);
    });
  });
  return allRows;
}

/** 행 배열에서 라벨이 포함된 행 찾기 */
function findRow(rows, ...keywords) {
  return rows.find(cells =>
    cells.some(c => {
      const norm = c.replace(/\s+/g, '');
      return keywords.every(kw => norm.includes(kw));
    })
  );
}

/** 행에서 특정 키워드 이후 셀 값 반환 */
function getValueAfterLabel(cells, ...keywords) {
  for (let i = 0; i < cells.length; i++) {
    const norm = cells[i].replace(/\s+/g, '');
    if (keywords.every(kw => norm.includes(kw))) {
      // 다음 셀이 값
      for (let j = i + 1; j < cells.length; j++) {
        const v = cells[j].trim();
        if (v && v !== '-' && v !== '') return v;
      }
    }
  }
  return null;
}

// ── 타입별 전용 파서 ────────────────────────────────────────

function parseOfficerTrade(allRows) {
  const data = {};

  // 성명 (우선 — "성명(명칭)" 행에서 한글 이름)
  const nameRow = findRow(allRows, '성명');
  if (nameRow) {
    // "성명(명칭) | 한 글 | 이부진 | 한자(영문) | 李富眞" 구조
    const hanRow = findRow(allRows, '한글') || nameRow;
    for (const cell of hanRow) {
      const v = cell.trim();
      // 한글 2~5글자, 라벨 아닌 것
      if (/^[가-힣]{2,5}$/.test(v.replace(/\s/g, '')) && !v.includes('한글') && !v.includes('성명')) {
        data['보고자'] = v.replace(/\s/g, '');
        break;
      }
    }
  }

  // 보고자 fallback ("보고자 : | 이름" 패턴, "보고자구분" 제외)
  if (!data['보고자']) {
    for (const row of allRows) {
      const hasReporter = row.some(c => {
        const n = c.replace(/\s+/g, '');
        return n === '보고자:' || n === '보고자';
      });
      const isCategory = row.some(c => c.replace(/\s+/g, '').includes('보고자구분'));
      if (hasReporter && !isCategory) {
        const v = getValueAfterLabel(row, '보고자');
        if (v && !['개인(국내)', '개인(국외)', '법인'].includes(v.replace(/\s/g, ''))) {
          data['보고자'] = v.replace(/\s+/g, '');
          break;
        }
      }
    }
  }

  // 거래계획 행: "거래개시일 | 거래종료일 | 거래기간 | 거래방법 | 종류 | 수량 | 단가 | 금액"
  const planHeaderRow = findRow(allRows, '거래개시일');
  if (planHeaderRow) {
    const headerIdx = allRows.indexOf(planHeaderRow);
    // 데이터는 헤더 다음 행
    if (headerIdx + 1 < allRows.length) {
      const dataRow = allRows[headerIdx + 1];
      // 수치가 있는 행인지 확인
      if (dataRow.some(c => /^\d{4}년/.test(c.trim()) || /^[\d,]+$/.test(c.trim()))) {
        // 컬럼 순서 파악: 헤더 셀 인덱스
        const headers = planHeaderRow.map(h => h.replace(/\s+/g, ''));
        for (let i = 0; i < headers.length && i < dataRow.length; i++) {
          const h = headers[i];
          const v = dataRow[i]?.trim();
          if (!v || v === '-') continue;

          if (h.includes('거래개시일')) data['거래시작일'] = v;
          if (h.includes('거래종료일')) data['거래종료일'] = v;
          if (h.includes('거래방법')) data['거래방법'] = v;
          if (h.includes('특정증권등의종류')) data['증권종류'] = v;
          if (h.includes('특정증권등의수') || h.includes('주식수')) data['주식수'] = v.replace(/[^0-9]/g, '');
          if (h.includes('단가')) data['단가'] = v.replace(/[^0-9]/g, '');
          if (h.includes('거래금액')) data['금액'] = v.replace(/[^0-9]/g, '');
        }
      }
    }
  }

  // 거래목적
  const purposeRow = findRow(allRows, '거래목적');
  if (purposeRow) {
    const v = getValueAfterLabel(purposeRow, '거래목적');
    if (v) data['거래목적'] = v;
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseBusinessSuspension(allRows) {
  const data = {};

  // 영업정지금액
  const amountRow = findRow(allRows, '영업정지금액');
  if (amountRow) {
    const v = getValueAfterLabel(amountRow, '영업정지금액');
    if (v) data['영업정지금액'] = v.replace(/[^0-9,-]/g, '');
  }

  // 매출액대비 (라벨에 "매출액" + "대비" 모두 포함)
  const ratioRow = findRow(allRows, '매출액', '대비');
  if (ratioRow) {
    const v = getValueAfterLabel(ratioRow, '매출액');
    if (v) data['매출액대비'] = v.replace(/[^0-9.]/g, '') + '%';
  }

  // 영업정지내용/사유
  const contentRow = findRow(allRows, '영업정지내용') || findRow(allRows, '영업정지사유');
  if (contentRow) {
    const v = getValueAfterLabel(contentRow, '영업정지');
    if (v) data['영업정지내용'] = v;
  }

  // 사유 (별도 행)
  if (!data['사유']) {
    const reasonRow = findRow(allRows, '사유');
    if (reasonRow) {
      const v = getValueAfterLabel(reasonRow, '사유');
      if (v && v.length > 5) data['사유'] = v;
    }
  }

  // 일자
  const dateRow = findRow(allRows, '영업정지') && findRow(allRows, '일자');
  if (dateRow) {
    const v = getValueAfterLabel(dateRow, '일자');
    if (v) data['일자'] = v;
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseLargeHolding(allRows) {
  const data = {};

  // 보고자: "보고자 : | 국민연금공단" 패턴 (메타/헤더 행 제외)
  for (const row of allRows) {
    const hasLabel = row.some(c => {
      const n = c.replace(/\s+/g, '');
      return n === '보고자:' || n === '보고자';
    });
    if (!hasLabel) continue;
    const v = getValueAfterLabel(row, '보고자');
    if (v && v.length >= 2 && !v.includes('기준일') && !v.includes('보고서') &&
        !v.includes('내역') && !v.includes('계정') && !v.includes('본인')) {
      data['보고자'] = v.replace(/\s+/g, '');
      break;
    }
  }

  // 직전 보고서 / 이번 보고서 (비율은 3번째 숫자)
  // 행 구조: "직전 보고서 | 주식수 | 비율"
  const prevRow = findRow(allRows, '직전', '보고서');
  if (prevRow) {
    const nums = prevRow.filter(c => /^[\d,.]+$/.test(c.trim()));
    if (nums.length >= 2) {
      data['직전주식수'] = nums[0];
      data['직전보유비율'] = nums[1] + '%';
    } else if (nums.length === 1) {
      data['직전보유비율'] = nums[0] + '%';
    }
  }

  const currRow = findRow(allRows, '이번', '보고서');
  if (currRow) {
    const nums = currRow.filter(c => /^[\d,.]+$/.test(c.trim()));
    if (nums.length >= 2) {
      data['이번주식수'] = nums[0];
      data['이번보유비율'] = nums[1] + '%';
    } else if (nums.length === 1) {
      data['이번보유비율'] = nums[0] + '%';
    }
  }

  // 보유목적
  const purposeRow = findRow(allRows, '보유목적');
  if (purposeRow) {
    const v = getValueAfterLabel(purposeRow, '보유목적');
    if (v) data['보유목적'] = v;
  }

  // 보고사유
  const reasonRow = findRow(allRows, '보고사유');
  if (reasonRow) {
    const v = getValueAfterLabel(reasonRow, '보고사유');
    if (v) data['보고사유'] = v;
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseMajorShareholderChange(allRows) {
  const data = {};

  const beforeRow = findRow(allRows, '변경전');
  if (beforeRow) {
    // "변경전" 라벨 이후 값
    const v = getValueAfterLabel(beforeRow, '변경전');
    if (v) {
      // 숫자면 지분율, 아니면 주주명
      if (/^[\d.]+$/.test(v.replace(/[%,]/g, ''))) {
        data['변경전지분율'] = v;
      } else {
        data['변경전최대주주'] = v;
      }
    }
  }

  const afterRow = findRow(allRows, '변경후');
  if (afterRow) {
    const v = getValueAfterLabel(afterRow, '변경후');
    if (v) {
      if (/^[\d.]+$/.test(v.replace(/[%,]/g, ''))) {
        data['변경후지분율'] = v;
      } else {
        data['변경후최대주주'] = v;
      }
    }
  }

  const reasonRow = findRow(allRows, '변경사유') || findRow(allRows, '변동사유');
  if (reasonRow) {
    const v = getValueAfterLabel(reasonRow, '사유');
    if (v) data['변경사유'] = v;
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseAuditOpinion(allRows) {
  const data = {};
  const VALID_OPINIONS = ['적정', '한정', '부적정', '의견거절'];

  // 감사의견: "가. 감사의견 | 적정 | 적정" 또는 "- 감사의견 | 적정 | 적정"
  for (const row of allRows) {
    const labelCell = row.find(c => {
      const n = c.replace(/\s+/g, '');
      return (n.includes('감사의견') || n.includes('의견종류')) && !n.includes('관련없는') && !n.includes('근거') && !n.includes('내부');
    });
    if (labelCell) {
      // 같은 행에서 적정/한정/부적정/의견거절 찾기
      for (const cell of row) {
        const trimmed = cell.trim();
        if (VALID_OPINIONS.includes(trimmed)) {
          data['감사의견'] = trimmed;
          break;
        }
      }
      if (data['감사의견']) break;
    }
  }

  // 매출액: "- 매출액 | 숫자 | 숫자"
  const revenueRow = findRow(allRows, '매출액');
  if (revenueRow) {
    // 매출원가, 매출액대비 제외
    const isRevenue = revenueRow.some(c => {
      const n = c.replace(/\s+/g, '');
      return n === '매출액' || n === '-매출액';
    });
    if (isRevenue) {
      // 첫 번째 큰 숫자를 매출액으로
      for (const cell of revenueRow) {
        const num = cell.replace(/[^0-9.-]/g, '');
        if (num && Number(num) > 1e6) {
          data['매출액'] = num;
          break;
        }
      }
    }
  }

  // 영업이익
  const profitRow = findRow(allRows, '영업이익');
  if (profitRow) {
    for (const cell of profitRow) {
      const num = cell.replace(/[^0-9.-]/g, '');
      if (num && Math.abs(Number(num)) > 0) {
        data['영업이익'] = num;
        break;
      }
    }
  }

  // 당기순이익
  const netRow = findRow(allRows, '당기순이익');
  if (netRow) {
    for (const cell of netRow) {
      const num = cell.replace(/[^0-9.-]/g, '');
      if (num && Math.abs(Number(num)) > 0) {
        data['당기순이익'] = num;
        break;
      }
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseBlockDeal(allRows) {
  const data = {};

  const reporterRow = findRow(allRows, '보고자') || findRow(allRows, '성명');
  if (reporterRow) {
    const v = getValueAfterLabel(reporterRow, '보고자') || getValueAfterLabel(reporterRow, '성명');
    if (v) data['보고자'] = v.replace(/\s+/g, '');
  }

  // 거래계획 또는 거래내역 행 (임원매매와 유사 구조)
  const planHeaderRow = findRow(allRows, '거래개시일') || findRow(allRows, '거래일');
  if (planHeaderRow) {
    const headerIdx = allRows.indexOf(planHeaderRow);
    if (headerIdx + 1 < allRows.length) {
      const dataRow = allRows[headerIdx + 1];
      const headers = planHeaderRow.map(h => h.replace(/\s+/g, ''));
      for (let i = 0; i < headers.length && i < dataRow.length; i++) {
        const h = headers[i];
        const v = dataRow[i]?.trim();
        if (!v || v === '-') continue;

        if (h.includes('거래방법') || h.includes('매매구분')) data['거래유형'] = v;
        if (h.includes('주식수') || h.includes('수량')) data['수량'] = v.replace(/[^0-9]/g, '');
        if (h.includes('금액')) data['금액'] = v.replace(/[^0-9]/g, '');
        if (h.includes('거래개시일')) data['거래시작일'] = v;
        if (h.includes('거래종료일')) data['거래종료일'] = v;
      }
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}

function parseDividend(allRows) {
  const data = {};

  // 1주당 배당금 — "1주당" + "배당금"이 있되 "총액"은 없는 행
  const perShareRow = findRow(allRows, '1주당', '배당금')
    || findRow(allRows, '주당배당금')
    || findRow(allRows, '1주당 배당');
  if (perShareRow) {
    // "총액" 셀이 같은 행에 있으면 배당금총액 행을 잘못 잡은 것 → 스킵
    const joined = perShareRow.join(' ');
    if (!joined.includes('총액')) {
      const v = getValueAfterLabel(perShareRow, '배당');
      if (v) {
        const num = Number(v.replace(/[^0-9]/g, ''));
        // 1주당 배당금은 통상 100~100,000원 범위
        // 100,000 초과면 총액을 잘못 잡았을 가능성 → 스킵
        if (!isNaN(num) && num > 0 && num <= 100000) {
          data['1주당배당금'] = num.toLocaleString('ko-KR') + '원';
        }
      }
    }
  }

  // 배당수익률 / 시가배당율
  const yieldRow = findRow(allRows, '배당수익률') || findRow(allRows, '시가배당율') || findRow(allRows, '시가배당률');
  if (yieldRow) {
    const v = getValueAfterLabel(yieldRow, '배당');
    if (v) {
      const num = v.replace(/[^0-9.]/g, '');
      if (num) data['배당수익률'] = num + '%';
    }
  }

  // 배당기준일
  const dateRow = findRow(allRows, '배당기준일');
  if (dateRow) {
    const v = getValueAfterLabel(dateRow, '배당기준일');
    if (v) data['배당기준일'] = v;
  }

  // 배당금총액 — "총액" 키워드로 명시적 매칭
  const totalRow = findRow(allRows, '배당금총액') || findRow(allRows, '배당금 총액');
  if (totalRow) {
    const v = getValueAfterLabel(totalRow, '총액');
    if (v) data['배당금총액'] = v.replace(/[^0-9,-]/g, '');
  }

  // 배당종류
  const typeRow = findRow(allRows, '배당종류') || findRow(allRows, '배당구분');
  if (typeRow) {
    const v = getValueAfterLabel(typeRow, '배당');
    if (v && v.length < 20) data['배당종류'] = v;
  }

  return Object.keys(data).length > 0 ? data : null;
}

// ── 타입 → 파서 매핑 ───────────────────────────────────────

const TYPE_PARSERS = {
  '임원매매': parseOfficerTrade,
  '영업정지': parseBusinessSuspension,
  '대량보유': parseLargeHolding,
  '최대주주변경': parseMajorShareholderChange,
  '감사의견': parseAuditOpinion,
  '블록딜': parseBlockDeal,
  '배당': parseDividend,
};

// ── 타입별 summary 포맷터 ───────────────────────────────────

const SUMMARY_FORMATTERS = {
  '임원매매': (d) => {
    const name = d['보고자'] || '(미상)';
    const method = d['거래방법'] || '';
    const kind = d['증권종류'] || '보통주';
    const shares = formatShares(d['주식수']);
    const amount = formatBillion(d['금액']);
    const start = shortDate(d['거래시작일']);
    const end = shortDate(d['거래종료일']);
    const period = start && end ? `(${start}~${end})` : '';
    const parts = [name, kind, shares, method, period].filter(Boolean);
    if (amount) parts.push(`약 ${amount}`);
    return parts.join(' ') || '임원매매 공시 확인';
  },

  '영업정지': (d) => {
    const content = d['영업정지내용'] || '';
    const amount = formatBillion(d['영업정지금액']);
    const ratio = d['매출액대비'] || '';
    const reason = d['사유'] || '';
    const parts = [];
    if (content) parts.push(content);
    else if (reason && reason.length < 60) parts.push(reason);
    if (amount) parts.push(`영업정지금액 ${amount}`);
    if (ratio) parts.push(`(매출대비 ${ratio})`);
    return parts.join(', ') || '영업정지 공시 확인';
  },

  '대량보유': (d) => {
    const name = d['보고자'] || '';
    const prev = d['직전보유비율'] || '';
    const curr = d['이번보유비율'] || '';
    const purpose = d['보유목적'] || '';
    const parts = [];
    if (name) parts.push(name);
    if (prev && curr) parts.push(`보유비율 ${prev} → ${curr}`);
    else if (curr) parts.push(`보유비율 ${curr}`);
    if (purpose) parts.push(`(${purpose})`);
    return parts.join(' ') || '대량보유 공시 확인';
  },

  '최대주주변경': (d) => {
    const before = d['변경전최대주주'] || '';
    const after = d['변경후최대주주'] || '';
    const bPct = d['변경전지분율'] || '';
    const aPct = d['변경후지분율'] || '';
    if (before && after) {
      let s = `최대주주 ${before} → ${after}`;
      if (bPct || aPct) s += ` (${bPct} → ${aPct})`;
      return s;
    }
    if (d['변경사유']) return `최대주주 변경: ${d['변경사유']}`;
    return '최대주주 변경 공시 확인';
  },

  '감사의견': (d) => {
    const opinion = d['감사의견'] || '';
    const revenue = formatBillion(d['매출액']);
    const profit = formatBillion(d['영업이익']);
    const net = formatBillion(d['당기순이익']);
    const parts = [];
    if (opinion) parts.push(`감사의견: ${opinion}`);
    if (revenue) parts.push(`매출 ${revenue}`);
    if (profit) parts.push(`영업이익 ${profit}`);
    if (net) parts.push(`순이익 ${net}`);
    return parts.join(', ') || '감사의견 공시 확인';
  },

  '블록딜': (d) => {
    const name = d['보고자'] || '';
    const type = d['거래유형'] || '';
    const shares = formatShares(d['수량']);
    const amount = formatBillion(d['금액']);
    const start = shortDate(d['거래시작일']);
    const end = shortDate(d['거래종료일']);
    const period = start && end ? `(${start}~${end})` : '';
    const parts = [name, type, shares, period].filter(Boolean);
    if (amount) parts.push(`약 ${amount}`);
    return parts.join(' ') || '블록딜 공시 확인';
  },

  '배당': (d) => {
    const perShare = d['1주당배당금'] || '';
    const yield_ = d['배당수익률'] || '';
    const baseDate = shortDate(d['배당기준일']) || d['배당기준일'] || '';
    const total = formatBillion(d['배당금총액']);
    const kind = d['배당종류'] || '';
    const parts = [];
    if (kind) parts.push(kind);
    if (perShare) parts.push(`1주당 ${perShare}`);
    if (yield_) parts.push(`수익률 ${yield_}`);
    if (total) parts.push(`총액 ${total}`);
    if (baseDate) parts.push(`(기준일 ${baseDate})`);
    return parts.join(' ') || '배당 공시 확인';
  },
};

// ── HTML_PARSE_CONFIG (하위 호환용) ─────────────────────────

const HTML_PARSE_CONFIG = {};
for (const type of Object.keys(TYPE_PARSERS)) {
  HTML_PARSE_CONFIG[type] = { parser: TYPE_PARSERS[type], formatSummary: SUMMARY_FORMATTERS[type] };
}

// ── 오케스트레이터 ──────────────────────────────────────────

async function enrichHitFromHtml(hit, onProgress = () => {}) {
  const parser = TYPE_PARSERS[hit.type];
  const formatter = SUMMARY_FORMATTERS[hit.type];
  if (!parser || !formatter) {
    onProgress(`${hit.type}: HTML 파싱 설정 없음`);
    return;
  }

  try {
    const mainUrl = `${DART_BASE}/dsaf001/main.do?rcpNo=${hit.rcept_no}`;
    onProgress(`${hit.type}: DART 페이지 로드 중...`);
    const mainHtml = await fetchDartPage(mainUrl);

    const nodes = extractTreeNodes(mainHtml);
    const initialDoc = extractInitialViewDoc(mainHtml);

    // initialDoc이 있고 노드가 없는 경우 (감사보고서 등)
    const targets = nodes.length > 0 ? nodes : (initialDoc ? [initialDoc] : []);

    if (targets.length === 0) {
      onProgress(`${hit.type}: 문서 트리 추출 실패`);
      return;
    }

    // 모든 노드를 순회하며 데이터 병합
    onProgress(`${hit.type}: 문서 내용 로드 중 (${targets.length}개 섹션)...`);
    const merged = {};

    for (const node of targets) {
      try {
        const viewerUrl = buildViewerUrl(node);
        const viewerHtml = await fetchDartPage(viewerUrl);
        const allRows = extractAllRows(viewerHtml);
        const data = parser(allRows);

        if (data) {
          // 기존에 없는 필드만 병합 (먼저 발견된 값 우선)
          for (const [k, v] of Object.entries(data)) {
            if (!merged[k]) merged[k] = v;
          }
        }
      } catch (_) { /* 다음 노드 */ }

      // rate limit (마지막 노드 제외)
      if (node !== targets[targets.length - 1]) await sleep(200);
    }

    if (Object.keys(merged).length > 0) {
      hit.summary = formatter(merged);
      hit.htmlParsed = merged;
      onProgress(`${hit.type}: HTML 파싱 완료 — ${hit.summary}`);
    } else {
      onProgress(`${hit.type}: HTML 파싱으로 데이터 추출 실패`);
    }
  } catch (err) {
    onProgress(`${hit.type}: HTML 파싱 오류 — ${err.message}`);
  }
}

module.exports = {
  enrichHitFromHtml,
  HTML_PARSE_CONFIG,
  fetchDartPage,
  extractTreeNodes,
  extractInitialViewDoc,
  buildViewerUrl,
  extractAllRows,
  TYPE_PARSERS,
  SUMMARY_FORMATTERS,
  formatBillion,
  formatShares,
};
