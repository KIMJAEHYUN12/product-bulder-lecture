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
  const filePath = path.join(__dirname, '..', 'prompts', 'blog-format.txt');
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
    const d = new Date(curr.time * 1000 || curr.time);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

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

// ── 유저 프롬프트 빌드 ───────────────────────────────────

function buildUserPrompt(data, dart, images) {
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
    sections.push('\n## 수급 데이터 (최근 15거래일)');
    sections.push(`외국인 순매수: ${s.foreignNet15d?.toLocaleString()}주`);
    sections.push(`기관 순매수: ${s.institutionNet15d?.toLocaleString()}주`);
    sections.push(`개인 순매수: ${s.individualNet15d?.toLocaleString()}주`);
    sections.push(`외인 연속 ${s.foreignStreak > 0 ? '매수' : '매도'}: ${Math.abs(s.foreignStreak)}일`);

    if (s.recentDays?.length) {
      sections.push('\n### 일별 매매동향 (최근 15일)');
      sections.push('| 날짜 | 종가 | 등락률 | 외국인 | 기관 | 개인 | 외인보유율 |');
      sections.push('|------|------|--------|--------|------|------|-----------|');
      for (const d of s.recentDays) {
        sections.push(
          `| ${d.date} | ${d.close?.toLocaleString()} | ${d.changePct?.toFixed(2)}% | ${d.foreign?.toLocaleString()} | ${d.institution?.toLocaleString()} | ${d.individual?.toLocaleString()} | ${d.foreignRate?.toFixed(2)}% |`
        );
      }
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

  // DART 공시
  if (dart && dart.hits?.length > 0) {
    sections.push('\n## DART 공시 — 히트 항목 (반드시 본문에 반영할 것)');
    for (const hit of dart.hits) {
      sections.push(`\n### [${hit.type}] ${hit.report_nm} (${hit.rcept_dt})`);
      sections.push(`URL: ${hit.url}`);
      if (hit.summary) {
        sections.push(`상세 데이터:\n${hit.summary}`);
      } else {
        sections.push('상세 데이터: 구조화 API 조회 불가 — 공시 제목과 날짜만 참고하여 작성');
      }
      sections.push(`→ 이 공시를 본문 "4단계 — 공시/리스크"에서 긍정/부정 양면 해석할 것`);
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
  if (images?.length) {
    sections.push('\n## 이미지 파일 목록');
    images.forEach((f, i) => {
      sections.push(`이미지 ${i + 1}: ${f}`);
    });
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
 * @param {string[]} images - 이미지 파일 목록
 * @param {'sonnet'|'opus'} mode - 모델 선택
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<string>} 마크다운 텍스트
 */
async function generateBlog(data, dart, images, mode = 'sonnet', onProgress = () => {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');

  const model = MODEL_MAP[mode] || MODEL_MAP.sonnet;
  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildUserPrompt(data, dart, images);

  console.log('=== blog-writer userPrompt ===');
  console.log(userPrompt);
  console.log('=== end userPrompt ===');

  onProgress(`${mode} 모델로 글 생성 중...`);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');

  onProgress('글 생성 완료');
  return text;
}

module.exports = { generateBlog, buildUserPrompt, MODEL_MAP };
