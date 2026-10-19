/**
 * Copies corrected lesson content from the demo data files into an existing database.
 * The seed skips lessons that already exist, so edits in prisma/data/demo-lessons*.ts never reach
 * a seeded database on their own. Lessons are matched by grade and title and updated in place:
 * lesson texts, task/card/homework resources, quiz questions, game items and stage texts.
 * Row ids are kept wherever the shape still fits, so past game sessions keep their answers.
 * Re-running changes nothing new.
 *
 *   npm run content:sync
 */
import "dotenv/config";
import { isDeepStrictEqual } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { GameType } from "../src/generated/prisma/enums";
import { getDefinition } from "../src/features/games/definitions";
import { DEMO_LESSONS, type DemoLesson } from "../prisma/data/demo-lessons";
import { DEMO_LESSONS_6 } from "../prisma/data/demo-lessons-6";
import { DEMO_LESSONS_7 } from "../prisma/data/demo-lessons-7";
import { GRADE_7_SECTIONS } from "../prisma/data/sections-7";
import { spreadGameItem } from "../prisma/data/spread";
import { TEXTBOOK_CHAPTERS } from "../prisma/data/textbook";
import { TEXTBOOK_6_CHAPTERS } from "../prisma/data/textbook-6";
import { questionCreate, textbookQuestions } from "../prisma/textbook-import";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/** Drops undefined fields, as storing JSON does */
const json = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

type OptionRow = { text: string; isCorrect?: boolean; matchText?: string | null; correctOrder?: number | null; sortOrder: number };

const count = { lessons: 0, resources: 0, questions: 0, gameItems: 0, stages: 0, missing: 0, unmatched: 0 };

/** Compares the option fields a question create sets with the stored ones */
function sameOptions(stored: OptionRow[], wanted: OptionRow[]) {
  const norm = (o: OptionRow) => [o.text, o.isCorrect ?? false, o.matchText ?? null, o.correctOrder ?? null, o.sortOrder];
  return isDeepStrictEqual(stored.map(norm), wanted.map(norm));
}

async function syncResource(lessonId: string, type: "TASK" | "CARDS" | "HOMEWORK", content: Prisma.InputJsonValue | undefined) {
  if (content === undefined) return;
  const resource = await db.resource.findFirst({ where: { lessonId, type }, select: { id: true, content: true } });
  if (!resource || isDeepStrictEqual(resource.content, json(content))) return;
  await db.resource.update({ where: { id: resource.id }, data: { content } });
  count.resources++;
}

