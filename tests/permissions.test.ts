import { describe, expect, it } from "vitest";
import { can, canEditLesson, canViewLesson, homePathFor, type Actor } from "@/server/auth/permissions";

const admin: Actor = { id: "a", role: "ADMIN", canReview: true };
const mod: Actor = { id: "m", role: "MODERATOR", canReview: false };
const senior: Actor = { id: "s", role: "MODERATOR", canReview: true };
const teacher: Actor = { id: "t", role: "TEACHER", canReview: false };

describe("RBAC", () => {
  it("only admins manage users, settings, curriculum, audit", () => {
    for (const p of ["users.manage", "settings.manage", "curriculum.manage", "audit.view", "analytics.view"] as const) {
      expect(can(admin, p)).toBe(true);
      expect(can(mod, p)).toBe(false);
      expect(can(teacher, p)).toBe(false);
    }
  });
  it("teachers cannot edit content", () => {
    expect(can(teacher, "lessons.edit")).toBe(false);
    expect(can(teacher, "lessons.create")).toBe(false);
    expect(canEditLesson(teacher, "DRAFT")).toBe(false);
  });
  it("review is admin or senior moderator; publish is admin only", () => {
    expect(can(mod, "lessons.review")).toBe(false);
    expect(can(senior, "lessons.review")).toBe(true);
    expect(can(senior, "lessons.publish")).toBe(false);
    expect(can(admin, "lessons.publish")).toBe(true);
  });
  it("moderators edit only drafts and rejected lessons", () => {
    expect(canEditLesson(mod, "DRAFT")).toBe(true);
    expect(canEditLesson(mod, "REJECTED")).toBe(true);
    expect(canEditLesson(mod, "IN_REVIEW")).toBe(false);
    expect(canEditLesson(mod, "PUBLISHED")).toBe(false);
    expect(canEditLesson(admin, "PUBLISHED")).toBe(true);
    expect(canEditLesson(admin, "ARCHIVED")).toBe(false);
  });
  it("teachers see only published lessons", () => {
    expect(canViewLesson(teacher, "PUBLISHED")).toBe(true);
    expect(canViewLesson(teacher, "DRAFT")).toBe(false);
    expect(canViewLesson(teacher, "IN_REVIEW")).toBe(false);
    expect(canViewLesson(mod, "DRAFT")).toBe(true);
    expect(canViewLesson(null, "PUBLISHED")).toBe(false);
  });
  it("blocked users have no permissions", () => {
    expect(can({ ...admin, isBlocked: true }, "users.manage")).toBe(false);
    expect(canViewLesson({ ...teacher, isBlocked: true }, "PUBLISHED")).toBe(false);
  });
  it("routes each role to its home", () => {
    expect(homePathFor("ADMIN")).toBe("/admin");
    expect(homePathFor("MODERATOR")).toBe("/moderator");
    expect(homePathFor("TEACHER")).toBe("/teacher");
  });
});
