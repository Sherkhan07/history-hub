import Link from "next/link";
import { ModerationStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import type { LessonRow } from "@/features/lessons/server/staff-queries";
import { relativeTime, romanQuarter } from "@/lib/format";
import { LessonCover } from "@/features/curriculum/components/lesson-card";
import { getI18n } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

export async function LessonTable({ rows, empty }: { rows: LessonRow[]; empty?: string }) {
  const { t, locale } = await getI18n();
  if (!rows.length) return <EmptyState icon="BookOpen" title={empty ?? t.moderator.table.empty} />;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">{t.moderator.table.lesson}</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">{t.moderator.table.where}</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">{t.moderator.table.materials}</th>
            <th className="px-4 py-3 font-medium">{t.moderator.table.status}</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">{t.moderator.table.updated}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((l) => {
            const c = l.section.quarter.curriculum;
            return (
              <tr key={l.id} className="group hover:bg-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/moderator/lessons/${l.id}/edit`} className="flex items-center gap-3">
                    <LessonCover src={l.coverUrl} alt="" className="hidden aspect-video w-20 shrink-0 rounded-lg sm:block" sizes="80px" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium group-hover:text-steppe">{l.lessonNumber}. {l.title}</span>
                      <span className="text-xs text-muted-foreground">{l.createdBy.name}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {fmt(t.moderator.table.whereValue, { grade: c.grade.number, subject: subjectName(c.subject, locale), q: romanQuarter(l.section.quarter.number) })}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {fmt(t.moderator.table.counts, { r: l._count.resources, q: l._count.quizzes, g: l._count.games })}
                </td>
                <td className="px-4 py-3"><ModerationStatusBadge status={l.status} /></td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">{relativeTime(l.updatedAt, intlLocale(locale))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export async function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const { t } = await getI18n();
  return (
    <nav className="mt-6 flex items-center justify-center gap-2" aria-label={t.common.navigation}>
      {page > 1 && <Link href={hrefFor(page - 1)} className="rounded-xl border bg-card px-4 py-2 text-sm hover:bg-muted">{t.common.prev}</Link>}
      <span className="px-3 text-sm text-muted-foreground">{fmt(t.common.pageOf, { page, pages })}</span>
      {page < pages && <Link href={hrefFor(page + 1)} className="rounded-xl border bg-card px-4 py-2 text-sm hover:bg-muted">{t.common.nextPage}</Link>}
    </nav>
  );
}
