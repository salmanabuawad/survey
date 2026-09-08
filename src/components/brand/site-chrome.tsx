/** Fixed color ribbon plus the overlapping-circles mark used across screens. */
export function SiteChrome() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 h-1.5 bg-gradient-to-l from-coral-400 via-violet-400 to-teal-500"
      aria-hidden
    />
  );
}

export function BrandMark({ className = "h-12 w-28" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 56"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="brand-teal" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-teal-300)" />
          <stop offset="100%" stopColor="var(--color-teal-600)" />
        </linearGradient>
        <linearGradient id="brand-violet" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-violet-300)" />
          <stop offset="100%" stopColor="var(--color-violet-600)" />
        </linearGradient>
      </defs>
      <circle cx="98" cy="28" r="22" fill="url(#brand-teal)" opacity="0.92" />
      <circle cx="70" cy="28" r="16" fill="url(#brand-violet)" opacity="0.82" />
      <circle cx="46" cy="34" r="11" fill="var(--color-coral-400)" opacity="0.9" />
    </svg>
  );
}
