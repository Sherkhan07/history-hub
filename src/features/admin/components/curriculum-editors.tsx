"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, NativeSelect } from "@/components/common/form-controls";
import { ConfirmAction } from "@/components/common/confirm-action";
import { useSave } from "@/features/lessons/components/editor/use-save";
import {
  createCurriculumAction, deleteSectionAction, moveSectionAction, saveQuarterTitleAction, saveSectionAction, saveSettingsAction,
  saveSubjectAction, setCurriculumActiveAction, setGradeActiveAction,
} from "../curriculum-actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

type SubjectV = { name: string; nameKk: string; slug: string; description: string; descriptionKk: string; accent: "kz" | "world"; isActive: boolean };

export function SubjectForm({ id, initial }: { id: string | null; initial?: SubjectV }) {
  const t = useDict();
  const [v, setV] = useState<SubjectV>(initial ?? { name: "", nameKk: "", slug: "", description: "", descriptionKk: "", accent: "kz", isActive: true });
  const { pending, run } = useSave();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_1.2fr_1.2fr_130px_auto_auto] lg:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSubjectAction(id, v), { onSuccess: () => !id && setV({ name: "", nameKk: "", slug: "", description: "", descriptionKk: "", accent: "kz", isActive: true }) });
      }}
    >
      <Field label={t.admin.nameRu}><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label={t.admin.nameKk}><Input value={v.nameKk} onChange={(e) => setV({ ...v, nameKk: e.target.value })} /></Field>
      <Field label={t.admin.slug}><Input value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} placeholder="history-kz" required className="font-mono" /></Field>
      <Field label={`${t.admin.description} (рус)`}><Input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <Field label={`${t.admin.description} (қаз)`}><Input value={v.descriptionKk} onChange={(e) => setV({ ...v, descriptionKk: e.target.value })} /></Field>
      <Field label={t.admin.color}>
        <NativeSelect value={v.accent} onChange={(e) => setV({ ...v, accent: e.target.value as "kz" | "world" })}>
          <option value="kz">{t.admin.colorKz}</option>
          <option value="world">{t.admin.colorWorld}</option>
        </NativeSelect>
      </Field>
      <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={v.isActive} onCheckedChange={(isActive) => setV({ ...v, isActive })} /> {t.admin.active}</label>
      <Button type="submit" disabled={pending}>{id ? <Save /> : <Plus />} {id ? t.common.save : t.common.add}</Button>
    </form>
  );
}

export function GradeToggle({ id, number, isActive }: { id: string; number: number; isActive: boolean }) {
  const t = useDict();
  const { pending, run } = useSave();
  return (
    <label className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 shadow-soft">
      <span className="font-heading text-xl font-semibold">{fmt(t.common.gradeN, { n: number })}</span>
      <Switch checked={isActive} disabled={pending} onCheckedChange={(v) => run(() => setGradeActiveAction(id, v))} aria-label={fmt(t.admin.gradeActive, { n: number })} />
    </label>
  );
}

export function NewCurriculumForm({ subjects, grades, defaultYear }: { subjects: { id: string; name: string }[]; grades: { id: string; number: number }[]; defaultYear: string }) {
  const t = useDict();
  const [v, setV] = useState({ subjectId: subjects[0]?.id ?? "", gradeId: grades[0]?.id ?? "", academicYear: defaultYear, language: "kk" as "kk" | "ru" });
  const { pending, run } = useSave();
  return (
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_160px_140px_auto] lg:items-end" onSubmit={(e) => { e.preventDefault(); run(() => createCurriculumAction(v)); }}>
      <Field label={t.admin.subject}><NativeSelect value={v.subjectId} onChange={(e) => setV({ ...v, subjectId: e.target.value })}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</NativeSelect></Field>
      <Field label={t.editor.grade}><NativeSelect value={v.gradeId} onChange={(e) => setV({ ...v, gradeId: e.target.value })}>{grades.map((g) => <option key={g.id} value={g.id}>{g.number}</option>)}</NativeSelect></Field>
      <Field label={t.editor.academicYear}><Input value={v.academicYear} onChange={(e) => setV({ ...v, academicYear: e.target.value })} placeholder="2027/2028" /></Field>
      <Field label={t.admin.language}><NativeSelect value={v.language} onChange={(e) => setV({ ...v, language: e.target.value as "kk" | "ru" })}><option value="kk">Қазақша</option><option value="ru">Русский</option></NativeSelect></Field>
      <Button type="submit" disabled={pending}><Plus /> {t.admin.createProgram}</Button>
    </form>
  );
}

