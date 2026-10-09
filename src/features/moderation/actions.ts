"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { invalidateCatalog } from "@/server/cache";
import { ActionError, runAction } from "@/server/actions/result";
import { AuthError } from "@/server/auth/guards";
import { getDictionary } from "@/i18n";
import { canTransition, reviewBlockers, TRANSITIONS, type WorkflowAction } from "./workflow";

const actionSchema = z.enum(Object.keys(TRANSITIONS) as [WorkflowAction, ...WorkflowAction[]]);

async function snapshot(lessonId: string): Promise<Prisma.InputJsonValue> {
  const l = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      objectives: { orderBy: { sortOrder: "asc" } },
      resources: { orderBy: { sortOrder: "asc" }, select: { id: true, type: true, title: true, fileUrl: true, version: true, pageCount: true, content: true } },
      quizzes: { include: { questions: { include: { options: true } } } },
      games: { include: { items: true } },
      stages: { orderBy: { sortOrder: "asc" } },
    },
  });
  return JSON.parse(JSON.stringify(l)) as Prisma.InputJsonValue;
}

async function saveVersion(lessonId: string, status: ContentStatus, userId: string, note?: string) {
  const last = await db.contentVersion.aggregate({ where: { lessonId }, _max: { version: true } });
  await db.contentVersion.create({
    data: { lessonId, version: (last._max.version ?? 0) + 1, status, snapshot: await snapshot(lessonId), note: note || null, createdById: userId },
  });
}

export async function transitionLessonAction(lessonId: string, action: WorkflowAction, comment?: string) {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("loginRequired", "UNAUTHENTICATED");
    const act = actionSchema.parse(action);
    const note = z.string().trim().max(2000).optional().parse(comment) || undefined;
    const lesson = await db.lesson.findUnique({
      where: { id: z.string().cuid().parse(lessonId) },
      select: { id: true, title: true, status: true, _count: { select: { objectives: true, resources: true, quizzes: true, games: true } } },
    });
    if (!lesson) throw new ActionError("lessonNotFound");
    if (!canTransition(user, lesson.status, act)) throw new ActionError("transitionForbidden");

    const to = TRANSITIONS[act].to;
    const now = new Date();

    if (act === "submit") {
      const blockers = reviewBlockers({ title: lesson.title, ...lesson._count });
      if (blockers.length) {
        const t = await getDictionary();
        return { ok: false as const, error: blockers.map((b) => t.workflow.blockers[b]).join(". ") };
      }
    }
    if (act === "reject" && !note) throw new ActionError("rejectReasonRequired");

    await db.lesson.update({
      where: { id: lesson.id },
      data: { status: to, updatedById: user.id, ...(to === "PUBLISHED" ? { publishedAt: now } : {}) },
    });
    await db.resource.updateMany({ where: { lessonId: lesson.id }, data: { status: to } });

    const pending = await db.moderationRequest.findFirst({ where: { lessonId: lesson.id, decision: "PENDING" }, orderBy: { submittedAt: "desc" } });
    switch (act) {
      case "submit":
        await db.moderationRequest.create({ data: { lessonId: lesson.id, submittedById: user.id, submitNote: note } });
        await saveVersion(lesson.id, to, user.id, note);
        break;
      case "approve":
      case "approvePublish":
      case "reject":
        if (pending) {
          await db.moderationRequest.update({
            where: { id: pending.id },
            data: { decision: act === "reject" ? "REJECTED" : "APPROVED", reviewerId: user.id, comment: note, reviewedAt: now },
          });
        }
        if (act === "approvePublish") await saveVersion(lesson.id, to, user.id, note);
        break;
      case "publish":
        await saveVersion(lesson.id, to, user.id, note);
        break;
      default:
        break;
    }

    await audit({ actorId: user.id, action: `lesson.${act}`, entityType: "Lesson", entityId: lesson.id, metadata: { from: lesson.status, to, comment: note ?? null } });
    if (lesson.status === "PUBLISHED" || to === "PUBLISHED") invalidateCatalog(lesson.id);
    revalidatePath(`/moderator/lessons/${lesson.id}/edit`);
    revalidatePath("/moderator");
    revalidatePath("/admin/moderation");

    const t = await getDictionary();
    return { ok: true as const, message: t.workflow.done[act] };
  });
}
