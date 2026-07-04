import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How CampMatch's questionnaire and matching algorithm find the right camp for your kid.",
};

const DIMENSIONS = [
  ["Interests & passions", "The heaviest factor. We map your kid's picks against each camp's genuine program strengths — not just a checkbox activity list.", "26%"],
  ["Camp personality", "Rustic vs. modern, competitive vs. laid-back, scheduled vs. choice-based. Every camp is rated on the same 1–5 scales your quiz answers use.", "28%"],
  ["Community & culture", "Co-ed vs. single-gender, religious and cultural fit, camp size matched against your child's social style.", "17%"],
  ["Logistics", "Distance from your home, session length and budget. Practical dealbreakers are filtered out entirely; near-misses just lose points.", "27%"],
  ["First-timer & support needs", "First-summer readiness, allergy handling, learning and inclusion programs — weighted in when you flag them.", "varies"],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Like a dating app, <span className="text-ember">for camp.</span>
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Camp directories give you a phone book. We give you an introduction.
        Here&apos;s what happens between the quiz and your match list.
      </p>

      <ol className="mt-12 space-y-10">
        <li>
          <h2 className="text-2xl font-semibold text-pine">1 · Hard filters first</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Some things aren&apos;t preferences — they&apos;re requirements. Age range,
            boys/girls/co-ed fit, day vs. sleepaway, kosher observance if your
            family requires it, and inclusion programs when your child needs one.
            Camps that fail these never appear, no matter how charming.
          </p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold text-pine">2 · Compatibility scoring</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Every surviving camp is scored across weighted dimensions:
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white">
            {DIMENSIONS.map(([name, desc, weight], i) => (
              <div key={name} className={`flex gap-4 p-5 ${i > 0 ? "border-t border-ink/10" : ""}`}>
                <span className="font-display text-lg font-bold text-ember">{weight}</span>
                <div>
                  <h3 className="font-semibold text-ink">{name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </li>
        <li>
          <h2 className="text-2xl font-semibold text-pine">3 · Honest reasons, both ways</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Each match comes with plain-English reasons it fits — and cautions
            where it doesn&apos;t. A 92% match that&apos;s a little past your driving
            range will say so. We&apos;d rather you trust the list than be impressed
            by it.
          </p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold text-pine">4 · Verified by camps over time</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Listings start as carefully compiled public data, clearly marked as
            unverified. Camp directors can claim their listing, correct every
            detail, and earn a verified badge — so the data keeps getting better.
          </p>
        </li>
      </ol>

      <div className="mt-14 rounded-3xl bg-pine px-8 py-10 text-center text-cream">
        <h2 className="text-2xl font-semibold">Ready to meet your matches?</h2>
        <Link
          href="/quiz"
          className="mt-5 inline-block rounded-full bg-ember px-8 py-3.5 font-semibold text-white shadow-lift-lg transition hover:bg-ember-deep"
        >
          Take the 3-minute quiz →
        </Link>
      </div>
    </div>
  );
}
