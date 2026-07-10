import type { Camp } from "@/lib/types";

/**
 * Deterministic illustrated cover art per camp (no remote images):
 * a layered landscape scene colored and composed from a per-camp hash.
 * The scene adapts to the camp's program — waterfront camps get a lake and
 * canoe, adventure camps get bigger peaks, arts camps get bunting, etc.
 */
const PALETTES: [string, string, string][] = [
  ["#1e3a2c", "#5f7d6a", "#c8a55e"],
  ["#14302a", "#4e7368", "#d0b075"],
  ["#233947", "#5c7c8c", "#c29b58"],
  ["#3a4a3a", "#8a9a80", "#cbb27b"],
  ["#2b3a44", "#587a7a", "#c08e52"],
  ["#3c4522", "#7e8f68", "#d0aa5e"],
  ["#1f2f4a", "#4c6787", "#c7a05a"],
  ["#3d2836", "#7c5a72", "#c9a45c"],
  ["#2e3c40", "#7d968a", "#d2b581"],
  ["#3a2a1c", "#8a6a45", "#e0c58f"],
  ["#123f45", "#4f8a92", "#c9a45c"],
  ["#2f4526", "#7e9457", "#d6c084"],
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
  const hasWater =
    camp.interests.includes("waterfront") || camp.interests.includes("nature-animals");
  const hasPeaks =
    camp.interests.includes("outdoor-adventure") || camp.interests.includes("action-sports");
  const hasArts =
    camp.interests.includes("arts-theater") || camp.interests.includes("music") ||
    camp.interests.includes("gymnastics-dance");
  const hasHorse = camp.interests.includes("horseback");
  const peakLift = hasPeaks ? 26 : 0;

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
          <stop offset="100%" stopColor="#f8f5ee" />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill={`url(#sky-${camp.slug})`} />
      <circle cx={sunX * 4} cy="58" r={22 + ((h >> 5) % 10)} fill={sun} opacity="0.95" />
      {/* drifting clouds */}
      <g fill="#ffffff" opacity="0.55">
        <ellipse cx={60 + ((h >> 4) % 120)} cy={34 + ((h >> 8) % 14)} rx="34" ry="9" />
        <ellipse cx={250 + ((h >> 6) % 100)} cy={50 + ((h >> 9) % 12)} rx="26" ry="7" />
      </g>
      {/* far ridge */}
      <path
        d={`M0 ${120 + ridgeShift * 0.4 - peakLift} L${90 - ridgeShift} ${70 - peakLift} L${190 - ridgeShift} ${118 - peakLift * 0.4} L${270 + ridgeShift} ${62 - peakLift} L400 ${112 - peakLift * 0.5} V225 H0 Z`}
        fill={mid}
        opacity="0.65"
      />
      {/* snow caps on adventure-camp peaks */}
      {hasPeaks && (
        <g fill="#f6f1e6" opacity="0.9">
          <path d={`M${90 - ridgeShift} ${70 - peakLift} l10 12 l-8 2 l-6 4 l-6 -4 l-8 -2 Z`} />
          <path d={`M${270 + ridgeShift} ${62 - peakLift} l10 12 l-8 2 l-6 4 l-6 -4 l-8 -2 Z`} />
        </g>
      )}
      {/* near ridge */}
      <path
        d={`M0 150 L${70 + ridgeShift} ${98 + ridgeShift * 0.3} L${210 + ridgeShift} 150 L${300 - ridgeShift} 96 L400 148 V225 H0 Z`}
        fill={deep}
        opacity="0.9"
      />
      {/* water */}
      {hasWater && (
        <>
          <ellipse cx="200" cy="215" rx="230" ry="38" fill={mid} opacity="0.5" />
          <g stroke="#ffffff" strokeWidth="1.5" opacity="0.4">
            <line x1={90 + (h % 40)} y1="204" x2={130 + (h % 40)} y2="204" />
            <line x1={240 + (h % 30)} y1="212" x2={286 + (h % 30)} y2="212" />
          </g>
          {/* canoe */}
          <g transform={`translate(${240 + ((h >> 5) % 60)} 196)`}>
            <path d="M0 0 Q18 10 36 0 Q28 7 18 7 Q8 7 0 0 Z" fill={deep} />
            <line x1="18" y1="-8" x2="26" y2="6" stroke={deep} strokeWidth="2" />
          </g>
        </>
      )}
      {/* trees */}
      {[46, 330, 362].map((x, i) => (
        <g key={i} transform={`translate(${x + (h % 12)} ${158 + i * 6}) scale(${1 - i * 0.15})`}>
          <path d="M0 0 L12 26 H-12 Z" fill={deep} />
          <path d="M0 12 L15 40 H-15 Z" fill={deep} />
          <rect x="-2.5" y="40" width="5" height="9" fill={deep} opacity="0.8" />
        </g>
      ))}
      {/* horse-camp fence */}
      {hasHorse && (
        <g stroke={deep} strokeWidth="3" opacity="0.8">
          <line x1="8" y1="196" x2="98" y2="196" />
          <line x1="8" y1="206" x2="98" y2="206" />
          {[14, 42, 70, 94].map((x) => (
            <line key={x} x1={x} y1="188" x2={x} y2="212" />
          ))}
        </g>
      )}
      {/* tent */}
      <g transform={`translate(${175 + (h % 30)} 160)`}>
        <path d="M0 46 L28 0 L56 46 Z" fill="#f8f5ee" />
        <path d="M28 0 L56 46 H42 L28 18 Z" fill={sun} opacity="0.85" />
        <path d="M28 18 L38 46 H18 Z" fill={deep} opacity="0.75" />
        {/* pennant flag */}
        <line x1="28" y1="0" x2="28" y2="-14" stroke={deep} strokeWidth="1.5" />
        <path d="M28 -14 L42 -10 L28 -6 Z" fill={hasArts ? sun : deep} />
      </g>
      {/* arts-camp bunting */}
      {hasArts && (
        <g>
          <path d="M10 92 Q100 116 200 92" fill="none" stroke={deep} strokeWidth="1.5" opacity="0.7" />
          {[30, 62, 96, 132, 168].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${99 + i * 2 - Math.abs(2.5 - i) * 3} l5 10 l5 -11 Z`}
              fill={i % 2 ? sun : "#f6f1e6"}
              opacity="0.9"
            />
          ))}
        </g>
      )}
      {/* campfire */}
      <g transform={`translate(${120 + (h % 20)} 196)`}>
        <path d="M0 10 q6 -16 3 -22 q10 8 6 22 Z" fill={sun} />
        <rect x="-9" y="9" width="24" height="3.5" rx="1.75" fill={deep} transform="rotate(-14 3 10)" />
        <rect x="-6" y="9" width="24" height="3.5" rx="1.75" fill={deep} transform="rotate(14 3 10)" />
      </g>
    </svg>
  );
}
