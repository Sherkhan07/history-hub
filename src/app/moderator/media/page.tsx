import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Icon, RESOURCE_ICONS } from "@/components/common/icon";
import { ModerationStatusBadge } from "@/components/common/badges";
import { formatFileSize, relativeTime } from "@/lib/format";
import { fileUrl } from "@/lib/files";
import { getI18n } from "@/i18n";
import { fmt, intlLocale } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.moderator.media };
}

export default async function MediaPage({ searchParams }: PageProps<"/moderator/media">) {
  const user = await requireRole("MODERATOR", "ADMIN");
  const { all } = await searchParams;
  const { t, locale } = await getI18n();
  const showAll = all === "1";
  const files = await db.resource.findMany({
    where: { fileUrl: { not: null }, ...(showAll ? {} : { createdById: user.id }) },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, type: true, title: true, originalName: true, fileSize: true, fileUrl: true, previewUrl: true, pageCount: true, createdAt: true, lesson: { select: { id: true, title: true, lessonNumber: true, status: true } } },
  });
  const total = files.reduce((n, f) => n + (f.fileSize ?? 0), 0);
  return (
    <>
      <PageHeader
        title={t.moderator.media}
        description={fmt(t.moderator.mediaStats, { n: files.length, size: formatFileSize(total) })}
        actions={
          <div className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
            <Link href="/moderator/media" className={`rounded-lg px-3 py-1.5 ${!showAll ? "bg-card shadow-soft" : ""}`}>{t.moderator.mine}</Link>
            <Link href="/moderator/media?all=1" className={`rounded-lg px-3 py-1.5 ${showAll ? "bg-card shadow-soft" : ""}`}>{t.moderator.all}</Link>
          </div>
        }
      />
      {files.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <div className="relative aspect-video bg-muted">
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(f.previewUrl)!} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground"><Icon name={RESOURCE_ICONS[f.type]} className="size-10" /></div>
                )}
              </div>
              <div className="space-y-1 p-4">
                <p className="truncate text-sm font-medium" title={f.originalName ?? f.title}>{f.originalName ?? f.title}</p>
                <p className="text-xs text-muted-foreground">{t.resourceTypes[f.type]} · {formatFileSize(f.fileSize)}{f.pageCount ? ` · ${fmt(t.moderator.pages, { n: f.pageCount })}` : ""} · {relativeTime(f.createdAt, intlLocale(locale))}</p>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Link href={`/moderator/lessons/${f.lesson.id}/edit?tab=materials`} className="truncate text-xs text-steppe hover:underline">{f.lesson.lessonNumber}. {f.lesson.title}</Link>
                  <ModerationStatusBadge status={f.lesson.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="ImageIcon" title={t.moderator.noFiles} description={t.moderator.noFilesText} />
      )}
    </>
  );
}
