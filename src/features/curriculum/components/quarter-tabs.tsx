"use client";

import Link from "next/link";
import { romanQuarter } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

/** `href` contains "{q}" for the quarter number. */
export function QuarterTabs({ quarters, active, href }: { quarters: { number: number; lessonCount: number }[]; active: number; href: string }) {
  const t = useDict();
  return (
    <div role="tablist" aria-label={t.teacher.quarters} className="inline-flex flex-wrap gap-1 rounded-2xl bg-muted p-1.5">
      {quarters.map((q) => (
        <Link
          key={q.number}
          role="tab"
          aria-selected={active === q.number}
          href={href.replace("{q}", String(q.number))}
          scroll={false}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors",
            active === q.number ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {fmt(t.common.quarterN, { q: romanQuarter(q.number) })}
          <span className={cn("rounded-full px-2 text-xs leading-5", active === q.number ? "bg-steppe-soft text-steppe" : "bg-background/60")}>{q.lessonCount}</span>
        </Link>
      ))}
    </div>
  );
}
