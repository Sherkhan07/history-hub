import type { ContentStatus, Role } from "@/generated/prisma/enums";

/** Minimal user shape needed for authorization decisions. */
export type Actor = { id: string; role: Role; canReview: boolean; isBlocked?: boolean };

export type Permission =
  | "users.manage"
  | "curriculum.manage"
  | "settings.manage"
  | "audit.view"
  | "analytics.view"
  | "lessons.create"
  | "lessons.edit"
  | "lessons.review"
  | "lessons.publish"
  | "lessons.archive"
  | "lessons.viewAll"
  | "catalog.view"
  | "sessions.host";

const MATRIX: Record<Permission, readonly Role[]> = {
  "users.manage": ["ADMIN"],
  "curriculum.manage": ["ADMIN"],
  "settings.manage": ["ADMIN"],
  "audit.view": ["ADMIN"],
  "analytics.view": ["ADMIN"],
  "lessons.create": ["ADMIN", "MODERATOR"],
  "lessons.edit": ["ADMIN", "MODERATOR"],
  "lessons.review": ["ADMIN"], // + moderators with canReview (see can())
  "lessons.publish": ["ADMIN"],
  "lessons.archive": ["ADMIN"],
  "lessons.viewAll": ["ADMIN", "MODERATOR"],
  "catalog.view": ["ADMIN", "MODERATOR", "TEACHER"],
  "sessions.host": ["ADMIN", "MODERATOR", "TEACHER"],
};

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  if (!actor || actor.isBlocked) return false;
  if (permission === "lessons.review" && actor.role === "MODERATOR" && actor.canReview) return true;
  return MATRIX[permission].includes(actor.role);
}

/** Statuses in which a moderator may change lesson content. Admin can edit any non-archived lesson. */
const MODERATOR_EDITABLE: readonly ContentStatus[] = ["DRAFT", "REJECTED"];

export function canEditLesson(actor: Actor | null | undefined, status: ContentStatus): boolean {
  if (!can(actor, "lessons.edit")) return false;
  if (actor!.role === "ADMIN") return status !== "ARCHIVED";
  return MODERATOR_EDITABLE.includes(status);
}

/** Teachers only ever see published lessons. Staff can see everything except via teacher catalog. */
export function canViewLesson(actor: Actor | null | undefined, status: ContentStatus): boolean {
  if (!actor || actor.isBlocked) return false;
  if (status === "PUBLISHED") return true;
  return can(actor, "lessons.viewAll");
}

export function homePathFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MODERATOR":
      return "/moderator";
    default:
      return "/teacher";
  }
}
