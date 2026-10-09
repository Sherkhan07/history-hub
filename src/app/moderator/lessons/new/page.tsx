import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import { getCurriculumTree } from "@/features/curriculum/server/queries";
import { BasicsForm } from "@/features/lessons/components/editor/basics-form";
import { PageHeader } from "@/components/common/page-header";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).moderator.newLesson };
}

export default async function NewLessonPage() {
  await requireRole("MODERATOR", "ADMIN");
  const [tree, t] = await Promise.all([getCurriculumTree(), getDictionary()]);
  return (
    <>
      <PageHeader title={t.moderator.newLesson} description={t.moderator.newLessonText} />
      <BasicsForm tree={tree} />
    </>
  );
}
