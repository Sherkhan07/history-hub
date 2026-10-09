import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import { reviewQueue } from "@/features/lessons/server/staff-queries";
import { ReviewQueue } from "@/features/moderation/components/review-queue";
import { PageHeader } from "@/components/common/page-header";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.moderation };
}

export default async function AdminModerationPage() {
  const user = await requireRole("ADMIN");
  const [rows, t] = await Promise.all([reviewQueue(), getDictionary()]);
  return (
    <>
      <PageHeader title={t.admin.moderation} description={t.admin.moderationText} />
      <ReviewQueue rows={rows} actor={user} />
    </>
  );
}
