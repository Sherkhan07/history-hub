import { describe, expect, it } from "vitest";
import { getDefinition } from "@/features/games/definitions";
import type { GameType } from "@/generated/prisma/enums";
import { DEMO_LESSONS } from "../prisma/data/demo-lessons";
import { spreadCorrect, spreadGameItem } from "../prisma/data/spread";
import { DEMO_LESSON_TOPICS, TEXTBOOK_CHAPTERS, TEXTBOOK_TOPICS, lessonPlan, topicPages } from "../prisma/data/textbook";

describe("seeded demo lessons", () => {
  it("every game item matches its registry schema", () => {
    for (const l of DEMO_LESSONS) {
      for (const g of l.games ?? []) {
        for (const item of g.items) {
          const r = getDefinition(g.type as GameType).item.safeParse(item);
          expect(r.success, `lesson ${l.number} / ${g.title}: ${r.success ? "" : r.error.message}`).toBe(true);
        }
      }
    }
  });
  it("stages reference existing games and fit the lesson duration", () => {
    for (const l of DEMO_LESSONS) {
      const titles = new Set((l.games ?? []).map((g) => g.title));
      for (const s of l.stages ?? []) if (s.game) expect(titles.has(s.game), `${l.number}: ${s.game}`).toBe(true);
      if (l.stages?.length) expect(l.stages.reduce((n, s) => n + s.minutes, 0)).toBe(45);
    }
  });
  it("lesson numbers are unique", () => {
    const nums = DEMO_LESSONS.map((l) => l.number);
    expect(new Set(nums).size).toBe(nums.length);
  });
});

describe("textbook topic list", () => {
  it("has every paragraph §1–§64 once, in page order", () => {
    expect(TEXTBOOK_TOPICS.map((t) => t.n)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    for (let i = 1; i < TEXTBOOK_TOPICS.length; i++) expect(TEXTBOOK_TOPICS[i].page).toBeGreaterThanOrEqual(TEXTBOOK_TOPICS[i - 1].page);
    for (const t of TEXTBOOK_TOPICS) {
      const [a, b] = topicPages(t);
      expect(b, `§${t.n}`).toBeGreaterThanOrEqual(a);
      expect(TEXTBOOK_CHAPTERS.some((c) => c.n === t.chapter)).toBe(true);
    }
  });
  it("book questions are well-formed", () => {
    for (const t of TEXTBOOK_TOPICS) {
      const prompts = new Set<string>();
      for (const q of t.questions ?? []) {
        expect(prompts.has(q.prompt), `§${t.n} duplicate: ${q.prompt}`).toBe(false);
        prompts.add(q.prompt);
        expect(q.explanation, `§${t.n}: ${q.prompt}`).toMatch(/Оқулық, \d+-бет/);
        if (q.type === "SINGLE_CHOICE") {
          expect(q.correct).toBeGreaterThanOrEqual(0);
          expect(q.correct).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, `§${t.n}: ${q.prompt}`).toBe(q.options.length);
        }
        if (q.type === "MATCHING") {
          expect(q.pairs.length).toBeGreaterThanOrEqual(2);
          expect(new Set(q.pairs.map((p) => p[0])).size).toBe(q.pairs.length);
        }
      }
    }
  });
  it("every paragraph is taught once: by a demo lesson or a new textbook lesson with a quiz", () => {
    const demo = Object.values(DEMO_LESSON_TOPICS).flat();
    expect(new Set(demo).size).toBe(demo.length);
    const plan = lessonPlan().flatMap((c) => c.items);
    const fromBook = plan.flatMap((i) => (i.kind === "topic" ? [i.topic.n] : []));
    expect([...demo, ...fromBook].sort((a, b) => a - b)).toEqual(TEXTBOOK_TOPICS.map((t) => t.n));
    for (const i of plan) if (i.kind === "topic") expect(i.topic.questions?.length ?? 0, `§${i.topic.n}`).toBeGreaterThanOrEqual(5);
    expect(plan.filter((i) => i.kind === "demo").length).toBe(DEMO_LESSONS.length);
  });
});

