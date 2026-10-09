import { StaffShell } from "@/components/layout/staff-shell";
import { requireRole } from "@/server/auth/guards";
import { getDictionary } from "@/i18n";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("ADMIN");
  const t = await getDictionary();
  const queue = await db.lesson.count({ where: { status: { in: ["IN_REVIEW", "APPROVED"] } } });
  return (
    <StaffShell
      user={{ name: user.name, email: user.email, role: user.role }}
      home="/admin"
      title={t.nav.adminView}
      groups={[
        { items: [{ href: "/admin", label: t.nav.dashboard, icon: "LayoutDashboard" }] },
        {
          label: t.nav.content,
          items: [
            { href: "/admin/content", label: t.nav.overview, icon: "Library" },
            { href: "/admin/subjects", label: t.nav.subjects, icon: "BookOpen" },
            { href: "/admin/grades", label: t.nav.grades, icon: "GraduationCap" },
            { href: "/admin/curriculum", label: t.nav.curriculum, icon: "Layers" },
            { href: "/admin/lessons", label: t.nav.lessons, icon: "Presentation" },
            { href: "/admin/resources", label: t.nav.resources, icon: "FolderOpen" },
            { href: "/admin/games", label: t.nav.games, icon: "Gamepad2" },
          ],
        },
        {
          label: t.nav.users,
          items: [
            { href: "/admin/users?role=TEACHER", label: t.nav.teachers, icon: "Users" },
            { href: "/admin/users?role=MODERATOR", label: t.nav.moderators, icon: "UserRound" },
            { href: "/admin/users?role=ADMIN", label: t.nav.admins, icon: "Shield" },
          ],
        },
        {
          items: [
            { href: "/admin/moderation", label: t.nav.moderation, icon: "Inbox", badge: queue },
            { href: "/admin/analytics", label: t.nav.analytics, icon: "BarChart3" },
            { href: "/admin/audit-log", label: t.nav.auditLog, icon: "ScrollText" },
            { href: "/admin/settings", label: t.nav.settings, icon: "Settings" },
          ],
        },
        { label: t.nav.jumps, items: [{ href: "/moderator", label: t.nav.moderatorView, icon: "NotebookPen" }, { href: "/teacher", label: t.nav.teacherView, icon: "Home" }] },
      ]}
    >
      {children}
    </StaffShell>
  );
}
