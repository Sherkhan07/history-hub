import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { requireRole } from "@/server/auth/guards";
import { listLessons } from "@/features/lessons/server/staff-queries";
import { LessonTable, Pagination } from "@/features/lessons/components/staff/lesson-table";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { fmt } from "@/i18n/format";
import type { ContentStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.lessons };
}

const STATUSES: ContentStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"];

export default async function LessonsPage({ searchParams }: PageProps<"/moderator/lessons">) {
  await requireRole("MODERATOR", "ADMIN");
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined;
  const page = Number(sp.page) || 1;
  const [data, t] = await Promise.all([listLessons({ status, q, page }), getDictionary()]);
  const href = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q, ...p })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/moderator/lessons?${u}`;
  };
  return (
    <>
      <PageHeader
        title={status ? t.status[status] : t.moderator.allLessons}
        description={fmt(t.moderator.lessonsTotal, { n: data.total })}
        actions={<Button asChild><Link href="/moderator/lessons/new"><FilePlus2 /> {t.nav.createLesson}</Link></Button>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/moderator/lessons" className={cn("rounded-full px-3.5 py-1.5 text-sm", !status ? "bg-ink text-white" : "bg-card hover:bg-muted")}>{t.common.all}</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} className={cn("rounded-full px-3.5 py-1.5 text-sm", status === s ? "bg-ink text-white" : "bg-card hover:bg-muted")}>
            {t.status[s]}
          </Link>
        ))}
        <form className="ml-auto" action="/moderator/lessons">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder={t.moderator.searchByTitle} aria-label={t.moderator.searchByTitle} className="h-10 w-64 rounded-xl border bg-card px-3 text-sm outline-none focus:ring-3 focus:ring-ring/30" />
        </form>
      </div>
      <LessonTable rows={data.rows} />
      <Pagination page={data.page} pages={data.pages} hrefFor={(p) => href({ page: p })} />
    </>
  );
}
