import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ALL_COMMODITIES, getCommodityBySlug } from "@/data/commodities";
import { CommodityDetail } from "@/components/commodity/CommodityDetail";

export function generateStaticParams() {
  return ALL_COMMODITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const commodity = getCommodityBySlug(slug);
  if (!commodity) return { title: "원자재 시세 | SimplyStock" };

  return {
    title: `${commodity.name}(${commodity.nameEn}) 시세 · 투자 가이드 | SimplyStock`,
    description: commodity.description.slice(0, 155),
    keywords: [
      `${commodity.name} 시세`,
      `${commodity.nameEn} price`,
      `${commodity.name} 투자`,
      commodity.exchange,
      commodity.symbol,
    ],
  };
}

export default async function CommodityPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const commodity = getCommodityBySlug(slug);
  if (!commodity) notFound();

  const toc = [
    { id: "overview", label: "개요" },
    { id: "price-drivers", label: "가격 변동 요인" },
    { id: "investment", label: "투자 방법" },
    { id: "related-etf", label: "관련 ETF" },
    { id: "risk", label: "리스크 요인" },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-8 sm:py-12">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/commodities/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-400 transition-all hover:bg-indigo-500/25 mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            원자재 시세
          </Link>
          <h1 className="text-xl sm:text-2xl font-black mb-1">
            {commodity.name} ({commodity.nameEn})
          </h1>
          <p className="text-sm text-gray-500">
            {commodity.exchange} · {commodity.symbol} · {commodity.unit}
          </p>
        </div>

        {/* 목차 */}
        <nav className="mb-8 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-gray-400">목차</p>
          <ol className="space-y-1.5">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-baseline gap-2 text-sm text-gray-400 transition-colors hover:text-indigo-400"
                >
                  <span className="w-4 shrink-0 text-[10px] font-mono text-gray-600">{i + 1}.</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 본문 */}
        <CommodityDetail commodity={commodity} />

        {/* 면책 */}
        <div className="mt-10 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4 text-center">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            본 페이지는 {commodity.name} 시세 정보와 투자 가이드를 제공하며,
            특정 상품의 매수·매도를 권유하지 않습니다.
            모든 투자 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-4">
          <Link href="/commodities/" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">
            &larr; 원자재 시세 목록
          </Link>
          <Link href="/" className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
