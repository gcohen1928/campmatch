import type { QuizAnswers } from "./types";

const ANSWERS_KEY = "campmatch.quiz.answers";
const SAVED_KEY = "campmatch.saved";

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
