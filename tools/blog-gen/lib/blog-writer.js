/**
 * Step 4: Anthropic API 블로그 마크다운 생성
 *
 * claude-sonnet-4-20250514 또는 claude-opus-4-6 사용.
 * 시스템 프롬프트: prompts/blog-format.txt
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── 시스템 프롬프트 로딩 ─────────────────────────────────

function loadSystemPrompt() {
  const promptPath = path.resolve(__dirname, '../prompts/blog-format.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (err) {
    console.error('blog-format.txt 로드 실패:', err.message);
    return '당신은 SimplyStock 블로그의 종목 분석 글을 작성하는 전문가입니다.';
  }
}

// ── 모델 매핑 ────────────────────────────────────────────

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-6',
};

// ── 유저 프롬프트 빌드 ───────────────────────────────────

function buildUserPrompt(data, dart, images) {
  const sections = [];

  sections.push(`종목: ${data.basic.name} (${data.basic.code})`);
  sections.push(`현재가: ${data.basic.price?.toLocaleString() || 'N/A'}원`);
  sections.push(`등락률: ${data.basic.changePct != null ? data.basic.changePct.toFixed(2) + '%' : 'N/A'}`);
  sections.push(`시장: ${data.basic.market} / ${data.basic.industry}`);

  // 차트 요약
  if (data.chart) {
    sections.push('\n## 차트 데이터');
    sections.push(`데이터 기간: ${data.chart.count}거래일`);
    if (data.chart.candles?.length) {
      const closes = data.chart.candles.map(c => c.close);
      const latest = closes[closes.length - 1];
      const recent252 = closes.slice(-252);
      const high52w = Math.max(...recent252);
      const low52w = Math.min(...recent252);
      sections.push(`52주 최고: ${high52w?.toLocaleString()}원`);
      sections.push(`52주 최저: ${low52w?.toLocaleString()}원`);
      if (high52w !== low52w) {
        sections.push(`현재가 위치: ${((latest - low52w) / (high52w - low52w) * 100).toFixed(1)}%`);
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
  if (data.valuation) {
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
  }

  // DART 공시
  if (dart) {
    sections.push('\n## DART 공시 체크 결과');
    sections.push(JSON.stringify(dart, null, 2));
  }

  // 이미지 파일 목록
  if (images?.length) {
    sections.push('\n## 이미지 파일 목록');
    images.forEach((f, i) => {
      sections.push(`이미지 ${i + 1}: ${f}`);
    });
  }

  sections.push('\n위 데이터를 기반으로 SimplyStock 블로그 종목 분석 글을 작성해주세요.');
  sections.push('포맷은 기존 블로그 스타일(작성 가이드 + 📸 마커 + 🔴 핵심문장 + 4열 양면 테이블 + 발행 체크리스트)을 따르세요.');

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
