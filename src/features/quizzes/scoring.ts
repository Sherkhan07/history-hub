import { z } from "zod";
import type { QuestionType } from "@/generated/prisma/enums";
import { seededShuffle } from "@/lib/random";

export type ScorableOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  matchText: string | null;
  correctOrder: number | null;
};

export type ScorableQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation?: string | null;
  imageUrl?: string | null;
  options: ScorableOption[];
};

export const quizAnswerSchema = z.union([
  z.object({ optionIds: z.array(z.string().max(40)).max(10) }),
  z.object({ order: z.array(z.string().max(40)).max(10) }),
  z.object({ matches: z.record(z.string(), z.string().max(300)) }),
]);
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;

export type PublicQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  imageUrl?: string | null;
  options: { id: string; text: string }[];
  /** MATCHING only: shuffled right-hand values */
  right?: string[];
};

/** Removes the solution so the question can be shown to anonymous students. */
export function toPublicQuestion(q: ScorableQuestion): PublicQuestion {
  const base = { id: q.id, type: q.type, prompt: q.prompt, points: q.points, imageUrl: q.imageUrl };
  const options = q.options.map((o) => ({ id: o.id, text: o.text }));
  switch (q.type) {
    case "ORDERING":
      return { ...base, options: seededShuffle(options, q.id) };
    case "MATCHING":
      return {
        ...base,
        options,
        right: seededShuffle(
          q.options.map((o) => o.matchText ?? ""),
          q.id,
        ),
      };
    default:
      return { ...base, options };
  }
}

export function scoreQuestion(q: ScorableQuestion, raw: unknown): { correct: boolean; ratio: number } {
  const parsed = quizAnswerSchema.safeParse(raw);
  if (!parsed.success) return { correct: false, ratio: 0 };
  const a = parsed.data;

  switch (q.type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE": {
      if (!("optionIds" in a) || a.optionIds.length !== 1) return { correct: false, ratio: 0 };
      const ok = q.options.some((o) => o.id === a.optionIds[0] && o.isCorrect);
      return { correct: ok, ratio: ok ? 1 : 0 };
    }
    case "MULTIPLE_CHOICE": {
      if (!("optionIds" in a)) return { correct: false, ratio: 0 };
      const chosen = new Set(a.optionIds);
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const right = correctIds.filter((id) => chosen.has(id)).length;
      const wrong = [...chosen].filter((id) => !correctIds.includes(id)).length;
      const ratio = correctIds.length ? Math.max(0, (right - wrong) / correctIds.length) : 0;
      return { correct: right === correctIds.length && wrong === 0, ratio };
    }
    case "ORDERING": {
      if (!("order" in a)) return { correct: false, ratio: 0 };
      const expected = [...q.options]
        .sort((x, y) => (x.correctOrder ?? 0) - (y.correctOrder ?? 0))
        .map((o) => o.id);
      const hits = expected.filter((id, i) => a.order[i] === id).length;
      return { correct: hits === expected.length, ratio: expected.length ? hits / expected.length : 0 };
    }
    case "MATCHING": {
      if (!("matches" in a)) return { correct: false, ratio: 0 };
      const hits = q.options.filter((o) => (a.matches[o.id] ?? "") === (o.matchText ?? "")).length;
      return { correct: hits === q.options.length, ratio: q.options.length ? hits / q.options.length : 0 };
    }
  }
}

/** Human-readable correct answer, for the reveal step. */
export function questionSolution(q: ScorableQuestion): string {
  switch (q.type) {
    case "ORDERING":
      return [...q.options]
        .sort((x, y) => (x.correctOrder ?? 0) - (y.correctOrder ?? 0))
        .map((o) => o.text)
        .join(" → ");
    case "MATCHING":
      return q.options.map((o) => `${o.text} — ${o.matchText}`).join("; ");
    default:
      return q.options
        .filter((o) => o.isCorrect)
        .map((o) => o.text)
        .join(", ");
  }
}

/** Points for a live answer: base × correctness, with up to 50% speed bonus. */
export function livePoints(base: number, ratio: number, elapsedMs: number, limitMs: number): number {
  if (ratio <= 0) return 0;
  const speed = limitMs > 0 ? Math.max(0, 1 - elapsedMs / limitMs) : 0;
  return Math.round(base * ratio * (0.5 + 0.5 * speed));
}
