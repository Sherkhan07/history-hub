import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { GradeToggle } from "@/features/admin/components/curriculum-editors";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.grades };
}

export default async function GradesPage() {
  await requireRole("ADMIN");
  const [grades, t] = await Promise.all([db.grade.findMany({ orderBy: { number: "asc" } }), getDictionary()]);
  return (
    <>
      <PageHeader title={t.admin.grades} description={t.admin.gradesText} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {grades.map((g) => <GradeToggle key={g.id} id={g.id} number={g.number} isActive={g.isActive} />)}
      </div>
    </>
  );
}
