interface SkeletonProps {
  variant?: "bar" | "circle" | "card";
  className?: string;
}

export function Skeleton({ variant = "bar", className = "" }: SkeletonProps) {
  const base =
    "animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-white/5 dark:via-white/10 dark:to-white/5";

  if (variant === "circle") {
    return <div className={`${base} rounded-full ${className}`} />;
  }

  if (variant === "card") {
    return <div className={`${base} rounded-lg ${className}`} />;
  }

  return <div className={`${base} rounded ${className}`} />;
}
