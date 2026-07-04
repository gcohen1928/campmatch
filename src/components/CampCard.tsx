import Link from "next/link";
import type { Camp, MatchResult } from "@/lib/types";
import { GENDER_LABELS } from "@/lib/quiz";
import { CampArt } from "./CampArt";
import { MatchRing } from "./MatchRing";

function money(n: number) {
  return `$${Math.round(n / 100) / 10}k`.replace(".0k", "k");
}

export function RatingBadge({ camp, className = "" }: { camp: Camp; className?: string }) {
  if (camp.rating === undefined) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-ink ${className}`}>
      <span aria-hidden className="text-ember">★</span>
      {camp.rating.toFixed(1)}
      {camp.reviewCount ? (
        <span className="font-normal text-ink-soft">({camp.reviewCount})</span>
      ) : null}
    </span>
  );
}

export function CampMeta({ camp }: { camp: Camp }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
      <span>{camp.city}, {camp.state}</span>
      <span aria-hidden>·</span>
      <span>{camp.type === "day" ? "Day camp" : "Sleepaway"}</span>
      <span aria-hidden>·</span>
      <span>{GENDER_LABELS[camp.gender]}</span>
      <span aria-hidden>·</span>
      <span>Ages {camp.ageMin}–{camp.ageMax}</span>
      <span aria-hidden>·</span>
      <span>{money(camp.tuitionMin)}–{money(camp.tuitionMax)}</span>
    </div>
  );
}

export function CampCard({
  camp,
  match,
  rank,
}: {
  camp: Camp;
  match?: MatchResult;
  rank?: number;
}) {
  return (
    <Link
      href={`/camps/${camp.slug}`}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lift transition hover:-translate-y-0.5 hover:shadow-lift-lg"
    >
      <div className="relative h-40 overflow-hidden">
        {camp.photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote camp photos come from arbitrary domains
          <img
            src={camp.photos[0]}
            alt={`Photo of ${camp.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <CampArt camp={camp} className="h-full w-full transition duration-500 group-hover:scale-105" />
        )}
        {rank !== undefined && (
          <span className="absolute left-3 top-3 rounded-full bg-pine px-2.5 py-1 text-xs font-bold text-cream shadow">
            #{rank}
          </span>
        )}
        {camp.verified ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-pine">
            ✓ Verified by camp
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
            Unclaimed listing
          </span>
        )}
      </div>
      <div className="flex gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-pine">
              {camp.name}
            </h3>
            <RatingBadge camp={camp} className="shrink-0" />
          </div>
          <div className="mt-1.5">
            <CampMeta camp={camp} />
          </div>
          {match ? (
            <ul className="mt-3 space-y-1.5">
              {match.reasons.slice(0, 2).map((r) => (
                <li key={r.label} className="flex items-start gap-1.5 text-[13px] leading-snug text-ink-soft">
                  <span className={r.strength === "great" ? "text-ember" : "text-sky-deep"}>
                    {r.strength === "great" ? "★" : "✦"}
                  </span>
                  <span><strong className="font-semibold text-ink">{r.label}.</strong> {r.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-ink-soft">
              {camp.description}
            </p>
          )}
        </div>
        {match && (
          <div className="shrink-0 self-start">
            <MatchRing score={match.score} />
          </div>
        )}
      </div>
    </Link>
  );
}
