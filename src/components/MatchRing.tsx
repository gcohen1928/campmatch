export function MatchRing({
  score,
  size = 72,
}: {
  score: number;
  size?: number;
}) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const tone =
    score >= 85 ? "text-ember" : score >= 70 ? "text-sky-deep" : "text-ink-soft";

  return (
    <div
      className={`relative animate-ring ${tone}`}
      style={{ width: size, height: size, ["--ring-circ" as string]: `${circ}` }}
      role="img"
      aria-label={`${score}% match`}
    >
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
        <circle
          className="ring-value"
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold leading-none">{score}%</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">match</span>
      </div>
    </div>
  );
}
