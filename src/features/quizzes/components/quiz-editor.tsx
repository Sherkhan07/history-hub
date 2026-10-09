"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import type { QuestionType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, SectionCard } from "@/components/common/form-controls";
import { ConfirmAction } from "@/components/common/confirm-action";
import { useDict } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { countLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteQuizAction, saveQuizAction } from "@/features/lessons/editor-actions";
import { useSave } from "@/features/lessons/components/editor/use-save";

type Opt = { text: string; isCorrect: boolean; matchText?: string | null };
export type EditableQuestion = { type: QuestionType; prompt: string; explanation?: string | null; points: number; options: Opt[] };
export type EditableQuiz = { id: string | null; title: string; description: string | null; timePerQuestion: number; questions: EditableQuestion[] };

const TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "MATCHING", "ORDERING"];

function blank(type: QuestionType, t: Dictionary): EditableQuestion {
  if (type === "TRUE_FALSE") return { type, prompt: "", points: 100, options: [{ text: t.quizEditor.true, isCorrect: true }, { text: t.quizEditor.false, isCorrect: false }] };
  if (type === "MATCHING") return { type, prompt: "", points: 100, options: [{ text: "", matchText: "", isCorrect: false }, { text: "", matchText: "", isCorrect: false }] };
  return { type, prompt: "", points: 100, options: [{ text: "", isCorrect: type !== "ORDERING" }, { text: "", isCorrect: false }] };
}

function QuestionCard({ q, index, total, onChange, onMove, onRemove, onDuplicate, readOnly }: {
  q: EditableQuestion;
  index: number;
  total: number;
  onChange: (q: EditableQuestion) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  readOnly?: boolean;
}) {
  const t = useDict();
  const setOpt = (i: number, p: Partial<Opt>) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const single = q.type === "SINGLE_CHOICE" || q.type === "TRUE_FALSE";
  return (
    <div className="space-y-4 rounded-2xl border bg-background p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-steppe text-sm font-semibold text-white">{index + 1}</span>
        <NativeSelect aria-label={t.quizEditor.questionType} value={q.type} onChange={(e) => onChange({ ...blank(e.target.value as QuestionType, t), prompt: q.prompt })} className="w-52">
          {TYPES.map((qt) => <option key={qt} value={qt}>{t.questionTypes[qt]}</option>)}
        </NativeSelect>
        <Input aria-label={t.quizEditor.points} type="number" min={10} max={1000} step={10} value={q.points} onChange={(e) => onChange({ ...q, points: Number(e.target.value) })} className="w-24" />
        <span className="text-xs text-muted-foreground">{t.quizEditor.pointsUnit}</span>
        <div className="ml-auto flex">
          <Button type="button" variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t.common.up}><ArrowUp /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={t.common.down}><ArrowDown /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label={t.quizEditor.duplicate}><Copy /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={t.quizEditor.removeQuestion}><Trash2 /></Button>
        </div>
      </div>
      <Textarea aria-label={t.quizEditor.questionText} value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} rows={2} placeholder={t.quizEditor.questionText} />

      <div className="space-y-2">
        {q.type === "ORDERING" && <p className="text-xs text-muted-foreground">{t.quizEditor.orderingHint}</p>}
        {q.type === "MATCHING" && <p className="text-xs text-muted-foreground">{t.quizEditor.matchingHint}</p>}
        {q.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            {q.type !== "MATCHING" && q.type !== "ORDERING" && (
              <button
                type="button"
                onClick={() => onChange({ ...q, options: q.options.map((x, j) => ({ ...x, isCorrect: single ? j === i : j === i ? !x.isCorrect : x.isCorrect })) })}
                className={cn("grid size-9 shrink-0 place-items-center rounded-lg border text-sm font-semibold", o.isCorrect ? "border-success bg-success text-white" : "bg-card text-muted-foreground")}
                aria-pressed={o.isCorrect}
                aria-label={fmt(o.isCorrect ? t.quizEditor.optionCorrect : t.quizEditor.optionWrong, { n: i + 1 })}
              >
                {o.isCorrect ? "✓" : i + 1}
              </button>
            )}
            {q.type === "ORDERING" && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold">{i + 1}</span>}
            <Input aria-label={fmt(t.quizEditor.option, { n: i + 1 })} value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} disabled={q.type === "TRUE_FALSE"} placeholder={q.type === "MATCHING" ? t.quizEditor.leftPart : t.quizEditor.optionPlaceholder} />
            {q.type === "MATCHING" && <Input aria-label={fmt(t.quizEditor.pairFor, { n: i + 1 })} value={o.matchText ?? ""} onChange={(e) => setOpt(i, { matchText: e.target.value })} placeholder={t.quizEditor.rightPart} />}
            {q.type !== "TRUE_FALSE" && (
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...q, options: q.options.filter((_, j) => j !== i) })} disabled={q.options.length <= 2} aria-label={t.quizEditor.removeOption}><Trash2 /></Button>
            )}
          </div>
        ))}
        {q.type !== "TRUE_FALSE" && q.options.length < 8 && !readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...q, options: [...q.options, { text: "", isCorrect: false, matchText: q.type === "MATCHING" ? "" : null }] })}><Plus /> {t.quizEditor.addOption}</Button>
        )}
      </div>
      <Input aria-label={t.quizEditor.explanation} value={q.explanation ?? ""} onChange={(e) => onChange({ ...q, explanation: e.target.value })} placeholder={t.quizEditor.explanationPlaceholder} />
    </div>
  );
}

