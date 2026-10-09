import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guards";
import { getRecentLessons } from "@/features/lessons/server/queries";
import { LessonTile } from "@/features/curriculum/components/lesson-card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).teacher.recentTitle };
}

export default async function RecentPage() {
  const user = await requireUser();
  const [lessons, t] = await Promise.all([getRecentLessons(user.id, 24), getDictionary()]);
  return (
    <>
      <PageHeader title={t.teacher.recentTitle} />
      {lessons.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map((l) => <LessonTile key={l.id} lesson={l} />)}
        </div>
      ) : (
        <EmptyState icon="Clock" title={t.teacher.recentEmpty} />
      )}
    </>
  );
}
