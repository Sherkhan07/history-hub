import { describe, expect, it } from "vitest";
import { getDefinition } from "@/features/games/definitions";
import type { GameType } from "@/generated/prisma/enums";
import { DEMO_LESSONS_6 } from "../prisma/data/demo-lessons-6";
import { TEXTBOOK_6_CHAPTERS } from "../prisma/data/textbook-6";

/** Slides per deck 6-N.pptx */
const SLIDES: Record<number, number> = { 1: 15, 2: 15, 3: 20, 4: 15, 5: 15, 6: 15, 7: 20, 8: 15, 9: 15, 10: 20, 11: 20, 12: 20, 13: 15, 14: 15, 15: 15, 16: 15, 17: 15, 18: 15, 19: 15, 20: 15 };

describe("grade 6 demo lessons", () => {
  it("one lesson per deck, numbered like the deck", () => {
    expect(DEMO_LESSONS_6.map((l) => l.number)).toEqual(Array.from({ length: DEMO_LESSONS_6.length }, (_, i) => i + 1));
    for (const l of DEMO_LESSONS_6) {
      expect(l.grade).toBe(6);
      expect(l.presentation).toBe(`6-${l.number}.pptx`);
      expect(l.section).toBeLessThan(TEXTBOOK_6_CHAPTERS.length);
    }
  });
  it("matching pairs have unique right sides", () => {
    for (const l of DEMO_LESSONS_6) {
      for (const g of l.games ?? []) {
        if (g.type !== "MATCHING") continue;
        for (const item of g.items as { prompt: string; pairs: { right: string }[] }[]) {
          expect(new Set(item.pairs.map((p) => p.right)).size, `${l.number} / ${g.title}: ${item.prompt}`).toBe(item.pairs.length);
        }
      }
    }
  });
  it("every game item matches its registry schema", () => {
    for (const l of DEMO_LESSONS_6) {
      for (const g of l.games ?? []) {
        for (const item of g.items) {
          const r = getDefinition(g.type as GameType).item.safeParse(item);
          expect(r.success, `lesson ${l.number} / ${g.title}: ${r.success ? "" : r.error.message}`).toBe(true);
        }
      }
    }
  });
  it("stages fit the 45-minute lesson and stay inside the deck", () => {
    for (const l of DEMO_LESSONS_6) {
      const n = SLIDES[l.number];
      expect(l.stages?.reduce((m, s) => m + s.minutes, 0), `lesson ${l.number}`).toBe(45);
      for (const s of l.stages ?? []) {
        if (s.slides) expect(s.slides[0] >= 1 && s.slides[1] <= n && s.slides[0] <= s.slides[1], `${l.number}: ${s.title}`).toBe(true);
      }
      for (const t of l.tasks ?? []) if (t.slide) expect(t.slide <= n, `${l.number}: ${t.title}`).toBe(true);
    }
  });
  it("every lesson has a quiz, cards, tasks and games", () => {
    for (const l of DEMO_LESSONS_6) {
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
