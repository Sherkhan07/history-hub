import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { searchLessons } from "@/features/lessons/server/queries";
import { LessonCover } from "@/features/curriculum/components/lesson-card";
import { GlobalSearch } from "@/components/layout/global-search";
import { EmptyState } from "@/components/common/empty-state";
import { Icon, RESOURCE_ICONS } from "@/components/common/icon";
import { romanQuarter } from "@/lib/format";
import { getI18n } from "@/i18n";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.nav.search };
}

export default async function SearchPage({ searchParams }: PageProps<"/teacher/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [hits, { t, locale }] = await Promise.all([query ? searchLessons(query) : Promise.resolve([]), getI18n()]);
  return (
    <div className="space-y-8">
      <Suspense>
        <GlobalSearch size="lg" className="max-w-2xl" />
      </Suspense>
      {query && (
        <p className="text-muted-foreground">
          {hits.length > 0 && fmt(t.teacher.found, { n: hits.length, q: query })}
        </p>
      )}
      {query && !hits.length && <EmptyState icon="Search" title={t.teacher.searchEmpty} description={t.teacher.searchHint} />}
      <ul className="space-y-3">
        {hits.map((h) => (
          <li key={h.id}>
            <Link href={`/teacher/lesson/${h.id}`} className="flex gap-4 rounded-2xl border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <LessonCover src={h.coverUrl} alt="" className="hidden aspect-video w-44 shrink-0 sm:block" />
              <div className="min-w-0 flex-1 py-1">
                <p className="text-sm text-muted-foreground">
                  {fmt(t.teacher.lessonMetaFull, { grade: h.grade, subject: subjectName({ name: h.subjectName, nameKk: h.subjectNameKk }, locale), quarter: romanQuarter(h.quarter), n: h.lessonNumber })}
                </p>
                <p className="mt-0.5 font-heading text-lg font-medium">{h.title}</p>
                <p className="text-sm text-muted-foreground">{h.sectionTitle}</p>
                {h.matchedResources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {h.matchedResources.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs">
                        <Icon name={RESOURCE_ICONS[r.type]} className="size-3.5" /> {r.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
