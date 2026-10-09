import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guards";
import { getFavoriteLessons } from "@/features/lessons/server/queries";
import { LessonTile } from "@/features/curriculum/components/lesson-card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).teacher.favoritesTitle };
}

export default async function FavoritesPage() {
  const user = await requireUser();
  const [lessons, t] = await Promise.all([getFavoriteLessons(user.id), getDictionary()]);
  return (
    <>
      <PageHeader title={t.teacher.favoritesTitle} description={t.teacher.favoritesText} />
      {lessons.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map((l) => <LessonTile key={l.id} lesson={l} />)}
        </div>
      ) : (
        <EmptyState icon="Star" title={t.teacher.favoritesEmpty} description={t.teacher.favoritesEmptyText} />
      )}
    </>
  );
}
