"use client";

import Link from "next/link";

const MENUS = [
  { path: "/", label: "포폴진단", icon: "📋", desc: "AI 포트폴리오 분석" },
  { path: "/?mode=chart", label: "차트분석", icon: "📈", desc: "빗각·기술지표" },
  { path: "/mock-investment", label: "모의투자", icon: "📊", desc: "가상 주식 매매" },
  { path: "/stock-lab", label: "분석실", icon: "🔬", desc: "AI 종목 분석" },
  { path: "/chart-game", label: "차트게임", icon: "🎮", desc: "업다운 예측" },
  { path: "/quiz", label: "퀴즈", icon: "🧠", desc: "투자성향 테스트" },
  { path: "/backtest", label: "백테스트", icon: "⏪", desc: "전략 시뮬레이션" },
  { path: "/adventure", label: "모험", icon: "⚔️", desc: "RPG 성장" },
];

interface Props {
  currentPath: string;
}

export default function CrossNavigation({ currentPath }: Props) {
  const items = MENUS.filter((m) => m.path !== currentPath);

  return (
    <div className="mt-6 mb-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
        다른 기능 둘러보기
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((m) => (
          <Link
            key={m.path}
            href={m.path}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-3 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
          >
            <span className="text-lg">{m.icon}</span>
            <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
              {m.label}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
              {m.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
