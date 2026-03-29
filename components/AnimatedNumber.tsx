"use client";

import { useEffect, useRef } from "react";
import { useSpring, useTransform, motion, useMotionValue } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({
  value,
  format = (n) => n.toFixed(2),
  duration = 0.8,
  className = "",
  style,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { duration: duration * 1000 });
  const display = useTransform(spring, (v) => format(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref} className={className} style={style}>{format(value)}</span>;
}
