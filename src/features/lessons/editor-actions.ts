"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";
import { authorize } from "@/server/auth/guards";
import { canEditLesson } from "@/server/auth/permissions";
import type { CurrentUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { invalidateCatalog } from "@/server/cache";
import { ActionError, runAction } from "@/server/actions/result";
import { storage } from "@/server/storage";
import { cardsContentSchema, homeworkContentSchema, taskContentSchema } from "@/features/resources/content";
import { quizInputSchema } from "@/features/quizzes/schemas";
import { GAME_TYPES, getDefinition, gameLabels } from "@/features/games/definitions";
import { getDictionary } from "@/i18n";
import { translateMsg } from "@/i18n/msg";

const id = z.string().cuid();

/** Loads the lesson and checks the current user may edit it in its current status. */
async function editableLesson(lessonId: string): Promise<{ user: CurrentUser; lesson: { id: string; status: ContentStatus } }> {
  const user = await authorize("lessons.edit");
  const lesson = await db.lesson.findUnique({ where: { id: id.parse(lessonId) }, select: { id: true, status: true } });
  if (!lesson) throw new ActionError("lessonNotFound");
  if (!canEditLesson(user, lesson.status)) throw new ActionError("lessonLocked");
  return { user, lesson };
}

async function touched(lessonId: string, userId: string, status: ContentStatus) {
  await db.lesson.update({ where: { id: lessonId }, data: { updatedById: userId } });
  revalidatePath(`/moderator/lessons/${lessonId}/edit`);
  if (status === "PUBLISHED") invalidateCatalog(lessonId);
}

// ───────────────────────── Basics ─────────────────────────

const basicsSchema = z.object({
  sectionId: id,
  lessonNumber: z.coerce.number().int().min(1, "lessonNumberMin").max(200),
  title: z.string().trim().min(3, "titleMin").max(250),
  researchQuestion: z.string().trim().max(500).optional().transform((v) => v || null),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  durationMinutes: z.coerce.number().int().min(10).max(180).default(45),
  keywords: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 30)),
  language: z.enum(["kk", "ru"]).default("kk"),
});

export type BasicsInput = z.input<typeof basicsSchema>;

export async function createLessonAction(input: BasicsInput) {
  return runAction(async () => {
    const user = await authorize("lessons.create");
    const data = basicsSchema.parse(input);
    const section = await db.section.findUnique({ where: { id: data.sectionId }, select: { id: true } });
    if (!section) throw new ActionError("sectionNotFound");
    const lesson = await db.lesson.create({ data: { ...data, createdById: user.id, updatedById: user.id, status: "DRAFT" } });
    await audit({ actorId: user.id, action: "lesson.create", entityType: "Lesson", entityId: lesson.id, metadata: { title: lesson.title } });
    revalidatePath("/moderator");
    return { id: lesson.id };
  });
}

export async function updateBasicsAction(lessonId: string, input: BasicsInput) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const data = basicsSchema.parse(input);
    await db.lesson.update({ where: { id: lesson.id }, data });
    await audit({ actorId: user.id, action: "lesson.update", entityType: "Lesson", entityId: lesson.id, metadata: { fields: "basics" } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "saved" };
  });
}

// ───────────────────────── Objectives & stages ─────────────────────────

const objectivesSchema = z
  .array(z.object({ code: z.string().trim().max(30).regex(/^[\d.]*$/, "objectiveCode"), text: z.string().trim().min(3, "objectiveText").max(500) }))
  .max(20);

export async function saveObjectivesAction(lessonId: string, input: z.input<typeof objectivesSchema>) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const list = objectivesSchema.parse(input);
    await db.$transaction([
      db.learningObjective.deleteMany({ where: { lessonId: lesson.id } }),
      db.learningObjective.createMany({ data: list.map((o, i) => ({ ...o, lessonId: lesson.id, sortOrder: i })) }),
    ]);
    await audit({ actorId: user.id, action: "lesson.update", entityType: "Lesson", entityId: lesson.id, metadata: { fields: "objectives", count: list.length } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "objectivesSaved" };
  });
}

const stagesSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1, "stageTitle").max(120),
      description: z.string().trim().max(1000).optional().nullable(),
      durationMinutes: z.coerce.number().int().min(1).max(90),
      activity: z.enum(["NONE", "RESOURCE", "QUIZ", "GAME"]),
      resourceId: z.string().optional().nullable(),
      slideFrom: z.coerce.number().int().min(1).optional().nullable(),
      slideTo: z.coerce.number().int().min(1).optional().nullable(),
      quizId: z.string().optional().nullable(),
      gameId: z.string().optional().nullable(),
    }),
  )
  .max(20);

export async function saveStagesAction(lessonId: string, input: z.input<typeof stagesSchema>) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const stages = stagesSchema.parse(input);
    const [resources, quizzes, games] = await Promise.all([
      db.resource.findMany({ where: { lessonId: lesson.id }, select: { id: true } }),
      db.quiz.findMany({ where: { lessonId: lesson.id }, select: { id: true } }),
      db.game.findMany({ where: { lessonId: lesson.id }, select: { id: true } }),
    ]);
    const own = (ids: { id: string }[], v?: string | null) => (v && ids.some((x) => x.id === v) ? v : null);
    await db.$transaction([
      db.lessonStage.deleteMany({ where: { lessonId: lesson.id } }),
      db.lessonStage.createMany({
        data: stages.map((s, i) => {
          const resourceId = s.activity === "RESOURCE" ? own(resources, s.resourceId) : null;
          return {
            lessonId: lesson.id,
            sortOrder: i,
            title: s.title,
            description: s.description || null,
            durationMinutes: s.durationMinutes,
            activity: s.activity,
            resourceId,
            slideFrom: resourceId ? (s.slideFrom ?? null) : null,
            slideTo: resourceId ? (s.slideTo ?? s.slideFrom ?? null) : null,
            quizId: s.activity === "QUIZ" ? own(quizzes, s.quizId) : null,
            gameId: s.activity === "GAME" ? own(games, s.gameId) : null,
          };
        }),
      }),
    ]);
    await audit({ actorId: user.id, action: "lesson.update", entityType: "Lesson", entityId: lesson.id, metadata: { fields: "stages", count: stages.length } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "scenarioSaved" };
  });
}

// ───────────────────────── Resources ─────────────────────────

const resourceMetaSchema = z.object({
  title: z.string().trim().min(1).max(250),
  description: z.string().trim().max(1000).optional().nullable(),
  type: z.enum(["PRESENTATION", "WORKSHEET", "TASK", "CARDS", "DOCUMENT", "VIDEO", "MAP", "TEACHER_GUIDE", "HOMEWORK", "ADDITIONAL"]),
  language: z.enum(["kk", "ru"]),
});

async function ownedResource(resourceId: string) {
  const r = await db.resource.findUnique({ where: { id: id.parse(resourceId) }, select: { id: true, lessonId: true, fileUrl: true, version: true } });
  if (!r) throw new ActionError("resourceNotFound");
  return { ...(await editableLesson(r.lessonId)), resource: r };
}

export async function updateResourceMetaAction(resourceId: string, input: z.input<typeof resourceMetaSchema>) {
  return runAction(async () => {
    const { user, lesson, resource } = await ownedResource(resourceId);
    const data = resourceMetaSchema.parse(input);
    await db.resource.update({ where: { id: resource.id }, data });
    await audit({ actorId: user.id, action: "resource.update", entityType: "Resource", entityId: resource.id, metadata: { lessonId: lesson.id } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "saved" };
  });
}

export async function deleteResourceAction(resourceId: string) {
  return runAction(async () => {
    const { user, lesson, resource } = await ownedResource(resourceId);
    await db.resource.delete({ where: { id: resource.id } });
    await storage().deletePrefix(`lessons/${lesson.id}/${resource.id}/`);
    await audit({ actorId: user.id, action: "resource.delete", entityType: "Resource", entityId: resource.id, metadata: { lessonId: lesson.id } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "resourceDeleted" };
  });
}

export async function reorderResourcesAction(lessonId: string, ids: string[]) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const list = z.array(id).max(100).parse(ids);
    await db.$transaction(list.map((rid, i) => db.resource.updateMany({ where: { id: rid, lessonId: lesson.id }, data: { sortOrder: i } })));
    await touched(lesson.id, user.id, lesson.status);
  });
}

const structuredSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TASK"), title: z.string().trim().min(1).max(250), content: taskContentSchema }),
  z.object({ type: z.literal("CARDS"), title: z.string().trim().min(1).max(250), content: cardsContentSchema }),
  z.object({ type: z.literal("HOMEWORK"), title: z.string().trim().min(1).max(250), content: homeworkContentSchema }),
]);

/** Creates or updates a text-based resource (tasks, cards, homework). */
export async function saveStructuredResourceAction(lessonId: string, resourceId: string | null, input: z.input<typeof structuredSchema>) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const data = structuredSchema.parse(input);
    const content = data.content as Prisma.InputJsonValue;
    let rid = resourceId;
    if (rid) {
      const updated = await db.resource.updateMany({ where: { id: rid, lessonId: lesson.id }, data: { title: data.title, content, type: data.type } });
      if (!updated.count) throw new ActionError("resourceNotFound");
    } else {
      const max = await db.resource.aggregate({ where: { lessonId: lesson.id }, _max: { sortOrder: true } });
      rid = (
        await db.resource.create({
          data: { lessonId: lesson.id, type: data.type, title: data.title, content, createdById: user.id, sortOrder: (max._max.sortOrder ?? -1) + 1, status: "DRAFT" },
        })
      ).id;
    }
    await audit({ actorId: user.id, action: resourceId ? "resource.update" : "resource.create", entityType: "Resource", entityId: rid, metadata: { lessonId: lesson.id, type: data.type } });
    await touched(lesson.id, user.id, lesson.status);
    return { id: rid, message: "saved" };
  });
}

const linkSchema = z.object({
  type: z.enum(["VIDEO", "MAP", "ADDITIONAL", "DOCUMENT"]),
  title: z.string().trim().min(1).max(250),
  url: z.string().trim().url("linkRequired").refine((u) => /^https:\/\//.test(u), "httpsOnly"),
});

export async function addLinkResourceAction(lessonId: string, input: z.input<typeof linkSchema>) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const data = linkSchema.parse(input);
    const max = await db.resource.aggregate({ where: { lessonId: lesson.id }, _max: { sortOrder: true } });
    const r = await db.resource.create({
      data: { lessonId: lesson.id, type: data.type, title: data.title, externalUrl: data.url, previewKind: data.type === "VIDEO" ? "EMBED" : "NONE", createdById: user.id, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
    await audit({ actorId: user.id, action: "resource.create", entityType: "Resource", entityId: r.id, metadata: { lessonId: lesson.id, link: true } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "linkAdded" };
  });
}

// ───────────────────────── Quiz ─────────────────────────

export async function saveQuizAction(lessonId: string, quizId: string | null, input: z.input<typeof quizInputSchema>) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const data = quizInputSchema.parse(input);
    const questions = data.questions.map((q, qi) => ({
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation || null,
      points: q.points,
      sortOrder: qi,
      options: {
        create: q.options.map((o, oi) => ({
          text: o.text,
          isCorrect: q.type === "MATCHING" || q.type === "ORDERING" ? false : o.isCorrect,
          matchText: q.type === "MATCHING" ? (o.matchText ?? null) : null,
          correctOrder: q.type === "ORDERING" ? oi : null,
          sortOrder: oi,
        })),
      },
    }));
    let qid = quizId;
    if (qid) {
      const quiz = await db.quiz.findFirst({ where: { id: qid, lessonId: lesson.id }, select: { id: true } });
      if (!quiz) throw new ActionError("quizNotFound");
      await db.$transaction([
        db.question.deleteMany({ where: { quizId: qid } }),
        db.quiz.update({ where: { id: qid }, data: { title: data.title, description: data.description || null, timePerQuestion: data.timePerQuestion, questions: { create: questions } } }),
      ]);
    } else {
      qid = (await db.quiz.create({ data: { lessonId: lesson.id, title: data.title, description: data.description || null, timePerQuestion: data.timePerQuestion, questions: { create: questions } } })).id;
    }
    await audit({ actorId: user.id, action: quizId ? "quiz.update" : "quiz.create", entityType: "Quiz", entityId: qid, metadata: { lessonId: lesson.id, questions: questions.length } });
    await touched(lesson.id, user.id, lesson.status);
    return { id: qid, message: "quizSaved" };
  });
}

