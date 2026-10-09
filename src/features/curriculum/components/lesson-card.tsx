"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ClipboardList, Gamepad2, ListChecks, Presentation } from "lucide-react";
import type { CatalogLesson } from "@/features/curriculum/server/queries";
import { fileUrl } from "@/lib/files";
import { countLabel, padLessonNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDict, useLocale } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { subjectName } from "@/features/curriculum/subject-name";

function Chip({ icon: I, children, muted }: { icon: typeof Presentation; children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs", muted ? "text-muted-foreground/60" : "bg-muted text-foreground/80")}>
      <I className="size-3.5" aria-hidden /> {children}
    </span>
  );
}

export function LessonCover({ src, alt, className, sizes = "160px" }: { src: string | null; alt: string; className?: string; sizes?: string }) {
  const url = fileUrl(src);
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-br from-steppe-soft to-gold-soft", className)}>
      {url ? (
        <Image src={url} alt={alt} fill sizes={sizes} className="object-cover" unoptimized />
      ) : (
        <div className="absolute inset-0 ornament-bg opacity-80" aria-hidden />
      )}
    </div>
  );
}

/** Catalog row: number, cover, title, what's inside, CTA. */
export function LessonCard({ lesson }: { lesson: CatalogLesson }) {
  const t = useDict();
  return (
    <Link
      href={`/teacher/lesson/${lesson.id}`}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-3 pr-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-steppe/30 hover:shadow-lift sm:gap-5"
    >
      <span className="w-10 shrink-0 text-center font-heading text-2xl font-semibold text-steppe/80 tabular-nums sm:w-12 sm:text-3xl">
        {padLessonNumber(lesson.lessonNumber)}
      </span>
      <LessonCover src={lesson.coverUrl} alt="" className="hidden aspect-video w-36 shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-heading text-base font-medium sm:text-lg">{lesson.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip icon={Presentation} muted={!lesson.hasPresentation}>
            {lesson.hasPresentation ? countLabel(lesson.slideCount, t.catalog.slides) : t.catalog.noPresentation}
          </Chip>
          {lesson.taskCount > 0 && <Chip icon={ClipboardList}>{countLabel(lesson.taskCount, t.catalog.tasks)}</Chip>}
          {lesson.questionCount > 0 && <Chip icon={ListChecks}>{fmt(t.catalog.quiz, { n: lesson.questionCount })}</Chip>}
          {lesson.gameCount > 0 && <Chip icon={Gamepad2}>{countLabel(lesson.gameCount, t.catalog.games)}</Chip>}
        </div>
      </div>
      <span className="hidden items-center gap-2 rounded-xl bg-steppe-soft px-4 py-2.5 text-sm font-medium text-steppe transition-colors group-hover:bg-steppe group-hover:text-white md:flex">
        {t.catalog.openLesson} <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

/** Compact vertical tile for dashboard rails (recent / favorites). */
export function LessonTile({
  lesson,
}: {
  lesson: CatalogLesson & { subjectName: string; subjectNameKk?: string | null; grade: number; quarter: number };
}) {
  const t = useDict();
  const locale = useLocale();
  return (
    <Link href={`/teacher/lesson/${lesson.id}`} className="group block rounded-2xl border bg-card p-2.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <LessonCover src={lesson.coverUrl} alt="" className="aspect-video w-full" sizes="320px" />
      <div className="px-1.5 pt-3 pb-1.5">
        <p className="text-xs text-muted-foreground">
          {fmt(t.teacher.lessonMeta, { grade: lesson.grade, subject: subjectName({ name: lesson.subjectName, nameKk: lesson.subjectNameKk }, locale), n: lesson.lessonNumber })}
        </p>
        <p className="mt-1 line-clamp-2 font-heading text-[15px] leading-snug font-medium">{lesson.title}</p>
      </div>
    </Link>
  );
}
