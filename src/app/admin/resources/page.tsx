import type { Metadata } from "next";
import Link from "next/link";
import type { ResourceType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { PageHeader } from "@/components/common/page-header";
import { Icon, RESOURCE_ICONS } from "@/components/common/icon";
import { ModerationStatusBadge } from "@/components/common/badges";
import { formatFileSize, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getI18n, getDictionary } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).admin.resources };
}

export default async function AdminResourcesPage({ searchParams }: PageProps<"/admin/resources">) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const types = Object.keys(t.resourceTypes) as ResourceType[];
  const type = types.find((t) => t === sp.type);
  const [rows, totals] = await Promise.all([
    db.resource.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, type: true, title: true, fileSize: true, previewKind: true, pageCount: true, createdAt: true, createdBy: { select: { name: true } }, lesson: { select: { id: true, title: true, lessonNumber: true, status: true } } },
    }),
    db.resource.groupBy({ by: ["type"], _count: true, _sum: { fileSize: true } }),
  ]);
  const size = totals.reduce((n, t) => n + (t._sum.fileSize ?? 0), 0);
  return (
    <>
      <PageHeader title={t.admin.resources} description={fmt(t.admin.resourcesText, { n: totals.reduce((n, x) => n + x._count, 0), size: formatFileSize(size) })} />
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/resources" className={cn("rounded-full px-3.5 py-1.5 text-sm", !type ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{t.common.all}</Link>
        {types.map((rt) => {
          const c = totals.find((x) => x.type === rt)?._count ?? 0;
          return c ? <Link key={rt} href={`/admin/resources?type=${rt}`} className={cn("rounded-full px-3.5 py-1.5 text-sm", type === rt ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{t.resourceTypes[rt]} · {c}</Link> : null;
        })}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
            <tr><th className="px-4 py-3 font-medium">{t.admin.material}</th><th className="hidden px-4 py-3 font-medium md:table-cell">{t.admin.lesson}</th><th className="hidden px-4 py-3 font-medium sm:table-cell">{t.admin.size}</th><th className="px-4 py-3 font-medium">{t.admin.status}</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon name={RESOURCE_ICONS[r.type]} className="size-5 shrink-0 text-steppe" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{t.resourceTypes[r.type]} · {r.createdBy.name} · {relativeTime(r.createdAt, intlLocale(locale))}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell"><Link href={`/moderator/lessons/${r.lesson.id}/edit?tab=materials`} className="text-steppe hover:underline">{r.lesson.lessonNumber}. {r.lesson.title}</Link></td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{formatFileSize(r.fileSize)}{r.pageCount ? ` · ${fmt(t.moderator.pages, { n: r.pageCount })}` : ""}</td>
                <td className="px-4 py-3"><ModerationStatusBadge status={r.lesson.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