export function QuizEditor({ lessonId, quiz, readOnly }: { lessonId: string; quiz: EditableQuiz; readOnly?: boolean }) {
  const t = useDict();
  const [v, setV] = useState(quiz);
  const { pending, run } = useSave();
  const setQ = (i: number, q: EditableQuestion) => setV((x) => ({ ...x, questions: x.questions.map((y, j) => (j === i ? q : y)) }));
  const save = () =>
    run(() =>
      saveQuizAction(lessonId, v.id, {
        title: v.title,
        description: v.description,
        timePerQuestion: v.timePerQuestion,
        questions: v.questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o, matchText: o.matchText ?? null })) })),
      }),
      { onSuccess: (r) => setV((x) => ({ ...x, id: (r.data as { id: string }).id })) },
    );

  return (
    <SectionCard
      title={v.id ? v.title : t.quizEditor.newQuiz}
      description={countLabel(v.questions.length, t.quizEditor.questions)}
      actions={
        !readOnly && (
          <div className="flex gap-2">
            {v.id && (
              <ConfirmAction
                trigger={<Button variant="ghost"><Trash2 /> {t.quizEditor.deleteQuiz}</Button>}
                title={t.quizEditor.deleteQuizConfirm}
                description={t.quizEditor.deleteQuizText}
                confirmLabel={t.common.delete}
                destructive
                action={async () => {
                  const r = await deleteQuizAction(v.id!);
                  return r.ok ? { ok: true, message: t.quizEditor.quizDeleted } : r;
                }}
              />
            )}
            <Button onClick={save} disabled={pending}><Save /> {t.quizEditor.saveQuiz}</Button>
          </div>
        )
      }
    >
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label={t.quizEditor.quizTitle} htmlFor={`quiz-title-${v.id ?? "new"}`}>
            <Input id={`quiz-title-${v.id ?? "new"}`} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
          </Field>
          <Field label={t.quizEditor.secondsPerQuestion} htmlFor={`quiz-time-${v.id ?? "new"}`}>
            <Input id={`quiz-time-${v.id ?? "new"}`} type="number" min={5} max={300} value={v.timePerQuestion} onChange={(e) => setV({ ...v, timePerQuestion: Number(e.target.value) })} />
          </Field>
        </div>
        {v.questions.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            index={i}
            total={v.questions.length}
            readOnly={readOnly}
            onChange={(nq) => setQ(i, nq)}
            onRemove={() => setV((x) => ({ ...x, questions: x.questions.filter((_, j) => j !== i) }))}
            onDuplicate={() => setV((x) => ({ ...x, questions: [...x.questions.slice(0, i + 1), structuredClone(q), ...x.questions.slice(i + 1)] }))}
            onMove={(d) =>
              setV((x) => {
                const j = i + d;
                if (j < 0 || j >= x.questions.length) return x;
                const qs = [...x.questions];
                [qs[i], qs[j]] = [qs[j], qs[i]];
                return { ...x, questions: qs };
              })
            }
          />
        ))}
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {TYPES.map((qt) => (
              <Button key={qt} type="button" variant="outline" size="sm" onClick={() => setV((x) => ({ ...x, questions: [...x.questions, blank(qt, t)] }))}>
                <Plus /> {t.questionTypes[qt]}
              </Button>
            ))}
          </div>
        )}
      </fieldset>
    </SectionCard>
  );
}
