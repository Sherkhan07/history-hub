"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, Eye, GripVertical, Link2, Loader2, RefreshCw, Trash2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { PreviewKind, ResourceType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ConfirmAction } from "@/components/common/confirm-action";
import { Field, NativeSelect, SectionCard } from "@/components/common/form-controls";
import { Icon, RESOURCE_ICONS } from "@/components/common/icon";
import { ACCEPT_ATTR, guessResourceType } from "@/features/resources/file-rules";
import { formatFileSize } from "@/lib/format";
import { fileUrl } from "@/lib/files";
import { useDict } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { addLinkResourceAction, deleteResourceAction, reorderResourcesAction, updateResourceMetaAction } from "../../editor-actions";
import { useSave } from "./use-save";

export type EditorResource = {
  id: string;
  type: ResourceType;
  title: string;
  originalName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  externalUrl: string | null;
  previewKind: PreviewKind;
  previewUrl: string | null;
  pageCount: number | null;
  language: string;
  version: number;
  hasContent: boolean;
};

const TYPES: ResourceType[] = ["PRESENTATION", "WORKSHEET", "TASK", "CARDS", "DOCUMENT", "VIDEO", "MAP", "TEACHER_GUIDE", "HOMEWORK", "ADDITIONAL"];

type Upload = { key: string; name: string; size: number; progress: number; state: "uploading" | "processing" | "done" | "error"; error?: string; type: ResourceType };

function uploadFile(t: Dictionary, lessonId: string, file: File, type: ResourceType, onProgress: (p: number) => void, replaceId?: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    if (replaceId) form.append("resourceId", replaceId);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      resolve(xhr.status < 300 ? { ok: true } : { ok: false, error: body.error ?? fmt(t.editor.httpError, { status: xhr.status }) });
    };
    xhr.onerror = () => resolve({ ok: false, error: t.editor.noConnection });
    xhr.open("POST", `/api/lessons/${lessonId}/resources`);
    xhr.send(form);
  });
}

