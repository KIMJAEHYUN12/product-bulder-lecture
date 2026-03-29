"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface HeroLandingProps {
  onStartKim: () => void;
  onStartMakalong: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  onDismiss?: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const featureContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const featureItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const cards = [
  {
    label: "포폴 진단",
    sub: "스크린샷 업로드 → AI 팩폭 진단",
    color: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 hover:border-indigo-400",
    textColor: "text-indigo-500 dark:text-indigo-400",
    glow: "hover:shadow-lg",
    icon: "🏭",
    action: "kim" as const,
  },
  {
    label: "차트 분석",
    sub: "빗각 자동 작도 → AI 매매 판단",
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-400",
    textColor: "text-blue-500 dark:text-blue-400",
    glow: "hover:shadow-lg",
    icon: "📐",
    action: "makalong" as const,
  },
  {
    label: "모의투자",
    sub: "가상 1,000만원으로 실전 연습",
    color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400",
    textColor: "text-emerald-500 dark:text-emerald-400",
    glow: "hover:shadow-lg",
    icon: "📈",
    action: "link" as const,
    href: "/mock-investment",
  },
];

const features = [
  {
    icon: "🏭",
    title: "포폴 진단",
    desc: "포트폴리오 스크린샷을 올리면 AI가 팩폭으로 진단",
    border: "border-indigo-500/20 dark:border-indigo-500/30",
  },
  {
    icon: "📐",
    title: "차트 분석",
    desc: "빗각 자동 작도 + 기술지표로 매매 타이밍 분석",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
  {
    icon: "🔬",
    title: "종목 분석실",
    desc: "종목 비교, 수급, AI 브리핑을 한눈에",
    border: "border-purple-500/20 dark:border-purple-500/30",
  },
  {
    icon: "📈",
    title: "모의투자",
    desc: "가상 1,000만원으로 실전 감각 연습",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  {
    icon: "🎮",
    title: "차트게임",
    desc: "실제 차트로 업다운 맞추기 연승 도전",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
];

export function HeroLanding({ onStartKim, onStartMakalong, contentRef, onDismiss }: HeroLandingProps) {
  const scrollToContent = () => {
    onDismiss?.();
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCardClick = (card: (typeof cards)[number]) => {
    onDismiss?.();
    if (card.action === "kim") {
      onStartKim();
      contentRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (card.action === "makalong") {
      onStartMakalong();
      contentRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center hero-mesh overflow-hidden px-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center max-w-2xl mx-auto"
      >
        {/* Title */}
        <motion.h2
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[.3em] text-gray-900 dark:text-white mb-4 select-none"
        >
          오 비 젼
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-sm sm:text-base text-gray-500 dark:text-zinc-400 font-mono mb-10"
        >
          AI가 분석하고, 팩트로 때립니다
        </motion.p>

        {/* Feature cards */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg sm:max-w-2xl"
        >
          {cards.map((card) =>
            card.action === "link" ? (
              <Link key={card.label} href={card.href!} onClick={() => onDismiss?.()}>
                <div
                  className={`group relative bg-gradient-to-b ${card.color} border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${card.glow}`}
                >
                  <div className="text-2xl sm:text-3xl mb-2">{card.icon}</div>
                  <div className={`text-sm sm:text-base font-black ${card.textColor}`}>{card.label}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 font-mono leading-snug">
                    {card.sub}
                  </div>
                </div>
              </Link>
            ) : (
              <div
                key={card.label}
                onClick={() => handleCardClick(card)}
                className={`group relative bg-gradient-to-b ${card.color} border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl ${card.glow}`}
              >
                <div className="text-2xl sm:text-3xl mb-2">{card.icon}</div>
                <div className={`text-sm sm:text-base font-black ${card.textColor}`}>{card.label}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 font-mono leading-snug">
                  {card.sub}
                </div>
              </div>
            )
          )}
        </motion.div>
      </motion.div>

      {/* Feature introduction section */}
      <motion.div
        variants={featureContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-14 sm:mt-20 w-full max-w-2xl mx-auto"
      >
        <motion.p
          variants={featureItem}
          className="text-center text-xs sm:text-sm text-gray-400 dark:text-zinc-500 font-mono mb-6"
        >
          주요 기능
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={featureItem}
              className={`glass-card ${f.border} border p-5 rounded-2xl`}
            >
              <div className="text-xl mb-2">{f.icon}</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Scroll arrow */}
      <motion.button
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.8 } }}
        onClick={scrollToContent}
        className="mt-10 sm:mt-14 text-gray-400 dark:text-zinc-500 animate-bounce"
        aria-label="스크롤하여 시작"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10l5 5 5-5" />
        </svg>
        <span className="block text-[10px] font-mono mt-1">스크롤하여 시작</span>
      </motion.button>
    </section>
  );
}
