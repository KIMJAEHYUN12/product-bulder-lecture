import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: '6자리 종목코드가 필요합니다' }, { status: 400 });
  }

  try {
    const projectRoot = path.resolve(process.cwd());
    const { getStockInfo } = require(path.join(projectRoot, 'lib/utils/stock-codes'));
    const info = getStockInfo(code);

    if (!info) {
      return NextResponse.json({ error: '종목을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({
      code,
      name: info.name,
      symbol: info.symbol,
      market: info.market,
      industry: info.industry,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
