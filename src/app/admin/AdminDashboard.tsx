"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CAMPS } from "@/lib/camps-data";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";
import { loadQuizCompletions } from "@/lib/answers-store";
import { matchCamps, MATCHING_WEIGHTS, passesHardFilters } from "@/lib/matching";
import { STATE_CENTROIDS } from "@/lib/geo";
import {
  BUDGET_LABELS,
  DISTANCE_LABELS,
  GENDER_LABELS,
  INTEREST_LABELS,
  RELIGIOUS_LABELS,
  SUPPORT_LABELS,
} from "@/lib/quiz";
import type {
  Camp,
  Interest,
  QuizAnswers,
  Religious,
  SupportNeed,
} from "@/lib/types";

/* ── Types & constants ───────────────────────────────────────────────── */

type Tab = "overview" | "forms" | "camps" | "matching";
type FormStatus = "pending" | "approved" | "rejected";

interface AdminCamp extends Camp {
  source: string;
}

interface ClaimRow {
  id: string;
  campName: string;
  contactEmail: string;
  role: string;
  status: FormStatus;
  createdAt: string;
}

interface SubmissionRow {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  website: string;
  contactEmail: string;
  status: FormStatus;
  createdAt: string;
}

interface QuizRow {
  id: string;
  answers: QuizAnswers;
  createdAt: string;
}

const DEMO_SUBMISSIONS_KEY = "campmatch.portal.demo-submissions";
const DEMO_CAMPS_KEY = "campmatch.admin.demo-camps";

const REGIONS = ["northeast", "mid-atlantic", "south", "midwest", "west"] as const;

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "forms", label: "Forms" },
  { key: "camps", label: "Camps" },
  { key: "matching", label: "Matching engine" },
];

function inputCls(extra = "") {
  return `w-full rounded-xl border-2 border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-ember focus:outline-none ${extra}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        ", " +
        d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Small UI pieces ─────────────────────────────────────────────────── */

function Notice({ tone, children }: { tone: "ok" | "info" | "err"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-pine/30 bg-pine-light text-pine"
      : tone === "err"
        ? "border-ember/40 bg-ember/10 text-ember-deep"
        : "border-gold/50 bg-gold/10 text-ink";
  return <div className={`rounded-xl border p-4 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

function StatusBadge({ status }: { status: FormStatus }) {
  const cls =
    status === "approved"
      ? "bg-pine-light text-pine"
      : status === "rejected"
        ? "bg-ember/10 text-ember-deep"
        : "bg-gold/20 text-ink";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-lift">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink/10 bg-white p-6 shadow-lift sm:p-8">
      <h2 className="text-xl font-semibold text-pine">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ModerateButtons({
  status,
  onChange,
}: {
  status: FormStatus;
  onChange: (s: FormStatus) => void;
}) {
  if (status !== "pending") {
    return (
      <button
        onClick={() => onChange("pending")}
        className="text-xs font-semibold text-ink-soft underline hover:text-ink"
      >
        Reopen
      </button>
    );
  }
  return (
    <span className="flex gap-2">
      <button
        onClick={() => onChange("approved")}
        className="rounded-full bg-pine px-3 py-1 text-xs font-semibold text-cream hover:bg-pine-deep"
      >
        Approve
      </button>
      <button
        onClick={() => onChange("rejected")}
        className="rounded-full border border-ember/40 px-3 py-1 text-xs font-semibold text-ember-deep hover:bg-ember/10"
      >
        Reject
      </button>
    </span>
  );
}

/* ── Data mapping ────────────────────────────────────────────────────── */

interface DbCampRow {
  slug: string;
  name: string;
  type: Camp["type"];
  city: string;
  state: string;
  region: Camp["region"];
  lat: number | null;
  lng: number | null;
  age_min: number;
  age_max: number;
  gender: Camp["gender"];
  session_weeks: number[] | null;
  tuition_min: number | null;
  tuition_max: number | null;
  size: number | null;
  founded: number | null;
  interests: Interest[] | null;
  vibe: number | null;
  competitiveness: number | null;
  structure: number | null;
  religious: Religious;
  supports: SupportNeed[] | null;
  first_time_friendly: boolean;
  aca_accredited: boolean;
  description: string | null;
  website: string | null;
  claimed: boolean;
  verified: boolean;
  source: string | null;
}

function dbCampToAdminCamp(row: DbCampRow): AdminCamp {
  return {
    slug: row.slug,
    name: row.name,
    type: row.type,
    city: row.city,
    state: row.state,
    region: row.region,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    ageMin: row.age_min,
    ageMax: row.age_max,
    gender: row.gender,
    sessionWeeks: (row.session_weeks ?? []).map(Number),
    tuitionMin: row.tuition_min ?? 0,
    tuitionMax: row.tuition_max ?? 0,
    size: row.size ?? 0,
    founded: row.founded ?? undefined,
    interests: row.interests ?? [],
    vibe: row.vibe ?? 3,
    competitiveness: row.competitiveness ?? 3,
    structure: row.structure ?? 3,
    religious: row.religious,
    supports: row.supports ?? [],
    firstTimeFriendly: row.first_time_friendly,
    acaAccredited: row.aca_accredited,
    description: row.description ?? "",
    website: row.website ?? "",
    claimed: row.claimed,
    verified: row.verified,
    source: row.source ?? "db",
  };
}

interface DemoPortalRecord {
  table: "camp_claims" | "camp_submissions";
  payload: Record<string, string>;
  at: string;
  status?: FormStatus;
}

function loadDemoPortalRecords(): DemoPortalRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_SUBMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as DemoPortalRecord[]) : [];
  } catch {
    return [];
  }
}

