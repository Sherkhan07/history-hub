import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CATALOG_TAG } from "@/server/cache";
import { parseCards, parseTasks } from "@/features/resources/content";

/** Lesson card data shown in catalog lists — counts only, never file payloads. */
export type CatalogLesson = {
  id: string;
  lessonNumber: number;
  title: string;
  researchQuestion: string | null;
  coverUrl: string | null;
  hasPresentation: boolean;
  slideCount: number;
  taskCount: number;
  cardCount: number;
  quizCount: number;
  questionCount: number;
  gameCount: number;
  hasWorksheet: boolean;
};

export type CatalogSection = { id: string; title: string; lessons: CatalogLesson[] };
export type CatalogQuarter = { id: string; number: number; title: string | null; sections: CatalogSection[]; lessonCount: number };
export type GradeCatalog = {
  subject: { id: string; slug: string; name: string; nameKk: string | null; accent: string };
  grade: number;
  academicYear: string | null;
  quarters: CatalogQuarter[];
};

const lessonCardSelect = {
  id: true,
  lessonNumber: true,
  title: true,
  researchQuestion: true,
  coverUrl: true,
  resources: { select: { type: true, pageCount: true, content: true, previewUrl: true }, orderBy: { sortOrder: "asc" } },
  quizzes: { select: { _count: { select: { questions: true } } } },
  _count: { select: { games: true } },
} as const;

type LessonCardRow = {
  id: string;
  lessonNumber: number;
  title: string;
  researchQuestion: string | null;
  coverUrl: string | null;
  resources: { type: string; pageCount: number | null; content: unknown; previewUrl: string | null }[];
  quizzes: { _count: { questions: number } }[];
  _count: { games: number };
};

export function toCatalogLesson(l: LessonCardRow): CatalogLesson {
  const presentation = l.resources.find((r) => r.type === "PRESENTATION");
  return {
    id: l.id,
    lessonNumber: l.lessonNumber,
    title: l.title,
    researchQuestion: l.researchQuestion,
    coverUrl: l.coverUrl ?? presentation?.previewUrl ?? null,
    hasPresentation: Boolean(presentation),
    slideCount: presentation?.pageCount ?? 0,
    taskCount: l.resources.filter((r) => r.type === "TASK").reduce((n, r) => n + parseTasks(r.content).length, 0),
    cardCount: l.resources.filter((r) => r.type === "CARDS").reduce((n, r) => n + parseCards(r.content).length, 0),
    quizCount: l.quizzes.length,
    questionCount: l.quizzes.reduce((n, q) => n + q._count.questions, 0),
    gameCount: l._count.games,
    hasWorksheet: l.resources.some((r) => r.type === "WORKSHEET"),
  };
}

export { lessonCardSelect };

export const getSubjects = unstable_cache(
  async () =>
    db.subject.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, nameKk: true, description: true, accent: true },
    }),
  ["subjects"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Published-lesson counts per subject × grade, for dashboard tiles. */
export const getPublishedCounts = unstable_cache(
  async () => {
    const rows = await db.lesson.findMany({
      where: { status: "PUBLISHED" },
      select: { section: { select: { quarter: { select: { curriculum: { select: { subjectId: true, grade: { select: { number: true } } } } } } } } },
    });
    const counts: Record<string, Record<number, number>> = {};
    for (const r of rows) {
      const c = r.section.quarter.curriculum;
      counts[c.subjectId] ??= {};
      counts[c.subjectId][c.grade.number] = (counts[c.subjectId][c.grade.number] ?? 0) + 1;
    }
    return counts;
  },
  ["published-counts"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Full published catalog for one subject + grade (active curriculum, newest academic year). */
export const getGradeCatalog = unstable_cache(
  async (subjectSlug: string, grade: number): Promise<GradeCatalog | null> => {
    const subject = await db.subject.findUnique({
      where: { slug: subjectSlug },
      select: { id: true, slug: true, name: true, nameKk: true, accent: true, isActive: true },
    });
    if (!subject || !subject.isActive) return null;
    const curriculum = await db.curriculum.findFirst({
      where: { subjectId: subject.id, grade: { number: grade }, isActive: true },
      orderBy: { academicYear: "desc" },
      select: {
        academicYear: true,
        quarters: {
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            title: true,
            sections: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                title: true,
                lessons: {
                  where: { status: "PUBLISHED" },
                  orderBy: { lessonNumber: "asc" },
                  select: lessonCardSelect,
                },
              },
            },
          },
        },
      },
    });
    const quarters: CatalogQuarter[] = [1, 2, 3, 4].map((n) => {
      const q = curriculum?.quarters.find((x) => x.number === n);
      const sections = (q?.sections ?? [])
        .map((s) => ({ id: s.id, title: s.title, lessons: s.lessons.map(toCatalogLesson) }))
        .filter((s) => s.lessons.length > 0);
      return {
        id: q?.id ?? `q${n}`,
        number: n,
        title: q?.title ?? null,
        sections,
        lessonCount: sections.reduce((acc, s) => acc + s.lessons.length, 0),
      };
    });
    return {
      subject: { id: subject.id, slug: subject.slug, name: subject.name, nameKk: subject.nameKk, accent: subject.accent },
      grade,
      academicYear: curriculum?.academicYear ?? null,
      quarters,
    };
  },
  ["grade-catalog"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Full curriculum tree for staff selects and admin screens (not cached — always fresh). */
export async function getCurriculumTree() {
  return db.subject.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      curricula: {
        orderBy: [{ grade: { number: "asc" } }, { academicYear: "desc" }],
        select: {
          id: true,
          academicYear: true,
          language: true,
          isActive: true,
          grade: { select: { id: true, number: true } },
          quarters: {
            orderBy: { number: "asc" },
            select: {
              id: true,
              number: true,
              title: true,
              sections: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, sortOrder: true, _count: { select: { lessons: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export type CurriculumTree = Awaited<ReturnType<typeof getCurriculumTree>>;
