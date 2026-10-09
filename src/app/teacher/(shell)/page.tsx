import Link from "next/link";
import { ArrowRight, Megaphone, Play } from "lucide-react";
import { getI18n } from "@/i18n";
import { intlLocale } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";
import { fmt } from "@/i18n/format";
import { requireUser } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { getPublishedCounts, getSubjects } from "@/features/curriculum/server/queries";
import { getFavoriteLessons, getRecentLessons } from "@/features/lessons/server/queries";
import { SubjectCard } from "@/features/curriculum/components/subject-card";
import { GradeSelector } from "@/features/curriculum/components/grade-selector";
import { LessonCover, LessonTile } from "@/features/curriculum/components/lesson-card";
import { EmptyState } from "@/components/common/empty-state";
import { relativeTime } from "@/lib/format";

export default async function TeacherDashboard() {
  const user = await requireUser();
  const [{ t, locale }, subjects, counts, recent, favorites, settings] = await Promise.all([
    getI18n(),
    getSubjects(),
    getPublishedCounts(),
    getRecentLessons(user.id, 5),
    getFavoriteLessons(user.id),
    getSettings(),
  ]);
  const last = recent[0];
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-14">
      <section className="animate-fade-up">
        <p className="text-muted-foreground">{fmt(t.teacher.welcome, { name: firstName })}</p>
        <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">{t.teacher.todayQuestion}</h1>
      </section>

      {settings["platform.announcement"] && (
        <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-5 py-4">
          <Megaphone className="mt-0.5 size-5 shrink-0 text-[oklch(0.55_0.1_70)]" aria-hidden />
          <p className="text-sm">{settings["platform.announcement"]}</p>
        </div>
      )}

      {last && (
        <section aria-labelledby="continue">
          <h2 id="continue" className="mb-4 text-lg font-medium">{t.teacher.continueLast}</h2>
          <div className="group grid overflow-hidden rounded-3xl border bg-card shadow-soft sm:grid-cols-[minmax(0,420px)_1fr]">
            <LessonCover src={last.coverUrl} alt="" className="aspect-video rounded-none sm:aspect-auto sm:min-h-56" sizes="420px" />
            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="text-sm text-muted-foreground">
                  {fmt(t.teacher.lessonMeta, { grade: last.grade, subject: subjectName({ name: last.subjectName, nameKk: last.subjectNameKk }, locale), n: last.lessonNumber })}
                  {last.viewedAt && <> · {relativeTime(last.viewedAt, intlLocale(locale))}</>}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-balance">{last.title}</h3>
                {last.researchQuestion && <p className="mt-2 line-clamp-2 text-muted-foreground">{last.researchQuestion}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/teacher/lesson/${last.id}/present`} className="inline-flex h-12 items-center gap-2 rounded-xl bg-steppe px-5 font-medium text-white transition-colors hover:bg-steppe/90">
                  <Play className="size-5" aria-hidden /> {t.lesson.startLesson}
                </Link>
                <Link href={`/teacher/lesson/${last.id}`} className="inline-flex h-12 items-center gap-2 rounded-xl border bg-card px-5 font-medium hover:bg-muted">
                  {t.teacher.openLesson} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="subjects">
        <h2 id="subjects" className="mb-4 text-lg font-medium">{t.teacher.chooseSubject}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} counts={counts[s.id]} />
          ))}
        </div>
      </section>

      <section aria-labelledby="grades">
        <h2 id="grades" className="mb-4 text-lg font-medium">{t.teacher.myGrades}</h2>
        <GradeSelector href="/teacher/subjects?grade={g}" />
      </section>

      <section aria-labelledby="recent">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent" className="text-lg font-medium">{t.teacher.recentlyViewed}</h2>
          {recent.length > 0 && <Link href="/teacher/recent" className="text-sm text-steppe hover:underline">{t.teacher.all}</Link>}
        </div>
        {recent.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {recent.map((l) => <LessonTile key={l.id} lesson={l} />)}
          </div>
        ) : (
          <EmptyState icon="Clock" title={t.teacher.noRecent} />
        )}
      </section>

      <section aria-labelledby="favorites">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="favorites" className="text-lg font-medium">{t.teacher.favorites}</h2>
          {favorites.length > 0 && <Link href="/teacher/favorites" className="text-sm text-steppe hover:underline">{t.teacher.all}</Link>}
        </div>
        {favorites.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {favorites.slice(0, 5).map((l) => <LessonTile key={l.id} lesson={l} />)}
          </div>
        ) : (
          <EmptyState icon="Star" title={t.teacher.noFavorites} />
        )}
      </section>
    </div>
  );
}
