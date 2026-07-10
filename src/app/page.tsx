import Link from "next/link";
import { CAMPS } from "@/lib/camps-data";
import { CampArt } from "@/components/CampArt";
import { GENDER_LABELS } from "@/lib/quiz";
import type { Camp } from "@/lib/types";

function money(n: number) {
  return `$${Math.round(n / 100) / 10}k`.replace(".0k", "k");
}

const STEPS = [
  {
    title: "Tell us about your kid",
    body: "Personality, energy, eating habits, hobbies — plus distance, session style and your must-haves. Three minutes flat.",
  },
  {
    title: "We play matchmaker",
    body: "Every camp scored across a dozen compatibility dimensions — the way a seasoned matchmaker weighs an introduction.",
  },
  {
    title: "Meet your matches",
    body: "A ranked list with match percentages, plain-English reasons — and honest flags where it might not fit.",
  },
];

const DIMENSIONS: { label: string; style?: string }[] = [
  { label: "Personality & social style" },
  { label: "Interests & passions", style: "bg-pine text-cream" },
  { label: "Competitive vs. laid-back" },
  { label: "Rustic vs. modern" },
  { label: "Camp size", style: "bg-ember text-white" },
  { label: "Session length" },
  { label: "Distance from home" },
  { label: "Budget", style: "bg-gold text-ink" },
  { label: "Co-ed vs. single gender" },
  { label: "First-time camper support" },
];

// Presentational match percentages + short names + one-line blurbs for the
// featured cards, per the landing design; real scores come from the quiz flow.
const FEATURED: { slug: string; name: string; match: number; blurb: string }[] = [
  {
    slug: "camp-vega",
    name: "Camp Vega",
    match: 96,
    blurb: "A premier all-girls camp on Echo Lake with world-class waterskiing and riding.",
  },
  {
    slug: "french-woods",
    name: "French Woods",
    match: 91,
    blurb: "The best-known performing-arts camp — full musical productions every three weeks.",
  },
  {
    slug: "camp-ihc",
    name: "Camp IHC",
    match: 89,
    blurb: "A design-forward Poconos camp with a huge following and gorgeous grounds.",
  },
];