function loadDemoCamps(): AdminCamp[] {
  try {
    const raw = localStorage.getItem(DEMO_CAMPS_KEY);
    return raw ? (JSON.parse(raw) as AdminCamp[]) : [];
  } catch {
    return [];
  }
}

/* ── Quiz answer rendering ───────────────────────────────────────────── */

function quizSummary(a: QuizAnswers) {
  return [
    `Age ${a.childAge}`,
    a.childGender === "any" ? null : a.childGender === "boy" ? "boy" : "girl",
    a.campType === "both" ? "day or sleepaway" : `${a.campType} camp`,
    `from ${a.homeState}`,
    BUDGET_LABELS[a.budget],
  ]
    .filter(Boolean)
    .join(" · ");
}

function QuizAnswerDetail({ a }: { a: QuizAnswers }) {
  const rows: [string, string][] = [
    ["Child", `${a.childAge} years old${a.childGender === "any" ? "" : `, ${a.childGender}`}`],
    ["Camp type", a.campType === "both" ? "Open to both" : a.campType],
    ["Session length", a.sessionWeeks ? (a.sessionWeeks === "flexible" ? "Flexible" : `~${a.sessionWeeks} weeks`) : "—"],
    ["Home state", STATE_CENTROIDS[a.homeState]?.name ?? a.homeState],
    ["Distance", DISTANCE_LABELS[a.maxDistance]],
    ["Budget", BUDGET_LABELS[a.budget]],
    ["Interests", a.interests.length ? a.interests.map((i) => INTEREST_LABELS[i]).join(", ") : "None picked"],
    ["Social style", a.socialStyle.replace(/-/g, " ")],
    ["Vibe / Competitive / Structure", `${a.vibe} / ${a.competitiveness} / ${a.structure} (1–5)`],
    ["Gender preference", a.genderPref === "any" ? "No preference" : a.genderPref],
    ["Community", a.religious === "any" ? "No preference" : RELIGIOUS_LABELS[a.religious]],
    ["Camp size", a.sizePref === "any" ? "No preference" : a.sizePref],
    ["First-time camper", a.firstTime ? "Yes" : "No"],
    ["Support needs", a.supports.length ? a.supports.map((s) => SUPPORT_LABELS[s]).join(", ") : "None"],
  ];
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="shrink-0 font-semibold text-ink-soft">{label}:</dt>
          <dd className="text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Main dashboard ──────────────────────────────────────────────────── */

export function AdminDashboard() {
  // null = still checking; in demo mode access is immediate.
  const [access, setAccess] = useState<"checking" | "signin" | "denied" | "granted">(
    supabaseEnabled ? "checking" : "granted",
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dbCamps, setDbCamps] = useState<AdminCamp[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  /* Merge bundled seed camps with DB/demo camps; DB wins on slug clash. */
  const allCamps = useMemo<AdminCamp[]>(() => {
    const extra = new Map(dbCamps.map((c) => [c.slug, c]));
    const seeds: AdminCamp[] = CAMPS.filter((c) => !extra.has(c.slug)).map((c) => ({
      ...c,
      source: "seed",
    }));
    return [...dbCamps, ...seeds].sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCamps]);

  /* Access check (Supabase mode). */
  useEffect(() => {
    if (!supabaseEnabled) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setAccess("signin");
        return;
      }
      setUserEmail(data.user.email ?? null);
      const { data: adminRow } = await sb
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      setAccess(adminRow ? "granted" : "denied");
    });
  }, []);

  /* Data load once access is granted. */
  useEffect(() => {
    if (access !== "granted") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      const sb = getSupabase();
      if (sb) {
        const [campsRes, claimsRes, subsRes, quizRes] = await Promise.all([
          sb.from("camps").select("*").order("name"),
          sb.from("camp_claims").select("*").order("created_at", { ascending: false }),
          sb.from("camp_submissions").select("*").order("created_at", { ascending: false }),
          sb.from("quiz_results").select("*").order("created_at", { ascending: false }),
        ]);
        if (cancelled) return;
        const firstError =
          campsRes.error ?? claimsRes.error ?? subsRes.error ?? quizRes.error;
        if (firstError) setLoadError(firstError.message);
        setDbCamps(((campsRes.data ?? []) as DbCampRow[]).map(dbCampToAdminCamp));
        setClaims(
          (claimsRes.data ?? []).map((r) => ({
            id: String(r.id),
            campName: r.camp_name,
            contactEmail: r.contact_email,
            role: r.role_at_camp ?? "",
            status: r.status as FormStatus,
            createdAt: r.created_at,
          })),
        );
        setSubmissions(
          (subsRes.data ?? []).map((r) => ({
            id: String(r.id),
            name: r.name,
            type: r.type,
            city: r.city,
            state: r.state,
            website: r.website ?? "",
            contactEmail: r.contact_email,
            status: r.status as FormStatus,
            createdAt: r.created_at,
          })),
        );
        setQuizzes(
          (quizRes.data ?? []).map((r) => ({
            id: String(r.id),
            answers: r.answers as QuizAnswers,
            createdAt: r.created_at,
          })),
        );
      } else {
        // Demo mode: everything lives in this browser.
        const records = loadDemoPortalRecords();
        setDbCamps(loadDemoCamps());
        setClaims(
          records
            .filter((r) => r.table === "camp_claims")
            .map((r, i) => ({
              id: `demo-${i}`,
              campName: r.payload.camp_name ?? "",
              contactEmail: r.payload.contact_email ?? "",
              role: r.payload.role_at_camp ?? "",
              status: r.status ?? "pending",
              createdAt: r.at,
            })),
        );
        setSubmissions(
          records
            .filter((r) => r.table === "camp_submissions")
            .map((r, i) => ({
              id: `demo-${i}`,
              name: r.payload.name ?? "",
              type: r.payload.type ?? "",
              city: r.payload.city ?? "",
              state: r.payload.state ?? "",
              website: r.payload.website ?? "",
              contactEmail: r.payload.contact_email ?? "",
              status: r.status ?? "pending",
              createdAt: r.at,
            })),
        );
        setQuizzes(
          loadQuizCompletions()
            .map((c, i) => ({ id: `demo-${i}`, answers: c.answers, createdAt: c.at }))
            .reverse(),
        );
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [access]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthMsg(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUserEmail(data.user?.email ?? email);
      const { data: adminRow } = await sb
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user!.id)
        .maybeSingle();
      setAccess(adminRow ? "granted" : "denied");
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUserEmail(null);
    setAccess(supabaseEnabled ? "signin" : "granted");
  }

  /* Moderation: update a claim/submission status in DB or demo storage. */
  async function moderate(
    kind: "claim" | "submission",
    id: string,
    status: FormStatus,
  ) {
    const sb = getSupabase();
    if (sb) {
      const table = kind === "claim" ? "camp_claims" : "camp_submissions";
      const { error } = await sb.from(table).update({ status }).eq("id", id);
      if (error) {
        setLoadError(error.message);
        return;
      }
    } else {
      // Demo: ids are demo-<index within that table's records>.
      const idx = Number(id.replace("demo-", ""));
      const records = loadDemoPortalRecords();
      const table = kind === "claim" ? "camp_claims" : "camp_submissions";
      let seen = -1;
      for (const rec of records) {
        if (rec.table !== table) continue;
        seen += 1;
        if (seen === idx) {
          rec.status = status;
          break;
        }
      }
      try {
        localStorage.setItem(DEMO_SUBMISSIONS_KEY, JSON.stringify(records));
      } catch {}
    }
    if (kind === "claim") {
      setClaims((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    } else {
      setSubmissions((ss) => ss.map((s) => (s.id === id ? { ...s, status } : s)));
    }
  }

  async function addCamp(camp: AdminCamp): Promise<string | null> {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("camps").insert({
        slug: camp.slug,
        name: camp.name,
        type: camp.type,
        city: camp.city,
        state: camp.state,
        region: camp.region,
        lat: camp.lat || null,
        lng: camp.lng || null,
        age_min: camp.ageMin,
        age_max: camp.ageMax,
        gender: camp.gender,
        session_weeks: camp.sessionWeeks,
        tuition_min: camp.tuitionMin || null,
        tuition_max: camp.tuitionMax || null,
        size: camp.size || null,
        founded: camp.founded ?? null,
        interests: camp.interests,
        vibe: camp.vibe,
        competitiveness: camp.competitiveness,
        structure: camp.structure,
        religious: camp.religious,
        supports: camp.supports,
        first_time_friendly: camp.firstTimeFriendly,
        aca_accredited: camp.acaAccredited,
        description: camp.description || null,
        website: camp.website || null,
        source: "admin",
      });
      if (error) return error.message;
    } else {
      const demoCamps = [...loadDemoCamps(), camp];
      try {
        localStorage.setItem(DEMO_CAMPS_KEY, JSON.stringify(demoCamps));
      } catch {}
    }
    setDbCamps((cs) => [...cs, camp]);
    return null;
  }

  /* ── Access states ─────────────────────────────────────────────────── */

  if (access === "checking") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-ink-soft sm:px-6">
        Checking admin access…
      </div>
    );
  }

  if (access === "signin" || access === "denied") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Admin sign-in</h1>
        {access === "denied" ? (
          <div className="mt-6 space-y-4">
            <Notice tone="err">
              {userEmail ? (
                <>
                  <strong>{userEmail}</strong>{" "}
                  is signed in but isn&apos;t an admin. Add the
                  account to the <code>admins</code> table (see{" "}
                  <code>supabase/migrations/0002_admin.sql</code>) to grant access.
                </>
              ) : (
                "This account doesn't have admin access."
              )}
            </Notice>
            <button
              onClick={signOut}
              className="rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="mt-6 space-y-3">
            <p className="text-sm text-ink-soft">
              Admin accounts are provisioned by hand — sign in with an account listed in the{" "}
              <code>admins</code> table.
            </p>
            <input
              type="email"
              required
              placeholder="you@campmatch.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls()}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls()}
            />
            <button
              disabled={busy}
              className="rounded-full bg-ember px-6 py-2.5 font-semibold text-white transition hover:bg-ember-deep disabled:opacity-50"
            >
              Sign in
            </button>
            {authMsg && <Notice tone="err">{authMsg}</Notice>}
          </form>
        )}
      </div>
    );
  }

  /* ── Dashboard ─────────────────────────────────────────────────────── */

  const pendingClaims = claims.filter((c) => c.status === "pending").length;
  const pendingSubs = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-ember">CampMatch admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Operations dashboard
          </h1>
        </div>
        {supabaseEnabled && userEmail && (
          <p className="text-sm text-ink-soft">
            {userEmail} ·{" "}
            <button onClick={signOut} className="font-semibold underline hover:text-ink">
              sign out
            </button>
          </p>
        )}
      </div>

      {!supabaseEnabled && (
        <div className="mt-6">
          <Notice tone="info">
            <strong>Preview mode:</strong>{" "}
            the database isn&apos;t connected, so this dashboard
            shows the bundled seed camps plus forms and camps stored in this browser. Connect
            Supabase and apply <code>supabase/migrations/0002_admin.sql</code> to require admin
            sign-in and see real data.
          </Notice>
        </div>
      )}
      {loadError && (
        <div className="mt-6">
          <Notice tone="err">Some data failed to load: {loadError}</Notice>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-pine text-cream" : "bg-white text-ink-soft hover:text-pine"
            }`}
          >
            {t.label}
            {t.key === "forms" && pendingClaims + pendingSubs > 0 && (
              <span className="ml-2 rounded-full bg-ember px-2 py-0.5 text-xs text-white">
                {pendingClaims + pendingSubs}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="py-10 text-center text-ink-soft">Loading…</p>
        ) : tab === "overview" ? (
          <OverviewTab
            camps={allCamps}
            claims={claims}
            submissions={submissions}
            quizzes={quizzes}
            onGoTo={setTab}
          />
        ) : tab === "forms" ? (
          <FormsTab
            claims={claims}
            submissions={submissions}
            quizzes={quizzes}
            onModerate={moderate}
          />
        ) : tab === "camps" ? (
          <CampsTab camps={allCamps} onAdd={addCamp} />
        ) : (
          <MatchingTab camps={allCamps} />
        )}
      </div>
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────────────── */

function OverviewTab({
  camps,
  claims,
  submissions,
  quizzes,
  onGoTo,
}: {
  camps: AdminCamp[];
  claims: ClaimRow[];
  submissions: SubmissionRow[];
  quizzes: QuizRow[];
  onGoTo: (t: Tab) => void;
}) {
  const pending =
    claims.filter((c) => c.status === "pending").length +
    submissions.filter((s) => s.status === "pending").length;

  const recent = [
    ...quizzes.map((q) => ({ at: q.createdAt, text: `Quiz completed — ${quizSummary(q.answers)}` })),
    ...claims.map((c) => ({ at: c.createdAt, text: `Claim for ${c.campName} (${c.contactEmail})` })),
    ...submissions.map((s) => ({ at: s.createdAt, text: `New listing submitted: ${s.name} (${s.city}, ${s.state})` })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Camps listed" value={camps.length} hint={`${camps.filter((c) => c.source !== "seed").length} beyond the seed set`} />
        <StatTile label="Quiz forms completed" value={quizzes.length} />
        <StatTile label="Claims received" value={claims.length} hint={`${claims.filter((c) => c.status === "pending").length} pending review`} />
        <StatTile label="Listing submissions" value={submissions.length} hint={`${submissions.filter((s) => s.status === "pending").length} pending review`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Verified camps" value={camps.filter((c) => c.verified).length} />
        <StatTile label="Claimed camps" value={camps.filter((c) => c.claimed).length} />
        <StatTile label="Pending moderation" value={pending} />
      </div>
      <SectionCard title="Recent activity" subtitle="Latest forms across quizzes, claims and submissions.">
        {recent.length === 0 ? (
          <p className="text-sm text-ink-soft">No forms yet. Completed quizzes and camp-portal submissions will show up here.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {recent.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                <span className="text-ink">{r.text}</span>
                <span className="shrink-0 text-xs text-ink-soft">{fmtDate(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
        {pending > 0 && (
          <button onClick={() => onGoTo("forms")} className="mt-4 text-sm font-semibold text-ember hover:text-ember-deep">
            Review {pending} pending form{pending === 1 ? "" : "s"} →
          </button>
        )}
      </SectionCard>
    </>
  );
}

/* ── Forms ───────────────────────────────────────────────────────────── */

function FormsTab({
  claims,
  submissions,
  quizzes,
  onModerate,
}: {
  claims: ClaimRow[];
  submissions: SubmissionRow[];
  quizzes: QuizRow[];
  onModerate: (kind: "claim" | "submission", id: string, status: FormStatus) => void;
}) {
  return (
    <>
      <SectionCard
        title={`Quiz forms (${quizzes.length})`}
        subtitle="Every completed parent match quiz, newest first."
      >
        {quizzes.length === 0 ? (
          <p className="text-sm text-ink-soft">No completed quizzes yet.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {quizzes.map((q) => (
              <li key={q.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">{quizSummary(q.answers)}</span>
                    <span className="shrink-0 text-xs text-ink-soft">{fmtDate(q.createdAt)}</span>
                  </summary>
                  <QuizAnswerDetail a={q.answers} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={`Listing claims (${claims.length})`}
        subtitle="Camp operators requesting ownership of an existing listing."
      >
        {claims.length === 0 ? (
          <p className="text-sm text-ink-soft">No claims yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Camp</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b border-ink/5">
                    <td className="py-2.5 pr-4 font-medium text-ink">{c.campName}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{c.contactEmail}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{c.role || "—"}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{fmtDate(c.createdAt)}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-2.5">
                      <ModerateButtons status={c.status} onChange={(s) => onModerate("claim", c.id, s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={`New listing submissions (${submissions.length})`}
        subtitle="Brand-new camps submitted through the camp portal. Approve, then add them to the directory from the Camps tab."
      >
        {submissions.length === 0 ? (
          <p className="text-sm text-ink-soft">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Camp</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-ink/5">
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      {s.website ? (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-ember">
                          {s.name} ↗
                        </a>
                      ) : (
                        s.name
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-soft">{s.city}, {s.state}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{s.type}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{s.contactEmail}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{fmtDate(s.createdAt)}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={s.status} /></td>
                    <td className="py-2.5">
                      <ModerateButtons status={s.status} onChange={(st) => onModerate("submission", s.id, st)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}

/* ── Camps ───────────────────────────────────────────────────────────── */

const EMPTY_CAMP_FORM = {
  name: "",
  type: "sleepaway" as Camp["type"],
  city: "",
  state: "NJ",
  region: "northeast" as Camp["region"],
  ageMin: 7,
  ageMax: 15,
  gender: "coed" as Camp["gender"],
  sessionWeeks: "7",
  tuitionMin: "",
  tuitionMax: "",
  size: "",
  founded: "",
  interests: [] as Interest[],
  vibe: 3,
  competitiveness: 3,
  structure: 3,
  religious: "none" as Religious,
  supports: [] as SupportNeed[],
  firstTimeFriendly: true,
  acaAccredited: false,
  description: "",
  website: "",
};

function CampsTab({
  camps,
  onAdd,
}: {
  camps: AdminCamp[];
  onAdd: (camp: AdminCamp) => Promise<string | null>;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | Camp["type"]>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_CAMP_FORM);
  const [formMsg, setFormMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return camps.filter(
      (c) =>
        (typeFilter === "all" || c.type === typeFilter) &&
        (!needle ||
          c.name.toLowerCase().includes(needle) ||
          c.city.toLowerCase().includes(needle) ||
          c.state.toLowerCase().includes(needle)),
    );
  }, [camps, query, typeFilter]);

  const set = <K extends keyof typeof EMPTY_CAMP_FORM>(k: K, v: (typeof EMPTY_CAMP_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleIn = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    setSaving(true);
    try {
      const weeks = form.sessionWeeks
        .split(",")
        .map((w) => Number(w.trim()))
        .filter((w) => !isNaN(w) && w > 0);
      if (weeks.length === 0) {
        setFormMsg({ tone: "err", text: "Enter at least one session length in weeks (e.g. 2, 4, 7)." });
        return;
      }
      const base = slugify(form.name);
      let slug = base;
      for (let n = 2; camps.some((c) => c.slug === slug); n++) slug = `${base}-${n}`;

      const centroid = STATE_CENTROIDS[form.state];
      const camp: AdminCamp = {
        slug,
        name: form.name.trim(),
        type: form.type,
        city: form.city.trim(),
        state: form.state,
        region: form.region,
        lat: centroid?.lat ?? 0,
        lng: centroid?.lng ?? 0,
        ageMin: form.ageMin,
        ageMax: form.ageMax,
        gender: form.gender,
        sessionWeeks: weeks,
        tuitionMin: Number(form.tuitionMin) || 0,
        tuitionMax: Number(form.tuitionMax) || Number(form.tuitionMin) || 0,
        size: Number(form.size) || 0,
        founded: Number(form.founded) || undefined,
        interests: form.interests,
        vibe: form.vibe,
        competitiveness: form.competitiveness,
        structure: form.structure,
        religious: form.religious,
        supports: form.supports,
        firstTimeFriendly: form.firstTimeFriendly,
        acaAccredited: form.acaAccredited,
        description: form.description.trim(),
        website: form.website.trim(),
        claimed: false,
        verified: false,
        source: "admin",
      };
      const err = await onAdd(camp);
      if (err) {
        setFormMsg({ tone: "err", text: err });
      } else {
        setFormMsg({ tone: "ok", text: `${camp.name} added to the directory as “${slug}”.` });
        setForm(EMPTY_CAMP_FORM);
      }
    } finally {
      setSaving(false);
    }
  }

  const scaleField = (
    label: string,
    key: "vibe" | "competitiveness" | "structure",
    left: string,
    right: string,
  ) => (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink">
        {label} — <span className="text-ember">{form[key]}</span>
      </label>
      <input
        type="range"
        min={1}
        max={5}
        value={form[key]}
        onChange={(e) => set(key, Number(e.target.value))}
        className="w-full accent-ember"
      />
      <div className="flex justify-between text-xs text-ink-soft">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );

  return (
    <>
      <SectionCard
        title={`Camp directory (${camps.length})`}
        subtitle="Seed camps ship with the app; admin- and DB-added camps are listed with their source."
      >
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search by name, city or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputCls("max-w-xs")}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | Camp["type"])}
            className={inputCls("max-w-[180px]")}
          >
            <option value="all">All types</option>
            <option value="sleepaway">Sleepaway</option>
            <option value="day">Day</option>
          </select>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="ml-auto rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ember-deep"
          >
            {showForm ? "Hide form" : "+ Add a camp"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <th className="py-2 pr-4">Camp</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Ages</th>
                <th className="py-2 pr-4">Tuition</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.slug} className="border-b border-ink/5">
                  <td className="py-2.5 pr-4 font-medium text-ink">
                    {/* Only seed camps have a static detail page to link to. */}
                    {CAMPS.some((seed) => seed.slug === c.slug) ? (
                      <Link href={`/camps/${c.slug}`} className="hover:text-ember">
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.city}, {c.state}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.type}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.ageMin}–{c.ageMax}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {c.tuitionMin ? `$${c.tuitionMin.toLocaleString()}–$${c.tuitionMax.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.size ? `~${c.size}` : "—"}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.source}</td>
                  <td className="py-2.5">
                    {c.verified ? (
                      <span className="text-xs font-semibold text-pine">✓ Verified</span>
                    ) : c.claimed ? (
                      <span className="text-xs font-semibold text-sky-deep">Claimed</span>
                    ) : (
                      <span className="text-xs text-ink-soft">Unclaimed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-ink-soft">
                    No camps match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {showForm && (
        <SectionCard
          title="Add a new camp"
          subtitle="Creates a full match profile immediately — unlike portal submissions, no review step."
        >
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="Camp name" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls("sm:col-span-2")} />
            <select value={form.type} onChange={(e) => set("type", e.target.value as Camp["type"])} className={inputCls()}>
              <option value="sleepaway">Sleepaway camp</option>
              <option value="day">Day camp</option>
            </select>
            <input placeholder="Website (https://…)" type="url" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls()} />
            <input required placeholder="City / town" value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls()} />
            <select value={form.state} onChange={(e) => set("state", e.target.value)} className={inputCls()}>
              {Object.entries(STATE_CENTROIDS).map(([code, s]) => (
                <option key={code} value={code}>{s.name}</option>
              ))}
            </select>
            <select value={form.region} onChange={(e) => set("region", e.target.value as Camp["region"])} className={inputCls()}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>Region: {r}</option>
              ))}
            </select>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value as Camp["gender"])} className={inputCls()}>
              {Object.entries(GENDER_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Age min</span>
                <input type="number" min={3} max={17} value={form.ageMin} onChange={(e) => set("ageMin", Number(e.target.value))} className={inputCls()} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Age max</span>
                <input type="number" min={3} max={18} value={form.ageMax} onChange={(e) => set("ageMax", Number(e.target.value))} className={inputCls()} />
              </label>
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Session lengths (weeks, comma-separated)</span>
              <input required placeholder="e.g. 2, 4, 7" value={form.sessionWeeks} onChange={(e) => set("sessionWeeks", e.target.value)} className={inputCls()} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Tuition min ($)</span>
                <input type="number" min={0} value={form.tuitionMin} onChange={(e) => set("tuitionMin", e.target.value)} className={inputCls()} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Tuition max ($)</span>
                <input type="number" min={0} value={form.tuitionMax} onChange={(e) => set("tuitionMax", e.target.value)} className={inputCls()} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Campers on site</span>
                <input type="number" min={0} value={form.size} onChange={(e) => set("size", e.target.value)} className={inputCls()} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Founded (year)</span>
                <input type="number" min={1800} max={2100} value={form.founded} onChange={(e) => set("founded", e.target.value)} className={inputCls()} />
              </label>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-semibold text-ink">Program strengths</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set("interests", toggleIn(form.interests, i))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      form.interests.includes(i)
                        ? "border-pine bg-pine text-cream"
                        : "border-ink/15 bg-white text-ink-soft hover:border-pine/40"
                    }`}
                  >
                    {INTEREST_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>

            {scaleField("Vibe", "vibe", "Rustic & classic", "Modern comforts")}
            {scaleField("Competitiveness", "competitiveness", "Laid-back", "Highly competitive")}
            {scaleField("Structure", "structure", "Fully scheduled", "Kids choose")}
            <select value={form.religious} onChange={(e) => set("religious", e.target.value as Religious)} className={inputCls("self-end")}>
              {Object.entries(RELIGIOUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-semibold text-ink">Support programs</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SUPPORT_LABELS) as SupportNeed[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("supports", toggleIn(form.supports, s))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      form.supports.includes(s)
                        ? "border-pine bg-pine text-cream"
                        : "border-ink/15 bg-white text-ink-soft hover:border-pine/40"
                    }`}
                  >
                    {SUPPORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={form.firstTimeFriendly} onChange={(e) => set("firstTimeFriendly", e.target.checked)} className="accent-ember" />
              First-time-camper friendly
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={form.acaAccredited} onChange={(e) => set("acaAccredited", e.target.checked)} className="accent-ember" />
              ACA accredited
            </label>

            <textarea
              placeholder="One paragraph about the camp"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={inputCls("sm:col-span-2")}
            />

            <div className="sm:col-span-2">
              <button
                disabled={saving}
                className="rounded-full bg-ember px-6 py-3 font-semibold text-white transition hover:bg-ember-deep disabled:opacity-50"
              >
                Add camp to directory
              </button>
            </div>
            {formMsg && (
              <div className="sm:col-span-2">
                <Notice tone={formMsg.tone}>{formMsg.text}</Notice>
              </div>
            )}
          </form>
        </SectionCard>
      )}
    </>
  );
}

