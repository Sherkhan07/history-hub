"use client";

import Link from "next/link";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

/** Big tappable grade buttons — usable on an interactive whiteboard. `href` contains "{g}" for the grade. */
export function GradeSelector({ href, active, compact }: { href: string; active?: number; compact?: boolean }) {
  const t = useDict();
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-7" : "grid-cols-4 sm:grid-cols-7")} role="list">
      {GRADES.map((g) => (
        <Link
          key={g}
          role="listitem"
          href={href.replace("{g}", String(g))}
          aria-current={active === g ? "true" : undefined}
          className={cn(
            "group flex flex-col items-center justify-center rounded-2xl border bg-card font-heading shadow-soft transition-all hover:-translate-y-0.5 hover:border-steppe/40 hover:shadow-lift",
            compact ? "h-12 text-lg" : "h-24 text-3xl",
            active === g && "border-steppe bg-steppe text-white hover:border-steppe",
          )}
        >
          <span className="font-semibold">{g}</span>
          {!compact && <span className={cn("text-xs font-normal text-muted-foreground", active === g && "text-white/80")}>{t.common.grade}</span>}
        </Link>
      ))}
    </div>
  );
}
