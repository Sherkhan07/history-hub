"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/server/auth/guards";
import { canViewLesson } from "@/server/auth/permissions";
import { runAction, ActionError } from "@/server/actions/result";

export async function toggleFavoriteAction(lessonId: string) {
  return runAction(async () => {
    const user = await authorize("catalog.view");
    const id = z.string().cuid().parse(lessonId);
    const lesson = await db.lesson.findUnique({ where: { id }, select: { status: true } });
    if (!lesson || !canViewLesson(user, lesson.status)) throw new ActionError("lessonNotFound");
    const key = { userId_lessonId: { userId: user.id, lessonId: id } };
    const existing = await db.favorite.findUnique({ where: key });
    if (existing) await db.favorite.delete({ where: key });
    else await db.favorite.create({ data: { userId: user.id, lessonId: id } });
    revalidatePath("/teacher/favorites");
    revalidatePath("/teacher");
    return { favorite: !existing };
  });
}
