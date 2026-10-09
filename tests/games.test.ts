import { describe, expect, it } from "vitest";
import { GAME_DEFINITIONS, GAME_TYPES, scoreGameAnswer, toPublicGameItem } from "@/features/games/definitions";
import { revealForGameItem } from "@/features/games/reveal";
import { gameLabels } from "@/features/games/definitions";
import { ru } from "@/i18n/dictionaries/ru";
import { distanceKm, project, unproject } from "@/features/games/kz-map";

describe("game registry", () => {
  it("has a definition for every game type with a valid empty item shape", () => {
    expect(GAME_TYPES).toHaveLength(8);
    for (const t of GAME_TYPES) expect(typeof GAME_DEFINITIONS[t].empty).toBe("function");
  });

  it("TIMELINE scores full and partial order", () => {
    const data = { prompt: "p", events: [{ id: "a", text: "A", year: -3000 }, { id: "b", text: "B", year: -1000 }, { id: "c", text: "C", year: 500 }] };
    expect(scoreGameAnswer("TIMELINE", data, { order: ["a", "b", "c"] })).toEqual({ correct: true, ratio: 1 });
    const partial = scoreGameAnswer("TIMELINE", data, { order: ["a", "c", "b"] });
    expect(partial.correct).toBe(false);
    expect(partial.ratio).toBeCloseTo(1 / 3);
    const pub = toPublicGameItem("TIMELINE", { id: "x", points: 100, data }).data as { events: { id: string; year?: number }[] };
    expect(pub.events.every((e) => !("year" in e))).toBe(true);
  });

  it("MAP_POINT accepts answers within radius, half inside 2×radius", () => {
    const botai = { prompt: "p", placeName: "Ботай", lat: 53.3, lon: 67.6, radiusKm: 150 };
    expect(scoreGameAnswer("MAP_POINT", botai, { lat: 53.5, lon: 67.9 }).correct).toBe(true);
    expect(scoreGameAnswer("MAP_POINT", botai, { lat: 51.0, lon: 67.6 }).ratio).toBe(0.5);
    expect(scoreGameAnswer("MAP_POINT", botai, { lat: 43.2, lon: 76.9 }).ratio).toBe(0);
    const pub = toPublicGameItem("MAP_POINT", { id: "x", points: 100, data: botai }).data as Record<string, unknown>;
    expect(pub).toEqual({ prompt: "p" });
  });

  it("MATCHING hides pairing and scores by pair id", () => {
    const data = { prompt: "p", pairs: [{ id: "p1", left: "Ботай", right: "Солтүстік" }, { id: "p2", left: "Берел", right: "Шығыс" }] };
    expect(scoreGameAnswer("MATCHING", data, { matches: { p1: "p1", p2: "p2" } }).correct).toBe(true);
    expect(scoreGameAnswer("MATCHING", data, { matches: { p1: "p2", p2: "p1" } }).ratio).toBe(0);
  });

  it("choice games score by index and never leak the answer", () => {
    const who = { clues: ["c"], options: ["A", "B"], correctIndex: 1 };
    expect(scoreGameAnswer("WHO_AM_I", who, { index: 1 }).correct).toBe(true);
    expect(scoreGameAnswer("WHO_AM_I", who, { index: 0 }).correct).toBe(false);
    expect(JSON.stringify(toPublicGameItem("WHO_AM_I", { id: "x", points: 1, data: who }).data)).not.toContain("correctIndex");
    const tf = { statement: "s", isTrue: false };
    expect(scoreGameAnswer("TRUE_FALSE", tf, { value: false }).correct).toBe(true);
    expect(JSON.stringify(toPublicGameItem("TRUE_FALSE", { id: "x", points: 1, data: tf }).data)).not.toContain("isTrue");
    expect(revealForGameItem("TRUE_FALSE", tf, gameLabels(ru))?.correctOptions).toEqual([1]);
  });

  it("ARTIFACT gives partial credit per question", () => {
    const art = { imageUrl: "public/x.webp", questions: [{ label: "Эпоха", options: ["a", "b"], correctIndex: 0 }, { label: "Материал", options: ["a", "b"], correctIndex: 1 }] };
    expect(scoreGameAnswer("ARTIFACT", art, { indexes: [0, 0] }).ratio).toBe(0.5);
    expect(scoreGameAnswer("ARTIFACT", art, { indexes: [0, 1] }).correct).toBe(true);
  });

  it("rejects malformed answers without throwing", () => {
    expect(scoreGameAnswer("TIMELINE", { prompt: "p", events: [] }, { order: [] })).toEqual({ correct: false, ratio: 0 });
    expect(scoreGameAnswer("WHO_AM_I", { clues: ["c"], options: ["A", "B"], correctIndex: 0 }, { nope: 1 })).toEqual({ correct: false, ratio: 0 });
  });

  it("map projection round-trips and distances are sane", () => {
    const p = project(71.45, 51.17);
    const back = unproject(p.x, p.y);
    expect(back.lon).toBeCloseTo(71.45, 5);
    expect(back.lat).toBeCloseTo(51.17, 5);
    expect(distanceKm({ lat: 51.17, lon: 71.45 }, { lat: 43.24, lon: 76.95 })).toBeGreaterThan(900);
    expect(distanceKm({ lat: 51.17, lon: 71.45 }, { lat: 43.24, lon: 76.95 })).toBeLessThan(1050);
  });
});
