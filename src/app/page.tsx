import Link from "next/link";
import { CAMPS } from "@/lib/camps-data";
import { CampCard } from "@/components/CampCard";
import { LogoMark } from "@/components/Logo";

const FEATURED_SLUGS = [
  "camp-ihc",
  "willow-lake-day-camp",
  "camp-vega",
  "french-woods",
  "camp-manitou",
  "spring-lake-day-camp",
];

const STEPS = [
  {
    emoji: "📝",
    title: "Tell us about your kid",
    body: "A 3-minute questionnaire about their personality, interests, social style — and your logistics: budget, distance, session length.",
  },
  {
    emoji: "💘",
    title: "We play matchmaker",
    body: "Our matching engine scores every camp in our database across a dozen compatibility dimensions, the way a dating app scores profiles.",
  },
  {
    emoji: "🏕️",
    title: "Meet your matches",
    body: "A ranked list with match percentages and plain-English reasons why each camp fits — plus honest flags where it might not.",
  },
];

export default function Home() {
  const featured = FEATURED_SLUGS.map((s) => CAMPS.find((c) => c.slug === s)!).filter(Boolean);
  const sleepaway = CAMPS.filter((c) => c.type === "sleepaway").length;
  const day = CAMPS.filter((c) => c.type === "day").length;

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden bg-pine-deep text-cream">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-deep/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-ember/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="max-w-2xl animate-rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/10 px-4 py-1.5 text-sm font-medium text-cream/90">
              <LogoMark className="h-4 w-4 text-gold" />
              Match.com for summer camps
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Find the camp your kid was{" "}
              <span className="text-gold">made for.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/80">
              There are thousands of sleepaway and day camps in America, and
              exactly one that&apos;s perfect for your child. Take our
              personality quiz and we&apos;ll introduce you — with a match
              percentage and the reasons why.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/quiz"
                className="rounded-full bg-ember px-7 py-3.5 text-base font-semibold text-white shadow-lift-lg transition hover:bg-ember-deep"
              >
                Take the 3-minute quiz →
              </Link>
              <Link
                href="/camps"
                className="rounded-full border border-cream/25 px-7 py-3.5 text-base font-semibold text-cream transition hover:bg-cream/10"
              >
                Browse camps
              </Link>
            </div>
            <p className="mt-6 text-sm text-cream/60">
              {sleepaway} sleepaway camps · {day} day camps · growing weekly · free for parents
            </p>
          </div>
        </div>
        <svg viewBox="0 0 1440 70" className="block w-full text-cream" preserveAspectRatio="none" aria-hidden>
          <path d="M0 70 L360 18 L720 54 L1080 8 L1440 44 V70 Z" fill="currentColor" />
        </svg>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Dating-app matching. Camp-mom wisdom.
          </h2>
          <p className="mt-3 text-lg text-ink-soft">
            We built CampMatch after spending two summers trying to figure out
            which camps were right for our own daughters. Never again.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="animate-rise rounded-2xl border border-ink/10 bg-white p-7 shadow-lift"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="text-4xl">{s.emoji}</div>
              <h3 className="mt-4 text-xl font-semibold text-pine">{i + 1}. {s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we match on */}
      <section className="border-y border-ink/10 bg-cream-dark/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-ink sm:text-3xl">
            We match on the things that actually matter
          </h2>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {[
              "Personality & social style",
              "Interests & passions",
              "Competitive vs. laid-back",
              "Structured vs. free choice",
              "Rustic vs. modern",
              "Camp size",
              "Session length",
              "Distance from home",
              "Budget",
              "Co-ed vs. single gender",
              "Religious & cultural fit",
              "First-time camper support",
              "Allergy & learning support",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-pine/20 bg-white px-4 py-2 text-sm font-medium text-pine"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured camps */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Camps on CampMatch</h2>
            <p className="mt-2 text-ink-soft">From full-summer Maine classics to North Jersey day camps.</p>
          </div>
          <Link href="/camps" className="hidden shrink-0 font-semibold text-ember hover:text-ember-deep sm:block">
            See all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((camp) => (
            <CampCard key={camp.slug} camp={camp} />
          ))}
        </div>
      </section>

      {/* For camps CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grain relative overflow-hidden rounded-3xl bg-pine px-8 py-12 text-cream sm:px-12">
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Run a camp?</h2>
            <p className="mt-3 text-lg text-cream/80">
              Claim your free listing, verify your details, and get introduced
              to the families your camp was built for.
            </p>
            <Link
              href="/for-camps"
              className="mt-6 inline-block rounded-full bg-gold px-7 py-3 font-semibold text-ink transition hover:brightness-105"
            >
              Claim your camp →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
