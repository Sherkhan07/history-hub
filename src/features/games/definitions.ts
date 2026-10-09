import { z } from "zod";
import type { GameType } from "@/generated/prisma/enums";
import { seededShuffle } from "@/lib/random";
import type { IconName } from "@/components/common/icon";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { distanceKm } from "./kz-map";

/**
 * Game registry — server-safe part (schemas, public projection, scoring).
 * UI players/editors live in ./components and are registered by the same GameType key.
 *
 * To add a new game type:
 *   1. add the enum value in prisma/schema.prisma
 *   2. add a definition here (item schema, answer schema, toPublic, check, solution, empty)
 *   3. add a Player and an Editor component in components/registry.tsx
 */

export type CheckResult = { correct: boolean; ratio: number };

/** Localized texts the registry needs (default prompts of new items, true/false words in solutions). */
export type GameLabels = {
  timeline: string;
  map: string;
  matching: string;
  source: string;
  artifact: readonly string[];
  truth: string;
  lie: string;
};

export function gameLabels(t: Dictionary): GameLabels {
  return {
    timeline: t.gameEditor.timelinePrompt,
    map: t.gameEditor.mapDefault,
    matching: t.gameEditor.matchingDefault,
    source: t.gameEditor.sourceN.replace("{n}", "1"),
    artifact: t.gameEditor.artifactLabels,
    truth: t.play.truth,
    lie: t.play.lie,
  };
}

export type GameDefinition<D, A, P> = {
  type: GameType;
  icon: IconName;
  item: z.ZodType<D>;
  answer: z.ZodType<A>;
  toPublic(data: D, seed: string): P;
  check(data: D, answer: A): CheckResult;
  solution(data: D, l: GameLabels): string;
  empty(l: GameLabels): D;
  /** Seconds per item in live sessions */
  seconds: number;
  /** Forces team mode in live sessions */
  teamOnly?: boolean;
};

const text = z.string().trim().min(1, "fieldRequired").max(2000);
const shortText = z.string().trim().min(1, "fieldRequired").max(300);
const id = z.string().min(1).max(40);
const optionList = z.array(shortText).min(2, "minTwoOptions").max(6);

// ─── TIMELINE ────────────────────────────────────────────────
const timelineItem = z.object({
  prompt: text,
  events: z
    .array(z.object({ id, text: shortText, year: z.number().int(), label: z.string().max(80).optional() }))
    .min(2, "minTwoEvents")
    .max(8),
});
export const timeline: GameDefinition<
  z.infer<typeof timelineItem>,
  { order: string[] },
  { prompt: string; events: { id: string; text: string }[] }
> = {
  type: "TIMELINE",
  seconds: 90,
  icon: "History",
  item: timelineItem,
  answer: z.object({ order: z.array(id).max(8) }),
  toPublic: (d, seed) => ({
    prompt: d.prompt,
    events: seededShuffle(
      d.events.map((e) => ({ id: e.id, text: e.text })),
      seed,
    ),
  }),
  check(d, a) {
    const correct = [...d.events].sort((x, y) => x.year - y.year).map((e) => e.id);
    const hits = correct.filter((idv, i) => a.order[i] === idv).length;
    return { correct: hits === correct.length, ratio: hits / correct.length };
  },
  solution: (d) =>
    [...d.events]
      .sort((x, y) => x.year - y.year)
      .map((e) => `${e.label ?? e.year}: ${e.text}`)
      .join(" → "),
  empty: (l) => ({
    prompt: l.timeline,
    events: [
      { id: "e1", text: "", year: -3000 },
      { id: "e2", text: "", year: -1000 },
    ],
  }),
};

// ─── MAP_POINT ───────────────────────────────────────────────
const mapItem = z.object({
  prompt: text,
  placeName: shortText,
  lat: z.number().min(35).max(60),
  lon: z.number().min(40).max(95),
  radiusKm: z.number().min(25).max(800).default(150),
  explanation: z.string().max(1000).optional(),
});
export const mapPoint: GameDefinition<
  z.infer<typeof mapItem>,
  { lat: number; lon: number },
  { prompt: string }
> = {
  type: "MAP_POINT",
  seconds: 40,
  icon: "MapPin",
  item: mapItem,
  answer: z.object({ lat: z.number(), lon: z.number() }),
  toPublic: (d) => ({ prompt: d.prompt }),
  check(d, a) {
    const dist = distanceKm(d, a);
    if (dist <= d.radiusKm) return { correct: true, ratio: 1 };
    if (dist <= d.radiusKm * 2) return { correct: false, ratio: 0.5 };
    return { correct: false, ratio: 0 };
  },
  solution: (d) => d.placeName,
  empty: (l) => ({ prompt: l.map, placeName: "", lat: 48, lon: 67, radiusKm: 150 }),
};

