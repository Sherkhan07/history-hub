import type { GameType } from "@/generated/prisma/enums";
import type { ScorableQuestion } from "@/features/quizzes/scoring";
import { questionSolution } from "@/features/quizzes/scoring";
import { getDefinition, type GameLabels } from "./definitions";

export type RevealData = {
  solution: string;
  correctOptions?: number[];
  mapTarget?: { lat: number; lon: number; radiusKm: number; label: string };
};

/** What the UI may show once an item is closed — derived from the full (secret) item data. */
export function revealForGameItem(type: GameType, raw: unknown, labels: GameLabels): RevealData | null {
  const def = getDefinition(type);
  const parsed = def.item.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data as Record<string, unknown>;
  const solution = def.solution(parsed.data, labels);
  switch (type) {
    case "WHO_AM_I":
    case "HISTORICAL_DETECTIVE":
    case "TEAM_BATTLE":
      return { solution, correctOptions: [d.correctIndex as number] };
    case "TRUE_FALSE":
      return { solution, correctOptions: [d.isTrue ? 0 : 1] };
    case "ARTIFACT":
      return { solution, correctOptions: (d.questions as { correctIndex: number }[]).map((q) => q.correctIndex) };
    case "MAP_POINT":
      return { solution, mapTarget: { lat: d.lat as number, lon: d.lon as number, radiusKm: d.radiusKm as number, label: d.placeName as string } };
    default:
      return { solution };
  }
}

export function revealForQuestion(q: ScorableQuestion): RevealData {
  const solution = questionSolution(q);
  if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
    return { solution, correctOptions: q.options.flatMap((o, i) => (o.isCorrect ? [i] : [])) };
  }
  return { solution };
}
