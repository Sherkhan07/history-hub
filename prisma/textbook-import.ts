/**
 * Builds the full "Қазақстан тарихы, 5-сынып" topic list from the textbook (130.pdf):
 *  - every chapter becomes a section in its quarter, every paragraph a lesson (in book order);
 *  - paragraphs already taught by a demo lesson are not duplicated — their book questions are
 *    appended to that lesson's quiz;
 *  - each lesson gets a link to its textbook pages, the «Біліміңді тексер!» questions and a quiz.
 *
 * Idempotent: lessons are matched by section + title, questions by prompt.
 * Used by prisma/seed.ts and by `npm run textbook:import` on an existing database.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { ContentStatus, QuestionType } from "../src/generated/prisma/enums";
import { storage } from "../src/server/storage";
import { DEMO_LESSONS, type DemoQuestion } from "./data/demo-lessons";
import { spreadCorrect } from "./data/spread";
import {
  DEMO_LESSON_BANK,
  DEMO_LESSON_QUESTION_LIMIT,
  DEMO_LESSON_TOPICS,
  TEXTBOOK_CHAPTERS,
  TEXTBOOK_FILE,
  TEXTBOOK_KEY,
  TEXTBOOK_TOPICS,
  lessonPlan,
  pagesLabel,
  topicPages,
  type TextbookTopic,
} from "./data/textbook";
import textbook from "./data/textbook-questions.json";

type TextbookQ = { prompt: string; options: string[]; correct: number };
const TEST_BANK = textbook as Record<string, TextbookQ[]>;

/** Questions from the .docx test bank (one key per paragraph, e.g. "6. Тас дәуірі…"). */
export function textbookQuestions(sections: string[], exclude: string[] = [], limit: number): DemoQuestion[] {
  const all = sections.flatMap((prefix) => {
    const key = Object.keys(TEST_BANK).find((k) => k.startsWith(prefix));
    return key ? TEST_BANK[key] : [];
  });
  return all
    .filter((q) => !exclude.some((e) => q.prompt.includes(e)))
    .filter((q) => q.options.length >= 3 && q.options.every((o) => o.trim().length > 0))
    .slice(0, limit)
    .map((q) => ({ type: "SINGLE_CHOICE" as const, prompt: q.prompt.replace(/\s+/g, " ").trim(), options: q.options.map((o) => o.replace(/\s+/g, " ").trim()), correct: q.correct }));
}

export function questionCreate(q: DemoQuestion, sortOrder: number): Prisma.QuestionCreateWithoutQuizInput {
  const base = { prompt: q.prompt, sortOrder, points: 100, explanation: "explanation" in q ? q.explanation : undefined };
  switch (q.type) {
    case "SINGLE_CHOICE": {
      const spread = spreadCorrect(q.options, q.correct, q.prompt);
      return { ...base, type: "SINGLE_CHOICE", options: { create: spread.options.map((text, i) => ({ text, isCorrect: i === spread.correct, sortOrder: i })) } };
    }
    case "TRUE_FALSE":
      return {
        ...base,
        type: "TRUE_FALSE",
        options: { create: [{ text: "Ақиқат", isCorrect: q.isTrue, sortOrder: 0 }, { text: "Жалған", isCorrect: !q.isTrue, sortOrder: 1 }] },
      };
    case "MATCHING":
      return { ...base, type: "MATCHING" as QuestionType, options: { create: q.pairs.map(([text, matchText], i) => ({ text, matchText, sortOrder: i })) } };
    case "ORDERING":
      return { ...base, type: "ORDERING", options: { create: q.order.map((text, i) => ({ text, correctOrder: i, sortOrder: i })) } };
  }
}

/** Up to `limit` questions, taking turns between the paragraphs so each one is represented. */
function pickQuestions(topics: TextbookTopic[], limit: number): DemoQuestion[] {
  const lists = topics.map((t) => t.questions ?? []);
  const out: DemoQuestion[] = [];
  for (let i = 0; out.length < limit; i++) {
    const row = lists.flatMap((l) => (i < l.length ? [l[i]] : []));
    if (!row.length) break;
    out.push(...row.slice(0, limit - out.length));
  }
  return out;
}

// ───────────────────────────── import ─────────────────────────────

const ACADEMIC_YEAR = "2026/2027";

