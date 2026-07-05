"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Comfort, Interest, QuizAnswers, SupportNeed } from "@/lib/types";
import { STATE_CENTROIDS } from "@/lib/geo";
import {
  COMFORT_EMOJI,
  COMFORT_LABELS,
  DEFAULT_ANSWERS,
  DISTANCE_LABELS,
  EATING_LABELS,
  INTEREST_EMOJI,
  INTEREST_LABELS,
  SUPPORT_LABELS,
} from "@/lib/quiz";
import { recordQuizCompletion, saveAnswers } from "@/lib/answers-store";

/* ── Building blocks ─────────────────────────────────────────────────── */

function OptionCard({
  selected,
  onClick,
  title,
  subtitle,
  emoji,
  compact = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  emoji?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 text-left transition ${
        compact ? "px-4 py-3" : "px-5 py-4"
      } ${
        selected
          ? "border-ember bg-ember/10 shadow-lift"
          : "border-ink/10 bg-white hover:border-pine/40"
      }`}
    >
      <span className="flex items-center gap-3">
        {emoji && <span className="text-2xl">{emoji}</span>}
        <span className="min-w-0">
          <span className={`block font-semibold ${selected ? "text-ember-deep" : "text-ink"}`}>
            {title}
          </span>
          {subtitle && <span className="mt-0.5 block text-sm text-ink-soft">{subtitle}</span>}
        </span>
        <span
          className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
            selected ? "border-ember bg-ember text-white" : "border-ink/20 text-transparent"
          }`}
        >
          ✓
        </span>
      </span>
    </button>
  );
}

