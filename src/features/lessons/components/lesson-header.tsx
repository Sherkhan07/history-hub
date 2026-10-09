"use client";

import Link from "next/link";
import { ChevronRight, Clock, Target } from "lucide-react";
import { romanQuarter } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

export function LearningObjectiveBadge({ code, text, className }: { code: string; text: string; className?: string }) {
  return (
    <li className={cn("flex gap-3 rounded-xl bg-card/70 px-3.5 py-2.5", className)}>
      {code ? (
        <span className="shrink-0 rounded-lg bg-steppe-soft px-2 py-0.5 font-mono text-sm font-medium text-steppe">{code}</span>
      ) : (
        <Target className="mt-0.5 size-4 shrink-0 text-steppe" aria-hidden />
      )}
      <span className="text-sm leading-relaxed">{text}</span>
    </li>
  );
}

export type LessonCrumbs = { subjectName: string; subjectSlug: string; grade: number; quarter: number; sectionTitle: string };

export function LessonBreadcrumb({ c }: { c: LessonCrumbs }) {
  const t = useDict();
  return (
    <nav aria-label={t.common.navigation} className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <Link href={`/teacher/subjects?grade=${c.grade}`} className="hover:text-foreground">{fmt(t.common.gradeN, { n: c.grade })}</Link>
      <ChevronRight className="size-4" aria-hidden />
      <Link href={`/teacher/subject/${c.subjectSlug}/grade/${c.grade}`} className="hover:text-foreground">{c.subjectName}</Link>
      <ChevronRight className="size-4" aria-hidden />
      <Link href={`/teacher/subject/${c.subjectSlug}/grade/${c.grade}?q=${c.quarter}`} className="hover:text-foreground">
        {fmt(t.common.quarterN, { q: romanQuarter(c.quarter) })}
      </Link>
      <ChevronRight className="size-4" aria-hidden />
      <span className="truncate text-foreground/70">{c.sectionTitle}</span>
    </nav>
  );
}

export function DurationPill({ minutes }: { minutes: number }) {
  const t = useDict();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm">
      <Clock className="size-4 text-steppe" aria-hidden /> {fmt(t.common.minutesLong, { n: minutes })}
    </span>
  );
}
