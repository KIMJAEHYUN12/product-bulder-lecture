import type { Metadata } from "next";
import CapitalMarketDashboard from "./CapitalMarketDashboard";

export const metadata: Metadata = {
  title: "한눈에 보는 자본시장 | SimplyStock",
  description: "주식, 채권, 자금동향, 펀드, ELS/DLS, 신탁 — 한국 자본시장 핵심 지표를 한눈에 파악하세요.",
  openGraph: {
    title: "한눈에 보는 자본시장 | SimplyStock",
    description: "주식, 채권, 자금동향, 펀드, ELS/DLS, 신탁 — 한국 자본시장 핵심 지표를 한눈에.",
  },
};

export default function CapitalMarketPage() {
  return <CapitalMarketDashboard />;
}
