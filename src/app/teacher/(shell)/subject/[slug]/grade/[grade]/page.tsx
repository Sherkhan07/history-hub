import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getGradeCatalog } from "@/features/curriculum/server/queries";
import { QuarterTabs } from "@/features/curriculum/components/quarter-tabs";
import { SectionBlock } from "@/features/curriculum/components/section-block";
import { GradeSelector } from "@/features/curriculum/components/grade-selector";
import { EmptyState } from "@/components/common/empty-state";
import { GRADES } from "@/lib/constants";
import { romanQuarter } from "@/lib/format";
import { getI18n } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

export async function generateMetadata({ params }: PageProps<"/teacher/subject/[slug]/grade/[grade]">): Promise<Metadata> {
  const { grade } = await params;
  const { t } = await getI18n();
  return { title: fmt(t.common.gradeN, { n: grade }) };
}

export default async function GradePage({ params, searchParams }: PageProps<"/teacher/subject/[slug]/grade/[grade]">) {
  const { slug, grade: gradeRaw } = await params;
  const { q } = await searchParams;
  const grade = Number(gradeRaw);
  if (!GRADES.includes(grade as (typeof GRADES)[number])) notFound();
  const [catalog, { t, locale }] = await Promise.all([getGradeCatalog(slug, grade), getI18n()]);
  if (!catalog) notFound();

  const requested = Number(q);
  const firstWithLessons = catalog.quarters.find((x) => x.lessonCount > 0)?.number ?? 1;
  const active = [1, 2, 3, 4].includes(requested) ? requested : firstWithLessons;
  const quarter = catalog.quarters.find((x) => x.number === active)!;
  const base = `/teacher/subject/${slug}/grade/${grade}`;

  return (
    <div className="space-y-8">
      <nav aria-label={t.common.navigation} className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/teacher" className="hover:text-foreground">{t.nav.home}</Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link href={`/teacher/subjects?grade=${grade}`} className="hover:text-foreground">{fmt(t.common.gradeN, { n: grade })}</Link>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold">{subjectName(catalog.subject, locale)}</h1>
          <p className="mt-1 text-xl text-muted-foreground">
            {fmt(t.common.gradeN, { n: grade })}{catalog.academicYear && <span className="text-base"> · {catalog.academicYear}</span>}
          </p>
        </div>
        <div className="w-full max-w-md">
          <GradeSelector compact active={grade} href={`/teacher/subject/${slug}/grade/{g}?q=${active}`} />
        </div>
      </header>

      <QuarterTabs quarters={catalog.quarters} active={active} href={`${base}?q={q}`} />

      {quarter.sections.length ? (
        <div className="space-y-10">
          {quarter.sections.map((s, i) => (
            <SectionBlock key={s.id} section={s} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="BookOpen"
          title={fmt(t.teacher.emptyQuarter, { q: romanQuarter(active) })}
          description={t.teacher.emptyQuarterText}
        />
      )}
    </div>
  );
}
