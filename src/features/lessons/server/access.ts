import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { canViewLesson } from "@/server/auth/permissions";
import { getLessonDetail } from "./queries";

/** Loads a lesson for a viewer page or 404s when it is missing / not visible to the user. */
export async function loadViewableLesson(id: string) {
  const user = await requireUser();
  const lesson = await getLessonDetail(id);
  if (!lesson || !canViewLesson(user, lesson.status)) notFound();
  return { user, lesson };
}
