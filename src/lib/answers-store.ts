import type { QuizAnswers } from "./types";
import { getSupabase } from "./supabase";

const ANSWERS_KEY = "campmatch.quiz.answers";
const SAVED_KEY = "campmatch.saved";
const COMPLETIONS_KEY = "campmatch.quiz.completions";

export interface QuizCompletion {
  answers: QuizAnswers;
  at: string;
}

/**
 * Record a finished quiz so the admin dashboard can see completed forms.
 * Writes to quiz_results when Supabase is connected (fire-and-forget so the
 * results page never waits on it) and always keeps a browser-local copy for
 * demo mode.
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
    return raw ? (JSON.parse(raw) as QuizCompletion[]) : [];
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
    return raw ? (JSON.parse(raw) as QuizAnswers) : null;
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