describe("lessons from decks 5-11 … 5-65", () => {
  const SLIDES: Record<string, number> = { "5-11.pptx": 15, "5-12.pptx": 15, "5-13.pptx": 20, "5-14.pptx": 15, "5-15.pptx": 15, "5-16.pptx": 15, "5-17.pptx": 20, "5-18.pptx": 15, "5-19.pptx": 15, "5-20.pptx": 15, "5-21.pptx": 15, "5-22.pptx": 18, "5-23.pptx": 15, "5-24.pptx": 15, "5-25.pptx": 15, "5-26.pptx": 15, "5-27.pptx": 15, "5-28.pptx": 15, "5-29.pptx": 15, "5-30.pptx": 15, "5-31.pptx": 15, "5-32.pptx": 15, "5-33.pptx": 15, "5-34.pptx": 15, "5-35.pptx": 15, "5-36.pptx": 20, "5-37.pptx": 15, "5-38.pptx": 15, "5-39.pptx": 15, "5-40.pptx": 20, "5-41.pptx": 15, "5-42.pptx": 20, "5-43.pptx": 15, "5-44.pptx": 15, "5-45.pptx": 15, "5-46.pptx": 15, "5-47.pptx": 15, "5-48.pptx": 15, "5-49.pptx": 15, "5-50.pptx": 15, "5-51.pptx": 20, "5-52.pptx": 15, "5-53.pptx": 15, "5-54.pptx": 15, "5-55.pptx": 15, "5-56.pptx": 15, "5-57.pptx": 15, "5-58.pptx": 15, "5-59.pptx": 15, "5-61.pptx": 15, "5-62.pptx": 15, "5-63.pptx": 15, "5-64.pptx": 15, "5-65.pptx": 20 };
  const lessons = DEMO_LESSONS.filter((l) => l.presentation && l.presentation in SLIDES);
  it("covers every deck 5-11 … 5-65 (5-60 duplicates 5-59, so lesson 60 does not exist)", () => {
    expect(lessons.map((l) => l.number)).toEqual(Array.from({ length: 55 }, (_, i) => i + 11).filter((n) => n !== 60));
  });
  it("slide references stay inside the deck", () => {
    for (const l of lessons) {
      const n = SLIDES[l.presentation!];
      for (const s of l.stages ?? []) if (s.slides) expect(s.slides[0] >= 1 && s.slides[1] <= n && s.slides[0] <= s.slides[1], `${l.number}: ${s.title}`).toBe(true);
      for (const t of l.tasks ?? []) if (t.slide) expect(t.slide <= n, `${l.number}: ${t.title}`).toBe(true);
    }
  });
  it("every lesson has a quiz, cards, tasks and games", () => {
    for (const l of lessons) {
      expect(l.extraQuestions?.length ?? 0, `${l.number}`).toBeGreaterThanOrEqual(8);
      expect(l.cards?.length ?? 0).toBeGreaterThanOrEqual(8);
      expect(l.tasks?.length ?? 0).toBe(3);
      expect(l.games?.length ?? 0).toBeGreaterThanOrEqual(2);
      for (const q of l.extraQuestions ?? []) if (q.type === "SINGLE_CHOICE") expect(q.correct).toBeLessThan(q.options.length);
    }
  });
});

describe("spreading correct answers", () => {
  it("moves the correct option away from the first slot, keeping the others in order, and is stable", () => {
    const options = ["верный", "a", "b", "c"];
    const a = spreadCorrect(options, 0, "вопрос");
    expect(a.options[a.correct]).toBe("верный");
    expect(a.options.filter((o) => o !== "верный")).toEqual(["a", "b", "c"]);
    expect(spreadCorrect(options, 0, "вопрос")).toEqual(a);
  });
  it("does not change a game item whose correct answer is already not first", () => {
    const item = { prompt: "q", options: ["a", "b", "c"], correctIndex: 2 };
    expect(spreadGameItem(item)).toEqual(item);
  });
  it("spreads game items and artifact questions without losing the right answer", () => {
    const item = { prompt: "q", options: ["right", "x", "y", "z"], correctIndex: 0 };
    const out = spreadGameItem(item);
    expect(out.options[out.correctIndex]).toBe("right");
    const art = spreadGameItem({ caption: "c", questions: [{ label: "L", options: ["right", "x", "y"], correctIndex: 0 }] });
    expect(art.questions[0].options[art.questions[0].correctIndex]).toBe("right");
  });
  it("the demo lessons really spread: correct answers are not all in the first slot", () => {
    const pos = [0, 0, 0, 0, 0, 0];
    for (const l of DEMO_LESSONS) for (const q of l.extraQuestions ?? []) if (q.type === "SINGLE_CHOICE" && q.options.length >= 3) pos[spreadCorrect(q.options, q.correct, q.prompt).correct]++;
    expect(pos[0]).toBeLessThan(pos[1] + pos[2] + 1);
    expect(pos[1] + pos[2]).toBeGreaterThan(20);
  });
});
