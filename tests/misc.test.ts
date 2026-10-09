import { describe, expect, it } from "vitest";
import { rateLimit } from "@/server/rate-limit";
import { guessResourceType, matchesSignature } from "@/features/resources/file-rules";
import { countLabel, formatClock, plural } from "@/lib/format";
import { seededShuffle } from "@/lib/random";
import { deepMerge } from "@/i18n/merge";

describe("rate limit", () => {
  it("allows up to the limit within the window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 1000).ok).toBe(true);
    expect(rateLimit(key, 3, 1000).ok).toBe(false);
  });
});

describe("file rules", () => {
  it("checks magic bytes", () => {
    expect(matchesSignature("pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(matchesSignature("pdf", Buffer.from("MZ\x90\x00"))).toBe(false);
    expect(matchesSignature("pptx", Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(matchesSignature("image", Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
  });
  it("guesses resource types from names", () => {
    expect(guessResourceType("5-7.pptx")).toBe("PRESENTATION");
    expect(guessResourceType("Рабочий лист Ботай.pdf")).toBe("WORKSHEET");
    expect(guessResourceType("clip.mp4")).toBe("VIDEO");
  });
});

describe("formatting", () => {
  it("russian plurals", () => {
    expect(plural(1, ["слайд", "слайда", "слайдов"])).toBe("слайд");
    expect(plural(3, ["слайд", "слайда", "слайдов"])).toBe("слайда");
    expect(plural(11, ["слайд", "слайда", "слайдов"])).toBe("слайдов");
    expect(countLabel(21, ["вопрос", "вопроса", "вопросов"])).toBe("21 вопрос");
  });
  it("clock", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(-5)).toBe("−00:05");
  });
  it("seeded shuffle is stable and never returns the solved order", () => {
    const a = seededShuffle([1, 2, 3, 4], "seed");
    expect(seededShuffle([1, 2, 3, 4], "seed")).toEqual(a);
    expect(a).not.toEqual([1, 2, 3, 4]);
  });
  it("i18n deep merge falls back to base keys", () => {
    expect(deepMerge({ a: { b: "ru", c: "ru" } }, { a: { b: "kk" } })).toEqual({ a: { b: "kk", c: "ru" } });
  });
});
