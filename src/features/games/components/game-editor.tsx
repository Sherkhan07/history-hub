"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GameType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, SectionCard } from "@/components/common/form-controls";
import { ConfirmAction } from "@/components/common/confirm-action";
import { imageSrc } from "@/lib/files";
import { useDict } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { gameLabels, getDefinition } from "../definitions";
import { KzMap } from "./primitives";
import { deleteGameAction, saveGameAction } from "@/features/lessons/editor-actions";
import { useSave } from "@/features/lessons/components/editor/use-save";

/* eslint-disable @typescript-eslint/no-explicit-any -- item shapes are validated by the registry zod schemas on save */
type Data = any;
type ItemEditorProps = { value: Data; onChange: (v: Data) => void; t: Dictionary };

function newId(prefix: string, list: { id: string }[]) {
  let n = list.length + 1;
  while (list.some((x) => x.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

function StringList({ label, values, onChange, multiline, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; multiline?: boolean; placeholder?: string }) {
  const t = useDict();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          {multiline ? (
            <Textarea aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} rows={2} placeholder={placeholder} />
          ) : (
            <Input aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} placeholder={placeholder} />
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(values.filter((_, j) => j !== i))} disabled={values.length <= 1} aria-label={t.gameEditor.remove}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...values, ""])}><Plus /> {t.gameEditor.add}</Button>
    </div>
  );
}

function ChoiceOptions({ options, correctIndex, onChange }: { options: string[]; correctIndex: number; onChange: (options: string[], correctIndex: number) => void }) {
  const t = useDict();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t.gameEditor.options}</p>
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(options, i)} aria-pressed={i === correctIndex} aria-label={fmt(t.gameEditor.optionCorrect, { n: i + 1 })} className={cn("grid size-9 shrink-0 place-items-center rounded-lg border text-sm font-semibold", i === correctIndex ? "border-success bg-success text-white" : "bg-card text-muted-foreground")}>
            {i === correctIndex ? "✓" : i + 1}
          </button>
          <Input aria-label={fmt(t.gameEditor.option, { n: i + 1 })} value={o} onChange={(e) => onChange(options.map((x, j) => (j === i ? e.target.value : x)), correctIndex)} />
          <Button type="button" variant="ghost" size="icon" disabled={options.length <= 2} onClick={() => onChange(options.filter((_, j) => j !== i), correctIndex === i ? 0 : correctIndex > i ? correctIndex - 1 : correctIndex)} aria-label={t.gameEditor.removeOption}><Trash2 /></Button>
        </div>
      ))}
      {options.length < 6 && <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...options, ""], correctIndex)}><Plus /> {t.gameEditor.addOption}</Button>}
    </div>
  );
}

function ImageField({ value, onChange, label }: { value?: string; onChange: (key: string | undefined) => void; label?: string }) {
  const t = useDict();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/uploads/image", { method: "POST", body: form });
      const body = await r.json();
      if (!r.ok) toast.error(body.error ?? t.gameEditor.uploadFailed);
      else onChange(body.key);
    } finally {
      setBusy(false);
    }
  };
  const src = imageSrc(value);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label ?? t.gameEditor.image}</p>
      <div className="flex items-center gap-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-24 w-36 rounded-lg bg-muted object-contain" />
        ) : (
          <div className="grid h-24 w-36 place-items-center rounded-lg border border-dashed text-muted-foreground"><ImagePlus /></div>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {t.gameEditor.upload}</Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>{t.common.remove}</Button>}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      </div>
    </div>
  );
}

