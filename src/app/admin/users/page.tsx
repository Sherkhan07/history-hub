import type { Metadata } from "next";
import Link from "next/link";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { RoleBadge, UserAvatar } from "@/components/common/badges";
import { CreateUserDialog, UserRowActions } from "@/features/users/components";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getI18n, getDictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).users.title };
}

const ROLES: Role[] = ["TEACHER", "MODERATOR", "ADMIN"];

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireRole("ADMIN");
  const { t, locale } = await getI18n();
  const L = intlLocale(locale);
  const TITLES: Record<Role, string> = { TEACHER: t.users.teachers, MODERATOR: t.users.moderators, ADMIN: t.users.admins };
  const sp = await searchParams;
  const role = ROLES.find((r) => r === sp.role);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const users = await db.user.findMany({
    where: { ...(role ? { role } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ isBlocked: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: { id: true, name: true, email: true, role: true, school: true, canReview: true, isBlocked: true, lastLoginAt: true, createdAt: true, _count: { select: { views: true, lessonsCreated: true } } },
  });
  return (
    <>
      <PageHeader title={role ? TITLES[role] : t.users.title} description={fmt(t.users.count, { n: users.length })} actions={<CreateUserDialog defaultRole={role ?? "TEACHER"} />} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/admin/users" className={cn("rounded-full px-3.5 py-1.5 text-sm", !role ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{t.common.all}</Link>
        {ROLES.map((r) => (
          <Link key={r} href={`/admin/users?role=${r}`} className={cn("rounded-full px-3.5 py-1.5 text-sm", role === r ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{TITLES[r]}</Link>
        ))}
        <form className="ml-auto" action="/admin/users">
          {role && <input type="hidden" name="role" value={role} />}
          <input name="q" defaultValue={q} placeholder={t.users.search} aria-label={t.users.searchLabel} className="h-10 w-64 rounded-xl border bg-card px-3 text-sm outline-none focus:ring-3 focus:ring-ring/30" />
        </form>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">{t.users.user}</th>
              <th className="px-4 py-3 font-medium">{t.users.role}</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">{t.users.school}</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">{t.users.activity}</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">{t.users.lastLogin}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className={cn(u.isBlocked && "opacity-60")}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name} {u.id === me.id && <span className="text-xs text-muted-foreground">{t.common.you}</span>}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <RoleBadge role={u.role} label={t.roles[u.role]} />
                    {u.canReview && <span className="rounded-full bg-gold-soft px-2 text-xs leading-6">{t.users.reviewer}</span>}
                    {u.isBlocked && <span className="rounded-full bg-destructive/10 px-2 text-xs leading-6 text-destructive">{t.users.blocked}</span>}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.school ?? "—"}</td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {u.role === "TEACHER" ? fmt(t.users.views, { n: u._count.views }) : fmt(t.users.lessons, { n: u._count.lessonsCreated })}
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">{u.lastLoginAt ? formatDateTime(u.lastLoginAt, L) : t.users.neverLoggedIn}</td>
                <td className="px-4 py-3"><UserRowActions user={u} self={u.id === me.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
