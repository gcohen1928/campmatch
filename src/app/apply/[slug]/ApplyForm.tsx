"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Camp, CampApplication, QuizAnswers } from "@/lib/types";
import { loadAnswers, submitApplication } from "@/lib/answers-store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  EATING_LABELS,
  INTEREST_LABELS,
  MEDICATION_LABELS,
  SUPPORT_LABELS,
} from "@/lib/quiz";

/**
 * One application form for every camp on Camp Matching. No financial
 * questions — camps discuss tuition and aid directly with the family.
 * The family's questionnaire profile rides along so the camp gets real
 * context, not just a name and an email.
 */
export function ApplyForm({ camp }: { camp: Camp }) {
  // Wait for hydration so the saved questionnaire profile can seed the form.
  const hydrated = useHydrated();
  const profile = useMemo(() => (hydrated ? loadAnswers() : null), [hydrated]);
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center text-ink-soft">
        Loading application…
      </div>
    );
  }
  return <ApplyFormInner camp={camp} profile={profile} />;
}

function ApplyFormInner({ camp, profile }: { camp: Camp; profile: QuizAnswers | null }) {
  const [includeProfile, setIncludeProfile] = useState(true);
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState(profile?.childAge ?? 10);
  const [sessionPreference, setSessionPreference] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"editing" | "sending" | "sent">("editing");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentName.trim() || !email.trim() || !childName.trim()) {
      setError("Please fill in your name, email and your camper's name.");
      return;
    }
    setError(null);
    setState("sending");
    const app: CampApplication = {
      campSlug: camp.slug,
      campName: camp.name,
      parentName: parentName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      childName: childName.trim(),
      childAge,
      sessionPreference: sessionPreference.trim(),
      notes: notes.trim(),
      profile: includeProfile ? profile : null,
      submittedAt: new Date().toISOString(),
    };
    const ok = await submitApplication(app);
    if (!ok) {
      setError("Something went wrong sending your application — please try again.");
      setState("editing");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-5xl">📬</div>
        <h1 className="mt-4 text-3xl font-semibold text-ink">
          Application on its way to {camp.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          We&apos;ll deliver it to the camp&apos;s director and they&apos;ll reach out to
          you directly at {email}. Meanwhile: if you haven&apos;t yet, find out when their
          rookie day is — visiting before you commit is the single best predictor of a
          happy summer.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/matches"
            className="rounded-full bg-ember px-8 py-3.5 font-semibold text-white shadow-lift-lg hover:bg-ember-deep"
          >
            Back to my matches
          </Link>
          <Link
            href={`/camps/${camp.slug}`}
            className="rounded-full border-2 border-pine px-8 py-3.5 font-semibold text-pine hover:bg-pine hover:text-cream"
          >
            Back to {camp.name}
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 font-medium text-ink placeholder:text-ink-soft/60 focus:border-ember focus:outline-none";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-ink-soft">
        <Link href={`/camps/${camp.slug}`} className="font-medium text-ember hover:text-ember-deep">
          ← Back to {camp.name}
        </Link>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Apply to {camp.name}
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        One short form — Camp Matching sends it to the camp for you, and the director
        follows up with you directly. No fees, no financial questions.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-semibold text-ink">Parent / guardian name</span>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} className={inputCls} placeholder="Your name" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-semibold text-ink">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-semibold text-ink">
              Phone <span className="font-normal text-ink-soft">(optional)</span>
            </span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="(555) 555-5555" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-semibold text-ink">Camper&apos;s name</span>
            <input value={childName} onChange={(e) => setChildName(e.target.value)} className={inputCls} placeholder="Their name" required />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-semibold text-ink">
            Camper&apos;s age next summer — <span className="text-ember">{childAge}</span>
          </span>
          <input
            type="range"
            min={3}
            max={17}
            value={childAge}
            onChange={(e) => setChildAge(Number(e.target.value))}
            className="w-full accent-ember"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-semibold text-ink">
            Session preference <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input
            value={sessionPreference}
            onChange={(e) => setSessionPreference(e.target.value)}
            className={inputCls}
            placeholder='e.g. "First session, open to a 3+3 split"'
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-semibold text-ink">
            Anything the camp should know? <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={inputCls}
            placeholder="Allergies, friends already at camp, questions for the director…"
          />
        </label>

        {profile && (
          <div className="rounded-2xl border border-pine/20 bg-pine-light/40 p-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={includeProfile}
                onChange={(e) => setIncludeProfile(e.target.checked)}
                className="mt-1 accent-ember"
              />
              <span>
                <span className="font-semibold text-ink">
                  Include our questionnaire profile
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                  Gives the director real context about your camper:{" "}
                  {[
                    `activity level ${profile.activityLevel}/5`,
                    EATING_LABELS[profile.eatingHabits].toLowerCase(),
                    MEDICATION_LABELS[profile.medications].toLowerCase(),
                    profile.interests.slice(0, 3).map((i) => INTEREST_LABELS[i].toLowerCase()).join(", ") || null,
                    profile.hobbies || null,
                    profile.supports.map((s) => SUPPORT_LABELS[s].toLowerCase()).join(", ") || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  .
                </span>
              </span>
            </label>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-ember-deep">{error}</p>}

        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-full bg-ember px-8 py-4 font-semibold text-white shadow-lift-lg transition hover:bg-ember-deep disabled:opacity-60 sm:w-auto"
        >
          {state === "sending" ? "Sending…" : `Send application to ${camp.name} →`}
        </button>
        <p className="text-xs leading-relaxed text-ink-soft">
          We forward your application straight to the camp — Camp Matching never charges
          families, and your details go only to this camp.
        </p>
      </form>
    </div>
  );
}