const EDITORS: Record<GameType, React.ComponentType<ItemEditorProps>> = {
  TIMELINE: ({ value, onChange, t }) => (
    <div className="space-y-3">
      <Field label={t.gameEditor.task}><Input value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} /></Field>
      <p className="text-sm font-medium">{t.gameEditor.eventsHint}</p>
      {value.events.map((ev: Data, i: number) => (
        <div key={ev.id} className="grid gap-2 sm:grid-cols-[1fr_120px_160px_auto]">
          <Input aria-label={t.gameEditor.event} value={ev.text} onChange={(e) => onChange({ ...value, events: value.events.map((x: Data, j: number) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder={t.gameEditor.event} />
          <Input aria-label={t.gameEditor.year} type="number" value={ev.year} onChange={(e) => onChange({ ...value, events: value.events.map((x: Data, j: number) => (j === i ? { ...x, year: Number(e.target.value) } : x)) })} />
          <Input aria-label={t.gameEditor.dateLabel} value={ev.label ?? ""} onChange={(e) => onChange({ ...value, events: value.events.map((x: Data, j: number) => (j === i ? { ...x, label: e.target.value || undefined } : x)) })} placeholder="б.з.б. 2 мыңжылдық" />
          <Button type="button" variant="ghost" size="icon" disabled={value.events.length <= 2} onClick={() => onChange({ ...value, events: value.events.filter((_: Data, j: number) => j !== i) })} aria-label={t.gameEditor.removeEvent}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, events: [...value.events, { id: newId("e", value.events), text: "", year: 0 }] })}><Plus /> {t.gameEditor.event}</Button>
    </div>
  ),
  MAP_POINT: ({ value, onChange, t }) => (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <Field label={t.gameEditor.task}><Input value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} placeholder={t.gameEditor.mapPrompt} /></Field>
        <Field label={t.gameEditor.placeName}><Input value={value.placeName} onChange={(e) => onChange({ ...value, placeName: e.target.value })} /></Field>
        <Field label={t.gameEditor.tolerance} hint={t.gameEditor.toleranceHint}>
          <Input type="number" min={25} max={800} value={value.radiusKm} onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })} />
        </Field>
        <p className="text-xs text-muted-foreground">{fmt(t.gameEditor.coords, { lat: Number(value.lat).toFixed(2), lon: Number(value.lon).toFixed(2) })}</p>
      </div>
      <KzMap value={null} onChange={(p) => onChange({ ...value, lat: +p.lat.toFixed(3), lon: +p.lon.toFixed(3) })} target={{ lat: value.lat, lon: value.lon, radiusKm: value.radiusKm, label: value.placeName || "?" }} />
    </div>
  ),
  MATCHING: ({ value, onChange, t }) => (
    <div className="space-y-3">
      <Field label={t.gameEditor.task}><Input value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} /></Field>
      {value.pairs.map((p: Data, i: number) => (
        <div key={p.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input aria-label={t.gameEditor.left} value={p.left} onChange={(e) => onChange({ ...value, pairs: value.pairs.map((x: Data, j: number) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Ботай" />
          <Input aria-label={t.gameEditor.right} value={p.right} onChange={(e) => onChange({ ...value, pairs: value.pairs.map((x: Data, j: number) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="Солтүстік Қазақстан" />
          <Button type="button" variant="ghost" size="icon" disabled={value.pairs.length <= 2} onClick={() => onChange({ ...value, pairs: value.pairs.filter((_: Data, j: number) => j !== i) })} aria-label={t.gameEditor.removePair}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, pairs: [...value.pairs, { id: newId("p", value.pairs), left: "", right: "" }] })}><Plus /> {t.gameEditor.pair}</Button>
    </div>
  ),
  WHO_AM_I: ({ value, onChange, t }) => (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <StringList label={t.gameEditor.clues} values={value.clues} onChange={(clues) => onChange({ ...value, clues })} multiline />
        <ImageField value={value.imageUrl} onChange={(imageUrl) => onChange({ ...value, imageUrl })} label={t.gameEditor.portrait} />
      </div>
      <div className="space-y-4">
        <ChoiceOptions options={value.options} correctIndex={value.correctIndex} onChange={(options, correctIndex) => onChange({ ...value, options, correctIndex })} />
        <Field label={t.gameEditor.explanation}><Input value={value.explanation ?? ""} onChange={(e) => onChange({ ...value, explanation: e.target.value || undefined })} /></Field>
      </div>
    </div>
  ),
  TRUE_FALSE: ({ value, onChange, t }) => (
    <div className="space-y-3">
      <Field label={t.gameEditor.statement}><Textarea value={value.statement} onChange={(e) => onChange({ ...value, statement: e.target.value })} rows={2} /></Field>
      <label className="flex items-center gap-3 text-sm"><Switch checked={value.isTrue} onCheckedChange={(isTrue) => onChange({ ...value, isTrue })} /> {t.gameEditor.statementTrue}</label>
      <Field label={t.gameEditor.explanation}><Input value={value.explanation ?? ""} onChange={(e) => onChange({ ...value, explanation: e.target.value || undefined })} /></Field>
    </div>
  ),
  HISTORICAL_DETECTIVE: ({ value, onChange, t }) => (
    <div className="space-y-4">
      <Field label={t.gameEditor.caseText}><Textarea value={value.caseText} onChange={(e) => onChange({ ...value, caseText: e.target.value })} rows={2} /></Field>
      <p className="text-sm font-medium">{t.gameEditor.sources}</p>
      {value.sources.map((s: Data, i: number) => (
        <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[200px_1fr_auto]">
          <Input aria-label={t.gameEditor.sourceTitle} value={s.title} onChange={(e) => onChange({ ...value, sources: value.sources.map((x: Data, j: number) => (j === i ? { ...x, title: e.target.value } : x)) })} />
          <Textarea aria-label={t.gameEditor.sourceText} value={s.text} onChange={(e) => onChange({ ...value, sources: value.sources.map((x: Data, j: number) => (j === i ? { ...x, text: e.target.value } : x)) })} rows={2} />
          <Button type="button" variant="ghost" size="icon" disabled={value.sources.length <= 1} onClick={() => onChange({ ...value, sources: value.sources.filter((_: Data, j: number) => j !== i) })} aria-label={t.gameEditor.removeSource}><Trash2 /></Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, sources: [...value.sources, { title: fmt(t.gameEditor.sourceN, { n: value.sources.length + 1 }), text: "" }] })}><Plus /> {t.common.add}</Button>
      <Field label={t.gameEditor.question}><Input value={value.question} onChange={(e) => onChange({ ...value, question: e.target.value })} /></Field>
      <ChoiceOptions options={value.options} correctIndex={value.correctIndex} onChange={(options, correctIndex) => onChange({ ...value, options, correctIndex })} />
      <Field label={t.gameEditor.explanation}><Input value={value.explanation ?? ""} onChange={(e) => onChange({ ...value, explanation: e.target.value || undefined })} /></Field>
    </div>
  ),
  ARTIFACT: ({ value, onChange, t }) => (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <ImageField value={value.imageUrl || undefined} onChange={(imageUrl) => onChange({ ...value, imageUrl: imageUrl ?? "" })} label={t.gameEditor.photo} />
        <Field label={t.gameEditor.caption}><Input value={value.caption ?? ""} onChange={(e) => onChange({ ...value, caption: e.target.value || undefined })} /></Field>
      </div>
      <div className="space-y-4">
        {value.questions.map((q: Data, i: number) => (
          <div key={i} className="space-y-2 rounded-xl border p-3">
            <div className="flex gap-2">
              <Input aria-label={t.gameEditor.whatToIdentify} value={q.label} onChange={(e) => onChange({ ...value, questions: value.questions.map((x: Data, j: number) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder={t.gameEditor.identifyPlaceholder} />
              <Button type="button" variant="ghost" size="icon" disabled={value.questions.length <= 1} onClick={() => onChange({ ...value, questions: value.questions.filter((_: Data, j: number) => j !== i) })} aria-label={t.gameEditor.removeQuestion}><Trash2 /></Button>
            </div>
            <ChoiceOptions options={q.options} correctIndex={q.correctIndex} onChange={(options, correctIndex) => onChange({ ...value, questions: value.questions.map((x: Data, j: number) => (j === i ? { ...x, options, correctIndex } : x)) })} />
          </div>
        ))}
        {value.questions.length < 4 && <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, questions: [...value.questions, { label: "", options: ["", ""], correctIndex: 0 }] })}><Plus /> {t.gameEditor.question}</Button>}
      </div>
    </div>
  ),
  TEAM_BATTLE: ({ value, onChange, t }) => (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <Field label={t.gameEditor.question}><Textarea value={value.prompt} onChange={(e) => onChange({ ...value, prompt: e.target.value })} rows={2} /></Field>
        <ImageField value={value.imageUrl} onChange={(imageUrl) => onChange({ ...value, imageUrl })} label={t.gameEditor.imageOptional} />
      </div>
      <ChoiceOptions options={value.options} correctIndex={value.correctIndex} onChange={(options, correctIndex) => onChange({ ...value, options, correctIndex })} />
    </div>
  ),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export type EditableGame = { id: string; type: GameType; title: string; instructions: string | null; items: { points: number; data: unknown }[] };

export function GameEditor({ game, readOnly }: { game: EditableGame; readOnly?: boolean }) {
  const t = useDict();
  const def = getDefinition(game.type);
  const ItemEditor = EDITORS[game.type];
  const [v, setV] = useState(game);
  const { pending, run } = useSave();
  const setItem = (i: number, data: unknown) => setV((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, data } : it)) }));

  return (
    <SectionCard
      title={v.title}
      description={fmt(t.gameEditor.meta, { type: t.gameTypes[game.type], n: v.items.length, s: def.seconds })}
      actions={
        !readOnly && (
          <div className="flex gap-2">
            <ConfirmAction
              trigger={<Button variant="ghost"><Trash2 /> {t.common.delete}</Button>}
              title={t.gameEditor.deleteGame}
              confirmLabel={t.common.delete}
              destructive
              action={async () => {
                const r = await deleteGameAction(game.id);
                return r.ok ? { ok: true, message: t.gameEditor.gameDeleted } : r;
              }}
            />
            <Button disabled={pending} onClick={() => run(() => saveGameAction(game.id, { title: v.title, instructions: v.instructions, items: v.items }))}><Save /> {t.gameEditor.saveGame}</Button>
          </div>
        )
      }
    >
      <fieldset disabled={readOnly} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.gameEditor.name}><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
          <Field label={t.gameEditor.studentInstructions}><Input value={v.instructions ?? ""} onChange={(e) => setV({ ...v, instructions: e.target.value })} /></Field>
        </div>
        {v.items.map((item, i) => (
          <div key={i} className="space-y-3 rounded-2xl border bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-clay text-xs font-semibold text-white">{i + 1}</span>
              <span className="text-sm text-muted-foreground">{t.gameEditor.task}</span>
              <Input aria-label={t.gameEditor.points} type="number" min={10} max={1000} step={10} value={item.points} onChange={(e) => setV((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, points: Number(e.target.value) } : it)) }))} className="ml-auto h-8 w-24" />
              <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => setV((x) => { const it = [...x.items]; [it[i - 1], it[i]] = [it[i], it[i - 1]]; return { ...x, items: it }; })} aria-label={t.common.up}><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon" disabled={i === v.items.length - 1} onClick={() => setV((x) => { const it = [...x.items]; [it[i + 1], it[i]] = [it[i], it[i + 1]]; return { ...x, items: it }; })} aria-label={t.common.down}><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon" disabled={v.items.length <= 1} onClick={() => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} aria-label={t.gameEditor.removeTask}><Trash2 /></Button>
            </div>
            <ItemEditor value={item.data} onChange={(d) => setItem(i, d)} t={t} />
          </div>
        ))}
        {!readOnly && <Button type="button" variant="outline" onClick={() => setV((x) => ({ ...x, items: [...x.items, { points: 100, data: def.empty(gameLabels(t)) }] }))}><Plus /> {t.gameEditor.addTask}</Button>}
      </fieldset>
    </SectionCard>
  );
}
