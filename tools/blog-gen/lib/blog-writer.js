/**
 * Step 4: Anthropic API 블로그 마크다운 생성
 *
 * claude-sonnet-4-20250514 또는 claude-opus-4-6 사용.
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── 시스템 프롬프트: prompts/blog-format.txt에서 로드 ───────

function loadSystemPrompt() {
  const filePath = path.join(process.cwd(), 'prompts', 'blog-format.txt');
  return fs.readFileSync(filePath, 'utf-8');
}

// ── 모델 매핑 ────────────────────────────────────────────

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-6',
};

// ── 회귀채널 계산 (OHLCV → 채널%) ──────────────────────────

function linearRegression(ys) {
  const n = ys.length;
  if (n < 10) return null;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < n; i++) {
    const y = Math.log(ys[i]);
    sx += i; sy += y; sxy += i * y; sx2 += i * i;
  }
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;

  // 잔차 표준편차
  let sumRes2 = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    sumRes2 += (Math.log(ys[i]) - predicted) ** 2;
  }
  const stddev = Math.sqrt(sumRes2 / n);

  // 마지막 봉 기준 채널 위치
  const lastPredicted = intercept + slope * (n - 1);
  const lastActual = Math.log(ys[n - 1]);
  const upper = lastPredicted + 2 * stddev;
  const lower = lastPredicted - 2 * stddev;
  const position = ((lastActual - lower) / (upper - lower)) * 100;

  // 추세 방향
  const trend = slope > 0.0001 ? '상승' : slope < -0.0001 ? '하락' : '횡보';

  return { position: Math.round(position), trend, slope };
}

/** 일봉 → 주봉/월봉 집계 */
function aggregateCandles(candles, period) {
  const groups = {};
  for (const c of candles) {
    let key;
    if (period === 'weekly') {
      const d = new Date(c.time * 1000 || c.time);
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    } else {
      const d = new Date(c.time * 1000 || c.time);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, arr]) => ({
      close: arr[arr.length - 1].close,
      high: Math.max(...arr.map(c => c.high)),
      low: Math.min(...arr.map(c => c.low)),
    }));
}

function calcRegressionChannels(candles) {
  if (!candles?.length) return null;

  const monthly = aggregateCandles(candles, 'monthly');
  const weekly = aggregateCandles(candles, 'weekly');
  const daily = candles.slice(-120);

  const monthlyReg = linearRegression(monthly.slice(-36).map(c => c.close));
  const weeklyReg = linearRegression(weekly.slice(-52).map(c => c.close));
  const dailyReg = linearRegression(daily.map(c => c.close));

  return { monthly: monthlyReg, weekly: weeklyReg, daily: dailyReg };
}

// ── 최근 급등/급락 추출 ─────────────────────────────────────

function extractRecentMovements(candles) {
  if (!candles?.length || candles.length < 5) return [];

  const recent = candles.slice(-5);
  const movements = [];

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const changePct = ((curr.close - prev.close) / prev.close) * 100;
    // time이 초 단위 Unix timestamp인지 밀리초인지 판별
    const ts = curr.time > 1e12 ? curr.time : curr.time * 1000;
    const d = new Date(ts);
    const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

    if (Math.abs(changePct) >= 3) {
      movements.push({
        date: dateStr,
        close: curr.close,
        changePct: changePct.toFixed(2),
        volume: curr.volume,
        type: changePct > 0 ? '급등' : '급락',
      });
    }
  }

  return movements;
}

// ── 수급 날짜 포맷 (YYYYMMDD → YYYY년 M월 D일) ────────────

function formatSupplyDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr);
  if (s.length === 8) {
    const y = s.slice(0, 4);
    const m = parseInt(s.slice(4, 6), 10);
    const d = parseInt(s.slice(6, 8), 10);
    return `${y}년 ${m}월 ${d}일`;
  }
  return s;
}

// ── 유저 프롬프트 빌드 ───────────────────────────────────