/* ── Matching engine ─────────────────────────────────────────────────── */

const WEIGHT_ROWS: { key: keyof typeof MATCHING_WEIGHTS; label: string; note: string }[] = [
  { key: "interests", label: "Interests overlap", note: "Shared activities between the child and the camp — the heaviest signal." },
  { key: "sessionLength", label: "Session length", note: "Only scored for sleepaway seekers with a session preference." },
  { key: "distance", label: "Distance from home", note: "Only scored when the home state is known; camps >125% over the cap are dropped." },
  { key: "vibe", label: "Vibe (rustic ↔ modern)", note: "1–5 scale closeness between family preference and camp." },
  { key: "competitiveness", label: "Competitiveness", note: "1–5 scale closeness; a camp 3+ points more intense gets a caution." },
  { key: "religious", label: "Community / religious fit", note: "Exact community matches score highest; mismatches are penalized." },
  { key: "supports", label: "Support needs", note: "Only scored when soft support needs are flagged (allergies, ADHD, anxiety)." },
  { key: "budget", label: "Budget", note: "Camps starting >20% over the budget cap are dropped entirely." },
  { key: "structure", label: "Structure (scheduled ↔ elective)", note: "1–5 scale closeness." },
  { key: "sizeSocial", label: "Camp size × social style", note: "Size preference, nudged by the child's social style." },
  { key: "firstTime", label: "First-time camper fit", note: "Only scored for first-timers; rewards intro programs and shorter starter sessions." },
];

