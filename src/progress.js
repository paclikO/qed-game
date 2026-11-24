// Persistent player progress (localStorage). Only real results are stored – nothing is pre-filled.
import { SCHOOLS } from './schools.js';

const KEY = 'qed.progress.v1';

const fresh = () => ({ character: null, levels: {} });

export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && typeof p === 'object' && p.levels) return p;
  } catch { /* storage unavailable or corrupted */ }
  return fresh();
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore (private mode etc.) */ }
}

const entry = (p, id) => (p.levels[id] ??= {
  completed: false, plays: 0, wins: 0, bestScore: 0, bestStars: 0, bestTimeLeft: 0, totalCorrect: 0, totalMistakes: 0,
});

/** Record a finished attempt. `won` = level completed; returns { firstClear, newBest }. */
export function recordAttempt(p, id, { won, score = 0, stars = 0, timeLeft = 0, correct = 0, mistakes = 0, expression = '' }) {
  const e = entry(p, id);
  const firstClear = won && !e.completed;
  const newBest = won && score > e.bestScore;
  e.plays += 1;
  e.totalCorrect += correct;
  e.totalMistakes += mistakes;
  if (won) {
    e.completed = true;
    e.wins += 1;
    e.bestScore = Math.max(e.bestScore, score);
    e.bestStars = Math.max(e.bestStars, stars);
    e.bestTimeLeft = Math.max(e.bestTimeLeft, Math.floor(timeLeft));
    e.lastExpression = expression;
  }
  saveProgress(p);
  return { firstClear, newBest };
}

export const levelStats = (p, id) => p.levels[id] ?? null;
export const isCompleted = (p, id) => !!p.levels[id]?.completed;

export function schoolProgress(p, school) {
  const done = school.levels.filter((id) => isCompleted(p, id)).length;
  return { done, total: school.levels.length };
}

export function totalProgress(p) {
  let done = 0, total = 0;
  for (const s of SCHOOLS) { const r = schoolProgress(p, s); done += r.done; total += r.total; }
  return { done, total };
}

/** A school opens once the player has enough ★ (completed rooms across all schools). */
export const isUnlocked = (p, school) => totalProgress(p).done >= (school.unlock ?? 0);
export const starsMissing = (p, school) => Math.max(0, (school.unlock ?? 0) - totalProgress(p).done);
export const unlockedSchools = (p) => SCHOOLS.filter((s) => isUnlocked(p, s)).map((s) => s.id);

/** First not-yet-completed level of a school (or null when everything is done). */
export const nextLevelId = (p, school) => school.levels.find((id) => !isCompleted(p, id)) ?? null;