function buildUserPrompt(data, dart, finance, images, businessSummary, news, competitors) {
  const sections = [];

  // 오늘 날짜
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  sections.push(`오늘 날짜: ${year}년 ${month}월 ${day}일. 제목과 본문의 모든 날짜를 이에 맞출 것. 제목 형식: (${year}.${String(month).padStart(2, '0')})`);

  sections.push(`\n종목: ${data.basic.name} (${data.basic.code})`);
  sections.push(`현재가: ${data.basic.price?.toLocaleString() || 'N/A'}원`);
  sections.push(`등락률: ${data.basic.changePct != null ? data.basic.changePct.toFixed(2) + '%' : 'N/A'}`);
  sections.push(`시장: ${data.basic.market} / ${data.basic.industry}`);

  // 차트 요약 + 회귀채널
  if (data.chart) {
    sections.push('\n## 차트 데이터');
    sections.push(`데이터 기간: ${data.chart.count}거래일`);

    if (data.chart.candles?.length) {
      const candles = data.chart.candles;
      const closes = candles.map(c => c.close);
      const latest = closes[closes.length - 1];
      const recent252 = closes.slice(-252);
      const high52w = Math.max(...recent252);
      const low52w = Math.min(...recent252);
      sections.push(`52주 최고: ${high52w?.toLocaleString()}원`);
      sections.push(`52주 최저: ${low52w?.toLocaleString()}원`);
      if (high52w !== low52w) {
        sections.push(`52주 범위 내 위치: ${((latest - low52w) / (high52w - low52w) * 100).toFixed(1)}%`);
      }

      // 회귀채널 계산
      const channels = calcRegressionChannels(candles);
      if (channels) {
        sections.push('\n### 회귀채널 분석 (2σ 밴드 기준)');
        if (channels.monthly) {
          sections.push(`월봉: ${channels.monthly.trend} 추세, 채널 ${channels.monthly.position}% 위치`);
        }
        if (channels.weekly) {
          sections.push(`주봉: ${channels.weekly.trend} 추세, 채널 ${channels.weekly.position}% 위치`);
        }
        if (channels.daily) {
          sections.push(`일봉: ${channels.daily.trend} 추세, 채널 ${channels.daily.position}% 위치`);
        }
        sections.push('→ 이 채널% 수치를 본문 "1단계 — 회귀채널"에서 반드시 사용할 것');
      }

      // 최근 급등/급락
      const movements = extractRecentMovements(candles);
      if (movements.length > 0) {
        sections.push('\n### 최근 급등/급락');
        for (const m of movements) {
          sections.push(`${m.date} ${m.type} ${m.changePct}%, 종가 ${m.close.toLocaleString()}원, 거래량 ${m.volume?.toLocaleString()}주`);
        }
        sections.push('→ 급등/급락이 있으면 글 시작 "독자 질문 훅"에 이 이벤트를 반영할 것');
      }
    }
  }

  // 수급 데이터
  if (data.supply?.summary) {
    const s = data.supply.summary;

    // 수급 데이터의 실제 날짜 범위 표시 (recentDays는 최신→오래된 순)
    const newestDate = s.recentDays?.[0]?.date;
    const oldestDate = s.recentDays?.[s.recentDays.length - 1]?.date;
    const dateRange = oldestDate && newestDate
      ? ` (${formatSupplyDate(oldestDate)} ~ ${formatSupplyDate(newestDate)})`
      : '';
    sections.push(`\n## 수급 데이터${dateRange}`);
    sections.push(`외국인 순매수: ${s.foreignNet15d?.toLocaleString()}주`);
    sections.push(`기관 순매수: ${s.institutionNet15d?.toLocaleString()}주`);
    sections.push(`개인 순매수: ${s.individualNet15d?.toLocaleString()}주`);
    sections.push(`외인 연속 ${s.foreignStreak > 0 ? '매수' : '매도'}: ${Math.abs(s.foreignStreak)}일`);

    if (s.recentDays?.length) {
      sections.push('\n### 일별 매매동향');
      sections.push('| 날짜 | 종가 | 등락률 | 외국인 | 기관 | 개인 | 외인보유율 |');
      sections.push('|------|------|--------|--------|------|------|-----------|');
      for (const d of s.recentDays) {
        sections.push(
          `| ${formatSupplyDate(d.date)} | ${d.close?.toLocaleString()} | ${d.changePct?.toFixed(2)}% | ${d.foreign?.toLocaleString()} | ${d.institution?.toLocaleString()} | ${d.individual?.toLocaleString()} | ${d.foreignRate?.toFixed(2)}% |`
        );
      }
      sections.push('→ 위 날짜를 그대로 사용할 것. 다른 날짜로 바꾸지 마라.');
    }
  }

  // 밸류에이션
  if (data.valuation && data.valuation.currentPer != null) {
    const v = data.valuation;
    sections.push('\n## 밸류에이션 데이터');
    if (v.currentPer != null) sections.push(`현재 PER: ${v.currentPer.toFixed(2)}`);
    if (v.forwardPer != null) sections.push(`Forward PER: ${v.forwardPer.toFixed(2)}`);
    if (v.avgPer != null) sections.push(`평균 PER: ${v.avgPer.toFixed(2)}`);
    if (v.perPosition != null) sections.push(`PER 밴드 위치: ${v.perPosition.toFixed(1)}%`);
    if (v.perBands) {
      sections.push(`PER 밴드: 하한 ${v.perBands.min?.toFixed(1)} ~ 상한 ${v.perBands.max?.toFixed(1)}`);
      sections.push(`PER 중앙값: ${v.perBands.median?.toFixed(1)}`);
    }
    if (v.latestEps != null) sections.push(`최근 EPS: ${v.latestEps.toLocaleString()}원`);
  } else {
    sections.push('\n## 밸류에이션 데이터');
    sections.push('⚠️ 밸류에이션 데이터 없음 — 이 종목은 PER/PBR 분석 섹션을 생략할 것. 데이터 없이 지어내지 마라.');
  }

  // 재무제표 데이터
  if (finance?.quarters?.length > 0) {
    sections.push('\n## 재무제표 데이터 (DART 전자공시)');
    sections.push(finance.summary);
    sections.push('→ 이 재무 데이터를 본문 "5단계 — 재무 분석"에서 반드시 사용할 것');
    sections.push('→ 금액은 억원 단위로 표시, 전년 동기 대비 YoY 변화율 포함');
  } else {
    sections.push('\n## 재무제표 데이터');
    sections.push('재무제표 데이터 없음 — 재무 분석 섹션을 생략할 것.');
  }

  // 사업보고서 핵심 요약 (텍스트 파싱 데이터)
  if (businessSummary) {
    sections.push('\n## 사업보고서 핵심 요약 (텍스트 데이터 — 본문에 적극 활용할 것)');

    if (businessSummary.businessOverview)
      sections.push(`사업 개요: ${businessSummary.businessOverview}`);

    if (businessSummary.salesData)
      sections.push(`매출 구조:\n${businessSummary.salesData}`);

    if (businessSummary.marketShare)
      sections.push(`시장 점유율: ${businessSummary.marketShare}`);

    if (businessSummary.keyManagement)
      sections.push(`주요 경영사항: ${businessSummary.keyManagement}`);

    if (businessSummary.dividend) {
      const d = businessSummary.dividend;
      const parts = [];
      if (d.perShare) parts.push(`1주당 ${d.perShare}`);
      if (d.yieldRate) parts.push(`시가배당률 ${d.yieldRate}`);
      if (d.totalAmount) parts.push(`총액 ${d.totalAmount}`);
      if (d.recordDate) parts.push(`기준일 ${d.recordDate}`);
      sections.push(`배당: ${parts.join(', ')}`);
      sections.push('→ 밸류에이션 섹션에서 배당 매력도를 함께 언급할 것');
    }

    sections.push('→ 위 정보를 본문에서 사업 구조 설명, 비유, 경쟁사 비교에 활용할 것');
    sections.push('→ 데이터가 있는 항목만 사용. 없는 항목은 언급하지 마라.');
  }

  // 최근 뉴스
  if (news?.articles?.length > 0) {
    sections.push('\n## 최근 뉴스 (네이버 검색)');
    for (const a of news.articles) {
      sections.push(`- [${a.pubDate}] ${a.title}`);
      if (a.description) sections.push(`  ${a.description.slice(0, 100)}`);
    }
    sections.push('→ 최근 뉴스 동향을 글 도입부 "독자 질문 훅"이나 "공시/리스크" 섹션에 반영할 것');
    sections.push('→ 뉴스 내용을 그대로 복사하지 말고, 핵심만 요약해서 분석에 녹여라');
  }

  // 경쟁사 비교 데이터
  if (competitors?.competitors?.length > 0) {
    sections.push('\n## 경쟁사 비교 데이터');
    sections.push('| 종목명 | 현재가 | 시가총액 | PER | Forward PER | PBR |');
    sections.push('|--------|--------|----------|-----|-------------|-----|');
    for (const c of competitors.competitors) {
      sections.push(
        `| ${c.name} | ${c.price?.toLocaleString() || 'N/A'} | ${c.marketCap || 'N/A'} | ${c.per ?? 'N/A'} | ${c.forwardPer ?? 'N/A'} | ${c.pbr ?? 'N/A'} |`
      );
    }
    sections.push('→ 밸류에이션 섹션에서 경쟁사 대비 고평가/저평가 여부를 비교 분석할 것');
    sections.push('→ "동종 업계 평균 PER 대비 ~" 형태로 자연스럽게 녹여라');
  }

  // DART 공시 — summary가 있는 히트 + 배당은 summary null이어도 포함
  const validHits = dart?.hits?.filter(h => h.summary || h.type === '배당') || [];
  if (validHits.length > 0) {
    sections.push('\n## DART 공시 — 히트 항목 (반드시 본문에 반영할 것)');
    for (const hit of validHits) {
      sections.push(`\n### [${hit.type}] ${hit.report_nm} (${hit.rcept_dt})`);
      sections.push(`URL: ${hit.url}`);
      if (hit.summary) {
        sections.push(`상세 데이터:\n${hit.summary}`);
      } else if (hit.type === '배당') {
        sections.push(`상세 데이터:\n[배당] ${hit.report_nm} (${hit.rcept_dt}) — 상세 수치는 확인 불가, 배당 공시 존재. 공시/리스크 섹션에서 배당 정책 간략히 언급할 것.`);
      }
      sections.push(`→ 이 공시를 본문 "5단계 — 공시/리스크"에서 긍정/부정 양면 해석할 것`);
    }
    if (dart.clean?.length > 0) {
      sections.push(`\n클린 항목 (특이사항 없음): ${dart.clean.join(', ')}`);
    }
  } else if (dart) {
    sections.push('\n## DART 공시 체크 결과');
    sections.push('히트 없음 — 모든 항목 클린. 공시/리스크 섹션 간략하게 "특이사항 없음" 처리.');
    if (dart.clean?.length > 0) {
      sections.push(`클린 항목: ${dart.clean.join(', ')}`);
    }
    if (dart.error) {
      sections.push(`참고: ${dart.error}`);
    }
  }

  // 이미지 파일 목록
  const allImages = images || [];
  if (allImages.length) {
    sections.push('\n## 이미지 파일 목록');
    allImages.forEach((f, i) => {
      sections.push(`이미지 ${i + 1}: ${f}`);
    });

    // DART 캡처 이미지 배치 안내
    const dartImages = allImages.filter(f => f.includes('dart/'));
    if (dartImages.length > 0) {
      sections.push('\n### DART 캡처 이미지 배치 안내');
      sections.push('아래 DART 이미지를 본문의 해당 분석 섹션에 📸 마커로 반드시 삽입할 것:');
      for (const f of dartImages) {
        const fname = f.split('/').pop();
        if (fname.includes('매출실적')) {
          sections.push(`📸 여기에 이미지 삽입: ${f} → "매출실적" 또는 "실적 분석" 섹션에 삽입`);
        } else if (fname.includes('재무상태표')) {
          sections.push(`📸 여기에 이미지 삽입: ${f} → "재무상태표" 또는 "재무 건전성" 섹션에 삽입`);
        } else if (fname.includes('포괄손익') || fname.includes('손익계산서')) {
          sections.push(`📸 여기에 이미지 삽입: ${f} → "손익계산서" 또는 "수익성 분석" 섹션에 삽입`);
        } else if (fname.includes('audit') || fname.includes('감사')) {
          sections.push(`📸 여기에 이미지 삽입: ${f} → "감사의견" 또는 "공시/리스크" 섹션에 삽입`);
        } else {
          sections.push(`📸 여기에 이미지 삽입: ${f} → "공시/리스크" 섹션에 삽입`);
        }
      }
      sections.push('⚠️ 위 DART 이미지가 있으면 반드시 본문에 📸 마커를 넣어라. 빠뜨리지 마라.');
    }
  }

  sections.push('\n---');
  sections.push('위 데이터를 기반으로 SimplyStock 블로그 종목 분석 글을 작성해주세요.');
  sections.push('⚠️ 중요: 위에 제공된 데이터만 사용할 것. 데이터에 없는 수치를 지어내지 마라.');
  sections.push('⚠️ 밸류에이션 데이터가 "없음"이면 PER/PBR 분석 섹션을 완전히 생략하라.');
  sections.push('⚠️ DART 히트 항목이 있으면 반드시 본문 "공시/리스크" 섹션에서 다뤄라.');
  sections.push('포맷은 시스템 프롬프트의 "글 구조 상세"를 따르세요.');

  return sections.join('\n');
}

