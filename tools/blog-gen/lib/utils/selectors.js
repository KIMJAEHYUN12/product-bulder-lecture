/**
 * SimplyStock CSS 셀렉터 모음
 * - Puppeteer 스크린샷 자동화용
 * - 실제 DOM 변경 시 여기만 수정
 */

module.exports = {
  // ── 종목 페이지 URL 패턴 ──
  // 메인페이지에서 종목검색 결과: /?ticker=005930.KS
  BASE_URL: process.env.SIMPLYSTOCK_URL || 'https://www.simplystock.co.kr',

  // ── 차트 봉 타입 (버튼 텍스트, 1글자) ──
  TAB_DAILY: '일',
  TAB_WEEKLY: '주',
  TAB_MONTHLY: '월',

  // ── 차트 기간 (버튼 텍스트) ──
  PERIOD_1M: '1M',
  PERIOD_3M: '3M',
  PERIOD_6M: '6M',
  PERIOD_1Y: '1Y',
  PERIOD_2Y: '2Y',
  PERIOD_5Y: '5Y',
  PERIOD_MAX: 'MAX',

  // ── 수급 차트 모드 탭 (InvestorFlowChartV2) ──
  SUPPLY_TAB_BAR: '합산',
  SUPPLY_TAB_LINE: '주체별',

  // ── 차트 전체 컨테이너 (캡처 영역) ──
  // StockChartV2 최외곽: rounded-none sm:rounded-xl + border
  CHART_CONTAINER: 'div.w-full.rounded-none',
  CANVAS: 'canvas',

  // ── 수급 차트 컨테이너 ──
  // InvestorFlowChartV2 최외곽: mx-2 sm:mx-4 mt-2 mb-1 rounded-lg border
  SUPPLY_CONTAINER: 'div.rounded-lg.border',

  // ── 매매동향 테이블 (PC, md 이상) ──
  // PC 펼치기 버튼: "일별 매매동향" 텍스트
  TRADE_TABLE_TOGGLE: '일별 매매동향',
  TRADE_TABLE_PC: 'table.min-w-\\[640px\\]',

  // ── 밸류에이션 페이지 탭 ──
  // 버튼 안에 span 2개: "Forward PER" + "미래실적 기준"
  VAL_TAB_FORWARD: 'Forward PER',
  VAL_TAB_TRAILING: 'Trailing PER',
  VAL_TAB_PBR: 'PBR',

  // ── 밸류에이션 URL 패턴 ──
  VAL_URL: '/valuation/?ticker=',
};
