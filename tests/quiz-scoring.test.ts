import { describe, expect, it } from "vitest";
import { livePoints, questionSolution, scoreQuestion, toPublicQuestion, type ScorableQuestion } from "@/features/quizzes/scoring";
import { questionInputSchema } from "@/features/quizzes/schemas";

const opt = (id: string, text: string, extra: Partial<ScorableQuestion["options"][number]> = {}) => ({ id, text, isCorrect: false, matchText: null, correctOrder: null, ...extra });

describe("quiz scoring", () => {
  it("single choice", () => {
    const q: ScorableQuestion = { id: "q", type: "SINGLE_CHOICE", prompt: "?", points: 100, options: [opt("a", "Ботай", { isCorrect: true }), opt("b", "Андронов")] };
    expect(scoreQuestion(q, { optionIds: ["a"] }).correct).toBe(true);
    expect(scoreQuestion(q, { optionIds: ["b"] }).correct).toBe(false);
    expect(scoreQuestion(q, { optionIds: ["a", "b"] }).correct).toBe(false);
    expect(questionSolution(q)).toBe("Ботай");
  });
  it("multiple choice penalises wrong picks", () => {
    const q: ScorableQuestion = { id: "q", type: "MULTIPLE_CHOICE", prompt: "?", points: 100, options: [opt("a", "1", { isCorrect: true }), opt("b", "2", { isCorrect: true }), opt("c", "3")] };
    expect(scoreQuestion(q, { optionIds: ["a", "b"] })).toEqual({ correct: true, ratio: 1 });
    expect(scoreQuestion(q, { optionIds: ["a", "c"] }).ratio).toBe(0);
    expect(scoreQuestion(q, { optionIds: ["a"] }).ratio).toBe(0.5);
  });
  it("ordering and matching", () => {
    const ord: ScorableQuestion = { id: "o", type: "ORDERING", prompt: "?", points: 100, options: [opt("x", "Үгіту", { correctOrder: 0 }), opt("y", "Балқыту", { correctOrder: 1 }), opt("z", "Тигель", { correctOrder: 2 })] };
    expect(scoreQuestion(ord, { order: ["x", "y", "z"] }).correct).toBe(true);
    expect(scoreQuestion(ord, { order: ["y", "x", "z"] }).ratio).toBeCloseTo(1 / 3);
    const pub = toPublicQuestion(ord);
    expect(pub.options.map((o) => o.id)).not.toEqual(["x", "y", "z"]);
    const m: ScorableQuestion = { id: "m", type: "MATCHING", prompt: "?", points: 100, options: [opt("1", "Жылқы", { matchText: "Суыққа төзімді" }), opt("2", "Түйе", { matchText: "Сусыз шыдайды" })] };
    expect(scoreQuestion(m, { matches: { "1": "Суыққа төзімді", "2": "Сусыз шыдайды" } }).correct).toBe(true);
    expect(toPublicQuestion(m).right).toHaveLength(2);
    expect(JSON.stringify(toPublicQuestion(m).options)).not.toContain("matchText");
  });
  it("public question never contains isCorrect", () => {
    const q: ScorableQuestion = { id: "q", type: "TRUE_FALSE", prompt: "?", points: 100, options: [opt("t", "Ақиқат", { isCorrect: true }), opt("f", "Жалған")] };
    expect(JSON.stringify(toPublicQuestion(q))).not.toContain("isCorrect");
  });
  it("live points: correctness × speed bonus", () => {
    expect(livePoints(100, 1, 0, 30_000)).toBe(100);
    expect(livePoints(100, 1, 30_000, 30_000)).toBe(50);
    expect(livePoints(100, 0, 0, 30_000)).toBe(0);
  });
  it("validates editor input", () => {
    expect(questionInputSchema.safeParse({ type: "SINGLE_CHOICE", prompt: "?", options: [{ text: "a", isCorrect: false }, { text: "b", isCorrect: false }] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ type: "SINGLE_CHOICE", prompt: "?", options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: false }] }).success).toBe(true);
    expect(questionInputSchema.safeParse({ type: "MATCHING", prompt: "?", options: [{ text: "a", matchText: "" }, { text: "b", matchText: "x" }] }).success).toBe(false);
  });
});
