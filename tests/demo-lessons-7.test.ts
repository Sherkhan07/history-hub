import { describe, expect, it } from "vitest";
import { getDefinition } from "@/features/games/definitions";
import type { GameType } from "@/generated/prisma/enums";
import { DEMO_LESSONS_7 } from "../prisma/data/demo-lessons-7";
import { GRADE_7_SECTIONS } from "../prisma/data/sections-7";

/** Decks whose file name differs from 7-N.pptx */
const DECKS: Record<number, string> = { 2: "7-2 (2).pptx", 3: "7-3 (2).pptx" };
/** Slides per deck 7-N.pptx */
const SLIDES: Record<number, number> = { 1: 15, 2: 20, 3: 20, 4: 20, 5: 15, 6: 15, 7: 15, 8: 15, 9: 20, 10: 15, 11: 15, 12: 15, 13: 20, 14: 15, 15: 15, 16: 15, 17: 15, 18: 20, 19: 15, 20: 15, 21: 15, 22: 15, 23: 15, 24: 15, 25: 15, 26: 15, 27: 15, 28: 20, 29: 15, 30: 15, 31: 15, 32: 20, 33: 15, 34: 20, 35: 15, 36: 20, 37: 15, 38: 15, 39: 20, 40: 15, 41: 15, 42: 20, 43: 15, 44: 15, 45: 15, 46: 15, 47: 20, 48: 15, 49: 20, 50: 15, 51: 20, 52: 15, 53: 15, 54: 20, 55: 15, 56: 20, 57: 15, 58: 15, 59: 15, 60: 15 };

describe("grade 7 demo lessons", () => {
  it("one lesson per deck, numbered like the deck", () => {
    expect(DEMO_LESSONS_7.map((l) => l.number)).toEqual(Array.from({ length: DEMO_LESSONS_7.length }, (_, i) => i + 1));
    for (const l of DEMO_LESSONS_7) {
      expect(l.grade).toBe(7);
      expect(l.presentation).toBe(DECKS[l.number] ?? `7-${l.number}.pptx`);
      expect(l.section).toBeLessThan(GRADE_7_SECTIONS.length);
    }
  });
  it("matching pairs have unique right sides", () => {
    for (const l of DEMO_LESSONS_7) {
      for (const g of l.games ?? []) {
        if (g.type !== "MATCHING") continue;
        for (const item of g.items as { prompt: string; pairs: { right: string }[] }[]) {
          expect(new Set(item.pairs.map((p) => p.right)).size, `${l.number} / ${g.title}: ${item.prompt}`).toBe(item.pairs.length);
        }
      }
    }
  });
  it("every game item matches its registry schema", () => {
    for (const l of DEMO_LESSONS_7) {
      for (const g of l.games ?? []) {
        for (const item of g.items) {
          const r = getDefinition(g.type as GameType).item.safeParse(item);
          expect(r.success, `lesson ${l.number} / ${g.title}: ${r.success ? "" : r.error.message}`).toBe(true);
        }
      }
    }
  });
  it("stages fit the 45-minute lesson and stay inside the deck", () => {
    for (const l of DEMO_LESSONS_7) {
      const n = SLIDES[l.number];
      expect(l.stages?.reduce((m, s) => m + s.minutes, 0), `lesson ${l.number}`).toBe(45);
      for (const s of l.stages ?? []) {
        if (s.slides) expect(s.slides[0] >= 1 && s.slides[1] <= n && s.slides[0] <= s.slides[1], `${l.number}: ${s.title}`).toBe(true);
      }
      for (const t of l.tasks ?? []) if (t.slide) expect(t.slide <= n, `${l.number}: ${t.title}`).toBe(true);
    }
  });
  it("every lesson has a quiz, cards, tasks and games", () => {
    for (const l of DEMO_LESSONS_7) {
      expect(l.extraQuestions?.length ?? 0, `${l.number}`).toBeGreaterThanOrEqual(15);
      expect(l.cards?.length ?? 0).toBeGreaterThanOrEqual(8);
      expect(l.tasks?.length ?? 0).toBe(3);
      expect(l.games?.length ?? 0).toBeGreaterThanOrEqual(3);
      for (const q of l.extraQuestions ?? []) {
        if (q.type === "SINGLE_CHOICE") {
          expect(q.correct).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, `${l.number}: ${q.prompt}`).toBe(q.options.length);
        }
        if (q.type === "MATCHING") {
          expect(new Set(q.pairs.map((p) => p[0])).size, `${l.number}: ${q.prompt}`).toBe(q.pairs.length);
          expect(new Set(q.pairs.map((p) => p[1])).size, `${l.number} (duplicate right side): ${q.prompt}`).toBe(q.pairs.length);
        }
      }
    }
  });
});
