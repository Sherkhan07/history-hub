"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/form-controls";
import { saveObjectivesAction } from "../../editor-actions";
import { useSave } from "./use-save";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n/format";

export function ObjectivesEditor({ lessonId, initial, readOnly }: { lessonId: string; initial: { code: string; text: string }[]; readOnly?: boolean }) {
  const t = useDict();
  const [list, setList] = useState(initial.length ? initial : [{ code: "", text: "" }]);
  const { pending, run } = useSave();
  const update = (i: number, k: "code" | "text", v: string) => setList((l) => l.map((o, j) => (j === i ? { ...o, [k]: v } : o)));
  return (
    <SectionCard title={t.editor.objectivesTitle} description={t.editor.objectivesText}>
      <fieldset disabled={readOnly} className="space-y-3">
        {list.map((o, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
            <Input aria-label={fmt(t.editor.objectiveCode, { n: i + 1 })} value={o.code} onChange={(e) => update(i, "code", e.target.value)} placeholder="5.2.2.1" className="font-mono" />
            <Input aria-label={fmt(t.editor.objectiveText, { n: i + 1 })} value={o.text} onChange={(e) => update(i, "text", e.target.value)} placeholder={t.editor.objectivePlaceholder} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label={t.editor.removeObjective}><Trash2 /></Button>
          </div>
        ))}
        {!readOnly && (
          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => setList((l) => [...l, { code: "", text: "" }])}><Plus /> {t.editor.addObjective}</Button>
            <Button type="button" disabled={pending} onClick={() => run(() => saveObjectivesAction(lessonId, list.filter((o) => o.text.trim())))}><Save /> {t.common.save}</Button>
          </div>
        )}
      </fieldset>
    </SectionCard>
  );
}
