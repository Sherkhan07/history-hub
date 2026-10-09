import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Eye, Gamepad2, Play, Presentation } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { canViewLesson } from "@/server/auth/permissions";
import { getLessonDetail, isFavorite, recordLessonView } from "@/features/lessons/server/queries";
import { buildMaterialTiles } from "@/features/lessons/tiles";
import { MaterialsGrid } from "@/features/lessons/components/materials-grid";
import { DurationPill, LearningObjectiveBadge, LessonBreadcrumb } from "@/features/lessons/components/lesson-header";
import { FavoriteButton } from "@/features/lessons/components/favorite-button";
import { LessonCover } from "@/features/curriculum/components/lesson-card";
import { ModerationStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import { Icon } from "@/components/common/icon";
import { Button } from "@/components/ui/button";
import { getDefinition } from "@/features/games/definitions";
import { getDictionary, getLocale } from "@/i18n";
import { subjectName } from "@/features/curriculum/subject-name";
import { fmt } from "@/i18n/format";
import { countLabel } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/teacher/lesson/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [user, lesson] = await Promise.all([getCurrentUser(), db.lesson.findUnique({ where: { id }, select: { title: true, status: true } })]);
  // Never leak titles of unpublished lessons to teachers
  return { title: lesson && canViewLesson(user, lesson.status) ? lesson.title : (await getDictionary()).lesson.lessonTitle };
}

