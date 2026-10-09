import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/form-controls";
import { SubjectForm } from "@/features/admin/components/curriculum-editors";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.subjects };
}

export default async function SubjectsAdminPage() {
  await requireRole("ADMIN");
  const t = await getDictionary();
  const subjects = await db.subject.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { curricula: true } } } });
  return (
    <>
      <PageHeader title={t.admin.subjects} description={t.admin.subjectsText} />
      <div className="space-y-4">
        {subjects.map((s) => (
          <SectionCard key={s.id} title={s.name} description={`${fmt(t.admin.programsN, { n: s._count.curricula })} · /teacher/subject/${s.slug}`}>
            <SubjectForm id={s.id} initial={{ name: s.name, nameKk: s.nameKk ?? "", slug: s.slug, description: s.description ?? "", descriptionKk: s.descriptionKk ?? "", accent: s.accent === "world" ? "world" : "kz", isActive: s.isActive }} />
          </SectionCard>
        ))}
        <SectionCard title={t.admin.newSubject}><SubjectForm id={null} /></SectionCard>
      </div>
    </>
  );
}
