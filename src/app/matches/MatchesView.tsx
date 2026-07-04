"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CAMPS } from "@/lib/camps-data";
import { matchCamps } from "@/lib/matching";
import { loadAnswers } from "@/lib/answers-store";
import { useHydrated } from "@/lib/use-hydrated";
import { CampCard } from "@/components/CampCard";
import { BUDGET_LABELS, DISTANCE_LABELS } from "@/lib/quiz";

export function MatchesView() {
  const hydrated = useHydrated();
  const answers = useMemo(() => (hydrated ? loadAnswers() : null), [hydrated]);
  const results = useMemo(
    () => (answers ? matchCamps(CAMPS, answers) : []),
    [answers],
  );

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
        <h1 className="mt-4 text-3xl font-semibold text-ink">No quiz answers yet</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Take the 3-minute quiz first and we&apos;ll line up your matches.
        </p>
        <Link
          href="/quiz"
          className="mt-8 inline-block rounded-full bg-ember px-8 py-3.5 font-semibold text-white shadow-lift-lg hover:bg-ember-deep"
        >
          Take the quiz →
        </Link>
      </div>
    );
  }

  const [shown, setShown] = useState(12);
  const top = results.slice(0, shown);
  const summaryBits = [
    `age ${answers.childAge}`,
    answers.campType === "both" ? "day + sleepaway" : answers.campType,
    `from ${answers.homeState}`,
    DISTANCE_LABELS[answers.maxDistance].toLowerCase(),
    BUDGET_LABELS[answers.budget].toLowerCase(),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-ember">
          The results are in
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
          {top.length > 0
            ? `We found ${results.length} camps worth meeting.`
            : "No matches with those filters."}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Matched for: {summaryBits.join(" · ")}.{" "}
          <Link href="/quiz" className="font-semibold text-ember hover:text-ember-deep">
            Retake quiz
          </Link>
        </p>
      </div>

      {top.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-ink/10 bg-white p-10 text-center">
          <p className="text-lg text-ink-soft">
            Try widening your distance or budget — or{" "}
            <Link href="/camps" className="font-semibold text-ember">browse every camp</Link>{" "}
            without filters.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {top.map((r, i) => (
              <CampCard key={r.camp.slug} camp={r.camp} match={r} rank={i + 1} />
            ))}
          </div>
          {results.length > top.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + 12)}
                className="rounded-full border-2 border-pine px-8 py-3 font-semibold text-pine transition hover:bg-pine hover:text-cream"
              >
                Show more matches
              </button>
              <p className="mt-4 text-ink-soft">
                {(results.length - top.length).toLocaleString()} more passed your filters —{" "}
                <Link href="/camps" className="font-semibold text-ember hover:text-ember-deep">
                  browse the full directory
                </Link>
                .
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-16 rounded-2xl border border-gold/50 bg-gold/10 p-6 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">A note on our data:</strong> match scores are
        based on compiled public information and estimates. Unclaimed listings
        haven&apos;t been verified by the camp yet — always confirm dates, tuition
        and programs with the director. Camps can{" "}
        <Link href="/for-camps" className="font-semibold text-ember">claim their listing</Link>{" "}
        to verify details.
      </div>
    </div>
  );
}
