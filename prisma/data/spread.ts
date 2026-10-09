/**
 * Demo content is written with the correct option first. Shown like that, the right answer would always
 * be the first choice, so the seed moves it to a stable pseudo-random position (derived from the question
 * text, so re-running the seed or the fix script gives the same result). The same hash is used for the
 * textbook questions, which are already spread: for them this is a no-op.
 */

export function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Moves the option at `correct` to a position chosen by `seed`; the other options keep their order. */
export function spreadCorrect<T>(options: readonly T[], correct: number, seed: string): { options: T[]; correct: number } {
  if (options.length < 2 || correct < 0 || correct >= options.length) return { options: [...options], correct };
  const at = hashText(seed) % options.length;
  const rest = options.filter((_, i) => i !== correct);
  rest.splice(at, 0, options[correct]);
  return { options: rest, correct: at };
}

type Spreadable = { options: string[]; correctIndex: number };

function spreadOne<T extends Spreadable>(o: T, seed: string): T {
  if (!Array.isArray(o.options) || o.correctIndex !== 0) return o;
  const r = spreadCorrect(o.options, o.correctIndex, seed);
  return { ...o, options: r.options, correctIndex: r.correct };
}

/**
 * Game items with a choice: WHO_AM_I, TEAM_BATTLE, HISTORICAL_DETECTIVE (options + correctIndex)
 * and ARTIFACT (questions[], each with options + correctIndex). Items already arranged by hand
 * (correct answer not first) are left alone.
 */
export function spreadGameItem<T>(item: T): T {
  const it = item as unknown as Record<string, unknown>;
  const seed = String(it.prompt ?? it.question ?? (Array.isArray(it.clues) ? it.clues[0] : "") ?? it.caption ?? "");
  let out = it;
  if (Array.isArray(it.options) && typeof it.correctIndex === "number") out = spreadOne(it as unknown as Spreadable, seed) as unknown as Record<string, unknown>;
  if (Array.isArray(it.questions)) {
    out = {
      ...out,
      questions: (it.questions as (Spreadable & { label?: string })[]).map((q) => spreadOne(q, `${seed}|${q.label ?? ""}`)),
    };
  }
  return out as unknown as T;
}
