import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { getSettings } from "@/server/settings";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/form-controls";
import { CurriculumActiveToggle, NewCurriculumForm, NewSectionForm, QuarterTitle, SectionRow } from "@/features/admin/components/curriculum-editors";
import { romanQuarter } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getI18n, getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.curriculum };
}

export default async function CurriculumPage({ searchParams }: PageProps<"/admin/curriculum">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const [subjects, grades, settings] = await Promise.all([
    db.subject.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameKk: true } }),
    db.grade.findMany({ orderBy: { number: "asc" }, select: { id: true, number: true, isActive: true } }),
    getSettings(),
  ]);
  const { t, locale } = await getI18n();
  const subjectId = subjects.find((s) => s.id === sp.subject)?.id ?? subjects[0]?.id;
  const grade = Number(sp.grade) || 5;
  const curricula = await db.curriculum.findMany({
    where: { subjectId, grade: { number: grade } },
    orderBy: { academicYear: "desc" },
    include: { quarters: { orderBy: { number: "asc" }, include: { sections: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { lessons: true } } } } } } },
  });
  const link = (s: string | undefined, g: number) => `/admin/curriculum?subject=${s}&grade=${g}`;

  return (
    <>
      <PageHeader title={t.admin.curriculum} description={t.admin.curriculumText} />
      <div className="mb-6 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Link key={s.id} href={link(s.id, grade)} className={cn("rounded-full px-4 py-2 text-sm", s.id === subjectId ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{subjectName(s, locale)}</Link>
        ))}
        <span className="mx-2 w-px bg-border" />
        {grades.map((g) => (
          <Link key={g.id} href={link(subjectId, g.number)} className={cn("grid size-9 place-items-center rounded-full text-sm", g.number === grade ? "bg-steppe text-white" : "bg-card hover:bg-muted", !g.isActive && "opacity-50")}>{g.number}</Link>
        ))}
      </div>
      <div className="space-y-6">
        {curricula.map((c) => (
          <SectionCard key={c.id} title={fmt(t.admin.programTitle, { year: c.academicYear, lang: c.language === "kk" ? t.admin.langKk : t.admin.langRu })} actions={<CurriculumActiveToggle id={c.id} isActive={c.isActive} />}>
            <div className="grid gap-4 lg:grid-cols-2">
              {c.quarters.map((q) => (
                <div key={q.id} className="space-y-3 rounded-2xl bg-muted/50 p-4">
                  <p className="font-heading font-semibold">{fmt(t.common.quarterN, { q: romanQuarter(q.number) })}</p>
                  <QuarterTitle id={q.id} title={q.title} />
                  <ul className="space-y-2">
                    {q.sections.map((s, i) => (
                      <SectionRow key={s.id} id={s.id} quarterId={q.id} title={s.title} lessons={s._count.lessons} first={i === 0} last={i === q.sections.length - 1} />
                    ))}
                  </ul>
                  <NewSectionForm quarterId={q.id} />
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
        <SectionCard title={t.admin.newProgram} description={t.admin.newProgramText}>
          <NewCurriculumForm subjects={subjects.map((s) => ({ id: s.id, name: subjectName(s, locale) }))} grades={grades.filter((g) => g.isActive)} defaultYear={settings["platform.academicYear"]} />
        </SectionCard>
      </div>
    </>
  );
}
