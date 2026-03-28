/**
 * 종목코드 → 종목명 매핑
 * krStocks.json 기반 (ovision 프로젝트 공유)
 */

const krStocksRaw = require('../../data/krStocks.json');

let _cache = null;

function loadStocks() {
  if (_cache) return _cache;
  _cache = {};
  for (const item of krStocksRaw) {
    const code = item.s.replace(/\.(KS|KQ)$/, '');
    _cache[code] = {
      name: item.n,
      symbol: item.s,
      market: item.m === 'P' ? 'KOSPI' : item.m === 'Q' ? 'KOSDAQ' : 'ETF',
      industry: item.i || '',
    };
  }
  return _cache;
}

function getStockName(code) {
  const stocks = loadStocks();
  return stocks[code]?.name || null;
}

function getStockInfo(code) {
  const stocks = loadStocks();
  return stocks[code] || null;
}

function getYahooSymbol(code) {
  const stocks = loadStocks();
  return stocks[code]?.symbol || `${code}.KS`;
}

module.exports = { loadStocks, getStockName, getStockInfo, getYahooSymbol };
