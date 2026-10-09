/**
 * Seed: subjects, grades 5–11, curricula with 4 quarters, demo users, settings, the real
 * "Қазақстан тарихы 5-сынып, I тоқсан" lessons built from the materials folder and the full
 * topic list of the 5th-grade textbook (130.pdf) with quizzes — see textbook-import.ts.
 *
 * Run: npm run db:seed   (idempotent — existing lessons are left untouched)
 * Reset everything: npm run db:reset
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { GameType } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/server/auth/password";
import { processUpload } from "../src/features/resources/server/process";
import { extractSlideImages } from "../src/features/resources/server/pptx";
import { storage } from "../src/server/storage";
import { getDefinition } from "../src/features/games/definitions";
import { ARTIFACT_CROPS, DEMO_LESSONS } from "./data/demo-lessons";
import { TEXTBOOK_CHAPTERS } from "./data/textbook";
import { spreadGameItem } from "./data/spread";
import { importTextbook, questionCreate, textbookQuestions } from "./textbook-import";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const MATERIALS_DIR = path.resolve(process.cwd(), process.env.MATERIALS_DIR ?? "..");
const ACADEMIC_YEAR = "2026/2027";
const MAX_BYTES = 200 * 1024 * 1024;

function requirePassword(name: string): string {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === "production") throw new Error(`${name} must be set to seed in production`);
  throw new Error(`${name} is not set. Copy .env.example to .env and fill SEED_* passwords.`);
}

async function seedUsers() {
  const users = [
    { email: "admin@example.com", name: "Айгерим Сапарова", role: "ADMIN" as const, pw: "SEED_ADMIN_PASSWORD", canReview: true },
    { email: "moderator@example.com", name: "Нұрлан Есенов", role: "MODERATOR" as const, pw: "SEED_MODERATOR_PASSWORD", canReview: false },
    { email: "teacher@example.com", name: "Дана Ахметова", role: "TEACHER" as const, pw: "SEED_TEACHER_PASSWORD", canReview: false },
  ];
  const out: Record<string, string> = {};
  for (const u of users) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    const row =
      existing ??
      (await db.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          canReview: u.canReview,
          passwordHash: await hashPassword(requirePassword(u.pw)),
          school: "Демо-школа",
        },
      }));
    out[u.role] = row.id;
  }
  return out as { ADMIN: string; MODERATOR: string; TEACHER: string };
}

async function seedCurriculum() {
  const subjects = [
    { slug: "history-kz", name: "История Казахстана", nameKk: "Қазақстан тарихы", accent: "kz", sortOrder: 1, description: "От каменного века до независимого Казахстана", descriptionKk: "Тас дәуірінен Тәуелсіз Қазақстанға дейін" },
    { slug: "world-history", name: "Всемирная история", nameKk: "Дүниежүзі тарихы", accent: "world", sortOrder: 2, description: "Цивилизации, империи и идеи, изменившие мир", descriptionKk: "Әлемді өзгерткен өркениеттер, империялар мен идеялар" },
  ];
  for (const s of subjects) await db.subject.upsert({ where: { slug: s.slug }, update: {}, create: s });
  for (const n of [5, 6, 7, 8, 9, 10, 11]) await db.grade.upsert({ where: { number: n }, update: {}, create: { number: n } });

  const allSubjects = await db.subject.findMany();
  const grades = await db.grade.findMany();
  for (const s of allSubjects) {
    for (const g of grades) {
      const c = await db.curriculum.upsert({
        where: { subjectId_gradeId_academicYear_language: { subjectId: s.id, gradeId: g.id, academicYear: ACADEMIC_YEAR, language: "kk" } },
        update: {},
        create: { subjectId: s.id, gradeId: g.id, academicYear: ACADEMIC_YEAR, language: "kk" },
      });
      for (const q of [1, 2, 3, 4]) {
        await db.quarter.upsert({
          where: { curriculumId_number: { curriculumId: c.id, number: q } },
          update: {},
          create: { curriculumId: c.id, number: q },
        });
      }
    }
  }
}

async function seedSettings() {
  const defaults: Record<string, Prisma.InputJsonValue> = {
    "uploads.maxSizeMb": 100,
    "platform.academicYear": ACADEMIC_YEAR,
    "platform.announcement": "",
    "sessions.defaultTimePerQuestion": 30,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}

async function seedArtifactImages() {
  const store = storage();
  for (const c of ARTIFACT_CROPS) {
    if (await store.stat(c.key)) continue;
    const file = path.join(MATERIALS_DIR, c.deck);
    if (!existsSync(file)) {
      console.warn(`  ! ${c.deck} not found — artifact image ${c.key} skipped`);
      continue;
    }
    const slides = await extractSlideImages(readFileSync(file));
    const webp = await sharp(slides[c.slide - 1]).extract(c.crop).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    await store.put(c.key, webp, "image/webp");
  }
}

async function seedDemoLessons(users: { ADMIN: string; MODERATOR: string }) {
  const subject = await db.subject.findUniqueOrThrow({ where: { slug: "history-kz" } });
  const quarters = await db.quarter.findMany({
    where: { curriculum: { subjectId: subject.id, grade: { number: 5 }, academicYear: ACADEMIC_YEAR } },
  });
  // A demo lesson lives in the section of its textbook chapter (the chapter's quarter and title)
  const sectionFor = async (chapterIndex: number) => {
    const chapter = TEXTBOOK_CHAPTERS[chapterIndex];
    const quarterId = quarters.find((q) => q.number === chapter.quarter)!.id;
    const existing = await db.section.findFirst({ where: { quarterId, title: chapter.title } });
    if (existing) return existing.id;
    const sortOrder = TEXTBOOK_CHAPTERS.filter((c) => c.quarter === chapter.quarter).indexOf(chapter);
    return (await db.section.create({ data: { quarterId, title: chapter.title, sortOrder } })).id;
  };

  for (const demo of DEMO_LESSONS) {
    const sectionId = await sectionFor(demo.section);
    // Matched by title: the textbook import renumbers lessons into book order
    if (await db.lesson.findFirst({ where: { sectionId, title: demo.title } })) {
      console.log(`  = Lesson ${demo.number} exists, skipped`);
      continue;
    }
    const published = demo.status === "PUBLISHED";
    const lesson = await db.lesson.create({
      data: {
        sectionId,
        lessonNumber: demo.number,
        title: demo.title,
        description: demo.description,
        researchQuestion: demo.researchQuestion,
        keywords: demo.keywords,
        language: "kk",
        status: demo.status,
        publishedAt: published ? new Date() : null,
        createdById: users.MODERATOR,
        objectives: { create: demo.objectives.map((o, i) => ({ ...o, sortOrder: i })) },
      },
    });
    console.log(`  + Lesson ${demo.number}: ${demo.title}`);

    let sort = 0;
    let presentationId: string | null = null;
    // Presentation from the real deck
    if (demo.presentation) {
      const file = path.join(MATERIALS_DIR, demo.presentation);
      if (existsSync(file)) {
        const resource = await db.resource.create({
          data: { lessonId: lesson.id, type: "PRESENTATION", title: demo.title, sortOrder: sort++, createdById: users.MODERATOR, status: demo.status },
        });
        const processed = await processUpload({ lessonId: lesson.id, resourceId: resource.id, version: 1, name: demo.presentation, data: readFileSync(file), maxBytes: MAX_BYTES });
        await db.resource.update({ where: { id: resource.id }, data: processed });
        await db.lesson.update({ where: { id: lesson.id }, data: { coverUrl: processed.previewUrl } });
        presentationId = resource.id;
        console.log(`    · presentation: ${processed.pageCount} slides (${processed.previewKind})`);
      } else {
        console.warn(`    ! ${demo.presentation} not found in ${MATERIALS_DIR}`);
      }
    }
    if (demo.tasks?.length) {
      await db.resource.create({
        data: { lessonId: lesson.id, type: "TASK", title: "Сабақ тапсырмалары", sortOrder: sort++, createdById: users.MODERATOR, status: demo.status, content: { tasks: demo.tasks } },
      });
    }
    if (demo.cards?.length) {
      await db.resource.create({
        data: { lessonId: lesson.id, type: "CARDS", title: "Терминдер карточкалары", sortOrder: sort++, createdById: users.MODERATOR, status: demo.status, content: { cards: demo.cards } },
      });
    }
    if (demo.homework) {
      await db.resource.create({
        data: { lessonId: lesson.id, type: "HOMEWORK", title: "Үй тапсырмасы", sortOrder: sort++, createdById: users.MODERATOR, status: demo.status, content: { text: demo.homework } },
      });
    }
    // The §1–10 test collection (.docx) is attached once, to the introductory lesson
    if (demo.number === 1) {
      const docx = "5 сынып Қазақстан тарихы мектеп 2017, 8-48 беттер.docx";
      const file = path.join(MATERIALS_DIR, docx);
      if (existsSync(file)) {
        const resource = await db.resource.create({
          data: { lessonId: lesson.id, type: "TEACHER_GUIDE", title: "Тест тапсырмалары: §1–§10 (5-сынып, 2017)", description: "Әр параграф бойынша тест сұрақтары жауаптарымен.", sortOrder: sort++, createdById: users.MODERATOR, status: demo.status },
        });
        const processed = await processUpload({ lessonId: lesson.id, resourceId: resource.id, version: 1, name: docx, data: readFileSync(file), maxBytes: MAX_BYTES });
        await db.resource.update({ where: { id: resource.id }, data: processed });
      }
      const textbookPdf = path.join(MATERIALS_DIR, "130.pdf");
      if (existsSync(textbookPdf)) {
        const resource = await db.resource.create({
          data: { lessonId: lesson.id, type: "ADDITIONAL", title: "Оқулық: Қазақстан тарихы (Ежелгі заман), 5-сынып — Алматы «Мектеп», 2017", sortOrder: sort++, createdById: users.MODERATOR, status: demo.status },
        });
        const processed = await processUpload({ lessonId: lesson.id, resourceId: resource.id, version: 1, name: "kazakhstan-tarihy-5-2017.pdf", data: readFileSync(textbookPdf), maxBytes: MAX_BYTES });
        await db.resource.update({ where: { id: resource.id }, data: processed });
      }
    }

    // Quiz: textbook test bank + questions transcribed from slide tasks
    const questions = [
      ...(demo.textbookQuiz ? textbookQuestions(demo.textbookQuiz.sections, demo.textbookQuiz.exclude, demo.textbookQuiz.limit) : []),
      ...(demo.extraQuestions ?? []),
    ];
    let quizId: string | null = null;
    if (questions.length) {
      const quiz = await db.quiz.create({
        data: {
          lessonId: lesson.id,
          title: "Тест: " + demo.title.split(":")[0],
          description: demo.textbookQuiz ? "Сұрақтар оқулыққа арналған тест жинағынан және презентация тапсырмаларынан алынған." : "Сұрақтар презентация тапсырмаларынан алынған.",
          questions: { create: questions.map((q, i) => questionCreate(q, i)) },
        },
      });
      quizId = quiz.id;
    }

    // Games — every item validated against the registry schema
    const gameIds = new Map<string, string>();
    for (const [gi, g] of (demo.games ?? []).entries()) {
      const def = getDefinition(g.type as GameType);
      const items = g.items.map((item, idx) => {
        const parsed = def.item.safeParse(spreadGameItem(item));
        if (!parsed.success) throw new Error(`Invalid ${g.type} item in lesson ${demo.number} / ${g.title} #${idx}: ${parsed.error.message}`);
        return { data: parsed.data as Prisma.InputJsonValue, sortOrder: idx };
      });
      const game = await db.game.create({
        data: { lessonId: lesson.id, type: g.type as GameType, title: g.title, instructions: g.instructions, sortOrder: gi, items: { create: items } },
      });
      gameIds.set(g.title, game.id);
    }

    // Lesson scenario
    for (const [si, s] of (demo.stages ?? []).entries()) {
      const gameId = s.game ? (gameIds.get(s.game) ?? null) : null;
      const activity = gameId ? "GAME" : s.quiz && quizId ? "QUIZ" : s.slides && presentationId ? "RESOURCE" : "NONE";
      await db.lessonStage.create({
        data: {
          lessonId: lesson.id,
          sortOrder: si,
          title: s.title,
          description: s.description,
          durationMinutes: s.minutes,
          activity,
          resourceId: s.slides && presentationId ? presentationId : null,
          slideFrom: s.slides?.[0],
          slideTo: s.slides?.[1],
          quizId: s.quiz ? quizId : null,
          gameId,
        },
      });
    }

    if (published) {
      await db.contentVersion.create({
        data: { lessonId: lesson.id, version: 1, status: "PUBLISHED", snapshot: { title: demo.title, seeded: true }, note: "Импорт из папки материалов", createdById: users.ADMIN },
      });
    }
  }
}

async function main() {
  console.log("Seeding History Hub…");
  await seedCurriculum();
  await seedSettings();
  const users = await seedUsers();
  await seedArtifactImages();
  await seedDemoLessons(users);
  await importTextbook(db, { materialsDir: MATERIALS_DIR });
  await db.auditLog.create({ data: { actorId: users.ADMIN, action: "system.seed", entityType: "System", metadata: { materialsDir: MATERIALS_DIR } } });
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