// ── 메인 생성 함수 ───────────────────────────────────────

/**
 * 블로그 마크다운 생성
 * @param {object} data - fetchStockData 결과
 * @param {object} dart - checkDisclosures 결과
 * @param {object|null} finance - fetchFinanceData 결과
 * @param {string[]} images - 이미지 파일 목록
 * @param {object|null} businessSummary - parseBusinessSummary 결과
 * @param {object|null} news - fetchRecentNews 결과
 * @param {object|null} competitors - fetchCompetitorData 결과
 * @param {object} opts - { mode, review, onProgress }
 * @returns {Promise<string>} 마크다운 텍스트
 */
async function generateBlog(data, dart, finance, images, businessSummary, news, competitors, opts = {}) {
  const { mode = 'sonnet', review = true, onProgress = () => {} } = opts;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');

  const model = MODEL_MAP[mode] || MODEL_MAP.sonnet;
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(data, dart, finance, images, businessSummary, news, competitors);

  console.log('=== blog-writer userPrompt ===');
  console.log(userPrompt);
  console.log('=== end userPrompt ===');

  onProgress(`${mode} 모델로 글 생성 중 (1차)...`);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let text = response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');

  // ── 2차 자동 검수 (review=true일 때, 항상 sonnet 사용) ──
  if (review) {
    onProgress('2차 검수 중 (Sonnet)...');
    try {
      const reviewPrompt = `아래는 SimplyStock 블로그 종목 분석 글 초안입니다.

다음 체크리스트를 기준으로 검수하고, 문제가 있으면 직접 수정한 최종본을 출력하세요.
문제가 없으면 초안을 그대로 출력하세요.

## 검수 체크리스트
1. **날짜 정확성**: 제목·본문의 날짜가 오늘(${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일)과 일치하는가?
2. **수치 일치**: 본문의 PER, 주가, 수급 수치가 위 데이터와 일치하는가?
3. **이미지 마커**: 제공된 이미지 파일에 대해 📸 마커가 빠짐없이 들어갔는가?
4. **DART 공시**: 히트 항목이 본문 "공시/리스크" 섹션에 반영되었는가?
5. **환각 체크**: 데이터에 없는 수치나 사실을 지어낸 부분이 없는가?
6. **톤 일관성**: 구어체("~거예요", "~잖아요")가 유지되고, 투자 권유 어투("~하세요")가 없는가?
7. **구조 완결**: 도입 훅 → 5단계 분석 → 체크리스트 테이블 → 면책 구조가 완전한가?

## 원본 데이터 요약
종목: ${data.basic.name} (${data.basic.code})
현재가: ${data.basic.price?.toLocaleString() || 'N/A'}원

## 초안
${text}

위 체크리스트를 적용한 최종본만 출력하세요. 설명이나 코멘트 없이 마크다운 글 본문만 출력.`;

      const reviewResponse = await client.messages.create({
        model: MODEL_MAP.sonnet,
        max_tokens: 8000,
        messages: [{ role: 'user', content: reviewPrompt }],
      });

      const reviewedText = reviewResponse.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');

      if (reviewedText.length > text.length * 0.5) {
        text = reviewedText;
        onProgress('2차 검수 완료 — 최종본 반영');
      } else {
        onProgress('2차 검수 결과가 너무 짧음 — 1차 초안 유지');
      }
    } catch (reviewErr) {
      onProgress(`2차 검수 실패 (1차 초안 유지): ${reviewErr.message}`);
    }
  }

  onProgress('글 생성 완료');
  return text;
}

module.exports = { generateBlog, buildUserPrompt, MODEL_MAP };
