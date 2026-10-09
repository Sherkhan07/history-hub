"use client";

import { useState } from "react";
import { Eye, EyeOff, Users, User, UsersRound, Clock } from "lucide-react";
import type { TaskContent } from "../content";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

const MODE = {
  individual: { key: "individual", Icon: User },
  pair: { key: "pair", Icon: UsersRound },
  group: { key: "group", Icon: Users },
} as const;

export function TasksView({ tasks, large }: { tasks: TaskContent["tasks"]; large?: boolean }) {
  const d = useDict();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <ol className="space-y-4">
      {tasks.map((t, i) => {
        const m = MODE[t.mode];
        return (
          <li key={i} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-steppe text-sm font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h3 className={cn("font-heading font-medium", large ? "text-2xl" : "text-lg")}>{t.title}</h3>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><m.Icon className="size-3.5" /> {d.viewer[m.key]}</span>
                  {t.minutes && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmt(d.common.min, { n: t.minutes })}</span>}
                  {t.slide && <span>{fmt(d.viewer.slide, { n: t.slide })}</span>}
                </div>
                <p className={cn("mt-3 whitespace-pre-line text-foreground/90", large ? "text-xl leading-relaxed" : "")}>{t.instructions}</p>
                {t.answer && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setOpen((s) => ({ ...s, [i]: !s[i] }))}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-steppe hover:underline"
                      aria-expanded={Boolean(open[i])}
                    >
                      {open[i] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {open[i] ? d.viewer.hideAnswer : d.viewer.showAnswer}
                    </button>
                    {open[i] && <p className="mt-2 rounded-xl bg-sage-soft px-4 py-3 text-sm">{t.answer}</p>}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