// ─── MATCHING ────────────────────────────────────────────────
const matchingItem = z.object({
  prompt: text,
  pairs: z.array(z.object({ id, left: shortText, right: shortText })).min(2, "minTwoPairs").max(8),
});
export const matching: GameDefinition<
  z.infer<typeof matchingItem>,
  { matches: Record<string, string> },
  { prompt: string; left: { id: string; text: string }[]; right: { id: string; text: string }[] }
> = {
  type: "MATCHING",
  seconds: 90,
  icon: "Shuffle",
  item: matchingItem,
  answer: z.object({ matches: z.record(z.string(), z.string()) }),
  toPublic: (d, seed) => ({
    prompt: d.prompt,
    left: d.pairs.map((p) => ({ id: p.id, text: p.left })),
    right: seededShuffle(
      d.pairs.map((p) => ({ id: p.id, text: p.right })),
      seed,
    ),
  }),
  check(d, a) {
    const hits = d.pairs.filter((p) => a.matches[p.id] === p.id).length;
    return { correct: hits === d.pairs.length, ratio: hits / d.pairs.length };
  },
  solution: (d) => d.pairs.map((p) => `${p.left} — ${p.right}`).join("; "),
  empty: (l) => ({
    prompt: l.matching,
    pairs: [
      { id: "p1", left: "", right: "" },
      { id: "p2", left: "", right: "" },
    ],
  }),
};

// ─── Single-choice based games ──────────────────────────────
const indexAnswer = z.object({ index: z.number().int().min(0).max(10) });
function checkIndex(correctIndex: number, a: { index: number }): CheckResult {
  const ok = a.index === correctIndex;
  return { correct: ok, ratio: ok ? 1 : 0 };
}

const whoAmIItem = z
  .object({
    clues: z.array(text).min(1, "minOneClue").max(6),
    options: optionList,
    correctIndex: z.number().int().min(0),
    imageUrl: z.string().max(500).optional(),
    explanation: z.string().max(1000).optional(),
  })
  .refine((d) => d.correctIndex < d.options.length, { message: "pickCorrect", path: ["correctIndex"] });
export const whoAmI: GameDefinition<
  z.infer<typeof whoAmIItem>,
  { index: number },
  { clues: string[]; options: string[]; imageUrl?: string }
> = {
  type: "WHO_AM_I",
  seconds: 30,
  icon: "UserRound",
  item: whoAmIItem,
  answer: indexAnswer,
  toPublic: (d) => ({ clues: d.clues, options: d.options, imageUrl: d.imageUrl }),
  check: (d, a) => checkIndex(d.correctIndex, a),
  solution: (d) => d.options[d.correctIndex] ?? "",
  empty: () => ({ clues: [""], options: ["", ""], correctIndex: 0 }),
};

const trueFalseItem = z.object({
  statement: text,
  isTrue: z.boolean(),
  explanation: z.string().max(1000).optional(),
});
export const trueFalse: GameDefinition<
  z.infer<typeof trueFalseItem>,
  { value: boolean },
  { statement: string }
> = {
  type: "TRUE_FALSE",
  seconds: 20,
  icon: "CircleCheckBig",
  item: trueFalseItem,
  answer: z.object({ value: z.boolean() }),
  toPublic: (d) => ({ statement: d.statement }),
  check: (d, a) => ({ correct: a.value === d.isTrue, ratio: a.value === d.isTrue ? 1 : 0 }),
  solution: (d, l) => (d.isTrue ? l.truth : l.lie) + (d.explanation ? ` — ${d.explanation}` : ""),
  empty: () => ({ statement: "", isTrue: true }),
};

const detectiveItem = z
  .object({
    caseText: text,
    sources: z.array(z.object({ title: shortText, text })).min(1, "addSource").max(5),
    question: text,
    options: optionList,
    correctIndex: z.number().int().min(0),
    explanation: z.string().max(1500).optional(),
  })
  .refine((d) => d.correctIndex < d.options.length, { message: "pickConclusion", path: ["correctIndex"] });
export const detective: GameDefinition<
  z.infer<typeof detectiveItem>,
  { index: number },
  { caseText: string; sources: { title: string; text: string }[]; question: string; options: string[] }
