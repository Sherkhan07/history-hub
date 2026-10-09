import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import { reviewQueue } from "@/features/lessons/server/staff-queries";
import { ReviewQueue } from "@/features/moderation/components/review-queue";
import { PageHeader } from "@/components/common/page-header";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).moderator.reviewTitle };
}

export default async function ReviewPage() {
  const user = await requireRole("MODERATOR", "ADMIN");
  const canReview = user.role === "ADMIN" || user.canReview;
  const [rows, t] = await Promise.all([reviewQueue(canReview ? undefined : user.id), getDictionary()]);
  return (
    <>
      <PageHeader
        title={t.moderator.reviewTitle}
        description={canReview ? t.moderator.reviewText : t.moderator.reviewTextOwn}
      />
      <ReviewQueue rows={rows} actor={{ id: user.id, role: user.role, canReview: user.canReview }} />
    </>
  );
}
