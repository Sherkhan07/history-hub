import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth/session";
import { getDictionary } from "@/i18n";
import { translateMsg } from "@/i18n/msg";
import { canEditLesson, can } from "@/server/auth/permissions";
import { audit } from "@/server/audit";
import { invalidateCatalog } from "@/server/cache";
import { assertSameOrigin, json } from "@/server/http";
import { getSettings } from "@/server/settings";
import { storage } from "@/server/storage";
import { guessResourceType } from "@/features/resources/file-rules";
import { processUpload, resourcePrefix, UploadValidationError } from "@/features/resources/server/process";

export const maxDuration = 300;

const typeSchema = z.enum(["PRESENTATION", "WORKSHEET", "TASK", "CARDS", "DOCUMENT", "VIDEO", "MAP", "TEACHER_GUIDE", "HOMEWORK", "ADDITIONAL"]);

/**
 * Multipart upload of a lesson material. Fields: file, type? (ResourceType), resourceId? (replace file → new version).
 * Validates extension + magic bytes + size, stores the original untouched and builds previews.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/lessons/[id]/resources">) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const t = await getDictionary();
  const user = await getCurrentUser();
  if (!user || !can(user, "lessons.edit")) return json({ error: t.msg.forbidden }, 403);
  const { id } = await ctx.params;
  const lesson = await db.lesson.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!lesson) return json({ error: t.msg.lessonNotFound }, 404);
  if (!canEditLesson(user, lesson.status)) return json({ error: t.msg.lessonLocked }, 409);

  const settings = await getSettings();
  const maxBytes = settings["uploads.maxSizeMb"] * 1024 * 1024;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 1024 * 1024) return json({ error: translateMsg(t, "fileTooBig", { mb: settings["uploads.maxSizeMb"] }) }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: t.msg.fileUnreadable }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: t.msg.fileMissing }, 400);
  const type = typeSchema.safeParse(form.get("type")).data ?? guessResourceType(file.name);
  const replaceId = typeof form.get("resourceId") === "string" ? String(form.get("resourceId")) : null;
  const data = Buffer.from(await file.arrayBuffer());

  const existing = replaceId ? await db.resource.findFirst({ where: { id: replaceId, lessonId: lesson.id } }) : null;
  if (replaceId && !existing) return json({ error: t.msg.resourceNotFound }, 404);

  const max = await db.resource.aggregate({ where: { lessonId: lesson.id }, _max: { sortOrder: true } });
  const resource =
    existing ??
    (await db.resource.create({
      data: {
        lessonId: lesson.id,
        type,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 250) || t.msg.materialDefault,
        createdById: user.id,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        status: "DRAFT",
      },
    }));
  const version = existing ? existing.version + 1 : 1;

  try {
    const processed = await processUpload({ lessonId: lesson.id, resourceId: resource.id, version, name: file.name, data, maxBytes });
    const updated = await db.resource.update({ where: { id: resource.id }, data: { ...processed, version } });
    if (existing) await storage().deletePrefix(resourcePrefix(lesson.id, resource.id, existing.version) + "/");
    await db.lesson.update({ where: { id: lesson.id }, data: { updatedById: user.id, ...(type === "PRESENTATION" && processed.previewUrl ? { coverUrl: processed.previewUrl } : {}) } });
    await audit({
      actorId: user.id,
      action: existing ? "resource.replace" : "resource.upload",
      entityType: "Resource",
      entityId: resource.id,
      metadata: { lessonId: lesson.id, file: file.name, size: data.byteLength, version },
    });
    if (lesson.status === "PUBLISHED") invalidateCatalog(lesson.id);
    return json({ ok: true, resource: { id: updated.id, title: updated.title, type: updated.type, pageCount: updated.pageCount, previewKind: updated.previewKind } });
  } catch (e) {
    if (!existing) {
      await db.resource.delete({ where: { id: resource.id } }).catch(() => undefined);
      await storage().deletePrefix(`lessons/${lesson.id}/${resource.id}/`).catch(() => undefined);
    }
    if (e instanceof UploadValidationError) return json({ error: translateMsg(t, e.key, e.vars) }, 400);
    console.error("upload failed", e);
    return json({ error: t.msg.fileProcessFailed }, 500);
  }
}
