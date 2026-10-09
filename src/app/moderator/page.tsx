import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { requireRole } from "@/server/auth/guards";
import { listLessons, statusCounts } from "@/features/lessons/server/staff-queries";
import { LessonTable } from "@/features/lessons/components/staff/lesson-table";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).moderator.myMaterials };
}

export default async function ModeratorHome() {
  const user = await requireRole("MODERATOR", "ADMIN");
  const [counts, mine, t] = await Promise.all([statusCounts(user.id), listLessons({ createdById: user.id }), getDictionary()]);
  return (
    <>
      <PageHeader
        eyebrow={fmt(t.moderator.hello, { name: user.name.split(" ")[0] })}
        title={t.moderator.myMaterials}
        description={t.moderator.myMaterialsText}
        actions={<Button asChild size="lg"><Link href="/moderator/lessons/new"><FilePlus2 /> {t.nav.createLesson}</Link></Button>}
      />
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.moderator.drafts} value={counts.DRAFT} icon="NotebookPen" />
        <StatCard label={t.moderator.inReview} value={counts.IN_REVIEW + counts.APPROVED} icon="Inbox" tone="gold" />
        <StatCard label={t.moderator.rejected} value={counts.REJECTED} icon="Undo2" tone="clay" />
        <StatCard label={t.moderator.published} value={counts.PUBLISHED} icon="CheckCircle2" tone="sage" />
      </div>
      <h2 className="mb-4 text-lg font-medium">{t.moderator.recentlyChanged}</h2>
      <LessonTable rows={mine.rows.slice(0, 10)} empty={t.moderator.noLessonsYet} />
    </>
  );
}