export function CurriculumActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useDict();
  const { pending, run } = useSave();
  return <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} disabled={pending} onCheckedChange={(v) => run(() => setCurriculumActiveAction(id, v))} /> {t.admin.activeF}</label>;
}

export function QuarterTitle({ id, title }: { id: string; title: string | null }) {
  const t = useDict();
  const [v, setV] = useState(title ?? "");
  const { pending, run } = useSave();
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={t.admin.quarterTitle} className="h-9" aria-label={t.admin.quarterTitleLabel} />
      {v !== (title ?? "") && <Button size="sm" disabled={pending} onClick={() => run(() => saveQuarterTitleAction(id, v))}><Check /></Button>}
    </div>
  );
}

export function SectionRow({ id, quarterId, title, lessons, first, last }: { id: string; quarterId: string; title: string; lessons: number; first: boolean; last: boolean }) {
  const t = useDict();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(title);
  const { pending, run } = useSave();
  return (
    <li className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
      {edit ? (
        <>
          <Input value={v} onChange={(e) => setV(e.target.value)} className="h-9 flex-1" aria-label={t.admin.sectionName} autoFocus />
          <Button size="icon" variant="ghost" disabled={pending} onClick={() => run(() => saveSectionAction(quarterId, id, v), { onSuccess: () => setEdit(false) })} aria-label={t.common.save}><Check /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setV(title); setEdit(false); }} aria-label={t.common.cancel}><X /></Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">{fmt(t.admin.lessonsShort, { n: lessons })}</span>
          <Button size="icon" variant="ghost" disabled={first || pending} onClick={() => run(() => moveSectionAction(id, -1))} aria-label={t.common.up}><ArrowUp /></Button>
          <Button size="icon" variant="ghost" disabled={last || pending} onClick={() => run(() => moveSectionAction(id, 1))} aria-label={t.common.down}><ArrowDown /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEdit(true)} aria-label={t.admin.rename}><Pencil /></Button>
          <ConfirmAction
            trigger={<Button size="icon" variant="ghost" disabled={lessons > 0} aria-label={t.admin.deleteSection}><Trash2 /></Button>}
            title={t.admin.deleteSectionConfirm}
            confirmLabel={t.common.delete}
            destructive
            action={async () => {
              const r = await deleteSectionAction(id);
              return r.ok ? { ok: true, message: t.admin.sectionDeleted } : r;
            }}
          />
        </>
      )}
    </li>
  );
}

export function NewSectionForm({ quarterId }: { quarterId: string }) {
  const t = useDict();
  const [v, setV] = useState("");
  const { pending, run } = useSave();
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveSectionAction(quarterId, null, v), { onSuccess: () => setV("") }); }}>
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={t.admin.newSectionPlaceholder} className="h-9" aria-label={t.admin.newSection} />
      <Button size="sm" type="submit" disabled={pending || v.trim().length < 2}><Plus /> {t.admin.sectionBtn}</Button>
    </form>
  );
}

export function SettingsForm({ initial }: { initial: { maxMb: number; year: string; announcement: string; time: number } }) {
  const t = useDict();
  const [v, setV] = useState(initial);
  const { pending, run } = useSave();
  return (
    <form
      className="grid max-w-2xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSettingsAction({ "uploads.maxSizeMb": v.maxMb, "platform.academicYear": v.year, "platform.announcement": v.announcement, "sessions.defaultTimePerQuestion": v.time }));
      }}
    >
      <Field label={t.admin.year} hint={t.admin.yearHint}><Input value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} /></Field>
      <Field label={t.admin.maxSize} hint={t.admin.maxSizeHint}><Input type="number" min={1} max={500} value={v.maxMb} onChange={(e) => setV({ ...v, maxMb: Number(e.target.value) })} /></Field>
      <Field label={t.admin.defaultSeconds}><Input type="number" min={5} max={300} value={v.time} onChange={(e) => setV({ ...v, time: Number(e.target.value) })} /></Field>
      <Field label={t.admin.announcement} hint={t.admin.announcementHint}><Input value={v.announcement} onChange={(e) => setV({ ...v, announcement: e.target.value })} maxLength={500} /></Field>
      <div><Button type="submit" disabled={pending}><Save /> {t.admin.saveSettings}</Button></div>
    </form>
  );
}
