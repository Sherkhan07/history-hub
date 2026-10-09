"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/server/auth/guards";
import { canViewLesson } from "@/server/auth/permissions";
import { audit } from "@/server/audit";
import { ActionError, runAction } from "@/server/actions/result";
import type { MsgKey } from "@/i18n/msg";
import { getDefinition } from "@/features/games/definitions";
import { advanceSession, generatePin, SessionError } from "./server/engine";

const createSchema = z.object({
  lessonId: z.string().cuid(),
  quizId: z.string().cuid().optional(),
  gameId: z.string().cuid().optional(),
  teamMode: z.boolean().default(false),
  returnTo: z.string().max(300).regex(/^\/teacher\//).optional(),
});

/** Teacher launches a quiz or game for the class → host screen with PIN + QR. */
export async function createLiveSessionAction(input: z.input<typeof createSchema>) {
  const result = await runAction(async () => {
    const user = await authorize("sessions.host");
    const data = createSchema.parse(input);
    const lesson = await db.lesson.findUnique({ where: { id: data.lessonId }, select: { status: true } });
    if (!lesson || !canViewLesson(user, lesson.status)) throw new ActionError("lessonNotFound");

    let teamMode = data.teamMode;
    if (data.gameId) {
      const game = await db.game.findFirst({ where: { id: data.gameId, lessonId: data.lessonId }, select: { type: true, _count: { select: { items: true } } } });
      if (!game || !game._count.items) throw new ActionError("gameNoItems");
      if (getDefinition(game.type).teamOnly) teamMode = true;
    } else if (data.quizId) {
      const quiz = await db.quiz.findFirst({ where: { id: data.quizId, lessonId: data.lessonId }, select: { _count: { select: { questions: true } } } });
      if (!quiz || !quiz._count.questions) throw new ActionError("quizNoQuestions");
    } else throw new ActionError("pickQuizOrGame");

    // One running session per teacher per activity: finish stale ones
    await db.gameSession.updateMany({
      where: { teacherId: user.id, status: { not: "FINISHED" }, quizId: data.quizId ?? undefined, gameId: data.gameId ?? undefined },
      data: { status: "FINISHED", endedAt: new Date() },
    });
    const session = await db.gameSession.create({
      data: {
        teacherId: user.id,
        lessonId: data.lessonId,
        kind: data.quizId ? "QUIZ" : "GAME",
        quizId: data.quizId,
        gameId: data.gameId,
        teamMode,
        pin: await generatePin(),
      },
    });
    await audit({ actorId: user.id, action: "session.create", entityType: "GameSession", entityId: session.id, metadata: { lessonId: data.lessonId } });
    return { id: session.id, returnTo: data.returnTo };
  });
  if (result.ok && result.data) {
    const back = result.data.returnTo ? `?return=${encodeURIComponent(result.data.returnTo)}` : "";
    redirect(`/teacher/sessions/${result.data.id}${back}`);
  }
  return result;
}

export async function controlSessionAction(sessionId: string, action: "start" | "reveal" | "next" | "finish") {
  return runAction(async () => {
    const user = await authorize("sessions.host");
    const s = await db.gameSession.findUnique({ where: { id: sessionId }, select: { teacherId: true } });
    if (!s || (s.teacherId !== user.id && user.role !== "ADMIN")) throw new ActionError("sessionNotFound");
    try {
      await advanceSession(sessionId, z.enum(["start", "reveal", "next", "finish"]).parse(action));
    } catch (e) {
      // Only domain messages reach the UI; anything else becomes a generic error in runAction
      if (e instanceof SessionError) throw new ActionError(e.message as MsgKey);
      throw e;
    }
  });
}
