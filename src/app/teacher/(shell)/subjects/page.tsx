import type { Metadata } from "next";
import { getPublishedCounts, getSubjects } from "@/features/curriculum/server/queries";
import { SubjectCard } from "@/features/curriculum/components/subject-card";
import { GradeSelector } from "@/features/curriculum/components/grade-selector";
import { PageHeader } from "@/components/common/page-header";
import { GRADES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).teacher.subjectsTitle };
}

export default async function SubjectsPage({ searchParams }: PageProps<"/teacher/subjects">) {
  const { grade: gradeParam } = await searchParams;
  const grade = GRADES.find((g) => String(g) === gradeParam);
  const [subjects, counts, t] = await Promise.all([getSubjects(), getPublishedCounts(), getDictionary()]);
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={grade ? fmt(t.common.gradeN, { n: grade }) : undefined} title={grade ? t.teacher.chooseSubject : t.teacher.subjectsTitle} />
      <GradeSelector compact active={grade} href="/teacher/subjects?grade={g}" />
      <div className="grid gap-5 md:grid-cols-2">
        {subjects.map((s) => (
          <SubjectCard key={s.id} subject={s} counts={counts[s.id]} grade={grade} />
        ))}
      </div>
    </div>
  );
}
