import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CAMPS, getCampBySlug } from "@/lib/camps-data";
import {
  GENDER_LABELS,
  INTEREST_EMOJI,
  INTEREST_LABELS,
  RELIGIOUS_LABELS,
  SUPPORT_LABELS,
} from "@/lib/quiz";
import { CampArt } from "@/components/CampArt";
import { CampCard } from "@/components/CampCard";
import { SEED_CAMPS } from "@/lib/camps-seed";
import { getReviewsForCamp } from "@/lib/reviews";

// Pre-render the curated camps at build time; the thousands of compiled
// listings render on demand (dynamicParams defaults to true).
export function generateStaticParams() {
  return SEED_CAMPS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const camp = getCampBySlug(slug);
  if (!camp) return {};
  return {
    title: camp.name,
    description: camp.description,
  };
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

const SCALE_ROWS: {
  key: "vibe" | "competitiveness" | "structure";
  left: string;
  right: string;
}[] = [
  { key: "vibe", left: "Rustic & classic", right: "Modern comforts" },
  { key: "competitiveness", left: "Laid-back", right: "Competitive" },
  { key: "structure", left: "Fully scheduled", right: "Kids choose" },
];

export default async function CampPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const camp = getCampBySlug(slug);
  if (!camp) notFound();

  const reviews = getReviewsForCamp(camp.slug);
  const websiteHref =
    camp.website ||
    `https://www.google.com/search?q=${encodeURIComponent(`${camp.name} ${camp.city} ${camp.state} summer camp`)}`;

  const similar = CAMPS.filter(
    (c) =>
      c.slug !== camp.slug &&
      c.type === camp.type &&
      c.interests.filter((i) => camp.interests.includes(i)).length >= 2,
  ).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="text-sm text-ink-soft">
        <Link href="/camps" className="font-medium text-ember hover:text-ember-deep">
          ← All camps
        </Link>
      </nav>

      <div className="mt-4 overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-lift">
        <div className="relative h-56 sm:h-72">
          {camp.photos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote camp photos come from arbitrary domains
            <img
              src={camp.photos[0]}
              alt={`Photo of ${camp.name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <CampArt camp={camp} className="h-full w-full" />
          )}
          <div className="absolute bottom-4 left-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-pine px-3 py-1 text-sm font-semibold text-cream">
              {camp.type === "day" ? "Day camp" : "Sleepaway camp"}
            </span>
            {camp.verified ? (
              <span className="rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-pine">
                ✓ Verified by camp
              </span>
            ) : (
              <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-ink-soft">
                Unclaimed listing — details are estimates
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_320px]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink">{camp.name}</h1>
            <p className="mt-1 text-lg text-ink-soft">
              {camp.city}, {camp.state}
              {camp.founded ? ` · Est. ${camp.founded}` : ""}
              {camp.acaAccredited ? " · ACA accredited" : ""}
            </p>
            {camp.rating !== undefined && (
              <p className="mt-2 flex items-center gap-1.5 text-ink">
                <span aria-hidden className="text-lg leading-none text-ember">
                  {"★".repeat(Math.round(camp.rating))}
                  <span className="text-ink/15">{"★".repeat(5 - Math.round(camp.rating))}</span>
                </span>
                <span className="font-semibold">{camp.rating.toFixed(1)}</span>
                {camp.reviewCount ? (
                  <span className="text-sm text-ink-soft">
                    · {camp.reviewCount} community review{camp.reviewCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </p>
            )}
            <p className="mt-5 text-lg leading-relaxed text-ink">{camp.description}</p>

            <h2 className="mt-9 text-xl font-semibold text-pine">Program strengths</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {camp.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full border border-pine/20 bg-pine-light px-3.5 py-1.5 text-sm font-medium text-pine"
                >
                  {INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}
                </span>
              ))}
            </div>

            <h2 className="mt-9 text-xl font-semibold text-pine">Camp personality</h2>
            <div className="mt-4 space-y-4">
              {SCALE_ROWS.map((row) => (
                <div key={row.key}>
                  <div className="flex justify-between text-sm font-medium text-ink-soft">
                    <span>{row.left}</span>
                    <span>{row.right}</span>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-2.5 flex-1 rounded-full ${
                          n === camp[row.key] ? "bg-ember" : "bg-ink/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {camp.supports.length > 0 && (
              <>
                <h2 className="mt-9 text-xl font-semibold text-pine">Support & inclusion</h2>
                <ul className="mt-3 space-y-2">
                  {camp.supports.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-ink">
                      <span className="text-sky-deep">✓</span> {SUPPORT_LABELS[s]}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {reviews.length > 0 && (
              <>
                <h2 className="mt-9 text-xl font-semibold text-pine">What families say</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Community snapshots compiled from public posts and reviews
                  around the web — not verified by CampMatch or the camp.
                </p>
                <div className="mt-4 space-y-4">
                  {reviews.map((r, i) => (
                    <figure key={i} className="rounded-2xl border border-ink/10 bg-cream-dark/50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <figcaption className="text-sm font-semibold text-ink">
                          {r.author}
                          <span className="ml-2 rounded-full bg-pine-light px-2 py-0.5 text-xs font-medium capitalize text-pine">
                            {r.role}
                          </span>
                        </figcaption>
                        <span aria-label={`${r.rating} out of 5 stars`} className="shrink-0 text-sm text-ember">
                          {"★".repeat(r.rating)}
                          <span className="text-ink/15">{"★".repeat(5 - r.rating)}</span>
                        </span>
                      </div>
                      <blockquote className="mt-2 leading-relaxed text-ink">
                        &ldquo;{r.text}&rdquo;
                      </blockquote>
                      {r.year && <p className="mt-2 text-xs text-ink-soft">Summer {r.year}</p>}
                    </figure>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Facts sidebar */}
          <aside>
            <dl className="grid gap-3">
              <Fact label="Ages" value={`${camp.ageMin}–${camp.ageMax}`} />
              <Fact label="Gender" value={GENDER_LABELS[camp.gender]} />
              <Fact
                label="Sessions"
                value={camp.sessionWeeks.map((w) => `${w} wk`).join(" · ")}
              />
              <Fact
                label="Tuition (approx.)"
                value={`$${camp.tuitionMin.toLocaleString()} – $${camp.tuitionMax.toLocaleString()}`}
              />
              <Fact label="Campers on site" value={`~${camp.size}`} />
              <Fact label="Community" value={RELIGIOUS_LABELS[camp.religious]} />
            </dl>
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block rounded-full bg-pine px-6 py-3.5 text-center font-semibold text-cream transition hover:bg-pine-deep"
            >
              {camp.website ? "Visit camp website ↗" : "Find camp website ↗"}
            </a>
            <Link
              href="/quiz"
              className="mt-3 block rounded-full border-2 border-ember px-6 py-3 text-center font-semibold text-ember transition hover:bg-ember hover:text-white"
            >
              See if it&apos;s a match 💘
            </Link>
            {!camp.claimed && (
              <p className="mt-5 rounded-xl bg-cream-dark p-4 text-sm leading-relaxed text-ink-soft">
                Work at {camp.name}?{" "}
                <Link
                  href={`/for-camps?claim=${camp.slug}`}
                  className="font-semibold text-ember hover:text-ember-deep"
                >
                  Claim this listing
                </Link>{" "}
                to verify details and reach matched families.
              </p>
            )}
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-ink">Similar camps</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((c) => (
              <CampCard key={c.slug} camp={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
