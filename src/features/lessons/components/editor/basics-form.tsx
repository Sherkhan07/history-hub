"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, SectionCard } from "@/components/common/form-controls";
import { romanQuarter } from "@/lib/format";
import type { CurriculumTree } from "@/features/curriculum/server/queries";
import { createLessonAction, updateBasicsAction, type BasicsInput } from "../../editor-actions";
import { useSave } from "./use-save";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

export type BasicsValue = {
  sectionId: string;
  lessonNumber: number;
  title: string;
  researchQuestion: string;
  description: string;
  durationMinutes: number;
  keywords: string;
  language: "kk" | "ru";
};

function locate(tree: CurriculumTree, sectionId: string) {
  for (const s of tree) for (const c of s.curricula) for (const q of c.quarters) if (q.sections.some((x) => x.id === sectionId)) return { subjectId: s.id, curriculumId: c.id, gradeNumber: c.grade.number, quarterId: q.id };
  return null;
}

export function BasicsForm({ tree, initial, lessonId, readOnly }: { tree: CurriculumTree; initial?: BasicsValue; lessonId?: string; readOnly?: boolean }) {
  const t = useDict();
  const router = useRouter();
  const { pending, run } = useSave();
  const loc = initial ? locate(tree, initial.sectionId) : null;
  const [subjectId, setSubjectId] = useState(loc?.subjectId ?? tree[0]?.id ?? "");
  const subject = tree.find((s) => s.id === subjectId);
  const grades = useMemo(() => [...new Set(subject?.curricula.map((c) => c.grade.number) ?? [])].sort((a, b) => a - b), [subject]);
  const [grade, setGrade] = useState<number>(loc?.gradeNumber ?? grades[0] ?? 5);
  const curricula = subject?.curricula.filter((c) => c.grade.number === grade) ?? [];
  const [curriculumId, setCurriculumId] = useState(loc?.curriculumId ?? curricula[0]?.id ?? "");
  const curriculum = curricula.find((c) => c.id === curriculumId) ?? curricula[0];
  const [quarterId, setQuarterId] = useState(loc?.quarterId ?? curriculum?.quarters[0]?.id ?? "");
  const quarter = curriculum?.quarters.find((q) => q.id === quarterId) ?? curriculum?.quarters[0];
  const [v, setV] = useState<BasicsValue>(
    initial ?? { sectionId: quarter?.sections[0]?.id ?? "", lessonNumber: 1, title: "", researchQuestion: "", description: "", durationMinutes: 45, keywords: "", language: "kk" },
  );
  const sectionId = quarter?.sections.some((s) => s.id === v.sectionId) ? v.sectionId : (quarter?.sections[0]?.id ?? "");
  const set = <K extends keyof BasicsValue>(k: K, val: BasicsValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: BasicsInput = { ...v, sectionId };
    if (lessonId) run(() => updateBasicsAction(lessonId, payload));
    else run(() => createLessonAction(payload), { success: t.editor.created, onSuccess: (r) => router.push(`/moderator/lessons/${(r.data as { id: string }).id}/edit?tab=materials`) });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionCard title={t.editor.placement} description={t.editor.placementText}>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={t.editor.subject} htmlFor="subject">
            <NativeSelect id="subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setCurriculumId(""); setQuarterId(""); }}>
              {tree.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t.editor.grade} htmlFor="grade">
            <NativeSelect id="grade" value={grade} onChange={(e) => { setGrade(Number(e.target.value)); setCurriculumId(""); setQuarterId(""); }}>
              {grades.map((g) => <option key={g} value={g}>{fmt(t.common.gradeN, { n: g })}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t.editor.academicYear} htmlFor="year">
            <NativeSelect id="year" value={curriculum?.id ?? ""} onChange={(e) => { setCurriculumId(e.target.value); setQuarterId(""); }}>
              {curricula.map((c) => <option key={c.id} value={c.id}>{c.academicYear} · {c.language === "kk" ? t.editor.kkShort : t.editor.ruShort}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t.editor.quarter} htmlFor="quarter">
            <NativeSelect id="quarter" value={quarter?.id ?? ""} onChange={(e) => setQuarterId(e.target.value)}>
              {curriculum?.quarters.map((q) => <option key={q.id} value={q.id}>{fmt(t.common.quarterN, { q: romanQuarter(q.number) })}</option>)}
            </NativeSelect>
          </Field>
          <Field label={t.editor.section} htmlFor="section" error={!quarter?.sections.length ? t.editor.noSections : undefined}>
            <NativeSelect id="section" value={sectionId} onChange={(e) => set("sectionId", e.target.value)} disabled={!quarter?.sections.length}>
              {quarter?.sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </NativeSelect>
          </Field>
        </fieldset>
      </SectionCard>

      <SectionCard title={t.editor.lesson}>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Field label={t.editor.lessonNumber} htmlFor="num">
            <Input id="num" type="number" min={1} value={v.lessonNumber} onChange={(e) => set("lessonNumber", Number(e.target.value))} required />
          </Field>
          <Field label={t.editor.name} htmlFor="title">
            <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} required minLength={3} maxLength={250} placeholder="Ботай мәдениеті" />
          </Field>
          <Field label={t.editor.researchQuestion} htmlFor="rq" className="sm:col-span-2">
            <Input id="rq" value={v.researchQuestion} onChange={(e) => set("researchQuestion", e.target.value)} maxLength={500} placeholder="Жылқы адамзат тарихын қалай өзгертті?" />
          </Field>
          <Field label={t.editor.description} htmlFor="desc" className="sm:col-span-2">
            <Textarea id="desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={2000} />
          </Field>
          <Field label={t.editor.duration} htmlFor="dur">
            <Input id="dur" type="number" min={10} max={180} value={v.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label={t.editor.keywords} htmlFor="kw" hint={t.editor.keywordsHint}>
              <Input id="kw" value={v.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="Ботай, энеолит, жылқы, лошадь" />
            </Field>
            <Field label={t.editor.contentLanguage} htmlFor="lang">
              <NativeSelect id="lang" value={v.language} onChange={(e) => set("language", e.target.value as "kk" | "ru")}>
                <option value="kk">Қазақша</option>
                <option value="ru">Русский</option>
              </NativeSelect>
            </Field>
          </div>
        </fieldset>
      </SectionCard>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={pending || !sectionId}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} {lessonId ? t.common.save : t.editor.createLesson}
          </Button>
        </div>
      )}
    </form>
  );
}
