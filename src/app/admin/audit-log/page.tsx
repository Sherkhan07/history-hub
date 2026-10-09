import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/features/lessons/components/staff/lesson-table";
import { actionLabel } from "@/features/moderation/components/history-timeline";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getI18n, getDictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.auditLog };
}

const GROUPS = ["all", "lesson", "resource", "user", "auth", "section", "settings"] as const;
const SIZE = 50;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const L = intlLocale(locale);
  const group = GROUPS.find((g) => g === sp.group) ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = group === "all" ? {} : { action: { startsWith: `${group}.` } };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * SIZE, take: SIZE, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title={t.admin.auditLog} description={fmt(t.admin.auditText, { n: total })} />
      <div className="mb-5 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Link key={g} href={`/admin/audit-log?group=${g}`} className={cn("rounded-full px-3.5 py-1.5 text-sm", group === g ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{t.admin.auditGroups[g]}</Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr><th className="px-4 py-3 font-medium">{t.admin.when}</th><th className="px-4 py-3 font-medium">{t.admin.who}</th><th className="px-4 py-3 font-medium">{t.admin.action}</th><th className="hidden px-4 py-3 font-medium lg:table-cell">{t.admin.details}</th><th className="hidden px-4 py-3 font-medium xl:table-cell">IP</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt, L)}</td>
                <td className="px-4 py-2.5">{r.actor?.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {actionLabel(r.action, t)}
                  {r.entityType === "Lesson" && r.entityId && <Link href={`/moderator/lessons/${r.entityId}/edit?tab=history`} className="ml-2 text-xs text-steppe hover:underline">{t.admin.lessonLink}</Link>}
                </td>
                <td className="hidden max-w-md px-4 py-2.5 font-mono text-xs break-all text-muted-foreground lg:table-cell">{r.metadata ? JSON.stringify(r.metadata).slice(0, 220) : ""}</td>
                <td className="hidden px-4 py-2.5 font-mono text-xs text-muted-foreground xl:table-cell">{r.ip ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / SIZE))} hrefFor={(p) => `/admin/audit-log?group=${group}&page=${p}`} />
    </>
  );
}
