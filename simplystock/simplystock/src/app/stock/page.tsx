import fs from "fs";
import path from "path";
import Link from "next/link";
import { TrendingUp, ArrowLeft } from "lucide-react";

interface StockSEOData {
  code: string;
  name: string;
  market: string;
  sector: string;
  price: number;
  changeRate: number | null;
  per: number | null;
  perPosition: number | null;
}

interface StockListItem {
  code: string;
  symbol: string;
  name: string;
  market: string;
  sector: string;
}

function getStockList(): StockListItem[] {
  const filePath = path.join(process.cwd(), "data", "stockList.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getStockData(code: string): StockSEOData | null {
  try {
    const filePath = path.join(process.cwd(), "data", "stocks", `${code}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export const metadata = {
  title: "종목 분석 목록 | SimplyStock",
  description:
    "SimplyStock에서 제공하는 주요 종목의 회귀채널·PER밴드 분석 목록입니다. KOSPI·KOSDAQ 주요 50개 종목을 확인하세요.",
};

export default function StockListPage() {
  const stockList = getStockList();
  const kospi = stockList.filter((s) => s.market === "KOSPI");
  const kosdaq = stockList.filter((s) => s.market === "KOSDAQ");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-primary)] px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">홈</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <span className="text-base font-semibold tracking-tight">
              SimplyStock
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-lg font-bold mb-1">종목 분석</h1>
        <p className="text-xs text-[var(--text-faint)] mb-6">
          주요 종목의 회귀채널·PER밴드 분석을 확인하세요
        </p>

        <StockSection title="KOSPI" stocks={kospi} />
        <StockSection title="KOSDAQ" stocks={kosdaq} />

        <footer className="mt-8 border-t border-[var(--border-secondary)] pt-4">
          <p className="text-[10px] leading-relaxed text-[var(--text-faint)]">
            본 서비스는 투자 참고용 데이터 분석 도구이며, 특정 종목의 매수·매도를
            권유하지 않습니다. 모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </footer>
      </main>
    </div>
  );
}

function StockSection({
  title,
  stocks,
}: {
  title: string;
  stocks: StockListItem[];
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-medium text-[var(--text-faint)] mb-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {stocks.map((stock) => {
          const data = getStockData(stock.code);
          return (
            <Link
              key={stock.code}
              href={`/stock/${stock.code}/`}
              className="flex items-center justify-between rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-overlay)] px-3 py-2.5 transition-colors hover:border-[var(--border-primary)] hover:bg-[var(--bg-card)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {stock.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-faint)]">
                    {stock.code}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-faint)]">
                  {stock.sector}
                </span>
              </div>
              {data && (
                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm font-medium">
                    {data.price.toLocaleString("ko-KR")}
                  </div>
                  {data.changeRate !== null && (
                    <div
                      className={`text-[11px] font-medium ${
                        data.changeRate > 0
                          ? "text-red-400"
                          : data.changeRate < 0
                            ? "text-blue-400"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {data.changeRate > 0 ? "+" : ""}
                      {data.changeRate.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