function Slider({
  value,
  onChange,
  left,
  right,
}: {
  value: number;
  onChange: (n: number) => void;
  left: string;
  right: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm font-medium text-ink-soft">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} of 5`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={`h-12 rounded-xl border-2 font-display text-lg font-semibold transition ${
              value === n
                ? "border-ember bg-ember text-white shadow-lift"
                : "border-ink/10 bg-white text-ink-soft hover:border-pine/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── The wizard ──────────────────────────────────────────────────────── */

export function QuizWizard() {
  const router = useRouter();
  const [a, setA] = useState<QuizAnswers>(DEFAULT_ANSWERS);
  const [step, setStep] = useState(0);

  const set = <K extends keyof QuizAnswers>(k: K, v: QuizAnswers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const steps = useMemo(() => {
    const isDayOnly = a.campType === "day";
    return [
      {
        key: "child",
        title: "Who are we matching?",
        subtitle: "Tell us about your camper.",
        valid: true,
        body: (
          <div className="space-y-8">
            <div>
              <label className="mb-3 block font-semibold text-ink">
                How old will they be next summer? —{" "}
                <span className="text-ember">{a.childAge}</span>
              </label>
              <input
                type="range"
                min={3}
                max={17}
                value={a.childAge}
                onChange={(e) => set("childAge", Number(e.target.value))}
                className="w-full accent-ember"
              />
              <div className="mt-1 flex justify-between text-xs text-ink-soft">
                <span>3</span><span>10</span><span>17</span>
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">My camper is a…</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard emoji="👦" title="Boy" selected={a.childGender === "boy"} onClick={() => set("childGender", "boy")} compact />
                <OptionCard emoji="👧" title="Girl" selected={a.childGender === "girl"} onClick={() => set("childGender", "girl")} compact />
                <OptionCard emoji="🌈" title="Prefer not to say" selected={a.childGender === "any"} onClick={() => set("childGender", "any")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Would this be their first summer at camp?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard emoji="🐣" title="Yes, first time" subtitle="We'll favor camps famous for welcoming new campers" selected={a.firstTime} onClick={() => set("firstTime", true)} compact />
                <OptionCard emoji="🏕️" title="They're a camp kid already" selected={!a.firstTime} onClick={() => set("firstTime", false)} compact />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "daily",
        title: "Your kid, day to day",
        subtitle: "Energy, appetite and anything the health center should know.",
        valid: true,
        body: (
          <div className="space-y-8">
            <Slider value={a.activityLevel} onChange={(n) => set("activityLevel", n)} left="Mellow — happy with a book" right="In motion all day long" />
            <div>
              <p className="mb-3 font-semibold text-ink">In a brand-new group, your kid…</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard emoji="🚀" title="Jumps right in" subtitle="Makes three friends by lunch" selected={a.socialStyle === "jumps-in"} onClick={() => set("socialStyle", "jumps-in")} compact />
                <OptionCard emoji="🌱" title="Warms up slowly" subtitle="Needs a few days, then blooms" selected={a.socialStyle === "warms-up"} onClick={() => set("socialStyle", "warms-up")} compact />
                <OptionCard emoji="🤝" title="Thrives in small groups" subtitle="A few close friends over a crowd" selected={a.socialStyle === "small-groups"} onClick={() => set("socialStyle", "small-groups")} compact />
                <OptionCard emoji="🎉" title="Loves a big crowd" subtitle="The more the merrier" selected={a.socialStyle === "big-energy"} onClick={() => set("socialStyle", "big-energy")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Eating habits?</p>
              <p className="mb-3 text-sm text-ink-soft">Camp menus vary a lot — this helps us flag what to ask about.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard emoji="😋" title={EATING_LABELS.adventurous} selected={a.eatingHabits === "adventurous"} onClick={() => set("eatingHabits", "adventurous")} compact />
                <OptionCard emoji="🍕" title={EATING_LABELS.typical} selected={a.eatingHabits === "typical"} onClick={() => set("eatingHabits", "typical")} compact />
                <OptionCard emoji="🥪" title={EATING_LABELS.picky} selected={a.eatingHabits === "picky"} onClick={() => set("eatingHabits", "picky")} compact />
                <OptionCard emoji="🍞" title={EATING_LABELS["very-picky"]} subtitle="We'll remind you to ask about menus & alternatives" selected={a.eatingHabits === "very-picky"} onClick={() => set("eatingHabits", "very-picky")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Do they take any medications?</p>
              <p className="mb-3 text-sm text-ink-soft">
                Every camp handles meds differently — some need a doctor on site. We never share this without your say-so.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard title="No" selected={a.medications === "none"} onClick={() => set("medications", "none")} compact />
                <OptionCard title="Occasional / as-needed" subtitle="e.g. an EpiPen or inhaler" selected={a.medications === "occasional"} onClick={() => set("medications", "occasional")} compact />
                <OptionCard title="Daily medication" subtitle="We'll favor camps with stronger medical staffing" selected={a.medications === "daily"} onClick={() => set("medications", "daily")} compact />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "type",
        title: "Day camp or sleepaway?",
        subtitle: "The single biggest fork in the road.",
        valid: true,
        body: (
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <OptionCard emoji="🌙" title="Sleepaway" subtitle="Overnight, weeks at a time" selected={a.campType === "sleepaway"} onClick={() => set("campType", "sleepaway")} />
              <OptionCard emoji="🚌" title="Day camp" subtitle="Home for dinner every night" selected={a.campType === "day"} onClick={() => set("campType", "day")} />
              <OptionCard emoji="🤷" title="Show me both" subtitle="We're still deciding" selected={a.campType === "both"} onClick={() => set("campType", "both")} />
            </div>
            {!isDayOnly && (
              <>
                <div>
                  <p className="mb-3 font-semibold text-ink">How long a session feels right?</p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <OptionCard title="~2 weeks" subtitle="A taste" selected={a.sessionWeeks === "2"} onClick={() => set("sessionWeeks", "2")} compact />
                    <OptionCard title="~4 weeks" subtitle="Half summer" selected={a.sessionWeeks === "4"} onClick={() => set("sessionWeeks", "4")} compact />
                    <OptionCard title="7+ weeks" subtitle="Full summer" selected={a.sessionWeeks === "7"} onClick={() => set("sessionWeeks", "7")} compact />
                    <OptionCard title="Flexible" selected={a.sessionWeeks === "flexible"} onClick={() => set("sessionWeeks", "flexible")} compact />
                  </div>
                </div>
                <div>
                  <p className="mb-3 font-semibold text-ink">Want the option to split the summer?</p>
                  <p className="mb-3 text-sm text-ink-soft">
                    &ldquo;Session camps&rdquo; let kids come for part of the summer (like a 3+3 split); full-summer camps expect everyone to stay the whole time.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionCard emoji="✂️" title="Yes — partial summer should be possible" selected={a.wantsSplitOption} onClick={() => set("wantsSplitOption", true)} compact />
                    <OptionCard emoji="🌞" title="No — full session is fine" selected={!a.wantsSplitOption} onClick={() => set("wantsSplitOption", false)} compact />
                  </div>
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        key: "logistics",
        title: "The practical stuff",
        subtitle: "Where you live and how far you'll go.",
        valid: true,
        body: (
          <div className="space-y-8">
            <div>
              <label htmlFor="homeState" className="mb-3 block font-semibold text-ink">Home state</label>
              <select
                id="homeState"
                value={a.homeState}
                onChange={(e) => set("homeState", e.target.value)}
                className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 font-medium text-ink focus:border-ember focus:outline-none sm:max-w-xs"
              >
                {Object.entries(STATE_CENTROIDS).map(([code, s]) => (
                  <option key={code} value={code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">How far are you willing to travel?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(DISTANCE_LABELS) as (keyof typeof DISTANCE_LABELS)[]).map((k) => (
                  <OptionCard key={k} title={DISTANCE_LABELS[k]} selected={a.maxDistance === k} onClick={() => set("maxDistance", k as QuizAnswers["maxDistance"])} compact />
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "interests",
        title: "What lights them up?",
        subtitle: "Pick up to 5 — the things they'd do all day if you let them.",
        valid: a.interests.length > 0,
        body: (
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
                <OptionCard
                  key={i}
                  emoji={INTEREST_EMOJI[i]}
                  title={INTEREST_LABELS[i]}
                  selected={a.interests.includes(i)}
                  onClick={() =>
                    set(
                      "interests",
                      a.interests.includes(i) || a.interests.length < 5
                        ? toggle(a.interests, i)
                        : a.interests,
                    )
                  }
                  compact
                />
              ))}
            </div>
            <div>
              <label htmlFor="hobbies" className="mb-2 block font-semibold text-ink">
                Any specific hobbies? <span className="font-normal text-ink-soft">(optional)</span>
              </label>
              <p className="mb-3 text-sm text-ink-soft">
                The specifics matter — &ldquo;waterski&rdquo;, &ldquo;ice hockey&rdquo;, &ldquo;ceramics&rdquo;, &ldquo;go-karts&rdquo;. We match these against each camp&apos;s actual activity list.
              </p>
              <input
                id="hobbies"
                type="text"
                value={a.hobbies}
                onChange={(e) => set("hobbies", e.target.value)}
                placeholder="e.g. waterski, hockey, ceramics"
                className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 font-medium text-ink placeholder:text-ink-soft/60 focus:border-ember focus:outline-none"
              />
            </div>
          </div>
        ),
      },
      {
        key: "personality",
        title: "The camp personality you want",
        subtitle: "This is where the matchmaking magic happens.",
        valid: true,
        body: (
          <div className="space-y-8">
            <Slider value={a.competitiveness} onChange={(n) => set("competitiveness", n)} left="Everyone-plays chill" right="Loves to compete" />
            <Slider value={a.structure} onChange={(n) => set("structure", n)} left="Thrives on routine" right="Wants to choose their day" />
            <Slider value={a.vibe} onChange={(n) => set("vibe", n)} left="Rustic & classic" right="Modern comforts" />
            <div>
              <Slider value={a.culture} onChange={(n) => set("culture", n)} left="Down-to-earth crowd" right="Upscale & flashy" />
              <p className="mt-2 text-sm text-ink-soft">
                Be honest — every camp has a social scene, and the right one is the one where your family fits.
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "community",
        title: "The community you want",
        subtitle: "Culture questions — who your kid will be surrounded by.",
        valid: true,
        body: (
          <div className="space-y-8">
            <div>
              <p className="mb-3 font-semibold text-ink">Co-ed or single-gender?</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard title="Co-ed" selected={a.genderPref === "coed"} onClick={() => set("genderPref", "coed")} compact />
                <OptionCard title="Single-gender" selected={a.genderPref === "single"} onClick={() => set("genderPref", "single")} compact />
                <OptionCard title="No preference" selected={a.genderPref === "any"} onClick={() => set("genderPref", "any")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Religious or cultural community?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard title="No preference" selected={a.religious === "any"} onClick={() => set("religious", "any")} compact />
                <OptionCard title="Secular camp, please" selected={a.religious === "none"} onClick={() => set("religious", "none")} compact />
                <OptionCard title="Jewish (cultural)" subtitle="Jewish community, relaxed observance" selected={a.religious === "jewish-cultural"} onClick={() => set("religious", "jewish-cultural")} compact />
                <OptionCard title="Jewish (observant)" subtitle="Kosher & Shabbat required" selected={a.religious === "jewish-observant"} onClick={() => set("religious", "jewish-observant")} compact />
                <OptionCard title="Christian" selected={a.religious === "christian"} onClick={() => set("religious", "christian")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Camp size?</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <OptionCard title="Intimate" subtitle="Under ~250" selected={a.sizePref === "intimate"} onClick={() => set("sizePref", "intimate")} compact />
                <OptionCard title="Medium" subtitle="~250–450" selected={a.sizePref === "medium"} onClick={() => set("sizePref", "medium")} compact />
                <OptionCard title="Big & buzzing" subtitle="450+" selected={a.sizePref === "large"} onClick={() => set("sizePref", "large")} compact />
                <OptionCard title="No preference" selected={a.sizePref === "any"} onClick={() => set("sizePref", "any")} compact />
              </div>
            </div>
            <div>
              <p className="mb-3 font-semibold text-ink">Uniforms?</p>
              <p className="mb-3 text-sm text-ink-soft">Some camps require a uniform (you buy it); others are pack-your-own.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard title="Prefer no uniform" selected={a.uniformPref === "no-uniform"} onClick={() => set("uniformPref", "no-uniform")} compact />
                <OptionCard title="Uniforms are a plus" subtitle="Simpler & less clothing competition" selected={a.uniformPref === "uniform-fine"} onClick={() => set("uniformPref", "uniform-fine")} compact />
                <OptionCard title="No preference" selected={a.uniformPref === "any"} onClick={() => set("uniformPref", "any")} compact />
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "comforts",
        title: "Comforts, logistics & staying in touch",
        subtitle: "The details nobody tells you to ask about — until now.",
        valid: true,
        body: (
          <div className="space-y-8">
            <div>
              <p className="mb-1 font-semibold text-ink">Any absolute must-haves?</p>
              <p className="mb-3 text-sm text-ink-soft">
                For context: most bunks have <em>no</em> AC, weekly laundry is standard at overnight camps, and buses/trunk pickup are common near big metros. Camps confirmed to lack a must-have are filtered out; ones we haven&apos;t compiled yet get flagged so you can ask.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(COMFORT_LABELS) as Comfort[]).map((c) => (
                  <OptionCard
                    key={c}
                    emoji={COMFORT_EMOJI[c]}
                    title={COMFORT_LABELS[c]}
                    selected={a.mustHaves.includes(c)}
                    onClick={() => set("mustHaves", toggle(a.mustHaves, c))}
                    compact
                  />
                ))}
              </div>
            </div>
            {a.campType !== "day" && (
              <>
                <div>
                  <p className="mb-3 font-semibold text-ink">How often do you want to hear their voice?</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <OptionCard emoji="📞" title="Regular calls" subtitle="A few per session" selected={a.phoneCallPref === "frequent"} onClick={() => set("phoneCallPref", "frequent")} compact />
                    <OptionCard emoji="☎️" title="A call or two" subtitle="The typical camp policy" selected={a.phoneCallPref === "occasional"} onClick={() => set("phoneCallPref", "occasional")} compact />
                    <OptionCard emoji="💌" title="Letters are fine" subtitle="They'll be busy anyway" selected={a.phoneCallPref === "letters-fine"} onClick={() => set("phoneCallPref", "letters-fine")} compact />
                  </div>
                </div>
                <div>
                  <p className="mb-3 font-semibold text-ink">Visiting day?</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <OptionCard title="A must" selected={a.visitingDayPref === "must"} onClick={() => set("visitingDayPref", "must")} compact />
                    <OptionCard title="Nice to have" selected={a.visitingDayPref === "nice"} onClick={() => set("visitingDayPref", "nice")} compact />
                    <OptionCard title="No preference" selected={a.visitingDayPref === "any"} onClick={() => set("visitingDayPref", "any")} compact />
                  </div>
                </div>
              </>
            )}
            <div>
              <p className="mb-3 font-semibold text-ink">Anything the camp should be ready to support?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(SUPPORT_LABELS) as SupportNeed[]).map((s) => (
                  <OptionCard key={s} title={SUPPORT_LABELS[s]} selected={a.supports.includes(s)} onClick={() => set("supports", toggle(a.supports, s))} compact />
                ))}
              </div>
            </div>
          </div>
        ),
      },
    ];
  }, [a]);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  function finish() {
    saveAnswers(a);
    recordQuizCompletion(a);
    router.push("/matches");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-ember">
            Step {step + 1} of {steps.length}
          </p>
          <p className="text-sm text-ink-soft">The Camp Matching Questionnaire</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-ember transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div key={current.key} className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {current.title}
        </h1>
        <p className="mt-2 text-lg text-ink-soft">{current.subtitle}</p>
        <div className="mt-8">{current.body}</div>
      </div>

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-full px-5 py-3 font-semibold text-ink-soft transition hover:text-ink disabled:invisible"
        >
          ← Back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="rounded-full bg-ember px-8 py-3.5 font-semibold text-white shadow-lift-lg transition hover:bg-ember-deep"
          >
            See my top matches 💘
          </button>
        ) : (
          <button
            type="button"
            onClick={() => current.valid && setStep((s) => s + 1)}
            disabled={!current.valid}
            className="rounded-full bg-pine px-8 py-3.5 font-semibold text-cream transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        )}
      </div>
      {!current.valid && (
        <p className="mt-3 text-right text-sm text-ink-soft">Pick at least one to continue.</p>
      )}
    </div>
  );
}
