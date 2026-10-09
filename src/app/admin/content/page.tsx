import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getI18n, getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.content };
}

export default async function ContentOverview() {
  await requireRole("ADMIN");
  const { t, locale } = await getI18n();
  const [subjects, lessons] = await Promise.all([
    db.subject.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, nameKk: true } }),
    db.lesson.findMany({ where: { status: { not: "ARCHIVED" } }, select: { status: true, section: { select: { quarter: { select: { curriculum: { select: { subjectId: true, grade: { select: { number: true } } } } } } } } } }),
  ]);
  const cell = (subjectId: string, grade: number) => {
    const rows = lessons.filter((l) => l.section.quarter.curriculum.subjectId === subjectId && l.section.quarter.curriculum.grade.number === grade);
    return { total: rows.length, published: rows.filter((r) => r.status === "PUBLISHED").length, review: rows.filter((r) => r.status === "IN_REVIEW" || r.status === "APPROVED").length };
  };
  return (
    <>
      <PageHeader title={t.admin.content} description={t.admin.contentText} />
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.admin.subject}</th>
              {GRADES.map((g) => <th key={g} className="px-3 py-3 font-medium">{fmt(t.admin.gradeShort, { n: g })}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {subjects.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-4 font-medium">{subjectName(s, locale)}</td>
                {GRADES.map((g) => {
                  const c = cell(s.id, g);
                  return (
                    <td key={g} className="px-2 py-2 text-center">
                      <Link href={`/admin/curriculum?subject=${s.id}&grade=${g}`} className={cn("block rounded-xl px-2 py-2 transition-colors hover:bg-muted", c.published ? "bg-sage-soft" : c.total ? "bg-gold-soft" : "")}>
                        <span className="block font-heading text-lg font-semibold tabular-nums">{c.published}<span className="text-xs font-normal text-muted-foreground">/{c.total}</span></span>
                        {c.review > 0 && <span className="text-[11px] text-[oklch(0.5_0.1_70)]">{fmt(t.admin.inReviewN, { n: c.review })}</span>}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t.admin.contentHint}</p>
    </>
  );
}
