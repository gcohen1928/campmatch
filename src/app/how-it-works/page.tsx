import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Camp Matching's questionnaire and matching algorithm find the right camp for your kid.",
};

const DIMENSIONS = [
  ["Interests & specific hobbies", "The heaviest factor. Your kid's picks — plus free-text hobbies like \"waterski\" or \"ice hockey\" — mapped against each camp's genuine program strengths and its actual activity list.", "~26%"],
  ["Camp personality & culture", "Rustic vs. modern, competitive vs. laid-back, scheduled vs. choice-based, down-to-earth vs. upscale. Every camp is rated on the same 1–5 scales your answers use.", "~28%"],
  ["Community & size", "Co-ed vs. single-gender, religious and cultural fit, camp size matched against your child's social style.", "~17%"],
  ["Logistics", "Distance from your home, session length, and split-summer options (like 3+3) when you want them. Practical dealbreakers are filtered out entirely; near-misses just lose points.", "~16%"],
  ["Life at camp", "Your must-haves — AC in bunks, a lake, laundry, a doctor on site, buses, trunk pickup — plus phone-call and visiting-day policy, uniforms, and medical staffing for kids on daily meds. Camps confirmed to lack a must-have are dropped; ones we haven't compiled yet get flagged so you can ask.", "~13%"],
  ["First-timer & support needs", "First-summer readiness, rookie days, allergy handling, learning and inclusion programs — weighted in when you flag them.", "varies"],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Matchmaking, <span className="italic text-ember">for camp.</span>
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Camp directories give you a phone book. We give you an introduction.
        Here&apos;s what happens between the questionnaire and your match list.
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
          <h2 className="text-2xl font-semibold text-pine">4 · A short list, then rookie days</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            You get your top 5 — not five hundred. That&apos;s how families actually
            choose: shortlist 4–5 camps, visit their rookie days over the summer,
            then pick from the ones your kid walked around. Alongside your matches
            we show what&apos;s <em>normal</em> at camp (most bunks have no AC; one
            visiting day per session is typical; uniforms are the exception) so you
            can tell which camp is the outlier. When you&apos;re ready, apply right
            here — one form, and we send it to the camp for you.
          </p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold text-pine">5 · Verified by camps over time</h2>
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
          Take the 3-minute questionnaire →
        </Link>
      </div>
    </div>
  );
}
