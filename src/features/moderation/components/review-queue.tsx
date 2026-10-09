import Link from "next/link";
import { Eye, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModerationStatusBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/empty-state";
import type { Actor } from "@/server/auth/permissions";
import { relativeTime, romanQuarter } from "@/lib/format";
import { getI18n } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";
import type { reviewQueue } from "@/features/lessons/server/staff-queries";
import { WorkflowActions } from "./workflow-actions";

type Row = Awaited<ReturnType<typeof reviewQueue>>[number];

export async function ReviewQueue({ rows, actor }: { rows: Row[]; actor: Actor }) {
  const { t, locale } = await getI18n();
  if (!rows.length) return <EmptyState icon="Inbox" title={t.workflow.queueEmpty} description={t.workflow.queueEmptyText} />;
  return (
    <ul className="space-y-3">
      {rows.map((l) => {
        const c = l.section.quarter.curriculum;
        const req = l.moderation[0];
        return (
          <li key={l.id} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ModerationStatusBadge status={l.status} />
                  <span className="text-sm text-muted-foreground">{fmt(t.workflow.where, { grade: c.grade.number, subject: subjectName(c.subject, locale), q: romanQuarter(l.section.quarter.number) })}</span>
                </div>
                <p className="mt-2 font-heading text-lg font-medium">{l.lessonNumber}. {l.title}</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(t.workflow.queueMeta, { who: req?.submittedBy.name ?? l.createdBy.name, when: relativeTime(req?.submittedAt ?? l.updatedAt, intlLocale(locale)), o: l._count.objectives, r: l._count.resources, q: l._count.quizzes, g: l._count.games })}
                </p>
                {req?.submitNote && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">«{req.submitNote}»</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Button asChild variant="ghost" size="sm"><Link href={`/teacher/lesson/${l.id}`}><Eye /> {t.editor.asTeacher}</Link></Button>
                  <Button asChild variant="ghost" size="sm"><Link href={`/moderator/lessons/${l.id}/edit`}><PenLine /> {t.common.open}</Link></Button>
                </div>
                <WorkflowActions lessonId={l.id} status={l.status} actor={actor} only={["approve", "approvePublish", "publish", "reject"]} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
