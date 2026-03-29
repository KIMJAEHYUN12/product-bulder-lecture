"use client";

interface IconProps {
  size?: number;
  className?: string;
}

/* ─── Kim 모드: 원형 얼굴 라인 아트 ─── */

export function KimNeutral({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="20" r="2" fill="currentColor" />
      <circle cx="31" cy="20" r="2" fill="currentColor" />
      <line x1="16" y1="31" x2="32" y2="31" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function KimShocked({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="19" r="3" fill="currentColor" />
      <circle cx="31" cy="19" r="3" fill="currentColor" />
      <ellipse cx="24" cy="33" rx="4" ry="5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function KimSmug({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="21" r="2" fill="currentColor" />
      <circle cx="31" cy="21" r="2" fill="currentColor" />
      <line x1="28" y1="14" x2="34" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 30 Q24 36 32 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function KimAngry({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="21" r="2" fill="currentColor" />
      <circle cx="31" cy="21" r="2" fill="currentColor" />
      <line x1="12" y1="14" x2="21" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="14" x2="27" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 34 Q24 28 31 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function KimPity({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="17" cy="22" r="2" fill="currentColor" />
      <circle cx="31" cy="22" r="2" fill="currentColor" />
      <line x1="12" y1="17" x2="21" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="17" x2="27" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 33 Q24 28 31 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ─── MCR 모드: 기하학 상태 아이콘 ─── */

export function McrNeutral({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="10" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="10" y1="24" x2="38" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function McrShocked({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <polyline points="6,12 16,18 24,14 32,30 42,38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="22" y1="28" x2="26" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="28" x2="22" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="32" x2="34" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function McrSmug({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <line x1="6" y1="30" x2="42" y2="30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
      <polyline points="10,38 18,32 26,34 32,28 36,20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="32,20 36,14 36,20 42,20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function McrAngry({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="16" x2="32" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="16" x2="16" y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function McrPity({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M12,28 Q12,12 28,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <polyline points="22,12 28,12 28,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="8" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
    </svg>
  );
}