export async function deleteQuizAction(quizId: string) {
  return runAction(async () => {
    const quiz = await db.quiz.findUnique({ where: { id: id.parse(quizId) }, select: { id: true, lessonId: true } });
    if (!quiz) throw new ActionError("quizNotFound");
    const { user, lesson } = await editableLesson(quiz.lessonId);
    await db.quiz.delete({ where: { id: quiz.id } });
    await audit({ actorId: user.id, action: "quiz.delete", entityType: "Quiz", entityId: quiz.id, metadata: { lessonId: lesson.id } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "quizDeleted" };
  });
}

// ───────────────────────── Games ─────────────────────────

export async function createGameAction(lessonId: string, type: string, title: string) {
  return runAction(async () => {
    const { user, lesson } = await editableLesson(lessonId);
    const t = z.enum(GAME_TYPES as [string, ...string[]]).parse(type) as (typeof GAME_TYPES)[number];
    const def = getDefinition(t);
    const max = await db.game.aggregate({ where: { lessonId: lesson.id }, _max: { sortOrder: true } });
    const game = await db.game.create({
      data: {
        lessonId: lesson.id,
        type: t,
        title: z.string().trim().min(1).max(200).parse(title),
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        items: { create: [{ data: def.empty(gameLabels(await getDictionary())) as Prisma.InputJsonValue, sortOrder: 0 }] },
      },
    });
    await audit({ actorId: user.id, action: "game.create", entityType: "Game", entityId: game.id, metadata: { lessonId: lesson.id, type: t } });
    await touched(lesson.id, user.id, lesson.status);
    return { id: game.id };
  });
}

const gameSaveSchema = z.object({
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().max(1000).optional().nullable(),
  items: z.array(z.object({ points: z.coerce.number().int().min(10).max(1000).default(100), data: z.unknown() })).min(1, "gameItemsRequired").max(40),
});

export async function saveGameAction(gameId: string, input: z.input<typeof gameSaveSchema>) {
  return runAction(async () => {
    const game = await db.game.findUnique({ where: { id: id.parse(gameId) }, select: { id: true, lessonId: true, type: true } });
    if (!game) throw new ActionError("gameNotFound");
    const { user, lesson } = await editableLesson(game.lessonId);
    const data = gameSaveSchema.parse(input);
    const def = getDefinition(game.type);
    const t = await getDictionary();
    const items = data.items.map((item, i) => {
      const parsed = def.item.safeParse(item.data);
      if (!parsed.success) throw new ActionError("gameItemInvalid", { n: i + 1, issue: translateMsg(t, parsed.error.issues[0]?.message ?? "formInvalid") });
      return { data: parsed.data as Prisma.InputJsonValue, points: item.points, sortOrder: i };
    });
    await db.$transaction([
      db.gameItem.deleteMany({ where: { gameId: game.id } }),
      db.game.update({ where: { id: game.id }, data: { title: data.title, instructions: data.instructions || null, items: { create: items } } }),
    ]);
    await audit({ actorId: user.id, action: "game.update", entityType: "Game", entityId: game.id, metadata: { lessonId: lesson.id, items: items.length } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "gameSaved" };
  });
}

export async function deleteGameAction(gameId: string) {
  return runAction(async () => {
    const game = await db.game.findUnique({ where: { id: id.parse(gameId) }, select: { id: true, lessonId: true } });
    if (!game) throw new ActionError("gameNotFound");
    const { user, lesson } = await editableLesson(game.lessonId);
    await db.game.delete({ where: { id: game.id } });
    await audit({ actorId: user.id, action: "game.delete", entityType: "Game", entityId: game.id, metadata: { lessonId: lesson.id } });
    await touched(lesson.id, user.id, lesson.status);
    return { message: "gameDeleted" };
  });
}
