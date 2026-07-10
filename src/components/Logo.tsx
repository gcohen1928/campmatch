export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {/* outer diamond seal */}
      <path d="M24 3 45 24 24 45 3 24Z" stroke="currentColor" strokeWidth="2" />
      {/* inner hairline diamond */}
      <path d="M24 8 40 24 24 40 8 24Z" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* champagne four-point star */}
      <path
        d="M24 14c1.1 5.3 4.7 8.9 10 10-5.3 1.1-8.9 4.7-10 10-1.1-5.3-4.7-8.9-10-10 5.3-1.1 8.9-4.7 10-10Z"
        fill="#c0a062"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-[19px] font-semibold uppercase leading-none tracking-[0.2em] ${className}`}
    >
      Camp&nbsp;Matching
    </span>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${light ? "text-cream" : "text-pine"}`}>
      <LogoMark className="h-8 w-8" />
      <Wordmark />
    </span>
  );
}