> = {
  type: "HISTORICAL_DETECTIVE",
  seconds: 120,
  icon: "Search",
  item: detectiveItem,
  answer: indexAnswer,
  toPublic: (d) => ({ caseText: d.caseText, sources: d.sources, question: d.question, options: d.options }),
  check: (d, a) => checkIndex(d.correctIndex, a),
  solution: (d) => d.options[d.correctIndex] ?? "",
  empty: (l) => ({
    caseText: "",
    sources: [{ title: l.source, text: "" }],
    question: "",
    options: ["", ""],
    correctIndex: 0,
  }),
};

const artifactItem = z.object({
  imageUrl: z.string().min(1, "addImage").max(500),
  caption: z.string().max(300).optional(),
  questions: z
    .array(
      z
        .object({ label: shortText, options: optionList, correctIndex: z.number().int().min(0) })
        .refine((q) => q.correctIndex < q.options.length, { message: "pickAnswer", path: ["correctIndex"] }),
    )
    .min(1)
    .max(4),
});
export const artifact: GameDefinition<
  z.infer<typeof artifactItem>,
  { indexes: number[] },
  { imageUrl: string; caption?: string; questions: { label: string; options: string[] }[] }
> = {
  type: "ARTIFACT",
  seconds: 60,
  icon: "Gem",
  item: artifactItem,
  answer: z.object({ indexes: z.array(z.number().int().min(-1)).max(4) }),
  toPublic: (d) => ({
    imageUrl: d.imageUrl,
    caption: d.caption,
    questions: d.questions.map((q) => ({ label: q.label, options: q.options })),
  }),
  check(d, a) {
    const hits = d.questions.filter((q, i) => a.indexes[i] === q.correctIndex).length;
    return { correct: hits === d.questions.length, ratio: hits / d.questions.length };
  },
  solution: (d) => d.questions.map((q) => `${q.label}: ${q.options[q.correctIndex]}`).join(" · "),
  empty: (l) => ({
    imageUrl: "",
    caption: "",
    questions: [
      ...l.artifact.map((label) => ({ label, options: ["", ""], correctIndex: 0 })),
    ],
  }),
};

const battleItem = z
  .object({
    prompt: text,
    options: optionList,
    correctIndex: z.number().int().min(0),
    imageUrl: z.string().max(500).optional(),
  })
  .refine((d) => d.correctIndex < d.options.length, { message: "pickCorrect", path: ["correctIndex"] });
export const teamBattle: GameDefinition<
  z.infer<typeof battleItem>,
  { index: number },
  { prompt: string; options: string[]; imageUrl?: string }
> = {
  type: "TEAM_BATTLE",
  seconds: 25,
  icon: "Swords",
  item: battleItem,
  answer: indexAnswer,
  toPublic: (d) => ({ prompt: d.prompt, options: d.options, imageUrl: d.imageUrl }),
  check: (d, a) => checkIndex(d.correctIndex, a),
  solution: (d) => d.options[d.correctIndex] ?? "",
  empty: () => ({ prompt: "", options: ["", "", "", ""], correctIndex: 0 }),
  teamOnly: true,
};

// ─── Registry ────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any -- heterogeneous registry, narrowed via getDefinition */
export const GAME_DEFINITIONS: Record<GameType, GameDefinition<any, any, any>> = {
  TIMELINE: timeline,
  MAP_POINT: mapPoint,
  MATCHING: matching,
  WHO_AM_I: whoAmI,
  TRUE_FALSE: trueFalse,
  HISTORICAL_DETECTIVE: detective,
  ARTIFACT: artifact,
  TEAM_BATTLE: teamBattle,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const GAME_TYPES = Object.keys(GAME_DEFINITIONS) as GameType[];

export function getDefinition(type: GameType) {
  return GAME_DEFINITIONS[type];
}

/** Validates raw JSON from the DB/client against the item schema. */
export function parseItem(type: GameType, data: unknown) {
  return GAME_DEFINITIONS[type].item.safeParse(data);
}

/** Scores an answer for an item. Invalid answers score zero instead of throwing. */
export function scoreGameAnswer(type: GameType, data: unknown, answer: unknown): CheckResult {
  const def = GAME_DEFINITIONS[type];
  const item = def.item.safeParse(data);
  const ans = def.answer.safeParse(answer);
  if (!item.success || !ans.success) return { correct: false, ratio: 0 };
  return def.check(item.data, ans.data);
}

export type PublicGameItem = { id: string; type: GameType; points: number; data: unknown };

export function toPublicGameItem(type: GameType, item: { id: string; points: number; data: unknown }): PublicGameItem {
  const def = GAME_DEFINITIONS[type];
  const parsed = def.item.safeParse(item.data);
  return { id: item.id, type, points: item.points, data: parsed.success ? def.toPublic(parsed.data, item.id) : null };
}
