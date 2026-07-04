import type { Camp } from "@/lib/types";

/**
 * Deterministic illustrated cover art per camp (no remote images):
 * a layered landscape scene colored from a per-camp hash.
 */
const PALETTES: [string, string, string][] = [
  ["#1e4d3a", "#3f8f84", "#f2b84b"],
  ["#14532d", "#e96d3f", "#f7d08a"],
  ["#155e63", "#8ecbc2", "#f2b84b"],
  ["#3a5a40", "#a3b18a", "#e9c46a"],
  ["#264653", "#2a9d8f", "#e76f51"],
  ["#40531b", "#7ca982", "#f4a259"],
  ["#1d3557", "#457b9d", "#f1af5f"],
  ["#4a2545", "#905e96", "#f2b84b"],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function CampArt({ camp, className = "" }: { camp: Camp; className?: string }) {
  const h = hash(camp.slug);
  const [deep, mid, sun] = PALETTES[h % PALETTES.length];
  const sunX = 25 + (h % 50);
  const ridgeShift = (h >> 3) % 30;

  return (
    <svg
      viewBox="0 0 400 225"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`Illustration for ${camp.name}`}
    >
      <defs>
        <linearGradient id={`sky-${camp.slug}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mid} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbf7ef" />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill={`url(#sky-${camp.slug})`} />
      <circle cx={sunX * 4} cy="58" r="26" fill={sun} opacity="0.95" />
      {/* far ridge */}
      <path
        d={`M0 ${120 + ridgeShift * 0.4} L${90 - ridgeShift} 70 L${190 - ridgeShift} ${118} L${270 + ridgeShift} 62 L400 ${112} V225 H0 Z`}
        fill={mid}
        opacity="0.65"
      />
      {/* near ridge */}
      <path
        d={`M0 ${150} L${70 + ridgeShift} ${98 + ridgeShift * 0.3} L${210 + ridgeShift} 150 L${300 - ridgeShift} 96 L400 148 V225 H0 Z`}
        fill={deep}
        opacity="0.9"
      />
      {/* water */}
      {camp.interests.includes("waterfront") && (
        <ellipse cx="200" cy="215" rx="230" ry="38" fill={mid} opacity="0.5" />
      )}
      {/* trees */}
      {[46, 330, 362].map((x, i) => (
        <g key={i} transform={`translate(${x + (h % 12)} ${158 + i * 6}) scale(${1 - i * 0.15})`}>
          <path d="M0 0 L12 26 H-12 Z" fill={deep} />
          <path d="M0 12 L15 40 H-15 Z" fill={deep} />
          <rect x="-2.5" y="40" width="5" height="9" fill={deep} opacity="0.8" />
        </g>
      ))}
      {/* tent */}
      <g transform={`translate(${175 + (h % 30)} 160)`}>
        <path d="M0 46 L28 0 L56 46 Z" fill="#fbf7ef" />
        <path d="M28 0 L56 46 H42 L28 18 Z" fill={sun} opacity="0.85" />
        <path d="M28 18 L38 46 H18 Z" fill={deep} opacity="0.75" />
      </g>
      {/* campfire */}
      <g transform={`translate(${120 + (h % 20)} 196)`}>
        <path d="M0 10 q6 -16 3 -22 q10 8 6 22 Z" fill={sun} />
        <rect x="-9" y="9" width="24" height="3.5" rx="1.75" fill={deep} transform="rotate(-14 3 10)" />
        <rect x="-6" y="9" width="24" height="3.5" rx="1.75" fill={deep} transform="rotate(14 3 10)" />
      </g>
    </svg>
  );
}
