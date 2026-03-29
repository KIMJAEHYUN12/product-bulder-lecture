import type { Metadata } from "next";
import { CommoditiesHub } from "./CommoditiesHub";

export const metadata: Metadata = {
  title: "원자재 시세 | SimplyStock",
  description:
    "금, 은, 원유, 천연가스, 구리, 옥수수, 커피 등 29개 주요 원자재의 실시간 시세와 투자 정보를 확인하세요. 귀금속, 에너지, 산업금속, 농산물 카테고리별로 한눈에 비교할 수 있습니다.",
  keywords: [
    "원자재 시세",
    "금 시세",
    "은 시세",
    "WTI 원유",
    "천연가스",
    "구리",
    "옥수수",
    "커피 선물",
    "commodity prices",
  ],
};

export default function CommoditiesPage() {
  return <CommoditiesHub />;
}