export async function importTextbook(db: PrismaClient, opts: { materialsDir: string; log?: (s: string) => void }) {
  const log = opts.log ?? console.log;
  const store = storage();

  // 1. One shared copy of the textbook PDF
  const pdfFile = path.join(opts.materialsDir, TEXTBOOK_FILE);
  let pdfSize: number | null = (await store.stat(TEXTBOOK_KEY))?.size ?? null;
  if (pdfSize === null && existsSync(pdfFile)) {
    const data = readFileSync(pdfFile);
    await store.put(TEXTBOOK_KEY, data, "application/pdf");
    pdfSize = data.byteLength;
    log(`  · textbook PDF stored (${(pdfSize / 1024 / 1024).toFixed(1)} MB)`);
  }
  if (pdfSize === null) log(`  ! ${TEXTBOOK_FILE} not found in ${opts.materialsDir} — page links skipped`);

  const moderator = await db.user.findFirstOrThrow({ where: { role: "MODERATOR" }, orderBy: { createdAt: "asc" } });
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const subject = await db.subject.findUniqueOrThrow({ where: { slug: "history-kz" } });
  const quarters = await db.quarter.findMany({
    where: { curriculum: { subjectId: subject.id, grade: { number: 5 }, academicYear: ACADEMIC_YEAR, language: "kk" } },
  });
  const quarterId = (n: number) => quarters.find((q) => q.number === n)!.id;

  const pageResource = async (lessonId: string, topics: TextbookTopic[], status: ContentStatus, sortOrder: number) => {
    if (pdfSize === null || !topics.length) return;
    const first = topicPages(topics[0]);
    const last = topicPages(topics[topics.length - 1]);
    const range: [number, number] = [first[0], last[1]];
    const title = `Оқулық: ${topics.map((t) => `§${t.n}`).join(", ")} (${pagesLabel(range)})`;
    if (await db.resource.findFirst({ where: { lessonId, title } })) return;
    await db.resource.create({
      data: {
        lessonId,
        type: "ADDITIONAL",
        title,
        description: topics.map((t) => `§${t.n}. ${t.title}`).join("\n"),
        sortOrder,
        status,
        createdById: moderator.id,
        fileUrl: TEXTBOOK_KEY,
        originalName: "kazakhstan-tarihy-5-2017.pdf",
        mimeType: "application/pdf",
        fileSize: pdfSize,
        previewKind: "PDF",
        previewPages: [TEXTBOOK_KEY],
        pageCount: range[1] - range[0] + 1,
        content: { pdfPage: range[0] },
      },
    });
  };

  const addQuestions = async (lessonId: string, title: string, description: string, questions: DemoQuestion[]) => {
    if (!questions.length) return 0;
    const quiz =
      (await db.quiz.findFirst({ where: { lessonId }, orderBy: { createdAt: "asc" }, include: { questions: { select: { prompt: true, sortOrder: true } } } })) ??
      (await db.quiz.create({ data: { lessonId, title, description }, include: { questions: { select: { prompt: true, sortOrder: true } } } }));
    const existing = new Set(quiz.questions.map((q) => q.prompt));
    const fresh = questions.filter((q) => !existing.has(q.prompt));
    let sort = quiz.questions.reduce((m, q) => Math.max(m, q.sortOrder + 1), 0);
    for (const q of fresh) await db.question.create({ data: { ...questionCreate(q, sort++), quizId: quiz.id } });
    if (fresh.length && quiz.description && !quiz.description.includes("оқулық")) {
      await db.quiz.update({ where: { id: quiz.id }, data: { description: `${quiz.description} Оқулық бойынша сұрақтармен толықтырылды.` } });
    }
    return fresh.length;
  };

  // A paragraph now taught by a demo lesson (built from the teacher's slides) must not stay as a
  // separate book lesson. Only untouched imports are folded: no edits, favorites or class sessions.
  let folded = 0;
  for (const [num, topicNumbers] of Object.entries(DEMO_LESSON_TOPICS)) {
    const demo = DEMO_LESSONS.find((d) => d.number === Number(num));
    const covering = demo && topicNumbers.length ? await db.lesson.findFirst({ where: { title: demo.title } }) : null;
    if (!covering) continue;
    for (const n of topicNumbers) {
      const t = TEXTBOOK_TOPICS.find((x) => x.n === n)!;
      const standalone = await db.lesson.findMany({
        where: { title: t.title, id: { not: covering.id }, description: { startsWith: `Оқулық, §${n} ` }, favorites: { none: {} }, sessions: { none: {} } },
        include: { versions: { select: { note: true } } },
      });
      for (const l of standalone) {
        if (l.versions.length !== 1 || !l.versions[0].note?.startsWith("Оқулықтан импорт")) continue;
        await db.lesson.delete({ where: { id: l.id } });
        folded++;
        log(`  ~ §${n} "${t.title}" is now part of lesson "${demo!.title}"`);
      }
    }
  }

  let number = 0;
  let created = 0;
  let added = 0;
  for (const { chapter, items } of lessonPlan()) {
    const qid = quarterId(chapter.quarter);
    const chapterOrder = TEXTBOOK_CHAPTERS.filter((c) => c.quarter === chapter.quarter).indexOf(chapter);
    const section =
      (await db.section.findFirst({ where: { quarterId: qid, title: chapter.title } })) ??
      (await db.section.create({ data: { quarterId: qid, title: chapter.title, sortOrder: chapterOrder } }));

    let lastLessonId: string | null = null;
    for (const item of items) {
      number++;
      if (item.kind === "demo") {
        const lesson = await db.lesson.findFirst({ where: { sectionId: section.id, title: item.title } });
        if (!lesson) {
          log(`  ! demo lesson "${item.title}" not found — skipped`);
          continue;
        }
        lastLessonId = lesson.id;
        if (lesson.lessonNumber !== number) await db.lesson.update({ where: { id: lesson.id }, data: { lessonNumber: number } });
        const topics = (DEMO_LESSON_TOPICS[item.number] ?? []).map((n) => TEXTBOOK_TOPICS.find((t) => t.n === n)!);
        const bank = DEMO_LESSON_BANK[item.number];
        const questions = [...(bank ? textbookQuestions([bank.section], [], bank.limit) : []), ...pickQuestions(topics, DEMO_LESSON_QUESTION_LIMIT)];
        added += await addQuestions(lesson.id, "Тест: " + lesson.title.split(":")[0], "Сұрақтар оқулықтан алынған.", questions);
        const sort = await db.resource.count({ where: { lessonId: lesson.id } });
        await pageResource(lesson.id, topics, lesson.status, sort);
        continue;
      }

      const t = item.topic;
      const pages = topicPages(t);
      let lesson = await db.lesson.findFirst({ where: { sectionId: section.id, title: t.title } });
      if (!lesson) {
        lesson = await db.lesson.create({
          data: {
            sectionId: section.id,
            lessonNumber: number,
            title: t.title,
            description: `Оқулық, §${t.n} (${pagesLabel(pages)}).${t.keywords?.length ? " Тірек сөздер: " + t.keywords.join(", ") + "." : ""}`,
            keywords: t.keywords ?? [],
            language: "kk",
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdById: moderator.id,
            objectives: { create: (t.goals ?? []).map((text, i) => ({ code: "", text, sortOrder: i })) },
          },
        });
        await db.contentVersion.create({
          data: { lessonId: lesson.id, version: 1, status: "PUBLISHED", snapshot: { title: t.title, textbook: t.n }, note: `Оқулықтан импорт: §${t.n}`, createdById: admin.id },
        });
        created++;
        log(`  + ${number}. §${t.n} ${t.title}`);
      } else if (lesson.lessonNumber !== number) {
        await db.lesson.update({ where: { id: lesson.id }, data: { lessonNumber: number } });
      }
      lastLessonId = lesson.id;

      await pageResource(lesson.id, [t], lesson.status, 0);
      if (t.review?.length && !(await db.resource.findFirst({ where: { lessonId: lesson.id, type: "TASK", title: "Біліміңді тексер!" } }))) {
        await db.resource.create({
          data: {
            lessonId: lesson.id,
            type: "TASK",
            title: "Біліміңді тексер!",
            description: `Оқулық, §${t.n}`,
            sortOrder: 1,
            status: lesson.status,
            createdById: moderator.id,
            content: { tasks: t.review.map((q, i) => ({ title: `${i + 1}-сұрақ`, instructions: q, mode: "individual" as const })) },
          },
        });
      }
      added += await addQuestions(lesson.id, `Тест: §${t.n}. ${t.title}`, `Сұрақтар оқулықтан алынған: §${t.n} (${pagesLabel(pages)}).`, t.questions ?? []);
    }

    // «Бекіту сұрақтары» of the chapter go to its last lesson
    if (chapter.review && lastLessonId && !(await db.resource.findFirst({ where: { lessonId: lastLessonId, type: "TASK", title: "Бекіту сұрақтары" } }))) {
      const last = await db.lesson.findUniqueOrThrow({ where: { id: lastLessonId }, select: { status: true } });
      await db.resource.create({
        data: {
          lessonId: lastLessonId,
          type: "TASK",
          title: "Бекіту сұрақтары",
          description: `${chapter.n}-тарау: «${chapter.title}» (оқулық, ${chapter.review.page}-бет)`,
          sortOrder: 50,
          status: last.status,
          createdById: moderator.id,
          content: { tasks: chapter.review.questions.map((q, i) => ({ title: `${i + 1}-сұрақ`, instructions: q, mode: "individual" as const })) },
        },
      });
    }
  }
  log(`  Textbook: ${created} new lessons, ${folded} folded into slide lessons, ${added} questions added, ${number} lessons in the plan.`);
}
