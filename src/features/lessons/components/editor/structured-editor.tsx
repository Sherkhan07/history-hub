"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, SectionCard } from "@/components/common/form-controls";
import type { CardsContent, TaskContent } from "@/features/resources/content";
import { saveStructuredResourceAction } from "../../editor-actions";
import { useSave } from "./use-save";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

type Task = TaskContent["tasks"][number];
type Card = CardsContent["cards"][number];

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function TasksEditor({ lessonId, resourceId, title: initialTitle, tasks: initial, readOnly }: { lessonId: string; resourceId: string | null; title: string; tasks: Task[]; readOnly?: boolean }) {
  const t = useDict();
  const [title, setTitle] = useState(initialTitle);
  const [tasks, setTasks] = useState<Task[]>(initial);
  const { pending, run } = useSave();
  const patch = (i: number, p: Partial<Task>) => setTasks((t) => t.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <SectionCard
      title={t.editor.tasksTitle}
      description={t.editor.tasksText}
      actions={!readOnly && <Button disabled={pending} onClick={() => run(() => saveStructuredResourceAction(lessonId, resourceId, { type: "TASK", title, content: { tasks } }))}><Save /> {t.common.save}</Button>}
    >
      <fieldset disabled={readOnly} className="space-y-4">
        <Field label={t.editor.setTitle} htmlFor="tasks-title"><Input id="tasks-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        {tasks.map((task, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-steppe text-xs font-semibold text-white">{i + 1}</span>
              <Input aria-label={t.editor.taskName} value={task.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="1-тапсырма: …" className="flex-1" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setTasks((l) => move(l, i, -1))} aria-label={t.common.up}><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setTasks((l) => move(l, i, 1))} aria-label={t.common.down}><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setTasks((l) => l.filter((_, j) => j !== i))} aria-label={t.editor.removeTask}><Trash2 /></Button>
            </div>
            <Textarea aria-label={t.editor.instructions} value={task.instructions} onChange={(e) => patch(i, { instructions: e.target.value })} rows={3} placeholder={t.editor.instructionsPlaceholder} />
            <div className="grid gap-3 sm:grid-cols-[180px_120px_120px_1fr]">
              <NativeSelect aria-label={t.editor.workMode} value={task.mode} onChange={(e) => patch(i, { mode: e.target.value as Task["mode"] })}>
                <option value="individual">{t.viewer.individual}</option>
                <option value="pair">{t.viewer.pair}</option>
                <option value="group">{t.viewer.group}</option>
              </NativeSelect>
              <Input aria-label={t.editor.minutes} type="number" min={1} max={45} value={task.minutes ?? ""} onChange={(e) => patch(i, { minutes: e.target.value ? Number(e.target.value) : undefined })} placeholder={t.common.minutes} />
              <Input aria-label={t.editor.slide} type="number" min={1} value={task.slide ?? ""} onChange={(e) => patch(i, { slide: e.target.value ? Number(e.target.value) : undefined })} placeholder={t.editor.slideShort} />
              <Input aria-label={t.editor.answer} value={task.answer ?? ""} onChange={(e) => patch(i, { answer: e.target.value || undefined })} placeholder={t.editor.answerPlaceholder} />
            </div>
          </div>
        ))}
        {!readOnly && <Button type="button" variant="outline" onClick={() => setTasks((t) => [...t, { title: "", instructions: "", mode: "individual" }])}><Plus /> {t.editor.addTask}</Button>}
      </fieldset>
    </SectionCard>
  );
}

export function CardsEditor({ lessonId, resourceId, title: initialTitle, cards: initial, readOnly }: { lessonId: string; resourceId: string | null; title: string; cards: Card[]; readOnly?: boolean }) {
  const t = useDict();
  const [title, setTitle] = useState(initialTitle);
  const [cards, setCards] = useState<Card[]>(initial);
  const { pending, run } = useSave();
  return (
    <SectionCard
      title={t.editor.cardsTitle}
      description={t.editor.cardsText}
      actions={!readOnly && <Button disabled={pending} onClick={() => run(() => saveStructuredResourceAction(lessonId, resourceId, { type: "CARDS", title, content: { cards } }))}><Save /> {t.common.save}</Button>}
    >
      <fieldset disabled={readOnly} className="space-y-3">
        <Field label={t.editor.heading} htmlFor="cards-title"><Input id="cards-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        {cards.map((c, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <Input aria-label={fmt(t.editor.cardTerm, { n: i + 1 })} value={c.front} onChange={(e) => setCards((l) => l.map((x, j) => (j === i ? { ...x, front: e.target.value } : x)))} placeholder={t.editor.term} />
            <Input aria-label={fmt(t.editor.cardDef, { n: i + 1 })} value={c.back} onChange={(e) => setCards((l) => l.map((x, j) => (j === i ? { ...x, back: e.target.value } : x)))} placeholder={t.editor.definition} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setCards((l) => l.filter((_, j) => j !== i))} aria-label={t.editor.removeCard}><Trash2 /></Button>
          </div>
        ))}
        {!readOnly && <Button type="button" variant="outline" onClick={() => setCards((l) => [...l, { front: "", back: "" }])}><Plus /> {t.editor.addCard}</Button>}
      </fieldset>
    </SectionCard>
  );
}

export function HomeworkEditor({ lessonId, resourceId, text: initial, readOnly }: { lessonId: string; resourceId: string | null; text: string; readOnly?: boolean }) {
  const t = useDict();
  const [text, setText] = useState(initial);
  const { pending, run } = useSave();
  return (
    <SectionCard
      title={t.editor.homeworkTitle}
      actions={!readOnly && <Button disabled={pending || !text.trim()} onClick={() => run(() => saveStructuredResourceAction(lessonId, resourceId, { type: "HOMEWORK", title: t.resourceTypes.HOMEWORK, content: { text } }))}><Save /> {t.common.save}</Button>}
    >
      <Textarea aria-label={t.editor.homeworkText} value={text} onChange={(e) => setText(e.target.value)} rows={4} disabled={readOnly} placeholder={t.editor.homeworkPlaceholder} />
    </SectionCard>
  );
}
