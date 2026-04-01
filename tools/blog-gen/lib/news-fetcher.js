/**
 * 네이버 뉴스 검색 API 연동
 *
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * API 키 없거나 실패 시 null 반환.
 */

const NAVER_SEARCH_URL = 'https://openapi.naver.com/v1/search/news.json';

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/**
 * 종목명으로 최근 뉴스 5건 검색
 * @param {string} stockName - 종목명 (예: "삼성전자")
 * @param {(msg: string) => void} onProgress
 * @returns {Promise<{articles: Array, summary: string}|null>}
 */
async function fetchRecentNews(stockName, onProgress = () => {}) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    onProgress('네이버 뉴스 API 키 없음 (스킵)');
    return null;
  }

  try {
    onProgress(`"${stockName}" 뉴스 검색 중...`);

    const params = new URLSearchParams({
      query: stockName,
      display: '5',
      sort: 'date',
    });

    const res = await fetch(`${NAVER_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!res.ok) {
      onProgress(`네이버 뉴스 API 오류: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      onProgress('관련 뉴스 없음');
      return null;
    }

    const articles = items.map((item) => ({
      title: stripHtml(item.title),
      description: stripHtml(item.description),
      pubDate: new Date(item.pubDate).toLocaleDateString('ko-KR'),
      link: item.originallink || item.link,
    }));

    const summary = `최근 뉴스 요약: ${articles.map((a, i) => `${i + 1}) ${a.title}`).join(' ')}`;

    onProgress(`뉴스 ${articles.length}건 검색 완료`);
    return { articles, summary };
  } catch (err) {
    onProgress(`뉴스 검색 실패: ${err.message}`);
    return null;
  }
}

module.exports = { fetchRecentNews };