const HARD_FILTERS = [
  "Camp type must match (unless the family is open to both day and sleepaway).",
  "The child's age must fall inside the camp's age range.",
  "Gender must be compatible (child gender vs. boys/girls camps, plus the family's co-ed / single-gender preference).",
  "Kosher/Shabbat-observant families only see observant camps.",
  "Families needing an inclusion / special-needs program only see camps that offer one.",
  "Camps more than 25% beyond the family's distance cap are dropped.",
  "Camps whose cheapest session is more than 20% over the budget cap are dropped.",
];

const SANDBOX_DEFAULTS: QuizAnswers = {
  childAge: 10,
  childGender: "any",
  campType: "both",
  sessionWeeks: "flexible",
  homeState: "NJ",
  maxDistance: "3h",
  budget: "any",
  interests: [],
  socialStyle: "jumps-in",
  vibe: 3,
  competitiveness: 3,
  structure: 3,
  genderPref: "any",
  religious: "any",
  sizePref: "any",
  firstTime: false,
  supports: [],
};

function MatchingTab({ camps }: { camps: AdminCamp[] }) {
  const [q, setQ] = useState<QuizAnswers>(SANDBOX_DEFAULTS);
  const totalWeight = Object.values(MATCHING_WEIGHTS).reduce((s, w) => s + w, 0);
  const maxWeight = Math.max(...Object.values(MATCHING_WEIGHTS));

  const set = <K extends keyof QuizAnswers>(k: K, v: QuizAnswers[K]) =>
    setQ((prev) => ({ ...prev, [k]: v }));

  const results = useMemo(() => matchCamps(camps, q), [camps, q]);
  const passedHard = useMemo(
    () => camps.filter((c) => passesHardFilters(c, q)).length,
    [camps, q],
  );

  const bands = useMemo(() => {
    const defs = [
      { label: "90–99", min: 90 },
      { label: "80–89", min: 80 },
      { label: "70–79", min: 70 },
      { label: "60–69", min: 60 },
      { label: "40–59", min: 40 },
    ];
    return defs.map((b, i) => ({
      ...b,
      count: results.filter((r) => r.score >= b.min && (i === 0 || r.score < defs[i - 1].min)).length,
    }));
  }, [results]);

  return (
    <>
      <SectionCard
        title="How a match score is computed"
        subtitle="Two layers: hard filters knock out dealbreakers, then each surviving camp gets a weighted compatibility score normalized into a 40–99 band. These values are read live from the scoring engine."
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Hard filters & drops</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          {HARD_FILTERS.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-ember">✕</span> {f}
            </li>
          ))}
        </ul>

        <h3 className="mt-7 text-sm font-semibold uppercase tracking-wider text-ink-soft">
          Compatibility weights (of {totalWeight} total when all apply)
        </h3>
        <div className="mt-3 space-y-3">
          {WEIGHT_ROWS.map((row) => {
            const w = MATCHING_WEIGHTS[row.key];
            return (
              <div key={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="shrink-0 font-semibold text-pine">
                    {w} <span className="font-normal text-ink-soft">({Math.round((w / totalWeight) * 100)}%)</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-pine" style={{ width: `${(w / maxWeight) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">{row.note}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Final score = 40 + (weighted fit) × 59, so every surviving camp reads as a 40–99% match.
          Weights live in <code>src/lib/matching.ts</code> (<code>MATCHING_WEIGHTS</code>).
        </p>
      </SectionCard>

      <SectionCard
        title="Sandbox — run the engine live"
        subtitle="Adjust a hypothetical family profile and watch how the real scoring engine ranks the directory."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Child age — <span className="text-ember">{q.childAge}</span></span>
            <input type="range" min={3} max={17} value={q.childAge} onChange={(e) => set("childAge", Number(e.target.value))} className="w-full accent-ember" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Child</span>
            <select value={q.childGender} onChange={(e) => set("childGender", e.target.value as QuizAnswers["childGender"])} className={inputCls()}>
              <option value="any">Either</option>
              <option value="boy">Boy</option>
              <option value="girl">Girl</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Camp type</span>
            <select value={q.campType} onChange={(e) => set("campType", e.target.value as QuizAnswers["campType"])} className={inputCls()}>
              <option value="both">Both</option>
              <option value="sleepaway">Sleepaway</option>
              <option value="day">Day</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Home state</span>
            <select value={q.homeState} onChange={(e) => set("homeState", e.target.value)} className={inputCls()}>
              {Object.entries(STATE_CENTROIDS).map(([code, s]) => (
                <option key={code} value={code}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Max distance</span>
            <select value={q.maxDistance} onChange={(e) => set("maxDistance", e.target.value as QuizAnswers["maxDistance"])} className={inputCls()}>
              {Object.entries(DISTANCE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Budget</span>
            <select value={q.budget} onChange={(e) => set("budget", e.target.value as QuizAnswers["budget"])} className={inputCls()}>
              {Object.entries(BUDGET_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Vibe — <span className="text-ember">{q.vibe}</span> (rustic ↔ modern)</span>
            <input type="range" min={1} max={5} value={q.vibe} onChange={(e) => set("vibe", Number(e.target.value))} className="w-full accent-ember" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Competitiveness — <span className="text-ember">{q.competitiveness}</span></span>
            <input type="range" min={1} max={5} value={q.competitiveness} onChange={(e) => set("competitiveness", Number(e.target.value))} className="w-full accent-ember" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Structure — <span className="text-ember">{q.structure}</span> (scheduled ↔ elective)</span>
            <input type="range" min={1} max={5} value={q.structure} onChange={(e) => set("structure", Number(e.target.value))} className="w-full accent-ember" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Community</span>
            <select value={q.religious} onChange={(e) => set("religious", e.target.value as QuizAnswers["religious"])} className={inputCls()}>
              <option value="any">No preference</option>
              {Object.entries(RELIGIOUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={q.firstTime} onChange={(e) => set("firstTime", e.target.checked)} className="accent-ember" />
            First-time camper
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink">Interests</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  set(
                    "interests",
                    q.interests.includes(i) ? q.interests.filter((x) => x !== i) : [...q.interests, i],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  q.interests.includes(i)
                    ? "border-pine bg-pine text-cream"
                    : "border-ink/15 bg-white text-ink-soft hover:border-pine/40"
                }`}
              >
                {INTEREST_LABELS[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mt-8 rounded-2xl bg-cream-dark p-5">
          <p className="text-sm text-ink">
            <strong>{results.length}</strong> of <strong>{camps.length}</strong> camps would be shown
            to this family — {camps.length - passedHard} removed by hard filters,{" "}
            {passedHard - results.length} dropped for distance/budget overruns.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {bands.map((b) => (
              <div key={b.label} className="rounded-xl bg-white p-3 text-center">
                <p className="text-lg font-semibold text-ink">{b.count}</p>
                <p className="text-xs text-ink-soft">{b.label}% match</p>
              </div>
            ))}
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Camp</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Top reason</th>
                  <th className="py-2">Cautions</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 12).map((r, i) => (
                  <tr key={r.camp.slug} className="border-b border-ink/5">
                    <td className="py-2.5 pr-4 text-ink-soft">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      {r.camp.name}
                      <span className="ml-2 text-xs font-normal text-ink-soft">
                        {r.camp.city}, {r.camp.state}
                        {r.distanceMiles !== null ? ` · ~${r.distanceMiles} mi` : ""}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-pine">{r.score}%</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{r.reasons[0]?.label ?? "—"}</td>
                    <td className="py-2.5 text-ink-soft">{r.cautions.length || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 12 && (
              <p className="mt-2 text-xs text-ink-soft">Showing the top 12 of {results.length} matches.</p>
            )}
          </div>
        )}
      </SectionCard>
    </>
  );
}
