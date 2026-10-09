"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Wand2 } from "lucide-react";
import type { StageActivity } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, SectionCard } from "@/components/common/form-controls";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { saveStagesAction } from "../../editor-actions";
import type { StageView } from "../../stages";
import { useSave } from "./use-save";

type Stage = { title: string; description: string; durationMinutes: number; activity: StageActivity; resourceId: string | null; slideFrom: number | null; slideTo: number | null; quizId: string | null; gameId: string | null };

export function ScenarioEditor({
  lessonId,
  initial,
  defaults,
  resources,
  quizzes,
  games,
  duration,
  readOnly,
}: {
  lessonId: string;
  initial: Stage[];
  defaults: StageView[];
  resources: { id: string; title: string; type: string; pageCount: number | null }[];
  quizzes: { id: string; title: string }[];
  games: { id: string; title: string; type: string }[];
  duration: number;
  readOnly?: boolean;
}) {
  const t = useDict();
  const [stages, setStages] = useState<Stage[]>(initial);
  const { pending, run } = useSave();
  const total = stages.reduce((n, s) => n + (Number(s.durationMinutes) || 0), 0);
  const patch = (i: number, p: Partial<Stage>) => setStages((l) => l.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <SectionCard
      title={t.editor.scenarioTitle}
      description={t.editor.scenarioText}
      actions={
        !readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStages(defaults.map((d) => ({ title: d.title, description: d.description ?? "", durationMinutes: d.minutes, activity: d.activity, resourceId: d.resourceId, slideFrom: d.slideFrom, slideTo: d.slideTo, quizId: d.quizId, gameId: d.gameId })))}
            >
              <Wand2 /> {t.editor.standardPlan}
            </Button>
            <Button disabled={pending} onClick={() => run(() => saveStagesAction(lessonId, stages))}><Save /> {t.common.save}</Button>
          </div>
        )
      }
    >
      <p className={cn("mb-4 text-sm", total === duration ? "text-success" : "text-muted-foreground")}>
        {fmt(t.editor.total, { n: total, d: duration })}
      </p>
      <fieldset disabled={readOnly} className="space-y-3">
        {stages.map((s, i) => {
          const res = resources.find((r) => r.id === s.resourceId);
          return (
            <div key={i} className="space-y-3 rounded-2xl border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-muted text-sm font-semibold">{i + 1}</span>
                <Input aria-label={t.editor.stageName} value={s.title} onChange={(e) => patch(i, { title: e.target.value })} className="min-w-48 flex-1" />
                <Input aria-label={t.editor.minutes} type="number" min={1} max={90} value={s.durationMinutes} onChange={(e) => patch(i, { durationMinutes: Number(e.target.value) })} className="w-20" />
                <span className="text-sm text-muted-foreground">{t.common.minutes}</span>
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => setStages((l) => { const n = [...l]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} aria-label={t.common.up}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={i === stages.length - 1} onClick={() => setStages((l) => { const n = [...l]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} aria-label={t.common.down}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setStages((l) => l.filter((_, j) => j !== i))} aria-label={t.editor.removeStage}><Trash2 /></Button>
              </div>
              <Input aria-label={t.editor.stageDescription} value={s.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder={t.editor.stagePlaceholder} />
              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect aria-label={t.editor.activity} value={s.activity} onChange={(e) => patch(i, { activity: e.target.value as StageActivity })} className="w-44">
                  <option value="NONE">{t.editor.activityNone}</option>
                  <option value="RESOURCE">{t.editor.activityResource}</option>
                  <option value="QUIZ">{t.editor.activityQuiz}</option>
                  <option value="GAME">{t.editor.activityGame}</option>
                </NativeSelect>
                {s.activity === "RESOURCE" && (
                  <>
                    <NativeSelect aria-label={t.editor.activityResource} value={s.resourceId ?? ""} onChange={(e) => patch(i, { resourceId: e.target.value || null })} className="w-72">
                      <option value="">{t.editor.pickResource}</option>
                      {resources.map((r) => <option key={r.id} value={r.id}>{t.resourceTypes[r.type as keyof typeof t.resourceTypes]}: {r.title}</option>)}
                    </NativeSelect>
                    {res?.type === "PRESENTATION" && (
                      <>
                        <span className="text-sm text-muted-foreground">{t.editor.slides}</span>
                        <Input aria-label={t.editor.slideFrom} type="number" min={1} max={res.pageCount ?? 999} value={s.slideFrom ?? ""} onChange={(e) => patch(i, { slideFrom: e.target.value ? Number(e.target.value) : null })} className="w-20" />
                        <span>–</span>
                        <Input aria-label={t.editor.slideTo} type="number" min={1} max={res.pageCount ?? 999} value={s.slideTo ?? ""} onChange={(e) => patch(i, { slideTo: e.target.value ? Number(e.target.value) : null })} className="w-20" />
                        {res.pageCount && <span className="text-xs text-muted-foreground">{fmt(t.editor.ofN, { n: res.pageCount })}</span>}
                      </>
                    )}
                  </>
                )}
                {s.activity === "QUIZ" && (
                  <NativeSelect aria-label={t.editor.activityQuiz} value={s.quizId ?? ""} onChange={(e) => patch(i, { quizId: e.target.value || null })} className="w-72">
                    <option value="">{t.editor.pickQuiz}</option>
                    {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                  </NativeSelect>
                )}
                {s.activity === "GAME" && (
                  <NativeSelect aria-label={t.editor.activityGame} value={s.gameId ?? ""} onChange={(e) => patch(i, { gameId: e.target.value || null })} className="w-72">
                    <option value="">{t.editor.pickGame}</option>
                    {games.map((g) => <option key={g.id} value={g.id}>{t.gameTypes[g.type as keyof typeof t.gameTypes]}: {g.title}</option>)}
                  </NativeSelect>
                )}
              </div>
            </div>
          );
        })}
        {!readOnly && (
          <Button type="button" variant="outline" onClick={() => setStages((l) => [...l, { title: "", description: "", durationMinutes: 5, activity: "NONE", resourceId: null, slideFrom: null, slideTo: null, quizId: null, gameId: null }])}>
            <Plus /> {t.editor.addStage}
          </Button>
        )}
      </fieldset>
    </SectionCard>
  );
}
