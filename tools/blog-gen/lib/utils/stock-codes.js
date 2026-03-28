/**
 * 종목코드 → 종목명 매핑
 * krStocks.json 기반 (ovision 프로젝트 공유)
 */

const path = require('path');
const fs = require('fs');

let _cache = null;

function loadStocks() {
  if (_cache) return _cache;

  const filePath = path.resolve(__dirname, '../../../../data/krStocks.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const arr = JSON.parse(raw);
    // { "008770": { name: "호텔신라", symbol: "008770.KS", market: "P", industry: "..." } }
    _cache = {};
    for (const item of arr) {
      const code = item.s.replace(/\.(KS|KQ)$/, '');
      _cache[code] = {
        name: item.n,
        symbol: item.s,
        market: item.m === 'P' ? 'KOSPI' : item.m === 'Q' ? 'KOSDAQ' : 'ETF',
        industry: item.i || '',
      };
    }
    return _cache;
  } catch (err) {
    console.error('krStocks.json 로드 실패:', err.message);
    return {};
  }
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
