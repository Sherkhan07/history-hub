"use client";

import Link from "next/link";
import { ArrowRight, Globe2, Landmark } from "lucide-react";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDict, useLocale } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { countLabel } from "@/lib/format";

export type SubjectCardData = { slug: string; name: string; nameKk?: string | null; description?: string | null; descriptionKk?: string | null; accent: string };

const ACCENTS: Record<string, { bg: string; chip: string; Icon: typeof Landmark }> = {
  kz: { bg: "from-[oklch(0.42_0.12_245)] to-[oklch(0.33_0.09_250)]", chip: "bg-white/12 hover:bg-white/22", Icon: Landmark },
  world: { bg: "from-[oklch(0.52_0.12_40)] to-[oklch(0.4_0.1_35)]", chip: "bg-white/12 hover:bg-white/22", Icon: Globe2 },
};

/** Large subject tile. With `grade` it links straight into that grade; otherwise shows grade chips. */
export function SubjectCard({ subject, counts, grade }: { subject: SubjectCardData; counts?: Record<number, number>; grade?: number }) {
  const t = useDict();
  const locale = useLocale();
  const a = ACCENTS[subject.accent] ?? ACCENTS.kz;
  const title = locale === "kk" ? (subject.nameKk ?? subject.name) : subject.name;
  const description = locale === "kk" ? (subject.descriptionKk ?? subject.description) : subject.description;
  const gradeLabel = (g: number) => fmt(t.common.gradeN, { n: g });
  const href = grade ? `/teacher/subject/${subject.slug}/grade/${grade}` : undefined;
  const body = (
    <>
      <div className="pointer-events-none absolute inset-0 ornament-bg opacity-30 invert" aria-hidden />
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <a.Icon className="size-6" aria-hidden />
        </span>
        {href && <ArrowRight className="size-6 opacity-70 transition-transform group-hover:translate-x-1" aria-hidden />}
      </div>
      <div className="relative mt-10">
        <h3 className="text-2xl font-semibold sm:text-3xl">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-white/75">{description}</p>}
        {grade && counts && <p className="mt-3 text-sm text-gold">{countLabel(counts[grade] ?? 0, t.teacher.lessonsCount)} · {gradeLabel(grade)}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={`${title}, ${gradeLabel(grade!)}`} className={cn("group relative block overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white shadow-lift transition-transform hover:-translate-y-0.5", a.bg)}>
        {body}
      </Link>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white shadow-lift", a.bg)}>
      {body}
      <div className="relative mt-6 flex flex-wrap gap-2" role="list" aria-label={fmt(t.teacher.gradesOf, { subject: title })}>
        {GRADES.map((g) => (
          <Link
            key={g}
            role="listitem"
            href={`/teacher/subject/${subject.slug}/grade/${g}`}
            className={cn("flex h-11 min-w-14 flex-col items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors", a.chip)}
            aria-label={`${gradeLabel(g)}, ${countLabel(counts?.[g] ?? 0, t.teacher.lessonsCount)}`}
          >
            <span className="leading-none">{g}</span>
            {counts?.[g] ? <span className="mt-0.5 text-[10px] leading-none text-gold">{counts[g]}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
