export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-label="Kiungo logo" role="img">
      <rect x="2.5" y="9.5" width="16" height="13" rx="6.5" stroke="currentColor" strokeWidth="2.6" />
      <rect
        x="13.5"
        y="9.5"
        width="16"
        height="13"
        rx="6.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeOpacity="0.45"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <span className="text-accent">
        <Logo className="h-6 w-6" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Kiungo</span>
    </span>
  );
}
