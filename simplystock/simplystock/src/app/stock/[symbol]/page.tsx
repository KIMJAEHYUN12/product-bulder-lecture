import fs from "fs";
import path from "path";
import Link from "next/link";
import { TrendingUp, BarChart3, Users, ArrowLeft, ExternalLink, Brain } from "lucide-react";
import {
  getChannelComment,
  getChannelLabel,
  getPerComment,
  getSupplyComment,
  formatKrw,
  formatNetVolume,
} from "@/lib/seoText";

interface StockSEOData {
  code: string;
  name: string;
  market: string;
  sector: string;
  price: number;
  changeRate: number | null;
  channelPct: number | null;
  per: number | null;
  forwardPer: number | null;
  avgPer: number | null;
  perPosition: number | null;
  foreignNet: number | null;
  instNet: number | null;
  goldenCross: { crossType: string; crossDate: string } | null;
  updatedAt: string;
}

function getStockList() {
  const filePath = path.join(process.cwd(), "data", "stockList.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    code: string;
    symbol: string;
    name: string;
    market: string;
    sector: string;
  }[];
}

function getStockData(symbol: string): StockSEOData | null {
  try {
    const filePath = path.join(process.cwd(), "data", "stocks", `${symbol}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
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
  const data = getStockData(symbol);
  if (!data) {
    return { title: "종목 분석 | SimplyStock" };
  }

  const channelLabel = getChannelLabel(data.channelPct);
  const priceStr = data.price.toLocaleString("ko-KR");
  const perStr = data.per !== null ? `PER ${data.per}배` : "";
  const posStr =
    data.perPosition !== null ? `(밴드 ${data.perPosition}%)` : "";

  return {
    title: `${data.name}(${data.code}) 주가 채널·PER 분석 | SimplyStock`,
    description: `${data.name} 현재가 ${priceStr}원, 채널 ${channelLabel}, ${perStr}${posStr}. 회귀채널과 PER밴드 기반 데이터 분석 - SimplyStock`,
    openGraph: {
      title: `${data.name} 주가 분석 - SimplyStock`,
      description: `${data.name} ${priceStr}원 · ${perStr} · 채널 ${channelLabel}`,
      type: "website",
      locale: "ko_KR",
      siteName: "SimplyStock",
    },
    alternates: {
      canonical: `https://www.simplystock.co.kr/stock/${data.code}/`,
    },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const data = getStockData(symbol);

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-[var(--text-muted)]">데이터 준비 중입니다.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-indigo-400 hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const stockInfo = getStockList().find((s) => s.code === symbol);
  const apiSymbol = stockInfo?.symbol || `${symbol}.KS`;

  const changeColor =
    data.changeRate === null
      ? "text-[var(--text-muted)]"
      : data.changeRate > 0
        ? "text-red-400"
        : data.changeRate < 0
          ? "text-blue-400"
          : "text-[var(--text-muted)]";

  const channelComment = getChannelComment(data.channelPct);
  const perComment = getPerComment(data.per, data.avgPer, data.perPosition);
  const supplyComment = getSupplyComment(data.foreignNet, data.instNet);

  const updatedDate = data.updatedAt
    ? new Date(data.updatedAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${data.name} 주가 분석`,
    description: `${data.name} 회귀채널·PER밴드 기반 주식 분석`,
    dateModified: data.updatedAt?.split("T")[0],
    about: {
      "@type": "FinancialProduct",
      name: data.name,
      tickerSymbol: data.code,
      exchange: "KRX",
    },
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* 종목 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-[var(--text-faint)] mb-1">
            <span>{data.market}</span>
            <span>·</span>
            <span>{data.sector}</span>
          </div>
          <h1 className="text-2xl font-bold">
            {data.name}{" "}
            <span className="text-base font-normal text-[var(--text-muted)]">
              {data.code}
            </span>
          </h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatKrw(data.price)}</span>
            {data.changeRate !== null && (
              <span className={`text-lg font-medium ${changeColor}`}>
                {data.changeRate > 0 ? "+" : ""}
                {data.changeRate.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* 분석 섹션들 */}
        <div className="space-y-4">
          {/* 회귀채널 분석 */}
          <section className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                <BarChart3 className="h-4 w-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-semibold">회귀채널 분석</h2>
            </div>

            {data.channelPct !== null ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    채널 위치
                  </span>
                  <span className="text-sm font-medium">
                    {getChannelLabel(data.channelPct)}{data.channelPct !== null && data.channelPct > -50 && data.channelPct < 100 ? ` (${data.channelPct}%)` : ""}
                  </span>
                </div>
                <div className="mb-3 h-2 rounded-full bg-[var(--bg-secondary)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-gray-400 to-red-500"
                    style={{
                      width: `${Math.max(2, Math.min(100, (data.channelPct + 50) / 1.5))}%`,
                    }}
                  />
                </div>
                {channelComment && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {channelComment}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">
                현재 채널 스캔 대상에 포함되지 않았습니다. 직접 차트 분석에서
                확인해보세요.
              </p>
            )}

            {data.goldenCross && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    data.goldenCross.crossType === "5_20"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-orange-500/20 text-orange-300"
                  }`}
                >
                  {data.goldenCross.crossType === "5_20"
                    ? "5/20 골든크로스"
                    : "20/60 골든크로스"}
                </span>
                <span className="text-xs text-[var(--text-faint)]">
                  {data.goldenCross.crossDate.slice(4, 6).replace(/^0/, "")}/
                  {data.goldenCross.crossDate.slice(6, 8)} 교차
                </span>
              </div>
            )}
          </section>

          {/* 밸류에이션 */}
          <section className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold">밸류에이션</h2>
            </div>

            {data.per !== null ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <div className="text-xs text-[var(--text-faint)]">
                      현재 PER
                    </div>
                    <div className="mt-1 text-lg font-bold">{data.per}배</div>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <div className="text-xs text-[var(--text-faint)]">
                      평균 PER
                    </div>
                    <div className="mt-1 text-lg font-bold">
                      {data.avgPer ?? "-"}배
                    </div>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-3 text-center">
                    <div className="text-xs text-[var(--text-faint)]">
                      밴드 위치
                    </div>
                    <div className="mt-1 text-lg font-bold">
                      {data.perPosition ?? "-"}%
                    </div>
                  </div>
                </div>

                {data.forwardPer !== null && (
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Forward PER
                    </span>
                    <span className="font-medium">{data.forwardPer}배</span>
                  </div>
                )}

                {perComment && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {perComment}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">
                이 종목의 PER 밴드 데이터가 아직 준비되지 않았습니다.
              </p>
            )}
          </section>

          {/* 수급 동향 */}
          <section className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <h2 className="text-sm font-semibold">수급 동향 (최근 30일)</h2>
            </div>

            {data.foreignNet !== null || data.instNet !== null ? (
              <>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">외국인</span>
                    <span
                      className={`font-medium ${
                        (data.foreignNet ?? 0) > 0
                          ? "text-red-400"
                          : (data.foreignNet ?? 0) < 0
                            ? "text-blue-400"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {formatNetVolume(data.foreignNet)}주
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">기관</span>
                    <span
                      className={`font-medium ${
                        (data.instNet ?? 0) > 0
                          ? "text-red-400"
                          : (data.instNet ?? 0) < 0
                            ? "text-blue-400"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {formatNetVolume(data.instNet)}주
                    </span>
                  </div>
                </div>

                {supplyComment && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {supplyComment}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-faint)]">
                수급 데이터를 불러올 수 없습니다.
              </p>
            )}
          </section>

          {/* AI 리포트 CTA */}
          <Link
            href={`/report/${symbol}/`}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3.5 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/20"
          >
            <Brain className="h-4 w-4" />
            AI 종합 분석 리포트 보기
          </Link>

          {/* 포트폴리오 건강검진 CTA */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.08] p-4">
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
              이 종목이 포함된 포트폴리오, AI로 진단해보세요
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              보유 종목 전체를 한번에 분석합니다
            </p>
            <Link
              href="/portfolio?ref=stock_detail"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
            >
              건강검진 시작
              <span>&rarr;</span>
            </Link>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/?ticker=${apiSymbol}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
            >
              <BarChart3 className="h-4 w-4" />
              차트 분석
            </Link>
            <Link
              href={`/valuation/?ticker=${symbol}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <TrendingUp className="h-4 w-4" />
              PER 밴드
            </Link>
            <Link
              href="/backtest/"
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)]"
            >
              백테스트
            </Link>
            <Link
              href="/mock/"
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-overlay)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)]"
            >
              모의투자
            </Link>
          </div>

          {/* 관련 가이드 (내부 링크) */}
          <section className="rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-overlay)] p-4">
            <h3 className="mb-3 text-xs font-medium text-[var(--text-muted)]">
              관련 가이드
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/guide/regression-channel/"
                  className="flex items-center justify-between text-sm text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                >
                  <span>7선 회귀채널 분석이란?</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                </Link>
              </li>
              <li>
                <Link
                  href="/guide/trading-trend/"
                  className="flex items-center justify-between text-sm text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                >
                  <span>수급 분석 활용법</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                </Link>
              </li>
              <li>
                <Link
                  href="/guide/valuation/"
                  className="flex items-center justify-between text-sm text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                >
                  <span>PER 밴드로 적정가 판단하기</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                </Link>
              </li>
              <li>
                <Link
                  href="/guide/supply-scan/"
                  className="flex items-center justify-between text-sm text-[var(--text-secondary)] hover:text-indigo-400 transition-colors"
                >
                  <span>수급 반전 스캔 사용법</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-faint)]" />
                </Link>
              </li>
            </ul>
          </section>
        </div>

        {/* 면책 고지 */}
        <footer className="mt-8 border-t border-[var(--border-secondary)] pt-4">
          <p className="text-[10px] leading-relaxed text-[var(--text-faint)]">
            본 페이지의 데이터는 투자 참고용이며, 특정 종목의 매수·매도를
            권유하지 않습니다. 모든 투자 판단과 책임은 이용자 본인에게 있습니다.
            데이터 출처: Yahoo Finance, KIS API, DART.
          </p>
          {updatedDate && (
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">
              데이터 기준: {updatedDate}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[var(--border-primary)] px-4 py-4">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
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
  );
}
