import "server-only";
import { db } from "@/lib/db";
import { canViewLesson } from "@/server/auth/permissions";
import type { CurrentUser } from "@/server/auth/session";

/** Decides whether `user` may read storage object `key`. */
export async function canReadKey(user: CurrentUser | null, key: string): Promise<boolean> {
  if (key.startsWith("public/")) return true;
  // Shared reference books (the textbook PDF linked from many lessons)
  if (key.startsWith("library/")) return Boolean(user);
  const m = key.match(/^lessons\/([^/]+)\//);
  if (!m || !user) return false;
  const lesson = await db.lesson.findUnique({ where: { id: m[1] }, select: { status: true } });
  return Boolean(lesson && canViewLesson(user, lesson.status));
}

const TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

export function contentTypeFor(key: string): string {
  return TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export function contentDisposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