export function UploadDropzone({ lessonId, maxMb, disabled }: { lessonId: string; maxMb: number; disabled?: boolean }) {
  const t = useDict();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);

  const patch = (key: string, p: Partial<Upload>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const start = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const key = `${file.name}-${file.size}-${Date.now()}`;
        const type = guessResourceType(file.name);
        if (file.size > maxMb * 1024 * 1024) {
          setUploads((u) => [...u, { key, name: file.name, size: file.size, progress: 0, state: "error", error: fmt(t.editor.tooBig, { mb: maxMb }), type }]);
          continue;
        }
        setUploads((u) => [...u, { key, name: file.name, size: file.size, progress: 0, state: "uploading", type }]);
        const r = await uploadFile(t, lessonId, file, type, (p) => patch(key, { progress: p, state: p >= 1 ? "processing" : "uploading" }));
        patch(key, r.ok ? { state: "done", progress: 1 } : { state: "error", error: r.error });
        if (r.ok) router.refresh();
        else toast.error(`${file.name}: ${r.error}`);
      }
    },
    [lessonId, maxMb, router, t],
  );

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled && e.dataTransfer.files.length) void start(e.dataTransfer.files); }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:opacity-50",
          drag ? "border-steppe bg-steppe-soft" : "border-border bg-muted/40 hover:border-steppe/50 hover:bg-steppe-soft/40",
        )}
      >
        <UploadCloud className="size-9 text-steppe" aria-hidden />
        <p className="font-medium">{t.editor.dropzone}</p>
        <p className="text-sm text-muted-foreground">{fmt(t.editor.dropzoneHint, { mb: maxMb })}</p>
      </button>
      <input ref={input} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { if (e.target.files) void start(e.target.files); e.target.value = ""; }} />
      {uploads.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              {u.state === "done" ? <CheckCircle2 className="size-5 text-success" /> : u.state === "error" ? <XCircle className="size-5 text-destructive" /> : <Loader2 className="size-5 animate-spin text-steppe" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(u.size)} · {t.resourceTypes[u.type]} ·{" "}
                  {u.state === "uploading" ? fmt(t.editor.uploading, { p: Math.round(u.progress * 100) }) : u.state === "processing" ? t.editor.processing : u.state === "done" ? t.editor.uploaded : u.error}
                </p>
                {(u.state === "uploading" || u.state === "processing") && <Progress value={u.progress * 100} className="mt-2 h-1.5" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResourceRow({ r, lessonId, readOnly }: { r: EditorResource; lessonId: string; readOnly?: boolean }) {
  const t = useDict();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id, disabled: readOnly });
  const [title, setTitle] = useState(r.title);
  const [type, setType] = useState(r.type);
  const { pending, run } = useSave();
  const router = useRouter();
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const dirty = title !== r.title || type !== r.type;

  const replace = async (file: File) => {
    setReplacing(0);
    const res = await uploadFile(t, lessonId, file, type, (p) => setReplacing(p), r.id);
    setReplacing(null);
    if (res.ok) {
      toast.success(t.editor.replaced);
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft", isDragging && "z-10 shadow-lift")}>
      {!readOnly && (
        <button type="button" className="grid size-9 cursor-grab place-items-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label={t.editor.drag} {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
        {r.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(r.previewUrl)!} alt="" className="size-full object-cover" />
        ) : (
          <Icon name={RESOURCE_ICONS[r.type]} className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Input aria-label={t.editor.resourceTitle} value={title} onChange={(e) => setTitle(e.target.value)} disabled={readOnly} className="h-9 min-w-48 flex-1" />
          <NativeSelect aria-label={t.editor.resourceType} value={type} onChange={(e) => setType(e.target.value as ResourceType)} disabled={readOnly} className="h-9 w-48">
            {TYPES.map((rt) => <option key={rt} value={rt}>{t.resourceTypes[rt]}</option>)}
          </NativeSelect>
        </div>
        <p className="text-xs text-muted-foreground">
          {r.originalName ?? (r.externalUrl ? r.externalUrl : r.hasContent ? t.editor.textResource : "—")}
          {r.fileSize ? ` · ${formatFileSize(r.fileSize)}` : ""}
          {r.pageCount ? ` · ${fmt(r.previewKind === "IMAGES" ? t.editor.slidesCount : t.editor.pagesCount, { n: r.pageCount })}` : ""}
          {r.fileUrl ? ` · ${fmt(t.editor.version, { n: r.version })}` : ""}
          {r.fileUrl && r.previewKind === "NONE" ? ` · ${t.editor.noPreview}` : ""}
          {replacing !== null && ` · ${fmt(t.editor.uploading, { p: Math.round(replacing * 100) })}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {dirty && !readOnly && (
          <Button size="sm" disabled={pending} onClick={() => run(() => updateResourceMetaAction(r.id, { title, type, language: r.language as "kk" | "ru" }))}>{t.common.save}</Button>
        )}
        <Button asChild variant="ghost" size="icon" aria-label={t.common.preview}>
          <Link href={`/teacher/lesson/${lessonId}/resource/${r.id}`} target="_blank"><Eye /></Link>
        </Button>
        {!readOnly && r.fileUrl && (
          <>
            <Button variant="ghost" size="icon" aria-label={t.editor.replaceFile} onClick={() => replaceInput.current?.click()} disabled={replacing !== null}><RefreshCw /></Button>
            <input ref={replaceInput} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void replace(f); e.target.value = ""; }} />
          </>
        )}
        {!readOnly && (
          <ConfirmAction
            trigger={<Button variant="ghost" size="icon" aria-label={t.common.delete}><Trash2 /></Button>}
            title={t.editor.deleteResource}
            description={fmt(t.editor.deleteResourceText, { title: r.title })}
            confirmLabel={t.common.delete}
            destructive
            action={async () => {
              const res = await deleteResourceAction(r.id);
              return res.ok ? { ok: true, message: t.editor.resourceDeleted } : res;
            }}
          />
        )}
      </div>
    </li>
  );
}

export function MaterialsManager({ lessonId, resources, maxMb, readOnly }: { lessonId: string; resources: EditorResource[]; maxMb: number; readOnly?: boolean }) {
  const t = useDict();
  const [order, setOrder] = useState(resources.map((r) => r.id));
  const ids = resources.map((r) => r.id).join();
  const [lastIds, setLastIds] = useState(ids);
  if (ids !== lastIds) {
    setLastIds(ids);
    setOrder(resources.map((r) => r.id));
  }
  const byId = new Map(resources.map((r) => [r.id, r]));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const { run } = useSave();

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    run(() => reorderResourcesAction(lessonId, next));
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <SectionCard title={t.editor.uploadTitle} description={t.editor.uploadText}>
          <UploadDropzone lessonId={lessonId} maxMb={maxMb} />
        </SectionCard>
      )}
      <SectionCard title={t.editor.materialsTitle} description={t.editor.materialsText}>
        {order.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {order.map((rid) => {
                  const r = byId.get(rid);
                  return r ? <ResourceRow key={`${r.id}-${r.version}-${r.title}-${r.type}`} r={r} lessonId={lessonId} readOnly={readOnly} /> : null;
                })}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted-foreground">{t.editor.noMaterials}</p>
        )}
      </SectionCard>
      {!readOnly && <LinkForm lessonId={lessonId} />}
    </div>
  );
}

function LinkForm({ lessonId }: { lessonId: string }) {
  const t = useDict();
  const [v, setV] = useState({ type: "VIDEO" as "VIDEO" | "MAP" | "ADDITIONAL" | "DOCUMENT", title: "", url: "" });
  const { pending, run } = useSave();
  return (
    <SectionCard title={t.editor.linkTitle} description={t.editor.linkText}>
      <form
        className="grid gap-3 sm:grid-cols-[180px_1fr_1.4fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addLinkResourceAction(lessonId, v), { onSuccess: () => setV({ ...v, title: "", url: "" }) });
        }}
      >
        <Field label={t.editor.linkType} htmlFor="link-type">
          <NativeSelect id="link-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as typeof v.type })}>
            <option value="VIDEO">{t.resourceTypes.VIDEO}</option>
            <option value="MAP">{t.resourceTypes.MAP}</option>
            <option value="DOCUMENT">{t.resourceTypes.DOCUMENT}</option>
            <option value="ADDITIONAL">{t.resourceTypes.ADDITIONAL}</option>
          </NativeSelect>
        </Field>
        <Field label={t.editor.name} htmlFor="link-title"><Input id="link-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required /></Field>
        <Field label="URL" htmlFor="link-url"><Input id="link-url" type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" required /></Field>
        <Button type="submit" disabled={pending}><Link2 /> {t.common.add}</Button>
      </form>
    </SectionCard>
  );
}
