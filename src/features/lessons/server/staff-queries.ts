import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";

export const PAGE_SIZE = 20;

export type LessonFilter = {
  status?: ContentStatus;
  createdById?: string;
  q?: string;
  subjectId?: string;
  grade?: number;
  page?: number;
};

export async function listLessons(f: LessonFilter) {
  const where: Prisma.LessonWhereInput = {
    ...(f.status ? { status: f.status } : { status: { not: "ARCHIVED" } }),
    ...(f.createdById ? { createdById: f.createdById } : {}),
    ...(f.q ? { OR: [{ title: { contains: f.q, mode: "insensitive" } }, { keywords: { has: f.q } }] } : {}),
    ...(f.subjectId || f.grade
      ? { section: { quarter: { curriculum: { ...(f.subjectId ? { subjectId: f.subjectId } : {}), ...(f.grade ? { grade: { number: f.grade } } : {}) } } } }
      : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [rows, total] = await Promise.all([
    db.lesson.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        lessonNumber: true,
        status: true,
        updatedAt: true,
        coverUrl: true,
        createdBy: { select: { name: true } },
        section: { select: { title: true, quarter: { select: { number: true, curriculum: { select: { subject: { select: { name: true, nameKk: true } }, grade: { select: { number: true } } } } } } } },
        _count: { select: { resources: true, quizzes: true, games: true } },
      },
    }),
    db.lesson.count({ where }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type LessonRow = Awaited<ReturnType<typeof listLessons>>["rows"][number];

export async function statusCounts(createdById?: string) {
  const rows = await db.lesson.groupBy({ by: ["status"], where: createdById ? { createdById } : {}, _count: true });
  const out: Record<ContentStatus, number> = { DRAFT: 0, IN_REVIEW: 0, APPROVED: 0, PUBLISHED: 0, REJECTED: 0, ARCHIVED: 0 };
  for (const r of rows) out[r.status] = r._count;
  return out;
}

export async function reviewQueue(createdById?: string) {
  return db.lesson.findMany({
    where: { status: { in: ["IN_REVIEW", "APPROVED"] }, ...(createdById ? { createdById } : {}) },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      title: true,
      lessonNumber: true,
      status: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
      section: { select: { title: true, quarter: { select: { number: true, curriculum: { select: { subject: { select: { name: true, nameKk: true } }, grade: { select: { number: true } } } } } } } },
      moderation: { where: { decision: "PENDING" }, orderBy: { submittedAt: "desc" }, take: 1, select: { submitNote: true, submittedAt: true, submittedBy: { select: { name: true } } } },
      _count: { select: { resources: true, quizzes: true, games: true, objectives: true } },
    },
  });
}

export async function lessonHistory(lessonId: string) {
  const [versions, requests, logs] = await Promise.all([
    db.contentVersion.findMany({ where: { lessonId }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true, note: true, createdAt: true, createdBy: { select: { name: true } } } }),
    db.moderationRequest.findMany({
      where: { lessonId },
      orderBy: { submittedAt: "desc" },
      select: { id: true, decision: true, submitNote: true, comment: true, submittedAt: true, reviewedAt: true, submittedBy: { select: { name: true } }, reviewer: { select: { name: true } } },
    }),
    db.auditLog.findMany({ where: { OR: [{ entityId: lessonId }, { metadata: { path: ["lessonId"], equals: lessonId } }] }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, action: true, createdAt: true, metadata: true, actor: { select: { name: true } } } }),
  ]);
  return { versions, requests, logs };
}
