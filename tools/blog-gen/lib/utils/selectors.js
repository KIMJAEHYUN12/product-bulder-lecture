/**
 * SimplyStock CSS 셀렉터 모음
 * - Puppeteer 스크린샷 자동화용
 * - 실제 DOM 변경 시 여기만 수정
 */

module.exports = {
  // ── 차트 탭 (일/주/월) ──
  // 텍스트 기반 클릭 (clickByText 헬퍼 사용)
  TAB_DAILY: '일',
  TAB_WEEKLY: '주',
  TAB_MONTHLY: '월',

  // ── 차트 기간 ──
  PERIOD_1M: '1M',
  PERIOD_3M: '3M',
  PERIOD_6M: '6M',
  PERIOD_1Y: '1Y',
  PERIOD_2Y: '2Y',
  PERIOD_5Y: '5Y',
  PERIOD_MAX: 'MAX',

  // ── 차트 컨테이너 ──
  // StockChartV2 전체 래퍼
  CHART_WRAPPER: 'div.w-full.rounded-none.sm\\:rounded-xl',
  CANVAS: 'canvas',

  // ── 매매동향 테이블 (PC) ──
  TRADE_TABLE_PC: 'table.min-w-\\[640px\\]',
  // 테이블 펼치기 버튼
  TRADE_TABLE_EXPAND: 'button.w-full.flex.items-center.gap-2.px-4.pt-3',
  // 일별 매매동향 모바일 펼치기
  TRADE_EXPAND_MOBILE: 'button:has-text("일별 매매동향")',

  // ── 밸류에이션 페이지 탭 ──
  VAL_TAB_FORWARD: 'Forward',
  VAL_TAB_TRAILING: 'Trailing',
  VAL_TAB_PBR: 'PBR',

  // ── SimplyStock 기본 URL ──
  BASE_URL: process.env.SIMPLYSTOCK_URL || 'https://simplystock-b3b85.web.app',
};
