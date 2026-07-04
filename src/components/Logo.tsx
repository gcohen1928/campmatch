export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {/* tent */}
      <path d="M24 8 5 40h14l5-9 5 9h14L24 8Z" fill="currentColor" opacity="0.9" />
      {/* heart doorway */}
      <path
        d="M24 27.5c1.1-2.2 4.4-2.1 4.4.6 0 1.9-2.6 4.3-4.4 5.6-1.8-1.3-4.4-3.7-4.4-5.6 0-2.7 3.3-2.8 4.4-.6Z"
        fill="#f2b84b"
      />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${light ? "text-cream" : "text-pine"}`}>
      <LogoMark className="h-8 w-8" />
      <span className="font-display text-xl font-semibold tracking-tight">
        CampMatch
      </span>
    </span>
  );
}
