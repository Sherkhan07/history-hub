import { StaffShell } from "@/components/layout/staff-shell";
import { requireRole } from "@/server/auth/guards";
import { getDictionary } from "@/i18n";
import { db } from "@/lib/db";

export default async function ModeratorLayout({ children }: LayoutProps<"/moderator">) {
  const user = await requireRole("MODERATOR", "ADMIN");
  const t = await getDictionary();
  const canReview = user.role === "ADMIN" || user.canReview;
  const inReview = await db.lesson.count({ where: { status: "IN_REVIEW", ...(canReview ? {} : { createdById: user.id }) } });
  return (
    <StaffShell
      user={{ name: user.name, email: user.email, role: user.role }}
      home="/moderator"
      title={t.nav.moderatorView}
      groups={[
        {
          items: [
            { href: "/moderator", label: t.nav.myMaterials, icon: "LayoutDashboard" },
            { href: "/moderator/lessons", label: t.nav.lessons, icon: "BookOpen" },
            { href: "/moderator/lessons/new", label: t.nav.createLesson, icon: "FilePlus2" },
          ],
        },
        {
          label: t.nav.statuses,
          items: [
            { href: "/moderator/review", label: t.nav.inReview, icon: "Inbox", badge: inReview },
            { href: "/moderator/lessons?status=REJECTED", label: t.nav.rejected, icon: "Undo2" },
            { href: "/moderator/lessons?status=PUBLISHED", label: t.nav.published, icon: "CheckCircle2" },
          ],
        },
        { items: [{ href: "/moderator/media", label: t.nav.media, icon: "ImageIcon" }, { href: "/teacher", label: t.nav.teacherView, icon: "GraduationCap" }] },
      ]}
    >
      {children}
    </StaffShell>
  );
}
