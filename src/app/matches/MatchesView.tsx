"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CAMPS } from "@/lib/camps-data";
import { matchCamps, TOP_MATCH_COUNT } from "@/lib/matching";
import { loadAnswers } from "@/lib/answers-store";
import { useHydrated } from "@/lib/use-hydrated";
import { CampCard } from "@/components/CampCard";
import { CAMP_NORMS, datasetStats } from "@/lib/norms";
import { COMFORT_LABELS, DISTANCE_LABELS } from "@/lib/quiz";

export function MatchesView() {
  const hydrated = useHydrated();
  const answers = useMemo(() => (hydrated ? loadAnswers() : null), [hydrated]);
  const results = useMemo(
    () => (answers ? matchCamps(CAMPS, answers) : []),
    [answers],
  );
  const [showBackups, setShowBackups] = useState(false);
  const [normsOpen, setNormsOpen] = useState(false);
  const stats = useMemo(() => datasetStats(CAMPS), []);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-ink-soft">
        Playing matchmaker…
      </div>
    );
  }

  if (!answers) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">💌</div>
        <h1 className="mt-4 text-3xl font-semibold text-ink">No questionnaire answers yet</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Take the 3-minute questionnaire first and we&apos;ll line up your matches.
        </p>
        <Link
          href="/quiz"
          className="mt-8 inline-block rounded-full bg-ember px-8 py-3.5 font-semibold text-white shadow-lift-lg hover:bg-ember-deep"
        >
          Take the questionnaire →
        </Link>
      </div>
    );
  }

  const top = results.slice(0, TOP_MATCH_COUNT);
  const backups = results.slice(TOP_MATCH_COUNT, TOP_MATCH_COUNT * 2);
  const summaryBits = [
    `age ${answers.childAge}`,
    answers.campType === "both" ? "day + sleepaway" : answers.campType,
    `from ${answers.homeState}`,
    DISTANCE_LABELS[answers.maxDistance].toLowerCase(),
    ...(answers.mustHaves.length > 0
      ? [
          `must-haves: ${answers.mustHaves
            .map((m) => COMFORT_LABELS[m].toLowerCase())
            .join(", ")}`,
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-ember">
          The results are in
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
          {top.length > 0
            ? `Your top ${top.length} camp${top.length === 1 ? "" : "s"}.`
            : "No matches with those filters."}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Matched for: {summaryBits.join(" · ")}.{" "}
          <Link href="/quiz" className="font-semibold text-ember hover:text-ember-deep">
            Retake questionnaire
          </Link>
        </p>
        {top.length > 0 && (
          <p className="mt-3 rounded-xl bg-pine-light/60 px-4 py-3 text-sm leading-relaxed text-pine">
            <strong>How families usually do this:</strong> shortlist 4–5 camps, go to
            their rookie days over the summer, then pick from the ones your kid
            actually walked around. You can apply to any of them right here and
            we&apos;ll send it to the camp.
          </p>
        )}
      </div>

      {top.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-ink/10 bg-white p-10 text-center">
          <p className="text-lg text-ink-soft">
            Try widening your distance or dropping a must-have — or{" "}
            <Link href="/camps" className="font-semibold text-ember">browse every camp</Link>{" "}
            without filters.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {top.map((r, i) => (
              <div key={r.camp.slug}>
                <CampCard camp={r.camp} match={r} rank={i + 1} />
                <div className="mt-2 flex items-center justify-between px-1">
                  {r.cautions.length > 0 ? (
                    <p className="min-w-0 truncate text-xs text-ink-soft" title={r.cautions[0]}>
                      ⚠︎ {r.cautions[0]}
                    </p>
                  ) : (
                    <span />
                  )}
                  <Link
                    href={`/apply/${r.camp.slug}`}
                    className="shrink-0 text-sm font-semibold text-ember hover:text-ember-deep"
                  >
                    Apply through us →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {backups.length > 0 && (
            <div className="mt-10">
              {showBackups ? (
                <>
                  <h2 className="text-xl font-semibold text-ink">Back-up options</h2>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    {backups.map((r, i) => (
                      <div key={r.camp.slug}>
                        <CampCard camp={r.camp} match={r} rank={TOP_MATCH_COUNT + i + 1} />
                        <div className="mt-2 flex justify-end px-1">
                          <Link
                            href={`/apply/${r.camp.slug}`}
                            className="text-sm font-semibold text-ember hover:text-ember-deep"
                          >
                            Apply through us →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowBackups(true)}
                    className="rounded-full border-2 border-pine px-8 py-3 font-semibold text-pine transition hover:bg-pine hover:text-cream"
                  >
                    Show {backups.length} back-up options
                  </button>
                  <p className="mt-4 text-ink-soft">
                    We keep the list short on purpose — five great fits beat fifty maybes. You can
                    still{" "}
                    <Link href="/camps" className="font-semibold text-ember hover:text-ember-deep">
                      browse the full directory
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* What's normal — context for comparing the shortlist */}
      {top.length > 0 && (
        <section className="mt-16 rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold text-ink">What&apos;s normal at camp?</h2>
            <p className="text-sm text-ink-soft">
              So you can tell which of your matches is the outlier.
            </p>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Across the {stats.count.toLocaleString()} camps we track: median tuition runs about
            ${stats.medianTuitionMin.toLocaleString()}–${stats.medianTuitionMax.toLocaleString()},
            the median camp hosts ~{stats.medianSize} campers and has been running since{" "}
            {stats.medianFounded}, {stats.acaPct}% are ACA accredited, and {stats.shortSessionPct}%
            offer a session of 4 weeks or less.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(normsOpen ? CAMP_NORMS : CAMP_NORMS.slice(0, 6)).map((n) => (
              <div key={n.label} className="rounded-2xl bg-cream-dark/50 p-4">
                <p className="font-semibold text-ink">
                  <span aria-hidden className="mr-1.5">{n.emoji}</span>
                  {n.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{n.typical}</p>
              </div>
            ))}
          </div>
          {!normsOpen && (
            <button
              type="button"
              onClick={() => setNormsOpen(true)}
              className="mt-4 text-sm font-semibold text-ember hover:text-ember-deep"
            >
              Show all {CAMP_NORMS.length} →
            </button>
          )}
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-gold/50 bg-gold/10 p-6 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">A note on our data:</strong> match scores are
        based on compiled public information and estimates, and life-at-camp
        details (AC, laundry, phone policy…) are still being compiled camp by
        camp — anything we couldn&apos;t confirm is flagged, never guessed.
        Unclaimed listings haven&apos;t been verified by the camp yet — always
        confirm dates and programs with the director. Camps can{" "}
        <Link href="/for-camps" className="font-semibold text-ember">claim their listing</Link>{" "}
        to verify details.
      </div>
    </div>
  );
}