async function syncQuiz(lessonId: string, demo: DemoLesson) {
  const questions = [
    ...(demo.textbookQuiz ? textbookQuestions(demo.textbookQuiz.sections, demo.textbookQuiz.exclude, demo.textbookQuiz.limit) : []),
    ...(demo.extraQuestions ?? []),
  ];
  if (!questions.length) return;
  const quiz = await db.quiz.findFirst({
    where: { lessonId, title: "Тест: " + demo.title.split(":")[0] },
    include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!quiz) {
    count.unmatched++;
    return;
  }
  for (const [i, q] of questions.entries()) {
    const wanted = questionCreate(q, i);
    const wantedOptions = (wanted.options?.create ?? []) as OptionRow[];
    const stored = quiz.questions[i];
    if (!stored) {
      await db.question.create({ data: { ...wanted, quizId: quiz.id } });
      count.questions++;
      continue;
    }
    const sameQuestion = stored.type === wanted.type && stored.prompt === wanted.prompt && (stored.explanation ?? undefined) === (wanted.explanation ?? undefined);
    if (sameQuestion && sameOptions(stored.options, wantedOptions)) continue;
    await db.question.update({
      where: { id: stored.id },
      data: { type: wanted.type, prompt: wanted.prompt, explanation: wanted.explanation ?? null, options: { deleteMany: {}, create: wantedOptions } },
    });
    count.questions++;
  }
  const extra = quiz.questions.slice(questions.length).map((q) => q.id);
  if (extra.length) {
    await db.question.deleteMany({ where: { id: { in: extra } } });
    count.questions += extra.length;
  }
}

async function syncGames(lessonId: string, demo: DemoLesson) {
  for (const [gi, g] of (demo.games ?? []).entries()) {
    // Titles repeat inside some lessons; the seed stores the position as sortOrder
    const game = await db.game.findFirst({ where: { lessonId, title: g.title, sortOrder: gi }, include: { items: { orderBy: { sortOrder: "asc" } } } });
    if (!game) {
      count.unmatched++;
      continue;
    }
    const def = getDefinition(g.type as GameType);
    for (const [idx, item] of g.items.entries()) {
      const parsed = def.item.safeParse(spreadGameItem(item));
      if (!parsed.success) throw new Error(`Invalid ${g.type} item in "${demo.title}" / ${g.title} #${idx}: ${parsed.error.message}`);
      const data = json(parsed.data) as Prisma.InputJsonValue;
      const stored = game.items[idx];
      if (!stored) {
        await db.gameItem.create({ data: { gameId: game.id, sortOrder: idx, data } });
        count.gameItems++;
      } else if (!isDeepStrictEqual(stored.data, data)) {
        await db.gameItem.update({ where: { id: stored.id }, data: { data } });
        count.gameItems++;
      }
    }
    if (game.instructions !== (g.instructions ?? null)) await db.game.update({ where: { id: game.id }, data: { instructions: g.instructions ?? null } });
  }
}

async function syncStages(lessonId: string, demo: DemoLesson) {
  const stages = await db.lessonStage.findMany({ where: { lessonId }, orderBy: { sortOrder: "asc" } });
  for (const [si, s] of (demo.stages ?? []).entries()) {
    const stored = stages[si];
    if (!stored || (stored.title === s.title && stored.description === (s.description ?? null))) continue;
    await db.lessonStage.update({ where: { id: stored.id }, data: { title: s.title, description: s.description ?? null } });
    count.stages++;
  }
}

async function main() {
  const groups: [number, DemoLesson[], { title: string; quarter: number }[]][] = [
    [5, DEMO_LESSONS, TEXTBOOK_CHAPTERS],
    [6, DEMO_LESSONS_6, TEXTBOOK_6_CHAPTERS],
    [7, DEMO_LESSONS_7, GRADE_7_SECTIONS],
  ];
  for (const [grade, lessons, chapters] of groups) {
    const seen = new Set<string>();
    for (const demo of lessons) {
      // Same match as the seed: chapter section + title; a repeated title in one section was never seeded
      const chapter = chapters[demo.section];
      const key = `${chapter.quarter}|${chapter.title}|${demo.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const lesson = await db.lesson.findFirst({
        where: { title: demo.title, section: { title: chapter.title, quarter: { number: chapter.quarter, curriculum: { grade: { number: grade } } } } },
        select: { id: true, description: true, researchQuestion: true, keywords: true },
      });
      if (!lesson) {
        count.missing++;
        continue;
      }
      const texts = { description: demo.description, researchQuestion: demo.researchQuestion ?? null, keywords: demo.keywords };
      if (lesson.description !== texts.description || lesson.researchQuestion !== texts.researchQuestion || !isDeepStrictEqual(lesson.keywords, texts.keywords)) {
        await db.lesson.update({ where: { id: lesson.id }, data: texts });
        count.lessons++;
      }
      await syncResource(lesson.id, "TASK", demo.tasks?.length ? ({ tasks: demo.tasks } as Prisma.InputJsonValue) : undefined);
      await syncResource(lesson.id, "CARDS", demo.cards?.length ? ({ cards: demo.cards } as Prisma.InputJsonValue) : undefined);
      await syncResource(lesson.id, "HOMEWORK", demo.homework ? { text: demo.homework } : undefined);
      await syncQuiz(lesson.id, demo);
      await syncGames(lesson.id, demo);
      await syncStages(lesson.id, demo);
    }
  }
  console.log(
    `Updated — lessons: ${count.lessons}, resources: ${count.resources}, questions: ${count.questions}, game items: ${count.gameItems}, stages: ${count.stages}; lessons not in the database: ${count.missing}; quizzes/games not found: ${count.unmatched}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
