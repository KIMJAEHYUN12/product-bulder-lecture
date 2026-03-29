import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투자 모험 RPG - 오비젼",
  description: "투자 활동으로 캐릭터를 성장시키는 RPG. 클래스 선택, 장비 강화, 배틀까지!",
  openGraph: {
    title: "투자 모험 RPG - 오비젼",
    description: "투자 활동으로 캐릭터를 성장시키는 RPG. 클래스 선택, 장비 강화, 배틀까지!",
    type: "website",
  },
};

export default function AdventureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
