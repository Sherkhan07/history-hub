"use client";

import type { CatalogSection } from "@/features/curriculum/server/queries";
import { LessonCard } from "./lesson-card";

export function SectionBlock({ section, index }: { section: CatalogSection; index: number }) {
  return (
    <section aria-labelledby={`section-${section.id}`} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-6 bg-gold" aria-hidden />
        <h2 id={`section-${section.id}`} className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          {section.title}
        </h2>
        <span className="text-sm text-muted-foreground/70">· {section.lessons.length}</span>
      </div>
      <div className="space-y-3">
        {section.lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} />
        ))}
      </div>
    </section>
  );
}