function FeaturedCampCard({
  camp,
  name,
  match,
  blurb,
}: {
  camp: Camp;
  name: string;
  match: number;
  blurb: string;
}) {
  return (
    <Link
      href={`/camps/${camp.slug}`}
      className="block overflow-hidden rounded-[24px] bg-white shadow-lift transition hover:-translate-y-1 hover:shadow-lift-lg"
    >
      <div className="relative h-[250px]">
        <CampArt camp={camp} className="h-full w-full" />
        <span className="absolute right-4 top-4 rounded-full bg-ember px-4 py-2 text-[13px] font-bold text-white">
          {match}% match
        </span>
      </div>
      <div className="px-[26px] pb-7 pt-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-display text-[23px] font-semibold">{name}</span>
          <span className="shrink-0 text-[13px] text-ink/55">
            {money(camp.tuitionMin)}–{money(camp.tuitionMax)}
          </span>
        </div>
        <div className="mb-3 text-[13px] text-ink/60">
          {camp.city}, {camp.state} · {GENDER_LABELS[camp.gender]} · Ages {camp.ageMin}–{camp.ageMax}
        </div>
        <p className="text-sm leading-[1.6] text-ink/70">{blurb}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const featured = FEATURED.map((f) => ({
    ...f,
    camp: CAMPS.find((c) => c.slug === f.slug),
  })).filter((f): f is typeof f & { camp: Camp } => Boolean(f.camp));
  const heroCamp = featured[0]?.camp;
  const sleepaway = CAMPS.filter((c) => c.type === "sleepaway").length;
  const day = CAMPS.filter((c) => c.type === "day").length;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-14 px-4 pb-16 pt-10 sm:px-6 lg:px-12 lg:grid-cols-[1.15fr_1fr] lg:pb-22 lg:pt-16">
        <div className="animate-rise">
          <p className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-gold/50 bg-white px-[18px] py-2 text-[11.5px] font-semibold uppercase tracking-[0.16em]">
            <span className="h-1.5 w-1.5 rotate-45 bg-gold" aria-hidden />
            Private matchmaking for summer camps
          </p>
          <h1 className="mb-7 font-display text-[44px] font-medium leading-[1.04] tracking-[-0.02em] sm:text-[56px] lg:text-[72px]">
            Find the camp your kid was <span className="italic text-ember">made for.</span>
          </h1>
          <p className="mb-9 max-w-[480px] text-[17.5px] leading-[1.65] text-ink/75">
            Take the 3-minute questionnaire and meet your matches — with a
            percentage, and the honest reasons why.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              href="/quiz"
              className="rounded-full bg-pine px-[34px] py-[19px] text-[15px] font-semibold text-cream shadow-[0_12px_28px_rgba(15,47,35,0.28)] transition-colors hover:bg-ember"
            >
              Take the questionnaire →
            </Link>
            <Link
              href="/camps"
              className="rounded-full border-[1.5px] border-ink/25 px-[30px] py-[19px] text-[15px] font-semibold transition-colors hover:border-ink/50"
            >
              Browse camps
            </Link>
          </div>
          <p className="mt-7 text-[13px] text-ink/55">
            {sleepaway} sleepaway camps · {day} day camps · complimentary for families
          </p>
        </div>
        <div className="relative h-[420px] animate-rise sm:h-[560px]" style={{ animationDelay: "120ms" }}>
          {heroCamp && (
            <div className="absolute right-0 top-0 h-[75%] w-[88%] overflow-hidden rounded-[28px] sm:h-[480px]">
              <CampArt camp={heroCamp} className="h-full w-full" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 w-[280px] rounded-[20px] bg-white p-[22px] px-[26px] shadow-lift-lg">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-display text-[19px] font-semibold">Camp Vega</span>
              <span className="font-display text-[28px] text-ember">96%</span>
            </div>
            <div className="mb-3 h-[7px] rounded-full bg-ink/10">
              <div
                className="h-full w-[96%] rounded-full"
                style={{ background: "linear-gradient(90deg, var(--color-ember), var(--color-gold))" }}
              />
            </div>
            <p className="text-[13px] leading-[1.5] text-ink/70">
              &ldquo;Loves the water, thrives in all-girls settings, ready for 7 weeks.&rdquo;
            </p>
          </div>
          <div className="absolute -left-2 top-9 rounded-full bg-pine px-[22px] py-3 text-[13.5px] font-semibold text-cream shadow-[0_12px_30px_rgba(15,47,35,0.3)]">
            It&apos;s a match <span className="text-gold">✦</span>
          </div>
        </div>
      </section>

      {/* How it works — coral band */}
      <section id="how-it-works" className="bg-ember py-20 text-white">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-12">
          <div className="mb-14 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
            <h2 className="font-display text-[32px] font-medium sm:text-[46px]">
              Matchmaking precision. White-glove care.
            </h2>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
              How it works
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const accent = i === STEPS.length - 1;
              return (
                <div
                  key={step.title}
                  className={`rounded-[24px] px-8 py-9 ${accent ? "bg-pine" : "bg-white/12"}`}
                >
                  <div
                    className={`mb-6 flex h-11 w-11 items-center justify-center rounded-full font-display text-xl font-semibold ${
                      accent ? "bg-gold text-pine" : "bg-white text-ember"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <h3 className="mb-3 font-display text-[25px] font-medium">{step.title}</h3>
                  <p className={`text-[15px] leading-[1.65] ${accent ? "text-cream/85" : "text-white/85"}`}>
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Match dimensions */}
      <section className="mx-auto max-w-[1240px] px-4 py-20 text-center sm:px-6 lg:px-12">
        <h2 className="mb-10 font-display text-[32px] font-medium sm:text-[42px]">
          We match on the things that <span className="italic text-ember">actually matter</span>
        </h2>
        <div className="mx-auto flex max-w-[900px] flex-wrap justify-center gap-3">
          {DIMENSIONS.map((d) => (
            <span
              key={d.label}
              className={`rounded-full px-6 py-[13px] text-[14.5px] font-medium ${
                d.style ?? "border border-ink/14 bg-white"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </section>

      {/* Featured camps */}
      <section className="mx-auto max-w-[1240px] px-4 pb-22 pt-4 sm:px-6 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-display text-[32px] font-medium sm:text-[42px]">From the collection</h2>
          <Link
            href="/camps"
            className="self-start rounded-full border border-ink/14 bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-cream-dark"
          >
            See all {CAMPS.length} →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((f) => (
            <FeaturedCampCard key={f.slug} camp={f.camp} name={f.name} match={f.match} blurb={f.blurb} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-4 pb-22 sm:px-6 lg:px-12">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[32px] bg-pine px-8 py-14 text-cream md:flex-row md:items-center lg:px-16 lg:py-20">
          <div>
            <h2 className="mb-3.5 font-display text-[34px] font-medium leading-[1.08] sm:text-[48px]">
              Ready to meet <span className="italic text-gold">your matches?</span>
            </h2>
            <p className="text-base text-cream/70">
              Complimentary for families. Three minutes. One extraordinary summer.
            </p>
          </div>
          <Link
            href="/quiz"
            className="shrink-0 rounded-full bg-ember px-10 py-5 text-[15px] font-bold text-white shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition-colors hover:bg-gold hover:text-pine"
          >
            Take the questionnaire →
          </Link>
        </div>
      </section>
    </>
  );
}
