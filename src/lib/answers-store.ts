import type { CampApplication, QuizAnswers } from "./types";
import { normalizeAnswers } from "./quiz";
import { getSupabase } from "./supabase";

const ANSWERS_KEY = "campmatch.quiz.answers";
const SAVED_KEY = "campmatch.saved";
const COMPLETIONS_KEY = "campmatch.quiz.completions";
const APPLICATIONS_KEY = "campmatch.applications";

export interface QuizCompletion {
  answers: QuizAnswers;
  at: string;
}

/**
 * Record a finished questionnaire so the admin dashboard can see completed
 * forms. Writes to quiz_results when Supabase is connected (fire-and-forget
 * so the results page never waits on it) and always keeps a browser-local
 * copy for demo mode.
 */
export function recordQuizCompletion(a: QuizAnswers) {
  try {
    const all = loadQuizCompletions();
    all.push({ answers: a, at: new Date().toISOString() });
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(all));
  } catch {}
  const sb = getSupabase();
  if (sb) {
    void sb
      .from("quiz_results")
      .insert({ answers: a })
      .then(({ error }) => {
        if (error) console.warn("quiz_results insert failed:", error.message);
      });
  }
}

export function loadQuizCompletions(): QuizCompletion[] {
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    const rows = raw ? (JSON.parse(raw) as QuizCompletion[]) : [];
    // Older saved completions may predate the current questionnaire shape.
    return rows.map((r) => ({ ...r, answers: normalizeAnswers(r.answers) }));
  } catch {
    return [];
  }
}

export function saveAnswers(a: QuizAnswers) {
  try {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(a));
  } catch {}
}

export function loadAnswers(): QuizAnswers | null {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    // Normalize so answers saved by an older questionnaire (e.g. with the
    // removed budget question) still match cleanly.
    return raw ? normalizeAnswers(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleSaved(slug: string): string[] {
  const cur = loadSaved();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/* ── Applications submitted through Camp Matching ────────────────────── */

/**
 * Store an application: into Supabase when connected (so ops can forward it
 * to the camp), and always locally so the family can see what they sent.
 * Returns false only when the Supabase insert definitively failed.
 */
export async function submitApplication(app: CampApplication): Promise<boolean> {
  try {
    const all = loadApplications();
    all.push(app);
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(all));
  } catch {}
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("applications").insert({
    camp_slug: app.campSlug,
    camp_name: app.campName,
    parent_name: app.parentName,
    email: app.email,
    phone: app.phone,
    child_name: app.childName,
    child_age: app.childAge,
    session_preference: app.sessionPreference,
    notes: app.notes,
    profile: app.profile,
  });
  if (error) {
    console.warn("application insert failed:", error.message);
    return false;
  }
  return true;
}

export function loadApplications(): CampApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? (JSON.parse(raw) as CampApplication[]) : [];
  } catch {
    return [];
  }
}

export function hasAppliedTo(slug: string): boolean {
  return loadApplications().some((a) => a.campSlug === slug);
}
