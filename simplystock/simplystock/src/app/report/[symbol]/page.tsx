import fs from "fs";
import path from "path";
import ReportPageClient from "@/components/stock/ReportPageClient";

function getStockList() {
  const filePath = path.join(process.cwd(), "data", "stockList.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    code: string;
    symbol: string;
    name: string;
  }[];
}

export function generateStaticParams() {
  return getStockList().map((s) => ({ symbol: s.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const stockList = getStockList();
  const stock = stockList.find((s) => s.code === symbol);
  const name = stock?.name || symbol;

  return {
    title: `${name} AI 분석 리포트 | SimplyStock`,
    description: `${name}(${symbol}) 종합 AI 분석 - 기술적 분석, 재무 분석, 수급 분석, DART 공시, 투자 체크리스트`,
    openGraph: {
      title: `${name} AI 분석 리포트 - SimplyStock`,
      description: `${name} 종합 AI 분석 리포트 - 기술/재무/수급 3축 분석`,
      type: "website",
      locale: "ko_KR",
      siteName: "SimplyStock",
    },
    alternates: {
      canonical: `https://www.simplystock.co.kr/report/${symbol}/`,
    },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <ReportPageClient symbol={symbol} />;
}