export default async function LessonPage({ params }: PageProps<"/teacher/lesson/[id]">) {
  const { id } = await params;
  const [user, t] = await Promise.all([requireUser(), getDictionary()]);
  const lesson = await getLessonDetail(id);
  if (!lesson || !canViewLesson(user, lesson.status)) notFound();
  if (lesson.status === "PUBLISHED") await recordLessonView(user.id, lesson.id);
  const fav = await isFavorite(user.id, lesson.id);

  const c = lesson.section.quarter.curriculum;
  const crumbs = { subjectName: subjectName(c.subject, await getLocale()), subjectSlug: c.subject.slug, grade: c.grade.number, quarter: lesson.section.quarter.number, sectionTitle: lesson.section.title };
  const presentation = lesson.resources.find((r) => r.type === "PRESENTATION");
  const tiles = buildMaterialTiles(lesson, t);
  const hasZip = lesson.resources.some((r) => r.fileUrl) || lesson.resources.length > 0;

  return (
    <article className="space-y-12">
      {lesson.status !== "PUBLISHED" && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-card px-5 py-3 text-sm">
          <Eye className="size-4 text-muted-foreground" aria-hidden />
          {t.lesson.staffPreview}
          <ModerationStatusBadge status={lesson.status} />
        </div>
      )}

      <div className="space-y-6">
        <LessonBreadcrumb c={crumbs} />
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-steppe-soft/60 shadow-soft">
          <div className="pointer-events-none absolute inset-0 ornament-bg opacity-60" aria-hidden />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col">
              <p className="font-heading text-lg font-medium text-steppe">{fmt(t.lesson.lessonNo, { n: lesson.lessonNumber })}</p>
              <h1 className="mt-2 text-3xl leading-tight font-semibold text-balance sm:text-4xl">{lesson.title}</h1>
              {lesson.description && <p className="mt-3 text-muted-foreground">{lesson.description}</p>}

              {lesson.researchQuestion && (
                <div className="mt-6 rounded-2xl border-l-4 border-gold bg-gold-soft/70 px-5 py-4">
                  <p className="text-xs font-medium tracking-wide text-[oklch(0.5_0.1_70)] uppercase">{t.lesson.researchQuestion}</p>
                  <p className="mt-1 font-heading text-lg leading-snug">{lesson.researchQuestion}</p>
                </div>
              )}

              {lesson.objectives.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{t.lesson.objectives}</p>
                  <ul className="space-y-2">
                    {lesson.objectives.map((o) => <LearningObjectiveBadge key={o.id} code={o.code} text={o.text} />)}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <DurationPill minutes={lesson.durationMinutes} />
                <span className="rounded-full bg-card px-3 py-1 text-sm text-muted-foreground">{crumbs.subjectName}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {presentation ? (
                <Link href={`/teacher/lesson/${lesson.id}/resource/${presentation.id}`} className="group relative block" aria-label={t.lesson.openPresentation}>
                  <LessonCover src={presentation.previewUrl ?? lesson.coverUrl} alt="" className="aspect-video w-full rounded-2xl shadow-lift" sizes="560px" />
                  <span className="absolute inset-0 grid place-items-center rounded-2xl bg-ink/0 transition-colors group-hover:bg-ink/25">
                    <span className="grid size-16 scale-90 place-items-center rounded-full bg-white/90 text-steppe opacity-0 shadow-lift transition-all group-hover:scale-100 group-hover:opacity-100">
                      <Presentation className="size-7" />
                    </span>
                  </span>
                </Link>
              ) : (
                <LessonCover src={lesson.coverUrl} alt="" className="aspect-video w-full rounded-2xl" />
              )}
              <Button asChild size="xl" className="w-full">
                <Link href={`/teacher/lesson/${lesson.id}/present`}>
                  <Play /> {t.lesson.startLesson}
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {presentation && (
                  <Button asChild variant="outline" size="lg" className="col-span-2">
                    <Link href={`/teacher/lesson/${lesson.id}/resource/${presentation.id}`}><Presentation /> {t.lesson.openPresentation}</Link>
                  </Button>
                )}
                {hasZip && (
                  <Button asChild variant="outline" size="lg">
                    <a href={`/api/lessons/${lesson.id}/download`} download><Download /> {t.lesson.downloadAll}</a>
                  </Button>
                )}
                <FavoriteButton lessonId={lesson.id} initial={fav} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="materials">
        <h2 id="materials" className="mb-5 text-sm font-semibold tracking-wider text-muted-foreground uppercase">{t.lesson.materials}</h2>
        {tiles.length ? <MaterialsGrid tiles={tiles} /> : <EmptyState icon="FolderOpen" title={t.lesson.noMaterials} />}
      </section>

      {lesson.stages.length > 0 && (
        <section aria-labelledby="scenario">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="scenario" className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{t.lesson.scenario}</h2>
            <span className="text-sm text-muted-foreground">{fmt(t.common.min, { n: lesson.stages.reduce((n, s) => n + s.durationMinutes, 0) })}</span>
          </div>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {lesson.stages.map((s, i) => (
              <li key={s.id} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-soft">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold tabular-nums">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmt(t.common.min, { n: s.durationMinutes })}
                    {s.slideFrom ? fmt(t.lesson.slidesRange, { from: s.slideFrom, to: s.slideTo ?? s.slideFrom }) : ""}
                    {s.activity === "QUIZ" ? t.lesson.stageQuiz : s.activity === "GAME" ? t.lesson.stageGame : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(lesson.games.length > 0 || lesson.quizzes.length > 0) && (
        <section id="games" aria-labelledby="games-title" className="scroll-mt-24">
          <h2 id="games-title" className="mb-5 text-sm font-semibold tracking-wider text-muted-foreground uppercase">{t.lesson.gamesTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.quizzes.map((q) => (
              <div key={q.id} className="flex flex-col justify-between gap-5 rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage"><Icon name="ListChecks" className="size-6" /></span>
                  <div>
                    <p className="text-sm text-muted-foreground">{fmt(t.lesson.quizMeta, { n: countLabel(q.questions.length, t.catalog.questions) })}</p>
                    <p className="font-heading text-lg font-medium">{q.title}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link href={`/teacher/lesson/${lesson.id}/quiz/${q.id}`}><Play /> {t.lesson.playHere}</Link></Button>
                </div>
              </div>
            ))}
            {lesson.games.map((g) => {
              const def = getDefinition(g.type);
              return (
                <div key={g.id} className="flex flex-col justify-between gap-5 rounded-2xl border bg-card p-5 shadow-soft">
                  <div className="flex gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-clay-soft text-clay"><Icon name={def.icon} className="size-6" /></span>
                    <div>
                      <p className="text-sm text-muted-foreground">{fmt(t.lesson.gameMeta, { type: t.gameTypes[g.type], n: countLabel(g.items.length, t.catalog.tasks) })}</p>
                      <p className="font-heading text-lg font-medium">{g.title}</p>
                      {g.instructions && <p className="mt-1 text-sm text-muted-foreground">{g.instructions}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline"><Link href={`/teacher/lesson/${lesson.id}/game/${g.id}`}><Gamepad2 /> {t.lesson.playHere}</Link></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
