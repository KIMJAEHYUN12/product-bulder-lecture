"use client";

import { useEffect, useState } from "react";
import { fetchNews, type NewsItem } from "@/lib/api";

const FALLBACK: NewsItem[] = [
  { title: "삼성전자 HBM4 엔비디아 퀄 테스트 진행 중 · 3Q26 공급 가시화", url: "" },
  { title: "효성중공업 미국 변압기 수주잔고 3.2조 돌파 · 신규 팩토리 증설 확정", url: "" },
  { title: "SK하이닉스 HBM3E 16단 GB200 NVL72 공급 단가 타결", url: "" },
  { title: "LG에너지솔루션 오하이오 2공장 가동률 하향 · GM 발주 감소", url: "" },
  { title: "네이버 하이퍼클로바X B2B 계약 23건 신규 수주", url: "" },
  { title: "한화에어로스페이스 유럽 방산 수출 수주잔고 역대 최고", url: "" },
  { title: "셀트리온 자가면역 바이오시밀러 미국 FDA 승인", url: "" },
  { title: "두산에너빌리티 체코 원전 수주 최종 협상 진입", url: "" },
];

export function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNews()
      .then((items) => setNews(items.length > 0 ? items : []))
      .catch(() => setNews([]))
      .finally(() => setIsLoading(false));
  }, []);

  const isLive = news.length > 0;
  const items = isLive ? news : FALLBACK;
  const displayItems = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-2 px-4">
      <div className="flex items-center gap-3">
        <span
          className={`text-[10px] font-bold shrink-0 border px-1.5 py-0.5 rounded font-mono tracking-wider transition-colors ${
            isLoading
              ? "text-[var(--text-faint)] border-[var(--border-primary)]"
              : isLive
              ? "text-emerald-500 border-emerald-500/50"
              : "text-[var(--text-faint)] border-[var(--border-primary)]"
          }`}
        >
          {isLoading ? "..." : isLive ? "LIVE" : "DEMO"}
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker">
            {displayItems.map((item, i) =>
              isLive && item.url ? (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--text-muted)] shrink-0 mr-10 hover:text-[var(--text-primary)] hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {item.title}
                </a>
              ) : (
                <span
                  key={i}
                  className="text-xs text-[var(--text-muted)] shrink-0 mr-10"
                >
                  {item.title}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
