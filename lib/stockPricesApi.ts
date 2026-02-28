const FIREBASE_HOST = "https://mylen-24263782-5d205.web.app";
const API_URL =
  process.env.NEXT_PUBLIC_STOCK_PRICES_API_URL ||
  `${FIREBASE_HOST}/api/stock-prices`;

export interface StockPrice {
  price: number;
  changePct: number;
  name: string;
  currency: string;
}

export async function fetchStockPrices(
  symbols: string[]
): Promise<Record<string, StockPrice>> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error(`stock-prices API error: ${res.status}`);
  return res.json();
}
