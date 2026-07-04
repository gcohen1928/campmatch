"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CAMPS } from "@/lib/camps-data";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";
import { STATE_CENTROIDS } from "@/lib/geo";

type PortalUser = { id: string; email: string };

const DEMO_USER_KEY = "campmatch.portal.demo-user";
const DEMO_SUBMISSIONS_KEY = "campmatch.portal.demo-submissions";

function inputCls(extra = "") {
  return `w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-ink placeholder:text-ink-soft/50 focus:border-ember focus:outline-none ${extra}`;
}

function Notice({ tone, children }: { tone: "ok" | "info" | "err"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-pine/30 bg-pine-light text-pine"
      : tone === "err"
        ? "border-ember/40 bg-ember/10 text-ember-deep"
        : "border-gold/50 bg-gold/10 text-ink";
  return <div className={`rounded-xl border p-4 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

export function CampPortal() {
  const params = useSearchParams();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Claim flow
  const [claimQuery, setClaimQuery] = useState("");
  const [claimSlug, setClaimSlug] = useState<string | null>(params.get("claim"));
  const [claimRole, setClaimRole] = useState("");
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  // Create flow
  const [newCamp, setNewCamp] = useState({
    name: "",
    type: "sleepaway",
    city: "",
    state: "NJ",
    website: "",
    description: "",
  });
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (sb) {
      sb.auth.getUser().then(({ data }) => {
        if (data.user) setUser({ id: data.user.id, email: data.user.email ?? "" });
      });
    } else {
      // Async so the demo-mode localStorage read follows the same
      // subscribe-then-update shape as the Supabase branch.
      Promise.resolve().then(() => {
        try {
          const raw = localStorage.getItem(DEMO_USER_KEY);
          if (raw) setUser(JSON.parse(raw));
        } catch {}
      });
    }
  }, []);

  const claimResults = useMemo(() => {
    const needle = claimQuery.trim().toLowerCase();
    if (!needle) return [];
    return CAMPS.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [claimQuery]);

  const selectedCamp = claimSlug ? CAMPS.find((c) => c.slug === claimSlug) : null;

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthMsg(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      if (sb) {
        const { data, error } =
          authMode === "signup"
            ? await sb.auth.signUp({ email, password })
            : await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email ?? email });
          setAuthMsg({
            tone: "ok",
            text:
              authMode === "signup" && !data.session
                ? "Account created — check your email to confirm, then sign in."
                : "You're signed in.",
          });
        }
      } else {
        // Demo mode: browser-local account so the flow is fully explorable.
        const demoUser = { id: `demo-${email}`, email };
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        setAuthMsg({ tone: "ok", text: "Demo account created (stored only in this browser)." });
      }
    } catch (err) {
      setAuthMsg({ tone: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    else localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
  }

  async function submitDemoOrDb(
    table: "camp_claims" | "camp_submissions",
    payload: Record<string, unknown>,
  ) {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from(table).insert(payload);
      if (error) throw error;
      return "Submitted! Our team reviews claims within a couple of days and will email you.";
    }
    try {
      const raw = localStorage.getItem(DEMO_SUBMISSIONS_KEY);
      const all = raw ? JSON.parse(raw) : [];
      all.push({ table, payload, at: new Date().toISOString() });
      localStorage.setItem(DEMO_SUBMISSIONS_KEY, JSON.stringify(all));
    } catch {}
    return "Recorded in demo mode (stored only in this browser). Connect the database to accept real submissions.";
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCamp || !user) return;
    setBusy(true);
    try {
      setClaimMsg(
        await submitDemoOrDb("camp_claims", {
          camp_slug: selectedCamp.slug,
          camp_name: selectedCamp.name,
          user_id: user.id,
          contact_email: user.email,
          role_at_camp: claimRole,
        }),
      );
    } catch (err) {
      setClaimMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      setCreateMsg(
        await submitDemoOrDb("camp_submissions", {
          ...newCamp,
          user_id: user.id,
          contact_email: user.email,
        }),
      );
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-ember">For camp directors</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Get matched with the families your camp was built for.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          CampMatch introduces parents to camps by compatibility, not ad spend.
          Claim your listing (or create one), verify your details, and show up
          in the right families&apos; match lists — free.
        </p>
      </div>

      {!supabaseEnabled && (
        <div className="mt-8">
          <Notice tone="info">
            <strong>Preview mode:</strong>{" "}
            the production database isn&apos;t connected
            in this deployment, so accounts and submissions below are stored only
            in your browser. Every flow is fully explorable.
          </Notice>
        </div>
      )}

      {/* Account */}
      <section className="mt-10 rounded-3xl border border-ink/10 bg-white p-6 shadow-lift sm:p-8">
        <h2 className="text-2xl font-semibold text-pine">1 · Your camp account</h2>
        {user ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink">
              Signed in as <strong>{user.email}</strong>
            </p>
            <button onClick={signOut} className="rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-ink-soft hover:text-ink">
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="mt-4 max-w-md space-y-3">
            <div className="flex gap-2">
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAuthMode(m)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    authMode === m ? "bg-pine text-cream" : "text-ink-soft hover:text-pine"
                  }`}
                >
                  {m === "signup" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>
            <input type="email" required placeholder="you@yourcamp.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls()} />
            <input type="password" required minLength={8} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls()} />
            <button disabled={busy} className="rounded-full bg-ember px-6 py-3 font-semibold text-white transition hover:bg-ember-deep disabled:opacity-50">
              {authMode === "signup" ? "Create account" : "Sign in"}
            </button>
            {authMsg && <Notice tone={authMsg.tone}>{authMsg.text}</Notice>}
          </form>
        )}
      </section>

      {/* Claim */}
      <section className="mt-8 rounded-3xl border border-ink/10 bg-white p-6 shadow-lift sm:p-8">
        <h2 className="text-2xl font-semibold text-pine">2 · Claim your existing listing</h2>
        <p className="mt-2 text-ink-soft">
          Already on CampMatch? Search for your camp and claim it.
        </p>
        <input
          type="search"
          value={claimQuery}
          onChange={(e) => {
            setClaimQuery(e.target.value);
            setClaimSlug(null);
          }}
          placeholder="Search your camp's name…"
          className={inputCls("mt-4 max-w-md")}
        />
        {claimResults.length > 0 && !selectedCamp && (
          <ul className="mt-3 max-w-md overflow-hidden rounded-xl border border-ink/10">
            {claimResults.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => setClaimSlug(c.slug)}
                  className="flex w-full items-baseline justify-between gap-3 border-b border-ink/5 px-4 py-3 text-left last:border-0 hover:bg-pine-light"
                >
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="shrink-0 text-sm text-ink-soft">{c.city}, {c.state}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedCamp && (
          <form onSubmit={handleClaim} className="mt-4 max-w-md space-y-3">
            <Notice tone="ok">
              Claiming <strong>{selectedCamp.name}</strong> — {selectedCamp.city}, {selectedCamp.state}.{" "}
              <button type="button" className="font-semibold underline" onClick={() => setClaimSlug(null)}>
                change
              </button>
            </Notice>
            <input
              required
              placeholder="Your role (e.g., Director, Owner)"
              value={claimRole}
              onChange={(e) => setClaimRole(e.target.value)}
              className={inputCls()}
            />
            {user ? (
              <button disabled={busy} className="rounded-full bg-ember px-6 py-3 font-semibold text-white transition hover:bg-ember-deep disabled:opacity-50">
                Submit claim
              </button>
            ) : (
              <Notice tone="info">Create an account above first — claims are tied to your account.</Notice>
            )}
            {claimMsg && <Notice tone="ok">{claimMsg}</Notice>}
          </form>
        )}
      </section>

      {/* Create */}
      <section id="create" className="mt-8 rounded-3xl border border-ink/10 bg-white p-6 shadow-lift sm:p-8">
        <h2 className="text-2xl font-semibold text-pine">3 · Or create a new listing</h2>
        <p className="mt-2 text-ink-soft">
          Not in our database yet? Tell us the basics — we&apos;ll build your full
          match profile with you.
        </p>
        <form onSubmit={handleCreate} className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <input required placeholder="Camp name" value={newCamp.name} onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })} className={inputCls("sm:col-span-2")} />
          <select value={newCamp.type} onChange={(e) => setNewCamp({ ...newCamp, type: e.target.value })} className={inputCls()}>
            <option value="sleepaway">Sleepaway camp</option>
            <option value="day">Day camp</option>
          </select>
          <input required placeholder="Website" type="url" value={newCamp.website} onChange={(e) => setNewCamp({ ...newCamp, website: e.target.value })} className={inputCls()} />
          <input required placeholder="City / town" value={newCamp.city} onChange={(e) => setNewCamp({ ...newCamp, city: e.target.value })} className={inputCls()} />
          <select value={newCamp.state} onChange={(e) => setNewCamp({ ...newCamp, state: e.target.value })} className={inputCls()}>
            {Object.entries(STATE_CENTROIDS).map(([code, s]) => (
              <option key={code} value={code}>{s.name}</option>
            ))}
          </select>
          <textarea
            placeholder="One paragraph about your camp (optional)"
            value={newCamp.description}
            onChange={(e) => setNewCamp({ ...newCamp, description: e.target.value })}
            rows={3}
            className={inputCls("sm:col-span-2")}
          />
          {user ? (
            <button disabled={busy} className="rounded-full bg-ember px-6 py-3 font-semibold text-white transition hover:bg-ember-deep disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
              Submit listing
            </button>
          ) : (
            <div className="sm:col-span-2">
              <Notice tone="info">Create an account above first — listings are tied to your account.</Notice>
            </div>
          )}
          {createMsg && (
            <div className="sm:col-span-2">
              <Notice tone="ok">{createMsg}</Notice>
            </div>
          )}
        </form>
      </section>

      <p className="mt-10 text-center text-sm text-ink-soft">
        Questions? See{" "}
        <Link href="/how-it-works" className="font-semibold text-ember">how matching works</Link>{" "}
        or browse the <Link href="/camps" className="font-semibold text-ember">directory</Link>.
      </p>
    </div>
  );
}
