/**
 * Step 4: Anthropic API 블로그 마크다운 생성
 *
 * claude-sonnet-4-20250514 또는 claude-opus-4-6 사용.
 */

const Anthropic = require('@anthropic-ai/sdk');

// ── 시스템 프롬프트 (인라인) ──────────────────────────────

const SYSTEM_PROMPT = `당신은 SimplyStock 블로그의 종목 분석 글을 작성하는 전문가입니다.

## 글쓰기 규칙
1. 독자 질문 훅으로 시작 ("OO이 XX했는데, 지금 들어가도 되나요?")
2. 일상 비유로 개념 설명 (건물, 택시, 가게 등)
3. 단계별 분석: 회귀채널(월→주→일) → 수급 → 밸류에이션 → 공시/리스크
4. 🔴 핵심문장 6~8개 (네이버 에디터에서 빨간색 하이라이트용)
5. 📸 이미지 마커 (제공된 이미지 파일명과 매칭)
6. 4열 양면 체크리스트 테이블 (지표 | 데이터 | 긍정적 해석 | 부정적 해석)
7. ✏️ 작성 가이드 섹션 (블로그 미포함 안내, 이미지 매핑, 발행 체크리스트)
8. 투자 면책 문구
9. SimplyStock CTA (자연스럽게)

## 수급 해석 주의
- "스마트머니 유입"처럼 과대해석하지 말 것
- 공시 이벤트 직후의 외인/기관 매수는 이벤트 반응일 가능성을 명시할 것
- 누적 수급 추세와 최근 단기 수급을 분리해서 해석할 것

## DART 공시 반영
- hits 배열에 있는 공시만 본문에 반영
- clean 배열에 있는 항목은 작성 가이드에 "확인 완료 — 특이사항 없음" 기록
- 공시는 반드시 긍정/부정 양면 해석

## 톤
- 친근한 구어체 ("~거예요", "~잖아요", "~거든요")
- 전문 용어는 나올 때마다 쉽게 풀어쓰기
- 광고 느낌 없이 자연스럽게 SimplyStock 연결

## 📸 이미지 마커 형식
이미지를 삽입할 위치에 아래 형식으로 마커를 넣으세요:

📸 [이미지 설명] → 파일명: images/01_월봉_회귀채널.png

## 🔴 핵심문장 형식
네이버 에디터에서 빨간색 하이라이트할 문장:

🔴 이 문장은 빨간색으로 강조됩니다.

## 4열 양면 체크리스트 테이블
| 지표 | 데이터 | 긍정적 해석 | 부정적 해석 |
|------|--------|------------|------------|
| 월봉 추세 | 상승 채널 72% | 장기 상승 추세 유지 | 채널 상단 접근으로 단기 과열 가능 |

## ✏️ 작성 가이드 섹션 (블로그에 미포함)
이 섹션은 블로그 발행 시 삭제하세요. 작성자 참고용입니다.

### 이미지 매핑
| 순서 | 마커 | 파일명 | 설명 |
|------|------|--------|------|
| 1 | 📸 월봉 | images/01_월봉_회귀채널.png | 월봉 회귀채널 차트 |
| ... | ... | ... | ... |

### DART 공시 체크 결과
- ✅ 블록딜: 확인 완료 — 특이사항 없음
- 🔴 자기주식: 히트 — 본문 반영 완료

### 발행 체크리스트
- [ ] 제목 30자 이내
- [ ] 대표 이미지 설정
- [ ] 태그 5개 이상
- [ ] 맞춤법 검사
- [ ] 투자 면책 문구 확인
- [ ] SimplyStock 링크 동작 확인

## 투자 면책 문구 (반드시 포함)
"본 글은 투자 권유가 아닌 정보 제공 목적으로 작성되었습니다. 투자 판단과 그에 따른 결과는 투자자 본인의 책임입니다."`;

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
  const userPrompt = buildUserPrompt(data, dart, images);

  onProgress(`${mode} 모델로 글 생성 중...`);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
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
