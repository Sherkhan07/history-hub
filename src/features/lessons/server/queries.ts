import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";
import { lessonCardSelect, toCatalogLesson, type CatalogLesson } from "@/features/curriculum/server/queries";

const detailInclude = {
  section: {
    select: {
      id: true,
      title: true,
      quarter: {
        select: {
          id: true,
          number: true,
          curriculum: {
            select: {
              id: true,
              academicYear: true,
              subject: { select: { id: true, slug: true, name: true, nameKk: true, accent: true } },
              grade: { select: { id: true, number: true } },
            },
          },
        },
      },
    },
  },
  objectives: { orderBy: { sortOrder: "asc" } },
  resources: { orderBy: { sortOrder: "asc" } },
  quizzes: {
    orderBy: { sortOrder: "asc" },
    include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
  },
  games: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
  stages: { orderBy: { sortOrder: "asc" } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.LessonInclude;

export type LessonDetail = Prisma.LessonGetPayload<{ include: typeof detailInclude }>;

export async function getLessonDetail(id: string): Promise<LessonDetail | null> {
  return db.lesson.findUnique({ where: { id }, include: detailInclude });
}

/** Records a lesson view; repeated opens within 10 minutes only bump the timestamp. */
export async function recordLessonView(userId: string, lessonId: string) {
  const recent = await db.lessonView.findFirst({
    where: { userId, lessonId, viewedAt: { gt: new Date(Date.now() - 10 * 60_000) } },
    select: { id: true },
  });
  if (recent) await db.lessonView.update({ where: { id: recent.id }, data: { viewedAt: new Date() } });
  else await db.lessonView.create({ data: { userId, lessonId } });
}

export type LessonListItem = CatalogLesson & {
  subjectName: string;
  subjectNameKk: string | null;
  subjectSlug: string;
  grade: number;
  quarter: number;
  sectionTitle: string;
};

const listSelect = {
  ...lessonCardSelect,
  section: {
    select: {
      title: true,
      quarter: { select: { number: true, curriculum: { select: { subject: { select: { name: true, nameKk: true, slug: true } }, grade: { select: { number: true } } } } } },
    },
  },
} as const;

type ListRow = Prisma.LessonGetPayload<{ select: typeof listSelect }>;

function toListItem(l: ListRow): LessonListItem {
  return {
    ...toCatalogLesson(l),
    subjectName: l.section.quarter.curriculum.subject.name,
    subjectNameKk: l.section.quarter.curriculum.subject.nameKk,
    subjectSlug: l.section.quarter.curriculum.subject.slug,
    grade: l.section.quarter.curriculum.grade.number,
    quarter: l.section.quarter.number,
    sectionTitle: l.section.title,
  };
}

/** Last N distinct published lessons the user opened (newest first). */
export async function getRecentLessons(userId: string, limit = 5) {
  const views = await db.lessonView.groupBy({
    by: ["lessonId"],
    where: { userId, lesson: { status: "PUBLISHED" } },
    _max: { viewedAt: true },
    orderBy: { _max: { viewedAt: "desc" } },
    take: limit,
  });
  if (!views.length) return [];
  const lessons = await db.lesson.findMany({ where: { id: { in: views.map((v) => v.lessonId) } }, select: listSelect });
  const byId = new Map(lessons.map((l) => [l.id, l]));
  return views.flatMap((v) => {
    const l = byId.get(v.lessonId);
    return l ? [{ ...toListItem(l), viewedAt: v._max.viewedAt }] : [];
  });
}

export async function getFavoriteLessons(userId: string) {
  const favs = await db.favorite.findMany({
    where: { userId, lesson: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: { lesson: { select: listSelect } },
  });
  return favs.map((f) => toListItem(f.lesson));
}

export async function isFavorite(userId: string, lessonId: string) {
  return Boolean(await db.favorite.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { lessonId: true } }));
}

/**
 * Teacher search across title, description, research question, keywords, objectives,
 * section names and resource titles. A bare number 5–11 narrows to that grade.
 */
export async function searchLessons(query: string, opts: { status?: ContentStatus; limit?: number } = {}) {
  const raw = query.trim().slice(0, 100);
  if (!raw) return [];
  const tokens = raw.split(/\s+/).filter(Boolean);
  const gradeToken = tokens.find((t) => /^(5|6|7|8|9|10|11)$/.test(t));
  const words = tokens.filter((t) => t !== gradeToken && !/^(класс|сынып|четверть|тоқсан)$/i.test(t));
  const keywordIds = words.length
    ? await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Lesson"
        WHERE array_to_string(keywords, ' ') ILIKE ${"%" + words.join(" ") + "%"}`
    : [];

  const textConditions: Prisma.LessonWhereInput[] = words.map((w) => ({
    OR: [
      { title: { contains: w, mode: "insensitive" } },
      { description: { contains: w, mode: "insensitive" } },
      { researchQuestion: { contains: w, mode: "insensitive" } },
      { objectives: { some: { OR: [{ code: { startsWith: w } }, { text: { contains: w, mode: "insensitive" } }] } } },
      { section: { title: { contains: w, mode: "insensitive" } } },
      { resources: { some: { title: { contains: w, mode: "insensitive" } } } },
      { section: { quarter: { curriculum: { subject: { name: { contains: w, mode: "insensitive" } } } } } },
    ],
  }));

  const where: Prisma.LessonWhereInput = {
    status: opts.status ?? "PUBLISHED",
    ...(gradeToken ? { section: { quarter: { curriculum: { grade: { number: Number(gradeToken) } } } } } : {}),
    ...(words.length
      ? { OR: [{ AND: textConditions }, ...(keywordIds.length ? [{ id: { in: keywordIds.map((k) => k.id) } }] : [])] }
      : {}),
  };

  const lessons = await db.lesson.findMany({
    where,
    select: { ...listSelect, resources: { select: { id: true, type: true, title: true, pageCount: true, content: true, previewUrl: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ lessonNumber: "asc" }],
    take: opts.limit ?? 30,
  });
  const lower = words.map((w) => w.toLowerCase());
  return lessons.map((l) => ({
    ...toListItem(l),
    matchedResources: l.resources
      .filter((r) => lower.some((w) => r.title.toLowerCase().includes(w)))
      .map((r) => ({ id: r.id, type: r.type, title: r.title })),
  }));
}

export type SearchHit = Awaited<ReturnType<typeof searchLessons>>[number];
